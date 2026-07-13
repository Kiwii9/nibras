import { useStore } from '@/store'

const STORE_KEY = 'nibras-v3'

export function scrubLegacyBrowserSecrets() {
  try {
    const raw = localStorage.getItem(STORE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as { state?: Record<string, unknown>; version?: number }
      const state = parsed.state ?? {}
      if ('apiConfig' in state) {
        state.apiConfig = {
          provider: 'openrouter',
          apiKey: '',
          model: 'tencent/hy3',
          useCustomKey: false,
        }
        localStorage.setItem(STORE_KEY, JSON.stringify({ ...parsed, state }))
      }
    }
  } catch {
    localStorage.removeItem(STORE_KEY)
  }

  useStore.setState({
    apiConfig: {
      provider: 'openrouter',
      apiKey: '',
      model: 'tencent/hy3',
      useCustomKey: false,
    },
  })
}
