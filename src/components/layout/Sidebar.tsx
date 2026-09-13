import { motion, AnimatePresence } from 'framer-motion'
import { Link, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, MessageSquare, BrainCircuit, CalendarCheck,
  Timer, FolderOpen, Settings, X, Coffee, Rocket, Info,
  LogOut, Sun, Moon, ExternalLink, BookOpen
} from 'lucide-react'
import { useT } from '@/hooks/useT'
import { useStore, useCurrentUser, getLevelFromXP, xpForNextLevel } from '@/store'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'

const NAV = [
  { to: '/',          icon: LayoutDashboard, key: 'dashboard'  },
  { to: '/chat',      icon: MessageSquare,   key: 'chat'       },
  { to: '/quiz',      icon: BrainCircuit,    key: 'quiz'       },
  { to: '/exams',     icon: CalendarCheck,   key: 'exams'      },
  { to: '/pomodoro',  icon: Timer,           key: 'pomodoro'   },
  { to: '/resources', icon: FolderOpen,      key: 'resources'  },
] as const

const NAV_BOTTOM = [
  { to: '/roadmap',  icon: Rocket,   key: 'roadmap', badge: 'NEW' },
  { to: '/about',    icon: Info,     key: 'about'    },
  { to: '/settings', icon: Settings, key: 'settings' },
] as const

interface SidebarProps { open: boolean; onClose: () => void }

function UserCard() {
  const { isRTL } = useT()
  const user = useCurrentUser()
  const { clearUserData, lang } = useStore()
  if (!user) return null

  const level   = getLevelFromXP(user.xp ?? 0)
  const nextXP  = xpForNextLevel(user.xp ?? 0)
  const progress = Math.min(((user.xp ?? 0) / nextXP) * 100, 100)
  const initials = (user.name || 'U').split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    clearUserData()
  }

  return (
    <div style={{ borderBottom: '1px solid var(--border)', padding: '12px 14px' }}>
      <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Avatar */}
          <div style={{
            width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
            background: 'var(--primary)', color: 'var(--primary-foreground)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 12, fontWeight: 700,
          }}>
            {initials}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.name}</p>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.email}</p>
          </div>
          <button onClick={handleLogout} title="Logout"
            style={{ padding: 6, borderRadius: 'var(--radius-sm)', color: 'var(--text-muted)', transition: '.15s ease', flexShrink: 0 }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--red)'; (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,.1)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)'; (e.currentTarget as HTMLElement).style.background = 'transparent' }}>
            <LogOut size={14} />
          </button>
        </div>

        {/* XP bar */}
        <div style={{ marginTop: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
            <span style={{
              fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 'var(--radius-full)',
              background: 'rgba(201,168,76,.18)', color: 'var(--gold-dark)',
            }}>Lv {level}</span>
            <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: "'IBM Plex Mono',monospace", fontVariantNumeric: 'tabular-nums' }}>
              {user.xp ?? 0} / {nextXP} XP
            </span>
          </div>
          <div className="progress-bar">
            <motion.div className="progress-bar-fill"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: .8 }} />
          </div>
          {(user.studyStreak ?? 0) > 0 && (
            <p style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 6 }}>
              {user.studyStreak} {lang === 'ar' ? 'يوم متتالي' : 'day streak'}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

function NavItem({ to, icon: Icon, label, badge, onClose }: { to: string; icon: React.ElementType; label: string; badge?: string; onClose: () => void }) {
  const location = useLocation()
  const isActive = to === '/' ? location.pathname === '/' : location.pathname.startsWith(to)

  return (
    <Link to={to} onClick={onClose}
      className={cn('rail-item', isActive && 'active')}
      style={isActive ? {} : {}}>
      <Icon size={17} />
      <span style={{ flex: 1 }}>{label}</span>
      {badge && (
        <span style={{
          fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 'var(--radius-full)',
          background: 'rgba(109,94,248,.16)', color: 'var(--violet)',
        }}>{badge}</span>
      )}
    </Link>
  )
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const { t, lang, isRTL } = useT()
  const { theme, setTheme } = useStore()

  const content = (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

      {/* Brand */}
      <div className="rail-brand" style={{ justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <img src={theme === 'dark' ? '/nibras-symbol-reversed.svg' : '/nibras-symbol-color.svg'} alt="نِبراس" style={{ width: 32, height: 32 }} />
          <div>
            <div className="wordmark" style={{ fontFamily: "'Reem Kufi',sans-serif", fontSize: 20, color: 'var(--text-primary)', lineHeight: 1 }}>نِبراس</div>
            <div className="tagline" style={{ fontSize: 10.5, color: 'var(--text-muted)', marginTop: 1 }}>Nibras</div>
          </div>
        </div>
        <button onClick={onClose} className="lg:hidden"
          style={{ padding: 6, borderRadius: 'var(--radius-sm)', color: 'var(--text-muted)' }}>
          <X size={16} />
        </button>
      </div>

      {/* User */}
      <UserCard />

      {/* Nav */}
      <nav style={{ flex: 1, padding: '8px 0', overflowY: 'auto' }}>
        <div style={{ padding: '0 0 4px' }}>
          {NAV.map(({ to, icon, key }) => (
            <NavItem key={to} to={to} icon={icon} label={t(key as any)} onClose={onClose} />
          ))}
        </div>
        <div style={{ padding: '0', borderTop: '1px solid var(--border)', marginTop: 4, paddingTop: 4 }}>
          {([...NAV_BOTTOM] as any[]).map((item) => (
            <NavItem key={item.to} to={item.to} icon={item.icon} label={t(item.key)} badge={item.badge} onClose={onClose} />
          ))}
        </div>
      </nav>

      {/* Footer */}
      <div style={{ padding: '14px', borderTop: '1px solid var(--border)' }}>
        {/* Light/Dark toggle */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{lang === 'ar' ? 'المظهر' : 'Theme'}</span>
          <div style={{ display: 'flex', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius-full)', padding: 3, gap: 3 }}>
            {(['light','dark'] as const).map(m => (
              <button key={m} onClick={() => setTheme(m)}
                style={{
                  padding: '4px 9px', borderRadius: 'var(--radius-full)', fontSize: 11, fontWeight: 600,
                  background: theme === m ? 'var(--primary)' : 'transparent',
                  color: theme === m ? 'var(--primary-foreground)' : 'var(--text-muted)',
                  transition: '.15s ease', display: 'flex', alignItems: 'center', gap: 4,
                }}>
                {m === 'light' ? <Sun size={11}/> : <Moon size={11}/>}
                {m === 'light' ? (lang === 'ar' ? 'فاتح' : 'Light') : (lang === 'ar' ? 'داكن' : 'Dark')}
              </button>
            ))}
          </div>
        </div>

        {/* Alpha badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
          <span style={{
            fontSize: 10, fontWeight: 700, padding: '2px 9px',
            borderRadius: 'var(--radius-full)',
            background: 'rgba(109,94,248,0.14)',
            color: 'var(--violet)',
            border: '1px solid rgba(109,94,248,0.25)',
          }}>Alpha</span>
        </div>
        {/* Legal links */}
        <div style={{ display:'flex', gap:12, marginBottom:10 }}>
          <a href="/privacy" style={{ fontSize:10.5, color:'var(--text-muted)', textDecoration:'none' }}>Privacy</a>
          <a href="/terms"   style={{ fontSize:10.5, color:'var(--text-muted)', textDecoration:'none' }}>Terms</a>
        </div>

        <a href="https://ko-fi.com/kiwii9#" target="_blank" rel="noopener noreferrer"
          style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 11, color: 'var(--text-muted)', textDecoration: 'none' }}>
          <Coffee size={13} style={{ color: '#FF5E5B', flexShrink: 0 }} />
          <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>تم تطويره من قبل KIWI | محمد حمدي</span>
          <ExternalLink size={11} style={{ flexShrink: 0, opacity: .5 }} />
        </a>
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop */}
      <aside className="rail hidden lg:flex" style={{ flexDirection: 'column' }}>
        {content}
      </aside>

      {/* Mobile overlay */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={onClose}
              className="lg:hidden fixed inset-0 z-40"
              style={{ background: 'rgba(0,0,0,.5)', backdropFilter: 'blur(4px)' }} />
            <motion.aside
              initial={{ x: isRTL ? '100%' : '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: isRTL ? '100%' : '-100%' }}
              transition={{ type: 'spring', stiffness: 350, damping: 30 }}
              className="rail lg:hidden fixed top-0 bottom-0 z-50"
              style={{ [isRTL ? 'right' : 'left']: 0, boxShadow: 'var(--shadow-lg)', display: 'flex', flexDirection: 'column' }}>
              {content}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
