import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  CalendarCheck, Plus, Trash2, Edit3, MapPin, Hash,
  Clock, X, CheckCircle, AlertCircle, Calendar
} from 'lucide-react'
import { useStore, Exam } from '@/store'
import { useT } from '@/hooks/useT'
import { cn } from '@/lib/utils'

const EXAM_COLORS = [
  '#2D7A84', '#3E9AA6', '#1A4D53', '#C9A84C',
  '#4A90D9', '#7C5CBF', '#E05555', '#56A86B',
]

function getDaysLeft(date: string, time: string): { label: string; value: number; urgent: boolean } {
  const now = new Date()
  const exam = new Date(`${date}T${time || '00:00'}`)
  const diff = exam.getTime() - now.getTime()
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24))

  if (diff < 0) return { label: 'examPassed', value: -1, urgent: false }
  if (days === 0) return { label: 'today', value: 0, urgent: true }
  if (days === 1) return { label: 'tomorrow', value: 1, urgent: true }
  return { label: 'daysLeft', value: days, urgent: days <= 3 }
}

// ─── Exam Form ────────────────────────────────────────────────────────────────
function ExamForm({
  initial,
  onSave,
  onClose,
}: {
  initial?: Partial<Exam>
  onSave: (e: Omit<Exam, 'id'>) => void
  onClose: () => void
}) {
  const { t, isRTL } = useT()
  const [form, setForm] = useState<Omit<Exam, 'id'>>({
    subject: initial?.subject ?? '',
    date: initial?.date ?? '',
    time: initial?.time ?? '',
    location: initial?.location ?? '',
    seatCode: initial?.seatCode ?? '',
    notes: initial?.notes ?? '',
    color: initial?.color ?? EXAM_COLORS[0],
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validate = () => {
    const e: Record<string, string> = {}
    if (!form.subject.trim()) e.subject = 'Required'
    if (!form.date) e.date = 'Required'
    return e
  }

  const handleSubmit = () => {
    const e = validate()
    if (Object.keys(e).length) { setErrors(e); return }
    onSave(form)
  }

  const field = (key: keyof typeof form, label: string, props: any = {}) => (
    <div>
      <label className="block text-xs font-medium text-muted-foreground mb-1.5">{label}</label>
      <input
        value={form[key] as string}
        onChange={ev => { setForm(f => ({ ...f, [key]: ev.target.value })); setErrors(e => ({ ...e, [key]: '' })) }}
        className={cn(
          'w-full px-3 py-2.5 text-sm rounded-xl bg-muted border',
          errors[key] ? 'border-destructive' : 'border-border'
        )}
        dir="auto"
        {...props}
      />
      {errors[key] && <p className="text-xs text-destructive mt-1">{errors[key]}</p>}
    </div>
  )

  return (
    <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="relative z-10 w-full max-w-md glass-card rounded-2xl overflow-hidden shadow-teal-lg"
      >
        {/* Header strip with color */}
        <div className="h-1.5 w-full" style={{ background: form.color }} />

        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-xl">{initial?.subject ? t('edit') : t('addNewExam')}</h3>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground">
              <X className="w-4 h-4" />
            </button>
          </div>

          {field('subject', t('subject'), { placeholder: t('subjectPlaceholder') })}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">{t('examDate')}</label>
              <input type="date" value={form.date}
                onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                className="w-full px-3 py-2.5 text-sm rounded-xl bg-muted border border-border" />
              {errors.date && <p className="text-xs text-destructive mt-1">{errors.date}</p>}
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">{t('examTime')}</label>
              <input type="time" value={form.time}
                onChange={e => setForm(f => ({ ...f, time: e.target.value }))}
                className="w-full px-3 py-2.5 text-sm rounded-xl bg-muted border border-border" />
            </div>
          </div>

          {field('location', t('location'), { placeholder: t('locationPlaceholder') })}
          {field('seatCode', t('seatCode'), { placeholder: t('seatPlaceholder') })}

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">{t('notes')}</label>
            <textarea value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              rows={2} dir="auto"
              className="w-full px-3 py-2.5 text-sm rounded-xl bg-muted border border-border resize-none" />
          </div>

          {/* Color picker */}
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-2">Color Tag</label>
            <div className="flex gap-2 flex-wrap">
              {EXAM_COLORS.map(c => (
                <button key={c} onClick={() => setForm(f => ({ ...f, color: c }))}
                  className={cn('w-7 h-7 rounded-full border-2 transition-transform hover:scale-110',
                    form.color === c ? 'border-white scale-110 shadow-md' : 'border-transparent')}
                  style={{ background: c }} />
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-1">
            <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-xl border border-border/60 text-sm font-medium hover:bg-muted transition-colors">
              {t('cancel')}
            </button>
            <button onClick={handleSubmit} className="btn-teal flex-1 py-2.5">
              {t('save')}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ─── Exam Card ────────────────────────────────────────────────────────────────
function ExamCard({ exam, onEdit, onDelete }: { exam: Exam; onEdit: () => void; onDelete: () => void }) {
  const { t } = useT()
  const [confirmDelete, setConfirmDelete] = useState(false)
  const { label, value, urgent } = getDaysLeft(exam.date, exam.time)
  const passed = value === -1

  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20, height: 0 }}
      layout
      className={cn('glass-card rounded-2xl overflow-hidden transition-all', passed && 'opacity-60')}
    >
      {/* Color bar */}
      <div className="h-1" style={{ background: exam.color }} />

      <div className="p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <h3 className="font-semibold text-base" dir="auto">{exam.subject}</h3>
            {exam.notes && <p className="text-xs text-muted-foreground mt-0.5" dir="auto">{exam.notes}</p>}
          </div>
          {/* Countdown badge */}
          <div className={cn(
            'shrink-0 text-xs font-bold px-3 py-1.5 rounded-xl',
            passed ? 'bg-muted text-muted-foreground' :
            urgent ? 'bg-destructive/15 text-destructive animate-pulse-teal' :
            'text-white'
          )}
            style={!passed && !urgent ? { background: exam.color } : {}}>
            {label === 'examPassed' ? t('examPassed') :
             label === 'today' ? t('today') :
             label === 'tomorrow' ? t('tomorrow') :
             `${value} ${t('daysLeft')}`}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 shrink-0" style={{ color: exam.color }} />
            <span>{exam.date && new Date(exam.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 shrink-0" style={{ color: exam.color }} />
            <span>{exam.time || '—'}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 shrink-0" style={{ color: exam.color }} />
            <span className="truncate" dir="auto">{exam.location || '—'}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Hash className="w-3.5 h-3.5 shrink-0" style={{ color: exam.color }} />
            <span>{exam.seatCode || '—'}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 mt-4 pt-3 border-t border-border/40">
          <button onClick={onEdit}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-lg hover:bg-muted transition-colors">
            <Edit3 className="w-3.5 h-3.5" />{t('edit')}
          </button>
          {confirmDelete ? (
            <div className="flex gap-2 ms-auto">
              <button onClick={() => setConfirmDelete(false)} className="text-xs px-3 py-1.5 rounded-lg bg-muted hover:bg-muted/80 transition-colors">{t('cancel')}</button>
              <button onClick={onDelete} className="text-xs px-3 py-1.5 rounded-lg bg-destructive/15 text-destructive hover:bg-destructive/25 transition-colors">{t('delete')}</button>
            </div>
          ) : (
            <button onClick={() => setConfirmDelete(true)}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-destructive ms-auto px-3 py-1.5 rounded-lg hover:bg-destructive/10 transition-colors">
              <Trash2 className="w-3.5 h-3.5" />{t('delete')}
            </button>
          )}
        </div>
      </div>
    </motion.div>
  )
}

// ─── Main ExamTracker ─────────────────────────────────────────────────────────
export function ExamTracker() {
  const { t } = useT()
  const { exams, addExam, updateExam, deleteExam } = useStore()
  const [showForm, setShowForm] = useState(false)
  const [editingExam, setEditingExam] = useState<Exam | null>(null)
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'passed'>('upcoming')

  const filtered = exams.filter(e => {
    const { value } = getDaysLeft(e.date, e.time)
    if (filter === 'upcoming') return value >= 0
    if (filter === 'passed') return value === -1
    return true
  }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  const upcomingCount = exams.filter(e => getDaysLeft(e.date, e.time).value >= 0).length

  const handleSave = (data: Omit<Exam, 'id'>) => {
    if (editingExam) {
      updateExam(editingExam.id, data)
    } else {
      addExam({ ...data, id: `exam-${Date.now()}` })
    }
    setShowForm(false)
    setEditingExam(null)
  }

  return (
    <div className="section-wrapper space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl text-foreground">{t('examTracker')}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {upcomingCount} {t('upcomingExams')}
          </p>
        </div>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => { setEditingExam(null); setShowForm(true) }}
          className="btn-teal shrink-0"
        >
          <Plus className="w-4 h-4" />
          {t('addNewExam')}
        </motion.button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1.5 bg-muted/50 p-1 rounded-xl w-fit">
        {(['all', 'upcoming', 'passed'] as const).map(f => (
          <button key={f}
            onClick={() => setFilter(f)}
            className={cn(
              'px-4 py-1.5 rounded-lg text-sm font-medium transition-all capitalize',
              filter === f ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            )}>
            {f === 'all' ? 'All' : f === 'upcoming' ? t('upcomingExams') : t('examPassed')}
          </button>
        ))}
      </div>

      {/* Exam grid */}
      {filtered.length === 0 ? (
        <div className="glass-card rounded-2xl p-12 text-center">
          <CalendarCheck className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
          <p className="text-muted-foreground">{t('noExams')}</p>
          <button onClick={() => setShowForm(true)} className="btn-teal mt-4 mx-auto">
            <Plus className="w-4 h-4" />{t('addNewExam')}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence>
            {filtered.map(exam => (
              <ExamCard
                key={exam.id}
                exam={exam}
                onEdit={() => { setEditingExam(exam); setShowForm(true) }}
                onDelete={() => deleteExam(exam.id)}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Form modal */}
      <AnimatePresence>
        {showForm && (
          <ExamForm
            initial={editingExam ?? undefined}
            onSave={handleSave}
            onClose={() => { setShowForm(false); setEditingExam(null) }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
