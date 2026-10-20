import type { IncomingMessage, ServerResponse } from 'node:http'

// GET /api/youtube?q=artist+song -> { videoId }
// Plain Node req/res so the same handler runs on Vercel and in the Vite dev server.
export default async function handler(
  req: IncomingMessage,
  res: ServerResponse,
) {
  const send = (status: number, body: object, cacheable = false) => {
    res.statusCode = status
    res.setHeader('Content-Type', 'application/json')
    // One search costs 100 quota units; let Vercel's CDN answer repeats.
    if (cacheable) res.setHeader('Cache-Control', 'public, s-maxage=2592000')
    res.end(JSON.stringify(body))
  }

  const key = process.env.YOUTUBE_API_KEY
  if (!key) return send(500, { error: 'Missing YOUTUBE_API_KEY' })

  const q = new URL(req.url ?? '/', 'http://localhost').searchParams
    .get('q')
    ?.trim()
    .slice(0, 200)
  if (!q) return send(400, { error: 'Missing q' })

  const params = new URLSearchParams({
    part: 'id',
    type: 'video',
    videoEmbeddable: 'true',
    videoCategoryId: '10', // Music
    maxResults: '1',
    q,
    key,
  })

  try {
    const r = await fetch(`https://www.googleapis.com/youtube/v3/search?${params}`)
    const data = (await r.json()) as {
      items?: { id?: { videoId?: string } }[]
      error?: { message?: string }
    }
    if (!r.ok) {
      return send(r.status, { error: data.error?.message ?? 'YouTube request failed' })
    }
    const videoId = data.items?.[0]?.id?.videoId
    if (!videoId) return send(404, { error: 'No video found' })
    send(200, { videoId }, true)
  } catch {
    send(502, { error: 'YouTube request failed' })
  }
}
