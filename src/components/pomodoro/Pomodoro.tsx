import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Play, Pause, RotateCcw, Settings, X, Check,
  Coffee, Brain, Zap, Timer as TimerIcon
} from 'lucide-react'
import { useStore } from '@/store'
import { useT } from '@/hooks/useT'
import { cn } from '@/lib/utils'

type Mode = 'work' | 'short' | 'long'

function playChime() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
    const frequencies = [523.25, 659.25, 783.99, 1046.5]
    frequencies.forEach((freq, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.type = 'sine'
      osc.frequency.value = freq
      const t0 = ctx.currentTime + i * 0.22
      gain.gain.setValueAtTime(0, t0)
      gain.gain.linearRampToValueAtTime(0.18, t0 + 0.04)
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.55)
      osc.start(t0)
      osc.stop(t0 + 0.55)
    })
  } catch {}
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

// ─── SVG Ring ─────────────────────────────────────────────────────────────────
function ProgressRing({ progress, size = 220, mode }: { progress: number; size?: number; mode: Mode }) {
  const radius = (size - 20) / 2
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference * (1 - progress)
  const colors: Record<Mode, string> = {
    work: '#3E9AA6',
    short: '#56A86B',
    long: '#C9A84C',
  }
  return (
    <svg width={size} height={size} className="pomodoro-ring" style={{ transform: 'rotate(-90deg)' }}>
      {/* Background ring */}
      <circle cx={size / 2} cy={size / 2} r={radius}
        fill="none" stroke="hsl(var(--border))" strokeWidth="8" />
      {/* Progress ring */}
      <motion.circle
        cx={size / 2} cy={size / 2} r={radius}
        fill="none"
        stroke={colors[mode]}
        strokeWidth="8"
        strokeLinecap="round"
        strokeDasharray={circumference}
        animate={{ strokeDashoffset }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        style={{ filter: `drop-shadow(0 0 8px ${colors[mode]}88)` }}
      />
    </svg>
  )
}

// ─── Settings Panel ───────────────────────────────────────────────────────────
function PomodoroSettings({ onClose }: { onClose: () => void }) {
  const { t } = useT()
  const { pomodoroSettings, setPomodoroSettings } = useStore()
  const [local, setLocal] = useState({ ...pomodoroSettings })

  const field = (key: keyof typeof local, label: string) => (
    <div>
      <label className="text-xs text-muted-foreground font-medium block mb-1.5">{label}</label>
      <div className="flex items-center gap-2">
        <button onClick={() => setLocal(s => ({ ...s, [key]: Math.max(1, s[key] - 1) }))}
          className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center font-bold hover:bg-muted/80 transition-colors">−</button>
        <span className="w-10 text-center font-semibold text-sm">{local[key]}</span>
        <button onClick={() => setLocal(s => ({ ...s, [key]: Math.min(60, s[key] + 1) }))}
          className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center font-bold hover:bg-muted/80 transition-colors">+</button>
      </div>
    </div>
  )

  return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }} className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div className="relative z-10 w-full max-w-sm glass-card rounded-2xl p-6 shadow-teal-lg">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-display text-xl">{t('settings')}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-4">
          {field('workMinutes', t('workDuration'))}
          {field('shortBreakMinutes', t('shortBreakDuration'))}
          {field('longBreakMinutes', t('longBreakDuration'))}
          {field('sessionsBeforeLongBreak', t('sessionsBeforeLong'))}
        </div>

        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-xl border border-border/60 text-sm font-medium hover:bg-muted transition-colors">
            {t('cancel')}
          </button>
          <button onClick={() => { setPomodoroSettings(local); onClose() }} className="btn-teal flex-1 py-2.5">
            <Check className="w-4 h-4" />{t('save')}
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ─── Main Pomodoro ────────────────────────────────────────────────────────────
export function Pomodoro() {
  const { t } = useT()
  const { pomodoroSettings } = useStore()

  const [mode, setMode] = useState<Mode>('work')
  const [timeLeft, setTimeLeft] = useState(pomodoroSettings.workMinutes * 60)
  const [running, setRunning] = useState(false)
  const [sessionCount, setSessionCount] = useState(0)
  const [showSettings, setShowSettings] = useState(false)
  const [notification, setNotification] = useState('')
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const totalTime = {
    work: pomodoroSettings.workMinutes * 60,
    short: pomodoroSettings.shortBreakMinutes * 60,
    long: pomodoroSettings.longBreakMinutes * 60,
  }[mode]

  const progress = 1 - timeLeft / totalTime

  // Sync time on settings change or mode change
  useEffect(() => {
    if (!running) setTimeLeft(totalTime)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pomodoroSettings, mode])

  const handleComplete = useCallback(() => {
    setRunning(false)
    playChime()

    if (mode === 'work') {
      const newCount = sessionCount + 1
      setSessionCount(newCount)
      const isLong = newCount % pomodoroSettings.sessionsBeforeLongBreak === 0
      setNotification(t('sessionComplete'))
      setTimeout(() => {
        setMode(isLong ? 'long' : 'short')
        setNotification('')
      }, 2500)
    } else {
      setNotification(t('breakComplete'))
      setTimeout(() => {
        setMode('work')
        setNotification('')
      }, 2000)
    }
  }, [mode, sessionCount, pomodoroSettings, t])

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) { handleComplete(); return 0 }
          return prev - 1
        })
      }, 1000)
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [running, handleComplete])

  // Update tab title
  useEffect(() => {
    document.title = running ? `${formatTime(timeLeft)} — Nibras` : 'Nibras نِبْرَاس'
    return () => { document.title = 'Nibras نِبْرَاس' }
  }, [timeLeft, running])

  const handleReset = () => {
    setRunning(false)
    setTimeLeft(totalTime)
  }

  const switchMode = (m: Mode) => {
    setRunning(false)
    setMode(m)
    setTimeLeft({ work: pomodoroSettings.workMinutes * 60, short: pomodoroSettings.shortBreakMinutes * 60, long: pomodoroSettings.longBreakMinutes * 60 }[m])
  }

  const modeConfig = {
    work: { icon: Brain, label: t('workSession'), bg: '#1A4D53', ring: '#3E9AA6' },
    short: { icon: Coffee, label: t('shortBreak'), bg: '#1A4053', ring: '#56A86B' },
    long: { icon: Zap, label: t('longBreak'), bg: '#2A2A12', ring: '#C9A84C' },
  }
  const { icon: ModeIcon, label: modeLabel } = modeConfig[mode]

  return (
    <div className="section-wrapper max-w-lg mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl text-foreground">{t('pomodoroTitle')}</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {t('sessions')}: {sessionCount}
          </p>
        </div>
        <button onClick={() => setShowSettings(true)}
          className="p-2.5 rounded-xl hover:bg-muted text-muted-foreground transition-colors">
          <Settings className="w-5 h-5" />
        </button>
      </div>

      {/* Mode tabs */}
      <div className="flex gap-1.5 bg-muted/50 p-1 rounded-xl">
        {(['work', 'short', 'long'] as Mode[]).map(m => (
          <button key={m} onClick={() => switchMode(m)}
            className={cn(
              'flex-1 py-2 rounded-lg text-sm font-medium transition-all',
              mode === m ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
            )}>
            {modeConfig[m].label}
          </button>
        ))}
      </div>

      {/* Timer circle */}
      <motion.div
        className="glass-card rounded-3xl p-8 flex flex-col items-center gap-6 teal-noise"
        animate={{ background: running ? 'linear-gradient(135deg, hsl(185 50% 10%), hsl(185 40% 8%))' : undefined }}
        transition={{ duration: 1 }}
      >
        {/* Progress ring + time display */}
        <div className="relative">
          <ProgressRing progress={progress} size={220} mode={mode} />
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
            <ModeIcon className="w-6 h-6 text-muted-foreground/60" />
            <span className="font-display text-5xl text-foreground tabular-nums">
              {formatTime(timeLeft)}
            </span>
            <span className="text-xs text-muted-foreground">{modeLabel}</span>
          </div>
        </div>

        {/* Session dots */}
        <div className="flex gap-2">
          {Array.from({ length: pomodoroSettings.sessionsBeforeLongBreak }).map((_, i) => (
            <div key={i} className={cn(
              'w-2.5 h-2.5 rounded-full transition-all duration-300',
              i < (sessionCount % pomodoroSettings.sessionsBeforeLongBreak)
                ? 'bg-teal-500 shadow-[0_0_6px_#3E9AA6]'
                : 'bg-muted'
            )} />
          ))}
        </div>

        {/* Controls */}
        <div className="flex items-center gap-4">
          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={handleReset}
            className="w-11 h-11 rounded-full flex items-center justify-center bg-muted hover:bg-muted/80 text-muted-foreground transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.94 }}
            onClick={() => setRunning(r => !r)}
            className="w-16 h-16 rounded-full flex items-center justify-center shadow-teal-lg transition-all"
            style={{ background: 'linear-gradient(135deg, #1A4D53, #3E9AA6)' }}
            animate={running ? { boxShadow: ['0 0 0 0 rgba(62,154,166,0.4)', '0 0 0 14px rgba(62,154,166,0)', '0 0 0 0 rgba(62,154,166,0)'] } : {}}
            transition={running ? { duration: 2, repeat: Infinity } : {}}
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={running ? 'pause' : 'play'}
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.5, opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                {running ? <Pause className="w-7 h-7 text-white fill-white" /> : <Play className="w-7 h-7 text-white fill-white ms-0.5" />}
              </motion.div>
            </AnimatePresence>
          </motion.button>

          <div className="w-11 h-11 flex items-center justify-center">
            <TimerIcon className="w-5 h-5 text-muted-foreground/40" />
          </div>
        </div>
      </motion.div>

      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: t('workDuration'), value: `${pomodoroSettings.workMinutes}m`, icon: Brain },
          { label: t('shortBreakDuration').split(' ')[0], value: `${pomodoroSettings.shortBreakMinutes}m`, icon: Coffee },
          { label: t('sessions'), value: sessionCount, icon: Zap },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="glass-card rounded-xl p-4 text-center">
            <Icon className="w-4 h-4 text-primary/60 mx-auto mb-1.5" />
            <p className="font-semibold text-foreground">{value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Notification toast */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-2xl text-white text-sm font-medium shadow-teal-lg"
            style={{ background: 'linear-gradient(135deg, #1A4D53, #3E9AA6)' }}
          >
            {notification}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Settings modal */}
      <AnimatePresence>
        {showSettings && <PomodoroSettings onClose={() => setShowSettings(false)} />}
      </AnimatePresence>
    </div>
  )
}
