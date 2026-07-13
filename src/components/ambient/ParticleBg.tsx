import { useEffect, useRef } from 'react'
import { useStore } from '@/store'

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  size: number
  opacity: number
  pulse: number
  pulseSpeed: number
}

interface NavigatorWithHints extends Navigator {
  deviceMemory?: number
  connection?: { saveData?: boolean; effectiveType?: string }
}

export function ParticleBg() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { theme } = useStore()
  const animationRef = useRef<number>(0)
  const particlesRef = useRef<Particle[]>([])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const context = canvas.getContext('2d', { alpha: true })
    if (!context) return

    const navigatorHints = navigator as NavigatorWithHints
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const saveData = navigatorHints.connection?.saveData === true
    const slowNetwork = ['slow-2g', '2g'].includes(navigatorHints.connection?.effectiveType ?? '')
    const lowMemory = (navigatorHints.deviceMemory ?? 8) <= 4
    const lowCpu = (navigator.hardwareConcurrency ?? 8) <= 4
    const lowEnd = saveData || slowNetwork || lowMemory || lowCpu

    if (reducedMotion || saveData) {
      canvas.hidden = true
      return
    }

    const particleCount = lowEnd ? 12 : 30
    const drawConnections = !lowEnd
    let running = true
    let lastFrame = 0
    const minimumFrameGap = lowEnd ? 1000 / 24 : 1000 / 45

    const resize = () => {
      const ratio = Math.min(window.devicePixelRatio || 1, lowEnd ? 1 : 1.5)
      canvas.width = Math.max(1, Math.floor(window.innerWidth * ratio))
      canvas.height = Math.max(1, Math.floor(window.innerHeight * ratio))
      canvas.style.width = `${window.innerWidth}px`
      canvas.style.height = `${window.innerHeight}px`
      context.setTransform(ratio, 0, 0, ratio, 0, 0)
    }

    resize()
    window.addEventListener('resize', resize, { passive: true })

    particlesRef.current = Array.from({ length: particleCount }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      vx: (Math.random() - 0.5) * 0.2,
      vy: (Math.random() - 0.5) * 0.2,
      size: Math.random() * 2 + 0.5,
      opacity: Math.random() * 0.25 + 0.04,
      pulse: Math.random() * Math.PI * 2,
      pulseSpeed: Math.random() * 0.01 + 0.003,
    }))

    const color = theme === 'dark' ? '98,184,194' : '45,122,132'

    const draw = (timestamp: number) => {
      if (!running) return
      if (timestamp - lastFrame < minimumFrameGap) {
        animationRef.current = requestAnimationFrame(draw)
        return
      }
      lastFrame = timestamp
      context.clearRect(0, 0, window.innerWidth, window.innerHeight)

      for (const particle of particlesRef.current) {
        particle.pulse += particle.pulseSpeed
        particle.x += particle.vx
        particle.y += particle.vy
        if (particle.x < 0) particle.x = window.innerWidth
        if (particle.x > window.innerWidth) particle.x = 0
        if (particle.y < 0) particle.y = window.innerHeight
        if (particle.y > window.innerHeight) particle.y = 0

        const opacity = particle.opacity * (0.75 + 0.25 * Math.sin(particle.pulse))
        context.beginPath()
        context.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2)
        context.fillStyle = `rgba(${color},${opacity})`
        context.fill()
      }

      if (drawConnections) {
        const particles = particlesRef.current
        for (let index = 0; index < particles.length; index++) {
          for (let otherIndex = index + 1; otherIndex < particles.length; otherIndex++) {
            const first = particles[index]
            const second = particles[otherIndex]
            const deltaX = first.x - second.x
            const deltaY = first.y - second.y
            const distanceSquared = deltaX * deltaX + deltaY * deltaY
            if (distanceSquared < 100 * 100) {
              const distance = Math.sqrt(distanceSquared)
              context.beginPath()
              context.moveTo(first.x, first.y)
              context.lineTo(second.x, second.y)
              context.strokeStyle = `rgba(${color},${0.045 * (1 - distance / 100)})`
              context.lineWidth = 0.5
              context.stroke()
            }
          }
        }
      }

      animationRef.current = requestAnimationFrame(draw)
    }

    const handleVisibility = () => {
      running = !document.hidden
      if (running) animationRef.current = requestAnimationFrame(draw)
      else cancelAnimationFrame(animationRef.current)
    }

    document.addEventListener('visibilitychange', handleVisibility)
    animationRef.current = requestAnimationFrame(draw)

    return () => {
      running = false
      cancelAnimationFrame(animationRef.current)
      window.removeEventListener('resize', resize)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [theme])

  return (
    <canvas ref={canvasRef}
      aria-hidden="true"
      className="fixed inset-0 pointer-events-none z-0"
      style={{ opacity: theme === 'dark' ? 0.5 : 0.28 }} />
  )
}
