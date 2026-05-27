import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Send, Plus, Trash2, MessageSquare, Bot, User,
  AlertCircle, ChevronDown, Sparkles, Settings
} from 'lucide-react'
import { useStore, Message, ChatSession } from '@/store'
import { useT } from '@/hooks/useT'
import { callLLM, buildChatSystemPrompt } from '@/lib/ai'
import { cn } from '@/lib/utils'
import { Link } from 'react-router-dom'

// ─── Friendly error mapper — never exposes raw API errors ─────────────────────
function friendlyError(raw: string, isAr: boolean): string {
  const msg = raw.toLowerCase()
  if (msg.includes('401') || msg.includes('unauthorized') || msg.includes('missing authentication') || msg.includes('authentication')) {
    return isAr
      ? 'مفتاح API غير صحيح أو مفقود. تحقق من إعداداته في الإعدادات.'
      : 'Invalid or missing API key. Please check your API key in Settings.'
  }
  if (msg.includes('429') || msg.includes('rate limit') || msg.includes('too many')) {
    return isAr
      ? 'تم تجاوز حد الطلبات. انتظر لحظة ثم حاول مجدداً.'
      : 'Rate limit reached. Please wait a moment and try again.'
  }
  if (msg.includes('network') || msg.includes('fetch') || msg.includes('failed to fetch')) {
    return isAr
      ? 'خطأ في الاتصال بالإنترنت. تحقق من اتصالك وحاول مجدداً.'
      : 'Network error. Please check your connection and try again.'
  }
  if (msg.includes('api key not configured') || msg.includes('please add')) {
    return isAr
      ? 'يرجى إضافة مفتاح API في الإعدادات أولاً.'
      : 'Please add your API key in Settings first.'
  }
  return isAr
    ? 'المساعد غير متاح مؤقتاً. يرجى المحاولة لاحقاً.'
    : 'The assistant is temporarily unavailable. Please try again later.'
}

function TypingIndicator() {
  return (
    <div className="flex items-end gap-2 mb-4">
      <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
        style={{ background: 'linear-gradient(135deg,#1A4D53,#3E9AA6)' }}>
        <Bot className="w-3.5 h-3.5 text-white" />
      </div>
      <div className="chat-bubble-ai px-4 py-3">
        <div className="flex gap-1 items-center">
          {[0, 1, 2].map(i => (
            <motion.div key={i} className="w-1.5 h-1.5 rounded-full bg-primary/60"
              animate={{ y: [0, -4, 0] }}
              transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }} />
          ))}
        </div>
      </div>
    </div>
  )
}

function ChatMessage({ msg }: { msg: Message }) {
  const isUser = msg.role === 'user'
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className={cn('flex items-end gap-2 mb-4', isUser && 'flex-row-reverse')}>
      <div className={cn('w-7 h-7 rounded-full flex items-center justify-center shrink-0', isUser ? 'bg-muted' : '')}
        style={!isUser ? { background: 'linear-gradient(135deg,#1A4D53,#3E9AA6)' } : {}}>
        {isUser ? <User className="w-3.5 h-3.5 text-muted-foreground" /> : <Bot className="w-3.5 h-3.5 text-white" />}
      </div>
      <div className={isUser ? 'chat-bubble-user' : 'chat-bubble-ai'}>
        <p className="text-sm leading-relaxed whitespace-pre-wrap" dir="auto">{msg.content}</p>
        <p className="text-[10px] mt-1 opacity-40">
          {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
    </motion.div>
  )
}

export function Chatbot() {
  const { t, lang, isRTL } = useT()
  const { files, chatSessions, activeChatId, apiConfig,
    addChatSession, updateChatSession, setActiveChatId, deleteChatSession } = useStore()

  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [selectedFileId, setSelectedFileId] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const activeSession = chatSessions.find(s => s.id === activeChatId) ?? null
  const hasApiKey = !!apiConfig.apiKey

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [activeSession?.messages, loading])

  const createSession = () => {
    const s: ChatSession = {
      id: `chat-${Date.now()}`,
      title: lang === 'ar' ? 'محادثة جديدة' : 'New Chat',
      messages: [],
      fileIds: selectedFileId ? [selectedFileId] : [],
      createdAt: new Date().toISOString(),
    }
    addChatSession(s)
  }

  const sendMessage = async () => {
    if (!input.trim() || loading) return
    setError('')

    if (!hasApiKey) {
      setError(lang === 'ar'
        ? 'يرجى إضافة مفتاح API في الإعدادات أولاً.'
        : 'Please add your API key in Settings first.')
      return
    }

    const userMsg: Message = {
      id: `msg-${Date.now()}`, role: 'user',
      content: input.trim(), timestamp: new Date().toISOString(),
    }

    let session = activeSession
    if (!session) {
      session = {
        id: `chat-${Date.now()}`,
        title: input.trim().slice(0, 40),
        messages: [], fileIds: selectedFileId ? [selectedFileId] : [],
        createdAt: new Date().toISOString(),
      }
      addChatSession(session)
    }

    const newMessages = [...session.messages, userMsg]
    updateChatSession(session.id, newMessages)
    setInput('')
    setLoading(true)

    try {
      const ctx = files.find(f => f.id === selectedFileId)?.content ?? ''
      const llmMessages = [
        { role: 'system' as const, content: buildChatSystemPrompt(ctx, lang) },
        ...newMessages.slice(-10).map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
      ]
      const response = await callLLM(llmMessages, apiConfig, { maxTokens: 800 })
      const assistantMsg: Message = {
        id: `msg-${Date.now()}`, role: 'assistant',
        content: response.content, timestamp: new Date().toISOString(),
      }
      updateChatSession(session.id, [...newMessages, assistantMsg])
    } catch (err: any) {
      // ── KEY FIX: never show raw API errors ──
      console.error('RAW ERROR:', err)
      setError(friendlyError(err?.message ?? '', lang === 'ar'))
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
              <motion.div animate={{ y: [0, -6, 0] }} transition={{ duration: 3, repeat: Infinity }}
                className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-teal"
                style={{ background: 'linear-gradient(135deg,#0B2428,#3E9AA6)' }}>
                <Bot className="w-8 h-8 text-white" />
              </motion.div>
              <div>
                <h3 className="font-display text-2xl mb-2">{t('chat')}</h3>
                <p className="text-sm text-muted-foreground max-w-xs" dir="auto">{t('chatWelcome')}</p>
              </div>
              {!hasApiKey && (
                <div className="flex items-center gap-2 text-xs text-amber-500 bg-amber-500/10 px-4 py-2.5 rounded-xl border border-amber-500/20">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{lang === 'ar' ? 'لا يوجد مفتاح API — ' : 'No API key — '}</span>
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
            <div className="h-full flex items-center justify-center">
              <p className="text-muted-foreground text-sm text-center" dir="auto">{t('chatWelcome')}</p>
            </div>
          ) : (
            <>
              {activeSession.messages.map(msg => <ChatMessage key={msg.id} msg={msg} />)}
              {loading && <TypingIndicator />}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Error — friendly, never raw */}
        <AnimatePresence>
          {error && (
            <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="mx-4 mb-2 flex items-start gap-2 text-xs bg-destructive/10 text-destructive px-3 py-2.5 rounded-xl border border-destructive/20">
              <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              <span className="flex-1" dir="auto">{error}</span>
              {(error.includes('API') || error.includes('مفتاح')) && (
                <Link to="/settings" className="underline font-semibold shrink-0 hover:opacity-80">{t('settings')}</Link>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Input */}
        <div className="p-4 border-t border-border/50 bg-card/40">
          <div className="flex gap-2 items-end">
            <textarea ref={textareaRef} value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={hasApiKey ? t('chatPlaceholder') : (lang === 'ar' ? 'أضف مفتاح API في الإعدادات...' : 'Add API key in Settings...')}
              disabled={loading} rows={1} dir="auto"
              className={cn('flex-1 resize-none rounded-xl px-4 py-2.5 text-sm bg-muted border border-border focus:outline-none focus:ring-2 focus:ring-primary/40 max-h-32 transition-colors', loading && 'opacity-60 cursor-wait')}
              style={{ minHeight: '44px' }}
              onInput={e => { const el = e.currentTarget; el.style.height = 'auto'; el.style.height = Math.min(el.scrollHeight, 128) + 'px' }}
            />
            <motion.button whileTap={{ scale: 0.92 }} onClick={sendMessage}
              disabled={!input.trim() || loading}
              className={cn('w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-all',
                input.trim() && !loading ? 'btn-teal' : 'bg-muted text-muted-foreground cursor-not-allowed opacity-50')}>
              <Send className={cn('w-4 h-4', isRTL && 'rtl-flip')} />
            </motion.button>
          </div>
          <p className="text-[10px] text-muted-foreground text-center mt-2">↵ {lang === 'ar' ? 'إدخال للإرسال · Shift+Enter لسطر جديد' : 'Enter to send · Shift+Enter for new line'}</p>
        </div>
      </div>
    </div>
  )
}
