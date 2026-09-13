import { cn } from '@/lib/utils'

export function Skeleton({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div
      className={cn('animate-pulse rounded-md', className)}
      style={{ background: 'var(--border)', ...style }}
      aria-hidden="true"
    />
  )
}

export function StatCardSkeleton() {
  return (
    <div className="stat-card" aria-busy="true">
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <Skeleton style={{ width: 70, height: 10 }} />
          <Skeleton style={{ width: 40, height: 28 }} />
          <Skeleton style={{ width: 80, height: 10 }} />
        </div>
        <Skeleton style={{ width: 34, height: 34, borderRadius: 'var(--radius-sm)' }} />
      </div>
    </div>
  )
}

export function WidgetSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="widget" aria-busy="true">
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
        <Skeleton style={{ width: 110, height: 14 }} />
        <Skeleton style={{ width: 60, height: 14 }} />
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderBottom: i < rows - 1 ? '1px solid var(--border)' : 'none' }}>
          <Skeleton style={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0 }} />
          <Skeleton style={{ flex: 1, height: 12 }} />
          <Skeleton style={{ width: 50, height: 12 }} />
        </div>
      ))}
    </div>
  )
}

export function ChatMessageSkeleton({ fromUser = false }: { fromUser?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, marginBottom: 16, flexDirection: fromUser ? 'row-reverse' : 'row' }} aria-hidden="true">
      <Skeleton style={{ width: 28, height: 28, borderRadius: 9, flexShrink: 0 }} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxWidth: '60%' }}>
        <Skeleton style={{ width: 200, height: 14 }} />
        <Skeleton style={{ width: 150, height: 14 }} />
        <Skeleton style={{ width: 100, height: 14 }} />
      </div>
    </div>
  )
}

export function ExamPillSkeleton() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', borderRadius: 'var(--radius-md)', background: 'var(--bg)', marginBottom: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <Skeleton style={{ width: 8, height: 8, borderRadius: '50%' }} />
        <Skeleton style={{ width: 120, height: 12 }} />
      </div>
      <Skeleton style={{ width: 60, height: 12 }} />
    </div>
  )
}
