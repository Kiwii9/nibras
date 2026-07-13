import { CheckCircle, Cpu, Globe, Moon, Palette, Server, ShieldCheck, Sun } from 'lucide-react'
import { useStore } from '@/store'
import { useT } from '@/hooks/useT'
import { cn } from '@/lib/utils'

function Section({ title, icon: Icon, children }: { title: string; icon: typeof Globe; children: React.ReactNode }) {
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
  const { t, lang } = useT()
  const isAr = lang === 'ar'
  const { theme, setTheme, setLang } = useStore()

  return (
    <div className="section-wrapper max-w-2xl space-y-6">
      <div>
        <h1 className="font-display text-3xl text-foreground">{t('settingsTitle')}</h1>
        <p className="text-muted-foreground text-sm mt-1">{isAr ? 'اضبط تجربة نِبْرَاس الآمنة' : 'Configure your secure Nibras experience'}</p>
      </div>

      <Section title={t('languageSettings')} icon={Globe}>
        <div className="grid grid-cols-2 gap-3">
          {(['ar', 'en'] as const).map(language => (
            <button key={language} onClick={() => setLang(language)}
              className={cn('flex items-center gap-3 p-4 rounded-xl border transition-all',
                lang === language ? 'border-primary bg-primary/10' : 'border-border/60 hover:bg-muted')}>
              <span className="text-xl">{language === 'ar' ? '🇸🇦' : '🇬🇧'}</span>
              <div className="text-start">
                <p className="text-sm font-semibold">{language === 'ar' ? 'العربية' : 'English'}</p>
                <p className="text-xs text-muted-foreground">{language === 'ar' ? 'Right-to-Left' : 'Left-to-Right'}</p>
              </div>
              {lang === language && <CheckCircle className="w-4 h-4 text-primary ms-auto" />}
            </button>
          ))}
        </div>
      </Section>

      <Section title={t('themeSettings')} icon={Palette}>
        <div className="grid grid-cols-2 gap-3">
          {(['dark', 'light'] as const).map(selectedTheme => (
            <button key={selectedTheme} onClick={() => setTheme(selectedTheme)}
              className={cn('flex items-center gap-3 p-4 rounded-xl border transition-all',
                theme === selectedTheme ? 'border-primary bg-primary/10' : 'border-border/60 hover:bg-muted')}>
              {selectedTheme === 'dark' ? <Moon className="w-5 h-5 text-primary/70" /> : <Sun className="w-5 h-5 text-gold" />}
              <div className="text-start">
                <p className="text-sm font-semibold">{t(`${selectedTheme}Mode` as any)}</p>
                <p className="text-xs text-muted-foreground">{selectedTheme === 'dark' ? 'Deep Teal' : 'Clean & Bright'}</p>
              </div>
              {theme === selectedTheme && <CheckCircle className="w-4 h-4 text-primary ms-auto" />}
            </button>
          ))}
        </div>
      </Section>

      <Section title={isAr ? 'الذكاء الاصطناعي' : 'AI service'} icon={Cpu}>
        <div className="space-y-4">
          <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/10 p-4 flex items-start gap-3">
            <Server className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-sm">{isAr ? 'مزود مُدار من الخادم' : 'Server-managed provider'}</p>
              <p className="text-xs text-muted-foreground leading-relaxed mt-1">
                {isAr
                  ? 'تُدار مفاتيح المزود داخل Netlify Functions ولا يطلب نِبْرَاس من الطلاب لصق مفاتيح شخصية في المتصفح.'
                  : 'Provider credentials are managed inside Netlify Functions. Nibras does not ask students to paste personal API keys into the browser.'}
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-muted/40 p-4 flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            <div className="text-xs text-muted-foreground leading-relaxed space-y-1">
              <p>{isAr ? '• الاستخدام يتطلب جلسة تسجيل دخول صالحة.' : '• AI use requires a valid signed-in session.'}</p>
              <p>{isAr ? '• تُطبق حدود يومية وحدود اندفاع لحماية الخدمة والتكلفة.' : '• Daily and burst limits protect availability and cost.'}</p>
              <p>{isAr ? '• لا تحفظ الواجهة مفاتيح API للمستخدم في Local Storage.' : '• The interface does not store user API keys in Local Storage.'}</p>
            </div>
          </div>
        </div>
      </Section>
    </div>
  )
}
