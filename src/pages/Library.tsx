import { Download, Plus } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { importSpotifyPlaylist } from '../api/catalog'
import { toast } from '../components/Toast'
import { TrackMenuSheet } from '../components/TrackMenuSheet'
import { TrackRow } from '../components/TrackRow'
import { useLibraryStore } from '../store/libraryStore'
import { usePlayerStore } from '../store/playerStore'
import type { Track } from '../types'

type Tab = 'liked' | 'playlists'

export function LibraryPage() {
  const [tab, setTab] = useState<Tab>('liked')
  const likedIds = useLibraryStore((s) => s.likedIds)
  const trackCache = useLibraryStore((s) => s.trackCache)
  const likedTracks = likedIds
    .map((id) => trackCache[id])
    .filter((t): t is Track => Boolean(t))
  const playlists = useLibraryStore((s) => s.playlists)
  const createPlaylist = useLibraryStore((s) => s.createPlaylist)
  const importPlaylist = useLibraryStore((s) => s.importPlaylist)
  const navigate = useNavigate()
  const [importing, setImporting] = useState(false)

  async function importFromSpotify() {
    const link = window.prompt(
      'Paste a Spotify playlist link (Share → Copy link)',
    )
    if (!link?.trim()) return
    setImporting(true)
    try {
      const { name, tracks } = await importSpotifyPlaylist(link.trim())
      const id = importPlaylist(name, tracks)
      toast(`Imported ${tracks.length} songs`)
      navigate(`/playlist/${id}`)
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Import failed')
    } finally {
      setImporting(false)
    }
  }
  const playTrack = usePlayerStore((s) => s.playTrack)
  const [menuTrack, setMenuTrack] = useState<Track | null>(null)

  return (
    <div className="px-4 pt-4">
      <div className="mb-4 flex gap-2">
        <button
          type="button"
          onClick={() => setTab('liked')}
          className={`min-h-11 rounded-full px-4 text-sm font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
            tab === 'liked'
              ? 'bg-white text-black'
              : 'bg-surface-highlight text-white'
          }`}
        >
          Liked
        </button>
        <button
          type="button"
          onClick={() => setTab('playlists')}
          className={`min-h-11 rounded-full px-4 text-sm font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
            tab === 'playlists'
              ? 'bg-white text-black'
              : 'bg-surface-highlight text-white'
          }`}
        >
          Playlists
        </button>
      </div>

      {tab === 'liked' && (
        <>
          {likedTracks.length > 0 && (
            <button
              type="button"
              onClick={() => playTrack(likedTracks[0], likedTracks)}
              className="mb-4 min-h-11 rounded-full bg-accent px-6 font-medium text-black focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              Play all
            </button>
          )}
          {likedTracks.length === 0 ? (
            <p className="text-text-muted">Songs you like appear here.</p>
          ) : (
            likedTracks.map((track) => (
              <TrackRow
                key={track.id}
                track={track}
                onPlay={() => playTrack(track, likedTracks)}
                onMenu={() => setMenuTrack(track)}
              />
            ))
          )}
        </>
      )}

      {tab === 'playlists' && (
        <>
          <button
            type="button"
            onClick={() => {
              const name = window.prompt('Playlist name')
              if (name != null) createPlaylist(name)
            }}
            className="mb-4 flex min-h-11 w-full items-center justify-center gap-2 rounded-md border border-dashed border-neutral-600 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <Plus className="h-5 w-5" />
            Create playlist
          </button>
          <button
            type="button"
            disabled={importing}
            onClick={importFromSpotify}
            className="mb-4 flex min-h-11 w-full items-center justify-center gap-2 rounded-md border border-dashed border-neutral-600 text-sm disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <Download className="h-5 w-5" />
            {importing ? 'Importing…' : 'Import from Spotify'}
          </button>
          {playlists.length === 0 ? (
            <p className="text-text-muted">Create a playlist to get started.</p>
          ) : (
            <ul className="grid gap-3">
              {playlists.map((p) => (
                <li key={p.id}>
                  <Link
                    to={`/playlist/${p.id}`}
                    className="block min-h-11 rounded-md bg-surface-highlight px-4 py-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  >
                    <p className="font-medium">{p.name}</p>
                    <p className="text-xs text-text-muted">
                      {p.trackIds.length} tracks
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      <section className="mt-10 border-t border-neutral-800 pt-6 pb-4">
        <h2 className="mb-2 text-lg font-semibold">About</h2>
        <p className="text-sm text-text-muted leading-relaxed">
          Song info from Apple's iTunes catalog, playback through YouTube. Music
          plays while the player is open on screen.
        </p>
      </section>

      <TrackMenuSheet track={menuTrack} onClose={() => setMenuTrack(null)} />
    </div>
  )
}
