import { useEffect, useState } from 'react'
import { searchTracks } from '../api/catalog'
import { RowSkeleton } from '../components/Skeleton'
import { TrackMenuSheet } from '../components/TrackMenuSheet'
import { TrackRow } from '../components/TrackRow'
import { usePlayerStore } from '../store/playerStore'
import type { Track } from '../types'

export function SearchPage() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Track[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [menuTrack, setMenuTrack] = useState<Track | null>(null)
  const playTrack = usePlayerStore((s) => s.playTrack)

  useEffect(() => {
    if (!query.trim()) {
      setResults([])
      setError(null)
      return
    }
    setLoading(true)
    setError(null)
    const t = setTimeout(() => {
      searchTracks(query)
        .then((tracks) => {
          setResults(tracks)
          if (!tracks.length) setError('No tracks found.')
        })
        .catch(() => setError('Search failed. Try again.'))
        .finally(() => setLoading(false))
    }, 350)
    return () => clearTimeout(t)
  }, [query])

  return (
    <div className="px-4 pt-4">
      <label className="sr-only" htmlFor="search">
        Search tracks
      </label>
      <input
        id="search"
        type="search"
        autoFocus
        placeholder="Search songs, artists…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="mb-4 w-full min-h-11 rounded-full border border-neutral-700 bg-surface-highlight px-4 text-base focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      />
      {loading && (
        <div>
          {Array.from({ length: 6 }).map((_, i) => (
            <RowSkeleton key={i} />
          ))}
        </div>
      )}
      {!loading && error && (
        <p className="text-sm text-text-muted">{error}</p>
      )}
      {!loading &&
        results.map((track) => (
          <TrackRow
            key={track.id}
            track={track}
            onPlay={() => playTrack(track, results)}
            onMenu={() => setMenuTrack(track)}
          />
        ))}
      <TrackMenuSheet track={menuTrack} onClose={() => setMenuTrack(null)} />
    </div>
  )
}
