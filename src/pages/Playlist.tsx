import { GripVertical, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { TrackMenuSheet } from '../components/TrackMenuSheet'
import { TrackRow } from '../components/TrackRow'
import { useLibraryStore } from '../store/libraryStore'
import { usePlayerStore } from '../store/playerStore'
import type { Track } from '../types'

export function PlaylistPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const playlist = useLibraryStore((s) => s.playlists.find((p) => p.id === id))
  // Select stable state and derive the list here: a selector that builds a
  // new array every call makes React re-render forever.
  const trackCache = useLibraryStore((s) => s.trackCache)
  const tracks = (playlist?.trackIds ?? [])
    .map((trackId) => trackCache[trackId])
    .filter((t): t is Track => Boolean(t))
  const renamePlaylist = useLibraryStore((s) => s.renamePlaylist)
  const deletePlaylist = useLibraryStore((s) => s.deletePlaylist)
  const removeTrackFromPlaylist = useLibraryStore(
    (s) => s.removeTrackFromPlaylist,
  )
  const reorderPlaylistTracks = useLibraryStore(
    (s) => s.reorderPlaylistTracks,
  )
  const playTrack = usePlayerStore((s) => s.playTrack)
  const [menuTrack, setMenuTrack] = useState<Track | null>(null)
  const [dragFrom, setDragFrom] = useState<number | null>(null)

  if (!id || !playlist) {
    return (
      <div className="px-4 pt-8 text-text-muted">
        Playlist not found.{' '}
        <button
          type="button"
          className="text-accent underline"
          onClick={() => navigate('/library')}
        >
          Back to Library
        </button>
      </div>
    )
  }

  const mosaic = tracks.slice(0, 4)

  return (
    <div className="px-4 pt-4 pb-8">
      <div className="mb-4 grid h-40 w-40 grid-cols-2 grid-rows-2 gap-0.5 overflow-hidden rounded-md bg-surface-highlight">
        {mosaic.length === 0 ? (
          <div className="col-span-2 row-span-2 flex items-center justify-center text-text-muted text-sm">
            Empty
          </div>
        ) : (
          mosaic.map((t) => (
            <div key={t.id} className="overflow-hidden bg-neutral-800">
              {t.image ? (
                <img src={t.image} alt="" className="h-full w-full object-cover" />
              ) : null}
            </div>
          ))
        )}
      </div>

      <div className="mb-4 flex items-start gap-2">
        <h1 className="flex-1 text-2xl font-bold">{playlist.name}</h1>
        <button
          type="button"
          aria-label="Rename playlist"
          onClick={() => {
            const name = window.prompt('Rename playlist', playlist.name)
            if (name != null) renamePlaylist(id, name)
          }}
          className="min-h-11 px-3 text-sm text-text-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded"
        >
          Rename
        </button>
        <button
          type="button"
          aria-label="Delete playlist"
          onClick={() => {
            if (window.confirm('Delete this playlist?')) {
              deletePlaylist(id)
              navigate('/library')
            }
          }}
          className="flex h-11 w-11 items-center justify-center text-text-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-full"
        >
          <Trash2 className="h-5 w-5" />
        </button>
      </div>

      {tracks.length > 0 && (
        <button
          type="button"
          onClick={() => playTrack(tracks[0], tracks)}
          className="mb-4 min-h-11 rounded-full bg-accent px-6 font-medium text-black focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          Play all
        </button>
      )}

      {tracks.map((track, i) => (
        <div
          key={track.id}
          className="flex items-center"
          draggable
          onDragStart={() => setDragFrom(i)}
          onDragOver={(e) => e.preventDefault()}
          onDrop={() => {
            if (dragFrom != null && dragFrom !== i) {
              reorderPlaylistTracks(id, dragFrom, i)
            }
            setDragFrom(null)
          }}
        >
          <span className="flex h-11 w-8 cursor-grab items-center justify-center text-text-muted">
            <GripVertical className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <TrackRow
              track={track}
              onPlay={() => playTrack(track, tracks)}
              onMenu={() => setMenuTrack(track)}
            />
          </div>
          <button
            type="button"
            aria-label="Remove from playlist"
            onClick={() => removeTrackFromPlaylist(id, track.id)}
            className="flex h-11 w-11 shrink-0 items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-full"
          >
            <Trash2 className="h-5 w-5 text-text-muted" />
          </button>
        </div>
      ))}

      <TrackMenuSheet track={menuTrack} onClose={() => setMenuTrack(null)} />
    </div>
  )
}
