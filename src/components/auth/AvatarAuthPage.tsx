/**
 * AvatarAuthPage.tsx
 *
 * Replaces the left "brand panel" of AuthPage with a large reactive avatar.
 * The avatar is wired to form state via expression API — no CSS faking.
 *
 * Layout: full-height split on lg+, avatar on top / form below on mobile.
 * Accent: Nibras teal (#3E9AA6 / var(--em-400))
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Eye, EyeOff, LogIn, UserPlus, AlertCircle,
  CheckCircle, Loader2, ArrowLeft, Shield, Mail
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useStore } from '@/store'
import { cn } from '@/lib/utils'
import { AvatarWidget, AvatarExpression } from './AvatarWidget'

// ── Types ────────────────────────────────────────────────────────────────────

type Mode = 'login' | 'register' | 'forgot' | 'check-email'
type FieldName = 'name' | 'email' | 'password' | 'confirm' | null

// ── Helpers ──────────────────────────────────────────────────────────────────

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

// ── Sub-components ────────────────────────────────────────────────────────────

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, marginBottom: 6, color: 'var(--text-secondary)' }}>
      {children}
    </label>
  )
}

function ErrBox({ msg }: { msg: string }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '10px 12px', borderRadius: 'var(--radius-md)',
      background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
      color: 'var(--error)', fontSize: 13,
    }}>
      <AlertCircle size={14} style={{ flexShrink: 0 }} />
      {msg}
    </div>
  )
}

function OkBox({ msg }: { msg: string }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '10px 12px', borderRadius: 'var(--radius-md)',
      background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)',
      color: 'var(--success)', fontSize: 13,
    }}>
      <CheckCircle size={14} style={{ flexShrink: 0 }} />
      {msg}
    </div>
  )
}

function SubmitBtn({ loading, label, icon }: { loading: boolean; label: string; icon?: React.ReactNode }) {
  return (
    <button
      type="submit"
      disabled={loading}
      style={{
        width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        padding: '12px 20px', borderRadius: 'var(--radius-md)',
        background: 'var(--primary)', color: 'var(--primary-foreground)',
        fontSize: 14, fontWeight: 700, border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
        opacity: loading ? 0.7 : 1, transition: 'opacity .15s, transform .1s',
      }}
      onMouseEnter={e => { if (!loading) (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)' }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(0)' }}
    >
      {loading ? <Loader2 size={15} style={{ animation: 'spin 0.7s linear infinite' }} /> : icon}
      {label}
    </button>
  )
}

// ── Mouse tracker hook ────────────────────────────────────────────────────────

function useMouseTracker(active: boolean) {
  const [target, setTarget] = useState({ x: 0, y: 0 })
  const smoothRef = useRef({ x: 0, y: 0 })
  const rawRef = useRef({ x: 0, y: 0 })
  const rafRef = useRef(0)

  useEffect(() => {
    if (!active) return

    const onMove = (e: MouseEvent) => {
      // Normalise to -1..1 relative to viewport centre
      rawRef.current = {
        x: ((e.clientX / window.innerWidth)  - 0.5) * 2,
        y: ((e.clientY / window.innerHeight) - 0.5) * 2,
      }
    }
    window.addEventListener('mousemove', onMove)

    function tick() {
      smoothRef.current.x += (rawRef.current.x - smoothRef.current.x) * 0.06
      smoothRef.current.y += (rawRef.current.y - smoothRef.current.y) * 0.06
      setTarget({ x: smoothRef.current.x, y: smoothRef.current.y })
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)

    return () => {
      window.removeEventListener('mousemove', onMove)
      cancelAnimationFrame(rafRef.current)
    }
  }, [active])

  return target
}

// ── Glow blob ─────────────────────────────────────────────────────────────────

function GlowBlob({ burst }: { burst: boolean }) {
  return (
    <div
      aria-hidden="true"
      style={{
        position: 'absolute',
        left: '50%', top: '50%',
        transform: 'translate(-50%, -50%)',
        width: 340, height: 340,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(62,154,166,0.28) 0%, rgba(62,154,166,0.10) 45%, transparent 72%)',
        animation: burst ? 'glow-burst 0.8s ease-out forwards' : 'glow-pulse 3.2s ease-in-out infinite',
        pointerEvents: 'none',
        zIndex: 0,
      }}
    />
  )
}

// ── Avatar stage ──────────────────────────────────────────────────────────────

interface AvatarStageProps {
  expression: AvatarExpression
  eyeTarget: { x: number; y: number }
  glowBurst: boolean
  title: string
  subtitle: string
  features: { ar: string; en: string }[]
  isAr: boolean
  t: (ar: string, en: string) => string
}

function AvatarStage({ expression, eyeTarget, glowBurst, title, subtitle, features, isAr, t }: AvatarStageProps) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      width: '100%', height: '100%',
      background: 'var(--em-900)',
      position: 'relative', overflow: 'hidden',
      padding: '32px 40px',
      minHeight: 420,
    }}>
      {/* Subtle background rings */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse 70% 60% at 50% 40%, rgba(62,154,166,0.08) 0%, transparent 70%)',
      }} />

      {/* Logo */}
      <div style={{
        position: 'absolute', top: 28, left: isAr ? undefined : 36, right: isAr ? 36 : undefined,
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <img src="/nibras-symbol-reversed.svg" alt="نِبراس" style={{ width: 28, height: 28 }} />
        <span style={{ fontFamily: "'Reem Kufi',sans-serif", fontSize: 18, color: 'var(--em-50)', lineHeight: 1 }}>
          نِبراس
        </span>
      </div>

      {/* Alpha badge */}
      <div style={{ position: 'absolute', top: 32, right: isAr ? undefined : 36, left: isAr ? 36 : undefined }}>
        <span style={{
          fontSize: 10, fontWeight: 700, padding: '3px 10px',
          borderRadius: 'var(--radius-full)',
          background: 'rgba(109,94,248,0.18)',
          color: 'var(--violet)',
          border: '1px solid rgba(109,94,248,0.3)',
          letterSpacing: '0.05em',
        }}>Alpha</span>
      </div>

      {/* Avatar hero */}
      <div style={{ position: 'relative', zIndex: 1, marginTop: 16 }}>
        <GlowBlob burst={glowBurst} />
        <motion.div
          animate={expression === 'success'
            ? { scale: [1, 1.06, 1], rotate: [0, -3, 3, 0] }
            : expression === 'error'
            ? { x: [-4, 4, -4, 4, 0] }
            : {}}
          transition={{ duration: 0.5, ease: 'easeInOut' }}
          style={{ position: 'relative', zIndex: 1 }}
        >
          <AvatarWidget
            expression={expression}
            eyeTarget={expression === 'mouse' ? eyeTarget : undefined}
            size={200}
          />
        </motion.div>
      </div>

      {/* Text below avatar */}
      <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', marginTop: 24, maxWidth: 340 }}>
        <h2 style={{
          fontFamily: "'Reem Kufi',sans-serif",
          fontSize: 'clamp(20px,2.5vw,28px)',
          fontWeight: 700, color: 'var(--em-50)',
          lineHeight: 1.2, marginBottom: 8,
        }}>
          {title}
        </h2>
        <p style={{ fontSize: 13, color: 'var(--em-400)', lineHeight: 1.65 }}>
          {subtitle}
        </p>
      </div>

      {/* Feature list */}
      <div style={{
        position: 'relative', zIndex: 1,
        display: 'flex', flexDirection: 'column', gap: 8,
        marginTop: 28, width: '100%', maxWidth: 300,
      }}>
        {features.map((f, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <div style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--em-400)', flexShrink: 0 }} />
            <span style={{ fontSize: 12.5, color: 'var(--em-300)' }}>{t(f.ar, f.en)}</span>
          </div>
        ))}
      </div>

      {/* Credit */}
      <p style={{
        position: 'absolute', bottom: 20,
        fontSize: 10.5, color: 'var(--em-700)',
        fontFamily: "'IBM Plex Mono',monospace",
      }}>
        {t('بناه KIWI | محمد حمدي', 'Built by KIWI | Mohammed Hamdi')}
      </p>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function AvatarAuthPage() {
  const { lang, setLang, theme, setTheme } = useStore()
  const isAr = lang === 'ar'
  const t = (ar: string, en: string) => isAr ? ar : en

  // Form state
  const [mode, setMode]     = useState<Mode>('login')
  const [name, setName]     = useState('')
  const [email, setEmail]   = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm]   = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const [success, setSuccess]   = useState('')
  const [captcha, setCaptcha]   = useState(false)
  const [captchaLoad, setCaptchaLoad] = useState(false)
  const [consent, setConsent]   = useState(false)

  // Avatar state
  const [focusedField, setFocusedField] = useState<FieldName>(null)
  const [fieldError, setFieldError]     = useState<FieldName>(null)
  const [submitted, setSubmitted]       = useState(false)
  const [glowBurst, setGlowBurst]       = useState(false)

  // Mouse tracking — only active when no field is focused
  const mouseTarget = useMouseTracker(focusedField === null)

  // Clear error flash after 2s
  useEffect(() => {
    if (!fieldError) return
    const t = setTimeout(() => setFieldError(null), 2000)
    return () => clearTimeout(t)
  }, [fieldError])

  // Clear success after 3s
  useEffect(() => {
    if (!submitted) return
    const t = setTimeout(() => setSubmitted(false), 3000)
    return () => clearTimeout(t)
  }, [submitted])

  // Derive expression
  const expression: AvatarExpression = (() => {
    if (submitted)                     return 'success'
    if (fieldError)                    return 'error'
    if (focusedField === 'password' || focusedField === 'confirm') return 'eyes-covered'
    if (focusedField === 'name')       return 'look-left'
    if (focusedField === 'email')      return 'look-right'
    if (focusedField === null && !submitted) return 'mouse'
    return 'idle'
  })()

  // Handlers
  const clear = () => { setError(''); setSuccess(''); setPassword(''); setConfirm(''); setCaptcha(false) }
  const go = (m: Mode) => { setMode(m); clear() }

  const handleFocus = useCallback((field: FieldName) => setFocusedField(field), [])
  const handleBlur  = useCallback((field: FieldName, value: string) => {
    setFocusedField(null)
    // Inline validation on blur
    if (field === 'email' && value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      setFieldError('email')
    } else if (field === 'password' && value && value.length < 8) {
      setFieldError('password')
    } else if (field === 'confirm' && value && value !== password) {
      setFieldError('confirm')
    }
  }, [password])

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
    // Success flash
    setSubmitted(true)
    setGlowBurst(true)
    setTimeout(() => setGlowBurst(false), 1000)
    setTimeout(() => setMode('check-email'), 1400)
  }

  const handleLogin = async () => {
    if (!email.trim() || !password) return setError(t('أدخل البريد وكلمة المرور', 'Enter email and password'))
    setLoading(true); setError('')
    const { error: err } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    setLoading(false)
    if (err) return setError(friendlyError(err.message, isAr))
    setSubmitted(true)
    setGlowBurst(true)
    setTimeout(() => setGlowBurst(false), 1000)
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

  // Input className helper
  const inputCls = (field: FieldName) => cn(
    'input',
    fieldError === field && 'border-red-400 ring-1 ring-red-300'
  )

  return (
    <>
      {/* Global keyframes for glow blob */}
      <style>{`
        @keyframes glow-pulse {
          0%, 100% { opacity: 0.7; transform: translate(-50%,-50%) scale(1); }
          50%       { opacity: 1;   transform: translate(-50%,-50%) scale(1.12); }
        }
        @keyframes glow-burst {
          0%   { opacity: 0.7; transform: translate(-50%,-50%) scale(1); }
          30%  { opacity: 1;   transform: translate(-50%,-50%) scale(1.4); }
          100% { opacity: 0.7; transform: translate(-50%,-50%) scale(1); }
        }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      <div
        dir={isAr ? 'rtl' : 'ltr'}
        style={{
          minHeight: '100dvh', display: 'flex',
          flexDirection: isAr ? 'row-reverse' : 'row',
          background: 'var(--bg)',
        }}
      >
        {/* ── Avatar panel (hidden on mobile, left on desktop) ── */}
        <div
          className="lg:flex hidden"
          style={{
            flexDirection: 'column',
            width: '48%', minWidth: 380,
            position: 'sticky', top: 0, height: '100dvh',
          }}
        >
          <AvatarStage
            expression={expression}
            eyeTarget={mouseTarget}
            glowBurst={glowBurst}
            title={t('رفيقك الدراسي الذكي', 'Your Smart Study Companion')}
            subtitle={t(
              'حوّل مواد دراستك إلى اختبارات، وتابع تقدمك يوماً بيوم.',
              'Turn your study materials into quizzes and track your daily progress.'
            )}
            features={BRAND_FEATURES}
            isAr={isAr}
            t={t}
          />
        </div>

        {/* ── Form panel ── */}
        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          padding: '40px 24px', position: 'relative',
          overflowY: 'auto',
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

          {/* Mobile: avatar at top */}
          <div className="lg:hidden" style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            marginBottom: 32, position: 'relative',
          }}>
            <div style={{ position: 'relative' }}>
              <GlowBlob burst={glowBurst} />
              <motion.div
                animate={expression === 'success' ? { scale: [1, 1.06, 1] } : {}}
                transition={{ duration: 0.5 }}
                style={{ position: 'relative', zIndex: 1 }}
              >
                <AvatarWidget
                  expression={expression}
                  eyeTarget={expression === 'mouse' ? mouseTarget : undefined}
                  size={140}
                />
              </motion.div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
              <img src="/nibras-symbol-reversed.svg" alt="نِبراس" style={{ width: 22, height: 22 }} />
              <span style={{ fontFamily: "'Reem Kufi',sans-serif", fontSize: 20, color: 'var(--text-primary)' }}>نِبراس</span>
            </div>
          </div>

          {/* Form */}
          <div style={{ width: '100%', maxWidth: 360 }}>
            <AnimatePresence mode="wait">

              {/* Check email screen */}
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
                    <input
                      type="email" value={email} onChange={e => setEmail(e.target.value)} required
                      placeholder="student@university.edu" dir="ltr" className="input"
                      onFocus={() => handleFocus('email')}
                      onBlur={e => handleBlur('email', e.target.value)}
                    />
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

                  {/* Name field — register only */}
                  {mode === 'register' && (
                    <div>
                      <Label>{t('الاسم الكامل', 'Full Name')}</Label>
                      <input
                        type="text" value={name} onChange={e => setName(e.target.value)} required
                        placeholder={t('محمد حمدي', 'Your full name')} dir="auto"
                        className={inputCls('name')}
                        onFocus={() => handleFocus('name')}
                        onBlur={() => setFocusedField(null)}
                      />
                    </div>
                  )}

                  {/* Email field */}
                  <div>
                    <Label>{t('البريد الإلكتروني', 'Email')}</Label>
                    <input
                      type="email" value={email} onChange={e => setEmail(e.target.value)} required
                      placeholder="student@university.edu" dir="ltr"
                      className={inputCls('email')}
                      autoComplete={mode === 'login' ? 'username' : 'email'}
                      onFocus={() => handleFocus('email')}
                      onBlur={e => handleBlur('email', e.target.value)}
                    />
                  </div>

                  {/* Password field */}
                  <div>
                    <Label>{t('كلمة المرور', 'Password')}</Label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type={showPass ? 'text' : 'password'} value={password}
                        onChange={e => setPassword(e.target.value)} required
                        placeholder={mode === 'register' ? t('8 أحرف على الأقل', '8+ characters') : ''}
                        dir="ltr"
                        className={inputCls('password')}
                        style={{ paddingInlineEnd: 40 }}
                        autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                        onFocus={() => handleFocus('password')}
                        onBlur={e => handleBlur('password', e.target.value)}
                      />
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

                  {/* Confirm password — register only */}
                  {mode === 'register' && (
                    <>
                      <div>
                        <Label>{t('تأكيد كلمة المرور', 'Confirm Password')}</Label>
                        <input
                          type={showPass ? 'text' : 'password'} value={confirm}
                          onChange={e => setConfirm(e.target.value)} required
                          dir="ltr"
                          className={inputCls('confirm')}
                          autoComplete="new-password"
                          onFocus={() => handleFocus('confirm')}
                          onBlur={e => handleBlur('confirm', e.target.value)}
                        />
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

                  {/* Login extras */}
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

                  {/* Consent checkbox */}
                  {mode === 'register' && (
                    <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer', userSelect: 'none' }}>
                      <div
                        onClick={() => setConsent(v => !v)}
                        style={{
                          width: 18, height: 18, borderRadius: 5, flexShrink: 0, marginTop: 1,
                          border: `2px solid ${consent ? 'var(--primary)' : 'var(--border-strong)'}`,
                          background: consent ? 'var(--primary)' : 'transparent',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          transition: '.15s ease',
                        }}>
                        {consent && <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4l3 3 5-6" stroke="white" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                      </div>
                      <span style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                        {isAr ? 'اوافق على ' : 'I agree to the '}
                        <a href="/terms" target="_blank" rel="noopener noreferrer"
                          style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: 600 }}>
                          {t('شروط الاستخدام', 'Terms of Use')}
                        </a>
                        {isAr ? ' و' : ' and '}
                        <a href="/privacy" target="_blank" rel="noopener noreferrer"
                          style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: 600 }}>
                          {t('سياسة الخصوصية', 'Privacy Policy')}
                        </a>
                      </span>
                    </label>
                  )}

                  {error && <ErrBox msg={error} />}
                  {success && <OkBox msg={success} />}

                  <SubmitBtn
                    loading={loading}
                    label={mode === 'login' ? t('دخول', 'Sign In') : t('انشاء الحساب', 'Create Account')}
                    icon={mode === 'login' ? <LogIn size={14} /> : <UserPlus size={14} />}
                  />

                  <p style={{ fontSize: 11.5, color: 'var(--text-muted)', textAlign: 'center', borderTop: '1px solid var(--border)', paddingTop: 14 }}>
                    {t('بياناتك محفوظة في السحابة - سجّل الدخول من أي جهاز', 'Cloud saved - sign in from any device')}
                  </p>
                </motion.form>
              )}

            </AnimatePresence>
          </div>
        </div>
      </div>
    </>
  )
}
