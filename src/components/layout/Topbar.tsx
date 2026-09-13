import { motion } from 'framer-motion'
import { Menu, Languages } from 'lucide-react'
import { useStore } from '@/store'
import { useT } from '@/hooks/useT'
import { AmbientNoise } from '@/components/ambient/AmbientNoise'
import { isEnabled } from '@/lib/features'

interface TopbarProps { onMenuOpen: () => void; pageTitle?: string }

export function Topbar({ onMenuOpen, pageTitle }: TopbarProps) {
  const { lang } = useT()
  const { setLang } = useStore()

  return (
    <header style={{
      height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 24px', borderBottom: '1px solid var(--border)',
      background: 'var(--surface)', position: 'sticky', top: 0, zIndex: 30,
    }}>
      {/* Start: hamburger + title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={onMenuOpen} className="lg:hidden"
          style={{ padding: 7, borderRadius: 'var(--radius-sm)', color: 'var(--text-muted)', transition: '.15s' }}
          aria-label="Open menu">
          <Menu size={20} />
        </button>
        {pageTitle && (
          <motion.h2 key={pageTitle} initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
            style={{ fontFamily: "'IBM Plex Sans Arabic','IBM Plex Sans',sans-serif", fontSize: 17, fontWeight: 600, color: 'var(--text-primary)' }}>
            {pageTitle}
          </motion.h2>
        )}
      </div>

      {/* End: controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {isEnabled('ambientNoise') && <AmbientNoise />}

        {/* Language toggle */}
        <button onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}
          style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '5px 12px', borderRadius: 'var(--radius-full)',
            border: '1px solid var(--border)', fontSize: 12, fontWeight: 700,
            color: 'var(--text-secondary)', transition: '.15s ease',
          }}
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--bg)'}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}>
          <Languages size={13} />
          {lang === 'ar' ? 'EN' : 'ع'}
        </button>
      </div>
    </header>
  )
}
