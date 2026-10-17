import { Pause, Play } from 'lucide-react'
import { useCurrentTrack, usePlayerStore } from '../store/playerStore'

export function MiniPlayer() {
  const track = useCurrentTrack()
  const isPlaying = usePlayerStore((s) => s.isPlaying)
  const position = usePlayerStore((s) => s.position)
  const duration = usePlayerStore((s) => s.duration)
  const play = usePlayerStore((s) => s.play)
  const pause = usePlayerStore((s) => s.pause)
  const setFullPlayerOpen = usePlayerStore((s) => s.setFullPlayerOpen)

  if (!track) return null

  const progress = duration > 0 ? (position / duration) * 100 : 0

  return (
    <div
      className="fixed left-0 right-0 z-50 border-t border-neutral-800 bg-surface-elevated"
      style={{ bottom: 'calc(3.25rem + env(safe-area-inset-bottom))' }}
    >
      <div
        className="h-0.5 bg-accent transition-all"
        style={{ width: `${progress}%` }}
        aria-hidden
      />
      <div className="mx-auto flex max-w-[480px] items-center gap-3 px-3 py-2">
        <button
          type="button"
          onClick={() => setFullPlayerOpen(true)}
          className="flex min-h-11 min-w-0 flex-1 items-center gap-3 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-md"
        >
          <div className="h-12 w-12 shrink-0 overflow-hidden rounded bg-surface-highlight">
            {track.image ? (
              <img src={track.image} alt="" className="h-full w-full object-cover" />
            ) : null}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{track.name}</p>
            <p className="truncate text-xs text-text-muted">{track.artistName}</p>
          </div>
        </button>
        <button
          type="button"
          aria-label={isPlaying ? 'Pause' : 'Play'}
          onClick={() => (isPlaying ? pause() : play())}
          className="flex h-11 w-11 items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-full"
        >
          {isPlaying ? (
            <Pause className="h-7 w-7 fill-white" />
          ) : (
            <Play className="h-7 w-7 fill-white" />
          )}
        </button>
      </div>
    </div>
  )
}
