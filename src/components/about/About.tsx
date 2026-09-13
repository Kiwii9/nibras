import { useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { useT } from '@/hooks/useT'
import {
  Zap, BrainCircuit, BarChart2, Globe, Lock,
  BookOpen, Target, Lightbulb, Eye,
  Github, Linkedin, Coffee, AlertCircle, Bug, ExternalLink
} from 'lucide-react'

// ── Animation helpers ────────────────────────────────────────────────────────

const FADE_UP = (delay = 0) => ({
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-60px' },
  transition: { duration: 0.5, delay, ease: 'easeOut' as const },
})

// ── Particles canvas ─────────────────────────────────────────────────────────

interface Circle {
  x: number; y: number
  translateX: number; translateY: number
  size: number; alpha: number; targetAlpha: number
  dx: number; dy: number; magnetism: number
}

function ParticlesCanvas({ color = '#3E9AA6', quantity = 45 }: { color?: string; quantity?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const circlesRef = useRef<Circle[]>([])
  const mouseRef = useRef({ x: 0, y: 0 })
  const sizeRef = useRef({ w: 0, h: 0 })
  const rafRef = useRef(0)

  // parse hex to rgb numbers (fallback for CSS vars passed as string)
  const rgb = color.startsWith('#')
    ? (() => { const h = color.replace('#',''); const n = parseInt(h,16); return [(n>>16)&255,(n>>8)&255,n&255] })()
    : [62, 154, 166]

  useEffect(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return
    const ctx = canvas.getContext('2d')!
    const dpr = window.devicePixelRatio || 1
    // non-null aliases for use inside nested functions
    const cvs = canvas as HTMLCanvasElement
    const ctr = container as HTMLDivElement

    function makeCircle(): Circle {
      return {
        x: Math.random() * sizeRef.current.w,
        y: Math.random() * sizeRef.current.h,
        translateX: 0, translateY: 0,
        size: Math.floor(Math.random() * 2) + 1,
        alpha: 0,
        targetAlpha: parseFloat((Math.random() * 0.25 + 0.08).toFixed(2)),
        dx: (Math.random() - 0.5) * 0.18,
        dy: (Math.random() - 0.5) * 0.18,
        magnetism: 0.1 + Math.random() * 3,
      }
    }

    function resize() {
      circlesRef.current = []
      sizeRef.current.w = ctr.offsetWidth
      sizeRef.current.h = ctr.offsetHeight
      cvs.width = sizeRef.current.w * dpr
      cvs.height = sizeRef.current.h * dpr
      cvs.style.width = `${sizeRef.current.w}px`
      cvs.style.height = `${sizeRef.current.h}px`
      ctx.scale(dpr, dpr)
      for (let i = 0; i < quantity; i++) circlesRef.current.push(makeCircle())
    }

    function onMove(e: MouseEvent) {
      const rect = cvs.getBoundingClientRect()
      mouseRef.current.x = e.clientX - rect.left - sizeRef.current.w / 2
      mouseRef.current.y = e.clientY - rect.top - sizeRef.current.h / 2
    }

    function tick() {
      ctx.clearRect(0, 0, sizeRef.current.w, sizeRef.current.h)
      circlesRef.current.forEach((c, i) => {
        const edges = [
          c.x + c.translateX - c.size,
          sizeRef.current.w - c.x - c.translateX - c.size,
          c.y + c.translateY - c.size,
          sizeRef.current.h - c.y - c.translateY - c.size,
        ]
        const remap = Math.min(1, Math.min(...edges) / 20)
        c.alpha = remap > 1 ? Math.min(c.targetAlpha, c.alpha + 0.02) : c.targetAlpha * remap
        c.x += c.dx
        c.y += c.dy
        c.translateX += (mouseRef.current.x / (50 / c.magnetism) - c.translateX) / 50
        c.translateY += (mouseRef.current.y / (50 / c.magnetism) - c.translateY) / 50

        if (c.x < -c.size || c.x > sizeRef.current.w + c.size || c.y < -c.size || c.y > sizeRef.current.h + c.size) {
          circlesRef.current.splice(i, 1)
          circlesRef.current.push(makeCircle())
        } else {
          ctx.translate(c.translateX, c.translateY)
          ctx.beginPath()
          ctx.arc(c.x, c.y, c.size, 0, Math.PI * 2)
          ctx.fillStyle = `rgba(${rgb.join(',')},${c.alpha})`
          ctx.fill()
          ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
        }
      })
      rafRef.current = requestAnimationFrame(tick)
    }

    resize()
    window.addEventListener('resize', resize)
    window.addEventListener('mousemove', onMove)
    rafRef.current = requestAnimationFrame(tick)

    return () => {
      window.removeEventListener('resize', resize)
      window.removeEventListener('mousemove', onMove)
      cancelAnimationFrame(rafRef.current)
    }
  }, [])

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0 }}
    >
      <canvas ref={canvasRef} style={{ display: 'block', width: '100%', height: '100%' }} />
    </div>
  )
}

// ── HighlightGroup ───────────────────────────────────────────────────────────

function HighlightGroup({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const onMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      ;(Array.from(el.children) as HTMLElement[]).forEach(box => {
        const br = box.getBoundingClientRect()
        box.style.setProperty('--mouse-x', `${x - (br.left - rect.left)}px`)
        box.style.setProperty('--mouse-y', `${y - (br.top - rect.top)}px`)
      })
    }
    el.addEventListener('mousemove', onMove)
    return () => el.removeEventListener('mousemove', onMove)
  }, [])

  return <div ref={ref} style={style}>{children}</div>
}

// ── Data ─────────────────────────────────────────────────────────────────────

const STORY = [
  {
    icon: Lightbulb,
    titleAr: 'قصة الفكرة',     titleEn: 'The Story',
    bodyAr: 'جاءت فكرة نِبراس من تجربة شخصية. كنت أراجع المواد بكثافة لكن المشكلة كانت في تحويل ذلك المحتوى إلى اختبارات وتدريبات تساعدني على قياس فهمي وتثبيت معلوماتي.',
    bodyEn: 'Nibras came from a personal experience. I reviewed material intensively, but the gap was converting that content into tests and practice that measured understanding and made knowledge stick.',
  },
  {
    icon: Target,
    titleAr: 'الهدف',           titleEn: 'The Goal',
    bodyAr: 'أردت أن أصنع أداة تساعد كل طالب يحتاج إلى طريقة عملية يتدرّب بها على ما تعلّمه، ويحوّل معلوماته من قراءة وحفظ إلى تطبيق واختبار.',
    bodyEn: 'Build a tool for every student who needs a practical way to practice what they learned, converting knowledge from reading and memorization into application and testing.',
  },
  {
    icon: BookOpen,
    titleAr: 'سبب التسمية',     titleEn: 'Why Nibras',
    bodyAr: 'نِبراس تعني المشعل الذي يهدي الطريق. هذا هو المعنى الذي أردت أن يحمله التطبيق: أن يكون وسيلة تضيء للطالب طريقه الدراسي.',
    bodyEn: 'Nibras means a lantern that lights the way. That is the meaning I wanted the app to carry: a tool that illuminates the academic path forward.',
  },
  {
    icon: Eye,
    titleAr: 'الرؤية',          titleEn: 'The Vision',
    bodyAr: 'رفيق دراسي يحوّل المحتوى التعليمي إلى تجربة تدريبية أكثر وضوحاً، يساعد الطلاب على التعلّم بطريقة أذكى تعتمد على الممارسة والتقييم والتحسّن المستمر.',
    bodyEn: 'A study companion that transforms educational content into a clearer training experience, helping students learn smarter through practice, evaluation, and continuous improvement.',
  },
]

const FEATURES = [
  { icon: Zap,          ar: 'تحويل أي محتوى إلى اختبارات فورية',        en: 'Turn any content into instant quizzes' },
  { icon: BrainCircuit, ar: 'تقييم ذكي يفهم المعنى لا الكلمات',         en: 'AI grading that understands meaning' },
  { icon: BarChart2,    ar: 'تتبّع تقدّمك باستمرار',                     en: 'Track your progress continuously' },
  { icon: Lock,         ar: 'بياناتك محفوظة بأمان',                     en: 'Your data stays secure' },
  { icon: Globe,        ar: 'دعم كامل للعربية والإنجليزية',              en: 'Full Arabic and English support' },
  { icon: AlertCircle,  ar: 'نسخة Alpha - شاركنا ملاحظاتك',             en: 'Alpha stage - share your feedback' },
]

const CONTACT_LINKS = [
  {
    icon: Github,
    labelAr: 'GitHub',        labelEn: 'GitHub',
    subAr: 'المصدر والمشاريع', subEn: 'Source and projects',
    href: 'https://github.com/Kiwii9',
  },
  {
    icon: Linkedin,
    labelAr: 'LinkedIn',      labelEn: 'LinkedIn',
    subAr: 'التواصل المهني',  subEn: 'Professional contact',
    href: 'https://www.linkedin.com/in/mohammed-homadi-31738037b',
  },
  {
    icon: Coffee,
    labelAr: 'Ko-fi',         labelEn: 'Ko-fi',
    subAr: 'ادعم المشروع',    subEn: 'Support the project',
    href: 'https://ko-fi.com/kiwii9#',
  },
  {
    icon: Bug,
    labelAr: 'الابلاغ عن مشكلة', labelEn: 'Report an issue',
    subAr: 'Issues على GitHub',   subEn: 'GitHub Issues',
    href: 'https://github.com/Kiwii9/nibras/issues',
  },
]

// ── Page component ────────────────────────────────────────────────────────────

export function AboutPage() {
  const { lang } = useT()
  const isAr = lang === 'ar'
  const t = (ar: string, en: string) => isAr ? ar : en

  return (
    <div
      className="section-wrapper"
      dir={isAr ? 'rtl' : 'ltr'}
      style={{ maxWidth: 760, margin: '0 auto' }}
    >

      {/* ── Alpha notice banner ── */}
      <motion.div {...FADE_UP(0)} style={{ marginBottom: 40 }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          background: 'rgba(109,94,248,0.08)',
          border: '1px solid rgba(109,94,248,0.25)',
          borderRadius: 'var(--radius-md)',
          padding: '10px 14px',
        }}>
          <AlertCircle size={15} style={{ color: 'var(--violet)', flexShrink: 0 }} />
          <p style={{ fontSize: 12.5, color: 'var(--text-secondary)', margin: 0 }}>
            <strong style={{ color: 'var(--violet)' }}>Alpha</strong>
            {isAr
              ? ' - نِبراس في مرحلة الاختبار التجريبي. مساعدتك في الابلاغ عن المشكلات تصنع الفرق.'
              : ' - Nibras is in early testing. Your bug reports make a real difference.'}
          </p>
        </div>
      </motion.div>

      {/* ── Manifesto hero ── */}
      <motion.div {...FADE_UP(0.05)} style={{ marginBottom: 56 }}>
        <p style={{
          fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
          color: 'var(--accent)', marginBottom: 16,
        }}>
          {t('حول التطبيق', 'About')}
        </p>
        <h1 style={{
          fontFamily: "'Reem Kufi', sans-serif",
          fontSize: 'clamp(28px, 5vw, 44px)',
          fontWeight: 700, lineHeight: 1.15,
          color: 'var(--text-primary)', marginBottom: 20,
        }}>
          {t(
            'صُنع نِبراس لأن المذاكرة تستحق أكثر من مجرد مراجعة.',
            'Nibras was built because studying deserves more than passive review.'
          )}
        </h1>
        <p style={{ fontSize: 17, lineHeight: 1.75, color: 'var(--text-secondary)', maxWidth: 600 }}>
          {t(
            'كل ميزة في نِبراس نشأت من سؤال بسيط: كيف أحوّل ما قرأته إلى شيء أفهمه حقاً؟',
            'Every feature in Nibras started from one question: how do I turn what I read into something I actually understand?'
          )}
        </p>
      </motion.div>

      {/* ── Divider ── */}
      <div style={{ height: 1, background: 'var(--border)', marginBottom: 56 }} />

      {/* ── Story sections ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 48, marginBottom: 64 }}>
        {STORY.map(({ icon: Icon, titleAr, titleEn, bodyAr, bodyEn }, i) => (
          <motion.div key={i} {...FADE_UP(i * 0.07)}
            style={{ display: 'grid', gridTemplateColumns: '40px 1fr', gap: 20, alignItems: 'flex-start' }}
          >
            <div style={{
              width: 40, height: 40, borderRadius: 'var(--radius-sm)',
              background: 'var(--bg)', border: '1px solid var(--border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <Icon size={18} style={{ color: 'var(--primary)' }} />
            </div>
            <div>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
                {t(titleAr, titleEn)}
              </h2>
              <p style={{ fontSize: 14, lineHeight: 1.8, color: 'var(--text-secondary)' }}>
                {t(bodyAr, bodyEn)}
              </p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* ── Feature bento ── */}
      <motion.div {...FADE_UP(0.1)} style={{ marginBottom: 64 }}>
        <p style={{
          fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
          color: 'var(--text-muted)', marginBottom: 20,
        }}>
          {t('ما يقدّمه نِبراس', 'What Nibras offers')}
        </p>
        <HighlightGroup style={{
          display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)',
          gap: 1, background: 'var(--border)',
          border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden',
        }}>
          {FEATURES.map(({ icon: Icon, ar, en }, i) => (
            <motion.div key={i} {...FADE_UP(0.05 + i * 0.05)}
              style={{
                background: 'var(--surface)', padding: '18px 20px',
                display: 'flex', alignItems: 'center', gap: 12,
                position: 'relative', overflow: 'hidden',
              }}
            >
              {/* radial glow follows --mouse-x/--mouse-y set by HighlightGroup */}
              <div style={{
                position: 'absolute', pointerEvents: 'none',
                left: 'calc(var(--mouse-x, 9999px) - 192px)',
                top: 'calc(var(--mouse-y, 9999px) - 192px)',
                width: 384, height: 384, borderRadius: '50%',
                background: 'rgba(62,154,166,0.10)',
                filter: 'blur(72px)', transition: 'opacity 0.3s',
              }} />
              <Icon size={16} style={{ color: 'var(--primary)', flexShrink: 0, position: 'relative' }} />
              <span style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5, position: 'relative' }}>
                {t(ar, en)}
              </span>
            </motion.div>
          ))}
        </HighlightGroup>
      </motion.div>

      {/* ── Divider ── */}
      <div style={{ height: 1, background: 'var(--border)', marginBottom: 48 }} />

      {/* ── Contact section ── */}
      <motion.div {...FADE_UP(0.12)}>
        <p style={{
          fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
          color: 'var(--text-muted)', marginBottom: 8,
        }}>
          {t('تواصل واقتراحات', 'Contact and feedback')}
        </p>
        <h2 style={{
          fontFamily: "'Reem Kufi', sans-serif",
          fontSize: 'clamp(20px, 3vw, 26px)',
          fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4,
        }}>
          {t('محمد حمدي', 'Mohammed Hamdi')}
        </h2>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 28, fontFamily: "'IBM Plex Mono', monospace" }}>
          @itskiwi9
        </p>

        {/* Card with particle background */}
        <div style={{
          position: 'relative', overflow: 'hidden',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border)',
          background: 'var(--surface)',
          padding: '28px 20px',
          minHeight: 180,
        }}>
          <ParticlesCanvas color="#3E9AA6" quantity={45} />

          <div style={{
            position: 'relative', zIndex: 1,
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: 10,
          }}>
            {CONTACT_LINKS.map(({ icon: Icon, labelAr, labelEn, subAr, subEn, href }) => (
              <a
                key={href}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '13px 14px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg)',
                  border: '1px solid var(--border)',
                  textDecoration: 'none',
                  transition: 'border-color 0.15s, background 0.15s',
                }}
                onMouseEnter={e => {
                  const el = e.currentTarget as HTMLElement
                  el.style.borderColor = 'var(--border-strong)'
                  el.style.background = 'var(--surface-elev)'
                }}
                onMouseLeave={e => {
                  const el = e.currentTarget as HTMLElement
                  el.style.borderColor = 'var(--border)'
                  el.style.background = 'var(--bg)'
                }}
              >
                <div style={{
                  width: 34, height: 34, borderRadius: 'var(--radius-sm)',
                  background: 'var(--surface)', border: '1px solid var(--border)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <Icon size={15} style={{ color: 'var(--primary)' }} />
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <p style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                    {t(labelAr, labelEn)}
                  </p>
                  <p style={{
                    fontSize: 11, color: 'var(--text-muted)', margin: '2px 0 0',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {t(subAr, subEn)}
                  </p>
                </div>
                <ExternalLink size={11} style={{ color: 'var(--text-muted)', flexShrink: 0, opacity: 0.45 }} />
              </a>
            ))}
          </div>
        </div>
      </motion.div>

      <div style={{ height: 40 }} />
    </div>
  )
}
