import { motion } from 'framer-motion'
import { useT } from '@/hooks/useT'
import { cn } from '@/lib/utils'
import {
  Trophy, Globe, Users, CalendarDays, BarChart2, RefreshCw,
  CreditCard, FileQuestion, MessagesSquare, GraduationCap,
  LayoutDashboard, Bot, Rocket, CheckCircle2, Clock, Sparkles
} from 'lucide-react'

type Status = 'done' | 'inprogress' | 'planned' | 'future'

interface RoadmapItem {
  icon: any
  titleAr: string
  titleEn: string
  descAr: string
  descEn: string
  status: Status
  color: string
}

const STATUS_META: Record<Status, { labelAr: string; labelEn: string; className: string }> = {
  done:       { labelAr: 'مكتمل',  labelEn: 'Live',        className: 'bg-teal-500/20 text-teal-400 border-teal-500/30' },
  inprogress: { labelAr: 'جارٍ',   labelEn: 'In Progress', className: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  planned:    { labelAr: 'مخطط',   labelEn: 'Planned',     className: 'bg-gold/20 text-gold border-gold/30' },
  future:     { labelAr: 'مستقبلي', labelEn: 'Future',     className: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
}

const ROADMAP: RoadmapItem[] = [
  {
    icon: LayoutDashboard,
    titleAr: 'لوحة التحكم الشخصية', titleEn: 'Personal Dashboard',
    descAr: 'ملخص رحلتك الدراسية — نشاط حديث، تقدّم، مهام قادمة، ونقاط ضعف وقوة.',
    descEn: 'A full summary of your learning journey — recent activity, progress, upcoming tasks, weak & strong areas.',
    status: 'done', color: '#3E9AA6',
  },
  {
    icon: FileQuestion,
    titleAr: 'محرك الاختبارات الذكي', titleEn: 'AI Quiz Engine',
    descAr: '6 أنماط اختبار، تقييم دلالي بالذكاء الاصطناعي، لا مطابقة كلمات.',
    descEn: '6 quiz formats, AI semantic grading — understanding over keywords.',
    status: 'done', color: '#2D7A84',
  },
  {
    icon: Bot,
    titleAr: 'المساعد الدراسي الذكي', titleEn: 'AI Study Chatbot',
    descAr: 'دردشة مع مواد دراستك، اطرح أسئلة، احصل على شروحات مخصصة.',
    descEn: 'Chat with your study materials, ask questions, get personalized explanations.',
    status: 'done', color: '#C9A84C',
  },
  {
    icon: Trophy,
    titleAr: 'نظام النقاط والمستويات', titleEn: 'Gamification',
    descAr: 'نقاط، مستويات، شارات، تحديات يومية. اجعل المذاكرة ممتعة ومحفّزة.',
    descEn: 'Points, levels, badges, daily challenges. Make studying fun and motivating.',
    status: 'inprogress', color: '#E09A2D',
  },
  {
    icon: CalendarDays,
    titleAr: 'خطة الدراسة الذكية', titleEn: 'Smart Study Plan Builder',
    descAr: 'مواد، مواعيد، أهداف، مهام يومية. اعرف ماذا تذاكر اليوم وهذا الأسبوع.',
    descEn: 'Subjects, deadlines, goals, daily tasks. Know exactly what to study today and this week.',
    status: 'inprogress', color: '#56A86B',
  },
  {
    icon: BarChart2,
    titleAr: 'تحليلات التقدّم البصرية', titleEn: 'Progress Analytics',
    descAr: 'رسوم بيانية تُظهر تقدّمك، نقاط الضعف، الأهداف المنجزة، سلسلة الدراسة.',
    descEn: 'Visual charts showing scores, weak points, completed goals, study streaks over time.',
    status: 'planned', color: '#4A90D9',
  },
  {
    icon: RefreshCw,
    titleAr: 'نظام المراجعة الذكية', titleEn: 'Smart Revision System',
    descAr: 'مقترحات مراجعة مبنية على أخطاءك. تكرار متباعد لحفظ أعمق وأطول.',
    descEn: 'Review suggestions based on your mistakes. Spaced repetition for deeper retention.',
    status: 'planned', color: '#7C5CBF',
  },
  {
    icon: CreditCard,
    titleAr: 'بطاقات تعليمية متقدمة', titleEn: 'Advanced Flashcards',
    descAr: 'توليد بطاقات من محتواك المرفوع، إنشاء يدوي، تكرار متباعد ذكي.',
    descEn: 'Generate flashcards from uploaded content, manual creation, smart spaced repetition.',
    status: 'planned', color: '#3E9AA6',
  },
  {
    icon: FileQuestion,
    titleAr: 'الامتحانات التجريبية', titleEn: 'Mock Exams',
    descAr: 'اختبارات كاملة من محتواك. مؤقت، درجات، مراجعة الإجابات، شرح الأخطاء.',
    descEn: 'Full practice exams from your content — timer, scores, answer review, mistake explanations.',
    status: 'planned', color: '#E05555',
  },
  {
    icon: Globe,
    titleAr: 'تعلّم اللغات', titleEn: 'Language Learning',
    descAr: 'تعلّم أي لغة بمفردات، قواعد، استماع، كتابة، وتكرار متباعد.',
    descEn: 'Learn any language — vocabulary, grammar, listening, writing, and spaced repetition.',
    status: 'future', color: '#C9A84C',
  },
  {
    icon: Users,
    titleAr: 'تعلّم الأقران', titleEn: 'Peer Tutoring',
    descAr: 'الطلاب يشاركون شروحاتهم الخاصة ليستفيد منها زملاؤهم.',
    descEn: 'Students upload their own explanations for classmates to benefit from.',
    status: 'future', color: '#4A90D9',
  },
  {
    icon: MessagesSquare,
    titleAr: 'غرف الدراسة التعاونية', titleEn: 'Collaborative Study Rooms',
    descAr: 'أنشئ غرف دراسة، ناقش الدروس، تدرّب مع زملائك.',
    descEn: 'Create or join study rooms — discuss lessons, ask questions, practice together.',
    status: 'future', color: '#7C5CBF',
  },
  {
    icon: GraduationCap,
    titleAr: 'وضع المعلّم / المرشد', titleEn: 'Teacher / Mentor Mode',
    descAr: 'للمعلمين والطلاب المتقدمين: إنشاء محتوى، اختبارات، ومسارات تعليمية.',
    descEn: 'For teachers or advanced students: create learning materials, quizzes, and learning paths.',
    status: 'future', color: '#56A86B',
  },
]

function RoadmapCard({ item, delay }: { item: RoadmapItem; delay: number }) {
  const { lang } = useT()
  const isAr = lang === 'ar'
  const Icon = item.icon
  const status = STATUS_META[item.status]
  const isDone = item.status === 'done'

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.3 }}
      className={cn(
        'glass-card rounded-2xl p-5 flex flex-col gap-4 relative overflow-hidden transition-all hover:-translate-y-0.5',
        isDone && 'border-teal-500/30'
      )}
    >
      {/* Subtle color accent */}
      <div className="absolute top-0 inset-x-0 h-0.5 rounded-t-2xl" style={{ background: item.color }} />

      <div className="flex items-start justify-between gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: `${item.color}22` }}>
          <Icon className="w-5 h-5" style={{ color: item.color }} />
        </div>
        <span className={cn('text-xs font-semibold px-2.5 py-1 rounded-full border shrink-0', status.className)}>
          {isAr ? status.labelAr : status.labelEn}
        </span>
      </div>

      <div>
        <h3 className="font-semibold text-sm text-foreground mb-1.5">
          {isAr ? item.titleAr : item.titleEn}
        </h3>
        <p className="text-xs text-muted-foreground leading-relaxed" dir="auto">
          {isAr ? item.descAr : item.descEn}
        </p>
      </div>

      {isDone && (
        <div className="flex items-center gap-1.5 text-teal-400 text-xs font-medium">
          <CheckCircle2 className="w-3.5 h-3.5" />
          {isAr ? 'متاح الآن في نِبْرَاس' : 'Available now in Nibras'}
        </div>
      )}
    </motion.div>
  )
}

export function RoadmapPage() {
  const { t, lang } = useT()
  const isAr = lang === 'ar'

  const statusCounts = {
    done: ROADMAP.filter(i => i.status === 'done').length,
    inprogress: ROADMAP.filter(i => i.status === 'inprogress').length,
    planned: ROADMAP.filter(i => i.status === 'planned').length,
    future: ROADMAP.filter(i => i.status === 'future').length,
  }

  return (
    <div className="section-wrapper space-y-8">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-2 mb-2">
          <Rocket className="w-5 h-5 text-primary" />
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            {isAr ? 'خارطة الطريق' : 'Roadmap'}
          </span>
        </div>
        <h1 className="font-display text-3xl sm:text-4xl text-foreground mb-3">
          {isAr ? 'خارطة طريق نِبْرَاس' : 'Nibras Roadmap'}
        </h1>
        <p className="text-muted-foreground text-sm max-w-xl leading-relaxed" dir="auto">
          {isAr
            ? 'هذه هي رؤيتنا لمستقبل نِبْرَاس. كل ميزة مدروسة بعناية لتجعل تجربتك الدراسية أكثر ذكاءً وفاعلية.'
            : 'Our vision for the future of Nibras. Every feature is thoughtfully designed to make your learning experience smarter and more effective.'}
        </p>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {([
          { status: 'done', icon: CheckCircle2, color: '#3E9AA6' },
          { status: 'inprogress', icon: Clock, color: '#4A90D9' },
          { status: 'planned', icon: Sparkles, color: '#C9A84C' },
          { status: 'future', icon: Rocket, color: '#7C5CBF' },
        ] as const).map(({ status, icon: Icon, color }) => (
          <motion.div key={status}
            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.05 }}
            className="glass-card rounded-xl p-4 flex items-center gap-3"
          >
            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: `${color}22` }}>
              <Icon className="w-4 h-4" style={{ color }} />
            </div>
            <div>
              <p className="font-display text-xl text-foreground leading-none">{statusCounts[status]}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{STATUS_META[status][isAr ? 'labelAr' : 'labelEn']}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Cards grid */}
      {(['done', 'inprogress', 'planned', 'future'] as Status[]).map(status => {
        const items = ROADMAP.filter(i => i.status === status)
        if (!items.length) return null
        const meta = STATUS_META[status]
        return (
          <div key={status}>
            <div className="flex items-center gap-2 mb-4">
              <span className={cn('text-xs font-semibold px-3 py-1 rounded-full border', meta.className)}>
                {isAr ? meta.labelAr : meta.labelEn}
              </span>
              <div className="flex-1 h-px bg-border/40" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {items.map((item, i) => <RoadmapCard key={item.titleEn} item={item} delay={i * 0.06} />)}
            </div>
          </div>
        )
      })}

      {/* Footer note */}
      <div className="glass-card rounded-2xl p-5 text-center">
        <p className="text-sm text-muted-foreground" dir="auto">
          {isAr
            ? '💡 خارطة الطريق تتطور باستمرار بناءً على ملاحظات الطلاب ورؤية المطوّر.'
            : '💡 The roadmap evolves continuously based on student feedback and the developer\'s vision.'}
        </p>
        <p className="text-xs text-muted-foreground/60 mt-2">
          تم تطويره من قبل KIWI | محمد حمدي
        </p>
      </div>
    </div>
  )
}
