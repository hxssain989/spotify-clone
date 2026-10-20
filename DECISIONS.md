# Decisions

- **PWA icons:** SVG icons instead of PNG (simpler asset pipeline; sufficient for install on most targets).
- **Dev API:** Vite dev middleware proxies `/api/tracks` to Jamendo with `JAMENDO_CLIENT_ID` from `.env` (same path as Vercel serverless in production).
- **Genre tags:** Jamendo tag slugs `pop`, `rock`, `electronic`, `hiphop`, `chillout` for home rows.
- **Playlist create/rename:** Native `prompt()` / `confirm()` for v1 to avoid extra modal UI.
- **Catalog switched (Oct 20, 2026):** Jamendo replaced by the iTunes Search API (search, artist, lookup) and iTunes RSS top-songs charts (Home rows, genres by iTunes genre id). Free, no key, called straight from the browser.
- **Playback switched to YouTube:** each song is matched to a YouTube video via `/api/youtube` (YouTube Data API search, 100 quota units per call, 10k/day shared). Matches are cached per device in localStorage and on Vercel's CDN for 30 days. Odesli was the planned free matcher, but its public API now returns `PUBLIC_API_ACCESS_DEPRECATED`.
- **Background playback dropped:** YouTube's embedded player pauses when the screen locks or the app is backgrounded, and Media Session lock-screen controls no longer apply. YouTube's rules require the player to be visible, so it fills the full-player art slot and closing the full player pauses music. This overrides spec priority (1).
- **Chart durations:** the RSS feed has no song length, so chart tracks show none until they play.
