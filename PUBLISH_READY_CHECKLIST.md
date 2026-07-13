# Nibras Publish-Ready Checklist

## Required automated checks

Run before every release:

```bash
npm ci
npm run test:smoke
npm run test:functions
npm run release:check
npm run test:production
```

GitHub CI runs the release checks on pushes and pull requests. A scheduled workflow checks the live production site every day.

## Manual smoke test script

After deployment:

1. Open the home page and hard refresh.
2. Open `/privacy` and `/terms` while logged out.
3. Register and confirm the email redirect returns to Netlify.
4. Verify developer access to `/admin` and deny normal students.
5. Test chat, quiz generation, exams, Pomodoro, Resources, and every focus sound.
6. Refresh all direct routes and verify the 404 page on an invalid route.
7. Log out and back in.
8. Verify the production health endpoint.

## Controlled beta acceptance

Publish the controlled beta only when:

- Netlify completes `release:check`.
- GitHub CI is green.
- Production smoke tests pass.
- Authentication redirects work.
- AI calls require a signed-in user.
- Daily AI limits are stored and counted in Supabase.
- Privacy and Terms pages are public.
- Admin access is role-protected.

## Before inviting many students

- Persist exams, quizzes, materials, and chat summaries in Supabase rather than mainly in browser storage.
- Add in-product account deletion.
- Add a real Google Drive picker before advertising Drive as complete.
- Add browser-level end-to-end tests with a dedicated test account.
- Add AI budget alerts and provider failover.
- Rotate launch credentials and revoke old values.
