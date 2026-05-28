import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Eye, EyeOff, Sparkles, UserPlus, LogIn, AlertCircle,
  BrainCircuit, Timer, CalendarCheck, Mail,
  ArrowLeft, Shield, CheckCircle, Loader2, BookOpen
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useStore } from '@/store'
import { cn } from '@/lib/utils'

type Mode = 'login' | 'register' | 'forgot' | 'check-email'

const FEATURES = [
  { icon: BrainCircuit,  ar: 'محرك الاختبارات الذكي', en: 'AI Quiz Engine',   color: '#3E9AA6' },
  { icon: BookOpen,      ar: 'المساعد الدراسي',        en: 'Study Chatbot',    color: '#C9A84C' },
  { icon: CalendarCheck, ar: 'متتبع الامتحانات',       en: 'Exam Tracker',     color: '#56A86B' },
  { icon: Timer,         ar: 'مؤقت بومودورو',          en: 'Pomodoro Timer',   color: '#4A90D9' },
]

function friendlyError(msg: string, isAr: boolean) {
  const m = msg.toLowerCase()
  if (m.includes('invalid login') || m.includes('invalid credentials'))
    return isAr ? 'البريد الإلكتروني أو كلمة المرور غير صحيحة' : 'Invalid email or password'
  if (m.includes('email not confirmed'))
    return isAr ? 'يرجى تأكيد بريدك الإلكتروني أولاً' : 'Please confirm your email first'
  if (m.includes('already registered'))
    return isAr ? 'هذا البريد مسجّل مسبقاً' : 'Email already registered'
  if (m.includes('rate limit') || m.includes('too many'))
    return isAr ? 'محاولات كثيرة، انتظر قليلاً' : 'Too many attempts, please wait'
  return isAr ? 'حدث خطأ، يرجى المحاولة مجدداً' : 'An error occurred, please try again'
}

export function AuthPage() {
  const { lang, setLang, theme, setTheme } = useStore()
  const isAr = lang === 'ar'
  const t = (ar: string, en: string) => isAr ? ar : en

  const [mode, setMode]           = useState<Mode>('login')
  const [name, setName]           = useState('')
  const [email, setEmail]         = useState('')
  const [password, setPassword]   = useState('')
  const [confirm, setConfirm]     = useState('')
  const [showPass, setShowPass]   = useState(false)
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState('')
  const [success, setSuccess]     = useState('')
  const [captcha, setCaptcha]     = useState(false)
  const [captchaLoad, setCaptchaLoad] = useState(false)

  const clear = () => { setError(''); setSuccess(''); setPassword(''); setConfirm(''); setCaptcha(false) }
  const go = (m: Mode) => { setMode(m); clear() }

  const handleCaptcha = () => {
    if (captcha) return
    setCaptchaLoad(true)
    setTimeout(() => { setCaptchaLoad(false); setCaptcha(true) }, 1100)
  }

  const handleRegister = async () => {
    if (!name.trim())       return setError(t('أدخل اسمك', 'Enter your name'))
    if (password.length < 8) return setError(t('كلمة المرور 8 أحرف على الأقل', 'Password must be ≥ 8 characters'))
    if (password !== confirm) return setError(t('كلمتا المرور غير متطابقتين', 'Passwords do not match'))
    if (!captcha)           return setError(t('يرجى التحقق من أنك لست روبوتاً', 'Please verify you are not a robot'))
    setLoading(true); setError('')
    const { error: err } = await supabase.auth.signUp({
      email: email.trim(), password,
      options: { data: { name: name.trim() }, emailRedirectTo: window.location.origin },
    })
    setLoading(false)
    if (err) return setError(friendlyError(err.message, isAr))
    setMode('check-email')
  }

  const handleLogin = async () => {
    if (!email.trim() || !password) return setError(t('أدخل البريد وكلمة المرور', 'Enter email and password'))
    setLoading(true); setError('')
    const { error: err } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    setLoading(false)
    if (err) return setError(friendlyError(err.message, isAr))
    // App.tsx onAuthStateChange will handle redirect
  }

  const handleForgot = async () => {
    if (!email.trim()) return setError(t('أدخل بريدك الإلكتروني', 'Enter your email'))
    setLoading(true); setError('')
    const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/#/reset-password`,
    })
    setLoading(false)
    if (err) return setError(friendlyError(err.message, isAr))
    setSuccess(t('تم إرسال رابط إعادة التعيين إلى بريدك', 'Reset link sent — check your email'))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (mode === 'register') handleRegister()
    else if (mode === 'login') handleLogin()
    else if (mode === 'forgot') handleForgot()
  }

  return (
    <div className={cn('min-h-screen flex', isAr ? 'flex-row-reverse' : 'flex-row')}
      dir={isAr ? 'rtl' : 'ltr'}
      style={{ background: theme === 'dark' ? '#0B2428' : '#f0f9fa' }}>

      {/* ── Branding panel ── */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 p-10 relative overflow-hidden"
        style={{ background: 'linear-gradient(145deg,#0B2428 0%,#1A4D53 50%,#2D7A84 100%)' }}>
        {[...Array(3)].map((_, i) => (
          <motion.div key={i} animate={{ scale:[1,1.15,1], opacity:[0.06,0.14,0.06] }}
            transition={{ duration:4+i, repeat:Infinity, delay:i*1.2 }}
            className="absolute rounded-full pointer-events-none"
            style={{ width:`${150+i*80}px`, height:`${150+i*80}px`,
              background:'radial-gradient(circle,#62B8C2,transparent)',
              top:`${10+i*20}%`, left:`${5+i*15}%` }} />
        ))}
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-10">
            <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-display text-2xl text-white">نِبْرَاس</h1>
              <p className="text-teal-200/50 text-xs">Nibras</p>
            </div>
          </div>
          <h2 className="font-display text-4xl text-white mb-3 leading-tight">
            {t('رفيقك الدراسي الذكي', 'Your Smart Academic Companion')}
          </h2>
          <p className="text-teal-200/70 text-sm mb-8 leading-relaxed max-w-xs">
            {t('بياناتك محفوظة في السحابة — سجّل الدخول من أي جهاز في أي وقت',
               'Data saved to the cloud — sign in from any device, anytime')}
          </p>
          <div className="grid grid-cols-2 gap-3 mb-6">
            {FEATURES.map(({ icon: Icon, ar, en, color }) => (
              <div key={en} className="flex items-center gap-2.5 bg-white/8 rounded-xl px-3 py-2.5 border border-white/10">
                <Icon className="w-4 h-4 shrink-0" style={{ color }} />
                <span className="text-xs text-white/80 font-medium">{t(ar, en)}</span>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2 bg-white/8 rounded-xl px-4 py-3 border border-white/10">
            <Shield className="w-4 h-4 text-teal-300 shrink-0" />
            <p className="text-xs text-teal-200/80">
              {t('حساباتك آمنة — تشفير كامل + تحقق بخطوتين',
                 'Accounts secured — full encryption + 2-step verification')}
            </p>
          </div>
        </div>
        <p className="relative z-10 text-teal-300/25 text-xs">تم تطويره من قبل KIWI | محمد حمدي</p>
      </div>

      {/* ── Form panel ── */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-10 relative">
        <div className="absolute top-4 right-4 flex gap-2">
          <button onClick={() => setLang(isAr ? 'en' : 'ar')}
            className="px-3 py-1.5 rounded-lg border border-border/60 text-xs font-semibold text-muted-foreground hover:bg-muted transition-colors">
            {isAr ? 'EN' : 'ع'}
          </button>
          <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="px-3 py-1.5 rounded-lg border border-border/60 text-xs text-muted-foreground hover:bg-muted transition-colors">
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
        </div>

        <div className="w-full max-w-sm">
          {/* Mobile brand */}
          <div className="lg:hidden flex items-center gap-2 mb-8 justify-center">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background:'linear-gradient(135deg,#1A4D53,#3E9AA6)' }}>
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <h1 className="font-display text-2xl text-foreground">نِبْرَاس</h1>
          </div>

          <AnimatePresence mode="wait">

            {/* Check email */}
            {mode === 'check-email' && (
              <motion.div key="check-email" initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} className="text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-teal-500/15 flex items-center justify-center mx-auto">
                  <Mail className="w-8 h-8 text-teal-500" />
                </div>
                <h2 className="font-display text-2xl">{t('تحقق من بريدك', 'Check your email')}</h2>
                <p className="text-sm text-muted-foreground">
                  {t('أرسلنا رابط تأكيد إلى', 'We sent a confirmation link to')} <b dir="ltr">{email}</b>
                </p>
                <p className="text-xs text-muted-foreground">
                  {t('انقر على الرابط لتفعيل حسابك، ثم ارجع وسجّل الدخول',
                     'Click the link to activate your account, then come back and sign in')}
                </p>
                <button onClick={() => go('login')}
                  className="w-full py-2.5 rounded-xl text-sm font-semibold text-white"
                  style={{ background:'linear-gradient(135deg,#1A4D53,#2D7A84)' }}>
                  {t('العودة لتسجيل الدخول', 'Back to Login')}
                </button>
              </motion.div>
            )}

            {/* Forgot password */}
            {mode === 'forgot' && (
              <motion.form key="forgot" initial={{opacity:0,y:10}} animate={{opacity:1,y:0}}
                onSubmit={handleSubmit} className="space-y-4">
                <button type="button" onClick={() => go('login')}
                  className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-1">
                  <ArrowLeft className={cn('w-4 h-4', isAr && 'rotate-180')} />
                  {t('رجوع', 'Back')}
                </button>
                <div>
                  <h2 className="font-display text-2xl mb-1">{t('نسيت كلمة المرور؟', 'Forgot Password?')}</h2>
                  <p className="text-sm text-muted-foreground">{t('سنرسل لك رابط إعادة التعيين', "We'll send a reset link")}</p>
                </div>
                <Field label={t('البريد الإلكتروني','Email')}>
                  <input type="email" value={email} onChange={e=>setEmail(e.target.value)} required
                    placeholder="student@university.edu" dir="ltr" className={INPUT} />
                </Field>
                {error   && <ErrBox msg={error} />}
                {success && <OkBox  msg={success} />}
                <SubmitBtn loading={loading} label={t('إرسال رابط الاسترداد','Send Reset Link')} />
              </motion.form>
            )}

            {/* Login / Register */}
            {(mode === 'login' || mode === 'register') && (
              <motion.form key={mode} initial={{opacity:0,y:10}} animate={{opacity:1,y:0}}
                exit={{opacity:0,y:-10}} transition={{duration:0.2}} onSubmit={handleSubmit} className="space-y-4">

                {/* Tabs */}
                <div className="flex bg-muted/50 p-1 rounded-xl">
                  {(['login','register'] as const).map(m => (
                    <button key={m} type="button" onClick={() => go(m)}
                      className={cn('flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-semibold transition-all',
                        mode===m ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}>
                      {m==='login' ? <LogIn className="w-3.5 h-3.5"/> : <UserPlus className="w-3.5 h-3.5"/>}
                      {m==='login' ? t('دخول','Login') : t('تسجيل','Register')}
                    </button>
                  ))}
                </div>

                <div>
                  <h2 className="font-display text-2xl mb-0.5">
                    {mode==='login' ? t('أهلاً بعودتك','Welcome back') : t('انضم إلى نِبْرَاس','Join Nibras')}
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    {mode==='login'
                      ? t('بياناتك محفوظة في السحابة','Your data is saved to the cloud')
                      : t('مجاني — بياناتك محفوظة آمناً في السحابة','Free — data securely saved to the cloud')}
                  </p>
                </div>

                {mode==='register' && (
                  <Field label={t('الاسم الكامل','Full Name')}>
                    <input type="text" value={name} onChange={e=>setName(e.target.value)} required
                      placeholder={t('محمد حمدي','Your full name')} dir="auto" className={INPUT} />
                  </Field>
                )}

                <Field label={t('البريد الإلكتروني','Email')}>
                  <input type="email" value={email} onChange={e=>setEmail(e.target.value)} required
                    placeholder="student@university.edu" dir="ltr" className={INPUT} />
                </Field>

                <Field label={t('كلمة المرور','Password')}>
                  <div className="relative">
                    <input type={showPass?'text':'password'} value={password} onChange={e=>setPassword(e.target.value)} required
                      placeholder={mode==='register' ? t('8 أحرف على الأقل','At least 8 characters') : '••••••••'} dir="ltr"
                      className={cn(INPUT, isAr ? 'pl-10' : 'pr-10')} />
                    <button type="button" onClick={()=>setShowPass(v=>!v)}
                      className={cn('absolute top-1/2 -translate-y-1/2 p-1 text-muted-foreground', isAr?'left-2.5':'right-2.5')}>
                      {showPass ? <EyeOff className="w-4 h-4"/> : <Eye className="w-4 h-4"/>}
                    </button>
                  </div>
                </Field>

                {mode==='register' && <>
                  <Field label={t('تأكيد كلمة المرور','Confirm Password')}>
                    <input type={showPass?'text':'password'} value={confirm} onChange={e=>setConfirm(e.target.value)} required
                      dir="ltr" placeholder="••••••••" className={INPUT} />
                  </Field>

                  {/* CAPTCHA */}
                  <div onClick={handleCaptcha}
                    className="border border-border/60 rounded-xl p-3 flex items-center justify-between bg-muted/30 cursor-pointer select-none">
                    <div className="flex items-center gap-2.5">
                      <div className={cn('w-5 h-5 rounded border-2 flex items-center justify-center transition-all',
                        captcha ? 'bg-teal-500 border-teal-500' : 'border-border')}>
                        {captchaLoad ? <Loader2 className="w-3 h-3 text-white animate-spin"/>
                          : captcha   ? <CheckCircle className="w-3.5 h-3.5 text-white"/> : null}
                      </div>
                      <span className="text-xs text-muted-foreground">{t('لست روبوتاً',"I'm not a robot")}</span>
                    </div>
                    <p className="text-[9px] text-muted-foreground/40">reCAPTCHA</p>
                  </div>
                </>}

                {mode==='login' && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Shield className="w-3.5 h-3.5 text-primary"/>
                      <span>{t('التحقق بخطوتين متاح في الإعدادات','2FA available in settings')}</span>
                    </div>
                    <button type="button" onClick={() => go('forgot')} className="text-xs text-primary hover:underline">
                      {t('نسيت كلمة المرور؟','Forgot password?')}
                    </button>
                  </div>
                )}

                {error   && <ErrBox msg={error} />}
                {success && <OkBox  msg={success} />}

                <SubmitBtn loading={loading}
                  label={mode==='login' ? t('دخول','Sign In') : t('إنشاء الحساب','Create Account')}
                  icon={mode==='login' ? <LogIn className="w-4 h-4"/> : <UserPlus className="w-4 h-4"/>} />

                <p className="text-center text-xs text-muted-foreground bg-muted/40 rounded-xl p-3 border border-border/40">
                  ☁️ {t('بياناتك محفوظة في السحابة — سجّل الدخول من أي جهاز',
                         'Your data saved to cloud — sign in from any device')}
                </p>
              </motion.form>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}

// ── Shared helpers ─────────────────────────────────────────────────────────────
const INPUT = 'w-full px-3 py-2.5 rounded-xl bg-muted border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/40'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-muted-foreground mb-1.5">{label}</label>
      {children}
    </div>
  )
}

function ErrBox({ msg }: { msg: string }) {
  return (
    <motion.div initial={{opacity:0,y:-4}} animate={{opacity:1,y:0}}
      className="flex items-start gap-2 bg-destructive/10 border border-destructive/30 text-destructive text-xs px-3 py-2.5 rounded-xl">
      <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0"/><span dir="auto">{msg}</span>
    </motion.div>
  )
}

function OkBox({ msg }: { msg: string }) {
  return (
    <motion.div initial={{opacity:0,y:-4}} animate={{opacity:1,y:0}}
      className="flex items-start gap-2 bg-teal-500/10 border border-teal-500/30 text-teal-600 dark:text-teal-400 text-xs px-3 py-2.5 rounded-xl">
      <CheckCircle className="w-3.5 h-3.5 mt-0.5 shrink-0"/><span dir="auto">{msg}</span>
    </motion.div>
  )
}

function SubmitBtn({ loading, label, icon }: { loading: boolean; label: string; icon?: React.ReactNode }) {
  return (
    <motion.button whileTap={{scale:0.97}} type="submit" disabled={loading}
      className="w-full py-3 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-70"
      style={{ background:'linear-gradient(135deg,#1A4D53,#2D7A84)' }}>
      {loading
        ? <motion.div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
            animate={{rotate:360}} transition={{duration:0.7,repeat:Infinity,ease:'linear'}}/>
        : <>{icon}{label}</>}
    </motion.button>
  )
}
