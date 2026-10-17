import { formatTime } from '../utils/format'

type Props = {
  position: number
  duration: number
  onSeek: (value: number) => void
  compact?: boolean
}

export function SeekBar({ position, duration, onSeek, compact }: Props) {
  const max = duration > 0 ? duration : 1
  return (
    <div className={compact ? 'w-full' : 'w-full px-2'}>
      <input
        type="range"
        min={0}
        max={max}
        step={0.1}
        value={Math.min(position, max)}
        onChange={(e) => onSeek(Number(e.target.value))}
        className="h-1 w-full cursor-pointer appearance-none rounded-full bg-neutral-600 accent-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        aria-label="Seek"
      />
      {!compact && (
        <div className="tabular-nums mt-1 flex justify-between text-xs text-text-muted">
          <span>{formatTime(position)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      )}
    </div>
  )
}
