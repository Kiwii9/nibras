# Nibras v1 Student Launch Checklist

This checklist keeps Nibras focused as a real university-student tool instead of a broad demo with too many promises.

## Product promise

Use this positioning for v1:

> نِبْرَاس — نسخة تجريبية لمساعدة طلاب الجامعة على المراجعة، توليد الأسئلة، وتنظيم الاختبارات.

English:

> Nibras — a beta study helper for university students to review, generate practice questions, and organize exams.

Do not market v1 as a complete learning platform yet.

## v1 must-have student flow

The app should make this flow feel obvious within 10 seconds:

1. Add/paste lecture material or write a topic.
2. Generate summary, quiz, flashcards, or simple explanation.
3. Save the useful result.
4. Track the next exam.
5. Start a 25-minute focus session.

## Screens by role

### Student

Student screens should stay clean and non-technical:

- Dashboard
- AI Tutor
- Quiz Generator
- Exam Tracker
- Pomodoro
- Resources / Materials

### Admin

Admin screens are for trusted maintainers only:

- Usage counts
- Bug reports
- User reports
- Announcements
- AI request logs
- Block/limit abusive users
- Manage public course resources

### Developer

Developer tools should never be exposed as normal product features:

- Prompt tester
- Mock API tester
- Feature flags
- Provider status
- Last function error
- Build/version info

## Before inviting students

### Authentication

- [ ] Replace local demo accounts with Supabase Auth.
- [ ] Remove `passwordHash` from frontend state.
- [ ] Store profiles in Supabase.
- [ ] Add role field: `student`, `admin`, `developer`.
- [ ] Protect admin/developer access with Supabase roles, not only frontend checks.

### Database

Create these tables first:

- [ ] `profiles`
- [ ] `exams`
- [ ] `study_materials`
- [ ] `generated_quizzes`
- [ ] `ai_usage_logs`
- [ ] `bug_reports`

### Supabase RLS

- [ ] Enable RLS on every user-data table.
- [ ] Students can only read/write their own records.
- [ ] Admins can read operational logs and reports.
- [ ] Never expose service role keys in frontend code.

### AI cost control

- [ ] Keep provider keys inside Netlify Functions only.
- [ ] Add persistent per-user daily usage limits in Supabase.
- [ ] Limit prompt size.
- [ ] Limit output tokens.
- [ ] Add graceful error messages for rate limits.
- [ ] Add fallback provider support: OpenRouter, Groq, Gemini.

Recommended beta limits:

```text
Guest/IP: 3-5 AI requests/day
Logged-in student: 10-15 AI requests/day
Trusted testers: 30 requests/day
Admin/developer: higher limit
```

## What to hide until after v1

Hide or de-emphasize these until the core flow is stable:

- Roadmap page
- Advanced settings
- Developer prompt tester
- Too many visual effects
- Any cloud-sync claim before Supabase sync is working
- Google Drive upload unless the real flow works reliably

## Harsh quality bar

A student should be able to answer these questions without explanation:

1. What does Nibras do?
2. What should I click first?
3. Is my data saved?
4. How many AI uses do I have today?
5. What happens if the AI limit is reached?
6. How do I report a wrong answer?

If the UI does not answer these, the product is not ready for public student launch.
