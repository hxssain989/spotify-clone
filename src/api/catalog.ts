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

export async function searchTracks(query: string): Promise<Track[]> {
  if (!query.trim()) return []
  return songs('/search', { term: query.trim(), entity: 'song', limit: '25' })
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

// Song -> YouTube video id. Each miss costs 100 units of the shared
// 10k/day YouTube quota, so hits are kept in localStorage forever.
// ponytail: per-device cache only; add a shared KV store if quota runs out.
const VIDEO_IDS_KEY = 'yt-video-ids'

function readVideoIds(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(VIDEO_IDS_KEY) ?? '{}')
  } catch {
    return {}
  }
}

export async function resolveVideoId(track: Track): Promise<string> {
  const ids = readVideoIds()
  if (ids[track.id]) return ids[track.id]
  const q = `${track.artistName} ${track.name} audio`
  const res = await fetch(`/api/youtube?${new URLSearchParams({ q })}`)
  const data = (await res.json()) as { videoId?: string; error?: string }
  if (!res.ok || !data.videoId) throw new Error(data.error ?? 'No video found')
  try {
    localStorage.setItem(
      VIDEO_IDS_KEY,
      JSON.stringify({ ...ids, [track.id]: data.videoId }),
    )
  } catch {
    // storage full or blocked: just resolve again next time
  }
  return data.videoId
}
