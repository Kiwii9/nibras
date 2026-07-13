# Nibras security audit — July 2026

## Scope

Reviewed the public React/Vite client, Netlify AI functions, Supabase schema and policies, authentication flow, local draft persistence, Resources workflow, release automation, and current production deployment status.

This is an engineering security review, not a formal penetration-test certification.

## Verified controls

### Database isolation

A rolled-back PostgreSQL test impersonated an authenticated stranger UUID using the actual `authenticated` database role. The simulated User B saw zero rows belonging to User A in:

- profiles
- exams
- study materials
- generated quizzes
- AI usage logs
- bug reports
- client error logs

A mismatched insert owned by another user was blocked. All public user-data tables have RLS enabled and ownership policies are explicitly scoped to `authenticated`.

### Profile and role protection

The recursive profile update policy was removed. A non-recursive owner/admin policy now works with a trigger that prevents ordinary users from changing profile ID, email, creation time, or role. Trusted SQL-editor/service-role maintenance remains possible.

### AI endpoint

- Valid Supabase session required.
- Browser-supplied provider keys rejected.
- Developer mock mode requires admin/developer role.
- Exact-origin CORS; no wildcard fallback.
- Message role/content/total-size validation.
- One system message maximum.
- Provider and Supabase network timeouts.
- Atomic rate limits: 12 requests/minute and 25 attempts/day per user.
- Successful calls recorded in `ai_usage_logs`.
- Provider error bodies are not returned or logged verbatim.

### Consent and browser state

- Privacy, Terms, and security acknowledgement are mandatory.
- Version and timestamps are stored in the authenticated profile.
- Essential cookie stores only accepted policy version.
- Unfinished app drafts remain in local storage because cookies are too small and transmitted with requests.
- Draft ownership is tied to user ID; account changes clear another account's drafts.
- Unowned legacy drafts and legacy browser API keys are scrubbed on upgrade.

### Retrieval and files

- Lexical retrieval chunks extracted text and selects relevant excerpts.
- Retrieved text is labelled untrusted and cannot override system instructions.
- TXT, Markdown, CSV, and pasted notes are tutor-readable.
- PDF, Word, PowerPoint, and images are metadata-only until real extraction exists.
- Upload type/count/size/duplicate constraints are enforced.

### Reliability and maintenance

- Global error boundary with sanitized, rate-limited authenticated error logging.
- Real 404 route and public legal routes.
- Reduced-motion, Data Saver, weak CPU/memory, tab visibility, and frame-rate controls for animated background.
- Release smoke tests, function contract tests, production smoke workflow, CodeQL, Dependabot, and engineering rules.
- Ordered migrations are the single database source of truth.

## Tests executed against production database

- Cross-user RLS isolation: passed.
- Atomic burst limiter: first 12 calls allowed, 13th denied.
- Client-error RLS: stranger saw zero rows.
- Student consent update: succeeded in a rolled-back role simulation.
- Recursive profile-policy check: zero recursive policies remain.
- RLS enabled: true on all seven current user-data tables.

## Open release blockers

1. Rotate the OpenRouter credential and revoke any value previously shown in chat or support output.
2. Create and enable Cloudflare Turnstile or hCaptcha in Supabase, then wire its site key/token into signup and login.
3. Confirm Auth password policy, leaked-password protection if available, owner MFA, SSL/network settings, and backup retention in the Supabase dashboard.
4. Repair or manually trigger Netlify deployment. Production is still serving an older commit and has not run the current `release:check`.

## Remaining product risks before wide launch

- Exams, quizzes, resources, and chats are still primarily browser-local rather than synchronized and backed up in Supabase.
- No account export/deletion workflow.
- No binary document extraction or malware scanning.
- No dedicated browser end-to-end suite with disposable multi-account fixtures.
- No independent external penetration test.
- No verified production load test or AI budget alert.

## Decision

Do not announce a wide public launch yet. After the four release blockers pass, the current source is suitable for a small controlled beta with invited testers. A broad university launch should wait for cloud persistence, account deletion/export, binary file security, load tests, and independent security review.
