import { motion } from 'framer-motion'
import { useT } from '@/hooks/useT'
import { FileText, AlertTriangle, ShieldCheck, Ban } from 'lucide-react'

const FADE = { initial:{opacity:0,y:16}, animate:{opacity:1,y:0}, transition:{duration:0.4,ease:'easeOut' as const} }

function Section({ icon: Icon, title, children }: { icon: React.FC<any>; title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom:32 }}>
      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14 }}>
        <Icon size={16} style={{ color:'var(--primary)', flexShrink:0 }} />
        <h2 style={{ fontSize:15, fontWeight:700, color:'var(--text-primary)' }}>{title}</h2>
      </div>
      {children}
      <div style={{ height:1, background:'var(--border)', marginTop:24 }} />
    </div>
  )
}

export function TermsOfUse() {
  const { lang } = useT()
  const isAr = lang === 'ar'
  const t = (ar: string, en: string) => isAr ? ar : en

  return (
    <div className="section-wrapper" dir={isAr ? 'rtl' : 'ltr'} style={{ maxWidth:720, margin:'0 auto' }}>
      <motion.div {...FADE}>

        <div style={{ display:'flex', alignItems:'center', gap:14, marginBottom:32 }}>
          <div style={{ width:44, height:44, borderRadius:'var(--radius-md)', background:'rgba(201,168,76,0.12)', border:'1px solid rgba(201,168,76,0.2)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            <FileText size={20} style={{ color:'var(--gold)' }} />
          </div>
          <div>
            <h1 style={{ fontFamily:"'Reem Kufi',sans-serif", fontSize:26, color:'var(--text-primary)', marginBottom:4 }}>
              {t('شروط الاستخدام', 'Terms of Use')}
            </h1>
            <p style={{ fontSize:12, color:'var(--text-muted)' }}>{t('آخر تحديث','Last updated')}: 27 August 2026</p>
          </div>
        </div>

        <p style={{ fontSize:13.5, lineHeight:1.8, color:'var(--text-secondary)', marginBottom:32, padding:'16px 18px', background:'var(--bg)', border:'1px solid var(--border)', borderRadius:'var(--radius-md)' }}>
          {t(
            'باستخدامك نِبراس فانت توافق على هذه الشروط. اقرا هذه الشروط بعناية قبل استخدام التطبيق.',
            'By using Nibras you agree to these terms. Please read them carefully before using the App.'
          )}
        </p>

        <Section icon={ShieldCheck} title={t('قبول الشروط', 'Acceptance of Terms')}>
          <p style={{ fontSize:13.5, lineHeight:1.85, color:'var(--text-secondary)' }}>
            {t(
              'نِبراس تطبيق مجاني مقدم كما هو. باستخدامك له فانت تقر بانك تجاوزت سن 13 عاما او تحصلت على موافقة ولي امرك. نحتفظ بالحق في تعديل هذه الشروط في اي وقت مع الاخطار عبر التطبيق.',
              'Nibras is a free application provided as-is. By using it you confirm you are 13+ years old or have parental consent. We reserve the right to modify these terms at any time with notice through the App.'
            )}
          </p>
        </Section>

        <Section icon={FileText} title={t('استخدام التطبيق', 'Use of the App')}>
          <ul style={{ fontSize:13.5, lineHeight:2.1, color:'var(--text-secondary)', paddingInlineStart:18 }}>
            <li>{t('يُسمح باستخدام التطبيق للاغراض الدراسية والشخصية غير التجارية', 'The App may be used for personal, non-commercial educational purposes')}</li>
            <li>{t('انت مسؤول عن الحفاظ على سرية بيانات تسجيل الدخول الخاصة بك', 'You are responsible for keeping your login credentials secure')}</li>
            <li>{t('لا يجوز استخدام التطبيق لاي غرض غير قانوني', 'The App may not be used for any unlawful purpose')}</li>
            <li>{t('الملفات التي ترفعها يجب ان تكون مواد تملك حق استخدامها', 'Files you upload must be materials you have the right to use')}</li>
          </ul>
        </Section>

        <Section icon={Ban} title={t('الاستخدام المحظور', 'Prohibited Use')}>
          <ul style={{ fontSize:13.5, lineHeight:2.1, color:'var(--text-secondary)', paddingInlineStart:18 }}>
            <li>{t('محاولة اختراق او كسر قيود التطبيق', 'Attempting to breach or bypass App restrictions')}</li>
            <li>{t('رفع محتوى ضار او غير لائق او ينتهك حقوق الملكية الفكرية', 'Uploading harmful, inappropriate, or copyright-infringing content')}</li>
            <li>{t('استخدام التطبيق لانتاج محتوى يضر بالاخرين', 'Using the App to produce content that harms others')}</li>
            <li>{t('محاولة استخراج مفاتيح API الخاصة بالمنصة', 'Attempting to extract the platform API keys')}</li>
          </ul>
        </Section>

        <Section icon={AlertTriangle} title={t('المسؤولية والضمانات', 'Liability and Warranties')}>
          <p style={{ fontSize:13.5, lineHeight:1.85, color:'var(--text-secondary)', marginBottom:12 }}>
            {t(
              'نِبراس مقدم "كما هو" بدون ضمانات من اي نوع. لا نضمن دقة الاجابات التي يولدها الذكاء الاصطناعي. انت المسؤول عن التحقق من صحة اي معلومة تحصل عليها من التطبيق.',
              'Nibras is provided "as-is" without warranties of any kind. We do not guarantee the accuracy of AI-generated answers. You are responsible for verifying any information obtained through the App.'
            )}
          </p>
          <p style={{ fontSize:13.5, lineHeight:1.85, color:'var(--text-secondary)' }}>
            {t(
              'لن نكون مسؤولين عن اي خسائر مباشرة او غير مباشرة تنتج عن استخدام التطبيق.',
              'We will not be liable for any direct or indirect losses resulting from use of the App.'
            )}
          </p>
        </Section>

        <div style={{ padding:'14px 18px', background:'var(--bg)', border:'1px solid var(--border)', borderRadius:'var(--radius-md)' }}>
          <p style={{ fontSize:13, color:'var(--text-secondary)', lineHeight:1.7, marginBottom:8 }}>
            {t('للتواصل بشان هذه الشروط:','To contact us about these terms:')}{' '}
            <a href="mailto:legal@nibras.app" style={{ color:'var(--primary)' }}>legal@nibras.app</a>
          </p>
          <p style={{ fontSize:12, color:'var(--text-muted)' }}>
            {t('تخضع هذه الشروط لقوانين المملكة العربية السعودية.', 'These terms are governed by the laws of Saudi Arabia.')}
          </p>
        </div>

      </motion.div>
    </div>
  )
}
