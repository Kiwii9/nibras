import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Clock, Key, RefreshCw, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'

interface RateLimitCardProps {
  isAr: boolean
  type: 'rate_limit' | 'daily_limit' | 'platform_key_missing'
}

function useCountdown() {
  const [secs, setSecs] = useState(() => {
    const now = new Date()
    const midnight = new Date(now)
    midnight.setHours(24, 0, 0, 0)
    return Math.floor((midnight.getTime() - now.getTime()) / 1000)
  })

  useEffect(() => {
    const timer = setInterval(() => setSecs(s => Math.max(0, s - 1)), 1000)
    return () => clearInterval(timer)
  }, [])

  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  const s = secs % 60
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
}

export function RateLimitCard({ isAr, type }: RateLimitCardProps) {
  const countdown = useCountdown()
  const t = (ar: string, en: string) => isAr ? ar : en

  const configs = {
    rate_limit: {
      icon: <Clock className="w-8 h-8 text-amber-400" />,
      bg: 'bg-amber-500/8 border-amber-500/25',
      title: t('وصلت إلى الحد اليومي للذكاء الاصطناعي', "You've reached today's AI limit"),
      body: t(
        'محادثاتك محفوظة وستتمكن من الاستمرار لاحقاً. الحد يُعاد تعيينه كل يوم عند منتصف الليل.',
        'Your conversations are saved and you can continue later. The limit resets every day at midnight.'
      ),
      showCountdown: true,
    },
    daily_limit: {
      icon: <Sparkles className="w-8 h-8 text-teal-400" />,
      bg: 'bg-teal-500/8 border-teal-500/25',
      title: t('استخدمت حصتك لليوم 🎓', "You've used your daily quota 🎓"),
      body: t(
        'أحسنت! استمر غداً — محادثاتك ومذاكراتك محفوظة كلها.',
        'Great work today! Come back tomorrow — all your chats and progress are saved.'
      ),
      showCountdown: true,
    },
    platform_key_missing: {
      icon: <Key className="w-8 h-8 text-primary" />,
      bg: 'bg-primary/8 border-primary/25',
      title: t('المساعد يحتاج مفتاح API', 'Assistant needs an API key'),
      body: t(
        'المنصة لم تُهيأ بعد. يمكنك إضافة مفتاحك الخاص مجاناً من OpenRouter.',
        'Platform key not configured yet. You can add your own free key from OpenRouter.'
      ),
      showCountdown: false,
    },
  }

  const cfg = configs[type]

  return (
    <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
      className={`mx-auto max-w-sm rounded-2xl border p-5 text-center space-y-3 ${cfg.bg}`}>
      <div className="flex justify-center">{cfg.icon}</div>
      <div>
        <p className="font-semibold text-sm text-foreground mb-1" dir="auto">{cfg.title}</p>
        <p className="text-xs text-muted-foreground leading-relaxed" dir="auto">{cfg.body}</p>
      </div>

      {cfg.showCountdown && (
        <div className="flex items-center justify-center gap-2 bg-muted/50 rounded-xl px-4 py-2.5">
          <RefreshCw className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">{t('يُعاد التعيين خلال', 'Resets in')}</span>
          <span className="font-mono text-sm font-bold text-foreground">{countdown}</span>
        </div>
      )}

      <div className="flex flex-col gap-2 pt-1">
        <Link to="/settings"
          className="w-full py-2 rounded-xl text-xs font-semibold text-white flex items-center justify-center gap-1.5"
          style={{ background: 'linear-gradient(135deg,#1A4D53,#2D7A84)' }}>
          <Key className="w-3.5 h-3.5" />
          {t('استخدم مفتاحي الخاص', 'Use my own API key')}
        </Link>
        <a href="https://openrouter.ai/keys" target="_blank" rel="noopener noreferrer"
          className="w-full py-2 rounded-xl text-xs font-medium text-muted-foreground hover:text-foreground border border-border/50 hover:bg-muted/50 transition-colors">
          {t('احصل على مفتاح مجاني ←', 'Get a free key ←')}
        </a>
      </div>
    </motion.div>
  )
}
