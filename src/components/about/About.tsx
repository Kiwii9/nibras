import { motion } from 'framer-motion'
import { useT } from '@/hooks/useT'
import { Sparkles, Heart, Lightbulb, Target, Eye, Coffee, ExternalLink } from 'lucide-react'

const sections = [
  {
    icon: Lightbulb,
    titleAr: 'قصة الفكرة',
    titleEn: 'The Story Behind the Idea',
    color: '#C9A84C',
    contentAr: `جاءت فكرة نبراس من تجربة شخصية عشتها أثناء دراستي؛ فقد كنت أواجه صعوبة في التدريب على المحتوى الدراسي بعد مذاكرته. ورغم أنني كنت أراجع المواد بكثافة، إلا أن المشكلة كانت في تحويل هذا المحتوى إلى أسئلة واختبارات وتدريبات تساعدني على قياس فهمي وتثبيت معلوماتي.`,
    contentEn: `The idea for Nibras came from a personal experience during my studies. I struggled to practice study material after reviewing it. Even though I was reviewing intensively, the problem was converting that content into questions, tests, and exercises that helped me measure my understanding and reinforce what I learned.`,
  },
  {
    icon: Target,
    titleAr: 'هدفي من التطبيق',
    titleEn: 'My Goal for the App',
    color: '#3E9AA6',
    contentAr: `أردت أن أصنع أداة تساعدني أولاً، ثم تساعد كل طالب يمر بالتجربة نفسها؛ طالب يذاكر، لكنه يحتاج إلى طريقة عملية يتدرّب بها على ما تعلّمه، ويحوّل معلوماته من قراءة وحفظ إلى تطبيق واختبار.`,
    contentEn: `I wanted to build a tool that helps me first, then helps every student who goes through the same experience — a student who studies hard but needs a practical way to practice what they've learned, transforming knowledge from reading and memorization into application and testing.`,
  },
  {
    icon: Sparkles,
    titleAr: 'سبب التسمية',
    titleEn: 'Why "Nibras"?',
    color: '#7C5CBF',
    contentAr: `اخترت اسم نبراس لأنه يعني النور أو المصباح الذي يهدي الطريق. وهذا هو المعنى الذي أردت أن يحمله التطبيق؛ أن يكون وسيلة تُضيء للطالب طريقه الدراسي، وتساعده على فهم مستواه، ومعرفة نقاط قوته وضعفه، والاستعداد بثقة أكبر.`,
    contentEn: `I chose the name "Nibras" because it means a lantern or light that guides the way. This is the meaning I wanted the app to carry — to be a tool that illuminates a student's academic path, helps them understand their level, identify strengths and weaknesses, and prepare with greater confidence.`,
  },
  {
    icon: Eye,
    titleAr: 'الرؤية المستقبلية',
    titleEn: 'Future Vision',
    color: '#56A86B',
    contentAr: `هدفي من نبراس هو أن يكون رفيقاً دراسياً بسيطاً ونافعاً، يحوّل المحتوى التعليمي إلى تجربة تدريبية أكثر وضوحاً وفاعلية، ويساعد الطلاب على التعلّم بطريقة أذكى، لا تعتمد فقط على المذاكرة، بل على الممارسة والتقييم والتحسّن المستمر.`,
    contentEn: `My goal for Nibras is to be a simple and useful study companion that transforms educational content into a clearer and more effective training experience, helping students learn smarter — not just through memorization, but through practice, evaluation, and continuous improvement.`,
  },
]

const WHY_NIBRAS = [
  { emoji: '⚡', ar: 'تحويل أي محتوى إلى اختبارات فورية', en: 'Turn any content into instant quizzes' },
  { emoji: '🧠', ar: 'تقييم ذكي يفهم المعنى لا الكلمات', en: 'AI grading that understands meaning, not keywords' },
  { emoji: '📊', ar: 'تتبّع تقدّمك باستمرار', en: 'Track your progress continuously' },
  { emoji: '🌙', ar: 'مجاني 100% بدون اشتراكات', en: '100% free, no subscriptions ever' },
  { emoji: '🌍', ar: 'دعم كامل للعربية والإنجليزية', en: 'Full Arabic & English support' },
  { emoji: '🔒', ar: 'بياناتك تبقى على جهازك', en: 'Your data stays on your device' },
]

export function AboutPage() {
  const { lang } = useT()
  const isAr = lang === 'ar'

  return (
    <div className="section-wrapper space-y-10" dir={isAr ? 'rtl' : 'ltr'}>
      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden glass-card rounded-3xl p-8 sm:p-12 text-center"
        style={{ background: 'linear-gradient(135deg, #0B2428 0%, #1A4D53 60%, #2D7A84 100%)' }}
      >
        <motion.div
          animate={{ rotate: [0, 5, -5, 0], scale: [1, 1.05, 1] }}
          transition={{ duration: 4, repeat: Infinity }}
          className="text-6xl mb-4"
        >
          ✦
        </motion.div>
        <h1 className="font-display text-4xl sm:text-5xl text-white mb-3">نِبْرَاس</h1>
        <p className="text-teal-200/80 text-base font-ruqaa mb-6">
          العلم طريقك نحو التميّز، اتّخذ منه نبراسًا.
        </p>
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/20 text-white/70 text-sm">
          <Heart className="w-4 h-4 text-red-400" />
          {isAr ? 'تم تطويره من قبل KIWI | محمد حمدي' : 'Developed by KIWI | Mohammed Hamdi'}
        </div>
      </motion.div>

      {/* About sections */}
      <div className="space-y-6">
        <h2 className="font-display text-2xl text-foreground">
          {isAr ? 'حول تطبيق نِبْرَاس' : 'About Nibras'}
        </h2>
        {sections.map(({ icon: Icon, titleAr, titleEn, color, contentAr, contentEn }, i) => (
          <motion.div
            key={titleEn}
            initial={{ opacity: 0, x: isAr ? 20 : -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.08 }}
            className="glass-card rounded-2xl p-6 flex gap-5"
          >
            <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: `${color}22` }}>
              <Icon className="w-5 h-5" style={{ color }} />
            </div>
            <div>
              <h3 className="font-semibold text-base text-foreground mb-2">
                {isAr ? titleAr : titleEn}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed" dir={isAr ? 'rtl' : 'ltr'}>
                {isAr ? contentAr : contentEn}
              </p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Why Nibras */}
      <div>
        <h2 className="font-display text-2xl text-foreground mb-5">
          {isAr ? 'لماذا نِبْرَاس؟' : 'Why Nibras?'}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {WHY_NIBRAS.map(({ emoji, ar, en }, i) => (
            <motion.div
              key={en}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.05 }}
              className="glass-card rounded-xl p-4 flex items-start gap-3"
            >
              <span className="text-xl shrink-0">{emoji}</span>
              <p className="text-sm text-muted-foreground leading-snug" dir="auto">
                {isAr ? ar : en}
              </p>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Quote */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="glass-card rounded-2xl p-8 text-center border-primary/20"
        style={{ borderColor: 'rgba(45,122,132,0.3)' }}
      >
        <p className="font-ruqaa text-xl sm:text-2xl text-foreground mb-3 leading-relaxed" dir="rtl">
          "نبراس: العلم طريقك نحو التميّز، اتّخذ منه نبراسًا."
        </p>
        <p className="text-sm text-muted-foreground italic">
          "Nibras: Knowledge is your path to excellence — let it be your guiding light."
        </p>
      </motion.div>

      {/* Developer card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="glass-card rounded-2xl p-6"
        style={{ background: 'linear-gradient(135deg, #0B2428 0%, #1A4D53 100%)' }}
      >
        <div className="flex items-center gap-4 mb-4">
          <div className="w-12 h-12 rounded-full flex items-center justify-center text-xl shrink-0"
            style={{ background: 'linear-gradient(135deg, #1A4D53, #3E9AA6)' }}>
            🥝
          </div>
          <div>
            <p className="font-semibold text-white">KIWI | محمد حمدي</p>
            <p className="text-teal-300/60 text-xs">{isAr ? 'مطوّر نِبْرَاس' : 'Developer of Nibras'}</p>
          </div>
        </div>
        <p className="text-teal-200/70 text-sm leading-relaxed mb-4" dir={isAr ? 'rtl' : 'ltr'}>
          {isAr
            ? 'طالب بنى نِبْرَاس من تجربته الخاصة — لأن كل طالب يستحق رفيقاً دراسياً ذكياً ومجانياً.'
            : 'A student who built Nibras from personal experience — because every student deserves a smart, free study companion.'}
        </p>
        <a
          href="https://ko-fi.com"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-[#FF5E5B]/20 text-[#FF5E5B] hover:bg-[#FF5E5B]/30 transition-colors border border-[#FF5E5B]/30"
        >
          <Coffee className="w-4 h-4" />
          {isAr ? 'ادعم المطوّر على Ko-fi' : 'Support the developer on Ko-fi'}
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </motion.div>
    </div>
  )
}
