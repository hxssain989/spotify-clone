import { GripVertical, X } from 'lucide-react'
import { useState } from 'react'
import { useCurrentTrack, usePlayerStore } from '../store/playerStore'
import { formatTime } from '../utils/format'

export function QueueSheet() {
  const open = usePlayerStore((s) => s.queueOpen)
  const queue = usePlayerStore((s) => s.queue)
  const index = usePlayerStore((s) => s.index)
  const current = useCurrentTrack()
  const setQueueOpen = usePlayerStore((s) => s.setQueueOpen)
  const removeFromQueue = usePlayerStore((s) => s.removeFromQueue)
  const reorderQueue = usePlayerStore((s) => s.reorderQueue)
  const jumpToQueueIndex = usePlayerStore((s) => s.jumpToQueueIndex)
  const clearQueue = usePlayerStore((s) => s.clearQueue)
  const [dragFrom, setDragFrom] = useState<number | null>(null)

  if (!open) return null

  const upcoming = queue.slice(index + 1)

  return (
    <div className="fixed inset-0 z-[70] flex flex-col justify-end bg-black/60">
      <button
        type="button"
        className="flex-1"
        aria-label="Close queue"
        onClick={() => setQueueOpen(false)}
      />
      <div className="max-h-[70vh] overflow-hidden rounded-t-2xl bg-surface-elevated pb-[env(safe-area-inset-bottom)]">
        <div className="flex items-center justify-between border-b border-neutral-800 px-4 py-3">
          <h2 className="text-lg font-semibold">Queue</h2>
          <button
            type="button"
            onClick={() => setQueueOpen(false)}
            className="flex h-11 w-11 items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-full"
            aria-label="Close"
          >
            <X className="h-6 w-6" />
          </button>
        </div>
        <div className="overflow-y-auto px-4 py-2 max-h-[calc(70vh-3.5rem)]">
          {current && (
            <div className="mb-4">
              <p className="mb-2 text-xs font-semibold uppercase text-text-muted">
                Now playing
              </p>
              <div className="flex items-center gap-3 rounded-md bg-surface-highlight px-2 py-2">
                <div className="h-12 w-12 overflow-hidden rounded bg-neutral-700">
                  {current.image ? (
                    <img src={current.image} alt="" className="h-full w-full object-cover" />
                  ) : null}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-accent">
                    {current.name}
                  </p>
                  <p className="truncate text-xs text-text-muted">
                    {current.artistName}
                  </p>
                </div>
              </div>
            </div>
          )}
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-semibold uppercase text-text-muted">
              Up next
            </p>
            {queue.length > 0 && (
              <button
                type="button"
                onClick={clearQueue}
                className="min-h-11 px-2 text-sm text-text-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded"
              >
                Clear
              </button>
            )}
          </div>
          {upcoming.length === 0 ? (
            <p className="py-4 text-sm text-text-muted">No upcoming tracks</p>
          ) : (
            upcoming.map((track, i) => {
              const queueIndex = index + 1 + i
              return (
                <div
                  key={`${track.id}-${queueIndex}`}
                  draggable
                  onDragStart={() => setDragFrom(queueIndex)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => {
                    if (dragFrom != null && dragFrom !== queueIndex) {
                      reorderQueue(dragFrom, queueIndex)
                    }
                    setDragFrom(null)
                  }}
                  className="flex items-center gap-1"
                >
                  <span className="flex h-11 w-8 cursor-grab items-center justify-center text-text-muted">
                    <GripVertical className="h-4 w-4" />
                  </span>
                  <button
                    type="button"
                    onClick={() => jumpToQueueIndex(queueIndex)}
                    className="flex min-h-11 min-w-0 flex-1 items-center gap-3 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-md"
                  >
                    <div className="h-10 w-10 shrink-0 overflow-hidden rounded bg-surface-highlight">
                      {track.image ? (
                        <img src={track.image} alt="" className="h-full w-full object-cover" />
                      ) : null}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm">{track.name}</p>
                      <p className="truncate text-xs text-text-muted">
                        {track.artistName}
                      </p>
                    </div>
                    <span className="tabular-nums text-xs text-text-muted">
                      {formatTime(track.duration)}
                    </span>
                  </button>
                  <button
                    type="button"
                    aria-label="Remove from queue"
                    onClick={() => removeFromQueue(queueIndex)}
                    className="flex h-11 w-11 items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-full"
                  >
                    <X className="h-5 w-5 text-text-muted" />
                  </button>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
