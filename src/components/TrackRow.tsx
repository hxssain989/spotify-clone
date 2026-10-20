import { Heart, MoreHorizontal } from 'lucide-react'
import { useLibraryStore } from '../store/libraryStore'
import type { Track } from '../types'
import { formatTime } from '../utils/format'

type Props = {
  track: Track
  onPlay: () => void
  onMenu?: () => void
  showDuration?: boolean
}

export function TrackRow({
  track,
  onPlay,
  onMenu,
  showDuration = true,
}: Props) {
  const liked = useLibraryStore((s) => s.isLiked(track.id))
  const toggleLike = useLibraryStore((s) => s.toggleLike)

  return (
    <div className="flex min-h-11 items-center gap-3 rounded-md px-1 hover:bg-surface-highlight">
      <button
        type="button"
        onClick={onPlay}
        className="flex min-h-11 min-w-0 flex-1 items-center gap-3 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-md"
      >
        <div className="h-12 w-12 shrink-0 overflow-hidden rounded bg-surface-highlight">
          {track.image ? (
            <img src={track.image} alt="" className="h-full w-full object-cover" />
          ) : null}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{track.name}</p>
          <p className="truncate text-xs text-text-muted">{track.artistName}</p>
        </div>
        {showDuration && (
          <span className="tabular-nums shrink-0 text-xs text-text-muted pr-1">
            {track.duration > 0 && formatTime(track.duration)}
          </span>
        )}
      </button>
      <button
        type="button"
        aria-label={liked ? 'Unlike' : 'Like'}
        onClick={() => toggleLike(track)}
        className="flex h-11 w-11 shrink-0 items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-full"
      >
        <Heart
          className={`h-5 w-5 ${liked ? 'fill-accent text-accent' : 'text-text-muted'}`}
        />
      </button>
      {onMenu && (
        <button
          type="button"
          aria-label="Track options"
          onClick={onMenu}
          className="flex h-11 w-11 shrink-0 items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-full"
        >
          <MoreHorizontal className="h-5 w-5 text-text-muted" />
        </button>
      )}
    </div>
  )
}
