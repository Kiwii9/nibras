import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Send, Plus, Trash2, MessageSquare, Bot, User,
  AlertCircle, ChevronDown, Sparkles, Settings,
  BrainCircuit, GitBranch, Table2, Clock4
} from 'lucide-react'
import { useStore, Message, ChatSession } from '@/store'
import { useT } from '@/hooks/useT'
import {
  callLLM, buildChatSystemPrompt, buildVisualPrompt,
  detectVisualCommand, extractJson
} from '@/lib/ai'
import { cn } from '@/lib/utils'
import { Link } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { VisualRenderer } from './VisualRenderer'
import { RateLimitCard } from './RateLimitCard'

// ─── Visual data stored per message ──────────────────────────────────────────
type VisualType = 'mindmap' | 'diagram' | 'timeline' | 'table'
interface VisualPayload { type: VisualType; data: any }
const visualCache = new Map<string, VisualPayload>() // msgId → visual

// ─── Error classifier ─────────────────────────────────────────────────────────
type ErrorKind = 'rate_limit' | 'platform_key_missing' | 'invalid_key' | 'provider' | 'network' | 'generic'

function classifyError(raw: string): ErrorKind {
  const m = raw.toLowerCase()
  if (m.includes('rate_limit') || m.includes('rate limit') || m.includes('429') || m.includes('too many')) return 'rate_limit'
  if (m.includes('platform_key_missing')) return 'platform_key_missing'
  if (m.includes('401') || m.includes('invalid_key') || m.includes('unauthorized')) return 'invalid_key'
  if (m.includes('provider_error') || m.includes('provider failed') || m.includes('bad_provider_response') || m.includes('openrouter') || m.includes('gemini') || m.includes('groq')) return 'provider'
  if (m.includes('network') || m.includes('fetch') || m.includes('failed to fetch')) return 'network'
  return 'generic'
}

function friendlyText(kind: ErrorKind, isAr: boolean): string {
  if (kind === 'invalid_key') return isAr ? 'مفتاح API غير صحيح. تحقق من الإعدادات.' : 'Invalid API key. Check Settings.'
  if (kind === 'provider') return isAr
    ? 'مزود الذكاء الاصطناعي رفض الطلب أو أعاد خطأ. تم تحديث النموذج، جرّب مرة أخرى بعد تحديث الصفحة. إذا تكرر الخطأ فغالباً يحتاج مفتاح OpenRouter إلى رصيد أو تبديل نموذج.'
    : 'The AI provider rejected the request or returned an error. The model was updated; refresh and try again. If it continues, the OpenRouter key may need credits or a different model.'
  if (kind === 'network') return isAr ? 'خطأ في الاتصال. تحقق من الإنترنت.' : 'Network error. Check your connection.'
  return isAr ? 'تعذر تشغيل المساعد الآن. جرّب تحديث الصفحة أو تغيير مزود الذكاء الاصطناعي.' : 'The assistant could not run right now. Refresh the page or change the AI provider.'
}

// ─── Visual command quick buttons ─────────────────────────────────────────────
const VISUAL_CMDS = [
  { icon: BrainCircuit, ar: 'خريطة ذهنية', en: 'Mind Map',  cmd: 'mind map' },
  { icon: GitBranch,    ar: 'مخطط انسيابي',en: 'Flowchart', cmd: 'explain visually as a diagram' },
  { icon: Clock4,       ar: 'جدول زمني',   en: 'Timeline',  cmd: 'timeline' },
  { icon: Table2,       ar: 'جدول مقارنة', en: 'Compare',   cmd: 'comparison table' },
]

function TypingIndicator() {
  return (
    <div className="flex items-end gap-2 mb-4">
      <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
        style={{ background: 'linear-gradient(135deg,#1A4D53,#3E9AA6)' }}>
        <Bot className="w-3.5 h-3.5 text-white" />
      </div>
      <div className="chat-bubble-ai px-4 py-3">
        <div className="flex gap-1 items-center">
          {[0,1,2].map(i => (
            <motion.div key={i} className="w-1.5 h-1.5 rounded-full bg-primary/60"
              animate={{ y: [0,-4,0] }} transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }} />
          ))}
        </div>
      </div>
    </div>
  )
}

function ChatMessage({ msg, isAr }: { msg: Message; isAr: boolean }) {
  const isUser = msg.role === 'user'
  const visual = visualCache.get(msg.id)

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className={cn('flex items-end gap-2 mb-4', isUser && 'flex-row-reverse')}>
      <div className={cn('w-7 h-7 rounded-full flex items-center justify-center shrink-0', isUser ? 'bg-muted' : '')}
        style={!isUser ? { background: 'linear-gradient(135deg,#1A4D53,#3E9AA6)' } : {}}>
        {isUser ? <User className="w-3.5 h-3.5 text-muted-foreground" /> : <Bot className="w-3.5 h-3.5 text-white" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className={isUser ? 'chat-bubble-user' : 'chat-bubble-ai'}>
          {isUser
            ? <p className="text-sm leading-relaxed whitespace-pre-wrap" dir="auto">{msg.content}</p>
            : <div dir="auto" className="text-sm leading-relaxed markdown-chat">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
              </div>}
          <p className="text-[10px] mt-1 opacity-40">
            {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
        {/* Visual rendered below the AI bubble */}
        {visual && !isUser && <VisualRenderer type={visual.type} data={visual.data} isAr={isAr} />}
      </div>
    </motion.div>
  )
}

export function Chatbot() {
  const { t, lang, isRTL } = useT()
  const isAr = lang === 'ar'
  const {
    files, chatSessions, activeChatId, apiConfig,
    addChatSession, updateChatSession, setActiveChatId, deleteChatSession,
    incrementMessageCount, dailyMessageCount
  } = useStore()

  const [input, setInput]               = useState('')
  const [loading, setLoading]           = useState(false)
  const [errorKind, setErrorKind]       = useState<ErrorKind | null>(null)
  const [errorText, setErrorText]       = useState('')
  const [selectedFileId, setSelectedFileId] = useState('')
  const [generatingVisual, setGeneratingVisual] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef    = useRef<HTMLTextAreaElement>(null)

  const activeSession = chatSessions.find(s => s.id === activeChatId) ?? null
  const usePlatform   = !apiConfig.useCustomKey
  const hasKey        = usePlatform || !!apiConfig.apiKey
  const DAILY_LIMIT   = 50

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [activeSession?.messages, loading])

  const clearError = () => { setErrorKind(null); setErrorText('') }

  const createSession = () => {
    const s: ChatSession = {
      id: `chat-${Date.now()}`,
      title: lang === 'ar' ? 'محادثة جديدة' : 'New Chat',
      messages: [], fileIds: selectedFileId ? [selectedFileId] : [],
      createdAt: new Date().toISOString(),
    }
    addChatSession(s)
  }

  // ── Generate visual from a topic ────────────────────────────────────────────
  const generateVisual = async (msgId: string, topic: string, type: VisualType) => {
    setGeneratingVisual(true)
    try {
      const prompt = buildVisualPrompt(topic, type)
      const res = await callLLM([{ role: 'user', content: prompt }], usePlatform ? undefined : apiConfig, { maxTokens: 800, temperature: 0.4 })
      const parsed = JSON.parse(extractJson(res.content))
      visualCache.set(msgId, { type, data: parsed })
    } catch (err) {
      console.warn('Visual generation failed:', err)
    }
    setGeneratingVisual(false)
  }

  const sendMessage = async (overrideInput?: string) => {
    const text = (overrideInput ?? input).trim()
    if (!text || loading) return
    clearError()

    if (!hasKey) { setErrorKind('platform_key_missing'); return }
    if (dailyMessageCount >= DAILY_LIMIT && !apiConfig.useCustomKey) {
      setErrorKind('rate_limit'); return
    }

    const userMsg: Message = {
      id: `msg-${Date.now()}`, role: 'user',
      content: text, timestamp: new Date().toISOString(),
    }

    let session = activeSession
    if (!session) {
      session = {
        id: `chat-${Date.now()}`,
        title: text.slice(0, 40),
        messages: [], fileIds: selectedFileId ? [selectedFileId] : [],
        createdAt: new Date().toISOString(),
      }
      addChatSession(session)
    }

    const newMessages = [...session.messages, userMsg]
    updateChatSession(session.id, newMessages)
    setInput('')
    setLoading(true)

    // Detect visual command
    const visualType = detectVisualCommand(text)

    try {
      const ctx = files.find(f => f.id === selectedFileId)?.content ?? ''
      const llmMessages = [
        { role: 'system' as const, content: buildChatSystemPrompt(ctx, lang) },
        ...newMessages.slice(-10).map(m => ({ role: m.role as 'user'|'assistant', content: m.content })),
      ]

      const keyConfig = usePlatform ? undefined : apiConfig
      const response = await callLLM(llmMessages, keyConfig, { maxTokens: 1000 })
      incrementMessageCount()

      const assistantMsg: Message = {
        id: `msg-${Date.now() + 1}`, role: 'assistant',
        content: response.content, timestamp: new Date().toISOString(),
      }
      updateChatSession(session.id, [...newMessages, assistantMsg])

      // If visual command — generate visual for this message
      if (visualType) {
        // Extract topic from user text
        const topic = text.replace(/mind map|خريطة ذهنية|diagram|مخطط|timeline|جدول زمني|explain visually|اشرح بصرياً|comparison|مقارنة/gi, '').trim() || text
        generateVisual(assistantMsg.id, topic, visualType)
      }
    } catch (err: any) {
      const kind = classifyError(err?.message ?? '')
      setErrorKind(kind)
      if (kind !== 'rate_limit' && kind !== 'platform_key_missing') {
        setErrorText(friendlyText(kind, isAr))
      }
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
  }

  return (
    <div className="h-[calc(100vh-3.5rem)] flex">
      {/* Sessions sidebar */}
      <div className="hidden md:flex flex-col w-56 border-e border-border/50 bg-card/50 shrink-0">
        <div className="p-3 border-b border-border/40">
          <button onClick={createSession} className="btn-teal w-full text-sm py-2">
            <Plus className="w-4 h-4" />{t('newChat')}
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {chatSessions.length === 0
            ? <p className="text-xs text-muted-foreground text-center p-4 mt-4">{t('noData')}</p>
            : chatSessions.map(s => (
              <button key={s.id} onClick={() => setActiveChatId(s.id)}
                className={cn('w-full text-start px-3 py-2 rounded-lg text-xs transition-colors group flex items-start gap-2',
                  activeChatId === s.id ? 'bg-primary/10 text-primary' : 'hover:bg-muted text-muted-foreground hover:text-foreground')}>
                <MessageSquare className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                <span className="truncate flex-1">{s.title}</span>
                <button onClick={e => { e.stopPropagation(); deleteChatSession(s.id) }}
                  className="opacity-0 group-hover:opacity-100 p-0.5 hover:text-destructive">
                  <Trash2 className="w-3 h-3" />
                </button>
              </button>
            ))}
        </div>
        {/* Daily usage indicator */}
        {!apiConfig.useCustomKey && (
          <div className="p-3 border-t border-border/40 space-y-1.5">
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>{isAr ? 'الاستخدام اليومي' : 'Daily usage'}</span>
              <span>{dailyMessageCount}/{DAILY_LIMIT}</span>
            </div>
            <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
              <motion.div className="h-full rounded-full"
                style={{ background: dailyMessageCount > DAILY_LIMIT * 0.8 ? '#EF4444' : '#2D7A84' }}
                animate={{ width: `${Math.min((dailyMessageCount / DAILY_LIMIT) * 100, 100)}%` }} />
            </div>
          </div>
        )}
      </div>

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/50 bg-card/40">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg,#1A4D53,#3E9AA6)' }}>
              <Sparkles className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-semibold text-sm truncate">{activeSession?.title ?? t('chat')}</span>
            {generatingVisual && (
              <span className="text-[10px] text-primary animate-pulse">{isAr ? 'يرسم...' : 'Drawing...'}</span>
            )}
          </div>
          <div className="relative shrink-0">
            <select value={selectedFileId} onChange={e => setSelectedFileId(e.target.value)}
              className="text-xs bg-muted border border-border rounded-lg px-3 py-1.5 appearance-none cursor-pointer pe-7">
              <option value="">{t('selectFile')}</option>
              {files.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
            <ChevronDown className={cn('w-3 h-3 absolute top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none', isRTL ? 'left-2' : 'right-2')} />
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          {!activeSession ? (
            <div className="h-full flex flex-col items-center justify-center text-center gap-4">
              <motion.div animate={{ y: [0,-6,0] }} transition={{ duration: 3, repeat: Infinity }}
                className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-teal"
                style={{ background: 'linear-gradient(135deg,#0B2428,#3E9AA6)' }}>
                <Bot className="w-8 h-8 text-white" />
              </motion.div>
              <div>
                <h3 className="font-display text-2xl mb-2">{t('chat')}</h3>
                <p className="text-sm text-muted-foreground max-w-xs" dir="auto">{t('chatWelcome')}</p>
              </div>

              {/* Visual quick-start buttons */}
              <div className="grid grid-cols-2 gap-2 w-full max-w-xs mt-2">
                {VISUAL_CMDS.map(({ icon: Icon, ar, en, cmd }) => (
                  <button key={cmd} onClick={() => { createSession(); setTimeout(() => sendMessage(cmd), 100) }}
                    className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-muted/50 border border-border/50 text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-all text-start">
                    <Icon className="w-3.5 h-3.5 text-primary shrink-0" />
                    {isAr ? ar : en}
                  </button>
                ))}
              </div>

              {!hasKey && (
                <div className="flex items-center gap-2 text-xs text-amber-500 bg-amber-500/10 px-4 py-2.5 rounded-xl border border-amber-500/20 max-w-xs">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{isAr ? 'لا يوجد مفتاح API — ' : 'No API key — '}</span>
                  <Link to="/settings" className="underline font-semibold flex items-center gap-1">
                    <Settings className="w-3 h-3" />{t('settings')}
                  </Link>
                </div>
              )}
              <button onClick={createSession} className="btn-teal px-6 py-2.5">
                <Plus className="w-4 h-4" />{t('newChat')}
              </button>
            </div>
          ) : activeSession.messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center gap-3">
              <p className="text-muted-foreground text-sm text-center" dir="auto">{t('chatWelcome')}</p>
              <div className="grid grid-cols-2 gap-2 w-full max-w-xs">
                {VISUAL_CMDS.map(({ icon: Icon, ar, en, cmd }) => (
                  <button key={cmd} onClick={() => sendMessage(cmd)}
                    className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-muted/50 border border-border/50 text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-all text-start">
                    <Icon className="w-3.5 h-3.5 text-primary shrink-0" />
                    {isAr ? ar : en}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {activeSession.messages.map(msg => <ChatMessage key={msg.id} msg={msg} isAr={isAr} />)}
              {loading && <TypingIndicator />}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Rate limit / error cards */}
        <AnimatePresence>
          {(errorKind === 'rate_limit' || errorKind === 'platform_key_missing') && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="mx-4 mb-3">
              <RateLimitCard isAr={isAr} type={errorKind} />
            </motion.div>
          )}
          {errorKind && errorKind !== 'rate_limit' && errorKind !== 'platform_key_missing' && (
            <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="mx-4 mb-2 flex items-start gap-2 text-xs bg-destructive/10 text-destructive px-3 py-2.5 rounded-xl border border-destructive/20">
              <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              <span className="flex-1" dir="auto">{errorText}</span>
              {errorKind === 'invalid_key' && (
                <Link to="/settings" className="underline font-semibold shrink-0">{t('settings')}</Link>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Input */}
        <div className="p-4 border-t border-border/50 bg-card/40">
          <div className="flex gap-2 items-end">
            <textarea ref={textareaRef} value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={hasKey ? t('chatPlaceholder') : (isAr ? 'أضف مفتاح API في الإعدادات...' : 'Add API key in Settings...')}
              disabled={loading} rows={1} dir="auto"
              className={cn('flex-1 resize-none rounded-xl px-4 py-2.5 text-sm bg-muted border border-border focus:outline-none focus:ring-2 focus:ring-primary/40 max-h-32 transition-colors', loading && 'opacity-60 cursor-wait')}
              style={{ minHeight: '44px' }}
              onInput={e => { const el = e.currentTarget; el.style.height = 'auto'; el.style.height = Math.min(el.scrollHeight, 128) + 'px' }}
              onClick={clearError}
            />
            <motion.button whileTap={{ scale: 0.92 }} onClick={() => sendMessage()}
              disabled={!input.trim() || loading}
              className={cn('w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-all',
                input.trim() && !loading ? 'btn-teal' : 'bg-muted text-muted-foreground cursor-not-allowed opacity-50')}>
              <Send className={cn('w-4 h-4', isRTL && 'rtl-flip')} />
            </motion.button>
          </div>
          <p className="text-[10px] text-muted-foreground text-center mt-2">
            ↵ {isAr ? 'إدخال للإرسال · Shift+Enter لسطر جديد' : 'Enter to send · Shift+Enter for new line'}
          </p>
        </div>
      </div>
    </div>
  )
}
