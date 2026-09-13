import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Volume2, VolumeX, X, Music2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useStore } from '@/store'

type SoundId = 'rain' | 'bonfire' | 'forest' | 'cafe' | 'ocean' | 'wind'

const SOUNDS: { id: SoundId; label: string; labelAr: string; color: string }[] = [
  { id: 'rain',    label: 'Rain',    labelAr: 'مطر',    color: '#4A90D9' },
  { id: 'bonfire', label: 'Bonfire', labelAr: 'نار',    color: '#E8622A' },
  { id: 'forest',  label: 'Forest',  labelAr: 'غابة',   color: '#56A86B' },
  { id: 'cafe',    label: 'Cafe',    labelAr: 'مقهى',   color: '#C9A84C' },
  { id: 'ocean',   label: 'Ocean',   labelAr: 'امواج',  color: '#3E9AA6' },
  { id: 'wind',    label: 'Wind',    labelAr: 'نسيم',   color: '#8B9DC3' },
]

// Safe value clamps for Web Audio API
const safeFreq = (f: number) => Math.max(10, Math.min(20000, f))
const safeQ    = (q: number) => Math.max(0.001, Math.min(1000, q))
const safeGain = (g: number) => Math.max(0, Math.min(3, g))

class AmbientEngine {
  ctx: AudioContext
  master: GainNode
  nodes: AudioNode[] = []
  intervals: ReturnType<typeof setInterval>[] = []

  constructor() {
    this.ctx = new AudioContext()
    this.master = this.ctx.createGain()
    this.master.gain.value = 0.4
    this.master.connect(this.ctx.destination)
  }

  setVolume(v: number) {
    this.master.gain.setTargetAtTime(safeGain(v), this.ctx.currentTime, 0.1)
  }

  private noise(type: 'white' | 'brown' | 'pink' = 'white', dur = 4) {
    const sr = this.ctx.sampleRate
    const buf = this.ctx.createBuffer(1, sr * dur, sr)
    const d = buf.getChannelData(0)
    if (type === 'brown') {
      let last = 0
      for (let i = 0; i < d.length; i++) {
        const w = Math.random() * 2 - 1
        d[i] = (last + 0.02 * w) / 1.02
        last = d[i]
        d[i] = Math.max(-1, Math.min(1, d[i] * 3.5))
      }
    } else if (type === 'pink') {
      const b = [0, 0, 0, 0, 0, 0, 0]
      for (let i = 0; i < d.length; i++) {
        const w = Math.random() * 2 - 1
        b[0] = 0.99886 * b[0] + w * 0.0555179
        b[1] = 0.99332 * b[1] + w * 0.0750759
        b[2] = 0.96900 * b[2] + w * 0.1538520
        b[3] = 0.86650 * b[3] + w * 0.3104856
        b[4] = 0.55000 * b[4] + w * 0.5329522
        b[5] = -0.7616  * b[5] - w * 0.0168980
        d[i] = (b[0]+b[1]+b[2]+b[3]+b[4]+b[5]+b[6]+w*0.5362) * 0.11
        b[6] = w * 0.115926
        d[i] = Math.max(-1, Math.min(1, d[i]))
      }
    } else {
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
    }
    const src = this.ctx.createBufferSource()
    src.buffer = buf
    src.loop = true
    return src
  }

  private filter(type: BiquadFilterType, freq: number, Q = 1, gain = 0) {
    const f = this.ctx.createBiquadFilter()
    f.type = type
    f.frequency.value = safeFreq(freq)
    f.Q.value = safeQ(Q)
    if (gain !== 0) f.gain.value = gain
    return f
  }

  private gain(val: number) {
    const g = this.ctx.createGain()
    g.gain.value = safeGain(val)
    return g
  }

  // Slow LFO using setInterval instead of AudioParam automation (avoids instability)
  private slowLFO(targetNode: GainNode, center: number, depth: number, periodMs: number) {
    let t = Math.random() * Math.PI * 2
    const step = (2 * Math.PI * 50) / periodMs
    const iv = setInterval(() => {
      t += step
      const v = safeGain(center + depth * Math.sin(t))
      targetNode.gain.setTargetAtTime(v, this.ctx.currentTime, 0.5)
    }, 50)
    this.intervals.push(iv)
  }

  buildRain() {
    // Rain body - filtered white noise
    const body = this.noise('white')
    const hp = this.filter('highpass', 400, 0.5)
    const lp = this.filter('lowpass', 1800, 0.5)
    const gBody = this.gain(0.5)
    body.connect(hp); hp.connect(lp); lp.connect(gBody); gBody.connect(this.master)
    body.start()
    this.nodes.push(body, hp, lp, gBody)
    this.slowLFO(gBody, 0.5, 0.12, 8000)

    // Rumble layer
    const rumble = this.noise('brown')
    const rumbleF = this.filter('lowpass', 180, 0.5)
    const gRumble = this.gain(0.15)
    rumble.connect(rumbleF); rumbleF.connect(gRumble); gRumble.connect(this.master)
    rumble.start()
    this.nodes.push(rumble, rumbleF, gRumble)

    // Random drip tones - simple oscillators
    const drip = () => {
      if (!this.ctx || this.ctx.state === 'closed') return
      try {
        const osc = this.ctx.createOscillator()
        const g = this.ctx.createGain()
        const freq = 800 + Math.random() * 600
        osc.type = 'sine'
        osc.frequency.value = safeFreq(freq)
        const t = this.ctx.currentTime
        g.gain.setValueAtTime(0, t)
        g.gain.linearRampToValueAtTime(0.035, t + 0.015)
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.18)
        osc.connect(g); g.connect(this.master)
        osc.start(t); osc.stop(t + 0.2)
      } catch {}
    }
    this.intervals.push(setInterval(drip, 150 + Math.random() * 200))
  }

  buildBonfire() {
    // Warm bass
    const warm = this.noise('brown')
    const warmF = this.filter('lowpass', 280, 0.4)
    const gWarm = this.gain(0.45)
    warm.connect(warmF); warmF.connect(gWarm); gWarm.connect(this.master)
    warm.start()
    this.nodes.push(warm, warmF, gWarm)
    this.slowLFO(gWarm, 0.45, 0.1, 4000)

    // Mid crackle
    const hiss = this.noise('pink')
    const hissF = this.filter('bandpass', 2000, 1.5)
    const gHiss = this.gain(0.1)
    hiss.connect(hissF); hissF.connect(gHiss); gHiss.connect(this.master)
    hiss.start()
    this.nodes.push(hiss, hissF, gHiss)
    this.slowLFO(gHiss, 0.1, 0.04, 3000)

    // Sharp crackles
    const crackle = () => {
      if (!this.ctx || this.ctx.state === 'closed') return
      try {
        const bufSize = Math.floor(this.ctx.sampleRate * 0.04)
        const buf = this.ctx.createBuffer(1, bufSize, this.ctx.sampleRate)
        const d = buf.getChannelData(0)
        for (let i = 0; i < bufSize; i++) d[i] = Math.random() * 2 - 1
        const src = this.ctx.createBufferSource()
        src.buffer = buf
        const g = this.ctx.createGain()
        const t = this.ctx.currentTime
        g.gain.setValueAtTime(0, t)
        g.gain.linearRampToValueAtTime(0.08 + Math.random() * 0.08, t + 0.005)
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.06)
        src.connect(g); g.connect(this.master)
        src.start(t); src.stop(t + 0.07)
      } catch {}
    }
    this.intervals.push(setInterval(crackle, 250 + Math.random() * 400))
  }

  buildForest() {
    // Gentle wind
    const wind = this.noise('pink')
    const wf = this.filter('bandpass', 500, 0.3)
    const gWind = this.gain(0.2)
    wind.connect(wf); wf.connect(gWind); gWind.connect(this.master)
    wind.start()
    this.nodes.push(wind, wf, gWind)
    this.slowLFO(gWind, 0.2, 0.1, 12000)

    // Deep ambience
    const deep = this.noise('brown')
    const df = this.filter('lowpass', 350, 0.4)
    const gDeep = this.gain(0.12)
    deep.connect(df); df.connect(gDeep); gDeep.connect(this.master)
    deep.start()
    this.nodes.push(deep, df, gDeep)

    // Bird chirps
    const chirp = () => {
      if (Math.random() > 0.4 || !this.ctx || this.ctx.state === 'closed') return
      try {
        const osc = this.ctx.createOscillator()
        const g = this.ctx.createGain()
        const base = safeFreq(1800 + Math.random() * 1200)
        osc.type = 'sine'
        osc.frequency.value = base
        const t = this.ctx.currentTime
        osc.frequency.setValueAtTime(base, t)
        osc.frequency.linearRampToValueAtTime(safeFreq(base * 1.25), t + 0.1)
        osc.frequency.linearRampToValueAtTime(base, t + 0.2)
        g.gain.setValueAtTime(0, t)
        g.gain.linearRampToValueAtTime(0.035, t + 0.04)
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.25)
        osc.connect(g); g.connect(this.master)
        osc.start(t); osc.stop(t + 0.28)
      } catch {}
    }
    this.intervals.push(setInterval(chirp, 900 + Math.random() * 1500))
  }

  buildCafe() {
    // Crowd murmur
    const murmur = this.noise('pink')
    const mf1 = this.filter('lowpass', 800, 0.4)
    const mf2 = this.filter('highpass', 180, 0.4)
    const gMur = this.gain(0.28)
    murmur.connect(mf1); mf1.connect(mf2); mf2.connect(gMur); gMur.connect(this.master)
    murmur.start()
    this.nodes.push(murmur, mf1, mf2, gMur)
    this.slowLFO(gMur, 0.28, 0.06, 10000)

    // Background warmth
    const warm = this.noise('brown')
    const wf = this.filter('lowpass', 220, 0.4)
    const gWarm = this.gain(0.08)
    warm.connect(wf); wf.connect(gWarm); gWarm.connect(this.master)
    warm.start()
    this.nodes.push(warm, wf, gWarm)

    // Soft taps
    const tap = () => {
      if (Math.random() > 0.3 || !this.ctx || this.ctx.state === 'closed') return
      try {
        const osc = this.ctx.createOscillator()
        const g = this.ctx.createGain()
        osc.type = 'sine'
        osc.frequency.value = safeFreq(300 + Math.random() * 250)
        const t = this.ctx.currentTime
        g.gain.setValueAtTime(0, t)
        g.gain.linearRampToValueAtTime(0.04, t + 0.015)
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.35)
        osc.connect(g); g.connect(this.master)
        osc.start(t); osc.stop(t + 0.4)
      } catch {}
    }
    this.intervals.push(setInterval(tap, 2500 + Math.random() * 3500))
  }

  buildOcean() {
    // Wave body
    const wave = this.noise('pink')
    const wf = this.filter('bandpass', 400, 0.35)
    const gWave = this.gain(0.38)
    wave.connect(wf); wf.connect(gWave); gWave.connect(this.master)
    wave.start()
    this.nodes.push(wave, wf, gWave)
    // Slow wave rhythm ~8s
    this.slowLFO(gWave, 0.38, 0.22, 8000)

    // Deep undertow
    const deep = this.noise('brown')
    const df = this.filter('lowpass', 160, 0.4)
    const gDeep = this.gain(0.18)
    deep.connect(df); df.connect(gDeep); gDeep.connect(this.master)
    deep.start()
    this.nodes.push(deep, df, gDeep)
  }

  buildWind() {
    // Open breeze
    const wind = this.noise('pink')
    const wf1 = this.filter('bandpass', 700, 0.25)
    const wf2 = this.filter('highpass', 280, 0.4)
    const gWind = this.gain(0.32)
    wind.connect(wf1); wf1.connect(wf2); wf2.connect(gWind); gWind.connect(this.master)
    wind.start()
    this.nodes.push(wind, wf1, wf2, gWind)
    this.slowLFO(gWind, 0.32, 0.18, 9000)

    // Leaf rustle
    const rustle = this.noise('white')
    const rf = this.filter('highpass', 2500, 0.4)
    const gRustle = this.gain(0.04)
    rustle.connect(rf); rf.connect(gRustle); gRustle.connect(this.master)
    rustle.start()
    this.nodes.push(rustle, rf, gRustle)
    this.slowLFO(gRustle, 0.04, 0.025, 5000)
  }

  build(id: SoundId) {
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
    this.nodes.forEach(n => {
      try { (n as AudioScheduledSourceNode).stop?.() } catch {}
      try { n.disconnect() } catch {}
    })
    this.nodes = []
    try { this.ctx.close() } catch {}
  }
}

// Component
export function AmbientNoise() {
  const { lang } = useStore()
  const isAr = lang === 'ar'
  const [open, setOpen]       = useState(false)
  const [playing, setPlaying] = useState<SoundId | null>(null)
  const [volume, setVolume]   = useState(0.4)
  const engineRef = useRef<AmbientEngine | null>(null)

  const stop = useCallback(() => {
    engineRef.current?.destroy()
    engineRef.current = null
    setPlaying(null)
  }, [])

  const play = useCallback((id: SoundId) => {
    if (playing === id) { stop(); return }
    stop()
    const eng = new AmbientEngine()
    if (eng.ctx.state === 'suspended') eng.ctx.resume()
    eng.setVolume(volume)
    eng.build(id)
    engineRef.current = eng
    setPlaying(id)
  }, [playing, volume, stop])

  useEffect(() => {
    engineRef.current?.setVolume(volume)
  }, [volume])

  useEffect(() => () => stop(), [stop])

  const t = (ar: string, en: string) => isAr ? ar : en

  return (
    <div style={{ position: 'relative' }}>
      <motion.button whileTap={{ scale: 0.9 }} onClick={() => setOpen(v => !v)}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '5px 12px', borderRadius: 'var(--radius-full)',
          border: '1px solid var(--border)', fontSize: 12, fontWeight: 600,
          color: playing ? 'var(--primary)' : 'var(--text-muted)',
          background: playing ? 'rgba(62,154,166,0.1)' : 'transparent',
          transition: '.15s ease', cursor: 'pointer',
        }}>
        <Music2 size={13} />
        <span className="hidden sm:inline">{playing ? t('يعزف', 'Playing') : t('اصوات', 'Sounds')}</span>
        {playing && <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--primary)', animation: 'pulse 2s ease infinite', flexShrink: 0 }} />}
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.96 }}
            style={{
              position: 'absolute', top: 'calc(100% + 8px)',
              insetInlineEnd: 0, zIndex: 50, width: 260,
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius-lg)', padding: 16,
              boxShadow: 'var(--shadow-lg)',
            }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>
                {t('اصوات التركيز', 'Focus Sounds')}
              </p>
              <button onClick={() => setOpen(false)} style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}>
                <X size={14} />
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
              {SOUNDS.map(s => (
                <motion.button key={s.id} whileTap={{ scale: 0.94 }} onClick={() => play(s.id)}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                    padding: '12px 8px', borderRadius: 'var(--radius-md)',
                    border: `1px solid ${playing === s.id ? s.color + '60' : 'var(--border)'}`,
                    background: playing === s.id ? s.color + '15' : 'var(--bg)',
                    cursor: 'pointer', transition: '.15s ease',
                  }}>
                  <div style={{ width: 28, height: 28, borderRadius: 'var(--radius-sm)', background: s.color + '20', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: 14, color: s.color, fontWeight: 700 }}>{s.id.charAt(0).toUpperCase()}</span>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 600, color: playing === s.id ? s.color : 'var(--text-secondary)' }}>
                    {isAr ? s.labelAr : s.label}
                  </span>
                  {playing === s.id && (
                    <div style={{ display: 'flex', gap: 2, alignItems: 'flex-end', height: 10 }}>
                      {[1,2,3].map(i => (
                        <motion.div key={i} style={{ width: 2, borderRadius: 2, background: s.color }}
                          animate={{ height: ['4px','10px','4px'] }}
                          transition={{ duration: 0.7, repeat: Infinity, delay: i * 0.15 }} />
                      ))}
                    </div>
                  )}
                </motion.button>
              ))}
            </div>

            {playing && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 11, color: 'var(--text-muted)' }}>
                  <VolumeX size={12} />
                  <span>{Math.round(volume * 100)}%</span>
                  <Volume2 size={12} />
                </div>
                <input type="range" min={0.05} max={1} step={0.05} value={volume}
                  onChange={e => setVolume(Number(e.target.value))}
                  style={{ width: '100%', accentColor: 'var(--primary)', cursor: 'pointer', marginBottom: 10 }} />
                <button onClick={stop}
                  style={{
                    width: '100%', padding: '8px', borderRadius: 'var(--radius-md)',
                    background: 'var(--bg)', border: '1px solid var(--border)',
                    fontSize: 12, fontWeight: 600, color: 'var(--text-muted)',
                    cursor: 'pointer', transition: '.15s ease',
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--error)'; (e.currentTarget as HTMLElement).style.borderColor = 'var(--error)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)'; (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)' }}>
                  {t('ايقاف', 'Stop')}
                </button>
              </div>
            )}

            {!playing && (
              <p style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', marginTop: 4 }}>
                {t('اختر صوتا للبدء', 'Pick a sound to start')}
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
