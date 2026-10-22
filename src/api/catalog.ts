import { relock } from '../components/AccessGate'
import type { Track } from '../types'

// iTunes Search API: free, no key, CORS-enabled, ~20 calls/min per IP.
const ITUNES = 'https://itunes.apple.com'

type ItunesTrack = {
  wrapperType: string
  kind?: string
  trackId: number
  trackName: string
  artistId: number
  artistName: string
  collectionName?: string
  artworkUrl100?: string
  trackTimeMillis?: number
}

type ChartEntry = {
  'im:name': { label: string }
  'im:image': { label: string }[]
  'im:collection'?: { 'im:name': { label: string } }
  'im:artist': { label: string; attributes?: { href: string } }
  id: { attributes: { 'im:id': string } }
}

const cache = new Map<string, Track[]>()

const bigArt = (url = '') => url.replace(/\/\d+x\d+bb\./, '/600x600bb.')

export function mapTrack(raw: ItunesTrack): Track {
  return {
    id: String(raw.trackId),
    name: raw.trackName,
    artistId: String(raw.artistId),
    artistName: raw.artistName,
    albumName: raw.collectionName || 'Unknown album',
    image: bigArt(raw.artworkUrl100),
    duration: Math.round((raw.trackTimeMillis ?? 0) / 1000),
  }
}

function mapChartEntry(e: ChartEntry): Track {
  return {
    id: e.id.attributes['im:id'],
    name: e['im:name'].label,
    artistId: e['im:artist'].attributes?.href.match(/\/(\d+)/)?.[1] ?? '',
    artistName: e['im:artist'].label,
    albumName: e['im:collection']?.['im:name'].label || 'Unknown album',
    image: bigArt(e['im:image'].at(-1)?.label),
    duration: 0, // chart feed has no length; the player fills it in
  }
}

async function cached(url: string, parse: (data: any) => Track[]) {
  const hit = cache.get(url)
  if (hit) return hit
  const res = await fetch(url)
  if (!res.ok) throw new Error('Failed to load tracks')
  const tracks = parse(await res.json())
  cache.set(url, tracks)
  return tracks
}

function songs(path: string, params: Record<string, string>) {
  return cached(`${ITUNES}${path}?${new URLSearchParams(params)}`, (data) =>
    (data.results as ItunesTrack[])
      .filter((r) => r.wrapperType === 'track' && r.kind === 'song')
      .map(mapTrack),
  )
}

function chart(genreId?: string) {
  const genre = genreId ? `/genre=${genreId}` : ''
  return cached(`${ITUNES}/us/rss/topsongs/limit=20${genre}/json`, (data) => {
    const entry = data.feed?.entry ?? []
    return (Array.isArray(entry) ? entry : [entry]).map(mapChartEntry)
  })
}

// Versions people rarely mean unless they type the word themselves.
const ALT_VERSION =
  /karaoke|instrumental|originally performed|tribute|cover|sped up|speed|slowed|reverb|nightcore|8d|lullaby|kidz bop|rockabye|hardstyle|remix|\bmix\b|\bedit\b|version|8 bit|acoustic/i

// "(Techno)", "[Live]": any bracket tag except feat./with/from/remaster.
const TAGGED = /[([](?!feat|ft\.|with|from|remaster)[^)\]]*[)\]]/i

const norm = (s: string) =>
  s
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^\p{L}\p{N} ]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()

const mainArtist = (t: Track) =>
  norm(t.artistName.split(/,|&| feat| ft\.| x /i)[0])

const baseTitle = (t: Track) => norm(t.name.replace(/\s*[([].*$/, ''))

// "Him & I (Techno)", karaoke, covers... unless the user typed that word.
// (Taylor's Version) is a re-recording by the artist, so it stays.
const isAlt = (t: Track) => {
  const text = `${t.name} ${t.artistName} ${t.albumName}`.replace(
    /taylor['’]s version/gi,
    '',
  )
  return (
    ALT_VERSION.test(text) ||
    TAGGED.test(t.name.replace(/\(taylor['’]s version\)/gi, ''))
  )
}

// Only songs whose title is what was typed survive (or starts with it while
// typing, or title + artist like "aarzu hasan raheem"). If the query is an
// artist's name, show that artist's songs instead. iTunes has no popularity
// score, so we rank by how often each artist appears: originals have many
// releases (album, single, deluxe), covers one.
export function rankResults(query: string, tracks: Track[]): Track[] {
  const q = norm(query)
  if (!q) return []
  const artistHits = new Map<string, number>()
  for (const t of tracks) {
    artistHits.set(mainArtist(t), (artistHits.get(mainArtist(t)) ?? 0) + 1)
  }
  const hits = (t: Track) => artistHits.get(mainArtist(t)) ?? 0

  const titleMatch = (t: Track) => {
    const title = baseTitle(t)
    if (!title) return false
    if (title.startsWith(q)) return true
    const artistWords = norm(t.artistName).split(' ')
    const inArtist = (rest: string) =>
      rest.split(' ').every((w) => artistWords.includes(w))
    if (q.startsWith(`${title} `)) return inArtist(q.slice(title.length + 1))
    if (q.endsWith(` ${title}`)) return inArtist(q.slice(0, -title.length - 1))
    return false
  }
  const byTitle = tracks.filter(titleMatch)
  const byArtist = tracks.filter((t) => norm(t.artistName).includes(q))
  const artistSearch = byArtist.length > byTitle.length
  let list = artistSearch ? byArtist : byTitle

  if (!ALT_VERSION.test(query)) {
    const originals = list.filter((t) => !isAlt(t))
    if (originals.length) list = originals
  }

  const seen = new Set<string>()
  list = list.filter((t) => {
    const key = `${baseTitle(t)}|${mainArtist(t)}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  if (!artistSearch) {
    const exact = (t: Track) => (baseTitle(t) === q ? 1 : 0)
    list.sort((a, b) => exact(b) - exact(a) || hits(b) - hits(a)) // stable
  }
  return list.slice(0, artistSearch ? 20 : 10)
}

export async function searchTracks(query: string): Promise<Track[]> {
  if (!query.trim()) return []
  const raw = await songs('/search', {
    term: query.trim(),
    entity: 'song',
    limit: '50',
  })
  return rankResults(query, raw)
}

export function getTrending(): Promise<Track[]> {
  return chart()
}

export function getByGenre(genreId: string): Promise<Track[]> {
  return chart(genreId)
}

export function getByArtist(artistId: string): Promise<Track[]> {
  return songs('/lookup', { id: artistId, entity: 'song', limit: '25' })
}

export async function getTrack(id: string): Promise<Track | null> {
  const tracks = await songs('/lookup', { id })
  return tracks[0] ?? null
}

// Spotify playlist link -> songs, via /api/spotify (first 100 songs).
export async function importSpotifyPlaylist(
  link: string,
): Promise<{ name: string; tracks: Track[] }> {
  const res = await fetch(`/api/spotify?${new URLSearchParams({ url: link })}`)
  if (res.status === 401) relock()
  const data = (await res.json()) as {
    name?: string
    image?: string
    tracks?: { id: string; name: string; artists: string; duration: number }[]
    error?: string
  }
  if (!res.ok || !data.tracks) throw new Error(data.error ?? 'Import failed')
  return {
    name: data.name ?? 'Spotify playlist',
    tracks: data.tracks.map((t) => ({
      id: `sp:${t.id}`,
      name: t.name,
      artistId: '',
      artistName: t.artists,
      albumName: data.name ?? 'Spotify playlist',
      image: data.image ?? '', // the embed has no per-song covers
      duration: t.duration,
    })),
  }
}

// Song -> candidate YouTube video ids. Each miss costs 100 units of the
// shared 10k/day YouTube quota, so hits are kept in localStorage.
// ponytail: per-device cache only; add a shared KV store if quota runs out.
const VIDEO_IDS_KEY = 'yt-video-ids'

function readVideoIds(): Record<string, string | string[]> {
  try {
    return JSON.parse(localStorage.getItem(VIDEO_IDS_KEY) ?? '{}')
  } catch {
    return {}
  }
}

function saveVideoIds(trackId: string, videoIds: string[]) {
  try {
    localStorage.setItem(
      VIDEO_IDS_KEY,
      JSON.stringify({ ...readVideoIds(), [trackId]: videoIds }),
    )
  } catch {
    // storage full or blocked: just resolve again next time
  }
}

export async function resolveVideoIds(track: Track): Promise<string[]> {
  const hit = readVideoIds()[track.id]
  if (hit?.length) return typeof hit === 'string' ? [hit] : hit
  const q = `${track.artistName} ${track.name} audio`
  const res = await fetch(`/api/youtube?${new URLSearchParams({ q })}`)
  if (res.status === 401) relock() // code was reset or revoked
  const data = (await res.json()) as { videoIds?: string[]; error?: string }
  if (!res.ok || !data.videoIds?.length) {
    throw new Error(data.error ?? 'No video found')
  }
  saveVideoIds(track.id, data.videoIds)
  return data.videoIds
}

// A candidate refused to play (usually "embedding disabled"): forget it.
export function dropVideoId(trackId: string, videoId: string) {
  const hit = readVideoIds()[trackId] ?? []
  saveVideoIds(
    trackId,
    (typeof hit === 'string' ? [hit] : hit).filter((id) => id !== videoId),
  )
}
