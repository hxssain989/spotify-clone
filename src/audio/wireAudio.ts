import { toast } from '../components/Toast'
import { usePlayerStore } from '../store/playerStore'
import { updatePositionState } from './mediaSession'
import { audio } from './audioEngine'

let wired = false

export function wireAudioEvents() {
  if (wired) return
  wired = true

  const store = () => usePlayerStore.getState()

  audio.addEventListener('timeupdate', () => {
    store().setPosition(audio.currentTime)
  })

  audio.addEventListener('loadedmetadata', () => {
    store().setDuration(audio.duration || 0)
    updatePositionState()
  })

  audio.addEventListener('ended', () => {
    store().onTrackEnded()
  })

  audio.addEventListener('error', () => {
    toast('Could not play track — skipping')
    store().next(true)
  })
}
