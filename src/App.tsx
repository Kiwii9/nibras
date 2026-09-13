import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { useStore } from '@/store'
import { supabase, fetchProfile } from '@/lib/supabase'
import { loadUserData } from '@/lib/sync'
import { AvatarAuthPage } from '@/components/auth/AvatarAuthPage'
import { Sidebar } from '@/components/layout/Sidebar'
import { Topbar } from '@/components/layout/Topbar'
import { Dashboard } from '@/components/dashboard/Dashboard'
import { Chatbot } from '@/components/chatbot/Chatbot'
import { QuizEngine } from '@/components/quiz/QuizEngine'
import { ExamTracker } from '@/components/exams/ExamTracker'
import { Pomodoro } from '@/components/pomodoro/Pomodoro'
import { DriveUploader } from '@/components/drive/DriveUploader'
import { SettingsPage } from '@/components/dashboard/Settings'
import { RoadmapPage } from '@/components/roadmap/Roadmap'
import { AboutPage } from '@/components/about/About'
import { AdminPanel } from '@/components/admin/AdminPanel'
import { PrivacyPolicy } from '@/components/legal/PrivacyPolicy'
import { TermsOfUse } from '@/components/legal/TermsOfUse'
import { ParticleBg } from '@/components/ambient/ParticleBg'
import { useT } from '@/hooks/useT'
import { isEnabled } from '@/lib/features'
import { Loader2 } from 'lucide-react'

type PageKey = 'dashboard'|'chat'|'quiz'|'exams'|'pomodoro'|'resources'|'roadmap'|'about'|'settings'|'admin'

const PAGE_TITLES: Record<string, PageKey> = {
  '/': 'dashboard', '/chat': 'chat', '/quiz': 'quiz', '/exams': 'exams',
  '/pomodoro': 'pomodoro', '/resources': 'resources', '/roadmap': 'roadmap',
  '/about': 'about', '/settings': 'settings', '/admin': 'admin',
}

function PageWrapper({ children }: { children: React.ReactNode }) {
  const location = useLocation()
  return (
    <AnimatePresence mode="wait">
      <motion.div key={location.pathname}
        initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.2, ease: 'easeOut' }}
        className="flex-1 overflow-y-auto relative z-10">
        {children}
      </motion.div>
    </AnimatePresence>
  )
}

// ── Reset Password Page ───────────────────────────────────────────────────────
function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [done, setDone] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password.length < 8) { setError('Password must be at least 8 characters'); return }
    setLoading(true)
    const { error: err } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (err) { setError(err.message); return }
    setDone(true)
    setTimeout(() => navigate('/'), 2500)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="w-full max-w-sm glass-card rounded-lg p-8 space-y-5 border border-border">
        <div className="text-center">
          <h1 className="font-display text-2xl mb-1">Set New Password</h1>
          <p className="text-sm text-muted-foreground">Enter your new password below</p>
        </div>
        {done ? (
          <div className="text-center text-sm text-teal-500 py-4">
            Password updated! Redirecting...
          </div>
        ) : (
          <form onSubmit={handleReset} className="space-y-4">
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              placeholder="New password (min 8 chars)" minLength={8} required
              className="w-full px-3 py-2.5 rounded-xl bg-muted border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
            {error && <p className="text-xs text-destructive">{error}</p>}
            <button type="submit" disabled={loading}
              className="w-full py-3 rounded-xl text-sm font-semibold text-white disabled:opacity-60 flex items-center justify-center gap-2"
              style={{ background: 'linear-gradient(135deg,#1A4D53,#2D7A84)' }}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Update Password'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

// ── Error Boundary ─────────────────────────────────────────────────────────────
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; error: string }> {
  constructor(props: any) {
    super(props)
    this.state = { hasError: false, error: '' }
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error: error.message }
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4 p-6">
          
          <h2 className="font-display text-xl text-center">Something went wrong</h2>
          <p className="text-sm text-muted-foreground text-center max-w-xs">{this.state.error}</p>
          <button onClick={() => { this.setState({ hasError: false }); window.location.reload() }}
            className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white"
            style={{ background: 'linear-gradient(135deg,#1A4D53,#2D7A84)' }}>
            Reload App
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

import React from 'react'

function AppLayout() {
  const { t } = useT()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const pageKey = PAGE_TITLES[location.pathname] ?? 'dashboard'

  return (
    <div className="flex h-screen overflow-hidden bg-background relative">
      {isEnabled('animatedBg') && <ParticleBg />}
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden relative z-10">
        <Topbar onMenuOpen={() => setSidebarOpen(true)} pageTitle={t(pageKey)} />
        <PageWrapper>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/chat" element={<Chatbot />} />
            <Route path="/quiz" element={<QuizEngine />} />
            <Route path="/exams" element={<ExamTracker />} />
            <Route path="/pomodoro" element={<Pomodoro />} />
            <Route path="/resources" element={<DriveUploader />} />
            <Route path="/roadmap" element={<RoadmapPage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/admin" element={<AdminPanel />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="/terms"   element={<TermsOfUse />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </PageWrapper>
      </div>
    </div>
  )
}

function NotFound() {
  const navigate = useNavigate()
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 p-8 text-center">
      
      <h2 className="font-display text-2xl">Page not found</h2>
      <p className="text-sm text-muted-foreground">This page doesn't exist</p>
      <button onClick={() => navigate('/')}
        className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white"
        style={{ background: 'linear-gradient(135deg,#1A4D53,#2D7A84)' }}>
        Go to Dashboard
      </button>
    </div>
  )
}

function ThemeDirectionProvider({ children }: { children: React.ReactNode }) {
  const { theme, lang } = useStore()
  useEffect(() => {
    const html = document.documentElement
    html.classList.toggle('dark', theme === 'dark')
    html.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr')
    html.setAttribute('lang', lang)
  }, [theme, lang])
  return <>{children}</>
}

function AuthGate() {
  const { setSupabaseUser, setProfile, clearUserData, isAuthenticated, setExams, setQuizSessions, setChatSessions, setStudyPlan, setFiles } = useStore()
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        setSupabaseUser(session.user, session)
        const profile = await fetchProfile(session.user.id)
        setProfile(profile)
        // Load all cloud data into store
        const data = await loadUserData(session.user.id)
        if (data.exams.length)        setExams(data.exams)
        if (data.quizSessions.length) setQuizSessions(data.quizSessions)
        if (data.chatSessions.length) setChatSessions(data.chatSessions)
        if (data.studyPlan.length)    setStudyPlan(data.studyPlan)
        if (data.files.length)        setFiles(data.files)
      }
      setChecking(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        setSupabaseUser(session.user, session)
        const profile = await fetchProfile(session.user.id)
        setProfile(profile)
        const data = await loadUserData(session.user.id)
        if (data.exams.length)        setExams(data.exams)
        if (data.quizSessions.length) setQuizSessions(data.quizSessions)
        if (data.chatSessions.length) setChatSessions(data.chatSessions)
        if (data.studyPlan.length)    setStudyPlan(data.studyPlan)
        if (data.files.length)        setFiles(data.files)
      } else if (event === 'SIGNED_OUT') {
        clearUserData()
      } else if (event === 'TOKEN_REFRESHED' && session) {
        setSupabaseUser(session.user, session)
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  return isAuthenticated ? <AppLayout /> : <AvatarAuthPage />
}

export default function App() {
  return (
    <ThemeDirectionProvider>
      <BrowserRouter>
        <ErrorBoundary>
          <Routes>
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="/terms"   element={<TermsOfUse />} />
            <Route path="*" element={<AuthGate />} />
          </Routes>
        </ErrorBoundary>
      </BrowserRouter>
    </ThemeDirectionProvider>
  )
}
