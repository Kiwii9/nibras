import { useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  HardDrive, Trash2, File, Image, Presentation, FileText, X, CheckCircle,
  AlertCircle, Search, ExternalLink, CloudUpload, FolderPlus, Folder,
  Inbox, MoveRight, UploadCloud, Laptop
} from 'lucide-react'
import { useStore, UploadedFile, ResourceFolder } from '@/store'
import { useT } from '@/hooks/useT'
import { cn } from '@/lib/utils'

const MOCK_DRIVE_FILES = [
  { id: 'gd1', name: 'Biology Chapter 5 - Cell Division.pdf', size: 2400000, type: 'pdf' as const, modified: '2025-06-08' },
  { id: 'gd2', name: 'Chemistry Notes - Organic Compounds.docx', size: 890000, type: 'docx' as const, modified: '2025-06-07' },
  { id: 'gd3', name: 'Physics Lecture Slides Week 12.pptx', size: 5100000, type: 'pptx' as const, modified: '2025-06-06' },
  { id: 'gd4', name: 'Anatomy Diagrams - Nervous System.png', size: 340000, type: 'image' as const, modified: '2025-06-05' },
]

const FOLDER_COLORS = ['#2D7A84', '#C9A84C', '#4A90D9', '#7C5CBF', '#56A86B', '#E05555']

function formatBytes(b: number) {
  return b < 1024 * 1024 ? `${(b / 1024).toFixed(0)} KB` : `${(b / (1024 * 1024)).toFixed(1)} MB`
}

function getFileType(file: File): UploadedFile['type'] | null {
  const name = file.name.toLowerCase()
  if (file.type.startsWith('image/')) return 'image'
  if (name.endsWith('.pdf')) return 'pdf'
  if (name.endsWith('.docx')) return 'docx'
  if (name.endsWith('.pptx')) return 'pptx'
  return null
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
    const n = new Set(prev)
    n.has(id) ? n.delete(id) : n.add(id)
    return n
  })

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div initial={{ scale: 0.95, y: 10 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 10 }}
        className="relative z-10 w-full max-w-2xl bg-card border border-border rounded-2xl overflow-hidden shadow-teal-lg flex flex-col"
        style={{ maxHeight: '88vh' }}>
        <div className="px-5 py-4 flex items-center justify-between"
          style={{ background: 'linear-gradient(135deg,#0B2428,#1A4D53)' }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center">
              <HardDrive className="w-5 h-5 text-teal-300" />
            </div>
            <div>
              <p className="font-semibold text-white text-sm">Google Drive</p>
              <p className="text-teal-300/70 text-xs">
                {isAr ? 'عرض تجريبي آمن إلى أن يتم ربط Google Picker' : 'Safe demo preview until Google Picker is connected'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10 text-white/60 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 border-b border-border/50">
          <div className="relative">
            <Search className="w-4 h-4 absolute top-1/2 -translate-y-1/2 left-2.5 text-muted-foreground pointer-events-none" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder={isAr ? 'بحث في ملفات Drive التجريبية...' : 'Search demo Drive files...'}
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

        <div className="p-4 border-t border-border/50 space-y-3">
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            {isAr
              ? 'ملاحظة: هذا الاستيراد تجريبي. للاستخدام الحقيقي الآن استخدم رفع الملفات من جهازك.'
              : 'Note: this Drive import is a demo. For real use now, upload files from your computer.'}
            {' '}
            <a href="https://developers.google.com/drive/picker" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">
              Google Picker <ExternalLink className="w-3 h-3" />
            </a>
          </p>
          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-border/60 text-sm font-medium hover:bg-muted transition-colors">
              {isAr ? 'إلغاء' : 'Cancel'}
            </button>
            <button disabled={selected.size === 0} onClick={() => onSelect(MOCK_DRIVE_FILES.filter(f => selected.has(f.id)))}
              className={cn('flex-1 py-2.5 rounded-xl text-sm font-semibold', selected.size > 0 ? 'btn-teal' : 'bg-muted text-muted-foreground cursor-not-allowed opacity-50')}>
              {isAr ? `استيراد (${selected.size})` : `Import (${selected.size})`}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

function FolderCreator() {
  const { lang } = useT()
  const isAr = lang === 'ar'
  const addResourceFolder = useStore(s => s.addResourceFolder)
  const [name, setName] = useState('')

  const create = () => {
    const trimmed = name.trim()
    if (!trimmed) return
    addResourceFolder({
      id: `folder-${Date.now()}`,
      name: trimmed,
      color: FOLDER_COLORS[Math.floor(Math.random() * FOLDER_COLORS.length)],
      createdAt: new Date().toISOString(),
    })
    setName('')
  }

  return (
    <div className="glass-card rounded-2xl p-4 flex flex-col sm:flex-row gap-3">
      <input value={name} onChange={e => setName(e.target.value)} onKeyDown={e => e.key === 'Enter' && create()}
        placeholder={isAr ? 'مثال: Parallel Computing' : 'Example: Parallel Computing'}
        className="flex-1 px-3 py-2.5 text-sm rounded-xl bg-muted border border-border" />
      <button onClick={create} disabled={!name.trim()} className={cn('btn-teal px-5 py-2.5', !name.trim() && 'opacity-50 cursor-not-allowed')}>
        <FolderPlus className="w-4 h-4" />{isAr ? 'إنشاء مجلد' : 'Create folder'}
      </button>
    </div>
  )
}

export function DriveUploader() {
  const { lang } = useT()
  const isAr = lang === 'ar'
  const {
    files, resourceFolders, addFile, removeFile, deleteResourceFolder, moveFileToFolder
  } = useStore()
  const [showPicker, setShowPicker] = useState(false)
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)
  const [del, setDel] = useState<string | null>(null)
  const [activeFolderId, setActiveFolderId] = useState<string | 'all' | 'uncategorized'>('all')
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const t = (ar: string, en: string) => isAr ? ar : en

  const showToast = (msg: string, ok = true) => { setToast({ msg, ok }); setTimeout(() => setToast(null), 3000) }

  const folderCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    resourceFolders.forEach(f => { counts[f.id] = 0 })
    files.forEach(file => { if (file.folderId) counts[file.folderId] = (counts[file.folderId] || 0) + 1 })
    return counts
  }, [files, resourceFolders])

  const visibleFiles = files.filter(file => {
    if (activeFolderId === 'all') return true
    if (activeFolderId === 'uncategorized') return !file.folderId
    return file.folderId === activeFolderId
  })

  const defaultFolderId = activeFolderId !== 'all' && activeFolderId !== 'uncategorized' ? activeFolderId : null

  const handleLocalFiles = (selectedFiles: FileList | null) => {
    if (!selectedFiles?.length) return

    let added = 0
    let skipped = 0

    Array.from(selectedFiles).forEach(file => {
      const type = getFileType(file)
      if (!type) { skipped++; return }
      if (files.some(existing => existing.source === 'local' && existing.name === file.name && existing.size === file.size)) { skipped++; return }

      addFile({
        id: `local-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        name: file.name,
        type,
        size: file.size,
        uploadedAt: new Date().toISOString(),
        source: 'local',
        folderId: defaultFolderId,
        content: `[Local file: ${file.name}]`,
      })
      added++
    })

    if (fileInputRef.current) fileInputRef.current.value = ''
    if (added) showToast(t(`تمت إضافة ${added} ملف`, `${added} file(s) added`))
    if (!added && skipped) showToast(t('لم تتم إضافة ملفات جديدة أو النوع غير مدعوم', 'No new supported files were added'), false)
  }

  const handleSelect = (driveFiles: typeof MOCK_DRIVE_FILES) => {
    let count = 0
    driveFiles.forEach(f => {
      if (files.find(e => e.driveFileId === f.id)) return
      addFile({
        id: `gdrive-${f.id}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        name: f.name,
        type: f.type,
        size: f.size,
        uploadedAt: new Date().toISOString(),
        driveFileId: f.id,
        source: 'gdrive',
        folderId: defaultFolderId,
        content: `[Google Drive: ${f.name}]`,
      })
      count++
    })
    setShowPicker(false)
    if (count) showToast(t(`تم استيراد ${count} ملف تجريبي`, `${count} demo file(s) imported`))
    else showToast(t('الملفات موجودة مسبقاً', 'Files already imported'), false)
  }

  return (
    <div className="section-wrapper space-y-6">
      <div>
        <h1 className="font-display text-3xl text-foreground">{t('المصادر', 'Resources')}</h1>
        <p className="text-muted-foreground text-sm mt-1">
          {t('ارفع ملفاتك من الجهاز الآن، ونظّمها في مجلدات للمذاكرة.', 'Upload files from your computer now and organize them into study folders.')}
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <motion.div whileHover={{ scale: 1.005 }} onClick={() => fileInputRef.current?.click()}
          className="relative overflow-hidden rounded-2xl p-8 text-center cursor-pointer border-2 border-dashed border-primary/40 hover:border-primary/70 transition-all"
          style={{ background: 'linear-gradient(135deg,rgba(26,77,83,0.16),rgba(62,154,166,0.08))' }}>
          <input ref={fileInputRef} type="file" multiple className="hidden" accept=".pdf,.docx,.pptx,image/*" onChange={e => handleLocalFiles(e.target.files)} />
          <motion.div animate={{ y: [0, -5, 0] }} transition={{ duration: 2.5, repeat: Infinity }}
            className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg,#1A4D53,#3E9AA6)' }}>
            <UploadCloud className="w-8 h-8 text-white" />
          </motion.div>
          <p className="font-semibold text-foreground mb-1">{t('رفع من الجهاز', 'Upload from computer')}</p>
          <p className="text-sm text-muted-foreground mb-5">
            {t('يدعم PDF و Word و PowerPoint والصور. مناسب للاستخدام اليومي الآن.', 'Supports PDF, Word, PowerPoint, and images. Best for daily use now.')}
          </p>
          <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white"
            style={{ background: 'linear-gradient(135deg,#1A4D53,#2D7A84)' }}>
            <Laptop className="w-4 h-4" />{t('اختيار الملفات', 'Choose files')}
          </div>
        </motion.div>

        <motion.div whileHover={{ scale: 1.005 }} onClick={() => setShowPicker(true)}
          className="relative overflow-hidden rounded-2xl p-8 text-center cursor-pointer border border-border/70 hover:border-primary/40 transition-all bg-muted/30">
          <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center bg-muted border border-border">
            <CloudUpload className="w-8 h-8 text-muted-foreground" />
          </div>
          <p className="font-semibold text-foreground mb-1">{t('Google Drive تجريبي', 'Google Drive demo')}</p>
          <p className="text-sm text-muted-foreground mb-5">
            {t('استعراض تجريبي حتى يتم تفعيل Google Picker الحقيقي.', 'Demo import until real Google Picker is enabled.')}
          </p>
          <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold border border-border bg-card text-muted-foreground">
            <HardDrive className="w-4 h-4" />{t('فتح العرض التجريبي', 'Open demo')}
          </div>
        </motion.div>
      </div>

      <div className="grid lg:grid-cols-[280px,1fr] gap-5">
        <div className="space-y-4">
          <FolderCreator />
          <div className="glass-card rounded-2xl p-3 space-y-2">
            <button onClick={() => setActiveFolderId('all')}
              className={cn('w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-start', activeFolderId === 'all' ? 'bg-primary/10 text-primary' : 'hover:bg-muted')}>
              <Inbox className="w-4 h-4" />
              <span className="flex-1">{t('كل الملفات', 'All files')}</span>
              <span className="text-xs opacity-60">{files.length}</span>
            </button>
            <button onClick={() => setActiveFolderId('uncategorized')}
              className={cn('w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-start', activeFolderId === 'uncategorized' ? 'bg-primary/10 text-primary' : 'hover:bg-muted')}>
              <Folder className="w-4 h-4" />
              <span className="flex-1">{t('بدون مجلد', 'Uncategorized')}</span>
              <span className="text-xs opacity-60">{files.filter(f => !f.folderId).length}</span>
            </button>
            {resourceFolders.map(folder => (
              <div key={folder.id} className="group flex items-center gap-1">
                <button onClick={() => setActiveFolderId(folder.id)}
                  className={cn('flex-1 flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-start', activeFolderId === folder.id ? 'bg-primary/10 text-primary' : 'hover:bg-muted')}>
                  <span className="w-3 h-3 rounded-full" style={{ background: folder.color }} />
                  <span className="flex-1 truncate">{folder.name}</span>
                  <span className="text-xs opacity-60">{folderCounts[folder.id] || 0}</span>
                </button>
                {folder.id !== 'folder-general' && (
                  <button onClick={() => { deleteResourceFolder(folder.id); if (activeFolderId === folder.id) setActiveFolderId('all') }}
                    className="opacity-0 group-hover:opacity-100 p-2 text-muted-foreground hover:text-destructive">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            {t('الملفات', 'Files')} ({visibleFiles.length})
          </h3>
          {visibleFiles.length === 0 ? (
            <div className="glass-card rounded-2xl p-12 text-center">
              <HardDrive className="w-12 h-12 text-muted-foreground/25 mx-auto mb-4" />
              <p className="text-muted-foreground text-sm mb-4">{t('لا توجد ملفات هنا بعد', 'No files here yet')}</p>
              <button onClick={() => fileInputRef.current?.click()} className="btn-teal px-5 py-2">
                <UploadCloud className="w-4 h-4" />{t('رفع ملفات', 'Upload files')}
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <AnimatePresence>
                {visibleFiles.map(file => (
                  <motion.div key={file.id} initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20 }} className="glass-card rounded-xl px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                        <FileIcon type={file.type} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{file.name}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1 flex-wrap">
                          {file.source === 'local' ? <Laptop className="w-3 h-3" /> : <HardDrive className="w-3 h-3" />}
                          {file.source === 'local' ? t('جهازك', 'Computer') : 'Google Drive'} · {formatBytes(file.size)}
                          {file.folderId && <><span>·</span><Folder className="w-3 h-3" />{resourceFolders.find(f => f.id === file.folderId)?.name}</>}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <select value={file.folderId ?? ''} onChange={e => moveFileToFolder(file.id, e.target.value || null)}
                        className="text-xs bg-muted border border-border rounded-lg px-2 py-1.5">
                        <option value="">{t('بدون مجلد', 'No folder')}</option>
                        {resourceFolders.map(folder => <option key={folder.id} value={folder.id}>{folder.name}</option>)}
                      </select>
                      {del === file.id ? (
                        <>
                          <button onClick={() => { removeFile(file.id); setDel(null) }}
                            className="text-xs px-2 py-1 rounded bg-destructive/15 text-destructive font-medium">{t('حذف', 'Delete')}</button>
                          <button onClick={() => setDel(null)} className="text-xs px-2 py-1 rounded bg-muted">{t('إلغاء', 'Cancel')}</button>
                        </>
                      ) : (
                        <button onClick={() => setDel(file.id)} className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
              <button onClick={() => fileInputRef.current?.click()}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dashed border-border/60 text-sm text-muted-foreground hover:border-primary/40 hover:text-foreground transition-colors">
                <MoveRight className="w-4 h-4" />{t('إضافة المزيد', 'Add more')}
              </button>
            </div>
          )}
        </div>
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
