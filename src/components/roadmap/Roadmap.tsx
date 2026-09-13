import { motion } from 'framer-motion'
import { useT } from '@/hooks/useT'
import { CheckCircle, Circle, Clock, Sparkles } from 'lucide-react'

const FADE_UP = (delay = 0) => ({
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-40px' },
  transition: { duration: 0.45, delay, ease: 'easeOut' as const },
})

type Status = 'done' | 'active' | 'planned' | 'future'

interface RoadmapItem {
  titleAr: string
  titleEn: string
  descAr: string
  descEn: string
  status: Status
}

const ITEMS: RoadmapItem[] = [
  { status: 'done',    titleAr: 'لوحة التحكم',               titleEn: 'Dashboard',               descAr: 'ملخص التقدم والإحصاءات',                   descEn: 'Progress summary and stats' },
  { status: 'done',    titleAr: 'محرك الاختبارات',           titleEn: 'Quiz Engine',              descAr: '6 أنواع أسئلة مع تصحيح ذكي',              descEn: '6 question types with AI grading' },
  { status: 'done',    titleAr: 'المساعد الذكي',             titleEn: 'AI Tutor',                 descAr: 'محادثة سقراطية مع ملفاتك',                 descEn: 'Socratic chat with your files' },
  { status: 'done',    titleAr: 'متتبع الامتحانات',          titleEn: 'Exam Tracker',             descAr: 'عداد تنازلي ومعلومات الامتحان',            descEn: 'Countdown and exam details' },
  { status: 'done',    titleAr: 'مؤقت بومودورو',             titleEn: 'Pomodoro Timer',           descAr: 'تقنية التركيز مع أصوات محيطية',            descEn: 'Focus technique with ambient sounds' },
  { status: 'done',    titleAr: 'نظام الحسابات السحابية',    titleEn: 'Cloud Auth',               descAr: 'تسجيل وحفظ البيانات عبر Supabase',         descEn: 'Sign-up and data persistence via Supabase' },
  { status: 'active',  titleAr: 'نظام النقاط والمستويات',   titleEn: 'Gamification',             descAr: 'XP، شارات، وخارطة تقدم',                   descEn: 'XP, badges, and progress map' },
  { status: 'active',  titleAr: 'منشئ خطة الدراسة',         titleEn: 'Smart Study Plan',         descAr: 'خطة دراسية مولّدة بالذكاء الاصطناعي',      descEn: 'AI-generated study plan' },
  { status: 'planned', titleAr: 'تحليلات التقدم',            titleEn: 'Progress Analytics',       descAr: 'إحصاءات أداء تفصيلية',                     descEn: 'Detailed performance statistics' },
  { status: 'planned', titleAr: 'المراجعة الذكية',           titleEn: 'Smart Revision',           descAr: 'تكرار متباعد وتوصيات مراجعة',              descEn: 'Spaced repetition and revision tips' },
  { status: 'planned', titleAr: 'بطاقات الحفظ',              titleEn: 'Flashcard Decks',          descAr: 'مجموعات بطاقات قابلة للمشاركة',            descEn: 'Shareable flashcard collections' },
  { status: 'planned', titleAr: 'امتحانات تجريبية كاملة',   titleEn: 'Mock Exams',               descAr: 'محاكاة ظروف الامتحان الحقيقي',             descEn: 'Simulate real exam conditions' },
  { status: 'future',  titleAr: 'تعلم اللغات',               titleEn: 'Language Learning',        descAr: 'دعم تعلم اللغات',                           descEn: 'Language learning support' },
  { status: 'future',  titleAr: 'غرف الدراسة الجماعية',     titleEn: 'Study Rooms',              descAr: 'ذاكر مع أصدقائك في الوقت الفعلي',          descEn: 'Study with friends in real time' },
  { status: 'future',  titleAr: 'وضع المعلم',                titleEn: 'Teacher Mode',             descAr: 'إنشاء اختبارات للطلاب',                    descEn: 'Create quizzes for students' },
]

const STATUS_CONFIG: Record<Status, { label: string; labelAr: string; color: string; icon: React.FC<any> }> = {
  done:    { label: 'Shipped',      labelAr: 'مكتمل',       color: 'var(--success)',  icon: CheckCircle },
  active:  { label: 'In progress',  labelAr: 'جارٍ الآن',   color: 'var(--accent)',   icon: Clock },
  planned: { label: 'Planned',      labelAr: 'مخطط',        color: 'var(--primary)',  icon: Circle },
  future:  { label: 'Future',       labelAr: 'مستقبلي',     color: 'var(--text-muted)', icon: Sparkles },
}

const ORDER: Status[] = ['done', 'active', 'planned', 'future']

export function RoadmapPage() {
  const { lang } = useT()
  const isAr = lang === 'ar'
  const t = (ar: string, en: string) => isAr ? ar : en

  const grouped = ORDER.map(status => ({
    status,
    items: ITEMS.filter(i => i.status === status),
    config: STATUS_CONFIG[status],
  }))

  return (
    <div
      className="section-wrapper"
      dir={isAr ? 'rtl' : 'ltr'}
      style={{ maxWidth: 700, margin: '0 auto' }}
    >

      {/* Header */}
      <motion.div {...FADE_UP(0)} style={{ marginBottom: 48 }}>
        <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 14 }}>
          {t('خارطة الطريق', 'Roadmap')}
        </p>
        <h1 style={{
          fontFamily: "'Reem Kufi', sans-serif",
          fontSize: 'clamp(24px, 4vw, 38px)',
          fontWeight: 700, color: 'var(--text-primary)',
          lineHeight: 1.2, marginBottom: 14,
        }}>
          {t('إلى أين يتجه نِبراس', 'Where Nibras is heading')}
        </h1>
        <p style={{ fontSize: 15, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
          {t('خارطة الطريق تتطور باستمرار. المجتمع يشكّل الأولويات.', 'The roadmap evolves continuously. The community shapes priorities.')}
        </p>
      </motion.div>

      {/* Timeline */}
      <div style={{ position: 'relative' }}>

        {/* Vertical rail */}
        <div style={{
          position: 'absolute',
          top: 0, bottom: 0,
          [isAr ? 'right' : 'left']: 19,
          width: 1,
          background: 'var(--border)',
          zIndex: 0,
        }} />

        {grouped.map(({ status, items, config }) => {
          const Icon = config.icon
          return (
            <motion.div key={status} {...FADE_UP(0.05)} style={{ marginBottom: 40 }}>

              {/* Phase label row */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16,
                position: 'relative', zIndex: 1,
              }}>
                <div style={{
                  width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
                  background: 'var(--surface)', border: '1px solid var(--border)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: 'var(--shadow-sm)',
                }}>
                  <Icon size={16} style={{ color: config.color }} />
                </div>
                <span style={{
                  fontSize: 12, fontWeight: 700, letterSpacing: '0.07em',
                  textTransform: 'uppercase', color: config.color,
                }}>
                  {t(config.labelAr, config.label)}
                </span>
              </div>

              {/* Items */}
              <div style={{
                marginInlineStart: 56,
                display: 'flex', flexDirection: 'column', gap: 8,
              }}>
                {items.map((item, i) => (
                  <motion.div key={i} {...FADE_UP(0.05 + i * 0.04)}
                    style={{
                      background: 'var(--surface)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-md)',
                      padding: '13px 16px',
                      display: 'flex', alignItems: 'flex-start',
                      justifyContent: 'space-between', gap: 16,
                    }}
                  >
                    <div>
                      <p style={{
                        fontSize: 13.5, fontWeight: 600,
                        color: status === 'future' ? 'var(--text-muted)' : 'var(--text-primary)',
                        marginBottom: 3,
                      }}>
                        {t(item.titleAr, item.titleEn)}
                      </p>
                      <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>
                        {t(item.descAr, item.descEn)}
                      </p>
                    </div>
                    <span style={{
                      flexShrink: 0,
                      fontSize: 10, fontWeight: 700,
                      padding: '3px 9px', borderRadius: 'var(--radius-full)',
                      background: `color-mix(in srgb, ${config.color} 12%, transparent)`,
                      color: config.color,
                      marginTop: 1,
                    }}>
                      {t(config.labelAr, config.label)}
                    </span>
                  </motion.div>
                ))}
              </div>

            </motion.div>
          )
        })}
      </div>

    </div>
  )
}
