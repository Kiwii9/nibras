import { motion } from 'framer-motion'
import { useT } from '@/hooks/useT'
import { Shield, Mail, FileText, Trash2, Lock } from 'lucide-react'

const FADE = { initial:{opacity:0,y:16}, animate:{opacity:1,y:0}, transition:{duration:0.4,ease:'easeOut' as const} }

function Section({ icon: Icon, title, children }: { icon: React.FC<any>; title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 32 }}>
      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14 }}>
        <Icon size={16} style={{ color:'var(--primary)', flexShrink:0 }} />
        <h2 style={{ fontSize:15, fontWeight:700, color:'var(--text-primary)' }}>{title}</h2>
      </div>
      {children}
      <div style={{ height:1, background:'var(--border)', marginTop:24 }} />
    </div>
  )
}

export function PrivacyPolicy() {
  const { lang } = useT()
  const isAr = lang === 'ar'
  const t = (ar: string, en: string) => isAr ? ar : en

  return (
    <div className="section-wrapper" dir={isAr ? 'rtl' : 'ltr'} style={{ maxWidth:720, margin:'0 auto' }}>
      <motion.div {...FADE}>

        <div style={{ display:'flex', alignItems:'center', gap:14, marginBottom:32 }}>
          <div style={{ width:44, height:44, borderRadius:'var(--radius-md)', background:'rgba(109,94,248,0.12)', border:'1px solid rgba(109,94,248,0.2)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            <Shield size={20} style={{ color:'var(--violet)' }} />
          </div>
          <div>
            <h1 style={{ fontFamily:"'Reem Kufi',sans-serif", fontSize:26, color:'var(--text-primary)', marginBottom:4 }}>
              {t('سياسة الخصوصية', 'Privacy Policy')}
            </h1>
            <p style={{ fontSize:12, color:'var(--text-muted)' }}>{t('آخر تحديث', 'Last updated')}: 27 August 2026</p>
          </div>
        </div>

        <p style={{ fontSize:13.5, lineHeight:1.8, color:'var(--text-secondary)', marginBottom:32, padding:'16px 18px', background:'var(--bg)', border:'1px solid var(--border)', borderRadius:'var(--radius-md)' }}>
          {t('نِبراس ملتزم بحماية خصوصيتك. توضّح هذه السياسة ما نجمعه من بيانات وكيف نستخدمها. باستخدامك التطبيق فأنت توافق على هذه السياسة.', 'Nibras is committed to protecting your privacy. This policy explains what data we collect and how we use it. By using the App you agree to this policy.')}
        </p>

        <Section icon={Mail} title={t('البيانات التي نجمعها', 'Data We Collect')}>
          <ul style={{ fontSize:13.5, lineHeight:2.1, color:'var(--text-secondary)', paddingInlineStart:18 }}>
            <li>{t('عنوان البريد الالكتروني - مطلوب لانشاء الحساب', 'Email address - required for account creation')}</li>
            <li>{t('الاسم الكامل - اختياري تدخله انت', 'Full name - optional, entered by you')}</li>
            <li>{t('محتوى الملفات التي تختار رفعها من Google Drive', 'Content of files you choose to upload from Google Drive')}</li>
            <li>{t('بيانات الاستخدام: عدد الاختبارات، جلسات المحادثة، تقدم الدراسة', 'Usage data: quiz count, chat sessions, study progress')}</li>
            <li>{t('لا نجمع اي بيانات دفع - التطبيق مجاني كليا', 'We do not collect any payment data - the App is completely free')}</li>
          </ul>
        </Section>

        <Section icon={FileText} title={t('كيف نستخدم بياناتك', 'How We Use Your Data')}>
          <ul style={{ fontSize:13.5, lineHeight:2.1, color:'var(--text-secondary)', paddingInlineStart:18 }}>
            <li>{t('توفير وظائف التطبيق (الاختبارات، المساعد الذكي، متتبع الامتحانات)', 'Providing App functionality (quizzes, AI tutor, exam tracker)')}</li>
            <li>{t('حفظ تقدمك الدراسي عبر الاجهزة المختلفة', 'Saving your study progress across devices')}</li>
            <li>{t('معالجة محتوى ملفاتك بواسطة نماذج الذكاء الاصطناعي لتوليد الاختبارات', 'Processing your file content through AI models to generate quizzes')}</li>
            <li>{t('لا نبيع بياناتك لاي طرف ثالث', 'We do not sell your data to any third party')}</li>
            <li>{t('لا نستخدم بياناتك لاغراض اعلانية', 'We do not use your data for advertising')}</li>
          </ul>
        </Section>

        <Section icon={Lock} title={t('مزودو الخدمات', 'Service Providers')}>
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {[
              { name:'Supabase',   purpose: t('قاعدة البيانات والمصادقة','Database and authentication'), link:'https://supabase.com/privacy' },
              { name:'Netlify',    purpose: t('استضافة التطبيق','App hosting'),                         link:'https://www.netlify.com/privacy/' },
              { name:'OpenRouter', purpose: t('معالجة طلبات الذكاء الاصطناعي','AI request processing'), link:'https://openrouter.ai/privacy' },
            ].map((p,i) => (
              <div key={i} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 14px', background:'var(--bg)', border:'1px solid var(--border)', borderRadius:'var(--radius-md)', fontSize:13 }}>
                <div>
                  <span style={{ fontWeight:600, color:'var(--text-primary)' }}>{p.name}</span>
                  <span style={{ color:'var(--text-muted)', marginInlineStart:8 }}>{p.purpose}</span>
                </div>
                <a href={p.link} target="_blank" rel="noopener noreferrer" style={{ fontSize:11, color:'var(--primary)', textDecoration:'none' }}>
                  {t('سياستهم','Their policy')}
                </a>
              </div>
            ))}
          </div>
        </Section>

        <Section icon={Trash2} title={t('حقوقك', 'Your Rights')}>
          <ul style={{ fontSize:13.5, lineHeight:2.1, color:'var(--text-secondary)', paddingInlineStart:18 }}>
            <li>{t('الحق في الوصول: يمكنك عرض بياناتك من داخل التطبيق','Right to access: view your data inside the App')}</li>
            <li>{t('الحق في الحذف: تواصل معنا لحذف حسابك وجميع بياناتك','Right to deletion: contact us to delete your account and all data')}</li>
            <li>{t('الحق في التصحيح: يمكنك تعديل معلوماتك من صفحة الاعدادات','Right to correction: edit your info from the Settings page')}</li>
          </ul>
          <p style={{ fontSize:13, color:'var(--text-muted)', marginTop:12, padding:'12px 14px', background:'var(--bg)', border:'1px solid var(--border)', borderRadius:'var(--radius-md)' }}>
            {t('للتواصل بشان بياناتك:','To contact us about your data:')}{' '}
            <a href="mailto:privacy@nibras.app" style={{ color:'var(--primary)' }}>privacy@nibras.app</a>
          </p>
        </Section>

        <div style={{ fontSize:12, color:'var(--text-muted)', lineHeight:1.7 }}>
          {t('نستخدم localStorage في المتصفح لحفظ تفضيلاتك (اللغة، المظهر). لا نستخدم ملفات تعريف ارتباط تتبعية.','We use browser localStorage to save your preferences (language, theme). We do not use tracking cookies.')}
        </div>

      </motion.div>
    </div>
  )
}
