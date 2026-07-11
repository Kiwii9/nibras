// ─── Nibras Chat Proxy ─────────────────────────────────────────────────────────
// Server-side proxy for public AI calls. Keeps provider keys outside frontend code.
// NOTE: The in-memory limiter is a low-cost launch guard, not a replacement for
// Supabase-backed per-user quotas. Add persistent usage logs before a wider launch.

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'
const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models'
const OPENAI_URL = 'https://api.openai.com/v1/chat/completions'

const MAX_MESSAGES = Number(process.env.AI_MAX_MESSAGES || 16)
const MAX_PROMPT_CHARS = Number(process.env.AI_MAX_PROMPT_CHARS || 12000)
const MAX_OUTPUT_TOKENS = Number(process.env.AI_MAX_OUTPUT_TOKENS || 1800)
const DAILY_IP_LIMIT = Number(process.env.AI_DAILY_IP_LIMIT || 25)

const usageByIp = new Map()

const CORS = {
  'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN || '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
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
  const promptChars = messages.reduce((sum, m) => sum + String(m?.content || '').length, 0)
  const max_tokens = clampNumber(body.max_tokens || 1200, 64, MAX_OUTPUT_TOKENS)
  const temperature = typeof body.temperature === 'number' ? Math.min(Math.max(body.temperature, 0), 1.2) : 0.7
  const useCustomKey = body.useCustomKey === true
  const customKey = String(body.customKey || '')
  const customProvider = String(body.customProvider || 'openrouter').toLowerCase()
  const customModel = String(body.customModel || '')

  if (messages.length === 0) {
    return json(400, { error: 'no_messages', message: 'No messages provided.' })
  }
  if (messages.length > MAX_MESSAGES) {
    return json(413, { error: 'too_many_messages', message: `Keep requests under ${MAX_MESSAGES} messages.` })
  }
  if (promptChars > MAX_PROMPT_CHARS) {
    return json(413, { error: 'prompt_too_large', message: `Keep prompts under ${MAX_PROMPT_CHARS} characters for the free beta.` })
  }

  const ipKey = getClientKey(event)
  const limit = checkDailyLimit(ipKey)
  if (!limit.allowed && body.mock !== true) {
    return json(429, {
      error: 'rate_limit',
      message: 'Daily beta AI limit reached. Try again tomorrow.',
      limit: DAILY_IP_LIMIT,
      remaining: 0,
      reset: limit.reset,
    })
  }

  if (body.mock === true) {
    await new Promise(r => setTimeout(r, body.mockLatency || 800))
    if (body.mockFail) return json(500, { error: 'mock_failure', message: 'Simulated failure' })
    return json(200, {
      content: body.mockResponse || '🧪 هذا رد وهمي من وضع الاختبار. Mock response from admin test mode.',
      usage: { prompt_tokens: 42, completion_tokens: 18, total_tokens: 60 },
      mock: true,
    })
  }

  const response = useCustomKey && customKey
    ? await routeCustomKey({ provider: customProvider, apiKey: customKey, model: customModel, messages, max_tokens, temperature })
    : await routePlatformKey({ messages, max_tokens, temperature })

  if (response.statusCode >= 200 && response.statusCode < 300) incrementDailyUsage(ipKey)
  return response
}

async function routePlatformKey({ messages, max_tokens, temperature }) {
  const preferred = String(process.env.AI_PROVIDER || 'openrouter').toLowerCase()
  const candidates = []

  const add = (provider) => {
    if (!candidates.includes(provider)) candidates.push(provider)
  }

  add(preferred)
  add('openrouter')
  add('groq')
  add('gemini')

  let lastResponse = null
  for (const provider of candidates) {
    if (!hasPlatformKey(provider)) continue
    const response = await callPlatformProvider(provider, messages, max_tokens, temperature)
    if (isGoodAiResponse(response)) return response
    lastResponse = response
  }

  return lastResponse || json(503, { error: 'platform_key_missing', message: 'No platform AI key configured.' })
}

async function routeCustomKey({ provider, apiKey, model, messages, max_tokens, temperature }) {
  try {
    const response = await callProvider(provider, apiKey, model, messages, max_tokens, temperature)
    if (!isGoodAiResponse(response)) {
      return json(502, {
        error: 'bad_provider_response',
        message: 'The selected AI provider returned an empty or debug-only response. Try another model or provider.',
      })
    }
    return response
  } catch (err) {
    console.error('Custom provider error', provider, err)
    return json(502, { error: 'provider_error', message: 'The selected AI provider failed. Try another model or provider.' })
  }
}

function hasPlatformKey(provider) {
  if (provider === 'openrouter') return Boolean(process.env.OPENROUTER_API_KEY)
  if (provider === 'groq') return Boolean(process.env.GROQ_API_KEY)
  if (provider === 'gemini') return Boolean(process.env.GEMINI_API_KEY)
  return false
}

async function callPlatformProvider(provider, messages, max_tokens, temperature) {
  if (provider === 'openrouter') {
    return await callOpenRouter(
      process.env.OPENROUTER_API_KEY,
      cleanOpenRouterModel(process.env.OPENROUTER_MODEL),
      messages,
      max_tokens,
      temperature
    )
  }
  if (provider === 'groq') {
    return await callGroq(process.env.GROQ_API_KEY, process.env.GROQ_MODEL || 'llama-3.1-8b-instant', messages, max_tokens, temperature)
  }
  if (provider === 'gemini') {
    return await callGemini(process.env.GEMINI_API_KEY, process.env.GEMINI_MODEL || 'gemini-1.5-flash', messages, max_tokens, temperature)
  }
  return json(503, { error: 'unknown_provider', message: 'Unknown AI provider.' })
}

async function callProvider(provider, apiKey, model, messages, max_tokens, temperature) {
  if (provider === 'gemini') return await callGemini(apiKey, model || 'gemini-1.5-flash', messages, max_tokens, temperature)
  if (provider === 'openai') return await callOpenAI(apiKey, model || 'gpt-4o-mini', messages, max_tokens, temperature)
  if (provider === 'groq') return await callGroq(apiKey, model || 'llama-3.1-8b-instant', messages, max_tokens, temperature)
  return await callOpenRouter(apiKey, cleanOpenRouterModel(model), messages, max_tokens, temperature)
}

function cleanOpenRouterModel(model) {
  const value = String(model || '').trim()
  if (!value || value === 'openrouter/free' || value === 'openrouter/auto') {
    return 'meta-llama/llama-3.1-8b-instruct:free'
  }
  return value
}

async function callOpenRouter(apiKey, model, messages, max_tokens, temperature) {
  const res = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.PUBLIC_SITE_URL || 'https://nibras-tutor.netlify.app',
      'X-Title': 'Nibras AI Tutor',
    },
    body: JSON.stringify({ model, messages, max_tokens, temperature }),
  })
  return await normalizeOpenAIStyleResponse(res, 'openrouter')
}

async function callGroq(apiKey, model, messages, max_tokens, temperature) {
  const res = await fetch(GROQ_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, messages, max_tokens, temperature }),
  })
  return await normalizeOpenAIStyleResponse(res, 'groq')
}

async function callGemini(apiKey, model, messages, max_tokens, temperature) {
  const contents = messages
    .filter(m => m.role !== 'system')
    .map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: String(m.content || '') }] }))
  const systemMsg = messages.find(m => m.role === 'system')
  const body = { contents, generationConfig: { maxOutputTokens: max_tokens, temperature } }
  if (systemMsg) body.systemInstruction = { parts: [{ text: String(systemMsg.content || '') }] }

  const res = await fetch(`${GEMINI_BASE}/${model}:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) return await normalizeError(res, 'gemini')

  const data = await res.json()
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

async function callOpenAI(apiKey, model, messages, max_tokens, temperature) {
  const res = await fetch(OPENAI_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, messages, max_tokens, temperature }),
  })
  return await normalizeOpenAIStyleResponse(res, 'openai')
}

async function normalizeOpenAIStyleResponse(res, provider) {
  if (!res.ok) return await normalizeError(res, provider)
  const data = await res.json()
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
  try {
    const payload = JSON.parse(response.body || '{}')
    return isUsableContent(payload.content)
  } catch {
    return false
  }
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

async function normalizeError(res, provider) {
  const txt = await res.text().catch(() => '')
  console.error(`${provider} error`, res.status, txt.slice(0, 500))
  if (res.status === 429) return json(429, { error: 'rate_limit', message: 'Rate limit reached.' })
  if (res.status === 401 || res.status === 403) return json(401, { error: 'invalid_key', message: 'Invalid or unauthorized API key.' })
  return json(502, { error: `${provider}_error`, message: 'The AI provider failed. Try again or switch provider.' })
}

function checkDailyLimit(key) {
  const today = new Date().toISOString().slice(0, 10)
  const current = usageByIp.get(key)
  if (!current || current.date !== today) {
    usageByIp.set(key, { date: today, count: 0 })
    return { allowed: true, remaining: DAILY_IP_LIMIT, reset: nextUtcDay() }
  }
  return { allowed: current.count < DAILY_IP_LIMIT, remaining: Math.max(DAILY_IP_LIMIT - current.count, 0), reset: nextUtcDay() }
}

function incrementDailyUsage(key) {
  const today = new Date().toISOString().slice(0, 10)
  const current = usageByIp.get(key)
  if (!current || current.date !== today) usageByIp.set(key, { date: today, count: 1 })
  else usageByIp.set(key, { ...current, count: current.count + 1 })
}

function getClientKey(event) {
  const headers = event.headers || {}
  return headers['x-nf-client-connection-ip']
    || headers['client-ip']
    || headers['x-forwarded-for']?.split(',')?.[0]?.trim()
    || 'unknown-client'
}

function clampNumber(value, min, max) {
  const n = Number(value)
  if (!Number.isFinite(n)) return min
  return Math.min(Math.max(n, min), max)
}

function nextUtcDay() {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() + 1)
  d.setUTCHours(0, 0, 0, 0)
  return d.toISOString()
}

function json(statusCode, payload) {
  return { statusCode, headers: CORS, body: JSON.stringify(payload) }
}
