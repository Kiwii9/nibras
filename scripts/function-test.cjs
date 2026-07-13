const assert = require('node:assert/strict')
const { handler } = require('../netlify/functions/chat.cjs')

async function invoke(httpMethod, body, headers = {}) {
  return handler({
    httpMethod,
    body: typeof body === 'string' ? body : JSON.stringify(body ?? {}),
    headers,
  })
}

async function run() {
  const options = await invoke('OPTIONS', {})
  assert.equal(options.statusCode, 200)
  assert.match(options.headers['Access-Control-Allow-Headers'], /Authorization/)

  const method = await invoke('GET', {})
  assert.equal(method.statusCode, 405)
  assert.equal(JSON.parse(method.body).error, 'method_not_allowed')

  const invalidJson = await invoke('POST', '{not-json')
  assert.equal(invalidJson.statusCode, 400)
  assert.equal(JSON.parse(invalidJson.body).error, 'invalid_json')

  const noMessages = await invoke('POST', {})
  assert.equal(noMessages.statusCode, 400)
  assert.equal(JSON.parse(noMessages.body).error, 'no_messages')

  const mock = await invoke('POST', {
    messages: [{ role: 'user', content: 'test' }],
    mock: true,
    mockLatency: 0,
    mockResponse: 'mock-ok',
  })
  assert.equal(mock.statusCode, 200)
  assert.equal(JSON.parse(mock.body).content, 'mock-ok')

  const unauthenticated = await invoke('POST', {
    messages: [{ role: 'user', content: 'hello' }],
  })
  assert.equal(unauthenticated.statusCode, 401)
  assert.equal(JSON.parse(unauthenticated.body).error, 'auth_required')

  console.log('All Netlify function contract tests passed.')
}

run().catch(error => {
  console.error(error)
  process.exit(1)
})
