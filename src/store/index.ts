import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type Lang = 'ar' | 'en'
export type Theme = 'dark' | 'light'

export interface User {
  id: string
  name: string
  email: string
  passwordHash: string
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
  provider: 'openai' | 'gemini' | 'openrouter' | 'claude'
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

function simpleHash(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash).toString(36)
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
  authError: string
  register: (name: string, email: string, password: string) => boolean
  login: (email: string, password: string) => boolean
  logout: () => void
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

export const useStore = create<NibrasState>()(
  persist(
    (set, get) => ({
      users: [],
      currentUserId: null,
      isAuthenticated: false,
      authError: '',

      register: (name, email, password) => {
        const { users } = get()
        if (!name.trim()) { set({ authError: 'Please enter your name.' }); return false }
        if (users.find(u => u.email.toLowerCase() === email.toLowerCase())) {
          set({ authError: 'هذا البريد الإلكتروني مسجّل مسبقاً · Email already registered.' })
          return false
        }
        if (password.length < 6) {
          set({ authError: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل · Password min 6 chars.' })
          return false
        }
        const colors = ['#2D7A84','#C9A84C','#4A90D9','#7C5CBF','#56A86B','#E05555']
        const newUser: User = {
          id: `user-${Date.now()}`,
          name: name.trim(),
          email: email.toLowerCase().trim(),
          passwordHash: simpleHash(password),
          createdAt: new Date().toISOString(),
          avatar: colors[Math.floor(Math.random() * colors.length)],
          studyStreak: 1,
          lastActiveDate: new Date().toDateString(),
          totalStudyMinutes: 0,
          level: 1,
          xp: 0,
        }
        set({ users: [...users, newUser], currentUserId: newUser.id, isAuthenticated: true, authError: '' })
        return true
      },

      login: (email, password) => {
        const { users } = get()
        const user = users.find(u => u.email === email.toLowerCase().trim())
        if (!user) { set({ authError: 'لا يوجد حساب بهذا البريد · No account found.' }); return false }
        if (user.passwordHash !== simpleHash(password)) { set({ authError: 'كلمة المرور غير صحيحة · Wrong password.' }); return false }
        const today = new Date().toDateString()
        const yesterday = new Date(Date.now() - 86400000).toDateString()
        const streak = user.lastActiveDate === yesterday ? user.studyStreak + 1
          : user.lastActiveDate === today ? user.studyStreak : 1
        set(st => ({
          users: st.users.map(u => u.id === user.id ? { ...u, studyStreak: streak, lastActiveDate: today } : u),
          currentUserId: user.id,
          isAuthenticated: true,
          authError: '',
        }))
        return true
      },

      logout: () => set({
        currentUserId: null, isAuthenticated: false, authError: '',
        files: [], resourceFolders: [{ id: 'folder-general', name: 'General / عام', color: '#2D7A84', createdAt: new Date().toISOString() }], chatSessions: [], quizSessions: [], exams: [], studyPlan: [],
        activeChatId: null, activeQuizId: null,
      }),

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

      clearAuthError: () => set({ authError: '' }),

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
    { name: 'nibras-v2' }
  )
)

export const useCurrentUser = () => {
  const { users, currentUserId } = useStore()
  return users.find(u => u.id === currentUserId) ?? null
}

export const useIsAdmin = () => {
  const user = useCurrentUser()
  // Admin email check — expand as needed
  return user?.email === 'm3647807@gmail.com'
}
