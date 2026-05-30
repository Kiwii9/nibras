// ─── Feature Flags ─────────────────────────────────────────────────────────────
// Central registry — admin can toggle these at runtime from /admin panel

export interface FeatureFlag {
  key: string
  label: string
  labelAr: string
  description: string
  defaultValue: boolean
  adminOnly: boolean
}

export const FEATURE_FLAGS: FeatureFlag[] = [
  { key: 'aiTutorMode',      label: 'AI Tutor Mode',         labelAr: 'وضع المعلم الذكي',         description: 'Socratic tutoring personality instead of generic assistant', defaultValue: true,  adminOnly: false },
  { key: 'visualLearning',   label: 'Visual Learning',       labelAr: 'التعلم البصري',             description: 'Mind maps, diagrams, and visual explanations in chat',       defaultValue: true,  adminOnly: false },
  { key: 'ambientNoise',     label: 'Ambient Noise',         labelAr: 'الأصوات المحيطية',          description: 'Background study sounds (white, brown, green, pink noise)',  defaultValue: true,  adminOnly: false },
  { key: 'animatedBg',       label: 'Animated Background',   labelAr: 'خلفية متحركة',              description: 'Subtle floating particles and ambient animations',           defaultValue: true,  adminOnly: false },
  { key: 'messageLimits',    label: 'Message Limits',        labelAr: 'حدود الرسائل',              description: 'Enforce daily message limits for regular users',             defaultValue: false, adminOnly: true  },
  { key: 'platformApiKey',   label: 'Platform API Key',      labelAr: 'مفتاح المنصة',              description: 'Route all requests through platform-managed Netlify proxy', defaultValue: true,  adminOnly: false },
  { key: 'adminPanel',       label: 'Admin Panel',           labelAr: 'لوحة الإدارة',              description: 'Show /admin route for role=admin users',                    defaultValue: true,  adminOnly: true  },
  { key: 'mockResponses',    label: 'Mock AI Responses',     labelAr: 'ردود وهمية',                description: 'Return fake AI responses for testing (admin only)',          defaultValue: false, adminOnly: true  },
  { key: 'debugLogs',        label: 'Debug Logs',            labelAr: 'سجلات التطوير',             description: 'Show token counts, prompt inspection, and API diagnostics',  defaultValue: false, adminOnly: true  },
]

// Runtime storage key
const FLAGS_KEY = 'nibras-feature-flags'

export function getFlags(): Record<string, boolean> {
  const defaults = Object.fromEntries(FEATURE_FLAGS.map(f => [f.key, f.defaultValue]))
  try {
    const stored = localStorage.getItem(FLAGS_KEY)
    if (stored) return { ...defaults, ...JSON.parse(stored) }
  } catch {}
  return defaults
}

export function setFlag(key: string, value: boolean) {
  const current = getFlags()
  current[key] = value
  localStorage.setItem(FLAGS_KEY, JSON.stringify(current))
}

export function isEnabled(key: string): boolean {
  return getFlags()[key] ?? false
}
