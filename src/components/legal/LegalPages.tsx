import { ArrowLeft, ShieldCheck, FileText } from 'lucide-react'
import { Link } from 'react-router-dom'

interface LegalPageProps {
  type: 'privacy' | 'terms'
}

const updated = '13 July 2026'

export function LegalPage({ type }: LegalPageProps) {
  const privacy = type === 'privacy'

  return (
    <main className="min-h-screen bg-background text-foreground px-4 py-8 sm:py-12" dir="auto">
      <article className="max-w-3xl mx-auto rounded-3xl border border-border bg-card shadow-xl overflow-hidden">
        <header className="p-6 sm:p-8 border-b border-border/70"
          style={{ background: 'linear-gradient(135deg,rgba(26,77,83,.18),rgba(62,154,166,.08))' }}>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-white"
              style={{ background: 'linear-gradient(135deg,#1A4D53,#3E9AA6)' }}>
              {privacy ? <ShieldCheck className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Nibras · نِبْرَاس</p>
              <h1 className="font-display text-3xl">
                {privacy ? 'Privacy Policy · سياسة الخصوصية' : 'Terms of Use · شروط الاستخدام'}
              </h1>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">Last updated · آخر تحديث: {updated}</p>
        </header>

        <div className="p-6 sm:p-8 space-y-8 text-sm leading-7">
          {privacy ? <PrivacyContent /> : <TermsContent />}

          <div className="pt-4 border-t border-border flex flex-wrap gap-3">
            <Link to="/" className="btn-teal inline-flex px-4 py-2">
              <ArrowLeft className="w-4 h-4 rtl-flip" /> Back to Nibras · العودة إلى نِبْرَاس
            </Link>
            <Link to={privacy ? '/terms' : '/privacy'}
              className="inline-flex items-center px-4 py-2 rounded-xl border border-border hover:bg-muted transition-colors">
              {privacy ? 'Terms · الشروط' : 'Privacy · الخصوصية'}
            </Link>
          </div>
        </div>
      </article>
    </main>
  )
}

function PrivacyContent() {
  return (
    <>
      <Section title="1. What Nibras collects · ما الذي يجمعه نِبْرَاس">
        <p>Nibras collects the account information required by Supabase Auth, such as email address, display name, account ID, and authentication timestamps.</p>
        <p>يجمع نِبْرَاس بيانات الحساب اللازمة لتسجيل الدخول عبر Supabase، مثل البريد الإلكتروني والاسم ومعرّف الحساب وأوقات المصادقة.</p>
      </Section>

      <Section title="2. Study data · بيانات الدراسة">
        <p>During the current beta, many study items—including local resources, chat history, quizzes, exam entries, and preferences—may be stored in your browser. Clearing browser storage or changing devices may remove data that has not yet been synchronized.</p>
        <p>في النسخة التجريبية الحالية قد تُحفظ عدة بيانات دراسية داخل المتصفح، ومنها المصادر المحلية وسجل المحادثات والاختبارات ومواعيد الاختبارات والتفضيلات. مسح بيانات المتصفح أو تغيير الجهاز قد يؤدي إلى فقدان البيانات غير المتزامنة.</p>
      </Section>

      <Section title="3. AI processing · معالجة الذكاء الاصطناعي">
        <p>When you use AI features, the relevant prompt and selected study context are sent through a Netlify Function to the configured AI provider. Provider keys stay on the server. Nibras records limited usage metadata—such as feature, model, prompt size, and token counts—to enforce daily limits and diagnose failures.</p>
        <p>عند استخدام مزايا الذكاء الاصطناعي، يُرسل الطلب والسياق الدراسي المختار عبر Netlify Function إلى مزود الذكاء الاصطناعي. تبقى مفاتيح المزود في الخادم. ويسجّل نِبْرَاس بيانات استخدام محدودة مثل الميزة والنموذج وحجم الطلب وعدد الرموز لتطبيق الحدود اليومية وتشخيص الأعطال.</p>
      </Section>

      <Section title="4. Local files · الملفات المحلية">
        <p>Choosing a file in Resources currently adds it to the local study workspace. Nibras does not claim that the original file is uploaded to cloud storage unless the interface explicitly says so.</p>
        <p>اختيار ملف من صفحة المصادر يضيفه حالياً إلى مساحة الدراسة المحلية. لا يدّعي نِبْرَاس رفع الملف الأصلي إلى التخزين السحابي ما لم توضّح الواجهة ذلك صراحة.</p>
      </Section>

      <Section title="5. Sharing and third parties · المشاركة والخدمات الخارجية">
        <p>Nibras does not sell personal data. The service relies on Supabase for authentication/database services, Netlify for hosting/functions, and the configured AI provider for generated responses. Those services process data under their own policies.</p>
        <p>لا يبيع نِبْرَاس البيانات الشخصية. تعتمد الخدمة على Supabase للمصادقة وقاعدة البيانات، وNetlify للاستضافة والوظائف، ومزود الذكاء الاصطناعي للردود المولّدة. وتعالج هذه الخدمات البيانات وفق سياساتها.</p>
      </Section>

      <Section title="6. Your choices · خياراتك">
        <p>You may stop using the service, sign out, clear local browser data, or request account deletion through the project issue tracker. Do not upload highly sensitive personal, medical, financial, or confidential university information.</p>
        <p>يمكنك إيقاف استخدام الخدمة أو تسجيل الخروج أو مسح بيانات المتصفح أو طلب حذف الحساب عبر صفحة مشكلات المشروع. لا ترفع بيانات شخصية شديدة الحساسية أو معلومات طبية أو مالية أو جامعية سرية.</p>
      </Section>

      <Contact />
    </>
  )
}

function TermsContent() {
  return (
    <>
      <Section title="1. Beta service · خدمة تجريبية">
        <p>Nibras is a beta study helper. Features may change, have usage limits, or be temporarily unavailable. The service is provided without a guarantee of uninterrupted operation.</p>
        <p>نِبْرَاس مساعد دراسي تجريبي. قد تتغير المزايا أو تخضع لحدود استخدام أو تتوقف مؤقتاً. تُقدّم الخدمة دون ضمان التشغيل المتواصل.</p>
      </Section>

      <Section title="2. Academic responsibility · المسؤولية الأكاديمية">
        <p>AI-generated explanations, summaries, and questions may contain mistakes. Verify important information against course material and instructor guidance. Nibras must not be used to cheat, impersonate another student, or violate university rules.</p>
        <p>قد تحتوي الشروحات والملخصات والأسئلة المولدة بالذكاء الاصطناعي على أخطاء. تحقّق من المعلومات المهمة باستخدام مواد المقرر وتوجيهات المدرّس. لا يجوز استخدام نِبْرَاس للغش أو انتحال شخصية طالب آخر أو مخالفة أنظمة الجامعة.</p>
      </Section>

      <Section title="3. Accounts and security · الحسابات والأمان">
        <p>You are responsible for safeguarding your login details and for activity performed through your account. Notify the project owner if you believe your account has been compromised.</p>
        <p>أنت مسؤول عن حماية بيانات تسجيل الدخول وعن النشاط الذي يتم عبر حسابك. أبلغ مالك المشروع إذا اعتقدت أن حسابك تعرض للاختراق.</p>
      </Section>

      <Section title="4. Acceptable use · الاستخدام المقبول">
        <p>Do not abuse rate limits, attack the service, upload unlawful material, attempt to access other users’ data, or use the platform to generate harmful or illegal content.</p>
        <p>لا تحاول تجاوز حدود الاستخدام أو مهاجمة الخدمة أو رفع محتوى غير قانوني أو الوصول إلى بيانات مستخدمين آخرين أو استخدام المنصة لإنشاء محتوى ضار أو مخالف للقانون.</p>
      </Section>

      <Section title="5. Availability and changes · التوفر والتغييرات">
        <p>Nibras may suspend accounts that threaten the service or violate these terms. Features, providers, quotas, and these terms may be updated as the beta develops.</p>
        <p>قد يعلّق نِبْرَاس الحسابات التي تهدد الخدمة أو تخالف هذه الشروط. وقد تتغير المزايا والمزودون والحدود وهذه الشروط مع تطور النسخة التجريبية.</p>
      </Section>

      <Section title="6. Limitation · حدود المسؤولية">
        <p>Nibras is a study aid, not an official university system, instructor, legal service, or professional adviser. You remain responsible for academic decisions, submissions, deadlines, and verification of generated content.</p>
        <p>نِبْرَاس أداة مساعدة للدراسة وليس نظاماً جامعياً رسمياً أو مدرساً أو خدمة قانونية أو مستشاراً مهنياً. تظل مسؤولاً عن قراراتك الأكاديمية وتسليماتك ومواعيدك والتحقق من المحتوى المولد.</p>
      </Section>

      <Contact />
    </>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="font-display text-xl mb-3">{title}</h2>
      <div className="space-y-3 text-muted-foreground">{children}</div>
    </section>
  )
}

function Contact() {
  return (
    <Section title="Contact and requests · التواصل والطلبات">
      <p>
        For privacy requests, account deletion, or bug reports, use the public project issue tracker:{' '}
        <a className="text-primary underline" href="https://github.com/Kiwii9/nibras/issues" target="_blank" rel="noreferrer">
          GitHub Issues
        </a>.
      </p>
      <p>لطلبات الخصوصية أو حذف الحساب أو الإبلاغ عن الأخطاء، استخدم صفحة مشكلات المشروع العامة.</p>
    </Section>
  )
}
