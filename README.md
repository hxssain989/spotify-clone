# Music Player PWA

Mobile-first music player: song search and charts from Apple's iTunes catalog, playback through the YouTube embedded player, installable PWA shell. Music plays while the full player is open on screen (no background playback; see DECISIONS.md).

## Setup

1. In [Google Cloud Console](https://console.cloud.google.com), create a project, enable **YouTube Data API v3**, and create an API key.
2. Add it to `.env` as `YOUTUBE_API_KEY=...`.
3. Install and run:

```bash
npm install
npm run dev
```

Open the dev URL on your phone (same Wi‑Fi) or use `npm run build && npm run preview`.

## Deploy (Vercel)

1. Import this folder as a Vite project.
2. Add environment variable `YOUTUBE_API_KEY`.
3. Deploy. Test install and playback on a real device over HTTPS.

## Scripts

- `npm run dev` — local dev with API proxy
- `npm run build` — production build
- `npm run preview` — serve production build locally

The YouTube key allows about 100 new song lookups a day across all users (each costs 100 of 10,000 daily quota units). Lookups are cached, so replaying a song is free.
