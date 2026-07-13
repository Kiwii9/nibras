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

type VisualType = 'mindmap' | 'diagram' | 'timeline' | 'table'
interface VisualPayload { type: VisualType; data: any }
const visualCache = new Map<string, VisualPayload>()

type ErrorKind =
  | 'rate_limit'
  | 'platform_key_missing'
  | 'invalid_key'
  | 'auth'
  | 'quota'
  | 'provider'
  | 'network'
  | 'generic'

function classifyError(raw: string): ErrorKind {
  const message = raw.toLowerCase()
  if (message.includes('rate_limit') || message.includes('rate limit') || message.includes('429') || message.includes('too many')) return 'rate_limit'
  if (message.includes('auth_required') || message.includes('invalid_session') || message.includes('session expired')) return 'auth'
  if (message.includes('quota_service_unavailable')) return 'quota'
  if (message.includes('platform_key_missing')) return 'platform_key_missing'
  if (message.includes('401') || message.includes('invalid_key') || message.includes('unauthorized')) return 'invalid_key'
  if (message.includes('provider_error') || message.includes('provider failed') || message.includes('bad_provider_response') || message.includes('openrouter') || message.includes('gemini') || message.includes('groq')) return 'provider'
  if (message.includes('network') || message.includes('fetch') || message.includes('failed to fetch')) return 'network'
  return 'generic'
}

function friendlyText(kind: ErrorKind, isAr: boolean): string {
  if (kind === 'invalid_key') return isAr ? 'مفتاح API غير صحيح. تحقق من الإعدادات.' : 'Invalid API key. Check Settings.'
  if (kind === 'auth') return isAr
    ? 'انتهت جلسة تسجيل الدخول. سجّل الخروج ثم ادخل مرة أخرى.'
    : 'Your login session expired. Sign out, then sign in again.'
  if (kind === 'quota') return isAr
    ? 'تعذر التحقق من حد الاستخدام بأمان. جرّب مرة أخرى بعد قليل.'
    : 'The usage limit could not be verified safely. Try again shortly.'
  if (kind === 'provider') return isAr
    ? 'مزود الذكاء الاصطناعي لم يكمل الطلب. جرّب مرة أخرى بعد لحظات.'
    : 'The AI provider could not complete the request. Try again in a moment.'
  if (kind === 'network') return isAr ? 'خطأ في الاتصال. تحقق من الإنترنت.' : 'Network error. Check your connection.'
  return isAr ? 'تعذر تشغيل المساعد الآن. جرّب تحديث الصفحة.' : 'The assistant could not run right now. Refresh and try again.'
}

const VISUAL_CMDS = [
  { icon: BrainCircuit, ar: 'خريطة ذهنية', en: 'Mind Map', cmd: 'mind map' },
  { icon: GitBranch, ar: 'مخطط انسيابي', en: 'Flowchart', cmd: 'explain visually as a diagram' },
  { icon: Clock4, ar: 'جدول زمني', en: 'Timeline', cmd: 'timeline' },
  { icon: Table2, ar: 'جدول مقارنة', en: 'Compare', cmd: 'comparison table' },
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
          {[0, 1, 2].map(index => (
            <motion.div key={index} className="w-1.5 h-1.5 rounded-full bg-primary/60"
              animate={{ y: [0, -4, 0] }} transition={{ duration: 0.6, repeat: Infinity, delay: index * 0.15 }} />
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

  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorKind, setErrorKind] = useState<ErrorKind | null>(null)
  const [errorText, setErrorText] = useState('')
  const [selectedFileId, setSelectedFileId] = useState('')
  const [generatingVisual, setGeneratingVisual] = useState(false)
  const [serverQuotaUsed, setServerQuotaUsed] = useState<number | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const activeSession = chatSessions.find(session => session.id === activeChatId) ?? null
  const usePlatform = !apiConfig.useCustomKey
  const hasKey = usePlatform || !!apiConfig.apiKey
  const DAILY_LIMIT = 25
  const displayedUsage = serverQuotaUsed ?? Math.min(dailyMessageCount, DAILY_LIMIT)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [activeSession?.messages, loading])

  const clearError = () => { setErrorKind(null); setErrorText('') }

  const createSession = () => {
    const session: ChatSession = {
      id: `chat-${Date.now()}`,
      title: lang === 'ar' ? 'محادثة جديدة' : 'New Chat',
      messages: [],
      fileIds: selectedFileId ? [selectedFileId] : [],
      createdAt: new Date().toISOString(),
    }
    addChatSession(session)
  }

  const generateVisual = async (messageId: string, topic: string, type: VisualType) => {
    setGeneratingVisual(true)
    try {
      const prompt = buildVisualPrompt(topic, type)
      const response = await callLLM(
        [{ role: 'user', content: prompt }],
        usePlatform ? undefined : apiConfig,
        { maxTokens: 800, temperature: 0.4, feature: 'visual_generation' }
      )
      const parsed = JSON.parse(extractJson(response.content))
      visualCache.set(messageId, { type, data: parsed })
      if (response.quota) setServerQuotaUsed(response.quota.used)
    } catch (error) {
      console.warn('Visual generation failed:', error)
    } finally {
      setGeneratingVisual(false)
    }
  }

  const sendMessage = async (overrideInput?: string) => {
    const text = (overrideInput ?? input).trim()
    if (!text || loading) return
    clearError()

    if (!hasKey) { setErrorKind('platform_key_missing'); return }
    if (serverQuotaUsed !== null && serverQuotaUsed >= DAILY_LIMIT && !apiConfig.useCustomKey) {
      setErrorKind('rate_limit')
      return
    }

    const userMessage: Message = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
    }

    let session = activeSession
    if (!session) {
      session = {
        id: `chat-${Date.now()}`,
        title: text.slice(0, 40),
        messages: [],
        fileIds: selectedFileId ? [selectedFileId] : [],
        createdAt: new Date().toISOString(),
      }
      addChatSession(session)
    }

    const newMessages = [...session.messages, userMessage]
    updateChatSession(session.id, newMessages)
    setInput('')
    setLoading(true)

    const visualType = detectVisualCommand(text)

    try {
      const context = files.find(file => file.id === selectedFileId)?.content ?? ''
      const llmMessages = [
        { role: 'system' as const, content: buildChatSystemPrompt(context, lang) },
        ...newMessages.slice(-10).map(message => ({ role: message.role as 'user' | 'assistant', content: message.content })),
      ]

      const keyConfig = usePlatform ? undefined : apiConfig
      const response = await callLLM(llmMessages, keyConfig, { maxTokens: 1000, feature: 'chat' })
      incrementMessageCount()
      if (response.quota) setServerQuotaUsed(response.quota.used)

      const assistantMessage: Message = {
        id: `msg-${Date.now() + 1}`,
        role: 'assistant',
        content: response.content,
        timestamp: new Date().toISOString(),
      }
      updateChatSession(session.id, [...newMessages, assistantMessage])

      if (visualType) {
        const topic = text.replace(/mind map|خريطة ذهنية|diagram|مخطط|timeline|جدول زمني|explain visually|اشرح بصرياً|comparison|مقارنة/gi, '').trim() || text
        void generateVisual(assistantMessage.id, topic, visualType)
      }
    } catch (error) {
      const kind = classifyError(error instanceof Error ? error.message : String(error))
      setErrorKind(kind)
      if (kind !== 'rate_limit' && kind !== 'platform_key_missing') {
        setErrorText(friendlyText(kind, isAr))
      }
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      void sendMessage()
    }
  }

  return (
    <div className="h-[calc(100vh-3.5rem)] flex">
      <div className="hidden md:flex flex-col w-56 border-e border-border/50 bg-card/50 shrink-0">
        <div className="p-3 border-b border-border/40">
          <button onClick={createSession} className="btn-teal w-full text-sm py-2">
            <Plus className="w-4 h-4" />{t('newChat')}
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {chatSessions.length === 0
            ? <p className="text-xs text-muted-foreground text-center p-4 mt-4">{t('noData')}</p>
            : chatSessions.map(session => (
              <div key={session.id}
                className={cn('w-full rounded-lg text-xs transition-colors group flex items-center gap-1',
                  activeChatId === session.id ? 'bg-primary/10 text-primary' : 'hover:bg-muted text-muted-foreground hover:text-foreground')}>
                <button onClick={() => setActiveChatId(session.id)}
                  className="flex-1 min-w-0 text-start px-3 py-2 flex items-start gap-2 rounded-lg">
                  <MessageSquare className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                  <span className="truncate flex-1">{session.title}</span>
                </button>
                <button onClick={() => deleteChatSession(session.id)}
                  aria-label={isAr ? 'حذف المحادثة' : 'Delete conversation'}
                  className="opacity-0 group-hover:opacity-100 focus:opacity-100 p-2 me-1 hover:text-destructive">
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
        </div>
        {!apiConfig.useCustomKey && (
          <div className="p-3 border-t border-border/40 space-y-1.5">
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>{isAr ? 'الاستخدام اليومي' : 'Daily usage'}</span>
              <span>{displayedUsage}/{DAILY_LIMIT}</span>
            </div>
            <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
              <motion.div className="h-full rounded-full"
                style={{ background: displayedUsage > DAILY_LIMIT * 0.8 ? '#EF4444' : '#2D7A84' }}
                animate={{ width: `${Math.min((displayedUsage / DAILY_LIMIT) * 100, 100)}%` }} />
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 flex flex-col min-w-0">
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
            <select value={selectedFileId} onChange={event => setSelectedFileId(event.target.value)}
              className="text-xs bg-muted border border-border rounded-lg px-3 py-1.5 appearance-none cursor-pointer pe-7">
              <option value="">{t('selectFile')}</option>
              {files.map(file => <option key={file.id} value={file.id}>{file.name}</option>)}
            </select>
            <ChevronDown className={cn('w-3 h-3 absolute top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none', isRTL ? 'left-2' : 'right-2')} />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4">
          {!activeSession ? (
            <div className="h-full flex flex-col items-center justify-center text-center gap-4">
              <motion.div animate={{ y: [0, -6, 0] }} transition={{ duration: 3, repeat: Infinity }}
                className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-teal"
                style={{ background: 'linear-gradient(135deg,#0B2428,#3E9AA6)' }}>
                <Bot className="w-8 h-8 text-white" />
              </motion.div>
              <div>
                <h3 className="font-display text-2xl mb-2">{t('chat')}</h3>
                <p className="text-sm text-muted-foreground max-w-xs" dir="auto">{t('chatWelcome')}</p>
              </div>

              <div className="grid grid-cols-2 gap-2 w-full max-w-xs mt-2">
                {VISUAL_CMDS.map(({ icon: Icon, ar, en, cmd }) => (
                  <button key={cmd} onClick={() => void sendMessage(cmd)}
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
                  <button key={cmd} onClick={() => void sendMessage(cmd)}
                    className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-muted/50 border border-border/50 text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-all text-start">
                    <Icon className="w-3.5 h-3.5 text-primary shrink-0" />
                    {isAr ? ar : en}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {activeSession.messages.map(message => <ChatMessage key={message.id} msg={message} isAr={isAr} />)}
              {loading && <TypingIndicator />}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

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

        <div className="p-4 border-t border-border/50 bg-card/40">
          <div className="flex gap-2 items-end">
            <textarea ref={textareaRef} value={input} onChange={event => setInput(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={hasKey ? t('chatPlaceholder') : (isAr ? 'أضف مفتاح API في الإعدادات...' : 'Add API key in Settings...')}
              disabled={loading} rows={1} dir="auto"
              className={cn('flex-1 resize-none rounded-xl px-4 py-2.5 text-sm bg-muted border border-border focus:outline-none focus:ring-2 focus:ring-primary/40 max-h-32 transition-colors', loading && 'opacity-60 cursor-wait')}
              style={{ minHeight: '44px' }}
              onInput={event => {
                const element = event.currentTarget
                element.style.height = 'auto'
                element.style.height = Math.min(element.scrollHeight, 128) + 'px'
              }}
              onClick={clearError}
            />
            <motion.button whileTap={{ scale: 0.92 }} onClick={() => void sendMessage()}
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
