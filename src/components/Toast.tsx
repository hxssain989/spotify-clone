import { useEffect, useState } from 'react'

type ToastItem = { id: number; message: string }

let pushToast: (message: string) => void = () => {}

export function toast(message: string) {
  pushToast(message)
}

export function ToastHost() {
  const [items, setItems] = useState<ToastItem[]>([])

  useEffect(() => {
    pushToast = (message) => {
      const id = Date.now()
      setItems((prev) => [...prev, { id, message }])
      setTimeout(() => {
        setItems((prev) => prev.filter((t) => t.id !== id))
      }, 2800)
    }
    return () => {
      pushToast = () => {}
    }
  }, [])

  if (!items.length) return null

  return (
    <div
      className="pointer-events-none fixed left-4 right-4 z-[100] flex flex-col gap-2"
      style={{ bottom: 'calc(5.5rem + env(safe-area-inset-bottom))' }}
      aria-live="polite"
    >
      {items.map((t) => (
        <div
          key={t.id}
          className="mx-auto max-w-md rounded-lg bg-neutral-800 px-4 py-3 text-sm shadow-lg"
        >
          {t.message}
        </div>
      ))}
    </div>
  )
}
