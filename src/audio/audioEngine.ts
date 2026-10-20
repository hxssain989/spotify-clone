import { resolveVideoId } from '../api/catalog'
import { toast } from '../components/Toast'
import { usePlayerStore } from '../store/playerStore'
import type { Track } from '../types'

// One YouTube IFrame player for the whole app, created on first play inside
// the #yt-host element that FullPlayer keeps mounted. YouTube's rules need it
// visible while playing, so the store pauses whenever the full player closes.

type YTPlayer = {
  loadVideoById(opts: { videoId: string; startSeconds?: number }): void
  playVideo(): void
  pauseVideo(): void
  seekTo(seconds: number, allowSeekAhead: boolean): void
  setVolume(volume: number): void
  getCurrentTime(): number
  getDuration(): number
}

declare global {
  interface Window {
    YT?: {
      Player: new (el: HTMLElement, opts: object) => YTPlayer
      PlayerState: { ENDED: number; PLAYING: number; PAUSED: number }
    }
    onYouTubeIframeAPIReady?: () => void
  }
}

let playerPromise: Promise<YTPlayer> | null = null
let player: YTPlayer | null = null
let volume = 100
let loadedVideoId: string | null = null
let loadSeq = 0

const store = () => usePlayerStore.getState()

function loadApi(): Promise<void> {
  if (window.YT?.Player) return Promise.resolve()
  return new Promise((resolve) => {
    window.onYouTubeIframeAPIReady = () => resolve()
    const s = document.createElement('script')
    s.src = 'https://www.youtube.com/iframe_api'
    document.head.appendChild(s)
  })
}

function getPlayer(): Promise<YTPlayer> {
  playerPromise ??= loadApi().then(
    () =>
      new Promise<YTPlayer>((resolve) => {
        const el = document.createElement('div')
        document.getElementById('yt-host')!.appendChild(el)
        const YT = window.YT!
        const p = new YT.Player(el, {
          width: '100%',
          height: '100%',
          playerVars: { playsinline: 1, rel: 0 },
          events: {
            onReady: () => {
              player = p
              p.setVolume(volume)
              resolve(p)
            },
            onStateChange: (e: { data: number }) => {
              if (e.data === YT.PlayerState.ENDED) store().onTrackEnded()
              else if (e.data === YT.PlayerState.PLAYING)
                usePlayerStore.setState({ isPlaying: true })
              else if (e.data === YT.PlayerState.PAUSED)
                usePlayerStore.setState({ isPlaying: false })
            },
            onError: () => {
              toast('Could not play track — skipping')
              store().next(true)
            },
          },
        })
        // The iframe has no timeupdate event, so poll for the seek bar.
        setInterval(() => {
          if (!player) return
          store().setPosition(player.getCurrentTime() || 0)
          store().setDuration(player.getDuration() || 0)
        }, 500)
      }),
  )
  return playerPromise
}

export async function loadAndPlay(track: Track, startSeconds = 0) {
  const seq = ++loadSeq
  const videoId = await resolveVideoId(track)
  if (seq !== loadSeq) return
  const p = await getPlayer()
  if (seq !== loadSeq) return // user skipped again while we were resolving
  loadedVideoId = videoId
  p.loadVideoById({ videoId, startSeconds })
}

export function hasLoadedVideo() {
  return loadedVideoId !== null
}

export function pauseAudio() {
  loadSeq++ // cancel any load still resolving
  player?.pauseVideo()
}

export function resumeAudio() {
  player?.playVideo()
}

export function seekAudio(seconds: number) {
  player?.seekTo(Math.max(0, seconds), true)
}

export function currentTime() {
  return player?.getCurrentTime() ?? 0
}

export function setAudioVolume(v: number) {
  volume = Math.round(Math.max(0, Math.min(1, v)) * 100)
  player?.setVolume(volume)
}
