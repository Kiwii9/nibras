import { useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Trash2, File, Image, Presentation, FileText, CheckCircle,
  AlertCircle, FolderPlus, Folder, Inbox, MoveRight, UploadCloud,
  Laptop, NotebookPen, ShieldCheck
} from 'lucide-react'
import { useStore, type UploadedFile } from '@/store'
import { useT } from '@/hooks/useT'
import { cn } from '@/lib/utils'

const FOLDER_COLORS = ['#2D7A84', '#C9A84C', '#4A90D9', '#7C5CBF', '#56A86B', '#E05555']
const MAX_FILE_BYTES = 10 * 1024 * 1024
const MAX_NOTE_CHARS = 100_000
const TEXT_EXTENSIONS = ['.txt', '.md', '.csv']

function cleanText(value: string, maxLength: number) {
  return value
    .replace(/\u0000/g, '')
    .replace(/[\u0001-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, ' ')
    .trim()
    .slice(0, maxLength)
}

function safeName(value: string) {
  return cleanText(value, 100).replace(/[\\/:*?"<>|]/g, '-').replace(/\s+/g, ' ')
}

function formatBytes(bytes: number) {
  return bytes < 1024 * 1024
    ? `${Math.max(bytes / 1024, 0.1).toFixed(1)} KB`
    : `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function isTextFile(file: File) {
  const name = file.name.toLowerCase()
  return file.type.startsWith('text/') || TEXT_EXTENSIONS.some(extension => name.endsWith(extension))
}

function getFileType(file: File): UploadedFile['type'] | null {
  const name = file.name.toLowerCase()
  if (file.type.startsWith('image/')) return 'image'
  if (name.endsWith('.pdf')) return 'pdf'
  if (name.endsWith('.docx') || isTextFile(file)) return 'docx'
  if (name.endsWith('.pptx')) return 'pptx'
  return null
}

function hasExtractedText(file: UploadedFile) {
  const content = file.content?.trim() ?? ''
  return Boolean(content && !content.startsWith('[Local file:') && !content.startsWith('[Google Drive:'))
}

function FileIcon({ type, className }: { type: UploadedFile['type']; className?: string }) {
  const classes = cn('w-5 h-5', className)
  if (type === 'image') return <Image className={classes} style={{ color: '#3E9AA6' }} />
  if (type === 'pdf') return <FileText className={classes} style={{ color: '#E05555' }} />
  if (type === 'docx') return <File className={classes} style={{ color: '#4A90D9' }} />
  return <Presentation className={classes} style={{ color: '#D9844A' }} />
}

function FolderCreator() {
  const { lang } = useT()
  const isAr = lang === 'ar'
  const addResourceFolder = useStore(state => state.addResourceFolder)
  const [name, setName] = useState('')

  const create = () => {
    const trimmed = cleanText(name, 80)
    if (!trimmed) return
    addResourceFolder({
      id: `folder-${crypto.randomUUID()}`,
      name: trimmed,
      color: FOLDER_COLORS[Math.floor(Math.random() * FOLDER_COLORS.length)],
      createdAt: new Date().toISOString(),
    })
    setName('')
  }

  return (
    <div className="glass-card rounded-2xl p-4 flex flex-col sm:flex-row gap-3">
      <input value={name} maxLength={80} onChange={event => setName(event.target.value)}
        onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); create() } }}
        placeholder={isAr ? 'مثال: الخوارزميات' : 'Example: Algorithms'}
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
  const { files, resourceFolders, addFile, removeFile, deleteResourceFolder, moveFileToFolder } = useStore()
  const [toast, setToast] = useState<{ message: string; ok: boolean } | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [activeFolderId, setActiveFolderId] = useState<string | 'all' | 'uncategorized'>('all')
  const [noteTitle, setNoteTitle] = useState('')
  const [noteContent, setNoteContent] = useState('')
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const t = (ar: string, en: string) => isAr ? ar : en

  const showToast = (message: string, ok = true) => {
    setToast({ message, ok })
    window.setTimeout(() => setToast(null), 3500)
  }

  const folderCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    resourceFolders.forEach(folder => { counts[folder.id] = 0 })
    files.forEach(file => {
      if (file.folderId) counts[file.folderId] = (counts[file.folderId] || 0) + 1
    })
    return counts
  }, [files, resourceFolders])

  const visibleFiles = files.filter(file => {
    if (activeFolderId === 'all') return true
    if (activeFolderId === 'uncategorized') return !file.folderId
    return file.folderId === activeFolderId
  })

  const defaultFolderId = activeFolderId !== 'all' && activeFolderId !== 'uncategorized' ? activeFolderId : null

  const handleLocalFiles = async (selectedFiles: FileList | null) => {
    if (!selectedFiles?.length) return
    let added = 0
    let skipped = 0

    for (const file of Array.from(selectedFiles).slice(0, 20)) {
      const type = getFileType(file)
      const duplicate = files.some(existing => existing.source === 'local' && existing.name === file.name && existing.size === file.size)
      if (!type || duplicate || file.size <= 0 || file.size > MAX_FILE_BYTES) {
        skipped++
        continue
      }

      let content = `[Local file: ${safeName(file.name)} — text not extracted]`
      if (isTextFile(file)) {
        try {
          content = cleanText(await file.text(), MAX_NOTE_CHARS)
          if (!content) { skipped++; continue }
        } catch {
          skipped++
          continue
        }
      }

      addFile({
        id: `local-${crypto.randomUUID()}`,
        name: safeName(file.name),
        type,
        size: file.size,
        uploadedAt: new Date().toISOString(),
        source: 'local',
        folderId: defaultFolderId,
        content,
      })
      added++
    }

    if (fileInputRef.current) fileInputRef.current.value = ''
    if (added) showToast(t(`تمت إضافة ${added} ملف`, `${added} file(s) added`))
    if (skipped) showToast(t(`تم تجاهل ${skipped} ملف مكرر أو غير مدعوم أو أكبر من 10MB`, `${skipped} duplicate, unsupported, empty, or over-10MB file(s) skipped`), added > 0)
  }

  const addTextNote = () => {
    const title = safeName(noteTitle)
    const content = cleanText(noteContent, MAX_NOTE_CHARS)
    if (!title || content.length < 20) {
      showToast(t('أدخل عنواناً ونصاً لا يقل عن 20 حرفاً', 'Enter a title and at least 20 characters of study text'), false)
      return
    }

    addFile({
      id: `note-${crypto.randomUUID()}`,
      name: `${title}.txt`,
      type: 'docx',
      size: new Blob([content]).size,
      uploadedAt: new Date().toISOString(),
      source: 'local',
      folderId: defaultFolderId,
      content,
    })
    setNoteTitle('')
    setNoteContent('')
    showToast(t('تم حفظ الملاحظات وأصبحت جاهزة للاسترجاع في المعلم', 'Notes saved and ready for tutor retrieval'))
  }

  return (
    <div className="section-wrapper space-y-6">
      <div>
        <h1 className="font-display text-3xl text-foreground">{t('المصادر', 'Resources')}</h1>
        <p className="text-muted-foreground text-sm mt-1">
          {t('نظّم ملفاتك وأضف نصوصاً يمكن للمعلم استرجاع الأجزاء الأكثر صلة منها.', 'Organize files and add text the tutor can retrieve by relevance.')}
        </p>
      </div>

      <div className="rounded-2xl border border-amber-500/25 bg-amber-500/10 p-4 flex gap-3 text-sm leading-relaxed">
        <ShieldCheck className="w-5 h-5 text-amber-500 shrink-0" />
        <p>{t(
          'حالياً يقرأ المعلم ملفات TXT وMarkdown وCSV والملاحظات الملصقة فقط. ملفات PDF وWord وPowerPoint والصور تُحفظ كبيانات تنظيمية ولا يُدّعى استخراج محتواها.',
          'The tutor currently reads TXT, Markdown, CSV, and pasted notes only. PDF, Word, PowerPoint, and image files are stored as organizational metadata; their content is not claimed as extracted.'
        )}</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <motion.div whileHover={{ scale: 1.003 }} onClick={() => fileInputRef.current?.click()}
          className="rounded-2xl p-7 text-center cursor-pointer border-2 border-dashed border-primary/40 hover:border-primary/70 transition-all"
          style={{ background: 'linear-gradient(135deg,rgba(26,77,83,0.16),rgba(62,154,166,0.08))' }}>
          <input ref={fileInputRef} type="file" multiple className="hidden"
            accept=".txt,.md,.csv,.pdf,.docx,.pptx,image/*"
            onChange={event => { void handleLocalFiles(event.target.files) }} />
          <UploadCloud className="w-10 h-10 text-primary mx-auto mb-3" />
          <p className="font-semibold mb-1">{t('رفع من الجهاز', 'Upload from computer')}</p>
          <p className="text-xs text-muted-foreground">{t('20 ملفاً كحد أقصى في المرة، و10MB لكل ملف', 'Up to 20 files at once, 10MB per file')}</p>
        </motion.div>

        <div className="glass-card rounded-2xl p-5 space-y-3">
          <div className="flex items-center gap-2 font-semibold"><NotebookPen className="w-5 h-5 text-primary" />{t('إضافة ملاحظات قابلة للاسترجاع', 'Add retrievable study notes')}</div>
          <input value={noteTitle} maxLength={100} onChange={event => setNoteTitle(event.target.value)}
            placeholder={t('عنوان الملاحظات', 'Note title')}
            className="w-full px-3 py-2.5 rounded-xl bg-muted border border-border text-sm" />
          <textarea value={noteContent} maxLength={MAX_NOTE_CHARS} onChange={event => setNoteContent(event.target.value)}
            placeholder={t('الصق نص المحاضرة أو الملخص هنا...', 'Paste lecture text or a summary here...')}
            className="w-full min-h-32 resize-y px-3 py-2.5 rounded-xl bg-muted border border-border text-sm" />
          <div className="flex justify-between text-[10px] text-muted-foreground"><span>{noteContent.length.toLocaleString()}/{MAX_NOTE_CHARS.toLocaleString()}</span><span>{t('لا تضع بيانات حساسة', 'Do not include sensitive data')}</span></div>
          <button onClick={addTextNote} disabled={!noteTitle.trim() || noteContent.trim().length < 20}
            className="btn-teal w-full py-2.5 disabled:opacity-50 disabled:cursor-not-allowed">
            <NotebookPen className="w-4 h-4" />{t('حفظ للمذاكرة', 'Save for studying')}
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-[280px,1fr] gap-5">
        <div className="space-y-4">
          <FolderCreator />
          <div className="glass-card rounded-2xl p-3 space-y-2">
            <button onClick={() => setActiveFolderId('all')}
              className={cn('w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-start', activeFolderId === 'all' ? 'bg-primary/10 text-primary' : 'hover:bg-muted')}>
              <Inbox className="w-4 h-4" /><span className="flex-1">{t('كل الملفات', 'All files')}</span><span className="text-xs opacity-60">{files.length}</span>
            </button>
            <button onClick={() => setActiveFolderId('uncategorized')}
              className={cn('w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-start', activeFolderId === 'uncategorized' ? 'bg-primary/10 text-primary' : 'hover:bg-muted')}>
              <Folder className="w-4 h-4" /><span className="flex-1">{t('بدون مجلد', 'Uncategorized')}</span><span className="text-xs opacity-60">{files.filter(file => !file.folderId).length}</span>
            </button>
            {resourceFolders.map(folder => (
              <div key={folder.id} className="group flex items-center gap-1">
                <button onClick={() => setActiveFolderId(folder.id)}
                  className={cn('flex-1 flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-start', activeFolderId === folder.id ? 'bg-primary/10 text-primary' : 'hover:bg-muted')}>
                  <span className="w-3 h-3 rounded-full" style={{ background: folder.color }} />
                  <span className="flex-1 truncate">{folder.name}</span><span className="text-xs opacity-60">{folderCounts[folder.id] || 0}</span>
                </button>
                {folder.id !== 'folder-general' && (
                  <button aria-label={t('حذف المجلد', 'Delete folder')} onClick={() => { deleteResourceFolder(folder.id); if (activeFolderId === folder.id) setActiveFolderId('all') }}
                    className="opacity-0 group-hover:opacity-100 focus:opacity-100 p-2 text-muted-foreground hover:text-destructive">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">{t('الملفات', 'Files')} ({visibleFiles.length})</h3>
          {visibleFiles.length === 0 ? (
            <div className="glass-card rounded-2xl p-12 text-center">
              <FileText className="w-12 h-12 text-muted-foreground/25 mx-auto mb-4" />
              <p className="text-muted-foreground text-sm">{t('لا توجد مصادر هنا بعد', 'No resources here yet')}</p>
            </div>
          ) : (
            <div className="space-y-2">
              <AnimatePresence>
                {visibleFiles.map(file => (
                  <motion.div key={file.id} initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -20 }}
                    className="glass-card rounded-xl px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center shrink-0"><FileIcon type={file.type} /></div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{file.name}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1 flex-wrap">
                          <Laptop className="w-3 h-3" />{formatBytes(file.size)}
                          <span>·</span>
                          <span className={hasExtractedText(file) ? 'text-emerald-500' : 'text-amber-500'}>
                            {hasExtractedText(file) ? t('نص جاهز للمعلم', 'Tutor-readable text') : t('لم يُستخرج النص', 'Text not extracted')}
                          </span>
                          {file.folderId && <><span>·</span><Folder className="w-3 h-3" />{resourceFolders.find(folder => folder.id === file.folderId)?.name}</>}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <select value={file.folderId ?? ''} onChange={event => moveFileToFolder(file.id, event.target.value || null)}
                        className="text-xs bg-muted border border-border rounded-lg px-2 py-1.5">
                        <option value="">{t('بدون مجلد', 'No folder')}</option>
                        {resourceFolders.map(folder => <option key={folder.id} value={folder.id}>{folder.name}</option>)}
                      </select>
                      {deleteId === file.id ? (
                        <>
                          <button onClick={() => { removeFile(file.id); setDeleteId(null) }} className="text-xs px-2 py-1 rounded bg-destructive/15 text-destructive font-medium">{t('حذف', 'Delete')}</button>
                          <button onClick={() => setDeleteId(null)} className="text-xs px-2 py-1 rounded bg-muted">{t('إلغاء', 'Cancel')}</button>
                        </>
                      ) : (
                        <button aria-label={t('حذف المصدر', 'Delete resource')} onClick={() => setDeleteId(file.id)} className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10">
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
            {toast.ok ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}{toast.message}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
