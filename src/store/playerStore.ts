import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  currentTime,
  hasLoadedVideo,
  loadAndPlay,
  pauseAudio,
  resumeAudio,
  seekAudio,
  setAudioVolume,
} from '../audio/audioEngine'
import { toast } from '../components/Toast'
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

async function playIndex(index: number, startSeconds = 0) {
  const track = usePlayerStore.getState().queue[index]
  if (!track) return

  useLibraryStore.getState().cacheTrack(track)
  // YouTube's player has to be on screen while it plays.
  usePlayerStore.setState({
    index,
    position: startSeconds,
    duration: track.duration,
    fullPlayerOpen: true,
  })

  try {
    await loadAndPlay(track, startSeconds)
    startPersistTimer()
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Playback failed'
    if (message === 'No video found') {
      toast('Song not found on YouTube — skipping')
      usePlayerStore.getState().next(true)
    } else {
      // Quota, missing key or network: skipping would just fail again.
      toast(message)
      usePlayerStore.setState({ isPlaying: false })
    }
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
        const { index, position } = get()
        if (!currentTrack(get())) return
        if (!hasLoadedVideo()) {
          void playIndex(index, position) // restored track, not loaded yet
          return
        }
        set({ fullPlayerOpen: true })
        resumeAudio()
        startPersistTimer()
      },

      pause: () => {
        pauseAudio()
        set({ isPlaying: false })
        get().persistPlayback()
        stopPersistTimer()
      },

      next: (fromError = false) => {
        const { queue, index, repeat } = get()
        if (repeat === 'one' && !fromError) {
          seekAudio(0)
          resumeAudio()
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
        stopPersistTimer()
      },

      prev: () => {
        const { position, index } = get()
        if (position > 3) {
          seekAudio(0)
          set({ position: 0 })
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
        set({ position: Math.max(0, seconds) })
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

      setFullPlayerOpen: (open) => {
        set({ fullPlayerOpen: open })
        if (!open) get().pause() // video must stay visible while playing
      },
      setQueueOpen: (open) => set({ queueOpen: open }),

      persistPlayback: () => {
        const track = currentTrack(get())
        set({
          lastTrackId: track?.id ?? null,
          lastPosition: currentTime() || get().position,
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
        set({ position: lastPosition, duration: track.duration })
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
  const { setVolume, restoreIfNeeded, volume } = usePlayerStore.getState()
  setVolume(volume)
  void restoreIfNeeded()
}

export function useCurrentTrack() {
  return usePlayerStore((s) =>
    s.index >= 0 && s.index < s.queue.length ? s.queue[s.index] : null,
  )
}
