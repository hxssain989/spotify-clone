import type { Track } from '../types'

type Props = {
  track: Track
  onPlay: () => void
}

export function CoverCard({ track, onPlay }: Props) {
  return (
    <button
      type="button"
      onClick={onPlay}
      className="w-36 shrink-0 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-md"
    >
      <div className="aspect-square w-full overflow-hidden rounded-md bg-surface-highlight">
        {track.image ? (
          <img
            src={track.image}
            alt=""
            className="h-full w-full object-cover"
            loading="lazy"
            width={144}
            height={144}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-text-muted text-xs">
            No art
          </div>
        )}
      </div>
      <p className="mt-2 line-clamp-2 text-sm font-medium leading-tight">
        {track.name}
      </p>
      <p className="line-clamp-1 text-xs text-text-muted">{track.artistName}</p>
    </button>
  )
}
