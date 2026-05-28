import { useState } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import {
  FolderOpen, BrainCircuit, CalendarCheck, Timer,
  MessageSquare, TrendingUp, Sparkles, Coffee,
  ExternalLink, ArrowRight, Plus, CheckSquare,
  Square, Trash2, Rocket, Star
} from 'lucide-react'
import { useStore, useCurrentUser, getLevelFromXP, xpForNextLevel, StudyPlanItem } from '@/store'
import { useT } from '@/hooks/useT'
import { cn } from '@/lib/utils'

const QUICK_ACTIONS = [
  { to: '/quiz',      icon: BrainCircuit,  key: 'startNewQuiz',   bg: '#1A4D53', color: '#3E9AA6' },
  { to: '/resources', icon: FolderOpen,    key: 'uploadResource', bg: '#1A2C4D', color: '#4A90D9' },
  { to: '/exams',     icon: CalendarCheck, key: 'addExam',        bg: '#3A2E0A', color: '#C9A84C' },
  { to: '/pomodoro',  icon: Timer,         key: 'startPomodoro',  bg: '#0D3018', color: '#56A86B' },
  { to: '/chat',      icon: MessageSquare, key: 'chat',           bg: '#302012', color: '#C9844A' },
  { to: '/roadmap',   icon: Rocket,        key: 'roadmap',        bg: '#1A1A3A', color: '#7C5CBF' },
] as const

function StudyPlanWidget() {
  const { lang } = useT()
  const isAr = lang === 'ar'
  const { studyPlan, addStudyPlanItem, toggleStudyPlanItem, deleteStudyPlanItem } = useStore()
  const [adding, setAdding] = useState(false)
  const [subject, setSubject] = useState('')
  const [goal, setGoal] = useState('')

  const today = studyPlan.slice(0, 5)

  const handleAdd = () => {
    if (!subject.trim()) return
    addStudyPlanItem({
      id: `sp-${Date.now()}`, subject: subject.trim(),
      goal: goal.trim() || (isAr ? 'مراجعة' : 'Review'),
      dueDate: new Date().toISOString(), done: false,
      createdAt: new Date().toISOString(),
    })
    setSubject(''); setGoal(''); setAdding(false)
  }

  return (
    <div className="glass-card rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-sm">{isAr ? 'مهام اليوم' : "Today's Tasks"}</h3>
        <button onClick={() => setAdding(v => !v)}
          className="flex items-center gap-1 text-xs text-primary hover:underline">
          <Plus className="w-3.5 h-3.5" />{isAr ? 'إضافة' : 'Add'}
        </button>
      </div>

      {adding && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
          className="mb-3 space-y-2">
          <input value={subject} onChange={e => setSubject(e.target.value)}
            placeholder={isAr ? 'المادة...' : 'Subject...'} dir="auto"
            className="w-full px-3 py-2 text-xs rounded-lg bg-muted border border-border focus:outline-none focus:ring-1 focus:ring-primary" />
          <input value={goal} onChange={e => setGoal(e.target.value)}
            placeholder={isAr ? 'الهدف (اختياري)...' : 'Goal (optional)...'} dir="auto"
            className="w-full px-3 py-2 text-xs rounded-lg bg-muted border border-border focus:outline-none focus:ring-1 focus:ring-primary" />
          <div className="flex gap-2">
            <button onClick={handleAdd} className="flex-1 py-1.5 text-xs font-semibold btn-teal">
              {isAr ? 'حفظ' : 'Save'}
            </button>
            <button onClick={() => setAdding(false)} className="flex-1 py-1.5 text-xs rounded-lg border border-border hover:bg-muted">
              {isAr ? 'إلغاء' : 'Cancel'}
            </button>
          </div>
        </motion.div>
      )}

      {today.length === 0 ? (
        <div className="text-center py-4">
          <p className="text-xs text-muted-foreground">{isAr ? 'لا توجد مهام — أضف مهمة!' : 'No tasks — add one!'}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {today.map(item => (
            <div key={item.id} className="flex items-center gap-2.5 group">
              <button onClick={() => toggleStudyPlanItem(item.id)} className="shrink-0 text-muted-foreground hover:text-primary transition-colors">
                {item.done ? <CheckSquare className="w-4 h-4 text-teal-500" /> : <Square className="w-4 h-4" />}
              </button>
              <div className="flex-1 min-w-0">
                <p className={cn('text-xs font-medium truncate', item.done && 'line-through text-muted-foreground')} dir="auto">{item.subject}</p>
                {item.goal && <p className="text-[10px] text-muted-foreground truncate" dir="auto">{item.goal}</p>}
              </div>
              <button onClick={() => deleteStudyPlanItem(item.id)}
                className="opacity-0 group-hover:opacity-100 p-1 rounded hover:text-destructive text-muted-foreground transition-all">
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export function Dashboard() {
  const { t, lang, isRTL } = useT()
  const isAr = lang === 'ar'
  const { files, quizSessions, exams } = useStore()
  const user = useCurrentUser()

  const completedQuizzes = quizSessions.filter(s => s.completed).length
  const avgScore = completedQuizzes > 0
    ? Math.round(quizSessions.filter(s => s.completed).reduce((sum, s) => sum + s.score, 0) / completedQuizzes) : 0
  const upcomingExams = exams
    .filter(e => new Date(`${e.date}T${e.time || '00:00'}`) >= new Date())
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 3)

  const level = user ? getLevelFromXP(user.xp) : 1
  const nextXP = user ? xpForNextLevel(user.xp) : 200
  const xpProgress = user ? Math.min((user.xp / nextXP) * 100, 100) : 0

  const stats = [
    { label: t('totalFiles'), value: files.length, icon: FolderOpen, color: '#4A90D9', delay: 0.05 },
    { label: t('totalQuizzes'), value: completedQuizzes, icon: BrainCircuit, color: '#3E9AA6', delay: 0.10 },
    { label: t('upcomingExams'), value: upcomingExams.length, icon: CalendarCheck, color: '#C9A84C', delay: 0.15 },
    { label: isAr ? 'متوسط الدرجات' : 'Avg Score', value: completedQuizzes ? `${avgScore}%` : '—', icon: TrendingUp, color: '#56A86B', delay: 0.20 },
  ]

  return (
    <div className="section-wrapper space-y-8">
      {/* Hero */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden glass-card rounded-2xl p-7 teal-noise"
        style={{ background: 'linear-gradient(135deg,#0B2428 0%,#1A4D53 60%,#2D7A84 100%)' }}>
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-3">
            <span className="badge-gold">✦ {t('free')}</span>
            <span className="text-xs text-teal-200/50">•</span>
            <span className="text-xs text-teal-200/50">{t('poweredBy')}</span>
          </div>
          <h1 className="font-display text-4xl sm:text-5xl text-white mb-1">
            {user ? (isAr ? `أهلاً، ${user.name.split(' ')[0]}` : `Welcome, ${user.name.split(' ')[0]}`) : t('welcomeBack')}
          </h1>
          <p className="text-teal-200/70 text-sm mb-5">{t('appTagline')}</p>

          {/* XP Bar */}
          {user && (
            <div className="mb-5 max-w-xs">
              <div className="flex items-center justify-between text-xs text-teal-200/70 mb-1.5">
                <div className="flex items-center gap-1.5">
                  <Star className="w-3.5 h-3.5 text-gold" />
                  <span>{isAr ? `المستوى ${level}` : `Level ${level}`}</span>
                </div>
                <span>{user.xp} / {nextXP} XP</span>
              </div>
              <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                <motion.div className="h-full rounded-full"
                  initial={{ width: 0 }} animate={{ width: `${xpProgress}%` }}
                  transition={{ duration: 1, delay: 0.3 }}
                  style={{ background: 'linear-gradient(90deg,#62B8C2,#C9A84C)' }} />
              </div>
            </div>
          )}

          <div className="flex gap-3 flex-wrap">
            <Link to="/quiz"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-white/15 hover:bg-white/25 text-white border border-white/20 transition-all">
              <Sparkles className="w-4 h-4" />{t('startNewQuiz')}
            </Link>
            <Link to="/chat"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-transparent hover:bg-white/10 text-teal-200 border border-teal-400/30 transition-all">
              <MessageSquare className="w-4 h-4" />{t('chat')}
            </Link>
          </div>
        </div>
        <div className="absolute -right-8 -top-8 w-40 h-40 rounded-full opacity-15 animate-float"
          style={{ background: 'radial-gradient(circle,#62B8C2,transparent)' }} />
      </motion.div>

      {/* Stats */}
      <div>
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">{t('recentActivity')}</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {stats.map(({ label, value, icon: Icon, color, delay }) => (
            <motion.div key={label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay }} className="glass-card rounded-xl p-4">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3" style={{ background: `${color}22` }}>
                <Icon className="w-4 h-4" style={{ color }} />
              </div>
              <p className="font-display text-2xl text-foreground leading-none">{value}</p>
              <p className="text-xs text-muted-foreground mt-1">{label}</p>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Quick Actions + Study Plan */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">{t('quickActions')}</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {QUICK_ACTIONS.map(({ to, icon: Icon, key, bg, color }, i) => (
              <motion.div key={to} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + i * 0.04 }}>
                <Link to={to}
                  className="group flex items-center gap-3 p-3.5 glass-card rounded-xl hover:border-primary/30 transition-all hover:-translate-y-0.5">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform" style={{ background: bg }}>
                    <Icon className="w-4 h-4" style={{ color }} />
                  </div>
                  <span className="text-xs font-medium flex-1 leading-snug">{t(key as any)}</span>
                  <ArrowRight className={cn('w-3 h-3 text-muted-foreground/30 group-hover:text-muted-foreground transition-all', isRTL && 'rotate-180')} />
                </Link>
              </motion.div>
            ))}
          </div>
        </div>

        <div>
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">
            {isAr ? 'خطة اليوم' : "Today's Plan"}
          </h2>
          <StudyPlanWidget />
        </div>
      </div>

      {/* Upcoming exams */}
      {upcomingExams.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t('upcomingExams')}</h2>
            <Link to="/exams" className="text-xs text-primary hover:underline flex items-center gap-1">
              {t('exams')} <ArrowRight className={cn('w-3 h-3', isRTL && 'rotate-180')} />
            </Link>
          </div>
          <div className="space-y-2">
            {upcomingExams.map(exam => {
              const d = new Date(`${exam.date}T${exam.time || '00:00'}`)
              const days = Math.ceil((d.getTime() - Date.now()) / 86400000)
              return (
                <motion.div key={exam.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="glass-card rounded-xl px-4 py-3 flex items-center gap-3">
                  <div className="w-2 h-8 rounded-full shrink-0" style={{ background: exam.color }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" dir="auto">{exam.subject}</p>
                    <p className="text-xs text-muted-foreground">{d.toLocaleDateString()}{exam.time && ` · ${exam.time}`}</p>
                  </div>
                  <span className={cn('text-xs font-bold px-3 py-1 rounded-full shrink-0',
                    days <= 3 ? 'bg-destructive/15 text-destructive' : 'bg-muted text-muted-foreground')}>
                    {days === 0 ? t('today') : days === 1 ? t('tomorrow') : `${days}d`}
                  </span>
                </motion.div>
              )
            })}
          </div>
        </div>
      )}

      {/* Ko-fi / developer credit */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
        className="glass-card rounded-2xl p-5 flex items-center gap-4">
        <div className="w-10 h-10 rounded-xl bg-[#FF5E5B]/15 flex items-center justify-center shrink-0 text-lg">🥝</div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold">{isAr ? 'تم تطويره من قبل KIWI | محمد حمدي' : 'Developed by KIWI | Mohammed Hamdi'}</p>
          <p className="text-xs text-muted-foreground">{isAr ? 'ادعم الأداة وساعد في إبقائها مجانية' : 'Support the tool and help keep it free'}</p>
        </div>
        <a href="https://ko-fi.com" target="_blank" rel="noopener noreferrer"
          className="shrink-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold bg-[#FF5E5B]/15 text-[#FF5E5B] hover:bg-[#FF5E5B]/25 transition-colors">
          <Coffee className="w-4 h-4" /> Ko-fi <ExternalLink className="w-3 h-3" />
        </a>
      </motion.div>
    </div>
  )
}
