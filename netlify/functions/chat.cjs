// ─── Nibras Chat Proxy ─────────────────────────────────────────────────────────
// Handles both platform key (server-side) and user custom key (passed in body)
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'
const GEMINI_BASE    = 'https://generativelanguage.googleapis.com/v1beta/models'
const OPENAI_URL     = 'https://api.openai.com/v1/chat/completions'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: CORS, body: '' }
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: CORS, body: JSON.stringify({ error: 'Method not allowed' }) }
  }

  let body
  try { body = JSON.parse(event.body || '{}') } catch {
    return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Invalid JSON' }) }
  }

  const messages      = Array.isArray(body.messages) ? body.messages : []
  const max_tokens    = body.max_tokens || 1200
  const temperature   = body.temperature ?? 0.7
  const useCustomKey  = body.useCustomKey === true
  const customKey     = body.customKey || ''
  const customProvider = body.customProvider || 'openrouter'
  const customModel   = body.customModel || ''

  if (messages.length === 0) {
    return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'No messages provided' }) }
  }

  // ── Mock mode (admin testing) ───────────────────────────────────────────────
  if (body.mock === true) {
    await new Promise(r => setTimeout(r, body.mockLatency || 800))
    if (body.mockFail) {
      return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: 'Simulated failure' }) }
    }
    return {
      statusCode: 200, headers: CORS,
      body: JSON.stringify({
        content: body.mockResponse || '🧪 هذا رد وهمي من وضع الاختبار. Mock response from admin test mode.',
        usage: { prompt_tokens: 42, completion_tokens: 18, total_tokens: 60 },
        mock: true,
      }),
    }
  }

  // ── Route to provider ────────────────────────────────────────────────────────
  if (useCustomKey && customKey) {
    return await routeCustomKey({ provider: customProvider, apiKey: customKey, model: customModel, messages, max_tokens, temperature })
  }

  // Platform key (server-side)
  const platformKey = process.env.OPENROUTER_API_KEY
  if (!platformKey) {
    return { statusCode: 503, headers: CORS, body: JSON.stringify({ error: 'platform_key_missing', message: 'Platform API key not configured' }) }
  }
  return await callOpenRouter(platformKey, process.env.OPENROUTER_MODEL || 'meta-llama/llama-3.1-8b-instruct:free', messages, max_tokens, temperature)
}

async function routeCustomKey({ provider, apiKey, model, messages, max_tokens, temperature }) {
  try {
    if (provider === 'gemini') {
      return await callGemini(apiKey, model || 'gemini-1.5-flash', messages, max_tokens, temperature)
    } else if (provider === 'openai') {
      return await callOpenAI(apiKey, model || 'gpt-4o-mini', messages, max_tokens, temperature)
    } else {
      return await callOpenRouter(apiKey, model || 'meta-llama/llama-3.1-8b-instruct:free', messages, max_tokens, temperature)
    }
  } catch (err) {
    return { statusCode: 502, headers: CORS, body: JSON.stringify({ error: 'provider_error', message: String(err) }) }
  }
}

async function callOpenRouter(apiKey, model, messages, max_tokens, temperature) {
  const res = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json', 'HTTP-Referer': 'https://nibras.netlify.app', 'X-Title': 'Nibras AI Tutor' },
    body: JSON.stringify({ model, messages, max_tokens, temperature }),
  })
  if (!res.ok) {
    const txt = await res.text().catch(() => '')
    const status = res.status
    if (status === 429) return { statusCode: 429, headers: CORS, body: JSON.stringify({ error: 'rate_limit', message: 'Rate limit reached' }) }
    if (status === 401) return { statusCode: 401, headers: CORS, body: JSON.stringify({ error: 'invalid_key', message: 'Invalid API key' }) }
    return { statusCode: 502, headers: CORS, body: JSON.stringify({ error: 'openrouter_error', message: txt }) }
  }
  const data = await res.json()
  return { statusCode: 200, headers: CORS, body: JSON.stringify({ content: data?.choices?.[0]?.message?.content || '', usage: data?.usage }) }
}

async function callGemini(apiKey, model, messages, max_tokens, temperature) {
  const contents = messages.filter(m => m.role !== 'system').map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] }))
  const systemMsg = messages.find(m => m.role === 'system')
  const body = { contents, generationConfig: { maxOutputTokens: max_tokens, temperature } }
  if (systemMsg) body.systemInstruction = { parts: [{ text: systemMsg.content }] }
  const res = await fetch(`${GEMINI_BASE}/${model}:generateContent?key=${apiKey}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  if (!res.ok) {
    const txt = await res.text().catch(() => '')
    return { statusCode: 502, headers: CORS, body: JSON.stringify({ error: 'gemini_error', message: txt }) }
  }
  const data = await res.json()
  const content = data?.candidates?.[0]?.content?.parts?.[0]?.text || ''
  return { statusCode: 200, headers: CORS, body: JSON.stringify({ content, usage: { prompt_tokens: data?.usageMetadata?.promptTokenCount, completion_tokens: data?.usageMetadata?.candidatesTokenCount } }) }
}

async function callOpenAI(apiKey, model, messages, max_tokens, temperature) {
  const res = await fetch(OPENAI_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, messages, max_tokens, temperature }),
  })
  if (!res.ok) {
    const txt = await res.text().catch(() => '')
    return { statusCode: 502, headers: CORS, body: JSON.stringify({ error: 'openai_error', message: txt }) }
  }
  const data = await res.json()
  return { statusCode: 200, headers: CORS, body: JSON.stringify({ content: data?.choices?.[0]?.message?.content || '', usage: data?.usage }) }
}
