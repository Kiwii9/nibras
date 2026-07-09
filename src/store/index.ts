import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Session, User as SupabaseAuthUser } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

export type Lang = 'ar' | 'en'
export type Theme = 'dark' | 'light'
export type UserRole = 'student' | 'admin' | 'developer'

export interface User {
  id: string
  name: string
  email: string
  role: UserRole
  createdAt: string
  avatar: string
  studyStreak: number
  lastActiveDate: string
  totalStudyMinutes: number
  level: number
  xp: number
}

export interface UploadedFile {
  id: string
  name: string
  type: 'image' | 'pdf' | 'docx' | 'pptx'
  size: number
  uploadedAt: string
  content?: string
  driveFileId?: string
  source: 'gdrive'
  folderId?: string | null
}

export interface ResourceFolder {
  id: string
  name: string
  color: string
  createdAt: string
}

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

export interface ChatSession {
  id: string
  title: string
  messages: Message[]
  fileIds: string[]
  createdAt: string
}

export type QuizFormat = 'mcq' | 'truefalse' | 'flashcard' | 'fillblank' | 'shortanswer' | 'longanswer'

export interface QuizQuestion {
  id: string
  format: QuizFormat
  question: string
  options?: string[]
  correctAnswer: string
  explanation?: string
  topic?: string
}

export interface QuizAttempt {
  questionId: string
  userAnswer: string
  isCorrect: boolean
  score?: number
  feedback?: string
  evaluatedAt: string
}

export interface QuizSession {
  id: string
  title: string
  format: QuizFormat
  questions: QuizQuestion[]
  attempts: QuizAttempt[]
  score: number
  completed: boolean
  createdAt: string
}

export interface Exam {
  id: string
  subject: string
  date: string
  time: string
  location: string
  seatCode: string
  notes?: string
  color: string
}

export interface PomodoroSettings {
  workMinutes: number
  shortBreakMinutes: number
  longBreakMinutes: number
  sessionsBeforeLongBreak: number
}

export interface ApiConfig {
  provider: 'openai' | 'gemini' | 'openrouter' | 'claude' | 'groq'
  apiKey: string
  model: string
  useCustomKey: boolean  // false = use platform key, true = use user's own key
}

export interface StudyPlanItem {
  id: string
  subject: string
  goal: string
  dueDate: string
  done: boolean
  createdAt: string
}

interface ProfileRow {
  id: string
  email: string
  full_name: string | null
  role: UserRole
  created_at: string
}

const avatarColors = ['#2D7A84','#C9A84C','#4A90D9','#7C5CBF','#56A86B','#E05555']

function pickAvatar(id: string) {
  let hash = 0
  for (let i = 0; i < id.length; i++) hash = ((hash << 5) - hash + id.charCodeAt(i)) | 0
  return avatarColors[Math.abs(hash) % avatarColors.length]
}

function getAuthErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : String(error)
  const lower = message.toLowerCase()

  if (lower.includes('invalid login credentials')) return 'البريد أو كلمة المرور غير صحيحة · Invalid email or password.'
  if (lower.includes('email not confirmed')) return 'يرجى تأكيد البريد الإلكتروني أولاً · Please confirm your email first.'
  if (lower.includes('user already registered')) return 'هذا البريد الإلكتروني مسجّل مسبقاً · Email already registered.'
  if (lower.includes('password')) return 'تأكد من كلمة المرور وحاول مرة أخرى · Check the password and try again.'

  return `تعذر تسجيل الدخول · ${message}`
}

async function fetchOrCreateProfile(authUser: SupabaseAuthUser): Promise<ProfileRow> {
  const email = authUser.email?.toLowerCase() ?? ''
  const fullName =
    typeof authUser.user_metadata?.full_name === 'string' ? authUser.user_metadata.full_name
    : typeof authUser.user_metadata?.name === 'string' ? authUser.user_metadata.name
    : email.split('@')[0]

  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, full_name, role, created_at')
    .eq('id', authUser.id)
    .maybeSingle()

  if (error) throw error
  if (data) return data as ProfileRow

  const { data: inserted, error: insertError } = await supabase
    .from('profiles')
    .insert({ id: authUser.id, email, full_name: fullName, role: 'student' })
    .select('id, email, full_name, role, created_at')
    .single()

  if (insertError) throw insertError
  return inserted as ProfileRow
}

function mapProfileToUser(profile: ProfileRow, authUser: SupabaseAuthUser): User {
  const today = new Date().toDateString()
  const email = profile.email || authUser.email || ''
  const name = profile.full_name?.trim() || authUser.user_metadata?.full_name || authUser.user_metadata?.name || email.split('@')[0] || 'Student'

  return {
    id: authUser.id,
    name,
    email,
    role: profile.role || 'student',
    createdAt: profile.created_at || authUser.created_at || new Date().toISOString(),
    avatar: pickAvatar(authUser.id),
    studyStreak: 1,
    lastActiveDate: today,
    totalStudyMinutes: 0,
    level: 1,
    xp: 0,
  }
}

export function getLevelFromXP(xp: number) {
  let level = 1
  while (xp >= level * 200) level++
  return level
}

export function xpForNextLevel(xp: number) {
  const level = getLevelFromXP(xp)
  return level * 200
}

interface NibrasState {
  users: User[]
  currentUserId: string | null
  isAuthenticated: boolean
  authReady: boolean
  authError: string
  authNotice: string
  initializeAuth: () => () => void
  register: (name: string, email: string, password: string) => Promise<boolean>
  login: (email: string, password: string) => Promise<boolean>
  logout: () => Promise<void>
  updateUserProgress: (xpGain: number, minutesGain?: number) => void
  clearAuthError: () => void

  lang: Lang
  theme: Theme
  apiConfig: ApiConfig
  setLang: (l: Lang) => void
  setTheme: (t: Theme) => void
  setApiConfig: (c: ApiConfig) => void

  files: UploadedFile[]
  resourceFolders: ResourceFolder[]
  addFile: (f: UploadedFile) => void
  removeFile: (id: string) => void
  addResourceFolder: (folder: ResourceFolder) => void
  renameResourceFolder: (id: string, name: string) => void
  deleteResourceFolder: (id: string) => void
  moveFileToFolder: (fileId: string, folderId: string | null) => void

  chatSessions: ChatSession[]
  activeChatId: string | null
  addChatSession: (s: ChatSession) => void
  updateChatSession: (id: string, msgs: Message[]) => void
  setActiveChatId: (id: string | null) => void
  deleteChatSession: (id: string) => void

  quizSessions: QuizSession[]
  activeQuizId: string | null
  addQuizSession: (s: QuizSession) => void
  updateQuizSession: (id: string, partial: Partial<QuizSession>) => void
  setActiveQuizId: (id: string | null) => void
  deleteQuizSession: (id: string) => void

  exams: Exam[]
  addExam: (e: Exam) => void
  updateExam: (id: string, partial: Partial<Exam>) => void
  deleteExam: (id: string) => void

  studyPlan: StudyPlanItem[]
  addStudyPlanItem: (item: StudyPlanItem) => void
  toggleStudyPlanItem: (id: string) => void
  deleteStudyPlanItem: (id: string) => void

  pomodoroSettings: PomodoroSettings
  setPomodoroSettings: (s: PomodoroSettings) => void
  dailyMessageCount: number
  incrementMessageCount: () => void
  resetMessageCount: () => void
  lastMessageDate: string
}

async function syncSessionToStore(session: Session | null, set: (partial: Partial<NibrasState> | ((state: NibrasState) => Partial<NibrasState>)) => void) {
  if (!session?.user) {
    set({ users: [], currentUserId: null, isAuthenticated: false, authReady: true })
    return
  }

  try {
    const profile = await fetchOrCreateProfile(session.user)
    const currentUser = mapProfileToUser(profile, session.user)
    set({ users: [currentUser], currentUserId: currentUser.id, isAuthenticated: true, authReady: true, authError: '', authNotice: '' })
  } catch (error) {
    set({ users: [], currentUserId: null, isAuthenticated: false, authReady: true, authError: getAuthErrorMessage(error) })
  }
}

export const useStore = create<NibrasState>()(
  persist(
    (set, get) => ({
      users: [],
      currentUserId: null,
      isAuthenticated: false,
      authReady: false,
      authError: '',
      authNotice: '',

      initializeAuth: () => {
        let cancelled = false

        supabase.auth.getSession()
          .then(({ data }) => { if (!cancelled) void syncSessionToStore(data.session, set) })
          .catch((error) => {
            if (!cancelled) set({ authReady: true, authError: getAuthErrorMessage(error) })
          })

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
          if (!cancelled) void syncSessionToStore(session, set)
        })

        return () => {
          cancelled = true
          subscription.unsubscribe()
        }
      },

      register: async (name, email, password) => {
        set({ authError: '', authNotice: '' })
        const cleanName = name.trim()
        const cleanEmail = email.toLowerCase().trim()

        if (!cleanName) { set({ authError: 'Please enter your name.' }); return false }
        if (!cleanEmail) { set({ authError: 'Please enter your email.' }); return false }
        if (password.length < 6) {
          set({ authError: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل · Password min 6 chars.' })
          return false
        }

        try {
          const { data, error } = await supabase.auth.signUp({
            email: cleanEmail,
            password,
            options: {
              data: { full_name: cleanName, name: cleanName },
              emailRedirectTo: window.location.origin,
            },
          })
          if (error) throw error

          if (data.session) {
            await syncSessionToStore(data.session, set)
          } else {
            set({
              authNotice: 'تم إنشاء الحساب. إذا كان تأكيد البريد مفعّلاً، افتح بريدك واضغط رابط التأكيد · Account created. If email confirmation is enabled, check your inbox.',
              authError: '',
            })
          }
          return true
        } catch (error) {
          set({ authError: getAuthErrorMessage(error) })
          return false
        }
      },

      login: async (email, password) => {
        set({ authError: '', authNotice: '' })
        const cleanEmail = email.toLowerCase().trim()
        if (!cleanEmail || !password) { set({ authError: 'أدخل البريد وكلمة المرور · Enter email and password.' }); return false }

        try {
          const { data, error } = await supabase.auth.signInWithPassword({ email: cleanEmail, password })
          if (error) throw error
          await syncSessionToStore(data.session, set)
          return true
        } catch (error) {
          set({ authError: getAuthErrorMessage(error) })
          return false
        }
      },

      logout: async () => {
        await supabase.auth.signOut()
        set({
          users: [], currentUserId: null, isAuthenticated: false, authError: '', authNotice: '',
          files: [], resourceFolders: [{ id: 'folder-general', name: 'General / عام', color: '#2D7A84', createdAt: new Date().toISOString() }], chatSessions: [], quizSessions: [], exams: [], studyPlan: [],
          activeChatId: null, activeQuizId: null,
        })
      },

      updateUserProgress: (xpGain, minutesGain = 0) => {
        const { currentUserId, users } = get()
        if (!currentUserId) return
        set({
          users: users.map(u => {
            if (u.id !== currentUserId) return u
            const newXP = u.xp + xpGain
            return { ...u, xp: newXP, level: getLevelFromXP(newXP), totalStudyMinutes: u.totalStudyMinutes + minutesGain }
          })
        })
      },

      clearAuthError: () => set({ authError: '', authNotice: '' }),

      lang: 'ar',
      theme: 'dark',
      apiConfig: { provider: 'openrouter', apiKey: '', model: 'openrouter/free', useCustomKey: false },
      setLang: (lang) => set({ lang }),
      setTheme: (theme) => set({ theme }),
      setApiConfig: (apiConfig) => set({ apiConfig }),

      files: [],
      resourceFolders: [
        { id: 'folder-general', name: 'General / عام', color: '#2D7A84', createdAt: new Date().toISOString() },
      ],
      addFile: (f) => set((s) => ({ files: [{ ...f, folderId: f.folderId ?? null }, ...s.files] })),
      removeFile: (id) => set((s) => ({ files: s.files.filter((f) => f.id !== id) })),
      addResourceFolder: (folder) => set((s) => ({ resourceFolders: [folder, ...s.resourceFolders] })),
      renameResourceFolder: (id, name) => set((s) => ({
        resourceFolders: s.resourceFolders.map(folder => folder.id === id ? { ...folder, name } : folder),
      })),
      deleteResourceFolder: (id) => set((s) => ({
        resourceFolders: s.resourceFolders.filter(folder => folder.id !== id),
        files: s.files.map(file => file.folderId === id ? { ...file, folderId: null } : file),
      })),
      moveFileToFolder: (fileId, folderId) => set((s) => ({
        files: s.files.map(file => file.id === fileId ? { ...file, folderId } : file),
      })),

      chatSessions: [],
      activeChatId: null,
      addChatSession: (s) => set((st) => ({ chatSessions: [s, ...st.chatSessions], activeChatId: s.id })),
      updateChatSession: (id, msgs) =>
        set((st) => ({ chatSessions: st.chatSessions.map((s) => (s.id === id ? { ...s, messages: msgs } : s)) })),
      setActiveChatId: (id) => set({ activeChatId: id }),
      deleteChatSession: (id) => set((st) => ({
        chatSessions: st.chatSessions.filter((s) => s.id !== id),
        activeChatId: st.activeChatId === id ? null : st.activeChatId,
      })),

      quizSessions: [],
      activeQuizId: null,
      addQuizSession: (s) => set((st) => ({ quizSessions: [s, ...st.quizSessions], activeQuizId: s.id })),
      updateQuizSession: (id, partial) =>
        set((st) => ({ quizSessions: st.quizSessions.map((s) => (s.id === id ? { ...s, ...partial } : s)) })),
      setActiveQuizId: (id) => set({ activeQuizId: id }),
      deleteQuizSession: (id) => set((st) => ({
        quizSessions: st.quizSessions.filter((s) => s.id !== id),
        activeQuizId: st.activeQuizId === id ? null : st.activeQuizId,
      })),

      exams: [],
      addExam: (e) => set((st) => ({ exams: [e, ...st.exams] })),
      updateExam: (id, partial) => set((st) => ({ exams: st.exams.map((e) => (e.id === id ? { ...e, ...partial } : e)) })),
      deleteExam: (id) => set((st) => ({ exams: st.exams.filter((e) => e.id !== id) })),

      studyPlan: [],
      addStudyPlanItem: (item) => set((st) => ({ studyPlan: [item, ...st.studyPlan] })),
      toggleStudyPlanItem: (id) => set((st) => ({ studyPlan: st.studyPlan.map(i => i.id === id ? { ...i, done: !i.done } : i) })),
      deleteStudyPlanItem: (id) => set((st) => ({ studyPlan: st.studyPlan.filter(i => i.id !== id) })),

      pomodoroSettings: { workMinutes: 25, shortBreakMinutes: 5, longBreakMinutes: 15, sessionsBeforeLongBreak: 4 },
      setPomodoroSettings: (pomodoroSettings) => set({ pomodoroSettings }),
      dailyMessageCount: 0,
      lastMessageDate: '',
      incrementMessageCount: () => set((s) => {
        const today = new Date().toDateString()
        const count = s.lastMessageDate === today ? s.dailyMessageCount + 1 : 1
        return { dailyMessageCount: count, lastMessageDate: today }
      }),
      resetMessageCount: () => set({ dailyMessageCount: 0, lastMessageDate: '' }),
    }),
    {
      name: 'nibras-v3',
      partialize: (state) => ({
        lang: state.lang,
        theme: state.theme,
        apiConfig: state.apiConfig,
        files: state.files,
        resourceFolders: state.resourceFolders,
        chatSessions: state.chatSessions,
        activeChatId: state.activeChatId,
        quizSessions: state.quizSessions,
        activeQuizId: state.activeQuizId,
        exams: state.exams,
        studyPlan: state.studyPlan,
        pomodoroSettings: state.pomodoroSettings,
        dailyMessageCount: state.dailyMessageCount,
        lastMessageDate: state.lastMessageDate,
      }),
    }
  )
)

export const useCurrentUser = () => {
  const { users, currentUserId } = useStore()
  return users.find(u => u.id === currentUserId) ?? null
}

export const useIsAdmin = () => {
  const user = useCurrentUser()
  return user?.role === 'admin' || user?.role === 'developer'
}

export const useIsDeveloper = () => {
  const user = useCurrentUser()
  return user?.role === 'developer'
}
