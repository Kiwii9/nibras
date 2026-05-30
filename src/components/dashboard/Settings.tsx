import { useState } from 'react'
import { motion } from 'framer-motion'
import { Key, Globe, Palette, Cpu, CheckCircle, Eye, EyeOff, ExternalLink, Sun, Moon, Coffee, Server, ToggleLeft, ToggleRight } from 'lucide-react'
import { useStore, ApiConfig } from '@/store'
import { useT } from '@/hooks/useT'
import { cn } from '@/lib/utils'

const FREE_MODELS = [
  { provider: 'openrouter', model: 'openrouter/free', label: 'OpenRouter Free Router', url: 'https://openrouter.ai/keys' },
  { provider: 'openrouter', model: 'google/gemma-2-9b-it:free', label: 'Gemma 2 9B (Free · OpenRouter)', url: 'https://openrouter.ai/keys' },
  { provider: 'openrouter', model: 'qwen/qwen-2.5-7b-instruct:free', label: 'Qwen 2.5 7B (Free · OpenRouter)', url: 'https://openrouter.ai/keys' },
  { provider: 'openrouter', model: 'deepseek/deepseek-r1:free', label: 'DeepSeek R1 (Free · OpenRouter)', url: 'https://openrouter.ai/keys' },
  { provider: 'gemini', model: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash (Free · Google AI Studio)', url: 'https://aistudio.google.com/app/apikey' },
]

const PROVIDERS = [
  { value: 'openrouter', label: 'OpenRouter', url: 'https://openrouter.ai/keys' },
  { value: 'gemini',     label: 'Google Gemini', url: 'https://aistudio.google.com/app/apikey' },
  { value: 'openai',     label: 'OpenAI', url: 'https://platform.openai.com/api-keys' },
]

function Section({ title, icon: Icon, children }: { title: string; icon: any; children: React.ReactNode }) {
  return (
    <div className="glass-card rounded-2xl overflow-hidden">
      <div className="flex items-center gap-2.5 px-5 py-4 border-b border-border/50 bg-muted/30">
        <Icon className="w-4 h-4 text-primary" />
        <h3 className="font-semibold text-sm">{title}</h3>
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}

export function SettingsPage() {
  const { t, lang, isRTL } = useT()
  const isAr = lang === 'ar'
  const { theme, setTheme, setLang, apiConfig, setApiConfig } = useStore()
  const [config, setConfig] = useState<ApiConfig>({ ...apiConfig })
  const [showKey, setShowKey] = useState(false)
  const [saved, setSaved] = useState(false)
  const usesCustomKey = config.useCustomKey ?? false

  const save = () => {
    setApiConfig(config)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  return (
    <div className="section-wrapper max-w-2xl space-y-6">
      <div>
        <h1 className="font-display text-3xl text-foreground">{t('settingsTitle')}</h1>
        <p className="text-muted-foreground text-sm mt-1">{isAr ? 'اضبط تجربتك في نِبْرَاس' : 'Configure your Nibras experience'}</p>
      </div>

      {/* Language */}
      <Section title={t('languageSettings')} icon={Globe}>
        <div className="grid grid-cols-2 gap-3">
          {(['ar', 'en'] as const).map(l => (
            <button key={l} onClick={() => setLang(l)}
              className={cn('flex items-center gap-3 p-4 rounded-xl border transition-all',
                lang === l ? 'border-primary bg-primary/10' : 'border-border/60 hover:bg-muted')}>
              <span className="text-xl">{l === 'ar' ? '🇸🇦' : '🇬🇧'}</span>
              <div className="text-start">
                <p className="text-sm font-semibold">{l === 'ar' ? 'العربية' : 'English'}</p>
                <p className="text-xs text-muted-foreground">{l === 'ar' ? 'Right-to-Left' : 'Left-to-Right'}</p>
              </div>
              {lang === l && <CheckCircle className="w-4 h-4 text-primary ms-auto" />}
            </button>
          ))}
        </div>
      </Section>

      {/* Theme */}
      <Section title={t('themeSettings')} icon={Palette}>
        <div className="grid grid-cols-2 gap-3">
          {(['dark', 'light'] as const).map(th => (
            <button key={th} onClick={() => setTheme(th)}
              className={cn('flex items-center gap-3 p-4 rounded-xl border transition-all',
                theme === th ? 'border-primary bg-primary/10' : 'border-border/60 hover:bg-muted')}>
              {th === 'dark' ? <Moon className="w-5 h-5 text-primary/70" /> : <Sun className="w-5 h-5 text-gold" />}
              <div className="text-start">
                <p className="text-sm font-semibold">{t(`${th}Mode` as any)}</p>
                <p className="text-xs text-muted-foreground">{th === 'dark' ? 'Deep Teal Royal' : 'Clean & Bright'}</p>
              </div>
              {theme === th && <CheckCircle className="w-4 h-4 text-primary ms-auto" />}
            </button>
          ))}
        </div>
      </Section>

      {/* AI Settings */}
      <Section title={t('apiSettings')} icon={Cpu}>
        <div className="space-y-4">
          {/* 401 fix explanation */}
          <div className="bg-amber-500/8 border border-amber-500/20 rounded-xl p-4 text-xs text-amber-600 dark:text-amber-400 leading-relaxed">
            <p className="font-semibold mb-1">
              {isAr ? '⚠️ تصحيح خطأ 401 — كيف يعمل؟' : '⚠️ 401 Error Fix — How it works'}
            </p>
            <p>
              {isAr
                ? 'إذا ظهر خطأ المصادقة، فهذا يعني أن مفتاح API غير صحيح أو مفقود. أضف المفتاح أدناه وسيُستخدم آمناً من جهازك فقط — لا يُرسل لأي خادم خارجي.'
                : 'If you see an auth error, your API key is missing or invalid. Add it below — it\'s used securely from your device only, never sent to any external server.'}
            </p>
          </div>

          {/* Free models */}
          <div className="bg-teal-500/8 border border-teal-500/20 rounded-xl p-4">
            <p className="text-xs font-semibold text-primary mb-3">{t('freeModels')}</p>
            <div className="space-y-1.5">
              {FREE_MODELS.map(m => (
                <button key={m.model} onClick={() => setConfig(c => ({ ...c, provider: m.provider as any, model: m.model }))}
                  className={cn('w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-start transition-colors',
                    config.model === m.model ? 'bg-primary/15 text-primary' : 'hover:bg-muted text-muted-foreground hover:text-foreground')}>
                  <span className="flex-1">{m.label}</span>
                  {config.model === m.model && <CheckCircle className="w-3.5 h-3.5 shrink-0" />}
                  <a href={m.url} target="_blank" rel="noopener noreferrer"
                    onClick={e => e.stopPropagation()} className="hover:text-primary">
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </button>
              ))}
            </div>
          </div>

          {/* Provider */}
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">{t('apiProvider')}</label>
            <select value={config.provider} onChange={e => setConfig(c => ({ ...c, provider: e.target.value as any }))}
              className="w-full px-3 py-2.5 text-sm rounded-xl bg-muted border border-border">
              {PROVIDERS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
            <a href={PROVIDERS.find(p => p.value === config.provider)?.url} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-primary mt-1.5 hover:underline">
              {isAr ? 'احصل على مفتاح مجاني' : 'Get free API key'} <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          {/* API Key */}
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">{t('apiKey')}</label>
            <div className="relative">
              <input type={showKey ? 'text' : 'password'} value={config.apiKey}
                onChange={e => setConfig(c => ({ ...c, apiKey: e.target.value }))}
                placeholder="sk-or-... your API key" dir="ltr"
                className={cn('w-full px-3 py-2.5 text-sm rounded-xl bg-muted border border-border', isRTL ? 'pl-10' : 'pr-10')} />
              <button onClick={() => setShowKey(v => !v)}
                className={cn('absolute top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground', isRTL ? 'left-2.5' : 'right-2.5')}>
                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-[10px] text-muted-foreground mt-1.5 flex items-center gap-1">
              <Key className="w-3 h-3" />{t('apiKeyHint')}
            </p>
          </div>

          {/* Model */}
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">{t('modelName')}</label>
            <input value={config.model} onChange={e => setConfig(c => ({ ...c, model: e.target.value }))}
              placeholder="e.g. openrouter/free" dir="ltr"
              className="w-full px-3 py-2.5 text-sm rounded-xl bg-muted border border-border" />
          </div>
        </div>
      </Section>

      <motion.button whileTap={{ scale: 0.97 }} onClick={save}
        className={cn('btn-teal w-full py-3 text-base', saved && 'opacity-90')}>
        {saved ? <><CheckCircle className="w-5 h-5" />{t('success')}</> : t('saveSettings')}
      </motion.button>

      {/* Developer credit footer */}
      <div className="text-center py-4 border-t border-border/40">
        <p className="text-xs text-muted-foreground mb-2">
          تم تطويره من قبل KIWI | محمد حمدي
        </p>
        <a href="https://ko-fi.com" target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-sm font-medium text-[#FF5E5B] hover:underline">
          <Coffee className="w-4 h-4" />
          {isAr ? 'ادعم المطوّر على Ko-fi' : 'Support developer on Ko-fi'}
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>
    </div>
  )
}
