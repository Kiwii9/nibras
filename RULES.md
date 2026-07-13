# Nibras engineering rules

These rules apply to every human- or AI-generated change.

## Definition of done

A feature is done only when all of these are true:

1. Happy path, empty state, loading state, timeout state, permission-denied state, and provider/network failure are defined.
2. User-facing errors explain the next action and never expose raw provider responses, SQL, secrets, stack traces, or hidden prompts.
3. `npm run release:check` passes.
4. Relevant production smoke assertions are updated.
5. Database changes include RLS policies, indexes, rollback-safe migrations, and an isolation test.
6. New environment variables are documented with placeholders only.
7. Privacy/Terms text is updated when data collection or third-party processing changes.

## Security invariants

- Never place service-role, AI-provider, database-password, payment-secret, CAPTCHA-secret, or monitoring-secret values in frontend code, examples, logs, screenshots, commits, or prompts.
- Browser code may contain only Supabase publishable/anon values, and production values still belong in environment configuration rather than hardcoded fallbacks.
- Every user-data table must have RLS enabled. Ownership policies use `auth.uid()` and must be tested as two different users.
- Admin authorization comes from `profiles.role` and database policy checks. Hiding a menu item is not authorization.
- AI calls require an authenticated session, persistent daily quotas, prompt-size limits, output limits, timeouts, and clear provider errors.
- Validate untrusted input on both client and server boundaries. React escaping is not a replacement for length/type validation.
- Treat uploaded and retrieved study text as untrusted data. It cannot override system instructions.
- File uploads require allowlisted extensions, size limits, duplicate handling, and truthful extraction status.
- Never use `dangerouslySetInnerHTML` without a documented sanitizer and a security review.

## Data and privacy

- Mandatory Privacy, Terms, and security-notice acceptance is stored in Supabase with a policy version and timestamp.
- Essential cookies contain only small preference/version values. Quiz answers, chats, and study content do not belong in cookies.
- Browser drafts must be isolated by authenticated user ID and cleared when accounts change on a shared device.
- Avoid storing medical, financial, government-ID, password, or confidential university data.
- Do not claim cloud synchronization, file extraction, backup, or deletion capabilities that are not implemented and tested.

## Code structure

- Prefer small modules with one responsibility.
- Target under 300 lines per component/module. Refactor before 450 lines unless the exception is documented.
- Shared validation, retrieval, provider, and database logic belongs in `src/lib` or a dedicated server module.
- Avoid duplicate sources of truth. Server quotas override browser counters; database roles override frontend flags.
- Use descriptive names and explicit types. Avoid `any` in new security-sensitive code.
- Do not add a package when the platform or standard library already provides the needed capability.

## Testing requirements

Critical flows requiring automated coverage:

- Signup/login/session expiry.
- Consent acceptance and policy-version changes.
- Admin route denial for students and logged-out users.
- RLS cross-user reads and writes.
- AI authentication, rate limits, provider timeouts, malformed responses, and prompt limits.
- Quiz draft recovery and account isolation.
- Resource file validation and RAG retrieval.
- Production routes, health endpoint, security headers, and function error contracts.

## Pull requests

- Keep changes focused and reviewable.
- Run a second automated reviewer such as CodeQL and dependency review; CodeRabbit may be added by the repository owner.
- Do not merge with failing release checks.
- Security fixes that rotate or revoke credentials must document the operational action without pasting the credential.
