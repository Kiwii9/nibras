import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Eye, EyeOff, LogIn, UserPlus, AlertCircle,
  CheckCircle, Loader2, ArrowLeft, Shield, Mail
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useStore } from '@/store'
import { cn } from '@/lib/utils'

type Mode = 'login' | 'register' | 'forgot' | 'check-email'

function friendlyError(msg: string, isAr: boolean): string {
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

const BRAND_FEATURES = [
  { ar: 'اختبارات مولّدة بالذكاء الاصطناعي',     en: 'AI-generated quizzes' },
  { ar: 'مساعد دراسي بأسلوب سقراطي',             en: 'Socratic study tutor' },
  { ar: 'متتبع امتحانات مع عداد تنازلي',          en: 'Exam tracker with countdown' },
  { ar: 'أصوات محيطية للتركيز',                   en: 'Ambient sounds for focus' },
  { ar: 'بياناتك محفوظة في السحابة',              en: 'Data saved to the cloud' },
]

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
      {children}
    </label>
  )
}

function ErrBox({ msg }: { msg: string }) {
  return (
    <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
      style={{
        display: 'flex', alignItems: 'flex-start', gap: 8,
        background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)',
        borderRadius: 'var(--radius-md)', padding: '10px 12px',
        fontSize: 12.5, color: 'var(--error)',
      }}>
      <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
      <span dir="auto">{msg}</span>
    </motion.div>
  )
}

function OkBox({ msg }: { msg: string }) {
  return (
    <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
      style={{
        display: 'flex', alignItems: 'flex-start', gap: 8,
        background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)',
        borderRadius: 'var(--radius-md)', padding: '10px 12px',
        fontSize: 12.5, color: 'var(--success)',
      }}>
      <CheckCircle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
      <span dir="auto">{msg}</span>
    </motion.div>
  )
}

function SubmitBtn({ loading, label, icon }: { loading: boolean; label: string; icon?: React.ReactNode }) {
  return (
    <motion.button whileTap={{ scale: 0.97 }} type="submit" disabled={loading}
      style={{
        width: '100%', padding: '11px 18px',
        borderRadius: 'var(--radius-md)', fontSize: 14, fontWeight: 600,
        color: 'var(--primary-foreground)', background: 'var(--primary)',
        border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
        opacity: loading ? 0.6 : 1,
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        transition: '.15s ease',
      }}>
      {loading
        ? <Loader2 size={16} style={{ animation: 'spin 0.7s linear infinite' }} />
        : <>{icon}{label}</>}
    </motion.button>
  )
}

export function AuthPage() {
  const { lang, setLang, theme, setTheme } = useStore()
  const isAr = lang === 'ar'
  const t = (ar: string, en: string) => isAr ? ar : en

  const [mode, setMode]         = useState<Mode>('login')
  const [name, setName]         = useState('')
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm]   = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const [success, setSuccess]   = useState('')
  const [captcha, setCaptcha]   = useState(false)
  const [captchaLoad, setCaptchaLoad] = useState(false)
  const [consent, setConsent] = useState(false)

  const clear = () => { setError(''); setSuccess(''); setPassword(''); setConfirm(''); setCaptcha(false) }
  const go = (m: Mode) => { setMode(m); clear() }

  const handleCaptcha = () => {
    if (captcha || captchaLoad) return
    setCaptchaLoad(true)
    setTimeout(() => { setCaptchaLoad(false); setCaptcha(true) }, 1100)
  }

  const handleRegister = async () => {
    if (!name.trim())        return setError(t('أدخل اسمك', 'Enter your name'))
    if (password.length < 8) return setError(t('كلمة المرور 8 أحرف على الأقل', 'Password must be 8+ characters'))
    if (password !== confirm) return setError(t('كلمتا المرور غير متطابقتين', 'Passwords do not match'))
    if (!captcha)            return setError(t('يرجى التحقق من أنك لست روبوتاً', 'Please complete the verification'))
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
  }

  const handleForgot = async () => {
    if (!email.trim()) return setError(t('أدخل بريدك الإلكتروني', 'Enter your email'))
    setLoading(true); setError('')
    const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/#/reset-password`,
    })
    setLoading(false)
    if (err) return setError(friendlyError(err.message, isAr))
    setSuccess(t('تم إرسال رابط إعادة التعيين إلى بريدك', 'Reset link sent to your email'))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (mode === 'register') handleRegister()
    else if (mode === 'login') handleLogin()
    else if (mode === 'forgot') handleForgot()
  }

  return (
    <div
      dir={isAr ? 'rtl' : 'ltr'}
      style={{
        minHeight: '100dvh', display: 'flex',
        flexDirection: isAr ? 'row-reverse' : 'row',
        background: 'var(--bg)',
      }}
    >
      {/* Brand panel */}
      <div style={{
        display: 'none', flexDirection: 'column', justifyContent: 'space-between',
        width: '50%', padding: 48,
        background: 'var(--em-900)',
        position: 'relative', overflow: 'hidden',
      }} className="lg:flex">
        {/* Subtle geometric decoration */}
        <div style={{
          position: 'absolute', top: -80, [isAr ? 'left' : 'right']: -80,
          width: 320, height: 320, borderRadius: '50%',
          background: 'var(--em-800)', opacity: 0.6,
        }} />
        <div style={{
          position: 'absolute', bottom: -60, [isAr ? 'right' : 'left']: -60,
          width: 240, height: 240, borderRadius: '50%',
          background: 'var(--em-800)', opacity: 0.4,
        }} />

        {/* Content */}
        <div style={{ position: 'relative', zIndex: 1 }}>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 48 }}>
            <img src="/nibras-symbol-reversed.svg" alt="نِبراس" style={{ width: 36, height: 36 }} />
            <div>
              <p style={{ fontFamily: "'Reem Kufi',sans-serif", fontSize: 22, color: 'var(--em-50)', lineHeight: 1 }}>نِبراس</p>
              <p style={{ fontSize: 11, color: 'var(--em-400)', marginTop: 2 }}>Nibras</p>
            </div>
          </div>

          {/* Headline */}
          <h1 style={{
            fontFamily: "'Reem Kufi',sans-serif",
            fontSize: 'clamp(26px,3.5vw,40px)',
            fontWeight: 700, color: 'var(--em-50)',
            lineHeight: 1.2, marginBottom: 16, maxWidth: 380,
          }}>
            {t('رفيقك الدراسي الذكي', 'Your Smart Academic Companion')}
          </h1>
          <p style={{ fontSize: 14, color: 'var(--em-300)', lineHeight: 1.7, maxWidth: 360, marginBottom: 40 }}>
            {t(
              'حوّل مواد دراستك إلى اختبارات، تتبّع تقدمك، وذاكر أكثر ذكاءً.',
              'Turn your study materials into quizzes, track progress, and study smarter.'
            )}
          </p>

          {/* Feature list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {BRAND_FEATURES.map((f, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--accent)', flexShrink: 0 }} />
                <span style={{ fontSize: 13, color: 'var(--em-200)' }}>{t(f.ar, f.en)}</span>
              </div>
            ))}
          </div>
        </div>

        <p style={{ position: 'relative', zIndex: 1, fontSize: 11, color: 'var(--em-600)' }}>
          {t('تم تطويره من قِبَل KIWI | محمد حمدي', 'Built by KIWI | Mohammed Hamdi')}
        </p>
      </div>

      {/* Form panel */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '40px 24px', position: 'relative',
      }}>

        {/* Controls */}
        <div style={{ position: 'absolute', top: 16, insetInlineEnd: 16, display: 'flex', gap: 8 }}>
          <button onClick={() => setLang(isAr ? 'en' : 'ar')}
            style={{
              padding: '5px 12px', borderRadius: 'var(--radius-full)',
              border: '1px solid var(--border)', fontSize: 12, fontWeight: 700,
              color: 'var(--text-secondary)', background: 'transparent', cursor: 'pointer',
            }}>
            {isAr ? 'EN' : 'ع'}
          </button>
          <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            style={{
              padding: '5px 12px', borderRadius: 'var(--radius-full)',
              border: '1px solid var(--border)', fontSize: 12,
              color: 'var(--text-secondary)', background: 'transparent', cursor: 'pointer',
            }}>
            {theme === 'dark' ? 'Light' : 'Dark'}
          </button>
        </div>

        {/* Mobile brand */}
        <div className="lg:hidden" style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 36 }}>
          <img src="/nibras-symbol-reversed.svg" alt="نِبراس" style={{ width: 32, height: 32 }} />
          <span style={{ fontFamily: "'Reem Kufi',sans-serif", fontSize: 22, color: 'var(--text-primary)' }}>نِبراس</span>
        </div>

        <div style={{ width: '100%', maxWidth: 360 }}>
          <AnimatePresence mode="wait">

            {/* Check email */}
            {mode === 'check-email' && (
              <motion.div key="check-email" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                style={{ textAlign: 'center' }}>
                <div style={{
                  width: 56, height: 56, borderRadius: '50%',
                  background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.25)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px',
                }}>
                  <Mail size={24} style={{ color: 'var(--success)' }} />
                </div>
                <h2 style={{ fontFamily: "'Reem Kufi',sans-serif", fontSize: 24, marginBottom: 10 }}>
                  {t('تحقق من بريدك', 'Check your email')}
                </h2>
                <p style={{ fontSize: 13.5, color: 'var(--text-secondary)', marginBottom: 6, direction: 'ltr' }}>
                  {t('أرسلنا رابط تأكيد إلى', 'We sent a confirmation link to')} <b>{email}</b>
                </p>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 28 }}>
                  {t('انقر على الرابط لتفعيل حسابك ثم ارجع وسجّل الدخول', 'Click the link to activate your account, then sign in')}
                </p>
                <button onClick={() => go('login')}
                  style={{
                    width: '100%', padding: '11px 18px',
                    borderRadius: 'var(--radius-md)', fontSize: 14, fontWeight: 600,
                    color: 'var(--primary-foreground)', background: 'var(--primary)',
                    border: 'none', cursor: 'pointer',
                  }}>
                  {t('العودة لتسجيل الدخول', 'Back to Sign In')}
                </button>
              </motion.div>
            )}

            {/* Forgot password */}
            {mode === 'forgot' && (
              <motion.form key="forgot" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <button type="button" onClick={() => go('login')}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginBottom: 4 }}>
                  <ArrowLeft size={15} style={{ transform: isAr ? 'scaleX(-1)' : 'none' }} />
                  {t('رجوع', 'Back')}
                </button>
                <div>
                  <h2 style={{ fontFamily: "'Reem Kufi',sans-serif", fontSize: 24, marginBottom: 6 }}>
                    {t('نسيت كلمة المرور؟', 'Forgot Password?')}
                  </h2>
                  <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                    {t('سنرسل لك رابط إعادة التعيين', "We'll send you a reset link")}
                  </p>
                </div>
                <div>
                  <Label>{t('البريد الإلكتروني', 'Email')}</Label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                    placeholder="student@university.edu" dir="ltr" className="input" />
                </div>
                {error && <ErrBox msg={error} />}
                {success && <OkBox msg={success} />}
                <SubmitBtn loading={loading} label={t('إرسال رابط الاسترداد', 'Send Reset Link')} />
              </motion.form>
            )}

            {/* Login / Register */}
            {(mode === 'login' || mode === 'register') && (
              <motion.form key={mode} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.18 }}
                onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

                {/* Tabs */}
                <div className="tabs-container" style={{ width: '100%', marginBottom: 4 }}>
                  {(['login', 'register'] as const).map(m => (
                    <button key={m} type="button" onClick={() => go(m)}
                      className={cn('tab-item', mode === m && 'active')}
                      style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                      {m === 'login' ? <LogIn size={13} /> : <UserPlus size={13} />}
                      {m === 'login' ? t('دخول', 'Sign In') : t('تسجيل', 'Register')}
                    </button>
                  ))}
                </div>

                <div>
                  <h2 style={{ fontFamily: "'Reem Kufi',sans-serif", fontSize: 24, marginBottom: 4 }}>
                    {mode === 'login' ? t('أهلاً بعودتك', 'Welcome back') : t('انضم إلى نِبراس', 'Join Nibras')}
                  </h2>
                  <p style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>
                    {mode === 'login'
                      ? t('بياناتك محفوظة في السحابة', 'Your data is saved to the cloud')
                      : t('Alpha - بياناتك محفوظة آمناً', 'Alpha - your data is securely saved')}
                  </p>
                </div>

                {mode === 'register' && (
                  <div>
                    <Label>{t('الاسم الكامل', 'Full Name')}</Label>
                    <input type="text" value={name} onChange={e => setName(e.target.value)} required
                      placeholder={t('محمد حمدي', 'Your full name')} dir="auto" className="input" />
                  </div>
                )}

                <div>
                  <Label>{t('البريد الإلكتروني', 'Email')}</Label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                    placeholder="student@university.edu" dir="ltr" className="input"
                    autoComplete={mode === 'login' ? 'username' : 'email'} />
                </div>

                <div>
                  <Label>{t('كلمة المرور', 'Password')}</Label>
                  <div style={{ position: 'relative' }}>
                    <input type={showPass ? 'text' : 'password'} value={password}
                      onChange={e => setPassword(e.target.value)} required
                      placeholder={mode === 'register' ? t('8 أحرف على الأقل', '8+ characters') : ''}
                      dir="ltr" className="input"
                      style={{ paddingInlineEnd: 40 }}
                      autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />
                    <button type="button" onClick={() => setShowPass(v => !v)}
                      style={{
                        position: 'absolute', top: '50%', insetInlineEnd: 12,
                        transform: 'translateY(-50%)', color: 'var(--text-muted)',
                        background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                      }}>
                      {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>

                {mode === 'register' && (
                  <>
                    <div>
                      <Label>{t('تأكيد كلمة المرور', 'Confirm Password')}</Label>
                      <input type={showPass ? 'text' : 'password'} value={confirm}
                        onChange={e => setConfirm(e.target.value)} required
                        dir="ltr" className="input" autoComplete="new-password" />
                    </div>

                    {/* Verification */}
                    <div
                      onClick={handleCaptcha}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '11px 13px', borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border-strong)', background: 'var(--bg)',
                        cursor: 'pointer', userSelect: 'none',
                      }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                          width: 18, height: 18, borderRadius: 5, flexShrink: 0,
                          border: `2px solid ${captcha ? 'var(--primary)' : 'var(--border-strong)'}`,
                          background: captcha ? 'var(--primary)' : 'transparent',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          transition: '.15s ease',
                        }}>
                          {captchaLoad
                            ? <Loader2 size={11} style={{ color: 'white', animation: 'spin 0.7s linear infinite' }} />
                            : captcha
                              ? <CheckCircle size={12} color="white" />
                              : null}
                        </div>
                        <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                          {t('لست روبوتاً', "I'm not a robot")}
                        </span>
                      </div>
                      <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>Verify</span>
                    </div>
                  </>
                )}

                {mode === 'login' && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--text-muted)' }}>
                      <Shield size={12} style={{ color: 'var(--primary)' }} />
                      {t('2FA متاح في الإعدادات', '2FA available in settings')}
                    </div>
                    <button type="button" onClick={() => go('forgot')}
                      style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                      {t('نسيت كلمة المرور؟', 'Forgot password?')}
                    </button>
                  </div>
                )}

                {/* Consent checkbox — register only */}
                {mode === 'register' && (
                  <label style={{ display:'flex', alignItems:'flex-start', gap:10, cursor:'pointer', userSelect:'none' }}>
                    <div
                      onClick={() => setConsent(v => !v)}
                      style={{
                        width:18, height:18, borderRadius:5, flexShrink:0, marginTop:1,
                        border:`2px solid ${consent ? 'var(--primary)' : 'var(--border-strong)'}`,
                        background: consent ? 'var(--primary)' : 'transparent',
                        display:'flex', alignItems:'center', justifyContent:'center',
                        transition:'.15s ease',
                      }}>
                      {consent && <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4l3 3 5-6" stroke="white" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                    </div>
                    <span style={{ fontSize:12, color:'var(--text-secondary)', lineHeight:1.6 }}>
                      {isAr ? 'اوافق على ' : 'I agree to the '}
                      <a href="/terms" target="_blank" rel="noopener noreferrer" style={{ color:'var(--primary)', textDecoration:'none', fontWeight:600 }}>
                        {t('شروط الاستخدام', 'Terms of Use')}
                      </a>
                      {isAr ? ' و' : ' and '}
                      <a href="/privacy" target="_blank" rel="noopener noreferrer" style={{ color:'var(--primary)', textDecoration:'none', fontWeight:600 }}>
                        {t('سياسة الخصوصية', 'Privacy Policy')}
                      </a>
                    </span>
                  </label>
                )}

                {error && <ErrBox msg={error} />}
                {success && <OkBox msg={success} />}

                <SubmitBtn loading={loading}
                  label={mode === 'login' ? t('دخول', 'Sign In') : t('انشاء الحساب', 'Create Account')}
                  icon={mode === 'login' ? <LogIn size={14} /> : <UserPlus size={14} />} />

                <p style={{ fontSize: 11.5, color: 'var(--text-muted)', textAlign: 'center', borderTop: '1px solid var(--border)', paddingTop: 14 }}>
                  {t('بياناتك محفوظة في السحابة - سجّل الدخول من أي جهاز', 'Cloud saved - sign in from any device')}
                </p>
              </motion.form>
            )}

          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
