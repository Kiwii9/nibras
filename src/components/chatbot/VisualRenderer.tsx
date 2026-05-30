import { useState } from 'react'
import { motion } from 'framer-motion'
import { Download, RefreshCw } from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────
interface MindMapData  { center: string; branches: { label: string; children: string[] }[] }
interface TimelineData { title: string; events: { year: string; label: string; detail: string }[] }
interface TableData    { title: string; headers: string[]; rows: string[][] }
interface DiagramData  { title: string; steps: { id: number; label: string; detail: string }[]; connections: number[][] }

type VisualType = 'mindmap' | 'timeline' | 'table' | 'diagram'
interface VisualRendererProps { type: VisualType; data: any; isAr?: boolean }

// ─── Mind Map SVG ─────────────────────────────────────────────────────────────
function MindMapSVG({ data }: { data: MindMapData }) {
  const W = 700, H = 480, cx = W / 2, cy = H / 2
  const branches = data.branches || []
  const angleStep = (Math.PI * 2) / branches.length
  const branchR = 160, childR = 250

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-h-96" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="cg"><stop offset="0%" stopColor="#3E9AA6"/><stop offset="100%" stopColor="#1A4D53"/></radialGradient>
      </defs>
      {/* Center */}
      <ellipse cx={cx} cy={cy} rx={68} ry={34} fill="url(#cg)" opacity="0.95"/>
      <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle" fill="white" fontSize="13" fontWeight="bold" fontFamily="sans-serif">
        {data.center}
      </text>

      {branches.map((b, i) => {
        const a = angleStep * i - Math.PI / 2
        const bx = cx + Math.cos(a) * branchR
        const by = cy + Math.sin(a) * branchR
        const color = ['#3E9AA6','#C9A84C','#56A86B','#4A90D9','#A855F7','#EF4444'][i % 6]

        return (
          <g key={i}>
            {/* Branch line */}
            <line x1={cx + Math.cos(a)*68} y1={cy + Math.sin(a)*34} x2={bx} y2={by} stroke={color} strokeWidth="2" opacity="0.7"/>
            {/* Branch node */}
            <ellipse cx={bx} cy={by} rx={52} ry={22} fill={color} opacity="0.2" stroke={color} strokeWidth="1.5"/>
            <text x={bx} y={by} textAnchor="middle" dominantBaseline="middle" fill={color} fontSize="11" fontWeight="600" fontFamily="sans-serif">
              {b.label}
            </text>
            {/* Children */}
            {(b.children || []).map((child, j) => {
              const childCount = b.children.length
              const spread = 0.45
              const ca = a + (j - (childCount - 1) / 2) * spread
              const childX = cx + Math.cos(ca) * childR
              const childY = cy + Math.sin(ca) * childR
              return (
                <g key={j}>
                  <line x1={bx} y1={by} x2={childX} y2={childY} stroke={color} strokeWidth="1" strokeDasharray="4 3" opacity="0.5"/>
                  <rect x={childX - 44} y={childY - 13} width="88" height="26" rx="13" fill={color} opacity="0.1" stroke={color} strokeWidth="1"/>
                  <text x={childX} y={childY} textAnchor="middle" dominantBaseline="middle" fill={color} fontSize="9.5" fontFamily="sans-serif">
                    {child}
                  </text>
                </g>
              )
            })}
          </g>
        )
      })}
    </svg>
  )
}

// ─── Timeline SVG ─────────────────────────────────────────────────────────────
function TimelineSVG({ data }: { data: TimelineData }) {
  const events = data.events || []
  const W = 680, itemH = 72, H = events.length * itemH + 60
  const lx = 100

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" xmlns="http://www.w3.org/2000/svg">
      <line x1={lx} y1={30} x2={lx} y2={H - 20} stroke="#2D7A84" strokeWidth="2" opacity="0.4"/>
      {events.map((e, i) => {
        const y = 30 + i * itemH + itemH / 2
        const color = i % 2 === 0 ? '#3E9AA6' : '#C9A84C'
        return (
          <g key={i}>
            <circle cx={lx} cy={y} r="8" fill={color} opacity="0.9"/>
            <rect x={lx + 20} y={y - 22} width={W - lx - 30} height="44" rx="8" fill={color} opacity="0.08" stroke={color} strokeWidth="1"/>
            <text x={lx + 34} y={y - 6} fill={color} fontSize="11" fontWeight="700" fontFamily="sans-serif">{e.year}</text>
            <text x={lx + 34} y={y + 10} fill="currentColor" fontSize="12" fontFamily="sans-serif" opacity="0.85">{e.label}</text>
            {e.detail && <text x={lx + 34} y={y + 24} fill="currentColor" fontSize="9.5" fontFamily="sans-serif" opacity="0.5">{e.detail.slice(0,60)}</text>}
          </g>
        )
      })}
    </svg>
  )
}

// ─── Comparison Table ─────────────────────────────────────────────────────────
function ComparisonTable({ data }: { data: TableData }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border/50">
      {data.title && <p className="text-xs font-semibold text-primary px-4 py-2 border-b border-border/30 bg-primary/5">{data.title}</p>}
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-muted/50">
            {(data.headers || []).map((h, i) => (
              <th key={i} className="px-4 py-2.5 text-start font-semibold text-foreground border-b border-border/30">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {(data.rows || []).map((row, i) => (
            <tr key={i} className={i % 2 === 0 ? 'bg-transparent' : 'bg-muted/20'}>
              {row.map((cell, j) => (
                <td key={j} className="px-4 py-2 text-muted-foreground border-b border-border/20">{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ─── Flowchart / Diagram SVG ──────────────────────────────────────────────────
function DiagramSVG({ data }: { data: DiagramData }) {
  const steps = data.steps || []
  const W = 680, boxW = 200, boxH = 52, gapY = 88
  const H = steps.length * gapY + 40

  const positions: Record<number, { x: number; y: number }> = {}
  steps.forEach((s, i) => {
    const col = i % 2 === 0 ? 0 : 1
    const row = Math.floor(i / 2)
    positions[s.id] = { x: col === 0 ? 60 : 420, y: 30 + row * gapY }
  })

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" xmlns="http://www.w3.org/2000/svg">
      {/* Connections */}
      {(data.connections || []).map(([from, to], i) => {
        const a = positions[from], b = positions[to]
        if (!a || !b) return null
        const ax = a.x + boxW / 2, ay = a.y + boxH
        const bx = b.x + boxW / 2, by = b.y
        return <path key={i} d={`M${ax},${ay} C${ax},${(ay+by)/2} ${bx},${(ay+by)/2} ${bx},${by}`} fill="none" stroke="#3E9AA6" strokeWidth="1.5" strokeDasharray="5 3" opacity="0.5" markerEnd="url(#arr)"/>
      })}
      <defs>
        <marker id="arr" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto">
          <path d="M0,0 L8,4 L0,8 Z" fill="#3E9AA6" opacity="0.6"/>
        </marker>
      </defs>
      {/* Steps */}
      {steps.map((s, i) => {
        const pos = positions[s.id]
        if (!pos) return null
        const color = ['#3E9AA6','#C9A84C','#56A86B','#4A90D9','#A855F7','#EF4444'][i % 6]
        return (
          <g key={s.id}>
            <rect x={pos.x} y={pos.y} width={boxW} height={boxH} rx="10" fill={color} opacity="0.12" stroke={color} strokeWidth="1.5"/>
            <circle cx={pos.x + 20} cy={pos.y + boxH/2} r="11" fill={color} opacity="0.8"/>
            <text x={pos.x + 20} y={pos.y + boxH/2} textAnchor="middle" dominantBaseline="middle" fill="white" fontSize="10" fontWeight="bold" fontFamily="sans-serif">{s.id}</text>
            <text x={pos.x + 38} y={pos.y + 19} fill={color} fontSize="11" fontWeight="600" fontFamily="sans-serif">{s.label.slice(0,22)}</text>
            {s.detail && <text x={pos.x + 38} y={pos.y + 34} fill="currentColor" fontSize="9" fontFamily="sans-serif" opacity="0.55">{s.detail.slice(0,26)}</text>}
          </g>
        )
      })}
    </svg>
  )
}

// ─── Main Visual Renderer ──────────────────────────────────────────────────────
export function VisualRenderer({ type, data, isAr }: VisualRendererProps) {
  const [expanded, setExpanded] = useState(true)

  const typeLabels: Record<VisualType, string> = {
    mindmap:  isAr ? '🧠 خريطة ذهنية' : '🧠 Mind Map',
    timeline: isAr ? '📅 جدول زمني'   : '📅 Timeline',
    table:    isAr ? '📊 جدول مقارنة' : '📊 Comparison Table',
    diagram:  isAr ? '🔄 مخطط انسيابي': '🔄 Flowchart',
  }

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className="my-3 rounded-2xl border border-primary/20 bg-primary/5 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-primary/10">
        <span className="text-xs font-semibold text-primary">{typeLabels[type]}</span>
        <div className="flex gap-2">
          <button onClick={() => setExpanded(v => !v)}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-lg hover:bg-muted/50">
            {expanded ? (isAr ? 'طيّ' : 'Collapse') : (isAr ? 'توسيع' : 'Expand')}
          </button>
        </div>
      </div>
      {expanded && (
        <div className="p-4">
          {type === 'mindmap'  && <MindMapSVG  data={data} />}
          {type === 'timeline' && <TimelineSVG data={data} />}
          {type === 'table'    && <ComparisonTable data={data} />}
          {type === 'diagram'  && <DiagramSVG  data={data} />}
        </div>
      )}
    </motion.div>
  )
}
