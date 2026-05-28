import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User, Session } from '@supabase/supabase-js'
import type { Profile } from '@/lib/supabase'

export type Lang = 'ar' | 'en'
export type Theme = 'dark' | 'light'

export interface UploadedFile {
  id: string; name: string; type: 'image'|'pdf'|'docx'|'pptx'
  size: number; uploadedAt: string; content?: string
  driveFileId?: string; source: 'gdrive'
}
export interface Message { id: string; role: 'user'|'assistant'; content: string; timestamp: string }
export interface ChatSession { id: string; title: string; messages: Message[]; fileIds: string[]; createdAt: string }
export type QuizFormat = 'mcq'|'truefalse'|'flashcard'|'fillblank'|'shortanswer'|'longanswer'
export interface QuizQuestion { id: string; format: QuizFormat; question: string; options?: string[]; correctAnswer: string; explanation?: string; topic?: string }
export interface QuizAttempt { questionId: string; userAnswer: string; isCorrect: boolean; score?: number; feedback?: string; evaluatedAt: string }
export interface QuizSession { id: string; title: string; format: QuizFormat; questions: QuizQuestion[]; attempts: QuizAttempt[]; score: number; completed: boolean; createdAt: string }
export interface Exam { id: string; subject: string; date: string; time: string; location: string; seatCode: string; notes?: string; color: string }
export interface PomodoroSettings { workMinutes: number; shortBreakMinutes: number; longBreakMinutes: number; sessionsBeforeLongBreak: number }
export interface ApiConfig { provider: 'openai'|'gemini'|'openrouter'|'claude'; apiKey: string; model: string }
export interface StudyPlanItem { id: string; subject: string; goal: string; dueDate: string; done: boolean; createdAt: string }

interface NibrasState {
  // ── Auth (not persisted — Supabase owns this) ──
  supabaseUser: User | null
  supabaseSession: Session | null
  profile: Profile | null
  isAuthenticated: boolean
  setSupabaseUser: (user: User | null, session: Session | null) => void
  setProfile: (profile: Profile | null) => void

  // ── Settings (persisted) ──
  lang: Lang; theme: Theme; apiConfig: ApiConfig
  setLang: (l: Lang) => void; setTheme: (t: Theme) => void; setApiConfig: (c: ApiConfig) => void

  // ── User data (cached locally, synced with Supabase) ──
  files: UploadedFile[]; setFiles: (f: UploadedFile[]) => void; addFile: (f: UploadedFile) => void; removeFile: (id: string) => void
  chatSessions: ChatSession[]; activeChatId: string | null
  setChatSessions: (s: ChatSession[]) => void; addChatSession: (s: ChatSession) => void
  updateChatSession: (id: string, msgs: Message[]) => void; setActiveChatId: (id: string | null) => void; deleteChatSession: (id: string) => void
  quizSessions: QuizSession[]; activeQuizId: string | null
  setQuizSessions: (s: QuizSession[]) => void; addQuizSession: (s: QuizSession) => void
  updateQuizSession: (id: string, partial: Partial<QuizSession>) => void; setActiveQuizId: (id: string | null) => void; deleteQuizSession: (id: string) => void
  exams: Exam[]; setExams: (e: Exam[]) => void; addExam: (e: Exam) => void; updateExam: (id: string, p: Partial<Exam>) => void; deleteExam: (id: string) => void
  studyPlan: StudyPlanItem[]; setStudyPlan: (i: StudyPlanItem[]) => void; addStudyPlanItem: (i: StudyPlanItem) => void; toggleStudyPlanItem: (id: string) => void; deleteStudyPlanItem: (id: string) => void
  pomodoroSettings: PomodoroSettings; setPomodoroSettings: (s: PomodoroSettings) => void
  clearUserData: () => void
}

export const useStore = create<NibrasState>()(
  persist(
    (set) => ({
      // Auth
      supabaseUser: null, supabaseSession: null, profile: null, isAuthenticated: false,
      setSupabaseUser: (user, session) => set({ supabaseUser: user, supabaseSession: session, isAuthenticated: !!user }),
      setProfile: (profile) => set({ profile }),

      // Settings
      lang: 'ar', theme: 'dark',
      apiConfig: { provider: 'openrouter', apiKey: '', model: 'meta-llama/llama-3.1-8b-instruct:free' },
      setLang: (lang) => set({ lang }),
      setTheme: (theme) => set({ theme }),
      setApiConfig: (apiConfig) => set({ apiConfig }),

      // Files
      files: [], setFiles: (files) => set({ files }),
      addFile: (f) => set((s) => ({ files: [f, ...s.files] })),
      removeFile: (id) => set((s) => ({ files: s.files.filter(f => f.id !== id) })),

      // Chat
      chatSessions: [], activeChatId: null,
      setChatSessions: (chatSessions) => set({ chatSessions }),
      addChatSession: (s) => set((st) => ({ chatSessions: [s, ...st.chatSessions], activeChatId: s.id })),
      updateChatSession: (id, msgs) => set((st) => ({ chatSessions: st.chatSessions.map(s => s.id === id ? { ...s, messages: msgs } : s) })),
      setActiveChatId: (id) => set({ activeChatId: id }),
      deleteChatSession: (id) => set((st) => ({ chatSessions: st.chatSessions.filter(s => s.id !== id), activeChatId: st.activeChatId === id ? null : st.activeChatId })),

      // Quiz
      quizSessions: [], activeQuizId: null,
      setQuizSessions: (quizSessions) => set({ quizSessions }),
      addQuizSession: (s) => set((st) => ({ quizSessions: [s, ...st.quizSessions], activeQuizId: s.id })),
      updateQuizSession: (id, partial) => set((st) => ({ quizSessions: st.quizSessions.map(s => s.id === id ? { ...s, ...partial } : s) })),
      setActiveQuizId: (id) => set({ activeQuizId: id }),
      deleteQuizSession: (id) => set((st) => ({ quizSessions: st.quizSessions.filter(s => s.id !== id), activeQuizId: st.activeQuizId === id ? null : st.activeQuizId })),

      // Exams
      exams: [], setExams: (exams) => set({ exams }),
      addExam: (e) => set((st) => ({ exams: [e, ...st.exams] })),
      updateExam: (id, p) => set((st) => ({ exams: st.exams.map(e => e.id === id ? { ...e, ...p } : e) })),
      deleteExam: (id) => set((st) => ({ exams: st.exams.filter(e => e.id !== id) })),

      // Study Plan
      studyPlan: [], setStudyPlan: (studyPlan) => set({ studyPlan }),
      addStudyPlanItem: (item) => set((st) => ({ studyPlan: [item, ...st.studyPlan] })),
      toggleStudyPlanItem: (id) => set((st) => ({ studyPlan: st.studyPlan.map(i => i.id === id ? { ...i, done: !i.done } : i) })),
      deleteStudyPlanItem: (id) => set((st) => ({ studyPlan: st.studyPlan.filter(i => i.id !== id) })),

      // Pomodoro
      pomodoroSettings: { workMinutes: 25, shortBreakMinutes: 5, longBreakMinutes: 15, sessionsBeforeLongBreak: 4 },
      setPomodoroSettings: (pomodoroSettings) => set({ pomodoroSettings }),

      // Logout
      clearUserData: () => set({
        supabaseUser: null, supabaseSession: null, profile: null, isAuthenticated: false,
        files: [], chatSessions: [], quizSessions: [], exams: [], studyPlan: [],
        activeChatId: null, activeQuizId: null,
      }),
    }),
    {
      name: 'nibras-v3',
      // Only persist UI settings — Supabase handles auth, data is reloaded on login
      partialize: (state) => ({
        lang: state.lang,
        theme: state.theme,
        apiConfig: state.apiConfig,
        pomodoroSettings: state.pomodoroSettings,
      }),
    }
  )
)

export const useCurrentUser = () => useStore(s => s.profile)
export const useIsAdmin    = () => useStore(s => s.profile?.role === 'admin')

export function getLevelFromXP(xp: number) {
  let level = 1
  while (xp >= level * 200) level++
  return level
}

export function xpForNextLevel(xp: number) {
  return getLevelFromXP(xp) * 200
}
