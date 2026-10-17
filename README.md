# Music Player PWA

Mobile-first music player (Jamendo catalog) with background playback, Media Session lock-screen controls, and installable PWA shell.

## Setup

1. Register at [developer.jamendo.com](https://developer.jamendo.com) and create an app to get a `client_id`.
2. Paste your Jamendo `client_id` into `.env` as `JAMENDO_CLIENT_ID`.
3. Install and run:

```bash
npm install
npm run dev
```

Open the dev URL on your phone (same Wi‑Fi) or use `npm run build && npm run preview`.

## Deploy (Vercel)

1. Import this folder as a Vite project.
2. Add environment variable `JAMENDO_CLIENT_ID`.
3. Deploy. Test install + background playback on a real device over HTTPS.

## Scripts

- `npm run dev` — local dev with API proxy
- `npm run build` — production build
- `npm run preview` — serve production build locally

Music is streamed via Jamendo (non-commercial API terms). See **Library → About** in the app.
