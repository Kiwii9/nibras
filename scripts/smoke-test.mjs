import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const failures = []
const warnings = []

function read(file) {
  return fs.readFileSync(path.join(root, file), 'utf8')
}

function exists(file) {
  return fs.existsSync(path.join(root, file))
}

function assert(condition, message) {
  if (!condition) failures.push(message)
}

function warn(condition, message) {
  if (!condition) warnings.push(message)
}

function assertFileContains(file, snippets) {
  const content = read(file)
  for (const snippet of snippets) {
    assert(content.includes(snippet), `${file} is missing: ${snippet}`)
  }
}

function assertFileExcludes(file, snippets) {
  const content = read(file)
  for (const snippet of snippets) {
    assert(!content.includes(snippet), `${file} must not contain: ${snippet}`)
  }
}

const packageJson = JSON.parse(read('package.json'))
const packageLock = JSON.parse(read('package-lock.json'))

assert(packageJson.scripts?.typecheck === 'tsc --noEmit', 'package.json must expose typecheck.')
assert(packageJson.scripts?.build === 'tsc && vite build', 'package.json build script must run TypeScript before Vite.')
assert(packageJson.scripts?.['test:smoke'] === 'node scripts/smoke-test.mjs', 'package.json must expose test:smoke.')
assert(packageJson.scripts?.['test:functions'] === 'node scripts/function-test.cjs', 'package.json must expose test:functions.')
assert(packageJson.scripts?.['test:production'] === 'node scripts/production-smoke.mjs', 'package.json must expose test:production.')
assert(
  packageJson.scripts?.['release:check'] === 'npm run test:smoke && npm run test:functions && npm run build',
  'package.json must expose the complete release check.'
)
assert(packageJson.dependencies?.['@supabase/supabase-js'], 'package.json must include @supabase/supabase-js.')
assert(packageLock.packages?.['']?.dependencies?.['@supabase/supabase-js'], 'package-lock.json must include @supabase/supabase-js at root.')
assert(!exists('pnpm-lock.yaml'), 'pnpm-lock.yaml must not exist because Netlify should use npm/package-lock.')
assert(!exists('dist'), 'dist must not be committed.')
assert(!exists('node_modules'), 'node_modules must not be committed.')
assert(exists('.github/workflows/ci.yml'), 'GitHub Actions CI workflow must exist.')
assert(exists('.github/workflows/production-smoke.yml'), 'Production smoke workflow must exist.')
assert(exists('scripts/function-test.cjs'), 'Function contract tests must exist.')
assert(exists('scripts/production-smoke.mjs'), 'Production smoke tests must exist.')
assert(exists('src/components/errors/AppErrorBoundary.tsx'), 'Global error boundary must exist.')
assert(exists('src/components/errors/NotFoundPage.tsx'), 'Not-found page must exist.')
assert(exists('src/components/legal/LegalPages.tsx'), 'Public legal pages must exist.')

assertFileContains('netlify.toml', [
  'command = "npm run release:check"',
  'publish = "dist"',
  'functions = "netlify/functions"',
  'X-Frame-Options = "DENY"',
  'X-Content-Type-Options = "nosniff"',
  'Referrer-Policy = "strict-origin-when-cross-origin"',
  'from = "/*"',
  'to = "/index.html"',
])

assertFileContains('.github/workflows/ci.yml', [
  'npm ci',
  'npm run release:check',
  'permissions:',
  'contents: read',
])

assertFileContains('.github/workflows/production-smoke.yml', [
  'workflow_dispatch:',
  'schedule:',
  'node scripts/production-smoke.mjs',
  'https://nibras-tutor.netlify.app',
])

assertFileContains('src/lib/supabase.ts', [
  'createClient',
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_PUBLISHABLE_KEY',
  'detectSessionInUrl: true',
  "throw new Error('Missing VITE_SUPABASE_URL",
])
assertFileExcludes('src/lib/supabase.ts', ['sb_publishable_', 'syhypibwebtfqzqlvrlh.supabase.co'])

assertFileContains('src/lib/ai.ts', [
  'supabase.auth.getSession()',
  'headers.Authorization',
  'auth_required',
  'quota_service_unavailable',
  "feature: 'quiz_generation'",
  "feature: 'semantic_grading'",
])

assertFileContains('src/components/auth/AuthPage.tsx', [
  'authNotice',
  'authError',
  'Supabase',
  'otp_expired',
])

assertFileContains('src/components/chatbot/Chatbot.tsx', [
  'serverQuotaUsed',
  'DAILY_LIMIT = 25',
  "feature: 'chat'",
  "feature: 'visual_generation'",
  "type ErrorKind =",
  "| 'auth'",
  'ReactMarkdown',
])
assertFileExcludes('src/components/chatbot/Chatbot.tsx', ['setTimeout(() => sendMessage(cmd), 100)'])

assertFileContains('netlify/functions/chat.cjs', [
  'authenticateUser',
  'getDailyUsage',
  'logUsage',
  'DAILY_USER_LIMIT',
  'Authorization',
  'auth_required',
  'quota_service_unavailable',
  "return 'tencent/hy3'",
  'bad_provider_response',
])
assertFileExcludes('netlify/functions/chat.cjs', ['usageByIp = new Map()', 'checkDailyLimit(', 'incrementDailyUsage('])

assertFileContains('netlify/functions/health.cjs', [
  'authenticatedAiRequired: true',
  'persistentUserQuota: true',
  'publicLegalPages: true',
  'productionSmokeTests: true',
  'dailyUserLimit',
  'does not expose secret values',
])

assertFileContains('src/components/ambient/AmbientNoise.tsx', [
  "type SoundId = 'white' | 'rain' | 'bonfire' | 'forest' | 'cafe' | 'ocean' | 'wind'",
  'new Audio',
  'audio.loop = true',
  'makeWavUrl',
])

assertFileContains('src/components/drive/DriveUploader.tsx', [
  'Upload from computer',
  'Google Drive demo',
  "source: 'local'",
  'accept=".pdf,.docx,.pptx,image/*"',
])

assertFileContains('src/App.tsx', [
  'AppErrorBoundary',
  'NotFoundPage',
  'LegalPage',
  'path="/privacy"',
  'path="/terms"',
])

assertFileContains('src/components/legal/LegalPages.tsx', [
  'Privacy Policy',
  'Terms of Use',
  'AI processing',
  'Academic responsibility',
  'GitHub Issues',
])

assertFileContains('supabase/schema.sql', [
  'enable row level security',
  'private.admin_allowlist',
  'private.is_admin',
  'handle_new_user',
  'idx_ai_usage_logs_user_created_at',
  'create policy "usage_insert_own"',
  'to authenticated',
])
assertFileExcludes('supabase/schema.sql', ['usage_insert_own_or_anonymous'])

assertFileContains('scripts/function-test.cjs', [
  "assert.equal(unauthenticated.statusCode, 401)",
  "assert.equal(JSON.parse(unauthenticated.body).error, 'auth_required')",
  'All Netlify function contract tests passed.',
])

assertFileContains('scripts/production-smoke.mjs', [
  "'/privacy'",
  "'/terms'",
  "'/definitely-missing-page'",
  'health.env.openRouterKeyConfigured',
  "assert.equal(unauthorized.status, 401",
])

assertFileContains('PUBLISH_READY_CHECKLIST.md', [
  'npm run test:smoke',
  'Manual smoke test script',
  'Before inviting many students',
])

warn(
  read('src/store/index.ts').includes("name: 'nibras-v3'"),
  'The current beta still relies partly on browser persistence. Keep the wider-launch warning visible.'
)

console.log('Nibras publish smoke tests')
console.log('--------------------------')
if (warnings.length) {
  console.log('\nWarnings:')
  for (const warning of warnings) console.log(`- ${warning}`)
}

if (failures.length) {
  console.error('\nFailures:')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('\nAll smoke tests passed.')
