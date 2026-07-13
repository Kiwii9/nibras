// Nibras production health endpoint.
// Safe to call from a browser: does not expose secret values.

exports.handler = async (event) => {
  if (event.httpMethod !== 'GET') {
    return json(405, { ok: false, error: 'method_not_allowed' })
  }

  const publicSiteUrl = process.env.PUBLIC_SITE_URL || ''
  const allowedOrigin = process.env.ALLOWED_ORIGIN || ''
  const aiProvider = String(process.env.AI_PROVIDER || 'openrouter').toLowerCase()
  const openRouterModel = process.env.OPENROUTER_MODEL || ''

  return json(200, {
    ok: true,
    service: 'nibras',
    timestamp: new Date().toISOString(),
    env: {
      publicSiteUrlConfigured: Boolean(publicSiteUrl),
      allowedOriginConfigured: Boolean(allowedOrigin),
      aiProvider,
      openRouterModelConfigured: Boolean(openRouterModel),
      openRouterKeyConfigured: Boolean(process.env.OPENROUTER_API_KEY),
      groqKeyConfigured: Boolean(process.env.GROQ_API_KEY),
      geminiKeyConfigured: Boolean(process.env.GEMINI_API_KEY),
      supabaseUrlConfigured: Boolean(process.env.VITE_SUPABASE_URL),
      supabasePublishableKeyConfigured: Boolean(process.env.VITE_SUPABASE_PUBLISHABLE_KEY),
    },
    limits: {
      dailyIpLimit: Number(process.env.AI_DAILY_IP_LIMIT || 25),
      maxMessages: Number(process.env.AI_MAX_MESSAGES || 16),
      maxPromptChars: Number(process.env.AI_MAX_PROMPT_CHARS || 12000),
      maxOutputTokens: Number(process.env.AI_MAX_OUTPUT_TOKENS || 1800),
    },
  })
}

function json(statusCode, payload) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }
}
