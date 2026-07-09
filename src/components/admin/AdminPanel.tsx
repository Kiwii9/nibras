import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Shield, Zap, Bug, ToggleLeft, ToggleRight, FlaskConical,
  Terminal, AlertTriangle, Cpu, RefreshCw, Send
} from 'lucide-react'
import { useStore, useCurrentUser, useIsAdmin } from '@/store'
import { FEATURE_FLAGS, getFlags, setFlag } from '@/lib/features'
import { callLLM } from '@/lib/ai'
import { cn } from '@/lib/utils'

type AdminTab = 'flags' | 'prompt' | 'mock' | 'logs'

function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="glass-card rounded-xl p-4 border border-border/50">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className="font-display text-xl" style={{ color }}>{value}</p>
    </div>
  )
}

export function AdminPanel() {
  const isAdmin = useIsAdmin()
  const currentUser = useCurrentUser()
  const { lang, apiConfig } = useStore()
  const isAr = lang === 'ar'
  const [flags, setFlags] = useState(getFlags())
  const [activeTab, setActiveTab] = useState<AdminTab>('flags')

  // Prompt tester
  const [testPrompt, setTestPrompt] = useState('')
  const [testResponse, setTestResponse] = useState('')
  const [testLoading, setTestLoading] = useState(false)
  const [testTokens, setTestTokens] = useState<{ promptTokens?: number; completionTokens?: number } | null>(null)

  // Mock settings
  const [mockLatency, setMockLatency] = useState(800)
  const [mockResponse, setMockResponse] = useState('🧪 Mock response')
  const [mockFail, setMockFail] = useState(false)
  const [mockResult, setMockResult] = useState('')

  // Logs
  const [logs, setLogs] = useState<string[]>([])

  if (!isAdmin) {
    return (
      <div className="section-wrapper flex flex-col items-center justify-center min-h-96 text-center space-y-4">
        <Shield className="w-16 h-16 text-muted-foreground/30" />
        <h2 className="font-display text-2xl text-muted-foreground">{isAr ? 'غير مصرح' : 'Access Denied'}</h2>
        <p className="text-sm text-muted-foreground">{isAr ? 'هذه الصفحة للإدارة والمطورين فقط' : 'This page is for admins and developers only'}</p>
      </div>
    )
  }

  const toggleFlag = (key: string) => {
    const newVal = !flags[key]
    setFlag(key, newVal)
    setFlags(getFlags())
    addLog(`Flag "${key}" → ${newVal}`)
  }

  const addLog = (msg: string) => {
    const stamp = new Date().toLocaleTimeString()
    setLogs(l => [`[${stamp}] ${msg}`, ...l.slice(0, 99)])
  }

  const runPromptTest = async () => {
    if (!testPrompt.trim()) return
    setTestLoading(true); setTestResponse(''); setTestTokens(null)
    addLog(`Prompt test: "${testPrompt.slice(0, 40)}..."`)
    try {
      const res = await callLLM([{ role: 'user', content: testPrompt }], apiConfig, { maxTokens: 600 })
      setTestResponse(res.content)
      setTestTokens(res.usage ? { promptTokens: res.usage.promptTokens, completionTokens: res.usage.completionTokens } : null)
      addLog(`Response: ${res.content.slice(0, 60)}... | Tokens: ${res.usage?.completionTokens ?? '?'}`)
    } catch (err) {
      setTestResponse(`Error: ${String(err)}`)
      addLog(`Error: ${String(err)}`)
    }
    setTestLoading(false)
  }

  const runMockTest = async () => {
    setMockResult('')
    addLog(`Mock test | latency=${mockLatency}ms | fail=${mockFail}`)
    try {
      const res = await callLLM([{ role: 'user', content: 'test' }], apiConfig, { mock: true, mockLatency, mockResponse, mockFail })
      setMockResult(res.mock ? `✅ Mock: ${res.content}` : `Real: ${res.content}`)
    } catch (err) {
      setMockResult(`❌ Simulated failure: ${String(err)}`)
    }
  }

  const TABS: { id: AdminTab; icon: typeof ToggleRight; labelAr: string; labelEn: string }[] = [
    { id: 'flags',  icon: ToggleRight, labelAr: 'الميزات',   labelEn: 'Feature Flags' },
    { id: 'prompt', icon: Terminal,    labelAr: 'اختبار Prompt', labelEn: 'Prompt Tester' },
    { id: 'mock',   icon: FlaskConical, labelAr: 'المحاكاة',  labelEn: 'Mock / Simulate' },
    { id: 'logs',   icon: Bug,         labelAr: 'السجلات',   labelEn: 'Debug Logs' },
  ]

  const roleLabel = currentUser?.role ?? 'student'
  const modeLabel = roleLabel === 'developer'
    ? (isAr ? 'وضع المطور' : 'Developer Mode')
    : (isAr ? 'وضع الإدارة' : 'Admin Mode')

  return (
    <div className="section-wrapper space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
          <Shield className="w-5 h-5 text-amber-400" />
        </div>
        <div>
          <h1 className="font-display text-2xl">{isAr ? 'لوحة الإدارة' : 'Admin Panel'}</h1>
          <p className="text-xs text-muted-foreground">{isAr ? `مرحباً ${currentUser?.name} — ${modeLabel}` : `Welcome ${currentUser?.name} — ${modeLabel}`}</p>
        </div>
        <div className="ms-auto flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 px-3 py-1.5 rounded-lg">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
          <span className="text-xs text-amber-400 font-medium">{roleLabel}</span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard label={isAr ? 'الميزات المفعّلة' : 'Active Flags'} value={String(Object.values(flags).filter(Boolean).length)} color="#3E9AA6" />
        <StatCard label={isAr ? 'الدور' : 'Role'} value={roleLabel} color="#C9A84C" />
        <StatCard label={isAr ? 'الأحداث' : 'Log Events'} value={String(logs.length)} color="#56A86B" />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-muted/50 p-1 rounded-xl overflow-x-auto">
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={cn('flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all',
              activeTab === tab.id ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}>
            <tab.icon className="w-3.5 h-3.5" />
            {isAr ? tab.labelAr : tab.labelEn}
          </button>
        ))}
      </div>

      {/* Feature Flags */}
      {activeTab === 'flags' && (
        <div className="space-y-2">
          {FEATURE_FLAGS.map(flag => (
            <motion.div key={flag.key} layout
              className="glass-card rounded-xl p-4 flex items-center justify-between border border-border/50">
              <div className="flex-1 min-w-0 me-4">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold">{isAr ? flag.labelAr : flag.label}</p>
                  {flag.adminOnly && <span className="px-1.5 py-0.5 rounded-md bg-amber-500/15 text-amber-400 text-[10px] font-medium">Admin</span>}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 truncate">{flag.description}</p>
              </div>
              <button onClick={() => toggleFlag(flag.key)}
                className={cn('shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all',
                  flags[flag.key] ? 'bg-teal-500/20 text-teal-400 border border-teal-500/40' : 'bg-muted text-muted-foreground border border-border/50')}>
                {flags[flag.key] ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                {flags[flag.key] ? (isAr ? 'مفعّل' : 'ON') : (isAr ? 'معطّل' : 'OFF')}
              </button>
            </motion.div>
          ))}
        </div>
      )}

      {/* Prompt Tester */}
      {activeTab === 'prompt' && (
        <div className="space-y-4">
          <div className="glass-card rounded-xl p-4 space-y-3 border border-border/50">
            <label className="text-xs font-medium text-muted-foreground">{isAr ? 'اختبر أي prompt مباشرة' : 'Test any prompt directly'}</label>
            <textarea value={testPrompt} onChange={e => setTestPrompt(e.target.value)} rows={4}
              placeholder={isAr ? 'اكتب prompt هنا...' : 'Enter your prompt here...'}
              className="w-full px-3 py-2.5 rounded-xl bg-muted border border-border text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/40" />
            <button onClick={runPromptTest} disabled={testLoading}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-white text-sm font-semibold disabled:opacity-50">
              {testLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {isAr ? 'أرسل' : 'Send'}
            </button>
          </div>

          {testResponse && (
            <div className="glass-card rounded-xl p-4 space-y-2 border border-border/50">
              {testTokens && (
                <div className="flex gap-3 text-xs text-muted-foreground mb-2">
                  <span className="flex items-center gap-1"><Cpu className="w-3 h-3"/> Prompt: {testTokens.promptTokens ?? '?'}</span>
                  <span className="flex items-center gap-1"><Zap className="w-3 h-3"/> Completion: {testTokens.completionTokens ?? '?'}</span>
                </div>
              )}
              <pre className="text-xs text-foreground whitespace-pre-wrap font-mono bg-muted/50 p-3 rounded-lg max-h-64 overflow-auto">{testResponse}</pre>
            </div>
          )}
        </div>
      )}

      {/* Mock / Simulate */}
      {activeTab === 'mock' && (
        <div className="glass-card rounded-xl p-5 space-y-4 border border-border/50">
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">{isAr ? 'الرد الوهمي' : 'Mock Response Text'}</label>
              <input value={mockResponse} onChange={e => setMockResponse(e.target.value)}
                className="mt-1.5 w-full px-3 py-2 rounded-xl bg-muted border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">{isAr ? `تأخير مصطنع: ${mockLatency}ms` : `Simulated Latency: ${mockLatency}ms`}</label>
              <input type="range" min={0} max={5000} step={100} value={mockLatency} onChange={e => setMockLatency(Number(e.target.value))}
                className="w-full accent-teal-500 mt-1.5" />
            </div>
            <label className={cn('flex items-center gap-2.5 cursor-pointer p-3 rounded-xl border',
              mockFail ? 'border-destructive/40 bg-destructive/10' : 'border-border/50 bg-muted/30')}>
              <input type="checkbox" checked={mockFail} onChange={e => setMockFail(e.target.checked)} className="accent-destructive" />
              <span className="text-sm font-medium text-destructive">{isAr ? 'محاكاة فشل API' : 'Simulate API Failure'}</span>
            </label>
            <button onClick={runMockTest}
              className="w-full py-2.5 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-400 text-sm font-semibold hover:bg-amber-500/30 transition-colors">
              <FlaskConical className="w-4 h-4 inline me-2" />
              {isAr ? 'تشغيل الاختبار' : 'Run Mock Test'}
            </button>
            {mockResult && (
              <div className={cn('p-3 rounded-xl text-xs font-mono', mockResult.startsWith('✅') ? 'bg-teal-500/10 text-teal-400' : 'bg-destructive/10 text-destructive')}>
                {mockResult}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Debug Logs */}
      {activeTab === 'logs' && (
        <div className="glass-card rounded-xl border border-border/50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border/50 bg-muted/30">
            <div className="flex items-center gap-2 text-xs font-semibold"><Bug className="w-3.5 h-3.5 text-primary"/>{isAr ? 'سجل الأحداث' : 'Event Log'}</div>
            <button onClick={() => setLogs([])} className="text-xs text-muted-foreground hover:text-foreground">{isAr ? 'مسح' : 'Clear'}</button>
          </div>
          <div className="h-72 overflow-y-auto p-3 space-y-1 font-mono text-xs">
            {logs.length === 0
              ? <p className="text-muted-foreground text-center py-8">{isAr ? 'لا توجد أحداث بعد' : 'No events yet'}</p>
              : logs.map((l, i) => <p key={i} className="text-muted-foreground hover:text-foreground transition-colors">{l}</p>)}
          </div>
        </div>
      )}
    </div>
  )
}
