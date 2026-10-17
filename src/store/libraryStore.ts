import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Playlist, Track } from '../types'

type LibraryState = {
  likedIds: string[]
  playlists: Playlist[]
  trackCache: Record<string, Track>
  toggleLike: (track: Track) => void
  isLiked: (id: string) => boolean
  cacheTrack: (track: Track) => void
  cacheTracks: (tracks: Track[]) => void
  createPlaylist: (name: string) => string
  renamePlaylist: (id: string, name: string) => void
  deletePlaylist: (id: string) => void
  addTrackToPlaylist: (playlistId: string, track: Track) => void
  removeTrackFromPlaylist: (playlistId: string, trackId: string) => void
  reorderPlaylistTracks: (
    playlistId: string,
    from: number,
    to: number,
  ) => void
  getLikedTracks: () => Track[]
  getPlaylistTracks: (playlistId: string) => Track[]
}

export const useLibraryStore = create<LibraryState>()(
  persist(
    (set, get) => ({
      likedIds: [],
      playlists: [],
      trackCache: {},

      toggleLike: (track) => {
        get().cacheTrack(track)
        set((s) => {
          const liked = s.likedIds.includes(track.id)
            ? s.likedIds.filter((id) => id !== track.id)
            : [...s.likedIds, track.id]
          return { likedIds: liked }
        })
      },

      isLiked: (id) => get().likedIds.includes(id),

      cacheTrack: (track) =>
        set((s) => ({
          trackCache: { ...s.trackCache, [track.id]: track },
        })),

      cacheTracks: (tracks) =>
        set((s) => {
          const trackCache = { ...s.trackCache }
          tracks.forEach((t) => {
            trackCache[t.id] = t
          })
          return { trackCache }
        }),

      createPlaylist: (name) => {
        const id = crypto.randomUUID()
        const playlist: Playlist = {
          id,
          name: name.trim() || 'My playlist',
          trackIds: [],
          createdAt: Date.now(),
        }
        set((s) => ({ playlists: [...s.playlists, playlist] }))
        return id
      },

      renamePlaylist: (id, name) =>
        set((s) => ({
          playlists: s.playlists.map((p) =>
            p.id === id ? { ...p, name: name.trim() || p.name } : p,
          ),
        })),

      deletePlaylist: (id) =>
        set((s) => ({
          playlists: s.playlists.filter((p) => p.id !== id),
        })),

      addTrackToPlaylist: (playlistId, track) => {
        get().cacheTrack(track)
        set((s) => ({
          playlists: s.playlists.map((p) =>
            p.id === playlistId && !p.trackIds.includes(track.id)
              ? { ...p, trackIds: [...p.trackIds, track.id] }
              : p,
          ),
        }))
      },

      removeTrackFromPlaylist: (playlistId, trackId) =>
        set((s) => ({
          playlists: s.playlists.map((p) =>
            p.id === playlistId
              ? { ...p, trackIds: p.trackIds.filter((id) => id !== trackId) }
              : p,
          ),
        })),

      reorderPlaylistTracks: (playlistId, from, to) =>
        set((s) => ({
          playlists: s.playlists.map((p) => {
            if (p.id !== playlistId) return p
            const ids = [...p.trackIds]
            const [item] = ids.splice(from, 1)
            ids.splice(to, 0, item)
            return { ...p, trackIds: ids }
          }),
        })),

      getLikedTracks: () => {
        const { likedIds, trackCache } = get()
        return likedIds.map((id) => trackCache[id]).filter(Boolean)
      },

      getPlaylistTracks: (playlistId) => {
        const p = get().playlists.find((pl) => pl.id === playlistId)
        if (!p) return []
        const { trackCache } = get()
        return p.trackIds.map((id) => trackCache[id]).filter(Boolean)
      },
    }),
    { name: 'music-library' },
  ),
)
