export type Track = {
  id: string
  name: string
  artistId: string
  artistName: string
  albumName: string
  image: string
  audio: string
  duration: number
}

export type Playlist = {
  id: string
  name: string
  trackIds: string[]
  createdAt: number
}

export type RepeatMode = 'off' | 'all' | 'one'
