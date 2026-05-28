import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  HardDrive, Trash2, File, Image, Presentation,
  FileText, X, CheckCircle, AlertCircle, Search, ExternalLink, CloudUpload
} from 'lucide-react'
import { useStore, UploadedFile } from '@/store'
import { useT } from '@/hooks/useT'
import { cn } from '@/lib/utils'

const MOCK_DRIVE_FILES = [
  { id: 'gd1', name: 'Biology Chapter 5 - Cell Division.pdf', size: 2400000, type: 'pdf' as const, modified: '2025-06-08' },
  { id: 'gd2', name: 'Chemistry Notes - Organic Compounds.docx', size: 890000, type: 'docx' as const, modified: '2025-06-07' },
  { id: 'gd3', name: 'Physics Lecture Slides Week 12.pptx', size: 5100000, type: 'pptx' as const, modified: '2025-06-06' },
  { id: 'gd4', name: 'Anatomy Diagrams - Nervous System.png', size: 340000, type: 'image' as const, modified: '2025-06-05' },
  { id: 'gd5', name: 'History Essay - Industrial Revolution.docx', size: 430000, type: 'docx' as const, modified: '2025-06-04' },
  { id: 'gd6', name: 'Math Formula Sheet.pdf', size: 1100000, type: 'pdf' as const, modified: '2025-06-03' },
  { id: 'gd7', name: 'Economics Presentation.pptx', size: 3200000, type: 'pptx' as const, modified: '2025-06-02' },
  { id: 'gd8', name: 'Lab Report - Titration.pdf', size: 780000, type: 'pdf' as const, modified: '2025-06-01' },
]

function formatBytes(b: number) {
  return b < 1024 * 1024 ? `${(b / 1024).toFixed(0)} KB` : `${(b / (1024 * 1024)).toFixed(1)} MB`
}

function FileIcon({ type, className }: { type: UploadedFile['type']; className?: string }) {
  const cls = cn('w-5 h-5', className)
  if (type === 'image') return <Image className={cls} style={{ color: '#3E9AA6' }} />
  if (type === 'pdf') return <FileText className={cls} style={{ color: '#E05555' }} />
  if (type === 'docx') return <File className={cls} style={{ color: '#4A90D9' }} />
  return <Presentation className={cls} style={{ color: '#D9844A' }} />
}

function DrivePickerModal({ onSelect, onClose }: { onSelect: (files: typeof MOCK_DRIVE_FILES) => void; onClose: () => void }) {
  const { lang } = useT()
  const isAr = lang === 'ar'
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [search, setSearch] = useState('')
  const filtered = MOCK_DRIVE_FILES.filter(f => f.name.toLowerCase().includes(search.toLowerCase()))

  const toggle = (id: string) => setSelected(prev => {
    const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n
  })

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div initial={{ scale: 0.95, y: 10 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 10 }}
        className="relative z-10 w-full max-w-lg bg-card border border-border rounded-2xl overflow-hidden shadow-teal-lg flex flex-col"
        style={{ maxHeight: '85vh' }}>
        <div className="px-5 py-4 flex items-center justify-between"
          style={{ background: 'linear-gradient(135deg,#0B2428,#1A4D53)' }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center">
              <HardDrive className="w-5 h-5 text-teal-300" />
            </div>
            <div>
              <p className="font-semibold text-white text-sm">Google Drive</p>
              <p className="text-teal-300/60 text-xs">{isAr ? 'اختر الملفات' : 'Select files to import'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {selected.size > 0 && <span className="badge-gold text-xs">{selected.size}</span>}
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10 text-white/60 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="px-4 py-3 border-b border-border/50">
          <div className="relative">
            <Search className="w-4 h-4 absolute top-1/2 -translate-y-1/2 left-2.5 text-muted-foreground pointer-events-none" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder={isAr ? 'بحث...' : 'Search Drive...'}
              className="w-full pl-8 pr-3 py-2 text-sm rounded-lg bg-muted border border-border focus:outline-none focus:ring-1 focus:ring-primary" />
          </div>
        </div>

        <div className="overflow-y-auto flex-1 p-2">
          {filtered.map(file => {
            const isSel = selected.has(file.id)
            return (
              <button key={file.id} onClick={() => toggle(file.id)}
                className={cn('w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-start transition-all mb-1 border',
                  isSel ? 'bg-primary/10 border-primary/30' : 'hover:bg-muted border-transparent')}>
                <FileIcon type={file.type} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{file.name}</p>
                  <p className="text-xs text-muted-foreground">{formatBytes(file.size)} · {file.modified}</p>
                </div>
                {isSel && <CheckCircle className="w-4 h-4 text-primary shrink-0" />}
              </button>
            )
          })}
        </div>

        <div className="p-4 border-t border-border/50 flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-border/60 text-sm font-medium hover:bg-muted transition-colors">
            {isAr ? 'إلغاء' : 'Cancel'}
          </button>
          <button disabled={selected.size === 0} onClick={() => onSelect(MOCK_DRIVE_FILES.filter(f => selected.has(f.id)))}
            className={cn('flex-1 py-2.5 rounded-xl text-sm font-semibold', selected.size > 0 ? 'btn-teal' : 'bg-muted text-muted-foreground cursor-not-allowed opacity-50')}>
            {isAr ? `استيراد (${selected.size})` : `Import (${selected.size})`}
          </button>
        </div>
        <p className="text-center text-[10px] text-muted-foreground pb-3 px-5">
          Mock picker ·{' '}
          <a href="https://developers.google.com/drive/picker" target="_blank" rel="noopener noreferrer"
            className="text-primary hover:underline inline-flex items-center gap-0.5">
            Real Picker docs <ExternalLink className="w-2.5 h-2.5" />
          </a>
        </p>
      </motion.div>
    </motion.div>
  )
}

export function DriveUploader() {
  const { lang } = useT()
  const isAr = lang === 'ar'
  const { files, addFile, removeFile } = useStore()
  const [showPicker, setShowPicker] = useState(false)
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)
  const [del, setDel] = useState<string | null>(null)
  const t = (ar: string, en: string) => isAr ? ar : en

  const showToast = (msg: string, ok = true) => { setToast({ msg, ok }); setTimeout(() => setToast(null), 3000) }

  const handleSelect = (driveFiles: typeof MOCK_DRIVE_FILES) => {
    let count = 0
    driveFiles.forEach(f => {
      if (files.find(e => e.driveFileId === f.id)) return
      addFile({ id: `gdrive-${f.id}-${Date.now()}`, name: f.name, type: f.type, size: f.size, uploadedAt: new Date().toISOString(), driveFileId: f.id, source: 'gdrive', content: `[Google Drive: ${f.name}]` })
      count++
    })
    setShowPicker(false)
    if (count) showToast(t(`تم استيراد ${count} ملف`, `${count} file(s) imported`))
    else showToast(t('الملفات موجودة مسبقاً', 'Files already imported'), false)
  }

  return (
    <div className="section-wrapper space-y-6">
      <div>
        <h1 className="font-display text-3xl text-foreground">{t('المصادر', 'Resources')}</h1>
        <p className="text-muted-foreground text-sm mt-1">{t('رفع الملفات عبر Google Drive فقط', 'Upload files via Google Drive only')}</p>
      </div>

      <motion.div whileHover={{ scale: 1.005 }} onClick={() => setShowPicker(true)}
        className="relative overflow-hidden rounded-2xl p-10 text-center cursor-pointer border-2 border-dashed border-primary/30 hover:border-primary/60 transition-all"
        style={{ background: 'linear-gradient(135deg,rgba(26,77,83,0.12),rgba(62,154,166,0.06))' }}>
        <motion.div animate={{ y: [0, -5, 0] }} transition={{ duration: 2.5, repeat: Infinity }}
          className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg,#1A4D53,#3E9AA6)' }}>
          <CloudUpload className="w-8 h-8 text-white" />
        </motion.div>
        <p className="font-semibold text-foreground mb-1">{t('استيراد من Google Drive', 'Import from Google Drive')}</p>
        <p className="text-sm text-muted-foreground mb-5">{t('انقر لفتح نافذة الاختيار', 'Click to open the file picker')}</p>
        <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white"
          style={{ background: 'linear-gradient(135deg,#1A4D53,#2D7A84)' }}>
          <HardDrive className="w-4 h-4" />{t('فتح Google Drive', 'Open Google Drive')}
        </div>
        <p className="text-xs text-muted-foreground/50 mt-4">
          🔒 {t('رفع مباشر من الجهاز غير مدعوم', 'Direct device upload is not supported')}
        </p>
      </motion.div>

      <div className="glass-card rounded-xl px-4 py-3 flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg bg-blue-500/15 flex items-center justify-center shrink-0">
          <HardDrive className="w-4 h-4 text-blue-400" />
        </div>
        <div>
          <p className="text-sm font-medium">{t('لماذا Google Drive فقط؟', 'Why Google Drive only?')}</p>
          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
            {t('يمنحك Drive إمكانية الوصول من أي جهاز، ويضمن حفظ ملفاتك بأمان في مكان واحد.', 'Drive gives you access from any device and keeps your files safely organized in one place.')}
          </p>
        </div>
      </div>

      <div>
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          {t('الملفات المستوردة', 'Imported Files')} ({files.length})
        </h3>
        {files.length === 0 ? (
          <div className="glass-card rounded-2xl p-12 text-center">
            <HardDrive className="w-12 h-12 text-muted-foreground/25 mx-auto mb-4" />
            <p className="text-muted-foreground text-sm mb-4">{t('لا توجد ملفات بعد', 'No files yet')}</p>
            <button onClick={() => setShowPicker(true)} className="btn-teal px-5 py-2">
              <HardDrive className="w-4 h-4" />{t('فتح Google Drive', 'Open Google Drive')}
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <AnimatePresence>
              {files.map(file => (
                <motion.div key={file.id} initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }} className="glass-card rounded-xl px-4 py-3 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                    <FileIcon type={file.type} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{file.name}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <HardDrive className="w-3 h-3" /> Google Drive · {formatBytes(file.size)}
                    </p>
                  </div>
                  {del === file.id ? (
                    <div className="flex gap-2 shrink-0">
                      <button onClick={() => { removeFile(file.id); setDel(null) }}
                        className="text-xs px-2 py-1 rounded bg-destructive/15 text-destructive font-medium">{t('حذف', 'Delete')}</button>
                      <button onClick={() => setDel(null)} className="text-xs px-2 py-1 rounded bg-muted">{t('إلغاء', 'Cancel')}</button>
                    </div>
                  ) : (
                    <button onClick={() => setDel(file.id)} className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
            <button onClick={() => setShowPicker(true)}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dashed border-border/60 text-sm text-muted-foreground hover:border-primary/40 hover:text-foreground transition-colors">
              <HardDrive className="w-4 h-4" />{t('إضافة المزيد', 'Add more from Drive')}
            </button>
          </div>
        )}
      </div>

      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 40 }}
            className={cn('fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-medium shadow-lg', toast.ok ? 'bg-teal-700 text-white' : 'bg-destructive text-white')}>
            {toast.ok ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showPicker && <DrivePickerModal onSelect={handleSelect} onClose={() => setShowPicker(false)} />}
      </AnimatePresence>
    </div>
  )
}
