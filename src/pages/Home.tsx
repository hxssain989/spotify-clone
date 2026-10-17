import { useEffect, useState } from 'react'
import { getByGenre, getTrending } from '../api/catalog'
import { CoverCard } from '../components/CoverCard'
import { CardSkeleton } from '../components/Skeleton'
import { IosInstallHint } from '../components/IosInstallHint'
import { usePlayerStore } from '../store/playerStore'
import type { Track } from '../types'

const GENRES = ['pop', 'rock', 'electronic', 'hiphop', 'chillout'] as const
const GENRE_LABELS: Record<(typeof GENRES)[number], string> = {
  pop: 'Pop',
  rock: 'Rock',
  electronic: 'Electronic',
  hiphop: 'Hip-hop',
  chillout: 'Chill',
}

function TrackRowSection({
  title,
  tracks,
  loading,
  error,
  onPlay,
}: {
  title: string
  tracks: Track[]
  loading: boolean
  error: string | null
  onPlay: (track: Track, context: Track[]) => void
}) {
  return (
    <section className="mb-8">
      <h2 className="mb-3 text-xl font-bold">{title}</h2>
      {error && <p className="text-sm text-text-muted">{error}</p>}
      <div className="flex gap-4 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {loading
          ? Array.from({ length: 5 }).map((_, i) => <CardSkeleton key={i} />)
          : tracks.map((track) => (
              <CoverCard
                key={track.id}
                track={track}
                onPlay={() => onPlay(track, tracks)}
              />
            ))}
      </div>
    </section>
  )
}

export function HomePage() {
  const playTrack = usePlayerStore((s) => s.playTrack)
  const [trending, setTrending] = useState<Track[]>([])
  const [genreData, setGenreData] = useState<
    Record<string, { tracks: Track[]; error: string | null }>
  >({})
  const [loadingTrending, setLoadingTrending] = useState(true)
  const [trendingError, setTrendingError] = useState<string | null>(null)

  useEffect(() => {
    getTrending()
      .then(setTrending)
      .catch(() => setTrendingError('Could not load trending tracks.'))
      .finally(() => setLoadingTrending(false))
  }, [])

  useEffect(() => {
    GENRES.forEach((genre) => {
      setGenreData((d) => ({
        ...d,
        [genre]: { tracks: [], error: null },
      }))
      getByGenre(genre)
        .then((tracks) =>
          setGenreData((d) => ({
            ...d,
            [genre]: { tracks, error: null },
          })),
        )
        .catch(() =>
          setGenreData((d) => ({
            ...d,
            [genre]: {
              tracks: [],
              error: `Could not load ${GENRE_LABELS[genre]}.`,
            },
          })),
        )
    })
  }, [])

  return (
    <div className="px-4 pt-4">
      <IosInstallHint />
      <TrackRowSection
        title="Trending"
        tracks={trending}
        loading={loadingTrending}
        error={trendingError}
        onPlay={playTrack}
      />
      {GENRES.map((genre) => {
        const row = genreData[genre]
        const loading = !row || (!row.tracks.length && !row.error)
        return (
          <TrackRowSection
            key={genre}
            title={GENRE_LABELS[genre]}
            tracks={row?.tracks ?? []}
            loading={loading}
            error={row?.error ?? null}
            onPlay={playTrack}
          />
        )
      })}
    </div>
  )
}
