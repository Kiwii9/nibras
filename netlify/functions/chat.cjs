// Nibras Chat Proxy — Netlify Function
// Routes through platform key (server-side) or user custom key
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'
const GEMINI_BASE    = 'https://generativelanguage.googleapis.com/v1beta/models'
const OPENAI_URL     = 'https://api.openai.com/v1/chat/completions'

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type':                 'application/json',
}

// Default model: openrouter/free auto-router — never breaks when individual slugs are delisted
const DEFAULT_MODEL = process.env.OPENROUTER_MODEL || 'openrouter/free'

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: CORS, body: '' }
  if (event.httpMethod !== 'POST')
    return { statusCode: 405, headers: CORS, body: JSON.stringify({ error: 'Method not allowed' }) }

  let body
  try { body = JSON.parse(event.body || '{}') }
  catch { return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Invalid JSON' }) } }

  const { messages = [], max_tokens = 1400, temperature = 0.7,
          useCustomKey, customKey, customProvider, customModel,
          mock, mockLatency, mockResponse, mockFail } = body

  if (!messages.length)
    return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'No messages provided' }) }

  // Mock mode (admin only)
  if (mock === true) {
    await new Promise(r => setTimeout(r, mockLatency || 800))
    if (mockFail)
      return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: 'Simulated failure' }) }
    return {
      statusCode: 200, headers: CORS,
      body: JSON.stringify({
        content: mockResponse || '[MOCK] Admin test response.',
        usage: { prompt_tokens: 42, completion_tokens: 18, total_tokens: 60 },
        mock: true,
      }),
    }
  }

  // Custom key
  if (useCustomKey && customKey) {
    return routeCustomKey({ provider: customProvider, apiKey: customKey, model: customModel, messages, max_tokens, temperature })
  }

  // Platform key
  const platformKey = process.env.OPENROUTER_API_KEY
  if (!platformKey)
    return { statusCode: 503, headers: CORS, body: JSON.stringify({ error: 'platform_key_missing' }) }

  return callOpenRouter(platformKey, DEFAULT_MODEL, messages, max_tokens, temperature)
}

async function routeCustomKey({ provider, apiKey, model, messages, max_tokens, temperature }) {
  try {
    if (provider === 'gemini') return callGemini(apiKey, model || 'gemini-1.5-flash', messages, max_tokens, temperature)
    if (provider === 'openai') return callOpenAI(apiKey, model || 'gpt-4o-mini', messages, max_tokens, temperature)
    return callOpenRouter(apiKey, model || 'openrouter/free', messages, max_tokens, temperature)
  } catch (err) {
    return { statusCode: 502, headers: CORS, body: JSON.stringify({ error: 'provider_error', message: String(err) }) }
  }
}

async function callOpenRouter(apiKey, model, messages, max_tokens, temperature) {
  const res = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://nibras-tutor.netlify.app',
      'X-Title': 'Nibras AI Tutor',
    },
    body: JSON.stringify({ model, messages, max_tokens, temperature }),
  })
  const text = await res.text()
  if (!res.ok) {
    // Pass through the real error so client can show it
    let parsed = {}
    try { parsed = JSON.parse(text) } catch {}
    const status = res.status
    if (status === 429) return { statusCode: 429, headers: CORS, body: JSON.stringify({ error: 'rate_limit' }) }
    if (status === 401) return { statusCode: 401, headers: CORS, body: JSON.stringify({ error: 'invalid_key' }) }
    if (status === 404) return { statusCode: 502, headers: CORS, body: JSON.stringify({ error: 'model_unavailable', message: parsed?.error?.message || 'Model not found. Try changing the model in Settings.' }) }
    return { statusCode: 502, headers: CORS, body: JSON.stringify({ error: 'openrouter_error', message: parsed?.error?.message || text }) }
  }
  let data
  try { data = JSON.parse(text) } catch { return { statusCode: 502, headers: CORS, body: JSON.stringify({ error: 'parse_error' }) } }
  return {
    statusCode: 200, headers: CORS,
    body: JSON.stringify({ content: data?.choices?.[0]?.message?.content || '', usage: data?.usage }),
  }
}

async function callGemini(apiKey, model, messages, max_tokens, temperature) {
  const contents = messages.filter(m => m.role !== 'system').map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }))
  const systemMsg = messages.find(m => m.role === 'system')
  const reqBody = { contents, generationConfig: { maxOutputTokens: max_tokens, temperature } }
  if (systemMsg) reqBody.systemInstruction = { parts: [{ text: systemMsg.content }] }
  const res = await fetch(`${GEMINI_BASE}/${model}:generateContent?key=${apiKey}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(reqBody),
  })
  if (!res.ok) return { statusCode: 502, headers: CORS, body: JSON.stringify({ error: 'gemini_error', message: await res.text() }) }
  const data = await res.json()
  return {
    statusCode: 200, headers: CORS,
    body: JSON.stringify({
      content: data?.candidates?.[0]?.content?.parts?.[0]?.text || '',
      usage: { prompt_tokens: data?.usageMetadata?.promptTokenCount, completion_tokens: data?.usageMetadata?.candidatesTokenCount },
    }),
  }
}

async function callOpenAI(apiKey, model, messages, max_tokens, temperature) {
  const res = await fetch(OPENAI_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, messages, max_tokens, temperature }),
  })
  if (!res.ok) return { statusCode: 502, headers: CORS, body: JSON.stringify({ error: 'openai_error', message: await res.text() }) }
  const data = await res.json()
  return {
    statusCode: 200, headers: CORS,
    body: JSON.stringify({ content: data?.choices?.[0]?.message?.content || '', usage: data?.usage }),
  }
}
