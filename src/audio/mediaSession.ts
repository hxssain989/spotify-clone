import type { Track } from '../types'
import { audio } from './audioEngine'
import { usePlayerStore } from '../store/playerStore'

let registered = false

export function initMediaSession() {
  if (registered || !('mediaSession' in navigator)) return
  registered = true

  const ms = navigator.mediaSession
  const store = () => usePlayerStore.getState()

  ms.setActionHandler('play', () => store().play())
  ms.setActionHandler('pause', () => store().pause())
  ms.setActionHandler('previoustrack', () => store().prev())
  ms.setActionHandler('nexttrack', () => store().next())
  ms.setActionHandler('seekto', (d) => {
    if (d.seekTime != null) store().seek(d.seekTime)
  })
  ms.setActionHandler('seekbackward', (d) => {
    store().seek(audio.currentTime - (d.seekOffset ?? 10))
  })
  ms.setActionHandler('seekforward', (d) => {
    store().seek(audio.currentTime + (d.seekOffset ?? 10))
  })

  setInterval(() => {
    updatePositionState()
  }, 3000)
}

export function updateMediaSession(track: Track | null, playing: boolean) {
  if (!('mediaSession' in navigator)) return
  const ms = navigator.mediaSession
  ms.playbackState = playing ? 'playing' : 'paused'

  if (!track) {
    ms.metadata = null
    return
  }

  const art = track.image
    ? [
        { src: track.image, sizes: '300x300', type: 'image/jpeg' as const },
        { src: track.image, sizes: '512x512', type: 'image/jpeg' as const },
      ]
    : []

  ms.metadata = new MediaMetadata({
    title: track.name,
    artist: track.artistName,
    album: track.albumName,
    artwork: art,
  })
  updatePositionState()
}

export function updatePositionState() {
  if (!('mediaSession' in navigator)) return
  if (!audio.duration || Number.isNaN(audio.duration)) return
  try {
    navigator.mediaSession.setPositionState({
      duration: audio.duration,
      playbackRate: audio.playbackRate,
      position: audio.currentTime,
    })
  } catch {
    // Some browsers reject position updates before metadata is ready
  }
}
