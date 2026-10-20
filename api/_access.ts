import type { IncomingMessage } from 'node:http'

// Shared by the API routes and scripts/codes.ts. The leading underscore keeps
// Vercel from serving this file as a route.

export const MAX_DEVICES = 2

export type AccessCode = { name: string; created: string; devices: string[] }

// Upstash Redis over its REST API: one POST per command, no client library.
export async function redis<T = unknown>(...command: string[]): Promise<T> {
  const url = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL
  const token =
    process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) throw new Error('Missing Upstash Redis env vars')
  const r = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(command),
  })
  const data = (await r.json()) as { result?: T; error?: string }
  if (data.error) throw new Error(data.error)
  return data.result as T
}

export const normCode = (code: string) =>
  code.toUpperCase().replace(/[^A-Z0-9-]/g, '')

export async function getCode(code: string): Promise<AccessCode | null> {
  const raw = await redis<string | null>('GET', `code:${normCode(code)}`)
  return raw ? (JSON.parse(raw) as AccessCode) : null
}

export function saveCode(code: string, data: AccessCode) {
  return redis('SET', `code:${normCode(code)}`, JSON.stringify(data))
}

// Cookie "access" = "<CODE>.<deviceId>", set by /api/access on unlock.
export function readAccessCookie(req: IncomingMessage) {
  const value = req.headers.cookie
    ?.split(/;\s*/)
    .find((c) => c.startsWith('access='))
    ?.slice('access='.length)
  const [code, deviceId] = decodeURIComponent(value ?? '').split('.')
  return code && deviceId ? { code, deviceId } : null
}

// A device has access while its id is still on the code's device list, so
// resetting or revoking a code locks its devices out on their next request.
export async function hasAccess(req: IncomingMessage) {
  const cookie = readAccessCookie(req)
  if (!cookie) return false
  const entry = await getCode(cookie.code)
  return !!entry?.devices.includes(cookie.deviceId)
}
