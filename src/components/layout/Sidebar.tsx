import { motion, AnimatePresence } from 'framer-motion'
import { Link, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, MessageSquare, BrainCircuit, CalendarCheck,
  Timer, FolderOpen, Settings, X, Sparkles, Coffee,
  ExternalLink, Rocket, Info, LogOut, ChevronRight
} from 'lucide-react'
import { useT } from '@/hooks/useT'
import { useStore, useCurrentUser, getLevelFromXP, xpForNextLevel } from '@/store'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { to: '/',          icon: LayoutDashboard, key: 'dashboard'  },
  { to: '/chat',      icon: MessageSquare,   key: 'chat'       },
  { to: '/quiz',      icon: BrainCircuit,    key: 'quiz'       },
  { to: '/exams',     icon: CalendarCheck,   key: 'exams'      },
  { to: '/pomodoro',  icon: Timer,           key: 'pomodoro'   },
  { to: '/resources', icon: FolderOpen,      key: 'resources'  },
  { to: '/roadmap',   icon: Rocket,          key: 'roadmap'    },
  { to: '/about',     icon: Info,            key: 'about'      },
  { to: '/settings',  icon: Settings,        key: 'settings'   },
] as const

interface SidebarProps { open: boolean; onClose: () => void }

function UserCard() {
  const { t } = useT()
  const user = useCurrentUser()
  const { logout } = useStore()
  if (!user) return null

  const level = getLevelFromXP(user.xp)
  const nextXP = xpForNextLevel(user.xp)
  const progress = Math.min((user.xp / nextXP) * 100, 100)
  const initials = user.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

  return (
    <div className="p-3 border-b border-border/50">
      <div className="glass-card rounded-xl p-3 space-y-2">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
            style={{ background: user.avatar }}>
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold truncate">{user.name}</p>
            <p className="text-[10px] text-muted-foreground truncate">{user.email}</p>
          </div>
          <button onClick={logout}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0"
            title={t('logout' as any) ?? 'Logout'}>
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Level & XP */}
        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
          <span className="badge-gold">Lv {level}</span>
          <span>{user.xp} / {nextXP} XP</span>
        </div>
        <div className="h-1 bg-muted rounded-full overflow-hidden">
          <motion.div className="h-full rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.8 }}
            style={{ background: 'linear-gradient(90deg, #2D7A84, #3E9AA6)' }} />
        </div>

        {/* Streak */}
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
          <span>🔥</span>
          <span>{user.studyStreak} day streak</span>
        </div>
      </div>
    </div>
  )
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const { t, isRTL } = useT()
  const location = useLocation()
  const theme = useStore(s => s.theme)

  const content = (
    <div className="flex flex-col h-full">
      {/* Brand */}
      <div className="flex items-center justify-between p-4 pb-3 border-b border-border/50">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg,#1A4D53,#3E9AA6)' }}>
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="font-display text-lg text-foreground leading-none">نِبْرَاس</h1>
            <p className="text-[10px] text-muted-foreground">Nibras</p>
          </div>
        </div>
        <button onClick={onClose} className="lg:hidden p-1.5 rounded-md hover:bg-muted text-muted-foreground">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* User card */}
      <UserCard />

      {/* Nav */}
      <nav className="flex-1 p-2.5 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map(({ to, icon: Icon, key }) => {
          const isActive = to === '/' ? location.pathname === '/' : location.pathname.startsWith(to)
          return (
            <Link key={to} to={to} onClick={onClose}
              className={cn('nav-link relative', isActive && 'active')}>
              <Icon className="w-4 h-4 shrink-0" />
              <span className="text-sm">{t(key as any)}</span>
              {key === 'roadmap' && (
                <span className="ms-auto text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-primary/20 text-primary">NEW</span>
              )}
              {isActive && (
                <motion.div layoutId="nav-pill"
                  className="absolute inset-0 rounded-lg -z-10"
                  style={{ background: theme === 'dark' ? 'hsl(185 50% 14%)' : 'hsl(var(--primary)/0.08)' }}
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }} />
              )}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-border/50 space-y-2">
        <div className="flex flex-wrap gap-1.5">
          <span className="badge-gold text-[10px]">✦ 100% مجاني</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">Free Forever</span>
        </div>
        <a href="https://ko-fi.com" target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors group">
          <Coffee className="w-3.5 h-3.5 text-[#FF5E5B] group-hover:scale-110 transition-transform" />
          <span>تم تطويره من قبل KIWI | محمد حمدي</span>
          <ExternalLink className="w-3 h-3 ms-auto opacity-0 group-hover:opacity-100 transition-opacity" />
        </a>
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop */}
      <aside className={cn(
        'hidden lg:flex flex-col w-60 h-screen border-e border-border/60 shrink-0 bg-card/90 backdrop-blur-sm',
        theme === 'dark' && 'bg-[#0b2428]/90'
      )}>
        {content}
      </aside>

      {/* Mobile overlay */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={onClose} className="lg:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-40" />
            <motion.aside
              initial={{ x: isRTL ? '100%' : '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: isRTL ? '100%' : '-100%' }}
              transition={{ type: 'spring', stiffness: 350, damping: 30 }}
              className={cn(
                'lg:hidden fixed top-0 bottom-0 w-64 z-50 flex flex-col border-e border-border/60 bg-card shadow-2xl',
                isRTL ? 'right-0 border-s border-e-0' : 'left-0',
                theme === 'dark' && 'bg-[#0b2428]'
              )}>
              {content}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
