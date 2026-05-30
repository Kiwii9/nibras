# Nibras setup

## Local development

1. Install dependencies:

```bash
npm install
```

2. Create `.env` beside `package.json`:

```env
OPENROUTER_API_KEY=sk-or-v1-your_openrouter_key_here
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

Environment variable required in Netlify:

```env
OPENROUTER_API_KEY=sk-or-v1-your_openrouter_key_here
```

## Notes

- The app uses `HashRouter`, so it does not need `_redirects` for SPA routing.
- The Google Drive upload UI is a safe mock of the intended Google Picker flow. In production, enable Google Picker API + Drive API and use `DocsUploadView` so students can upload from their computer through Google's Drive popup.
- The API key stays in the Netlify Function and is never exposed in frontend code.
