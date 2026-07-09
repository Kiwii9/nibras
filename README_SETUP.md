# Nibras setup

Nibras is a public web app hosted on Netlify. Students should use it from a normal link; they should not need to download the project or run localhost.

## Local development

1. Install dependencies:

```bash
npm install
```

2. Create `.env` beside `package.json`:

```env
# Public frontend variables
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_ADMIN_EMAILS=your_email@example.com

# Server-only Netlify Function variables
AI_PROVIDER=openrouter
OPENROUTER_API_KEY=sk-or-v1-your_openrouter_key_here
OPENROUTER_MODEL=meta-llama/llama-3.1-8b-instruct:free

# Optional free/cheap provider fallback
GROQ_API_KEY=gsk_your_groq_key_here
GROQ_MODEL=llama-3.1-8b-instant
GEMINI_API_KEY=your_gemini_key_here
GEMINI_MODEL=gemini-1.5-flash

# Free beta safeguards
AI_DAILY_IP_LIMIT=25
AI_MAX_MESSAGES=16
AI_MAX_PROMPT_CHARS=12000
AI_MAX_OUTPUT_TOKENS=1800
PUBLIC_SITE_URL=http://localhost:9999
ALLOWED_ORIGIN=http://localhost:9999
```

3. Run through Netlify Dev so chatbot and quiz generation can access the backend function:

```bash
npx netlify dev --port 9999
```

4. Open:

```text
http://localhost:9999
```

Do not use `http://localhost:5173` for testing chatbot or quiz generation because that runs Vite without Netlify Functions.

## Deployment on Netlify

Build command:

```bash
npm run build
```

Publish directory:

```text
dist
```

Functions directory:

```text
netlify/functions
```

Required Netlify environment variables for the current AI proxy:

```env
AI_PROVIDER=openrouter
OPENROUTER_API_KEY=sk-or-v1-your_openrouter_key_here
OPENROUTER_MODEL=meta-llama/llama-3.1-8b-instruct:free
AI_DAILY_IP_LIMIT=25
AI_MAX_MESSAGES=16
AI_MAX_PROMPT_CHARS=12000
AI_MAX_OUTPUT_TOKENS=1800
PUBLIC_SITE_URL=https://nibras.netlify.app
ALLOWED_ORIGIN=https://nibras.netlify.app
```

Optional fallback variables:

```env
GROQ_API_KEY=gsk_your_groq_key_here
GROQ_MODEL=llama-3.1-8b-instant
GEMINI_API_KEY=your_gemini_key_here
GEMINI_MODEL=gemini-1.5-flash
```

Supabase variables are required once production authentication and database sync are enabled:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_ADMIN_EMAILS=your_email@example.com
```

## Routing

The app uses `BrowserRouter`, so Netlify needs a single-page-app redirect. This is configured in `netlify.toml`:

```toml
[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

Without this redirect, direct links such as `/quiz`, `/chat`, or `/admin` may return a 404 on refresh.

## Current beta security status

- The AI key stays in the Netlify Function and is never exposed in frontend code.
- The Netlify Function has basic prompt-size, output-token, and per-IP daily limits.
- The current local account system is for demo testing only. It is not production authentication.
- Before inviting real students, replace local demo auth with Supabase Auth and store roles/usage in Supabase.
- The current in-memory IP limit is a cheap launch guard. It can reset between function instances and should be replaced by Supabase-backed usage logs for a wider launch.

## Notes

- The Google Drive upload UI is a safe mock of the intended Google Picker flow. In production, enable Google Picker API + Drive API and use `DocsUploadView` so students can upload from their computer through Google's Drive popup.
- Do not promise permanent cloud sync until Supabase persistence is fully wired for profiles, exams, quizzes, files, and usage logs.
