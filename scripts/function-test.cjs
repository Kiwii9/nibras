const assert = require('node:assert/strict')
const { handler } = require('../netlify/functions/chat.cjs')

async function invoke(httpMethod, body, headers = {}) {
  return handler({
    httpMethod,
    body: typeof body === 'string' ? body : JSON.stringify(body ?? {}),
    headers,
  })
}

function jsonResponse(payload, status = 200, headers = {}) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  })
}

async function run() {
  const originalFetch = global.fetch
  const originalEnv = {
    VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL,
    VITE_SUPABASE_PUBLISHABLE_KEY: process.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  }

  process.env.VITE_SUPABASE_URL = 'https://example.supabase.co'
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY = 'publishable-test-value'

  try {
    const options = await invoke('OPTIONS', {})
    assert.equal(options.statusCode, 204)
    assert.match(options.headers['Access-Control-Allow-Headers'], /Authorization/)
    assert.notEqual(options.headers['Access-Control-Allow-Origin'], '*')

    const method = await invoke('GET', {})
    assert.equal(method.statusCode, 405)
    assert.equal(JSON.parse(method.body).error, 'method_not_allowed')

    const invalidJson = await invoke('POST', '{not-json')
    assert.equal(invalidJson.statusCode, 400)
    assert.equal(JSON.parse(invalidJson.body).error, 'invalid_json')

    const noMessages = await invoke('POST', {})
    assert.equal(noMessages.statusCode, 400)
    assert.equal(JSON.parse(noMessages.body).error, 'no_messages')

    const invalidRole = await invoke('POST', {
      messages: [{ role: 'tool', content: 'not allowed' }],
    })
    assert.equal(invalidRole.statusCode, 400)
    assert.equal(JSON.parse(invalidRole.body).error, 'invalid_message')

    const duplicateSystem = await invoke('POST', {
      messages: [
        { role: 'system', content: 'one' },
        { role: 'system', content: 'two' },
        { role: 'user', content: 'hello' },
      ],
    })
    assert.equal(duplicateSystem.statusCode, 400)
    assert.equal(JSON.parse(duplicateSystem.body).error, 'too_many_system_messages')

    const tooLarge = await invoke('POST', {
      messages: [
        { role: 'user', content: 'x'.repeat(7000) },
        { role: 'assistant', content: 'y'.repeat(7000) },
      ],
    })
    assert.equal(tooLarge.statusCode, 413)
    assert.equal(JSON.parse(tooLarge.body).error, 'prompt_too_large')

    const unauthenticated = await invoke('POST', {
      messages: [{ role: 'user', content: 'hello' }],
    })
    assert.equal(unauthenticated.statusCode, 401)
    assert.equal(JSON.parse(unauthenticated.body).error, 'auth_required')

    const unauthenticatedMock = await invoke('POST', {
      messages: [{ role: 'user', content: 'diagnostic' }],
      mock: true,
    })
    assert.equal(unauthenticatedMock.statusCode, 401)
    assert.equal(JSON.parse(unauthenticatedMock.body).error, 'auth_required')

    global.fetch = async url => {
      if (String(url).includes('/auth/v1/user')) return jsonResponse({ id: 'user-1' })
      throw new Error(`Unexpected fetch in custom-key test: ${url}`)
    }
    const customKey = await invoke('POST', {
      messages: [{ role: 'user', content: 'hello' }],
      useCustomKey: true,
      customKey: 'should-not-be-accepted',
    }, { authorization: 'Bearer valid-token' })
    assert.equal(customKey.statusCode, 400)
    assert.equal(JSON.parse(customKey.body).error, 'custom_keys_disabled')

    global.fetch = async url => {
      if (String(url).includes('/auth/v1/user')) return jsonResponse({ id: 'student-1' })
      if (String(url).includes('/rest/v1/profiles')) return jsonResponse([{ role: 'student' }])
      throw new Error(`Unexpected fetch in student mock test: ${url}`)
    }
    const studentMock = await invoke('POST', {
      messages: [{ role: 'user', content: 'diagnostic' }],
      mock: true,
    }, { authorization: 'Bearer student-token' })
    assert.equal(studentMock.statusCode, 403)
    assert.equal(JSON.parse(studentMock.body).error, 'admin_required')

    global.fetch = async url => {
      if (String(url).includes('/auth/v1/user')) return jsonResponse({ id: 'developer-1' })
      if (String(url).includes('/rest/v1/profiles')) return jsonResponse([{ role: 'developer' }])
      throw new Error(`Unexpected fetch in developer mock test: ${url}`)
    }
    const developerMock = await invoke('POST', {
      messages: [{ role: 'user', content: 'diagnostic' }],
      mock: true,
      mockLatency: 0,
      mockResponse: 'mock-ok',
    }, { authorization: 'Bearer developer-token' })
    assert.equal(developerMock.statusCode, 200)
    assert.equal(JSON.parse(developerMock.body).content, 'mock-ok')

    console.log('All Netlify function contract tests passed.')
  } finally {
    global.fetch = originalFetch
    if (originalEnv.VITE_SUPABASE_URL === undefined) delete process.env.VITE_SUPABASE_URL
    else process.env.VITE_SUPABASE_URL = originalEnv.VITE_SUPABASE_URL
    if (originalEnv.VITE_SUPABASE_PUBLISHABLE_KEY === undefined) delete process.env.VITE_SUPABASE_PUBLISHABLE_KEY
    else process.env.VITE_SUPABASE_PUBLISHABLE_KEY = originalEnv.VITE_SUPABASE_PUBLISHABLE_KEY
  }
}

run().catch(error => {
  console.error(error)
  process.exit(1)
})
