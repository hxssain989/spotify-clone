import { X } from 'lucide-react'
import { useEffect, useState } from 'react'

const KEY = 'ios-install-hint-dismissed'

function isIos(): boolean {
  if (typeof navigator === 'undefined') return false
  return /iPad|iPhone|iPod/.test(navigator.userAgent)
}

function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    // @ts-expect-error iOS Safari
    navigator.standalone === true
  )
}

export function IosInstallHint() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (!isIos() || isStandalone()) return
    if (localStorage.getItem(KEY)) return
    setShow(true)
  }, [])

  if (!show) return null

  return (
    <div className="mx-4 mb-2 rounded-lg border border-neutral-700 bg-surface-elevated p-3 text-sm">
      <div className="flex gap-2">
        <p className="flex-1 text-text-muted">
          For background playback on iPhone, tap Share and{' '}
          <span className="text-white">Add to Home Screen</span>.
        </p>
        <button
          type="button"
          aria-label="Dismiss"
          onClick={() => {
            localStorage.setItem(KEY, '1')
            setShow(false)
          }}
          className="flex h-11 w-11 shrink-0 items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-full"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
    </div>
  )
}
