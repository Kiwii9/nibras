import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { useStore } from '@/store'
import { supabase, fetchProfile } from '@/lib/supabase'
import { AuthPage } from '@/components/auth/AuthPage'
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
import { useT } from '@/hooks/useT'

type PageKey = 'dashboard'|'chat'|'quiz'|'exams'|'pomodoro'|'resources'|'roadmap'|'about'|'settings'

const PAGE_TITLES: Record<string, PageKey> = {
  '/':          'dashboard',
  '/chat':      'chat',
  '/quiz':      'quiz',
  '/exams':     'exams',
  '/pomodoro':  'pomodoro',
  '/resources': 'resources',
  '/roadmap':   'roadmap',
  '/about':     'about',
  '/settings':  'settings',
}

function PageWrapper({ children }: { children: React.ReactNode }) {
  const location = useLocation()
  return (
    <AnimatePresence mode="wait">
      <motion.div key={location.pathname}
        initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.2, ease: 'easeOut' }}
        className="flex-1 overflow-y-auto">
        {children}
      </motion.div>
    </AnimatePresence>
  )
}

function AppLayout() {
  const { t } = useT()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const pageKey = PAGE_TITLES[location.pathname] ?? 'dashboard'

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Topbar onMenuOpen={() => setSidebarOpen(true)} pageTitle={t(pageKey)} />
        <PageWrapper>
          <Routes>
            <Route path="/"          element={<Dashboard />} />
            <Route path="/chat"      element={<Chatbot />} />
            <Route path="/quiz"      element={<QuizEngine />} />
            <Route path="/exams"     element={<ExamTracker />} />
            <Route path="/pomodoro"  element={<Pomodoro />} />
            <Route path="/resources" element={<DriveUploader />} />
            <Route path="/roadmap"   element={<RoadmapPage />} />
            <Route path="/about"     element={<AboutPage />} />
            <Route path="/settings"  element={<SettingsPage />} />
            <Route path="*"          element={<Dashboard />} />
          </Routes>
        </PageWrapper>
      </div>
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

/** Listens to Supabase auth events and syncs them into the store */
function AuthGate() {
  const { setSupabaseUser, setProfile, clearUserData, isAuthenticated } = useStore()
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    // 1. Check if there's already a session (e.g. page refresh)
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        setSupabaseUser(session.user, session)
        const profile = await fetchProfile(session.user.id)
        setProfile(profile)
      }
      setChecking(false)
    })

    // 2. Listen for future auth events
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        setSupabaseUser(session.user, session)
        const profile = await fetchProfile(session.user.id)
        setProfile(profile)
      } else if (event === 'SIGNED_OUT') {
        clearUserData()
      } else if (event === 'TOKEN_REFRESHED' && session) {
        setSupabaseUser(session.user, session)
      } else if (event === 'PASSWORD_RECOVERY') {
        // User followed reset link — send them to settings to update password
        // (handled by SettingsPage checking for this event)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
          className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full" />
      </div>
    )
  }

  return isAuthenticated ? <AppLayout /> : <AuthPage />
}

export default function App() {
  return (
    <ThemeDirectionProvider>
      <BrowserRouter>
        <AuthGate />
      </BrowserRouter>
    </ThemeDirectionProvider>
  )
}
