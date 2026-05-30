import { motion } from 'framer-motion'
import { Menu, Sun, Moon, Languages } from 'lucide-react'
import { useStore } from '@/store'
import { useT } from '@/hooks/useT'
import { AmbientNoise } from '@/components/ambient/AmbientNoise'
import { isEnabled } from '@/lib/features'
import { cn } from '@/lib/utils'

interface TopbarProps {
  onMenuOpen: () => void
  pageTitle?: string
}

export function Topbar({ onMenuOpen, pageTitle }: TopbarProps) {
  const { t, lang, isRTL } = useT()
  const { theme, setTheme, setLang } = useStore()

  const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark')
  const toggleLang = () => setLang(lang === 'ar' ? 'en' : 'ar')

  return (
    <header className={cn(
      "h-14 flex items-center justify-between px-4 border-b border-border/60",
      "bg-card/80 backdrop-blur-sm sticky top-0 z-30"
    )}>
      {/* Left: hamburger + title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuOpen}
          className="lg:hidden p-2 rounded-lg hover:bg-muted text-muted-foreground transition-colors"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        {pageTitle && (
          <motion.h2
            key={pageTitle}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="font-display text-lg text-foreground hidden sm:block"
          >
            {pageTitle}
          </motion.h2>
        )}
      </div>

      {/* Right: controls */}
      <div className="flex items-center gap-1.5">
        {isEnabled('ambientNoise') && <AmbientNoise />}

        {/* Language toggle */}
        <motion.button
          whileTap={{ scale: 0.92 }}
          onClick={toggleLang}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          aria-label="Toggle language"
        >
          <Languages className="w-4 h-4" />
          <span className="text-xs font-semibold">{lang === 'ar' ? 'EN' : 'ع'}</span>
        </motion.button>

        {/* Theme toggle */}
        <motion.button
          whileTap={{ scale: 0.92 }}
          onClick={toggleTheme}
          className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          aria-label="Toggle theme"
        >
          <motion.div
            key={theme}
            initial={{ rotate: -30, opacity: 0, scale: 0.7 }}
            animate={{ rotate: 0, opacity: 1, scale: 1 }}
            transition={{ duration: 0.25 }}
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </motion.div>
        </motion.button>
      </div>
    </header>
  )
}
