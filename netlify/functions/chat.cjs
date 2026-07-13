// Nibras authenticated AI proxy.
// Keeps provider keys server-side and enforces persistent per-user limits through Supabase.

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'
const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models'
const OPENAI_URL = 'https://api.openai.com/v1/chat/completions'

const MAX_MESSAGES = Number(process.env.AI_MAX_MESSAGES || 16)
const MAX_PROMPT_CHARS = Number(process.env.AI_MAX_PROMPT_CHARS || 12000)
const MAX_OUTPUT_TOKENS = Number(process.env.AI_MAX_OUTPUT_TOKENS || 1800)
const DAILY_USER_LIMIT = Number(process.env.AI_DAILY_USER_LIMIT || process.env.AI_DAILY_IP_LIMIT || 25)

const CORS = {
  'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN || '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: CORS, body: '' }
  }
  if (event.httpMethod !== 'POST') {
    return json(405, { error: 'method_not_allowed', message: 'Only POST requests are allowed.' })
  }

  let body
  try { body = JSON.parse(event.body || '{}') } catch {
    return json(400, { error: 'invalid_json', message: 'Invalid request body.' })
  }

  const messages = Array.isArray(body.messages) ? body.messages : []
  const promptChars = messages.reduce((sum, message) => sum + String(message?.content || '').length, 0)
  const maxTokens = clampNumber(body.max_tokens || 1200, 64, MAX_OUTPUT_TOKENS)
  const temperature = typeof body.temperature === 'number'
    ? Math.min(Math.max(body.temperature, 0), 1.2)
    : 0.7

  if (messages.length === 0) {
    return json(400, { error: 'no_messages', message: 'No messages provided.' })
  }
  if (messages.length > MAX_MESSAGES) {
    return json(413, { error: 'too_many_messages', message: `Keep requests under ${MAX_MESSAGES} messages.` })
  }
  if (promptChars > MAX_PROMPT_CHARS) {
    return json(413, { error: 'prompt_too_large', message: `Keep prompts under ${MAX_PROMPT_CHARS} characters.` })
  }

  // Mock mode is intentionally cost-free and used only by the developer diagnostics panel.
  if (body.mock === true) {
    await new Promise(resolve => setTimeout(resolve, clampNumber(body.mockLatency || 300, 0, 3000)))
    if (body.mockFail) return json(500, { error: 'mock_failure', message: 'Simulated failure' })
    return json(200, {
      content: body.mockResponse || '🧪 هذا رد تجريبي من لوحة المطور. Developer diagnostic response.',
      usage: { prompt_tokens: 42, completion_tokens: 18, total_tokens: 60 },
      mock: true,
    })
  }

  const auth = await authenticateUser(event)
  if (!auth.ok) return json(auth.statusCode, { error: auth.error, message: auth.message })

  const quota = await getDailyUsage(auth.accessToken, auth.user.id)
  if (!quota.ok) {
    return json(503, {
      error: 'quota_service_unavailable',
      message: 'AI usage verification is temporarily unavailable. Please try again shortly.',
    })
  }
  if (quota.used >= DAILY_USER_LIMIT) {
    return json(429, {
      error: 'rate_limit',
      message: 'Daily beta AI limit reached. Try again tomorrow.',
      limit: DAILY_USER_LIMIT,
      remaining: 0,
      reset: nextUtcDay(),
    })
  }

  const useCustomKey = body.useCustomKey === true
  const customKey = String(body.customKey || '').trim()
  const customProvider = String(body.customProvider || 'openrouter').toLowerCase()
  const customModel = String(body.customModel || '').trim()

  const result = useCustomKey && customKey
    ? await routeCustomKey({
        provider: customProvider,
        apiKey: customKey,
        model: customModel,
        messages,
        maxTokens,
        temperature,
      })
    : await routePlatformKey({ messages, maxTokens, temperature })

  if (!result?.response) {
    return json(502, { error: 'provider_error', message: 'No AI provider response was returned.' })
  }

  if (result.response.statusCode >= 200 && result.response.statusCode < 300) {
    const payload = safeParseJson(result.response.body)
    const usage = payload?.usage || {}

    await logUsage(auth.accessToken, {
      userId: auth.user.id,
      feature: String(body.feature || 'chat').slice(0, 80),
      provider: result.provider,
      model: result.model,
      promptChars,
      promptTokens: toNullableInteger(usage.prompt_tokens),
      completionTokens: toNullableInteger(usage.completion_tokens),
    })

    return json(result.response.statusCode, {
      ...payload,
      quota: {
        limit: DAILY_USER_LIMIT,
        used: quota.used + 1,
        remaining: Math.max(DAILY_USER_LIMIT - quota.used - 1, 0),
        reset: nextUtcDay(),
      },
      provider: result.provider,
      model: result.model,
    })
  }

  return result.response
}

async function authenticateUser(event) {
  const accessToken = getBearerToken(event)
  if (!accessToken) {
    return { ok: false, statusCode: 401, error: 'auth_required', message: 'Please sign in again before using AI features.' }
  }

  const config = getSupabaseServerConfig()
  if (!config) {
    return { ok: false, statusCode: 503, error: 'supabase_not_configured', message: 'Authentication service is not configured.' }
  }

  try {
    const response = await fetchWithTimeout(`${config.url}/auth/v1/user`, {
      headers: {
        apikey: config.key,
        Authorization: `Bearer ${accessToken}`,
      },
    }, 10000)

    if (!response.ok) {
      return { ok: false, statusCode: 401, error: 'invalid_session', message: 'Your session expired. Please sign in again.' }
    }

    const user = await response.json()
    if (!user?.id) {
      return { ok: false, statusCode: 401, error: 'invalid_session', message: 'Your session is invalid. Please sign in again.' }
    }

    return { ok: true, accessToken, user }
  } catch (error) {
    console.error('Supabase auth verification failed', safeError(error))
    return { ok: false, statusCode: 503, error: 'auth_service_unavailable', message: 'Authentication verification is temporarily unavailable.' }
  }
}

async function getDailyUsage(accessToken, userId) {
  const config = getSupabaseServerConfig()
  if (!config) return { ok: false, used: 0 }

  const start = new Date()
  start.setUTCHours(0, 0, 0, 0)
  const query = new URLSearchParams({
    select: 'id',
    user_id: `eq.${userId}`,
    created_at: `gte.${start.toISOString()}`,
  })

  try {
    const response = await fetchWithTimeout(`${config.url}/rest/v1/ai_usage_logs?${query.toString()}`, {
      headers: {
        apikey: config.key,
        Authorization: `Bearer ${accessToken}`,
        Prefer: 'count=exact',
        Range: '0-0',
      },
    }, 10000)

    if (!response.ok) {
      console.error('Supabase quota query failed', response.status, await response.text().catch(() => ''))
      return { ok: false, used: 0 }
    }

    const contentRange = response.headers.get('content-range') || ''
    const total = Number(contentRange.split('/').pop())
    return { ok: Number.isFinite(total), used: Number.isFinite(total) ? total : 0 }
  } catch (error) {
    console.error('Supabase quota query failed', safeError(error))
    return { ok: false, used: 0 }
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
      console.error('Supabase usage log insert failed', response.status, await response.text().catch(() => ''))
      return false
    }
    return true
  } catch (error) {
    console.error('Supabase usage log insert failed', safeError(error))
    return false
  }
}

async function routePlatformKey({ messages, maxTokens, temperature }) {
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
    response: json(503, { error: 'platform_key_missing', message: 'No platform AI key configured.' }),
    provider: preferred,
    model: '',
  }
}

async function routeCustomKey({ provider, apiKey, model, messages, maxTokens, temperature }) {
  try {
    const result = await callProvider(provider, apiKey, model, messages, maxTokens, temperature)
    if (!isGoodAiResponse(result.response)) {
      return {
        response: json(502, {
          error: 'bad_provider_response',
          message: 'The selected AI provider returned an empty or debug-only response.',
        }),
        provider: result.provider,
        model: result.model,
      }
    }
    return result
  } catch (error) {
    console.error('Custom provider error', provider, safeError(error))
    return {
      response: json(502, { error: 'provider_error', message: 'The selected AI provider failed.' }),
      provider,
      model,
    }
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

async function callProvider(provider, apiKey, model, messages, maxTokens, temperature) {
  if (provider === 'gemini') {
    const selectedModel = model || 'gemini-1.5-flash'
    return { response: await callGemini(apiKey, selectedModel, messages, maxTokens, temperature), provider, model: selectedModel }
  }
  if (provider === 'openai') {
    const selectedModel = model || 'gpt-4o-mini'
    return { response: await callOpenAI(apiKey, selectedModel, messages, maxTokens, temperature), provider, model: selectedModel }
  }
  if (provider === 'groq') {
    const selectedModel = model || 'llama-3.1-8b-instant'
    return { response: await callGroq(apiKey, selectedModel, messages, maxTokens, temperature), provider, model: selectedModel }
  }
  const selectedModel = cleanOpenRouterModel(model)
  return { response: await callOpenRouter(apiKey, selectedModel, messages, maxTokens, temperature), provider: 'openrouter', model: selectedModel }
}

function cleanOpenRouterModel(model) {
  const value = String(model || '').trim()
  if (!value || value === 'openrouter/free' || value === 'openrouter/auto' || value.endsWith(':free')) {
    return 'tencent/hy3'
  }
  return value
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
    .map(message => ({ role: message.role === 'assistant' ? 'model' : 'user', parts: [{ text: String(message.content || '') }] }))
  const systemMessage = messages.find(message => message.role === 'system')
  const requestBody = { contents, generationConfig: { maxOutputTokens: maxTokens, temperature } }
  if (systemMessage) requestBody.systemInstruction = { parts: [{ text: String(systemMessage.content || '') }] }

  const response = await fetchWithTimeout(`${GEMINI_BASE}/${model}:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody),
  }, 30000)
  if (!response.ok) return normalizeError(response, 'gemini')

  const data = await response.json()
  const content = extractGeminiText(data)
  if (!isUsableContent(content)) {
    return json(502, { error: 'bad_provider_response', message: 'The AI provider returned an empty or debug-only response.' })
  }
  return json(200, {
    content,
    usage: {
      prompt_tokens: data?.usageMetadata?.promptTokenCount,
      completion_tokens: data?.usageMetadata?.candidatesTokenCount,
    },
  })
}

async function callOpenAI(apiKey, model, messages, maxTokens, temperature) {
  const response = await fetchWithTimeout(OPENAI_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, messages, max_tokens: maxTokens, temperature }),
  }, 30000)
  return normalizeOpenAIStyleResponse(response, 'openai')
}

async function normalizeOpenAIStyleResponse(response, provider) {
  if (!response.ok) return normalizeError(response, provider)
  const data = await response.json()
  const content = String(data?.choices?.[0]?.message?.content || '').trim()
  if (!isUsableContent(content)) {
    return json(502, { error: 'bad_provider_response', message: 'The AI provider returned an empty or debug-only response.' })
  }
  return json(200, { content, usage: data?.usage })
}

function extractGeminiText(data) {
  const parts = data?.candidates?.[0]?.content?.parts
  if (!Array.isArray(parts)) return ''
  return parts.map(part => part?.text || '').filter(Boolean).join('\n').trim()
}

function isGoodAiResponse(response) {
  if (!response || response.statusCode < 200 || response.statusCode >= 300) return false
  const payload = safeParseJson(response.body)
  return isUsableContent(payload?.content)
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
  const text = await response.text().catch(() => '')
  console.error(`${provider} error`, response.status, text.slice(0, 500))
  if (response.status === 429) return json(429, { error: 'rate_limit', message: 'AI provider rate limit reached.' })
  if (response.status === 401 || response.status === 403) return json(401, { error: 'invalid_key', message: 'Invalid or unauthorized API key.' })
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

function clampNumber(value, min, max) {
  const number = Number(value)
  if (!Number.isFinite(number)) return min
  return Math.min(Math.max(number, min), max)
}

function toNullableInteger(value) {
  const number = Number(value)
  return Number.isFinite(number) ? Math.round(number) : null
}

function nextUtcDay() {
  const date = new Date()
  date.setUTCDate(date.getUTCDate() + 1)
  date.setUTCHours(0, 0, 0, 0)
  return date.toISOString()
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
