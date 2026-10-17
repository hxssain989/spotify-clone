import { X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { getByArtist } from '../api/catalog'
import { useLibraryStore } from '../store/libraryStore'
import { usePlayerStore } from '../store/playerStore'
import type { Track } from '../types'

type Props = {
  track: Track | null
  onClose: () => void
}

export function TrackMenuSheet({ track, onClose }: Props) {
  const navigate = useNavigate()
  const playlists = useLibraryStore((s) => s.playlists)
  const addTrackToPlaylist = useLibraryStore((s) => s.addTrackToPlaylist)
  const playNext = usePlayerStore((s) => s.playNext)
  const addToQueue = usePlayerStore((s) => s.addToQueue)
  const playTrack = usePlayerStore((s) => s.playTrack)

  if (!track) return null

  return (
    <div className="fixed inset-0 z-[70] flex flex-col justify-end bg-black/60">
      <button type="button" className="flex-1" aria-label="Close menu" onClick={onClose} />
      <div className="rounded-t-2xl bg-surface-elevated pb-[env(safe-area-inset-bottom)]">
        <div className="flex items-center justify-between border-b border-neutral-800 px-4 py-3">
          <div className="min-w-0 pr-4">
            <p className="truncate font-medium">{track.name}</p>
            <p className="truncate text-sm text-text-muted">{track.artistName}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-11 w-11 shrink-0 items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-full"
            aria-label="Close"
          >
            <X className="h-6 w-6" />
          </button>
        </div>
        <ul className="px-2 py-2">
          <li>
            <button
              type="button"
              className="flex min-h-11 w-full items-center rounded-md px-3 text-left hover:bg-surface-highlight focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              onClick={() => {
                playNext(track)
                onClose()
              }}
            >
              Play next
            </button>
          </li>
          <li>
            <button
              type="button"
              className="flex min-h-11 w-full items-center rounded-md px-3 text-left hover:bg-surface-highlight focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              onClick={() => {
                addToQueue(track)
                onClose()
              }}
            >
              Add to queue
            </button>
          </li>
          <li>
            <button
              type="button"
              className="flex min-h-11 w-full items-center rounded-md px-3 text-left hover:bg-surface-highlight focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              onClick={async () => {
                onClose()
                const tracks = await getByArtist(track.artistId)
                if (tracks.length) playTrack(tracks[0], tracks)
              }}
            >
              Go to artist
            </button>
          </li>
          {playlists.length > 0 && (
            <li className="border-t border-neutral-800 mt-2 pt-2">
              <p className="px-3 py-1 text-xs text-text-muted">Add to playlist</p>
              {playlists.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className="flex min-h-11 w-full items-center rounded-md px-3 text-left hover:bg-surface-highlight focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  onClick={() => {
                    addTrackToPlaylist(p.id, track)
                    onClose()
                  }}
                >
                  {p.name}
                </button>
              ))}
            </li>
          )}
          <li className="border-t border-neutral-800 mt-2 pt-2">
            <button
              type="button"
              className="flex min-h-11 w-full items-center rounded-md px-3 text-left hover:bg-surface-highlight focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              onClick={() => {
                onClose()
                navigate('/library')
              }}
            >
              Manage playlists
            </button>
          </li>
        </ul>
      </div>
    </div>
  )
}
