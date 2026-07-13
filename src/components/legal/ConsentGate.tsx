import { useEffect, useState, type ReactNode } from 'react'
import { CheckCircle, Cookie, ShieldCheck } from 'lucide-react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useStore } from '@/store'

const POLICY_VERSION = '2026-07-13-v1'
const CONSENT_COOKIE = 'nibras_policy_consent'
const DRAFT_OWNER_KEY = 'nibras_draft_owner'

function setConsentCookie() {
  const secure = window.location.protocol === 'https:' ? '; Secure' : ''
  document.cookie = `${CONSENT_COOKIE}=${encodeURIComponent(POLICY_VERSION)}; Max-Age=31536000; Path=/; SameSite=Lax${secure}`
}

function isolateDraftsForUser(userId: string) {
  const previousOwner = localStorage.getItem(DRAFT_OWNER_KEY)
  if (previousOwner && previousOwner !== userId) {
    useStore.setState({
      files: [],
      resourceFolders: [{ id: 'folder-general', name: 'General / عام', color: '#2D7A84', createdAt: new Date().toISOString() }],
      chatSessions: [],
      activeChatId: null,
      quizSessions: [],
      activeQuizId: null,
      exams: [],
      studyPlan: [],
      dailyMessageCount: 0,
      lastMessageDate: '',
    })
  }
  localStorage.setItem(DRAFT_OWNER_KEY, userId)
}

export function ConsentGate({ children }: { children: ReactNode }) {
  const currentUserId = useStore(state => state.currentUserId)
  const lang = useStore(state => state.lang)
  const isAr = lang === 'ar'
  const [loading, setLoading] = useState(true)
  const [accepted, setAccepted] = useState(false)
  const [privacy, setPrivacy] = useState(false)
  const [terms, setTerms] = useState(false)
  const [security, setSecurity] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!currentUserId) return
    isolateDraftsForUser(currentUserId)

    let cancelled = false
    void supabase
      .from('profiles')
      .select('accepted_terms_at, accepted_privacy_at, accepted_security_notice_at, accepted_policy_version')
      .eq('id', currentUserId)
      .single()
      .then(({ data, error: profileError }) => {
        if (cancelled) return
        if (profileError) {
          setError(isAr ? 'تعذر التحقق من الموافقات. أعد المحاولة.' : 'Could not verify policy consent. Please retry.')
          setLoading(false)
          return
        }
        const isAccepted = Boolean(
          data?.accepted_terms_at &&
          data?.accepted_privacy_at &&
          data?.accepted_security_notice_at &&
          data?.accepted_policy_version === POLICY_VERSION
        )
        setAccepted(isAccepted)
        if (isAccepted) setConsentCookie()
        setLoading(false)
      })

    return () => { cancelled = true }
  }, [currentUserId, isAr])

  const submit = async () => {
    if (!currentUserId || !privacy || !terms || !security || saving) return
    setSaving(true)
    setError('')
    const now = new Date().toISOString()
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        accepted_terms_at: now,
        accepted_privacy_at: now,
        accepted_security_notice_at: now,
        accepted_policy_version: POLICY_VERSION,
        cookie_preferences: { essential: true, analytics: false },
        updated_at: now,
      })
      .eq('id', currentUserId)

    if (updateError) {
      setError(isAr ? 'لم يتم حفظ الموافقة. تحقق من الاتصال وحاول مجدداً.' : 'Consent was not saved. Check your connection and try again.')
      setSaving(false)
      return
    }

    setConsentCookie()
    setAccepted(true)
    setSaving(false)
  }

  if (loading) {
    return <div className="min-h-screen bg-background flex items-center justify-center text-sm text-muted-foreground">{isAr ? 'جاري التحقق من الموافقات...' : 'Checking policy consent...'}</div>
  }

  if (accepted) return <>{children}</>

  return (
    <main className="min-h-screen bg-background text-foreground flex items-center justify-center p-4" dir={isAr ? 'rtl' : 'ltr'}>
      <section className="w-full max-w-xl rounded-3xl border border-border bg-card shadow-xl p-6 sm:p-8 space-y-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl shrink-0 flex items-center justify-center text-white" style={{ background: 'linear-gradient(135deg,#1A4D53,#3E9AA6)' }}>
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-display text-2xl">{isAr ? 'الموافقة على الخصوصية والأمان' : 'Privacy and security consent'}</h1>
            <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
              {isAr ? 'هذه الموافقات مطلوبة لاستخدام نِبْرَاس. يمكنك قراءة السياسات كاملة قبل المتابعة.' : 'These acknowledgements are required to use Nibras. Read the full policies before continuing.'}
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <ConsentCheck checked={privacy} onChange={setPrivacy} label={isAr ? 'قرأت سياسة الخصوصية وأوافق على معالجة بيانات الحساب والاستخدام كما هو موضح.' : 'I read the Privacy Policy and agree to the described account and usage-data processing.'} />
          <ConsentCheck checked={terms} onChange={setTerms} label={isAr ? 'أوافق على شروط الاستخدام والمسؤولية الأكاديمية وحدود النسخة التجريبية.' : 'I accept the Terms of Use, academic responsibility rules, and beta limitations.'} />
          <ConsentCheck checked={security} onChange={setSecurity} label={isAr ? 'أفهم إشعار الأمان: سأحمي حسابي ولن أرفع معلومات شديدة الحساسية أو أحاول الوصول لبيانات الآخرين.' : 'I understand the security notice: I will protect my account, avoid highly sensitive uploads, and never attempt to access other users’ data.'} />
        </div>

        <div className="rounded-2xl bg-muted/50 border border-border p-4 text-xs text-muted-foreground leading-relaxed flex gap-3">
          <Cookie className="w-4 h-4 shrink-0 mt-0.5" />
          <p>{isAr ? 'نستخدم ملف تعريف ارتباط أساسي صغير لحفظ نسخة السياسة المقبولة فقط. تحفظ المسودات غير المكتملة محلياً ومربوطة بهذا الحساب، ولا تستخدم ملفات تعريف الارتباط للإعلانات أو التحليلات حالياً.' : 'We use one essential cookie only for the accepted policy version. Unfinished drafts are stored locally and isolated to this account; advertising and analytics cookies are not currently used.'}</p>
        </div>

        <div className="flex flex-wrap gap-3 text-sm">
          <Link to="/privacy" className="text-primary underline">{isAr ? 'سياسة الخصوصية' : 'Privacy Policy'}</Link>
          <Link to="/terms" className="text-primary underline">{isAr ? 'شروط الاستخدام' : 'Terms of Use'}</Link>
        </div>

        {error && <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-xl p-3">{error}</p>}

        <button onClick={() => void submit()} disabled={!privacy || !terms || !security || saving}
          className="btn-teal w-full py-3 disabled:opacity-50 disabled:cursor-not-allowed">
          <CheckCircle className="w-4 h-4" />
          {saving ? (isAr ? 'جاري الحفظ...' : 'Saving...') : (isAr ? 'أوافق وأتابع' : 'Accept and continue')}
        </button>
      </section>
    </main>
  )
}

function ConsentCheck({ checked, onChange, label }: { checked: boolean; onChange: (value: boolean) => void; label: string }) {
  return (
    <label className="flex items-start gap-3 rounded-2xl border border-border p-4 cursor-pointer hover:bg-muted/40 transition-colors">
      <input type="checkbox" checked={checked} onChange={event => onChange(event.target.checked)} className="mt-1 accent-teal-600" />
      <span className="text-sm leading-relaxed">{label}</span>
    </label>
  )
}
