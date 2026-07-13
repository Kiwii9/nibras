import { useStore } from '@/store'

const STORE_KEY = 'nibras-v3'
const DRAFT_OWNER_KEY = 'nibras_draft_owner'

const safeApiConfig = {
  provider: 'openrouter' as const,
  apiKey: '',
  model: 'tencent/hy3',
  useCustomKey: false,
}

export function scrubLegacyBrowserSecrets() {
  const hasDraftOwner = Boolean(localStorage.getItem(DRAFT_OWNER_KEY))
  let clearUnownedDrafts = !hasDraftOwner

  try {
    const raw = localStorage.getItem(STORE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as { state?: Record<string, unknown>; version?: number }
      const state = parsed.state ?? {}
      state.apiConfig = safeApiConfig

      if (clearUnownedDrafts) {
        state.files = []
        state.resourceFolders = []
        state.chatSessions = []
        state.activeChatId = null
        state.quizSessions = []
        state.activeQuizId = null
        state.exams = []
        state.studyPlan = []
        state.dailyMessageCount = 0
        state.lastMessageDate = ''
      }

      localStorage.setItem(STORE_KEY, JSON.stringify({ ...parsed, state }))
    }
  } catch {
    localStorage.removeItem(STORE_KEY)
    clearUnownedDrafts = true
  }

  useStore.setState({
    apiConfig: safeApiConfig,
    ...(clearUnownedDrafts
      ? {
          files: [],
          resourceFolders: [],
          chatSessions: [],
          activeChatId: null,
          quizSessions: [],
          activeQuizId: null,
          exams: [],
          studyPlan: [],
          dailyMessageCount: 0,
          lastMessageDate: '',
        }
      : {}),
  })
}
