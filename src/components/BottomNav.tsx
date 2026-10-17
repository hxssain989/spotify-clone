import { Home, Library, Search } from 'lucide-react'
import { NavLink } from 'react-router-dom'

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `flex min-h-11 flex-1 flex-col items-center justify-center gap-0.5 text-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
    isActive ? 'text-white' : 'text-text-muted'
  }`

export function BottomNav() {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-neutral-800 bg-surface pb-[env(safe-area-inset-bottom)]"
      aria-label="Main"
    >
      <div className="mx-auto flex max-w-[480px]">
        <NavLink to="/" end className={linkClass}>
          <Home className="h-6 w-6" aria-hidden />
          Home
        </NavLink>
        <NavLink to="/search" className={linkClass}>
          <Search className="h-6 w-6" aria-hidden />
          Search
        </NavLink>
        <NavLink to="/library" className={linkClass}>
          <Library className="h-6 w-6" aria-hidden />
          Library
        </NavLink>
      </div>
    </nav>
  )
}
