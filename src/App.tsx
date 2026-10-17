import { useEffect, useState } from 'react'
import { Route, Routes } from 'react-router-dom'
import { BottomNav } from './components/BottomNav'
import { FullPlayer } from './components/FullPlayer'
import { MiniPlayer } from './components/MiniPlayer'
import { OfflineBanner } from './components/OfflineBanner'
import { QueueSheet } from './components/QueueSheet'
import { ToastHost } from './components/Toast'
import { HomePage } from './pages/Home'
import { LibraryPage } from './pages/Library'
import { PlaylistPage } from './pages/Playlist'
import { SearchPage } from './pages/Search'

function useOnline() {
  const [online, setOnline] = useState(
    typeof navigator === 'undefined' ? true : navigator.onLine,
  )
  useEffect(() => {
    const on = () => setOnline(true)
    const off = () => setOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
    }
  }, [])
  return online
}

export default function App() {
  const online = useOnline()

  return (
    <div className="mx-auto flex min-h-full max-w-[480px] flex-col bg-surface">
      {!online && <OfflineBanner />}
      <main
        className="flex-1 overflow-y-auto pb-32 pt-[env(safe-area-inset-top)]"
        id="main-content"
      >
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/library" element={<LibraryPage />} />
          <Route path="/playlist/:id" element={<PlaylistPage />} />
        </Routes>
      </main>
      <MiniPlayer />
      <FullPlayer />
      <QueueSheet />
      <BottomNav />
      <ToastHost />
    </div>
  )
}
