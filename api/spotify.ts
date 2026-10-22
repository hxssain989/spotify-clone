import type { IncomingMessage, ServerResponse } from 'node:http'
import { hasAccess } from './_access.js'

// GET /api/spotify?url=<playlist link> -> { name, image, tracks }
// Spotify's API no longer returns songs of playlists you don't own, so this
// reads the public embed page (the mini player sites put on their pages).
// ponytail: unofficial and capped at the first 100 songs; if Spotify changes
// the page, update parseEmbed().
export default async function handler(
  req: IncomingMessage,
  res: ServerResponse,
) {
  const send = (status: number, body: object, cacheable = false) => {
    res.statusCode = status
    res.setHeader('Content-Type', 'application/json')
    res.setHeader(
      'Cache-Control',
      cacheable ? 'public, s-maxage=3600' : 'no-store',
    )
    res.end(JSON.stringify(body))
  }

  try {
    if (!(await hasAccess(req))) {
      return send(401, { error: 'Enter your access code' })
    }
  } catch {
    return send(500, { error: 'Could not check access' })
  }

  const link =
    new URL(req.url ?? '/', 'http://localhost').searchParams.get('url') ?? ''
  const id = await playlistId(link)
  if (!id) {
    return send(400, { error: "That isn't a Spotify playlist link." })
  }

  try {
    const r = await fetch(`https://open.spotify.com/embed/playlist/${id}`, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
    })
    if (!r.ok) return send(404, { error: 'Playlist not found.' })
    const playlist = parseEmbed(await r.text())
    if (!playlist?.tracks.length) {
      return send(404, {
        error: 'No songs found. Make sure the playlist is public.',
      })
    }
    send(200, playlist, true)
  } catch {
    send(502, { error: 'Could not reach Spotify. Try again.' })
  }
}

const findId = (s: string) => s.match(/playlist[/:]([A-Za-z0-9]{22})/)?.[1]

// Accepts full links, spotify: URIs, whole share messages, and the short
// spotify.link / spotify.app.link links newer Spotify apps share.
async function playlistId(link: string) {
  const direct = findId(link)
  if (direct) return direct
  const short = link.match(/https?:\/\/spotify(?:\.app)?\.link\/\S+/)?.[0]
  if (!short) return undefined
  try {
    // Only trust where it redirects; the landing page mentions other playlists.
    const r = await fetch(short, { headers: { 'User-Agent': 'Mozilla/5.0' } })
    return findId(r.url)
  } catch {
    return undefined
  }
}

type EmbedTrack = {
  uri: string
  title: string
  subtitle: string
  duration: number
}

function parseEmbed(html: string) {
  const json = html.match(
    /<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/,
  )?.[1]
  if (!json) return null
  const entity = JSON.parse(json)?.props?.pageProps?.state?.data?.entity as
    | {
        name?: string
        coverArt?: { sources?: { url: string }[] }
        trackList?: EmbedTrack[]
      }
    | undefined
  if (!entity) return null
  return {
    name: entity.name ?? 'Spotify playlist',
    image: entity.coverArt?.sources?.[0]?.url ?? '',
    tracks: (entity.trackList ?? []).map((t) => ({
      id: t.uri.split(':').pop() ?? t.uri,
      name: t.title,
      artists: t.subtitle.replace(/ /g, ' '),
      duration: Math.round(t.duration / 1000),
    })),
  }
}
