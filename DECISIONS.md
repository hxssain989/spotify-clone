# Decisions

- **PWA icons:** SVG icons instead of PNG (simpler asset pipeline; sufficient for install on most targets).
- **Dev API:** Vite dev middleware proxies `/api/tracks` to Jamendo with `JAMENDO_CLIENT_ID` from `.env` (same path as Vercel serverless in production).
- **Genre tags:** Jamendo tag slugs `pop`, `rock`, `electronic`, `hiphop`, `chillout` for home rows.
- **Playlist create/rename:** Native `prompt()` / `confirm()` for v1 to avoid extra modal UI.
