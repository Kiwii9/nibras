import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { useStore } from '@/store'
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
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -6 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className="flex-1 overflow-y-auto"
      >
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
    const meta = document.querySelector('meta[name="theme-color"]')
    if (meta) meta.setAttribute('content', theme === 'dark' ? '#0B2428' : '#f0f9fa')
  }, [theme, lang])
  return <>{children}</>
}

function AuthGate() {
  const isAuthenticated = useStore(s => s.isAuthenticated)
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
