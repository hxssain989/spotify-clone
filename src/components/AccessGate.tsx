import { useEffect, useState, type FormEvent, type ReactNode } from 'react'

// Remembers the server's last answer, so the app opens instantly and still
// works offline. The server re-checks on every load and every song lookup.
const UNLOCKED = 'access-unlocked'

function readFlag() {
  try {
    return localStorage.getItem(UNLOCKED) === '1'
  } catch {
    return false
  }
}

function writeFlag(on: boolean) {
  try {
    if (on) localStorage.setItem(UNLOCKED, '1')
    else localStorage.removeItem(UNLOCKED)
  } catch {
    // storage blocked: the gate just asks the server each time
  }
}

// Called when the server rejects this device (code reset or revoked).
export function relock() {
  writeFlag(false)
  location.reload()
}

export function AccessGate({ children }: { children: ReactNode }) {
  const [state, setState] = useState<'checking' | 'locked' | 'open'>(
    readFlag() ? 'open' : 'checking',
  )
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    fetch('/api/access')
      .then((r) => r.json() as Promise<{ ok?: boolean }>)
      .then((d) => {
        writeFlag(!!d.ok)
        setState(d.ok ? 'open' : 'locked')
      })
      .catch(() => setState(readFlag() ? 'open' : 'locked'))
  }, [])

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const r = await fetch('/api/access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      })
      const d = (await r.json()) as { ok?: boolean; error?: string }
      if (r.ok && d.ok) {
        writeFlag(true)
        setState('open')
      } else {
        setError(d.error ?? 'Something went wrong. Try again.')
      }
    } catch {
      setError('No connection. Try again.')
    } finally {
      setBusy(false)
    }
  }

  if (state === 'open') return children
  if (state === 'checking') return null

  return (
    <main className="mx-auto flex min-h-full max-w-[480px] flex-col justify-center px-6 pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)]">
      <h1 className="text-3xl font-bold">Music</h1>
      <p className="mt-2 text-text-muted">
        Enter the access code you got with your purchase.
      </p>
      <form onSubmit={submit} className="mt-8 flex flex-col gap-3">
        <label className="sr-only" htmlFor="access-code">
          Access code
        </label>
        <input
          id="access-code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          autoCapitalize="characters"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          placeholder="Your access code"
          className="min-h-12 rounded-full border border-neutral-700 bg-surface-highlight px-5 text-lg uppercase tracking-wider placeholder:normal-case placeholder:tracking-normal focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        />
        {error && (
          <p role="alert" className="text-sm text-red-400">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={busy || !code.trim()}
          className="min-h-12 rounded-full bg-accent font-semibold text-black disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          {busy ? 'Checking…' : 'Unlock'}
        </button>
      </form>
    </main>
  )
}
