// Nibras authenticated AI proxy.
// Provider credentials remain server-side. All real and diagnostic requests require
// a valid Supabase session; public AI calls are protected by atomic per-user limits.

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'
const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models'

const MAX_MESSAGES = Number(process.env.AI_MAX_MESSAGES || 16)
const MAX_PROMPT_CHARS = Number(process.env.AI_MAX_PROMPT_CHARS || 12000)
const MAX_OUTPUT_TOKENS = Number(process.env.AI_MAX_OUTPUT_TOKENS || 1800)
const ALLOWED_FEATURES = new Set(['chat', 'quiz_generation', 'semantic_grading', 'visual_generation'])
const ALLOWED_ROLES = new Set(['user', 'assistant', 'system'])
const ADMIN_ROLES = new Set(['admin', 'developer'])
const SITE_ORIGIN = process.env.ALLOWED_ORIGIN || process.env.PUBLIC_SITE_URL || 'https://nibras-tutor.netlify.app'

const CORS = {
  'Access-Control-Allow-Origin': SITE_ORIGIN,
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store',
  Vary: 'Origin',
}

exports.handler = async event => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: CORS, body: '' }
  if (event.httpMethod !== 'POST') return json(405, { error: 'method_not_allowed', message: 'Only POST requests are allowed.' })

  let body
  try {
    body = JSON.parse(event.body || '{}')
  } catch {
    return json(400, { error: 'invalid_json', message: 'Invalid request body.' })
  }

  const validated = validateMessages(body.messages)
  if (!validated.ok) return json(validated.statusCode, { error: validated.error, message: validated.message })

  const auth = await authenticateUser(event)
  if (!auth.ok) return json(auth.statusCode, { error: auth.error, message: auth.message })

  if (body.useCustomKey === true || body.customKey || body.customProvider || body.customModel) {
    return json(400, {
      error: 'custom_keys_disabled',
      message: 'Browser-supplied AI keys are disabled. Nibras uses a server-managed provider.',
    })
  }

  if (body.mock === true) {
    const role = await getProfileRole(auth.accessToken, auth.user.id)
    if (!ADMIN_ROLES.has(role)) {
      return json(403, { error: 'admin_required', message: 'Developer diagnostics require an admin or developer role.' })
    }

    await new Promise(resolve => setTimeout(resolve, clampNumber(body.mockLatency || 250, 0, 2000)))
    if (body.mockFail) return json(500, { error: 'mock_failure', message: 'Simulated diagnostic failure.' })
    return json(200, {
      content: cleanText(body.mockResponse || '🧪 Developer diagnostic response.', 1000),
      usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
      mock: true,
    })
  }

  const burst = await consumeRateLimit(auth.accessToken, 'ai_burst')
  if (!burst.ok) {
    return json(503, { error: 'rate_limit_service_unavailable', message: 'Request limits could not be verified safely. Try again shortly.' })
  }
  if (!burst.allowed) {
    return json(429, {
      error: 'rate_limit',
      message: 'Too many AI requests. Wait before trying again.',
      limit: burst.limit,
      remaining: burst.remaining,
      reset: burst.reset_at,
    })
  }

  const daily = await consumeRateLimit(auth.accessToken, 'ai_daily')
  if (!daily.ok) {
    return json(503, { error: 'rate_limit_service_unavailable', message: 'Daily limits could not be verified safely. Try again shortly.' })
  }
  if (!daily.allowed) {
    return json(429, {
      error: 'rate_limit',
      message: 'Daily beta AI limit reached. Try again tomorrow.',
      limit: daily.limit,
      remaining: daily.remaining,
      reset: daily.reset_at,
    })
  }

  const maxTokens = clampNumber(body.max_tokens || 1200, 64, MAX_OUTPUT_TOKENS)
  const temperature = typeof body.temperature === 'number'
    ? Math.min(Math.max(body.temperature, 0), 1.2)
    : 0.7
  const feature = ALLOWED_FEATURES.has(String(body.feature)) ? String(body.feature) : 'chat'

  const result = await routePlatformProvider({
    messages: validated.messages,
    maxTokens,
    temperature,
  })

  if (!result?.response) return json(502, { error: 'provider_error', message: 'No AI provider response was returned.' })

  if (result.response.statusCode >= 200 && result.response.statusCode < 300) {
    const payload = safeParseJson(result.response.body)
    const usage = payload?.usage || {}

    await logUsage(auth.accessToken, {
      userId: auth.user.id,
      feature,
      provider: result.provider,
      model: result.model,
      promptChars: validated.promptChars,
      promptTokens: toNullableInteger(usage.prompt_tokens),
      completionTokens: toNullableInteger(usage.completion_tokens),
    })

    return json(result.response.statusCode, {
      ...payload,
      quota: {
        limit: daily.limit,
        used: daily.used,
        remaining: daily.remaining,
        reset: daily.reset_at,
      },
      provider: result.provider,
      model: result.model,
    })
  }

  return result.response
}

function validateMessages(rawMessages) {
  if (!Array.isArray(rawMessages) || rawMessages.length === 0) {
    return { ok: false, statusCode: 400, error: 'no_messages', message: 'At least one message is required.' }
  }
  if (rawMessages.length > MAX_MESSAGES) {
    return { ok: false, statusCode: 413, error: 'too_many_messages', message: `Keep requests under ${MAX_MESSAGES} messages.` }
  }

  const messages = []
  let promptChars = 0
  let systemMessages = 0

  for (const item of rawMessages) {
    if (!item || typeof item !== 'object' || !ALLOWED_ROLES.has(item.role) || typeof item.content !== 'string') {
      return { ok: false, statusCode: 400, error: 'invalid_message', message: 'Every message needs a valid role and text content.' }
    }

    const content = cleanText(item.content, MAX_PROMPT_CHARS)
    if (!content) return { ok: false, statusCode: 400, error: 'empty_message', message: 'Messages cannot be empty.' }
    if (item.role === 'system') systemMessages += 1
    if (systemMessages > 1) return { ok: false, statusCode: 400, error: 'too_many_system_messages', message: 'Only one system message is allowed.' }

    promptChars += content.length
    if (promptChars > MAX_PROMPT_CHARS) {
      return { ok: false, statusCode: 413, error: 'prompt_too_large', message: `Keep prompts under ${MAX_PROMPT_CHARS} characters.` }
    }
    messages.push({ role: item.role, content })
  }

  return { ok: true, messages, promptChars }
}

async function authenticateUser(event) {
  const accessToken = getBearerToken(event)
  if (!accessToken) return { ok: false, statusCode: 401, error: 'auth_required', message: 'Please sign in again before using AI features.' }

  const config = getSupabaseServerConfig()
  if (!config) return { ok: false, statusCode: 503, error: 'supabase_not_configured', message: 'Authentication service is not configured.' }

  try {
    const response = await fetchWithTimeout(`${config.url}/auth/v1/user`, {
      headers: { apikey: config.key, Authorization: `Bearer ${accessToken}` },
    }, 10000)

    if (!response.ok) return { ok: false, statusCode: 401, error: 'invalid_session', message: 'Your session expired. Please sign in again.' }
    const user = await response.json()
    if (!user?.id) return { ok: false, statusCode: 401, error: 'invalid_session', message: 'Your session is invalid. Please sign in again.' }
    return { ok: true, accessToken, user }
  } catch (error) {
    console.error('Supabase auth verification failed', safeError(error))
    return { ok: false, statusCode: 503, error: 'auth_service_unavailable', message: 'Authentication verification is temporarily unavailable.' }
  }
}

async function getProfileRole(accessToken, userId) {
  const config = getSupabaseServerConfig()
  if (!config) return ''
  const query = new URLSearchParams({ select: 'role', id: `eq.${userId}`, limit: '1' })
  try {
    const response = await fetchWithTimeout(`${config.url}/rest/v1/profiles?${query}`, {
      headers: { apikey: config.key, Authorization: `Bearer ${accessToken}` },
    }, 10000)
    if (!response.ok) return ''
    const rows = await response.json()
    return String(rows?.[0]?.role || '')
  } catch {
    return ''
  }
}

async function consumeRateLimit(accessToken, scope) {
  const config = getSupabaseServerConfig()
  if (!config) return { ok: false }
  try {
    const response = await fetchWithTimeout(`${config.url}/rest/v1/rpc/consume_rate_limit`, {
      method: 'POST',
      headers: {
        apikey: config.key,
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ p_scope: scope }),
    }, 10000)
    if (!response.ok) {
      console.error('Rate-limit RPC failed', response.status)
      return { ok: false }
    }
    const data = await response.json()
    const value = Array.isArray(data) ? data[0] : data
    return {
      ok: true,
      allowed: value?.allowed === true,
      limit: Number(value?.limit || 0),
      used: Number(value?.used || 0),
      remaining: Number(value?.remaining || 0),
      reset_at: String(value?.reset_at || ''),
    }
  } catch (error) {
    console.error('Rate-limit RPC failed', safeError(error))
    return { ok: false }
  }
}

async function logUsage(accessToken, entry) {
  const config = getSupabaseServerConfig()
  if (!config) return false
  try {
    const response = await fetchWithTimeout(`${config.url}/rest/v1/ai_usage_logs`, {
      method: 'POST',
      headers: {
        apikey: config.key,
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({
        user_id: entry.userId,
        feature: entry.feature,
        provider: entry.provider,
        model: entry.model,
        prompt_chars: entry.promptChars,
        prompt_tokens: entry.promptTokens,
        completion_tokens: entry.completionTokens,
      }),
    }, 10000)
    if (!response.ok) {
      console.error('Supabase usage log insert failed', response.status)
      return false
    }
    return true
  } catch (error) {
    console.error('Supabase usage log insert failed', safeError(error))
    return false
  }
}

async function routePlatformProvider({ messages, maxTokens, temperature }) {
  const preferred = String(process.env.AI_PROVIDER || 'openrouter').toLowerCase()
  const candidates = []
  const add = provider => { if (!candidates.includes(provider)) candidates.push(provider) }
  add(preferred)
  add('openrouter')
  add('groq')
  add('gemini')

  let lastResult = null
  for (const provider of candidates) {
    if (!hasPlatformKey(provider)) continue
    const result = await callPlatformProvider(provider, messages, maxTokens, temperature)
    if (isGoodAiResponse(result.response)) return result
    lastResult = result
  }

  return lastResult || {
    response: json(503, { error: 'platform_key_missing', message: 'No platform AI key is configured.' }),
    provider: preferred,
    model: '',
  }
}

function hasPlatformKey(provider) {
  if (provider === 'openrouter') return Boolean(process.env.OPENROUTER_API_KEY)
  if (provider === 'groq') return Boolean(process.env.GROQ_API_KEY)
  if (provider === 'gemini') return Boolean(process.env.GEMINI_API_KEY)
  return false
}

async function callPlatformProvider(provider, messages, maxTokens, temperature) {
  if (provider === 'openrouter') {
    const model = cleanOpenRouterModel(process.env.OPENROUTER_MODEL)
    return { response: await callOpenRouter(process.env.OPENROUTER_API_KEY, model, messages, maxTokens, temperature), provider, model }
  }
  if (provider === 'groq') {
    const model = process.env.GROQ_MODEL || 'llama-3.1-8b-instant'
    return { response: await callGroq(process.env.GROQ_API_KEY, model, messages, maxTokens, temperature), provider, model }
  }
  if (provider === 'gemini') {
    const model = process.env.GEMINI_MODEL || 'gemini-1.5-flash'
    return { response: await callGemini(process.env.GEMINI_API_KEY, model, messages, maxTokens, temperature), provider, model }
  }
  return { response: json(503, { error: 'unknown_provider', message: 'Unknown AI provider.' }), provider, model: '' }
}

function cleanOpenRouterModel(model) {
  const value = String(model || '').trim()
  if (!value || value === 'openrouter/free' || value === 'openrouter/auto' || value.endsWith(':free')) return 'tencent/hy3'
  return value.slice(0, 200)
}

async function callOpenRouter(apiKey, model, messages, maxTokens, temperature) {
  const response = await fetchWithTimeout(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.PUBLIC_SITE_URL || 'https://nibras-tutor.netlify.app',
      'X-Title': 'Nibras AI Tutor',
    },
    body: JSON.stringify({ model, messages, max_tokens: maxTokens, temperature }),
  }, 30000)
  return normalizeOpenAIStyleResponse(response, 'openrouter')
}

async function callGroq(apiKey, model, messages, maxTokens, temperature) {
  const response = await fetchWithTimeout(GROQ_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, messages, max_tokens: maxTokens, temperature }),
  }, 30000)
  return normalizeOpenAIStyleResponse(response, 'groq')
}

async function callGemini(apiKey, model, messages, maxTokens, temperature) {
  const contents = messages
    .filter(message => message.role !== 'system')
    .map(message => ({ role: message.role === 'assistant' ? 'model' : 'user', parts: [{ text: message.content }] }))
  const systemMessage = messages.find(message => message.role === 'system')
  const requestBody = { contents, generationConfig: { maxOutputTokens: maxTokens, temperature } }
  if (systemMessage) requestBody.systemInstruction = { parts: [{ text: systemMessage.content }] }

  const response = await fetchWithTimeout(`${GEMINI_BASE}/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody),
  }, 30000)
  if (!response.ok) return normalizeError(response, 'gemini')

  const data = await response.json()
  const content = extractGeminiText(data)
  if (!isUsableContent(content)) return json(502, { error: 'bad_provider_response', message: 'The AI provider returned an empty or debug-only response.' })
  return json(200, {
    content,
    usage: {
      prompt_tokens: data?.usageMetadata?.promptTokenCount,
      completion_tokens: data?.usageMetadata?.candidatesTokenCount,
    },
  })
}

async function normalizeOpenAIStyleResponse(response, provider) {
  if (!response.ok) return normalizeError(response, provider)
  const data = await response.json()
  const content = String(data?.choices?.[0]?.message?.content || '').trim()
  if (!isUsableContent(content)) return json(502, { error: 'bad_provider_response', message: 'The AI provider returned an empty or debug-only response.' })
  return json(200, { content, usage: data?.usage })
}

function extractGeminiText(data) {
  const parts = data?.candidates?.[0]?.content?.parts
  if (!Array.isArray(parts)) return ''
  return parts.map(part => part?.text || '').filter(Boolean).join('\n').trim()
}

function isGoodAiResponse(response) {
  if (!response || response.statusCode < 200 || response.statusCode >= 300) return false
  return isUsableContent(safeParseJson(response.body)?.content)
}

function isUsableContent(content) {
  const text = String(content || '').trim()
  if (!text) return false
  const lower = text.toLowerCase().replace(/\s+/g, ' ')
  if (lower === 'user safety: safe response safety: safe') return false
  if (lower.includes('user safety:') && lower.includes('response safety:') && text.length < 160) return false
  if (lower.includes('safety: safe') && text.length < 80) return false
  return true
}

async function normalizeError(response, provider) {
  await response.text().catch(() => '')
  console.error(`${provider} request failed`, response.status)
  if (response.status === 429) return json(429, { error: 'rate_limit', message: 'AI provider rate limit reached.' })
  if (response.status === 401 || response.status === 403) return json(502, { error: `${provider}_auth_error`, message: 'The configured AI provider rejected its server credential.' })
  return json(502, { error: `${provider}_error`, message: 'The AI provider failed. Try again shortly.' })
}

function getSupabaseServerConfig() {
  const url = String(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').replace(/\/$/, '')
  const key = String(process.env.SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '')
  return url && key ? { url, key } : null
}

function getBearerToken(event) {
  const headers = event.headers || {}
  const authorization = headers.authorization || headers.Authorization || ''
  const match = String(authorization).match(/^Bearer\s+(.+)$/i)
  return match?.[1]?.trim() || ''
}

async function fetchWithTimeout(url, options, timeoutMs) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(url, { ...options, signal: controller.signal })
  } finally {
    clearTimeout(timeout)
  }
}

function cleanText(value, maxLength) {
  return String(value || '')
    .replace(/\u0000/g, '')
    .replace(/[\u0001-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, ' ')
    .trim()
    .slice(0, maxLength)
}

function clampNumber(value, min, max) {
  const number = Number(value)
  if (!Number.isFinite(number)) return min
  return Math.min(Math.max(number, min), max)
}

function toNullableInteger(value) {
  const number = Number(value)
  return Number.isFinite(number) ? Math.round(number) : null
}

function safeParseJson(value) {
  try { return JSON.parse(value || '{}') } catch { return {} }
}

function safeError(error) {
  return error instanceof Error ? error.message : String(error)
}

function json(statusCode, payload) {
  return { statusCode, headers: CORS, body: JSON.stringify(payload) }
}
