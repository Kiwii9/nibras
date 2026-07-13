# Nibras security release checklist

No release is described as “perfect” or “unhackable.” A release is accepted only when its defined checks and manual controls pass.

## Automated release gate

Run from a clean checkout before every release:

```bash
npm ci
npm run release:check
npm run test:production
```

Required repository automation:

- Nibras CI on pushes and pull requests to `main`.
- CodeQL JavaScript/TypeScript analysis.
- Weekly Dependabot updates.
- Daily production smoke workflow.
- Netlify build command: `npm run release:check`.

## Verified database controls

- RLS enabled on every public user-data table.
- Policies explicitly scoped to `authenticated`.
- Cross-user test: User B reads zero rows from User A profile, exam, material, quiz, usage log, bug report, and client error log.
- Profile updates use a non-recursive owner/admin policy.
- A trigger prevents regular users changing protected profile identity/role fields.
- AI burst limit: 12 requests per minute per authenticated user.
- AI daily limit: 25 attempts per UTC day per authenticated user.
- Client errors and bug reports are rate-limited and owner-scoped.

Run `supabase/tests/rls_isolation.sql` on a staging branch after policy changes.

## Manual platform blockers

These require owner credentials or third-party keys and cannot be truthfully marked complete from source code alone:

- [ ] Rotate the OpenRouter credential and revoke the previously exposed value.
- [ ] Confirm the replacement key is secret and Functions/runtime-only in Netlify.
- [ ] Create a Cloudflare Turnstile or hCaptcha widget.
- [ ] Enable CAPTCHA under Supabase Auth > Bot and Abuse Protection.
- [ ] Pass the CAPTCHA token through signup/login after the site key is supplied.
- [ ] Set Supabase password minimum to at least 10 characters and require letters and numbers.
- [ ] Enable leaked-password protection when the project is on Pro or higher.
- [ ] Review Supabase Auth rate limits and email/OTP cooldowns.
- [ ] Enable MFA on GitHub, Netlify, and Supabase owner accounts.
- [ ] Confirm SSL enforcement and database network restrictions appropriate to the plan.
- [ ] Confirm scheduled backups in Database > Backups; Free projects require regular off-site `supabase db dump` exports.
- [ ] Configure custom SMTP and disable email link tracking before a large launch.
- [ ] Repair Netlify’s GitHub connection so current `main` commits deploy automatically.

## Manual browser smoke test

Use two ordinary test accounts and one developer account in fresh browser profiles:

1. Open `/privacy` and `/terms` while logged out.
2. Submit empty, malformed, oversized, and valid registration forms.
3. Confirm a newly registered user must accept Privacy, Terms, and the security notice.
4. Confirm User B cannot see User A data by changing IDs or calling Supabase REST directly.
5. Confirm the student account receives a 404 at `/admin`; developer access succeeds.
6. Confirm unauthenticated real and mock AI calls return 401.
7. Confirm rapid AI calls hit the burst limit and daily calls hit the daily limit.
8. Test provider timeout, invalid provider credential, offline mode, expired session, and interrupted request.
9. Add TXT/Markdown/CSV notes and verify relevant retrieval; verify PDF/Word/image cards say text was not extracted.
10. Start a quiz/chat, reload, and verify draft recovery for the same account.
11. Log in as another account on the same device and verify the previous account’s drafts are absent.
12. Test every focus sound, Pomodoro, exams, Resources, direct-route refresh, and an invalid route.
13. Test on a low-end Android device with Data Saver and reduced-motion enabled.
14. Check Netlify function logs, Supabase `client_error_logs`, Security Advisor, and Performance Advisor.

## Controlled beta acceptance

A small controlled beta can launch only when:

- Current `main` has a green Netlify `release:check` deployment.
- GitHub CI and CodeQL are green.
- Production smoke tests pass against that exact deploy commit.
- RLS and role tests pass with two real test accounts.
- Credential rotation, CAPTCHA, Auth settings, and backup checks above are completed.
- Privacy/security consent is recorded successfully.
- No server, service-role, AI-provider, database-password, CAPTCHA-secret, or monitoring secret appears in the repository or browser bundle.

## Before inviting many students

- Persist exams, quizzes, materials, and chat summaries in Supabase rather than relying mainly on browser storage.
- Add account export and account deletion.
- Add browser-level end-to-end tests with dedicated disposable accounts.
- Add AI spend alerts, provider-health alerts, and a tested provider fallback policy.
- Add real binary document extraction and malware scanning before claiming PDF/Word/image tutoring.
- Run load testing in staging and define measurable latency/error-rate budgets.
- Perform an independent security review or penetration test.
