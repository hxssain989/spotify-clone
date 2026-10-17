import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  initMediaSession,
  updateMediaSession,
  updatePositionState,
} from '../audio/mediaSession'
import {
  audio,
  loadAndPlay,
  pauseAudio,
  resumeAudio,
  seekAudio,
  setAudioVolume,
} from '../audio/audioEngine'
import type { RepeatMode, Track } from '../types'
import { useLibraryStore } from './libraryStore'

type PersistSlice = {
  volume: number
  lastTrackId: string | null
  lastPosition: number
}

type PlayerState = PersistSlice & {
  queue: Track[]
  originalQueue: Track[]
  index: number
  isPlaying: boolean
  shuffle: boolean
  repeat: RepeatMode
  position: number
  duration: number
  fullPlayerOpen: boolean
  queueOpen: boolean
  playTrack: (track: Track, context?: Track[]) => void
  play: () => void
  pause: () => void
  next: (fromError?: boolean) => void
  prev: () => void
  seek: (seconds: number) => void
  addToQueue: (track: Track) => void
  playNext: (track: Track) => void
  removeFromQueue: (index: number) => void
  reorderQueue: (from: number, to: number) => void
  clearQueue: () => void
  toggleShuffle: () => void
  cycleRepeat: () => void
  setVolume: (v: number) => void
  setPosition: (p: number) => void
  setDuration: (d: number) => void
  onTrackEnded: () => void
  jumpToQueueIndex: (index: number) => void
  setFullPlayerOpen: (open: boolean) => void
  setQueueOpen: (open: boolean) => void
  persistPlayback: () => void
  restoreIfNeeded: () => Promise<void>
}

function shuffleUpcoming(queue: Track[], index: number): Track[] {
  const head = queue.slice(0, index + 1)
  const tail = [...queue.slice(index + 1)]
  for (let i = tail.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[tail[i], tail[j]] = [tail[j], tail[i]]
  }
  return [...head, ...tail]
}

function currentTrack(state: PlayerState): Track | null {
  if (state.index < 0 || state.index >= state.queue.length) return null
  return state.queue[state.index]
}

let persistTimer: ReturnType<typeof setInterval> | null = null

function startPersistTimer() {
  if (persistTimer) return
  persistTimer = setInterval(() => {
    usePlayerStore.getState().persistPlayback()
  }, 5000)
}

function stopPersistTimer() {
  if (persistTimer) {
    clearInterval(persistTimer)
    persistTimer = null
  }
}

async function playIndex(index: number) {
  const state = usePlayerStore.getState()
  const track = state.queue[index]
  if (!track) return

  useLibraryStore.getState().cacheTrack(track)
  usePlayerStore.setState({ index, position: 0 })

  try {
    await loadAndPlay(track.audio)
    usePlayerStore.setState({ isPlaying: true })
    updateMediaSession(track, true)
    startPersistTimer()
  } catch {
    usePlayerStore.getState().next(true)
  }
}

export const usePlayerStore = create<PlayerState>()(
  persist(
    (set, get) => ({
      queue: [],
      originalQueue: [],
      index: -1,
      isPlaying: false,
      shuffle: false,
      repeat: 'off',
      position: 0,
      duration: 0,
      volume: 1,
      lastTrackId: null,
      lastPosition: 0,
      fullPlayerOpen: false,
      queueOpen: false,

      playTrack: (track, context) => {
        const list = context?.length ? context : [track]
        useLibraryStore.getState().cacheTracks(list)
        const idx = list.findIndex((t) => t.id === track.id)
        set({
          queue: list,
          originalQueue: list,
          index: idx >= 0 ? idx : 0,
          shuffle: false,
        })
        void playIndex(idx >= 0 ? idx : 0)
      },

      play: () => {
        const track = currentTrack(get())
        if (!track) return
        void resumeAudio().then(() => {
          set({ isPlaying: true })
          updateMediaSession(track, true)
          startPersistTimer()
        })
      },

      pause: () => {
        pauseAudio()
        set({ isPlaying: false })
        updateMediaSession(currentTrack(get()), false)
        get().persistPlayback()
        stopPersistTimer()
      },

      next: (fromError = false) => {
        const { queue, index, repeat } = get()
        if (repeat === 'one' && !fromError) {
          seekAudio(0)
          void resumeAudio()
          return
        }
        if (index < queue.length - 1) {
          void playIndex(index + 1)
          return
        }
        if (repeat === 'all' && queue.length > 0) {
          void playIndex(0)
          return
        }
        pauseAudio()
        set({ isPlaying: false })
        updateMediaSession(currentTrack(get()), false)
        stopPersistTimer()
      },

      prev: () => {
        const { position, index } = get()
        if (position > 3) {
          seekAudio(0)
          set({ position: 0 })
          updatePositionState()
          return
        }
        if (index > 0) void playIndex(index - 1)
        else {
          seekAudio(0)
          set({ position: 0 })
        }
      },

      seek: (seconds) => {
        seekAudio(seconds)
        set({ position: audio.currentTime })
        updatePositionState()
      },

      addToQueue: (track) => {
        useLibraryStore.getState().cacheTrack(track)
        set((s) => ({
          queue: [...s.queue, track],
          originalQueue: s.shuffle ? s.originalQueue : [...s.queue, track],
        }))
      },

      playNext: (track) => {
        useLibraryStore.getState().cacheTrack(track)
        set((s) => {
          if (s.index < 0) {
            return {
              queue: [track],
              originalQueue: [track],
              index: 0,
            }
          }
          const queue = [...s.queue]
          queue.splice(s.index + 1, 0, track)
          const originalQueue = s.shuffle
            ? s.originalQueue
            : [...queue]
          return { queue, originalQueue }
        })
        if (get().index < 0) void playIndex(0)
      },

      removeFromQueue: (removeIndex) => {
        set((s) => {
          const queue = s.queue.filter((_, i) => i !== removeIndex)
          let index = s.index
          if (removeIndex < index) index--
          else if (removeIndex === index) {
            pauseAudio()
            index = Math.min(index, queue.length - 1)
            if (index < 0) {
              return {
                queue,
                originalQueue: queue,
                index: -1,
                isPlaying: false,
              }
            }
            void playIndex(index)
          }
          return {
            queue,
            originalQueue: s.shuffle ? s.originalQueue : queue,
            index,
          }
        })
      },

      reorderQueue: (from, to) => {
        set((s) => {
          const queue = [...s.queue]
          const [item] = queue.splice(from, 1)
          queue.splice(to, 0, item)
          let index = s.index
          if (from === index) index = to
          else if (from < index && to >= index) index--
          else if (from > index && to <= index) index++
          return {
            queue,
            originalQueue: s.shuffle ? s.originalQueue : queue,
            index,
          }
        })
      },

      clearQueue: () => {
        pauseAudio()
        set({
          queue: [],
          originalQueue: [],
          index: -1,
          isPlaying: false,
          position: 0,
          duration: 0,
        })
        updateMediaSession(null, false)
      },

      toggleShuffle: () => {
        set((s) => {
          if (!s.shuffle) {
            return {
              shuffle: true,
              originalQueue: [...s.queue],
              queue: shuffleUpcoming(s.queue, s.index),
            }
          }
          const track = currentTrack(s)
          const idx = track
            ? s.originalQueue.findIndex((t) => t.id === track.id)
            : s.index
          return {
            shuffle: false,
            queue: [...s.originalQueue],
            index: idx >= 0 ? idx : s.index,
          }
        })
      },

      cycleRepeat: () => {
        set((s) => {
          const order: RepeatMode[] = ['off', 'all', 'one']
          const i = order.indexOf(s.repeat)
          return { repeat: order[(i + 1) % order.length] }
        })
      },

      setVolume: (v) => {
        const volume = Math.max(0, Math.min(1, v))
        setAudioVolume(volume)
        set({ volume })
      },

      setPosition: (p) => set({ position: p }),
      setDuration: (d) => set({ duration: d }),

      onTrackEnded: () => {
        get().next()
      },

      jumpToQueueIndex: (index) => {
        void playIndex(index)
      },

      setFullPlayerOpen: (open) => set({ fullPlayerOpen: open }),
      setQueueOpen: (open) => set({ queueOpen: open }),

      persistPlayback: () => {
        const track = currentTrack(get())
        set({
          lastTrackId: track?.id ?? null,
          lastPosition: audio.currentTime || get().position,
        })
      },

      restoreIfNeeded: async () => {
        const { lastTrackId, lastPosition, volume } = get()
        setAudioVolume(volume)
        if (!lastTrackId) return
        const { trackCache } = useLibraryStore.getState()
        let track: Track | undefined = trackCache[lastTrackId]
        if (!track) {
          const { getTrack } = await import('../api/catalog')
          track = (await getTrack(lastTrackId)) ?? undefined
          if (track) useLibraryStore.getState().cacheTrack(track)
        }
        if (!track) return
        set({
          queue: [track],
          originalQueue: [track],
          index: 0,
          isPlaying: false,
        })
        audio.src = track.audio
        seekAudio(lastPosition)
        set({ position: lastPosition })
        updateMediaSession(track, false)
      },
    }),
    {
      name: 'music-player',
      partialize: (s) => ({
        volume: s.volume,
        lastTrackId: s.lastTrackId,
        lastPosition: s.lastPosition,
      }),
    },
  ),
)

export function bootstrapPlayer() {
  initMediaSession()
  const { setVolume, restoreIfNeeded, volume } = usePlayerStore.getState()
  setVolume(volume)
  void restoreIfNeeded()
}

export function useCurrentTrack() {
  return usePlayerStore((s) =>
    s.index >= 0 && s.index < s.queue.length ? s.queue[s.index] : null,
  )
}
