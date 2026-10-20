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

// iTunes has no popularity score. Proxy: the original artist shows up many
// times (album, single, deluxe, remixes), a cover artist once. We drop
// duplicates and loose matches, rank by that count, and push alt versions down.
export function rankResults(query: string, tracks: Track[]): Track[] {
  const artistHits = new Map<string, number>()
  for (const t of tracks) {
    artistHits.set(mainArtist(t), (artistHits.get(mainArtist(t)) ?? 0) + 1)
  }
  const seen = new Set<string>()
  const unique = tracks.filter((t) => {
    const key = `${norm(t.name)}|${norm(t.artistName)}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
  const words = norm(query).split(' ')
  const relevant = unique.filter((t) => {
    const text = ` ${norm(`${t.name} ${t.artistName}`)} `
    return words.every((w) => text.includes(w))
  })
  const q = norm(query)
  // "Him & I (Remastered)" -> "him and i": exact title matches come first,
  // unless the query is an artist name ("taylor swift").
  const artistQuery = (artistHits.get(q) ?? 0) >= 3
  const exact = (t: Track) =>
    !artistQuery && norm(t.name.replace(/\s*[([].*$/, '')) === q ? 1 : 0
  const hits = (t: Track) => artistHits.get(mainArtist(t)) ?? 0
  const list = (relevant.length ? relevant : unique).sort(
    (a, b) => exact(b) - exact(a) || hits(b) - hits(a), // stable on ties
  )
  if (ALT_VERSION.test(query)) return list.slice(0, 25)
  const isAlt = (t: Track) =>
    ALT_VERSION.test(`${t.name} ${t.artistName} ${t.albumName}`) ||
    TAGGED.test(t.name)
  return [...list.filter((t) => !isAlt(t)), ...list.filter(isAlt)].slice(0, 25)
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
