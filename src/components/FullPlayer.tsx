import {
  ChevronDown,
  Heart,
  ListMusic,
  Pause,
  Play,
  Repeat,
  Repeat1,
  Shuffle,
  SkipBack,
  SkipForward,
} from 'lucide-react'
import { useLibraryStore } from '../store/libraryStore'
import { useCurrentTrack, usePlayerStore } from '../store/playerStore'
import { SeekBar } from './SeekBar'

export function FullPlayer() {
  const open = usePlayerStore((s) => s.fullPlayerOpen)
  const track = useCurrentTrack()
  const isPlaying = usePlayerStore((s) => s.isPlaying)
  const position = usePlayerStore((s) => s.position)
  const duration = usePlayerStore((s) => s.duration)
  const shuffle = usePlayerStore((s) => s.shuffle)
  const repeat = usePlayerStore((s) => s.repeat)
  const play = usePlayerStore((s) => s.play)
  const pause = usePlayerStore((s) => s.pause)
  const next = usePlayerStore((s) => s.next)
  const prev = usePlayerStore((s) => s.prev)
  const seek = usePlayerStore((s) => s.seek)
  const toggleShuffle = usePlayerStore((s) => s.toggleShuffle)
  const cycleRepeat = usePlayerStore((s) => s.cycleRepeat)
  const setFullPlayerOpen = usePlayerStore((s) => s.setFullPlayerOpen)
  const setQueueOpen = usePlayerStore((s) => s.setQueueOpen)
  const liked = useLibraryStore((s) =>
    track ? s.isLiked(track.id) : false,
  )
  const toggleLike = useLibraryStore((s) => s.toggleLike)

  if (!open || !track) return null

  return (
    <div
      className="fixed inset-0 z-[60] flex flex-col bg-gradient-to-b from-neutral-800 to-surface"
      role="dialog"
      aria-modal="true"
      aria-label="Now playing"
    >
      <div className="mx-auto flex w-full max-w-[480px] flex-1 flex-col px-4 pt-[env(safe-area-inset-top)] pb-4">
        <button
          type="button"
          onClick={() => setFullPlayerOpen(false)}
          className="flex min-h-11 w-11 items-center justify-center self-start focus:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-full"
          aria-label="Close player"
        >
          <ChevronDown className="h-8 w-8" />
        </button>

        <div className="mx-auto mt-4 aspect-square w-full max-w-sm overflow-hidden rounded-lg bg-surface-highlight shadow-2xl">
          {track.image ? (
            <img
              src={track.image}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : null}
        </div>

        <div className="mt-8 min-w-0">
          <h1 className="truncate text-2xl font-bold">{track.name}</h1>
          <p className="truncate text-text-muted">{track.artistName}</p>
        </div>

        <div className="mt-8">
          <SeekBar position={position} duration={duration} onSeek={seek} />
        </div>

        <div className="mt-6 flex items-center justify-between">
          <button
            type="button"
            aria-label="Shuffle"
            aria-pressed={shuffle}
            onClick={toggleShuffle}
            className={`flex h-11 w-11 items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-full ${
              shuffle ? 'text-accent' : 'text-text-muted'
            }`}
          >
            <Shuffle className="h-6 w-6" />
          </button>
          <button
            type="button"
            aria-label="Previous"
            onClick={prev}
            className="flex h-11 w-11 items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-full"
          >
            <SkipBack className="h-8 w-8 fill-white" />
          </button>
          <button
            type="button"
            aria-label={isPlaying ? 'Pause' : 'Play'}
            onClick={() => (isPlaying ? pause() : play())}
            className="flex h-16 w-16 items-center justify-center rounded-full bg-white text-black focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            {isPlaying ? (
              <Pause className="h-9 w-9 fill-black" />
            ) : (
              <Play className="h-9 w-9 fill-black ml-0.5" />
            )}
          </button>
          <button
            type="button"
            aria-label="Next"
            onClick={() => next()}
            className="flex h-11 w-11 items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-full"
          >
            <SkipForward className="h-8 w-8 fill-white" />
          </button>
          <button
            type="button"
            aria-label={`Repeat ${repeat}`}
            onClick={cycleRepeat}
            className={`flex h-11 w-11 items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-full ${
              repeat !== 'off' ? 'text-accent' : 'text-text-muted'
            }`}
          >
            {repeat === 'one' ? (
              <Repeat1 className="h-6 w-6" />
            ) : (
              <Repeat className="h-6 w-6" />
            )}
          </button>
        </div>

        <div className="mt-6 flex justify-center gap-8">
          <button
            type="button"
            aria-label={liked ? 'Unlike' : 'Like'}
            onClick={() => toggleLike(track)}
            className="flex h-11 w-11 items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-full"
          >
            <Heart
              className={`h-7 w-7 ${liked ? 'fill-accent text-accent' : 'text-text-muted'}`}
            />
          </button>
          <button
            type="button"
            aria-label="Queue"
            onClick={() => setQueueOpen(true)}
            className="flex h-11 w-11 items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-full text-text-muted"
          >
            <ListMusic className="h-7 w-7" />
          </button>
        </div>
      </div>
    </div>
  )
}
