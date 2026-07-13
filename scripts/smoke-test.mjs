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

const packageJson = JSON.parse(read('package.json'))
const packageLock = JSON.parse(read('package-lock.json'))
const netlifyToml = read('netlify.toml')
const chatFunction = read('netlify/functions/chat.cjs')
const supabaseClient = read('src/lib/supabase.ts')
const authPage = read('src/components/auth/AuthPage.tsx')
const chatPage = read('src/components/chatbot/Chatbot.tsx')
const ambientNoise = read('src/components/ambient/AmbientNoise.tsx')
const resourcesPage = read('src/components/drive/DriveUploader.tsx')
const schema = read('supabase/schema.sql')

assert(packageJson.scripts?.build === 'tsc && vite build', 'package.json build script must run TypeScript before Vite.')
assert(packageJson.scripts?.['test:smoke'] === 'node scripts/smoke-test.mjs', 'package.json must expose test:smoke.')
assert(packageJson.scripts?.['release:check']?.includes('npm run build'), 'package.json must expose release:check with build.')
assert(packageJson.dependencies?.['@supabase/supabase-js'], 'package.json must include @supabase/supabase-js.')
assert(packageLock.packages?.['']?.dependencies?.['@supabase/supabase-js'], 'package-lock.json must include @supabase/supabase-js at root.')
assert(!exists('pnpm-lock.yaml'), 'pnpm-lock.yaml must not exist because Netlify should use npm/package-lock.')
assert(!exists('dist'), 'dist must not be committed.')
assert(!exists('node_modules'), 'node_modules must not be committed.')

assertFileContains('netlify.toml', [
  'command = "npm run build"',
  'publish = "dist"',
  'functions = "netlify/functions"',
  'from = "/*"',
  'to = "/index.html"',
])

assertFileContains('src/lib/supabase.ts', [
  'createClient',
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_PUBLISHABLE_KEY',
  'detectSessionInUrl: true',
])

assertFileContains('src/components/auth/AuthPage.tsx', [
  'authNotice',
  'authError',
  'Supabase',
])

assertFileContains('src/components/chatbot/Chatbot.tsx', [
  'RateLimitCard',
  'classifyError',
  'provider',
  'ReactMarkdown',
])

assertFileContains('netlify/functions/chat.cjs', [
  'OPENROUTER_URL',
  'routePlatformKey',
  'isUsableContent',
  'bad_provider_response',
  'Access-Control-Allow-Origin',
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

assertFileContains('supabase/schema.sql', [
  'enable row level security',
  'private.admin_allowlist',
  'private.is_admin',
  'handle_new_user',
  'Mohammed.Ali.H1@outlook.sa',
])

warn(!supabaseClient.includes('sb_publishable_'), 'src/lib/supabase.ts currently contains a fallback publishable key. Prefer env-only before a larger launch.')
warn(!chatFunction.includes('usageByIp = new Map()'), 'AI usage is still in-memory. Prefer Supabase-backed quotas before larger public launch.')
warn(!packageJson.scripts?.lint?.includes('eslint .') || exists('.eslintrc') || exists('eslint.config.js'), 'lint script exists but no ESLint config was found.')

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
