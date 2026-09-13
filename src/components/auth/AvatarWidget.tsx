/**
 * AvatarWidget.tsx
 * Procedural SVG avatar with expression system wired to form state.
 * Expression API mirrors @bible-strong/avatar-react named presets.
 *
 * Expressions:
 *   idle         – neutral, slight blink cycle
 *   look-left    – pupils shift left  (name field)
 *   look-right   – pupils shift right (email field)
 *   look-down    – pupils shift down  (password field)
 *   eyes-covered – hands over eyes    (password focused)
 *   error        – brows down, frown
 *   success      – wide smile, star pupils
 *   mouse        – pupils follow eyeRotation prop
 */

import { useEffect, useRef, useState } from 'react'

// ── Types ───────────────────────────────────────────────────────────────────

export type AvatarExpression =
  | 'idle'
  | 'look-left'
  | 'look-right'
  | 'look-down'
  | 'eyes-covered'
  | 'error'
  | 'success'
  | 'mouse'

interface Props {
  expression: AvatarExpression
  /** Normalised mouse offset in -1..1 range, used when expression === 'mouse' */
  eyeTarget?: { x: number; y: number }
  size?: number
  className?: string
}

// ── Colour tokens (match Nibras brand) ────────────────────────────────────

const C = {
  skin:      '#2D7A84',  // em-500 – main body fill
  skinDark:  '#1A4D53',  // em-700 – shadow / deeper body
  skinLight: '#62B8C2',  // em-300 – highlight patches
  eye:       '#0B2428',  // em-900 – iris
  pupil:     '#EEF9FA',  // em-50  – pupil highlight
  brow:      '#0B2428',
  mouth:     '#0B2428',
  teeth:     '#EEF9FA',
  cheek:     'rgba(201,168,76,0.22)', // gold blush
  hand:      '#1A4D53',
  error:     '#EF4444',
  success:   '#C9A84C',
}

// ── Lerp helper ─────────────────────────────────────────────────────────────

function lerp(a: number, b: number, t: number) { return a + (b - a) * t }

// ── Per-expression pupil offsets ────────────────────────────────────────────

const PUPIL_OFFSET: Record<AvatarExpression, { px: number; py: number }> = {
  idle:          { px: 0,    py: 0   },
  'look-left':   { px: -8,   py: 2   },
  'look-right':  { px: 8,    py: 2   },
  'look-down':   { px: 0,    py: 9   },
  'eyes-covered':{ px: 0,    py: 0   },
  error:         { px: -3,   py: 4   },
  success:       { px: 0,    py: -3  },
  mouse:         { px: 0,    py: 0   }, // overridden at render
}

// ── Brow shapes per expression ───────────────────────────────────────────────

type BrowShape = { l: string; r: string }
const BROW: Record<AvatarExpression, BrowShape> = {
  idle:          { l: 'M 108 118 Q 122 112 136 118', r: 'M 164 118 Q 178 112 192 118' },
  'look-left':   { l: 'M 108 116 Q 122 110 136 116', r: 'M 164 116 Q 178 110 192 116' },
  'look-right':  { l: 'M 108 116 Q 122 110 136 116', r: 'M 164 116 Q 178 110 192 116' },
  'look-down':   { l: 'M 108 120 Q 122 114 136 120', r: 'M 164 120 Q 178 114 192 120' },
  'eyes-covered':{ l: 'M 108 120 Q 122 114 136 120', r: 'M 164 120 Q 178 114 192 120' },
  error:         { l: 'M 108 122 Q 122 114 136 118', r: 'M 164 118 Q 178 114 192 122' },
  success:       { l: 'M 108 112 Q 122 106 136 112', r: 'M 164 112 Q 178 106 192 112' },
  mouse:         { l: 'M 108 118 Q 122 112 136 118', r: 'M 164 118 Q 178 112 192 118' },
}

// ── Mouth shapes ─────────────────────────────────────────────────────────────

type MouthPath = string
const MOUTH: Record<AvatarExpression, MouthPath> = {
  idle:          'M 132 188 Q 150 198 168 188',
  'look-left':   'M 132 188 Q 150 198 168 188',
  'look-right':  'M 132 188 Q 150 198 168 188',
  'look-down':   'M 135 190 Q 150 196 165 190',
  'eyes-covered':'M 135 188 Q 150 194 165 188',
  error:         'M 132 196 Q 150 186 168 196',
  success:       'M 124 186 Q 150 210 176 186',
  mouse:         'M 132 188 Q 150 198 168 188',
}

// ── Eye open amount (0 = closed, 1 = wide open) ───────────────────────────

const EYE_OPEN: Record<AvatarExpression, number> = {
  idle: 1, 'look-left': 1, 'look-right': 1, 'look-down': 0.85,
  'eyes-covered': 0, error: 0.8, success: 1.25, mouse: 1,
}

// ── Animated state ───────────────────────────────────────────────────────────

interface EyeState {
  px: number; py: number // pupil x/y
  lBrow: string; rBrow: string
  mouth: string
  eyeOpen: number
  blinkT: number // 0–1 blink phase
}

function expressionToTarget(
  expr: AvatarExpression,
  eyeTarget: { x: number; y: number } | undefined,
): { px: number; py: number } {
  if (expr === 'mouse' && eyeTarget) {
    return {
      px: eyeTarget.x * 10, // max ±10 px
      py: eyeTarget.y * 7,
    }
  }
  return PUPIL_OFFSET[expr]
}

// ── Eye ball component ────────────────────────────────────────────────────────

interface EyeProps {
  cx: number; cy: number
  px: number; py: number // pupil offset
  eyeOpen: number
  blink: number
  isSuccess: boolean
}

function Eye({ cx, cy, px, py, eyeOpen, blink, isSuccess }: EyeProps) {
  const ry = 14 * eyeOpen * (1 - blink * 0.95)
  const rx = 14 + (eyeOpen - 1) * 4

  return (
    <g>
      {/* White of eye */}
      <ellipse cx={cx} cy={cy} rx={rx} ry={Math.max(ry, 0.5)} fill="#EEF9FA" />
      {/* Iris */}
      {ry > 1 && !isSuccess && (
        <ellipse
          cx={cx + px} cy={cy + py}
          rx={8} ry={Math.min(8, ry * 0.9)}
          fill={C.eye}
        />
      )}
      {/* Star pupils for success */}
      {ry > 1 && isSuccess && (
        <text
          x={cx + px} y={cy + py + 5}
          textAnchor="middle" fontSize={13}
          fill={C.success}
          style={{ fontFamily: 'sans-serif' }}
        >✦</text>
      )}
      {/* Catchlight */}
      {ry > 3 && (
        <ellipse cx={cx + px + 3} cy={cy + py - 3} rx={2.5} ry={2.5} fill={C.pupil} opacity={0.9} />
      )}
      {/* Eyelid top */}
      <ellipse cx={cx} cy={cy - ry * 0.4} rx={rx + 1} ry={ry * 0.35} fill={C.skin} />
    </g>
  )
}

// ── Main Avatar ───────────────────────────────────────────────────────────────

export function AvatarWidget({ expression, eyeTarget, size = 220, className = '' }: Props) {
  const [state, setState] = useState<EyeState>({
    px: 0, py: 0,
    lBrow: BROW.idle.l, rBrow: BROW.idle.r,
    mouth: MOUTH.idle,
    eyeOpen: 1,
    blinkT: 0,
  })

  const rafRef = useRef(0)
  const blinkTimerRef = useRef(0)
  const blinkRef = useRef(0)
  const blinkingRef = useRef(false)
  const currentRef = useRef<EyeState>(state)
  currentRef.current = state

  // Schedule random blinks
  useEffect(() => {
    function scheduleBlink() {
      const delay = 2500 + Math.random() * 3500
      blinkTimerRef.current = window.setTimeout(() => {
        blinkingRef.current = true
        blinkRef.current = 0
        scheduleBlink()
      }, delay)
    }
    scheduleBlink()
    return () => clearTimeout(blinkTimerRef.current)
  }, [])

  // Animation loop — lerp toward target expression
  useEffect(() => {
    const target = expressionToTarget(expression, eyeTarget)
    const targetBrow = BROW[expression]
    const targetMouth = MOUTH[expression]
    const targetOpen = EYE_OPEN[expression]

    let last = performance.now()

    function tick(now: number) {
      const dt = Math.min((now - last) / 1000, 0.05)
      last = now

      // Blink
      if (blinkingRef.current) {
        blinkRef.current += dt * 8 // full cycle in ~0.25s
        if (blinkRef.current >= Math.PI) {
          blinkRef.current = 0
          blinkingRef.current = false
        }
      }
      const blinkT = blinkingRef.current ? Math.sin(blinkRef.current) : 0

      setState(prev => ({
        px:      lerp(prev.px, target.px, dt * 6),
        py:      lerp(prev.py, target.py, dt * 6),
        // Brow paths are strings — just snap after delay (can't lerp SVG paths easily)
        lBrow:   targetBrow.l,
        rBrow:   targetBrow.r,
        mouth:   targetMouth,
        eyeOpen: lerp(prev.eyeOpen, targetOpen, dt * 5),
        blinkT,
      }))

      rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [expression, eyeTarget])

  const isSuccess  = expression === 'success'
  const isCovered  = expression === 'eyes-covered'
  const isError    = expression === 'error'

  const { px, py, lBrow, rBrow, mouth, eyeOpen, blinkT } = state

  return (
    <svg
      viewBox="0 0 300 300"
      width={size}
      height={size}
      className={className}
      style={{ overflow: 'visible' }}
      aria-hidden="true"
    >
      {/* ── Body blob ── */}
      <ellipse cx={150} cy={168} rx={108} ry={112} fill={C.skinDark} />
      <ellipse cx={150} cy={164} rx={104} ry={108} fill={C.skin} />

      {/* Highlight patch */}
      <ellipse cx={118} cy={138} rx={28} ry={20} fill={C.skinLight} opacity={0.35} />

      {/* Cheek blush */}
      <ellipse cx={106} cy={178} rx={18} ry={11} fill={C.cheek} />
      <ellipse cx={194} cy={178} rx={18} ry={11} fill={C.cheek} />

      {/* ── Eyes ── */}
      {!isCovered && (
        <>
          <Eye cx={122} cy={148} px={px} py={py} eyeOpen={eyeOpen} blink={blinkT} isSuccess={isSuccess} />
          <Eye cx={178} cy={148} px={px} py={py} eyeOpen={eyeOpen} blink={blinkT} isSuccess={isSuccess} />
        </>
      )}

      {/* ── Brows ── */}
      <path d={lBrow} stroke={isError ? C.error : C.brow} strokeWidth={3.5} strokeLinecap="round" fill="none"
        style={{ transition: 'stroke 0.2s' }} />
      <path d={rBrow} stroke={isError ? C.error : C.brow} strokeWidth={3.5} strokeLinecap="round" fill="none"
        style={{ transition: 'stroke 0.2s' }} />

      {/* ── Mouth ── */}
      {!isSuccess && (
        <path d={mouth} stroke={C.mouth} strokeWidth={3.5} strokeLinecap="round" fill="none" />
      )}
      {isSuccess && (
        <g>
          <path d={mouth} stroke={C.mouth} strokeWidth={3.5} strokeLinecap="round" fill={C.teeth} />
          <path d={mouth} stroke={C.mouth} strokeWidth={3.5} strokeLinecap="round" fill="none" />
        </g>
      )}

      {/* ── Hands over eyes (password mode) ── */}
      {isCovered && (
        <g>
          {/* Left hand */}
          <ellipse cx={118} cy={152} rx={30} ry={22} fill={C.hand} />
          <ellipse cx={105} cy={143} rx={9}  ry={11} fill={C.hand} />
          <ellipse cx={115} cy={138} rx={9}  ry={12} fill={C.hand} />
          <ellipse cx={126} cy={137} rx={8}  ry={12} fill={C.hand} />
          <ellipse cx={136} cy={140} rx={7}  ry={10} fill={C.hand} />
          {/* Right hand */}
          <ellipse cx={182} cy={152} rx={30} ry={22} fill={C.hand} />
          <ellipse cx={195} cy={143} rx={9}  ry={11} fill={C.hand} />
          <ellipse cx={185} cy={138} rx={9}  ry={12} fill={C.hand} />
          <ellipse cx={174} cy={137} rx={8}  ry={12} fill={C.hand} />
          <ellipse cx={164} cy={140} rx={7}  ry={10} fill={C.hand} />
          {/* Knuckle highlights */}
          <ellipse cx={110} cy={146} rx={3} ry={2} fill={C.skinLight} opacity={0.5} />
          <ellipse cx={190} cy={146} rx={3} ry={2} fill={C.skinLight} opacity={0.5} />
        </g>
      )}

      {/* ── Error X marks on eyes ── */}
      {isError && !isCovered && (
        <g opacity={0.6}>
          <line x1={113} y1={140} x2={131} y2={156} stroke={C.error} strokeWidth={2.5} strokeLinecap="round" />
          <line x1={131} y1={140} x2={113} y2={156} stroke={C.error} strokeWidth={2.5} strokeLinecap="round" />
          <line x1={169} y1={140} x2={187} y2={156} stroke={C.error} strokeWidth={2.5} strokeLinecap="round" />
          <line x1={187} y1={140} x2={169} y2={156} stroke={C.error} strokeWidth={2.5} strokeLinecap="round" />
        </g>
      )}

      {/* ── Success sparkles ── */}
      {isSuccess && (
        <g fill={C.success}>
          <circle cx={85}  cy={110} r={4} opacity={0.8} />
          <circle cx={76}  cy={125} r={2.5} opacity={0.6} />
          <circle cx={215} cy={108} r={4} opacity={0.8} />
          <circle cx={224} cy={124} r={2.5} opacity={0.6} />
          <circle cx={150} cy={78}  r={5} opacity={0.9} />
          <circle cx={136} cy={88}  r={2} opacity={0.5} />
          <circle cx={164} cy={86}  r={2} opacity={0.5} />
        </g>
      )}
    </svg>
  )
}
