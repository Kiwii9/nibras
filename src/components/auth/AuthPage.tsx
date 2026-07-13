import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Eye, EyeOff, Sparkles, UserPlus, LogIn, AlertCircle,
  CheckCircle, BookOpen, BrainCircuit, Timer, CalendarCheck, ShieldCheck
} from 'lucide-react'
import { useStore } from '@/store'
import { cn } from '@/lib/utils'

const FEATURES = [
  { icon: BrainCircuit, label: 'Quiz from notes', labelAr: 'اختبارات من الملاحظات', color: '#3E9AA6' },
  { icon: BookOpen, label: 'Arabic tutor', labelAr: 'معلّم عربي مبسّط', color: '#C9A84C' },
  { icon: CalendarCheck, label: 'Exam countdown', labelAr: 'عدّاد الاختبارات', color: '#56A86B' },
  { icon: Timer, label: 'Focus sessions', labelAr: 'جلسات تركيز', color: '#4A90D9' },
]

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

function normalizeEmail(value: string) {
  return value.trim().toLowerCase().slice(0, 254)
}

function cleanName(value: string) {
  return value
    .replace(/\u0000/g, '')
    .replace(/[\u0001-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80)
}

export function AuthPage() {
  const { register, login, authError, authNotice, clearAuthError, lang, setLang, theme, setTheme } = useStore()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [linkError, setLinkError] = useState<string | null>(null)
  const [validationError, setValidationError] = useState<string | null>(null)
  const isAr = lang === 'ar'
  const t = (ar: string, en: string) => isAr ? ar : en

  useEffect(() => {
    const hash = window.location.hash.replace(/^#/, '')
    if (!hash) return
    const params = new URLSearchParams(hash)
    const errorCode = params.get('error_code')
    const errorDescription = params.get('error_description')
    if (!errorCode && !errorDescription) return

    setLinkError(errorCode === 'otp_expired'
      ? t(
          'رابط التأكيد منتهي أو سبق استخدامه. اطلب رابطاً جديداً من شاشة الدخول.',
          'This confirmation link expired or was already used. Request a fresh link from the sign-in screen.'
        )
      : t(
          'تعذر إكمال تسجيل الدخول من الرابط. أعد المحاولة من هذه الصفحة.',
          'The sign-in link could not be completed. Try again from this page.'
        ))
    window.history.replaceState({}, document.title, window.location.pathname + window.location.search)
  }, [isAr])

  const passwordChecks = useMemo(() => ({
    length: password.length >= 10,
    letter: /[A-Za-z\p{L}]/u.test(password),
    number: /\d/.test(password),
    bounded: password.length <= 128,
  }), [password])

  const validate = () => {
    const normalizedEmail = normalizeEmail(email)
    if (!EMAIL_PATTERN.test(normalizedEmail)) {
      return t('أدخل بريداً إلكترونياً صحيحاً.', 'Enter a valid email address.')
    }
    if (password.length > 128) {
      return t('كلمة المرور طويلة جداً.', 'The password is too long.')
    }
    if (mode === 'register') {
      const normalizedName = cleanName(name)
      if (normalizedName.length < 2) return t('أدخل اسماً من حرفين على الأقل.', 'Enter a name with at least two characters.')
      if (!passwordChecks.length || !passwordChecks.letter || !passwordChecks.number) {
        return t(
          'استخدم كلمة مرور من 10 أحرف على الأقل وتحتوي على حرف ورقم.',
          'Use at least 10 characters with a letter and a number.'
        )
      }
    } else if (!password) {
      return t('أدخل كلمة المرور.', 'Enter your password.')
    }
    return null
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    clearAuthError()
    setLinkError(null)
    const error = validate()
    setValidationError(error)
    if (error) return

    setLoading(true)
    try {
      if (mode === 'register') await register(cleanName(name), normalizeEmail(email), password)
      else await login(normalizeEmail(email), password)
    } finally {
      setLoading(false)
    }
  }

  const switchMode = (nextMode?: 'login' | 'register') => {
    setMode(nextMode ?? (mode === 'login' ? 'register' : 'login'))
    clearAuthError()
    setLinkError(null)
    setValidationError(null)
    setPassword('')
  }

  return (
    <div className={cn('min-h-screen flex', isAr ? 'flex-row-reverse' : 'flex-row')}
      dir={isAr ? 'rtl' : 'ltr'}
      style={{ background: theme === 'dark' ? '#0B2428' : '#f0f9fa' }}>
      <aside className="hidden lg:flex flex-col justify-between w-1/2 p-10 relative overflow-hidden"
        style={{ background: 'linear-gradient(145deg, #0B2428 0%, #1A4D53 50%, #2D7A84 100%)' }}>
        <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
          {[...Array(3)].map((_, index) => (
            <motion.div key={index}
              animate={{ scale: [1, 1.1, 1], opacity: [0.06, 0.12, 0.06] }}
              transition={{ duration: 5 + index, repeat: Infinity, delay: index }}
              className="absolute rounded-full"
              style={{
                width: `${180 + index * 100}px`,
                height: `${180 + index * 100}px`,
                background: 'radial-gradient(circle, #62B8C2, transparent)',
                top: `${10 + index * 25}%`,
                left: `${5 + index * 18}%`,
              }} />
          ))}
        </div>

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-12">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-white/15">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div><h1 className="font-display text-2xl text-white">نِبْرَاس</h1><p className="text-teal-200/60 text-xs">Nibras</p></div>
          </div>
          <h2 className="font-display text-4xl text-white mb-4 leading-tight">{t('ذاكر بذكاء قبل الاختبار', 'Study smarter before the exam')}</h2>
          <p className="text-teal-200/70 text-sm leading-relaxed max-w-sm mb-8">
            {t('حوّل النصوص المستخرجة وملاحظاتك إلى شرح وأسئلة تدريبية، مع حماية الحساب وحدود استخدام واضحة.', 'Turn extracted text and notes into explanations and practice questions with account protection and clear usage limits.')}
          </p>
          <div className="grid grid-cols-2 gap-3">
            {FEATURES.map(({ icon: Icon, label, labelAr, color }) => (
              <div key={label} className="flex items-center gap-2.5 bg-white/8 rounded-xl px-3 py-2.5 border border-white/10">
                <Icon className="w-4 h-4 shrink-0" style={{ color }} />
                <span className="text-xs text-white/80 font-medium">{t(labelAr, label)}</span>
              </div>
            ))}
          </div>
        </div>
        <p className="relative z-10 text-teal-300/40 text-xs">تم تطويره من قبل KIWI | محمد حمدي</p>
      </aside>

      <main className="flex-1 flex flex-col items-center justify-center p-6 sm:p-10 relative">
        <div className="absolute top-4 right-4 flex gap-2">
          <button type="button" onClick={() => setLang(isAr ? 'en' : 'ar')}
            className="px-3 py-1.5 rounded-lg border border-border/60 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted">
            {isAr ? 'EN' : 'ع'}
          </button>
          <button type="button" aria-label={isAr ? 'تغيير المظهر' : 'Toggle theme'} onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="px-3 py-1.5 rounded-lg border border-border/60 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted">
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
        </div>

        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-2 mb-8 justify-center">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#1A4D53,#3E9AA6)' }}>
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <h1 className="font-display text-2xl">نِبْرَاس</h1>
          </div>

          <div className="flex bg-muted/50 p-1 rounded-xl mb-6">
            {(['login', 'register'] as const).map(tab => (
              <button type="button" key={tab} onClick={() => switchMode(tab)}
                className={cn('flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-semibold transition-all',
                  mode === tab ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}>
                {tab === 'login' ? <LogIn className="w-3.5 h-3.5" /> : <UserPlus className="w-3.5 h-3.5" />}
                {tab === 'login' ? t('تسجيل الدخول', 'Login') : t('إنشاء حساب', 'Register')}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            <motion.form key={mode} onSubmit={handleSubmit}
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
              className="space-y-4" noValidate>
              <div>
                <h2 className="font-display text-2xl mb-1">{mode === 'login' ? t('أهلاً بعودتك', 'Welcome back') : t('انضم إلى نِبْرَاس', 'Join Nibras')}</h2>
                <p className="text-sm text-muted-foreground">{mode === 'login' ? t('ادخل لتكمل جلساتك الدراسية', 'Sign in to continue studying') : t('أنشئ حساباً آمناً ومؤكداً بالبريد', 'Create a secure, email-confirmed account')}</p>
              </div>

              {mode === 'register' && (
                <label className="block">
                  <span className="block text-xs font-medium text-muted-foreground mb-1.5">{t('الاسم', 'Full name')}</span>
                  <input type="text" value={name} maxLength={80} autoComplete="name"
                    onChange={event => { setName(event.target.value); setValidationError(null) }}
                    placeholder={t('اسمك', 'Your name')} dir="auto"
                    className="w-full px-3 py-2.5 rounded-xl bg-muted border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
                </label>
              )}

              <label className="block">
                <span className="block text-xs font-medium text-muted-foreground mb-1.5">{t('البريد الإلكتروني', 'Email')}</span>
                <input type="email" value={email} maxLength={254} autoComplete="email" inputMode="email"
                  onChange={event => { setEmail(event.target.value); setValidationError(null) }}
                  placeholder="student@university.edu" dir="ltr"
                  className="w-full px-3 py-2.5 rounded-xl bg-muted border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
              </label>

              <label className="block">
                <span className="block text-xs font-medium text-muted-foreground mb-1.5">{t('كلمة المرور', 'Password')}</span>
                <div className="relative">
                  <input type={showPassword ? 'text' : 'password'} value={password} maxLength={128}
                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                    onChange={event => { setPassword(event.target.value); setValidationError(null) }} dir="ltr"
                    placeholder={mode === 'register' ? t('10 أحرف مع حرف ورقم', '10+ characters with a letter and number') : t('كلمة المرور', 'Password')}
                    className={cn('w-full px-3 py-2.5 rounded-xl bg-muted border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/40', isAr ? 'pl-10' : 'pr-10')} />
                  <button type="button" onClick={() => setShowPassword(value => !value)}
                    aria-label={showPassword ? t('إخفاء كلمة المرور', 'Hide password') : t('إظهار كلمة المرور', 'Show password')}
                    className={cn('absolute top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground', isAr ? 'left-2.5' : 'right-2.5')}>
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </label>

              {mode === 'register' && password && (
                <div className="grid grid-cols-3 gap-2 text-[10px]">
                  <PasswordCheck ok={passwordChecks.length} label={t('10 أحرف', '10 chars')} />
                  <PasswordCheck ok={passwordChecks.letter} label={t('حرف', 'Letter')} />
                  <PasswordCheck ok={passwordChecks.number} label={t('رقم', 'Number')} />
                </div>
              )}

              <AuthMessage type="warning" message={linkError} />
              <AuthMessage type="error" message={validationError || authError} />
              <AuthMessage type="success" message={authNotice} />

              <motion.button whileTap={{ scale: 0.97 }} type="submit" disabled={loading}
                className="w-full py-3 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-70"
                style={{ background: 'linear-gradient(135deg, #1A4D53, #2D7A84)' }}>
                {loading
                  ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  : mode === 'login'
                    ? <><LogIn className="w-4 h-4" />{t('دخول', 'Sign in')}</>
                    : <><UserPlus className="w-4 h-4" />{t('إنشاء الحساب', 'Create account')}</>}
              </motion.button>

              <p className="text-center text-xs text-muted-foreground">
                {mode === 'login' ? t('ليس لديك حساب؟ ', "Don't have an account? ") : t('لديك حساب؟ ', 'Already have an account? ')}
                <button type="button" onClick={() => switchMode()} className="text-primary font-semibold hover:underline">
                  {mode === 'login' ? t('أنشئ حساباً', 'Register') : t('سجّل الدخول', 'Login')}
                </button>
              </p>

              <div className="bg-muted/50 rounded-xl p-3 text-xs text-muted-foreground border border-border/50 leading-relaxed flex gap-2">
                <ShieldCheck className="w-4 h-4 text-primary shrink-0" />
                <span>{t('يجب تأكيد البريد والموافقة على الخصوصية والشروط وإشعار الأمان قبل استخدام التطبيق.', 'Email confirmation and mandatory Privacy, Terms, and security acknowledgement are required before using the app.')}</span>
              </div>
            </motion.form>
          </AnimatePresence>
        </div>
      </main>
    </div>
  )
}

function PasswordCheck({ ok, label }: { ok: boolean; label: string }) {
  return <span className={cn('rounded-lg px-2 py-1 text-center border', ok ? 'text-emerald-500 border-emerald-500/30 bg-emerald-500/10' : 'text-muted-foreground border-border')}>{ok ? '✓ ' : ''}{label}</span>
}

function AuthMessage({ type, message }: { type: 'warning' | 'error' | 'success'; message?: string | null }) {
  if (!message) return null
  const classes = type === 'error'
    ? 'bg-destructive/10 border-destructive/30 text-destructive'
    : type === 'warning'
      ? 'bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400'
      : 'bg-teal-500/10 border-teal-500/30 text-teal-600 dark:text-teal-400'
  const Icon = type === 'success' ? CheckCircle : AlertCircle
  return (
    <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
      className={cn('flex items-start gap-2 border text-xs px-3 py-2.5 rounded-xl leading-relaxed', classes)} role="alert">
      <Icon className="w-3.5 h-3.5 mt-0.5 shrink-0" />{message}
    </motion.div>
  )
}
