import type { Track } from '../types'

type JamendoTrack = {
  id: string
  name: string
  duration: number
  artist_id: string
  artist_name: string
  album_name: string
  image: string
  audio: string
}

type JamendoResponse = {
  results?: JamendoTrack[]
  headers?: { status: string; code: number }
}

const cache = new Map<string, Track[]>()

function cacheKey(params: Record<string, string>) {
  return JSON.stringify(params)
}

export function mapTrack(raw: JamendoTrack): Track {
  return {
    id: String(raw.id),
    name: raw.name,
    artistId: String(raw.artist_id),
    artistName: raw.artist_name,
    albumName: raw.album_name || 'Unknown album',
    image: raw.image || '',
    audio: raw.audio,
    duration: raw.duration,
  }
}

async function fetchTracks(
  params: Record<string, string>,
): Promise<Track[]> {
  const key = cacheKey(params)
  const hit = cache.get(key)
  if (hit) return hit

  const qs = new URLSearchParams({
    limit: '20',
    offset: '0',
    include: 'musicinfo',
    imagesize: '500',
    ...params,
  })
  const res = await fetch(`/api/tracks?${qs}`)
  if (!res.ok) throw new Error('Failed to load tracks')
  const data = (await res.json()) as JamendoResponse
  const tracks = (data.results ?? []).map(mapTrack).filter((t) => t.audio)
  cache.set(key, tracks)
  return tracks
}

export async function searchTracks(query: string): Promise<Track[]> {
  if (!query.trim()) return []
  return fetchTracks({ search: query.trim() })
}

export async function getTrending(): Promise<Track[]> {
  return fetchTracks({ order: 'popularity_week' })
}

export async function getByGenre(genre: string): Promise<Track[]> {
  return fetchTracks({ tags: genre, order: 'popularity_week' })
}

export async function getByArtist(artistId: string): Promise<Track[]> {
  return fetchTracks({ artist_id: artistId })
}

export async function getTrack(id: string): Promise<Track | null> {
  const tracks = await fetchTracks({ id })
  return tracks[0] ?? null
}
