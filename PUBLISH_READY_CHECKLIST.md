# Nibras Publish-Ready Checklist

Use this before inviting real students. The app can be public, but student invitations should only start after every required item is checked.

## 1. Build and release checks

Required before every launch:

```bash
npm ci
npm run test:smoke
npm run build
```

The GitHub Actions workflow `Nibras CI` runs the same smoke test and production build on every push to `main` and every pull request.

## 2. Netlify production settings

Required environment variables:

```env
VITE_SUPABASE_URL=<your Supabase project URL>
VITE_SUPABASE_PUBLISHABLE_KEY=<your Supabase publishable key>
PUBLIC_SITE_URL=https://nibras-tutor.netlify.app
ALLOWED_ORIGIN=https://nibras-tutor.netlify.app
AI_PROVIDER=openrouter
OPENROUTER_MODEL=tencent/hy3:free
OPENROUTER_API_KEY=<secret server-only key>
AI_DAILY_IP_LIMIT=25
AI_MAX_MESSAGES=16
AI_MAX_PROMPT_CHARS=12000
AI_MAX_OUTPUT_TOKENS=1800
```

Security requirement:

- `OPENROUTER_API_KEY` must be secret and scoped to Netlify Functions/server runtime only.
- Never create a `VITE_` variable for AI provider keys.
- Rotate any AI key that was ever shared in chat, screenshots, logs, or support tools.

## 3. Supabase Auth settings

Required URL configuration:

```text
Site URL:
https://nibras-tutor.netlify.app

Redirect URLs:
https://nibras-tutor.netlify.app/**
https://main--nibras-tutor.netlify.app/**
http://localhost:9999/**
```

Required database security:

- RLS enabled on user-data tables.
- `private.is_admin()` remains in the private schema.
- `private.admin_allowlist` includes the launch owner/developer email.
- Service-role keys are never used in frontend code.

## 4. Manual smoke test script

After every production deploy, test these flows in a fresh browser session:

1. Open `https://nibras-tutor.netlify.app`.
2. Hard refresh with `Ctrl + F5`.
3. Sign up or log in with the developer email.
4. Confirm `/admin` is accessible only for the developer/admin user.
5. Ask the chatbot: `explain Dijkstra algorithm simply`.
6. Ask the quiz generator to create 3 MCQ questions from a simple topic.
7. Add an exam and refresh the page.
8. Start Pomodoro and stop/reset it.
9. Open Focus Sounds and test: Static, Rain, Bonfire, Cafe, Ocean.
10. Upload a local PDF/image in Resources.
11. Refresh `/chat`, `/quiz`, `/admin`, `/resources`; SPA redirects should work.
12. Log out, then log in again.

## 5. What is safe to publish now

Public beta is acceptable for small testing when:

- Production Netlify build is green.
- GitHub Actions is green.
- Supabase Auth redirects work.
- Chat returns a real tutor answer or a clear provider error.
- Focus sounds produce distinct audio.
- Local uploads work without server upload claims.
- Admin/developer page is role-protected.

## 6. Before inviting many students

Do these before a wider launch:

- Replace in-memory AI rate limits with Supabase-backed per-user quotas.
- Persist exams, quizzes, resources, and chat summaries to Supabase instead of only local browser storage.
- Add real Google Picker if Drive import is advertised as production-ready.
- Add a Privacy Policy and Terms page.
- Rotate all API keys and confirm secrets are not visible in support transcripts or logs.
