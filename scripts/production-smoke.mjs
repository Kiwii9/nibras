import assert from 'node:assert/strict'

const site = (process.env.SITE_URL || 'https://nibras-tutor.netlify.app').replace(/\/$/, '')
const routes = ['/', '/privacy', '/terms', '/chat', '/admin', '/resources', '/definitely-missing-page']

async function readJson(response) {
  const text = await response.text()
  try { return JSON.parse(text) } catch { throw new Error(`Expected JSON from ${response.url}, received: ${text.slice(0, 200)}`) }
}

async function run() {
  for (const route of routes) {
    const response = await fetch(`${site}${route}`, { redirect: 'follow' })
    assert.equal(response.status, 200, `${route} should return 200`)
    const html = await response.text()
    assert.match(html, /<div id="root"><\/div>|<div id="root">/i, `${route} should return the SPA shell`)
  }

  const healthResponse = await fetch(`${site}/.netlify/functions/health`, { cache: 'no-store' })
  assert.equal(healthResponse.status, 200, 'health endpoint should return 200')
  const health = await readJson(healthResponse)
  assert.equal(health.ok, true)
  assert.equal(health.env.openRouterKeyConfigured, true)
  assert.equal(health.env.supabaseUrlConfigured, true)
  assert.equal(health.env.supabasePublishableKeyConfigured, true)

  const options = await fetch(`${site}/.netlify/functions/chat`, { method: 'OPTIONS' })
  assert.equal(options.status, 200, 'chat OPTIONS should return 200')
  assert.match(options.headers.get('access-control-allow-headers') || '', /Authorization/i)

  const mockResponse = await fetch(`${site}/.netlify/functions/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages: [{ role: 'user', content: 'production smoke test' }],
      mock: true,
      mockLatency: 0,
      mockResponse: 'production-mock-ok',
    }),
  })
  assert.equal(mockResponse.status, 200, 'mock chat should return 200')
  assert.equal((await readJson(mockResponse)).content, 'production-mock-ok')

  const unauthorized = await fetch(`${site}/.netlify/functions/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages: [{ role: 'user', content: 'hello' }] }),
  })
  assert.equal(unauthorized.status, 401, 'real AI calls should require authentication')
  assert.equal((await readJson(unauthorized)).error, 'auth_required')

  console.log(`Production smoke tests passed for ${site}`)
}

run().catch(error => {
  console.error(error)
  process.exit(1)
})
