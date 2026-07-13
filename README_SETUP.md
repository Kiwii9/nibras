# Nibras setup

Nibras is a Netlify-hosted study helper backed by Supabase Auth and database policies. Students use the public site; they do not need a local installation.

## Local development

```bash
npm ci
copy .env.example .env
npx netlify dev --port 9999
```

Open `http://localhost:9999`. Use Netlify Dev rather than plain Vite when testing AI functions.

Populate `.env` with your own values. Never commit the completed `.env` file.

Required public browser values:

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key
```

Required server-only values:

```env
AI_PROVIDER=openrouter
OPENROUTER_API_KEY=your_openrouter_server_key
OPENROUTER_MODEL=tencent/hy3
AI_DAILY_USER_LIMIT=25
AI_MAX_MESSAGES=16
AI_MAX_PROMPT_CHARS=12000
AI_MAX_OUTPUT_TOKENS=1800
PUBLIC_SITE_URL=https://nibras-tutor.netlify.app
ALLOWED_ORIGIN=https://nibras-tutor.netlify.app
```

Provider secrets must be scoped to Netlify Functions/runtime and must never use a `VITE_` prefix.

## Release checks

```bash
npm ci
npm run release:check
npm run test:production
```

Netlify runs `npm run release:check` before publishing. GitHub Actions runs the same release gate for pushes and pull requests to `main`.

## Authentication and roles

- Supabase Auth handles email/password signup and login.
- A trigger creates `public.profiles` rows.
- New users default to `student`.
- Admin and developer access comes only from `public.profiles.role`.
- The bootstrap owner email is stored in the private database allowlist, not in frontend authorization code.
- Email confirmation redirects must point to `https://nibras-tutor.netlify.app`.

## Database security

- RLS is enabled on every user-data table.
- Users can read and mutate only rows owned by their authenticated user ID.
- Admin helper functions and allowlists live in the non-exposed `private` schema.
- AI usage is authenticated and stored per user in `public.ai_usage_logs`.
- Daily AI limits are persistent; burst limits use the atomic `consume_rate_limit` database function.
- Never expose a Supabase service-role key to browser code, GitHub, screenshots, or support chats.

## Consent and local drafts

Privacy, Terms, and the security notice are mandatory for signed-in users. Acceptance is recorded in `public.profiles`. A small essential cookie records the accepted policy version. Unfinished quiz and chat state belongs in account-scoped browser storage, not cookies; cookies are too small and are transmitted with requests.

## Resources and RAG

Only extracted text can be used as tutoring context. Binary PDF, Word, PowerPoint, and image files must not be presented as readable by the tutor until extraction succeeds. Text notes are chunked and retrieved by relevance before being passed to the tutor.

## Routing

`netlify.toml` contains the SPA redirect so direct routes such as `/quiz`, `/chat`, `/admin`, `/privacy`, and `/terms` survive refreshes.

## Operational rules

- Rotate provider secrets after accidental disclosure and on a regular schedule.
- Enable leaked-password protection and CAPTCHA in Supabase when the project plan supports them.
- Keep dependency updates and CodeQL checks enabled.
- Review Netlify function logs and `client_error_logs` after releases.
- Confirm database backups in the Supabase dashboard before inviting many students.
