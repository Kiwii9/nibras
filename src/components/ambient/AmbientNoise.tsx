import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Volume2, VolumeX, X, Music2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useStore } from '@/store'

type SoundId = 'white' | 'rain' | 'bonfire' | 'forest' | 'cafe' | 'ocean' | 'wind'

const SOUNDS: { id: SoundId; emoji: string; labelAr: string; labelEn: string }[] = [
  { id: 'white',   emoji: '📻', labelAr: 'ثابت',       labelEn: 'Static' },
  { id: 'rain',    emoji: '🌧️', labelAr: 'مطر',        labelEn: 'Rain' },
  { id: 'bonfire', emoji: '🔥', labelAr: 'نار',         labelEn: 'Bonfire' },
  { id: 'forest',  emoji: '🌿', labelAr: 'غابة',        labelEn: 'Forest' },
  { id: 'cafe',    emoji: '☕', labelAr: 'مقهى',        labelEn: 'Café' },
  { id: 'ocean',   emoji: '🌊', labelAr: 'أمواج',       labelEn: 'Ocean' },
  { id: 'wind',    emoji: '🍃', labelAr: 'نسيم',        labelEn: 'Wind' },
]

const SOUND_URLS = new Map<SoundId, string>()
const SAMPLE_RATE = 24000
const DURATION_SECONDS = 14

function randomNoise() {
  return Math.random() * 2 - 1
}

function clampSample(value: number) {
  return Math.max(-1, Math.min(1, value))
}

function envelopePulse(t: number, center: number, width: number) {
  const d = Math.abs(t - center)
  if (d > width) return 0
  return Math.pow(1 - d / width, 2)
}

function makeSoundSamples(id: SoundId) {
  const length = SAMPLE_RATE * DURATION_SECONDS
  const samples = new Float32Array(length)

  let low = 0
  let mid = 0
  let high = 0
  let brown = 0
  let lastBurst = -10
  let birdPhase = 0

  for (let i = 0; i < length; i++) {
    const t = i / SAMPLE_RATE
    const n = randomNoise()

    low = low * 0.995 + n * 0.005
    mid = mid * 0.965 + n * 0.035
    high = n - mid
    brown = (brown + 0.025 * n) / 1.025

    let value = 0

    switch (id) {
      case 'white': {
        // Clean static / white noise: bright and steady, intentionally not natural ambience.
        value = high * 0.72 + n * 0.18
        break
      }

      case 'rain': {
        // Fine high rain bed + many tiny droplets + occasional soft low rumble.
        const droplet = Math.random() > 0.992 ? Math.sin(2 * Math.PI * (1800 + Math.random() * 2200) * t) * (0.12 + Math.random() * 0.2) : 0
        const shower = Math.max(0, high) * 0.42 + Math.abs(n) * 0.08
        const rumble = low * 0.22 * (0.5 + 0.5 * Math.sin(2 * Math.PI * 0.07 * t))
        value = shower + droplet + rumble
        break
      }

      case 'bonfire': {
        // Warm low body + sparse sharp crackles and pops.
        const warmth = brown * 0.75 + low * 0.25
        const crackleChance = Math.random() > 0.9975 || (t - lastBurst < 0.035 && Math.random() > 0.7)
        if (crackleChance && t - lastBurst > 0.02) lastBurst = t
        const crackleEnv = Math.max(0, 1 - (t - lastBurst) / 0.045)
        const crackle = crackleEnv > 0 ? randomNoise() * crackleEnv * 0.9 : 0
        value = warmth * 0.55 + crackle
        break
      }

      case 'forest': {
        // Leaf rustle + bird chirps with pitch movement.
        const rustle = mid * 0.25 + high * 0.1
        const breeze = low * 0.4 * (0.6 + 0.4 * Math.sin(2 * Math.PI * 0.11 * t))
        const chirpWindow = (t % 3.7)
        let birds = 0
        if (chirpWindow > 0.25 && chirpWindow < 0.65) {
          const chirpEnv = envelopePulse(chirpWindow, 0.42, 0.2)
          birdPhase += (1500 + 700 * Math.sin(chirpWindow * 18)) / SAMPLE_RATE
          birds = Math.sin(2 * Math.PI * birdPhase) * chirpEnv * 0.22
        }
        value = rustle + breeze + birds
        break
      }

      case 'cafe': {
        // Low room hum + soft conversation-like vowel movement + rare cup clinks.
        const room = low * 0.55 + brown * 0.35
        const babble =
          Math.sin(2 * Math.PI * 115 * t + Math.sin(t * 3.1) * 2) * 0.06 +
          Math.sin(2 * Math.PI * 170 * t + Math.sin(t * 2.2) * 1.5) * 0.04 +
          Math.sin(2 * Math.PI * 235 * t + Math.sin(t * 4.3) * 1.2) * 0.03
        const clink = Math.random() > 0.9992 ? Math.sin(2 * Math.PI * 1200 * t) * 0.35 : 0
        value = room * 0.55 + babble + clink
        break
      }

      case 'ocean': {
        // Slow swelling waves with low undertow and white foam at wave peaks.
        const swell = 0.25 + 0.75 * Math.pow((Math.sin(2 * Math.PI * 0.13 * t) + 1) / 2, 2)
        const secondSwell = 0.35 + 0.65 * ((Math.sin(2 * Math.PI * 0.07 * t + 1.6) + 1) / 2)
        const foam = Math.max(0, high) * swell * 0.5
        const undertow = brown * 0.5 + low * 0.35
        value = undertow * secondSwell + foam
        break
      }

      case 'wind': {
        // Hollow gusts with airy high movement, less watery than ocean.
        const gust = 0.15 + 0.85 * Math.pow((Math.sin(2 * Math.PI * 0.09 * t + Math.sin(t * 0.45)) + 1) / 2, 2)
        const whistle = Math.sin(2 * Math.PI * (520 + 90 * Math.sin(t * 1.3)) * t) * 0.035 * gust
        value = (mid * 0.45 + high * 0.18 + low * 0.28) * gust + whistle
        break
      }
    }

    // Soft fade-in/out to avoid clicks when the loop restarts.
    const fade = Math.min(1, i / (SAMPLE_RATE * 0.08), (length - i) / (SAMPLE_RATE * 0.08))
    samples[i] = value * fade
  }

  let peak = 0
  for (const sample of samples) peak = Math.max(peak, Math.abs(sample))
  const target = id === 'white' ? 0.5 : 0.75
  const normalizer = peak > 0 ? target / peak : 1
  for (let i = 0; i < samples.length; i++) samples[i] = clampSample(samples[i] * normalizer)

  return samples
}

function writeAscii(view: DataView, offset: number, text: string) {
  for (let i = 0; i < text.length; i++) view.setUint8(offset + i, text.charCodeAt(i))
}

function makeWavUrl(id: SoundId) {
  const cached = SOUND_URLS.get(id)
  if (cached) return cached

  const samples = makeSoundSamples(id)
  const bytesPerSample = 2
  const blockAlign = 1 * bytesPerSample
  const buffer = new ArrayBuffer(44 + samples.length * bytesPerSample)
  const view = new DataView(buffer)

  writeAscii(view, 0, 'RIFF')
  view.setUint32(4, 36 + samples.length * bytesPerSample, true)
  writeAscii(view, 8, 'WAVE')
  writeAscii(view, 12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, 1, true)
  view.setUint32(24, SAMPLE_RATE, true)
  view.setUint32(28, SAMPLE_RATE * blockAlign, true)
  view.setUint16(32, blockAlign, true)
  view.setUint16(34, 16, true)
  writeAscii(view, 36, 'data')
  view.setUint32(40, samples.length * bytesPerSample, true)

  let offset = 44
  for (const sample of samples) {
    view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true)
    offset += 2
  }

  const url = URL.createObjectURL(new Blob([buffer], { type: 'audio/wav' }))
  SOUND_URLS.set(id, url)
  return url
}

export function AmbientNoise() {
  const { lang } = useStore()
  const isAr = lang === 'ar'
  const [open, setOpen]       = useState(false)
  const [playing, setPlaying] = useState<SoundId | null>(null)
  const [volume, setVolume]   = useState(0.4)
  const [audioError, setAudioError] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
      audioRef.current.src = ''
      audioRef.current.load()
      audioRef.current = null
    }
    setPlaying(null)
  }, [])

  const play = useCallback(async (id: SoundId) => {
    if (playing === id) { stop(); return }

    setAudioError(null)
    stop()

    try {
      const audio = new Audio(makeWavUrl(id))
      audio.loop = true
      audio.volume = volume
      audio.preload = 'auto'
      audioRef.current = audio
      await audio.play()
      setPlaying(id)
    } catch (error) {
      console.error('Failed to start ambient audio', error)
      audioRef.current = null
      setPlaying(null)
      setAudioError(isAr
        ? 'تعذر تشغيل الصوت. اضغط مرة أخرى، وتأكد أن صوت الموقع أو المتصفح غير مكتوم.'
        : 'Could not start audio. Tap again and make sure the site or browser tab is not muted.')
    }
  }, [isAr, playing, volume, stop])

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume
  }, [volume])

  useEffect(() => () => {
    stop()
    SOUND_URLS.forEach(url => URL.revokeObjectURL(url))
    SOUND_URLS.clear()
  }, [stop])

  return (
    <div className="relative">
      <motion.button whileTap={{ scale: 0.9 }} onClick={() => setOpen(v => !v)}
        className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all',
          playing
            ? 'bg-teal-500/20 border-teal-500/40 text-teal-400'
            : 'bg-muted/50 border-border/50 text-muted-foreground hover:text-foreground')}>
        <Music2 className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">{playing ? (isAr ? 'يعزف' : 'Playing') : (isAr ? 'أصوات' : 'Sounds')}</span>
        {playing && <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />}
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: 6, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.95 }}
            className="absolute top-full mt-2 end-0 z-50 w-72 bg-card rounded-2xl border border-border shadow-xl p-4 space-y-4">

            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold">{isAr ? '🎵 أصوات التركيز' : '🎵 Focus Sounds'}</p>
              <button onClick={() => setOpen(false)} className="p-1 rounded-lg text-muted-foreground hover:text-foreground">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {SOUNDS.map(s => (
                <motion.button key={s.id} whileTap={{ scale: 0.93 }} onClick={() => void play(s.id)}
                  className={cn('flex flex-col items-center gap-1.5 py-3 rounded-xl border text-xs font-medium transition-all',
                    playing === s.id
                      ? 'border-primary/60 bg-primary/10 text-primary'
                      : 'border-border/50 bg-muted/30 text-muted-foreground hover:text-foreground hover:bg-muted/60')}>
                  <span className="text-xl leading-none">{s.emoji}</span>
                  <span className="text-[11px]">{isAr ? s.labelAr : s.labelEn}</span>
                  {playing === s.id && (
                    <div className="flex gap-0.5 items-end h-2.5">
                      {[1,2,3].map(i => (
                        <motion.div key={i} className="w-0.5 rounded-full bg-primary"
                          animate={{ height: ['4px','10px','4px'] }}
                          transition={{ duration: 0.7, repeat: Infinity, delay: i * 0.15 }} />
                      ))}
                    </div>
                  )}
                </motion.button>
              ))}
            </div>

            {audioError && (
              <p className="text-[11px] leading-relaxed text-destructive bg-destructive/10 border border-destructive/20 rounded-xl p-2">
                {audioError}
              </p>
            )}

            {playing && (
              <div className="space-y-2 pt-1 border-t border-border/40">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <VolumeX className="w-3.5 h-3.5" />
                  <span className="font-medium text-foreground">{Math.round(volume * 100)}%</span>
                  <Volume2 className="w-3.5 h-3.5" />
                </div>
                <input type="range" min={0.05} max={1} step={0.05} value={volume}
                  onChange={e => setVolume(Number(e.target.value))}
                  className="w-full accent-teal-500 cursor-pointer" />
                <button onClick={stop}
                  className="w-full py-2 rounded-xl bg-muted/60 text-muted-foreground text-xs font-medium hover:bg-destructive/10 hover:text-destructive transition-colors">
                  {isAr ? '⏹ إيقاف' : '⏹ Stop'}
                </button>
              </div>
            )}

            {!playing && (
              <p className="text-[10px] text-muted-foreground text-center">
                {isAr ? 'اختر صوتاً لتبدأ جلسة التركيز' : 'Pick a sound to start your focus session'}
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
