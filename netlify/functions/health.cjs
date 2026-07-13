// Nibras production health endpoint.
// Safe to call publicly: reports booleans and non-secret configuration only.

exports.handler = async event => {
  if (event.httpMethod !== 'GET') return json(405, { ok: false, error: 'method_not_allowed' })

  const publicSiteUrl = process.env.PUBLIC_SITE_URL || ''
  const allowedOrigin = process.env.ALLOWED_ORIGIN || ''
  const aiProvider = String(process.env.AI_PROVIDER || 'openrouter').toLowerCase()
  const openRouterModel = process.env.OPENROUTER_MODEL || ''
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || ''
  const supabasePublishableKey = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || ''

  return json(200, {
    ok: true,
    service: 'nibras',
    release: 'hardened-controlled-beta',
    timestamp: new Date().toISOString(),
    capabilities: {
      authenticatedAiRequired: true,
      browserSuppliedAiKeysDisabled: true,
      atomicBurstLimit: true,
      atomicDailyLimit: true,
      persistentUsageAudit: true,
      mandatoryPolicyConsent: true,
      accountScopedDrafts: true,
      roleProtectedAdminRoute: true,
      lexicalRagRetrieval: true,
      promptInjectionGuardrails: true,
      truthfulFileExtractionStatus: true,
      clientErrorLogging: true,
      publicLegalPages: true,
      productionSmokeTests: true,
      codeQlEnabled: true,
      dependabotEnabled: true,
    },
    env: {
      publicSiteUrlConfigured: Boolean(publicSiteUrl),
      allowedOriginConfigured: Boolean(allowedOrigin),
      aiProvider,
      openRouterModel,
      openRouterModelConfigured: Boolean(openRouterModel),
      openRouterKeyConfigured: Boolean(process.env.OPENROUTER_API_KEY),
      groqKeyConfigured: Boolean(process.env.GROQ_API_KEY),
      geminiKeyConfigured: Boolean(process.env.GEMINI_API_KEY),
      supabaseUrlConfigured: Boolean(supabaseUrl),
      supabasePublishableKeyConfigured: Boolean(supabasePublishableKey),
    },
    limits: {
      burstRequestsPerMinute: 12,
      dailyRequestsPerUser: 25,
      maxMessages: Number(process.env.AI_MAX_MESSAGES || 16),
      maxPromptChars: Number(process.env.AI_MAX_PROMPT_CHARS || 12000),
      maxOutputTokens: Number(process.env.AI_MAX_OUTPUT_TOKENS || 1800),
      maxResourceFileBytes: 10 * 1024 * 1024,
      maxPastedNoteChars: 100000,
    },
    manualReleaseControls: {
      captchaConfiguredInSupabaseDashboard: 'not_verified',
      leakedPasswordProtection: 'not_verified',
      databaseBackupPlan: 'not_verified',
      providerCredentialRotated: 'not_verified',
    },
  })
}

function json(statusCode, payload) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    },
    body: JSON.stringify(payload),
  }
}
