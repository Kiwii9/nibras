import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Volume2, VolumeX, X, Music2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useStore } from '@/store'

type SoundId = 'white' | 'rain' | 'bonfire' | 'forest' | 'cafe' | 'ocean' | 'wind'
type AudioContextConstructor = new () => AudioContext

const SOUNDS: { id: SoundId; emoji: string; labelAr: string; labelEn: string; color: string }[] = [
  { id: 'white',   emoji: '📻', labelAr: 'ضوضاء',     labelEn: 'White',     color: '#9CA3AF' },
  { id: 'rain',    emoji: '🌧️', labelAr: 'مطر',       labelEn: 'Rain',      color: '#4A90D9' },
  { id: 'bonfire', emoji: '🔥', labelAr: 'نار',        labelEn: 'Bonfire',   color: '#E8622A' },
  { id: 'forest',  emoji: '🌿', labelAr: 'غابة',       labelEn: 'Forest',    color: '#56A86B' },
  { id: 'cafe',    emoji: '☕', labelAr: 'مقهى',       labelEn: 'Café',      color: '#C9A84C' },
  { id: 'ocean',   emoji: '🌊', labelAr: 'أمواج',      labelEn: 'Ocean',     color: '#3E9AA6' },
  { id: 'wind',    emoji: '🍃', labelAr: 'نسيم',       labelEn: 'Wind',      color: '#8B9DC3' },
]

const getAudioContextConstructor = (): AudioContextConstructor => {
  const audioWindow = window as Window & typeof globalThis & { webkitAudioContext?: AudioContextConstructor }
  const AudioContextCtor = audioWindow.AudioContext ?? audioWindow.webkitAudioContext

  if (!AudioContextCtor) {
    throw new Error('Web Audio is not supported in this browser')
  }

  return AudioContextCtor
}

// ─── Sound engine — synthesizes realistic ambient audio ───────────────────────
class AmbientEngine {
  ctx: AudioContext
  master: GainNode
  nodes: AudioNode[] = []
  intervals: ReturnType<typeof setInterval>[] = []

  constructor() {
    const AudioContextCtor = getAudioContextConstructor()
    this.ctx = new AudioContextCtor()
    this.master = this.ctx.createGain()
    this.master.connect(this.ctx.destination)
  }

  async resume() {
    if (this.ctx.state === 'closed') throw new Error('Audio context is closed')
    if (this.ctx.state === 'suspended') await this.ctx.resume()
  }

  setVolume(v: number) { this.master.gain.setTargetAtTime(v, this.ctx.currentTime, 0.1) }

  private noise(type: 'white' | 'brown' | 'pink' = 'white', dur = 4) {
    const sr = this.ctx.sampleRate
    const buf = this.ctx.createBuffer(1, sr * dur, sr)
    const d = buf.getChannelData(0)
    if (type === 'brown') {
      let last = 0
      for (let i = 0; i < d.length; i++) {
        const w = Math.random() * 2 - 1
        d[i] = (last + 0.02 * w) / 1.02 * 3.5
        last = d[i]
      }
    } else if (type === 'pink') {
      let b = [0,0,0,0,0,0,0]
      for (let i = 0; i < d.length; i++) {
        const w = Math.random()*2-1
        b[0]=0.99886*b[0]+w*0.0555179; b[1]=0.99332*b[1]+w*0.0750759
        b[2]=0.96900*b[2]+w*0.1538520; b[3]=0.86650*b[3]+w*0.3104856
        b[4]=0.55000*b[4]+w*0.5329522; b[5]=-0.7616*b[5]-w*0.0168980
        d[i]=(b[0]+b[1]+b[2]+b[3]+b[4]+b[5]+b[6]+w*0.5362)*0.11; b[6]=w*0.115926
      }
    } else {
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
    }
    const src = this.ctx.createBufferSource()
    src.buffer = buf; src.loop = true
    return src
  }

  private filter(type: BiquadFilterType, freq: number, Q = 1) {
    const f = this.ctx.createBiquadFilter()
    f.type = type; f.frequency.value = freq; f.Q.value = Q
    return f
  }

  private gain(val: number) {
    const g = this.ctx.createGain(); g.gain.value = val; return g
  }

  private lfo(rate: number, depth: number, target: AudioParam) {
    const osc = this.ctx.createOscillator()
    const g = this.ctx.createGain()
    osc.frequency.value = rate
    g.gain.value = depth
    osc.connect(g); g.connect(target)
    osc.start(); this.nodes.push(osc, g)
  }

  // 📻 White noise — simple steady focus noise for regular daily use
  buildWhite() {
    const body = this.noise('white')
    const hp = this.filter('highpass', 80)
    const lp = this.filter('lowpass', 12000)
    const gBody = this.gain(0.16)
    body.connect(hp); hp.connect(lp); lp.connect(gBody); gBody.connect(this.master)
    body.start(); this.nodes.push(body, hp, lp, gBody)
  }

  // 🌧️ Rain — layered filtered noise + random drip tones
  buildRain() {
    // Heavy rain body
    const body = this.noise('white')
    const lp = this.filter('lowpass', 1800, 0.8)
    const hp = this.filter('highpass', 400)
    const gBody = this.gain(0.55)
    body.connect(hp); hp.connect(lp); lp.connect(gBody); gBody.connect(this.master)
    body.start(); this.nodes.push(body, lp, hp, gBody)

    // Soft rumble layer
    const rumble = this.noise('brown')
    const rumbleF = this.filter('lowpass', 200)
    const gRumble = this.gain(0.18)
    rumble.connect(rumbleF); rumbleF.connect(gRumble); gRumble.connect(this.master)
    rumble.start(); this.nodes.push(rumble, rumbleF, gRumble)

    // Random drip sounds
    const drip = () => {
      const osc = this.ctx.createOscillator()
      const g = this.ctx.createGain()
      const freq = 800 + Math.random() * 600
      osc.type = 'sine'; osc.frequency.value = freq
      g.gain.setValueAtTime(0, this.ctx.currentTime)
      g.gain.linearRampToValueAtTime(0.04, this.ctx.currentTime + 0.01)
      g.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 0.15)
      osc.connect(g); g.connect(this.master)
      osc.start(); osc.stop(this.ctx.currentTime + 0.18)
    }
    const iv = setInterval(drip, 120 + Math.random() * 180)
    this.intervals.push(iv)
  }

  // 🔥 Bonfire — warm crackle + deep warmth
  buildBonfire() {
    // Deep warm bass
    const warmth = this.noise('brown')
    const warmF = this.filter('lowpass', 300, 0.5)
    const gWarm = this.gain(0.5)
    this.lfo(0.3, 0.1, gWarm.gain)
    warmth.connect(warmF); warmF.connect(gWarm); gWarm.connect(this.master)
    warmth.start(); this.nodes.push(warmth, warmF, gWarm)

    // Mid crackle hiss
    const hiss = this.noise('pink')
    const hissF = this.filter('bandpass', 2200, 2)
    const gHiss = this.gain(0.12)
    this.lfo(0.7, 0.06, gHiss.gain)
    hiss.connect(hissF); hissF.connect(gHiss); gHiss.connect(this.master)
    hiss.start(); this.nodes.push(hiss, hissF, gHiss)

    // Random sharp crackles
    const crackle = () => {
      const n = this.noise('white', 0.05)
      const f = this.filter('highpass', 1500)
      const g = this.gain(0)
      const t = this.ctx.currentTime
      g.gain.setValueAtTime(0, t)
      g.gain.linearRampToValueAtTime(0.15 + Math.random() * 0.1, t + 0.005)
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.08)
      n.connect(f); f.connect(g); g.connect(this.master)
      n.start(); n.stop(t + 0.1)
    }
    const iv = setInterval(crackle, 200 + Math.random() * 300)
    this.intervals.push(iv)
  }

  // 🌿 Forest — gentle wind + bird-like tones + rustle
  buildForest() {
    // Wind rustle
    const wind = this.noise('pink')
    const wf = this.filter('bandpass', 600, 0.4)
    const gWind = this.gain(0.22)
    this.lfo(0.15, 0.12, gWind.gain)
    wind.connect(wf); wf.connect(gWind); gWind.connect(this.master)
    wind.start(); this.nodes.push(wind, wf, gWind)

    // Deep forest ambience
    const deep = this.noise('brown')
    const df = this.filter('lowpass', 400)
    const gDeep = this.gain(0.15)
    deep.connect(df); df.connect(gDeep); gDeep.connect(this.master)
    deep.start(); this.nodes.push(deep, df, gDeep)

    // Occasional bird-like chirps
    const chirp = () => {
      if (Math.random() > 0.4) return
      const osc = this.ctx.createOscillator()
      const g = this.ctx.createGain()
      const baseF = 1800 + Math.random() * 1200
      osc.type = 'sine'
      osc.frequency.setValueAtTime(baseF, this.ctx.currentTime)
      osc.frequency.linearRampToValueAtTime(baseF * 1.3, this.ctx.currentTime + 0.08)
      osc.frequency.linearRampToValueAtTime(baseF, this.ctx.currentTime + 0.16)
      g.gain.setValueAtTime(0, this.ctx.currentTime)
      g.gain.linearRampToValueAtTime(0.04, this.ctx.currentTime + 0.03)
      g.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 0.22)
      osc.connect(g); g.connect(this.master)
      osc.start(); osc.stop(this.ctx.currentTime + 0.25)
    }
    const iv = setInterval(chirp, 800 + Math.random() * 1200)
    this.intervals.push(iv)
  }

  // ☕ Café — low murmur + occasional cup/page sounds
  buildCafe() {
    // Crowd murmur
    const murmur = this.noise('pink')
    const mf1 = this.filter('lowpass', 900)
    const mf2 = this.filter('highpass', 200)
    const gMur = this.gain(0.3)
    this.lfo(0.08, 0.06, gMur.gain)
    murmur.connect(mf1); mf1.connect(mf2); mf2.connect(gMur); gMur.connect(this.master)
    murmur.start(); this.nodes.push(murmur, mf1, mf2, gMur)

    // Warm background warmth
    const warm = this.noise('brown')
    const wf = this.filter('lowpass', 250)
    const gWarm = this.gain(0.1)
    warm.connect(wf); wf.connect(gWarm); gWarm.connect(this.master)
    warm.start(); this.nodes.push(warm, wf, gWarm)

    // Occasional soft cup/page tap
    const tap = () => {
      if (Math.random() > 0.35) return
      const osc = this.ctx.createOscillator()
      const g = this.ctx.createGain()
      osc.type = 'sine'; osc.frequency.value = 300 + Math.random() * 200
      g.gain.setValueAtTime(0, this.ctx.currentTime)
      g.gain.linearRampToValueAtTime(0.05, this.ctx.currentTime + 0.01)
      g.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 0.3)
      osc.connect(g); g.connect(this.master)
      osc.start(); osc.stop(this.ctx.currentTime + 0.35)
    }
    const iv = setInterval(tap, 2000 + Math.random() * 3000)
    this.intervals.push(iv)
  }

  // 🌊 Ocean — rhythmic wave swoosh
  buildOcean() {
    const wave = this.noise('pink')
    const wf = this.filter('bandpass', 500, 0.5)
    const gWave = this.gain(0.4)
    // LFO for wave rhythm ~8s period
    const lfo = this.ctx.createOscillator()
    const lfoG = this.ctx.createGain()
    lfo.frequency.value = 0.12
    lfoG.gain.value = 0.25
    lfo.connect(lfoG); lfoG.connect(gWave.gain)
    lfo.start(); this.nodes.push(lfo, lfoG)
    wave.connect(wf); wf.connect(gWave); gWave.connect(this.master)
    wave.start(); this.nodes.push(wave, wf, gWave)

    // Deep undertow
    const deep = this.noise('brown')
    const df = this.filter('lowpass', 180)
    const gDeep = this.gain(0.2)
    deep.connect(df); df.connect(gDeep); gDeep.connect(this.master)
    deep.start(); this.nodes.push(deep, df, gDeep)
  }

  // 🍃 Wind — open breeze through leaves
  buildWind() {
    const wind = this.noise('pink')
    const wf1 = this.filter('bandpass', 800, 0.3)
    const wf2 = this.filter('highpass', 300)
    const gWind = this.gain(0.35)
    this.lfo(0.1, 0.2, gWind.gain)
    this.lfo(0.23, 0.08, gWind.gain)
    wind.connect(wf1); wf1.connect(wf2); wf2.connect(gWind); gWind.connect(this.master)
    wind.start(); this.nodes.push(wind, wf1, wf2, gWind)

    // Leaf rustle bursts
    const rustle = this.noise('white')
    const rf = this.filter('bandpass', 3000, 2)
    const gRustle = this.gain(0.04)
    this.lfo(0.4, 0.03, gRustle.gain)
    rustle.connect(rf); rf.connect(gRustle); gRustle.connect(this.master)
    rustle.start(); this.nodes.push(rustle, rf, gRustle)
  }

  build(id: SoundId) {
    if (id === 'white')   this.buildWhite()
    if (id === 'rain')    this.buildRain()
    if (id === 'bonfire') this.buildBonfire()
    if (id === 'forest')  this.buildForest()
    if (id === 'cafe')    this.buildCafe()
    if (id === 'ocean')   this.buildOcean()
    if (id === 'wind')    this.buildWind()
  }

  destroy() {
    this.intervals.forEach(clearInterval)
    this.intervals = []
    this.nodes.forEach(n => { try { (n as AudioScheduledSourceNode).stop?.() } catch {} try { n.disconnect() } catch {} })
    this.nodes = []
    if (this.ctx.state !== 'closed') void this.ctx.close()
  }
}

// ─── Component ─────────────────────────────────────────────────────────────────
export function AmbientNoise() {
  const { lang } = useStore()
  const isAr = lang === 'ar'
  const [open, setOpen]       = useState(false)
  const [playing, setPlaying] = useState<SoundId | null>(null)
  const [volume, setVolume]   = useState(0.4)
  const [audioError, setAudioError] = useState<string | null>(null)
  const engineRef = useRef<AmbientEngine | null>(null)

  const stop = useCallback(() => {
    engineRef.current?.destroy()
    engineRef.current = null
    setPlaying(null)
  }, [])

  const play = useCallback(async (id: SoundId) => {
    if (playing === id) { stop(); return }

    setAudioError(null)
    stop()

    let eng: AmbientEngine | null = null
    try {
      eng = new AmbientEngine()
      await eng.resume()
      eng.setVolume(volume)
      eng.build(id)
      engineRef.current = eng
      setPlaying(id)
    } catch (error) {
      eng?.destroy()
      console.error('Failed to start ambient audio', error)
      setAudioError(isAr
        ? 'تعذر تشغيل الصوت. اضغط مرة أخرى، وتأكد أن صوت المتصفح غير مكتوم.'
        : 'Could not start audio. Tap again and make sure the browser tab is not muted.')
    }
  }, [isAr, playing, volume, stop])

  useEffect(() => {
    engineRef.current?.setVolume(volume)
  }, [volume])

  useEffect(() => () => stop(), [stop])

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
