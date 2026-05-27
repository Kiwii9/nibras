import { useStore } from '@/store'
import { translations, TranslationKey } from '@/i18n/translations'

export function useT() {
  const lang = useStore((s) => s.lang)
  const t = (key: TranslationKey): string => translations[lang][key] ?? translations['en'][key] ?? key
  return { t, lang, isRTL: lang === 'ar' }
}
