export const audio = document.createElement('audio')
audio.preload = 'auto'
audio.setAttribute('playsinline', '')
audio.crossOrigin = 'anonymous'

export function loadAndPlay(src: string) {
  if (audio.src !== src) audio.src = src
  return audio.play()
}

export function pauseAudio() {
  audio.pause()
}

export function resumeAudio() {
  return audio.play()
}

export function seekAudio(seconds: number) {
  audio.currentTime = Math.max(0, Math.min(seconds, audio.duration || seconds))
}

export function setAudioVolume(v: number) {
  audio.volume = Math.max(0, Math.min(1, v))
}
