import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Eye, EyeOff, Sparkles, UserPlus, LogIn, AlertCircle, CheckCircle, BookOpen, BrainCircuit, Timer, CalendarCheck } from 'lucide-react'
import { useStore } from '@/store'
import { cn } from '@/lib/utils'

const FEATURES = [
  { icon: BrainCircuit, label: 'Quiz from notes', labelAr: 'اختبارات من المحاضرات', color: '#3E9AA6' },
  { icon: BookOpen, label: 'Arabic tutor', labelAr: 'معلّم عربي مبسّط', color: '#C9A84C' },
  { icon: CalendarCheck, label: 'Exam countdown', labelAr: 'عدّاد الاختبارات', color: '#56A86B' },
  { icon: Timer, label: 'Focus sessions', labelAr: 'جلسات تركيز', color: '#4A90D9' },
]

export function AuthPage() {
  const { register, login, authError, authNotice, clearAuthError, lang, setLang, theme, setTheme } = useStore()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const isAr = lang === 'ar'

  const t = (ar: string, en: string) => isAr ? ar : en

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    clearAuthError()
    setLoading(true)
    try {
      if (mode === 'register') {
        await register(name, email, password)
      } else {
        await login(email, password)
      }
    } finally {
      setLoading(false)
    }
  }

  const switchMode = () => {
    setMode(mode === 'login' ? 'register' : 'login')
    clearAuthError()
  }

  return (
    <div
      className={cn('min-h-screen flex', isAr ? 'flex-row-reverse' : 'flex-row')}
      dir={isAr ? 'rtl' : 'ltr'}
      style={{ background: theme === 'dark' ? '#0B2428' : '#f0f9fa' }}
    >
      {/* Left/Right panel — branding */}
      <div
        className="hidden lg:flex flex-col justify-between w-1/2 p-10 relative overflow-hidden"
        style={{ background: 'linear-gradient(145deg, #0B2428 0%, #1A4D53 50%, #2D7A84 100%)' }}
      >
        {/* Decorative orbs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(4)].map((_, i) => (
            <motion.div key={i}
              animate={{ scale: [1, 1.15, 1], opacity: [0.08, 0.15, 0.08] }}
              transition={{ duration: 4 + i, repeat: Infinity, delay: i * 1.2 }}
              className="absolute rounded-full"
              style={{
                width: `${150 + i * 80}px`, height: `${150 + i * 80}px`,
                background: 'radial-gradient(circle, #62B8C2, transparent)',
                top: `${10 + i * 20}%`, left: `${5 + i * 15}%`,
              }}
            />
          ))}
        </div>

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-12">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.15)' }}>
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-display text-2xl text-white">نِبْرَاس</h1>
              <p className="text-teal-200/60 text-xs">Nibras</p>
            </div>
          </div>

          <div className="mb-8">
            <h2 className="font-display text-4xl text-white mb-4 leading-tight">
              {t('ذاكر بذكاء قبل الاختبار', 'Study smarter before the exam')}
            </h2>
            <p className="text-teal-200/70 text-sm leading-relaxed max-w-xs">
              {t(
                'حوّل محاضراتك إلى ملخصات، أسئلة تدريبية، وفلاش كارد خلال دقائق.',
                'Turn your lectures into summaries, practice questions, and flashcards in minutes.'
              )}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {FEATURES.map(({ icon: Icon, label, labelAr, color }) => (
              <div key={label} className="flex items-center gap-2.5 bg-white/8 rounded-xl px-3 py-2.5 border border-white/10">
                <Icon className="w-4 h-4 shrink-0" style={{ color }} />
                <span className="text-xs text-white/80 font-medium">{t(labelAr, label)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10">
          <p className="text-teal-300/40 text-xs font-en-body">
            تم تطويره من قبل KIWI | محمد حمدي
          </p>
        </div>
      </div>

      {/* Right/Left panel — form */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-10">
        {/* Top controls */}
        <div className="absolute top-4 right-4 flex gap-2">
          <button onClick={() => setLang(isAr ? 'en' : 'ar')}
            className="px-3 py-1.5 rounded-lg border border-border/60 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
            {isAr ? 'EN' : 'ع'}
          </button>
          <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="px-3 py-1.5 rounded-lg border border-border/60 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
        </div>

        <div className="w-full max-w-sm">
          {/* Mobile brand */}
          <div className="lg:hidden flex items-center gap-2 mb-8 justify-center">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#1A4D53,#3E9AA6)' }}>
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <h1 className="font-display text-2xl text-foreground">نِبْرَاس</h1>
          </div>

          {/* Mode tabs */}
          <div className="flex bg-muted/50 p-1 rounded-xl mb-6">
            {(['login', 'register'] as const).map(m => (
              <button key={m} onClick={() => { setMode(m); clearAuthError() }}
                className={cn(
                  'flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-semibold transition-all',
                  mode === m ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                )}>
                {m === 'login' ? <LogIn className="w-3.5 h-3.5" /> : <UserPlus className="w-3.5 h-3.5" />}
                {m === 'login' ? t('تسجيل الدخول', 'Login') : t('إنشاء حساب', 'Register')}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            <motion.form
              key={mode}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              onSubmit={handleSubmit}
              className="space-y-4"
            >
              <div>
                <h2 className="font-display text-2xl text-foreground mb-1">
                  {mode === 'login'
                    ? t('أهلاً بعودتك', 'Welcome back')
                    : t('انضم إلى نِبْرَاس', 'Join Nibras')}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {mode === 'login'
                    ? t('ادخل لتكمل جلساتك الدراسية', 'Sign in to continue your study sessions')
                    : t('أنشئ حسابك الآمن عبر Supabase', 'Create your secure Supabase account')}
                </p>
              </div>

              {mode === 'register' && (
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">{t('الاسم', 'Full Name')}</label>
                  <input
                    type="text" value={name} onChange={e => setName(e.target.value)} required
                    placeholder={t('محمد حمدي', 'Your name')} dir="auto"
                    className="w-full px-3 py-2.5 rounded-xl bg-muted border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">{t('البريد الإلكتروني', 'Email')}</label>
                <input
                  type="email" value={email} onChange={e => setEmail(e.target.value)} required
                  placeholder="student@university.edu" dir="ltr"
                  className="w-full px-3 py-2.5 rounded-xl bg-muted border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">{t('كلمة المرور', 'Password')}</label>
                <div className="relative">
                  <input
                    type={showPass ? 'text' : 'password'} value={password}
                    onChange={e => setPassword(e.target.value)} required
                    placeholder={t('6 أحرف على الأقل', 'Minimum 6 characters')} dir="ltr"
                    className={cn('w-full px-3 py-2.5 rounded-xl bg-muted border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary', isAr ? 'pl-10' : 'pr-10')}
                  />
                  <button type="button" onClick={() => setShowPass(v => !v)}
                    className={cn('absolute top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground', isAr ? 'left-2.5' : 'right-2.5')}>
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Error */}
              <AnimatePresence>
                {authError && (
                  <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    className="flex items-start gap-2 bg-destructive/10 border border-destructive/30 text-destructive text-xs px-3 py-2.5 rounded-xl">
                    <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                    {authError}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Notice */}
              <AnimatePresence>
                {authNotice && (
                  <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    className="flex items-start gap-2 bg-teal-500/10 border border-teal-500/30 text-teal-500 text-xs px-3 py-2.5 rounded-xl leading-relaxed">
                    <CheckCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                    {authNotice}
                  </motion.div>
                )}
              </AnimatePresence>

              <motion.button
                whileTap={{ scale: 0.97 }}
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 transition-all disabled:opacity-70"
                style={{ background: 'linear-gradient(135deg, #1A4D53, #2D7A84)' }}
              >
                {loading ? (
                  <motion.div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                    animate={{ rotate: 360 }} transition={{ duration: 0.7, repeat: Infinity, ease: 'linear' }} />
                ) : mode === 'login' ? (
                  <><LogIn className="w-4 h-4" />{t('دخول', 'Sign In')}</>
                ) : (
                  <><UserPlus className="w-4 h-4" />{t('إنشاء الحساب', 'Create Account')}</>
                )}
              </motion.button>

              <p className="text-center text-xs text-muted-foreground">
                {mode === 'login'
                  ? t('ليس لديك حساب؟ ', "Don't have an account? ")
                  : t('لديك حساب؟ ', 'Already have an account? ')}
                <button type="button" onClick={switchMode}
                  className="text-primary font-semibold hover:underline">
                  {mode === 'login' ? t('أنشئ حساباً', 'Register') : t('سجّل الدخول', 'Login')}
                </button>
              </p>

              {/* Beta hint */}
              <div className="bg-muted/50 rounded-xl p-3 text-xs text-muted-foreground text-center border border-border/50 leading-relaxed">
                {t(
                  'تسجيل الدخول الآن عبر Supabase Auth. استخدام الذكاء الاصطناعي قد يكون محدوداً يومياً أثناء النسخة التجريبية.',
                  'Auth now runs through Supabase. AI usage may be limited daily during the beta.'
                )}
              </div>
            </motion.form>
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
