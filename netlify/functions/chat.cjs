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
  const customProvider = String(body.customProvider || 'openrouter')
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

  // ── Mock mode (admin testing) ───────────────────────────────────────────────
  if (body.mock === true) {
    await new Promise(r => setTimeout(r, body.mockLatency || 800))
    if (body.mockFail) {
      return json(500, { error: 'mock_failure', message: 'Simulated failure' })
    }
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

  if (preferred === 'groq' && process.env.GROQ_API_KEY) {
    return await callGroq(process.env.GROQ_API_KEY, process.env.GROQ_MODEL || 'llama-3.1-8b-instant', messages, max_tokens, temperature)
  }
  if (preferred === 'gemini' && process.env.GEMINI_API_KEY) {
    return await callGemini(process.env.GEMINI_API_KEY, process.env.GEMINI_MODEL || 'gemini-1.5-flash', messages, max_tokens, temperature)
  }
  if (process.env.OPENROUTER_API_KEY) {
    return await callOpenRouter(process.env.OPENROUTER_API_KEY, process.env.OPENROUTER_MODEL || 'meta-llama/llama-3.1-8b-instruct:free', messages, max_tokens, temperature)
  }
  if (process.env.GROQ_API_KEY) {
    return await callGroq(process.env.GROQ_API_KEY, process.env.GROQ_MODEL || 'llama-3.1-8b-instant', messages, max_tokens, temperature)
  }
  if (process.env.GEMINI_API_KEY) {
    return await callGemini(process.env.GEMINI_API_KEY, process.env.GEMINI_MODEL || 'gemini-1.5-flash', messages, max_tokens, temperature)
  }

  return json(503, { error: 'platform_key_missing', message: 'No platform AI key configured.' })
}

async function routeCustomKey({ provider, apiKey, model, messages, max_tokens, temperature }) {
  try {
    if (provider === 'gemini') {
      return await callGemini(apiKey, model || 'gemini-1.5-flash', messages, max_tokens, temperature)
    }
    if (provider === 'openai') {
      return await callOpenAI(apiKey, model || 'gpt-4o-mini', messages, max_tokens, temperature)
    }
    if (provider === 'groq') {
      return await callGroq(apiKey, model || 'llama-3.1-8b-instant', messages, max_tokens, temperature)
    }
    return await callOpenRouter(apiKey, model || 'meta-llama/llama-3.1-8b-instruct:free', messages, max_tokens, temperature)
  } catch (err) {
    return json(502, { error: 'provider_error', message: safeError(err) })
  }
}

async function callOpenRouter(apiKey, model, messages, max_tokens, temperature) {
  const res = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.PUBLIC_SITE_URL || 'https://nibras.netlify.app',
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
    .map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] }))
  const systemMsg = messages.find(m => m.role === 'system')
  const body = { contents, generationConfig: { maxOutputTokens: max_tokens, temperature } }
  if (systemMsg) body.systemInstruction = { parts: [{ text: systemMsg.content }] }

  const res = await fetch(`${GEMINI_BASE}/${model}:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) return await normalizeError(res, 'gemini')

  const data = await res.json()
  const content = data?.candidates?.[0]?.content?.parts?.[0]?.text || ''
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
  return json(200, {
    content: data?.choices?.[0]?.message?.content || '',
    usage: data?.usage,
  })
}

async function normalizeError(res, provider) {
  const txt = await res.text().catch(() => '')
  if (res.status === 429) return json(429, { error: 'rate_limit', message: 'Rate limit reached.' })
  if (res.status === 401 || res.status === 403) return json(401, { error: 'invalid_key', message: 'Invalid or unauthorized API key.' })
  return json(502, { error: `${provider}_error`, message: txt.slice(0, 500) })
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

function safeError(err) {
  return err instanceof Error ? err.message : String(err)
}

function json(statusCode, payload) {
  return { statusCode, headers: CORS, body: JSON.stringify(payload) }
}
