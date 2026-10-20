import { randomUUID } from 'node:crypto'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { getCode, hasAccess, MAX_DEVICES, normCode, saveCode } from './_access.js'

// GET  /api/access                 -> { ok } for this device's cookie
// POST /api/access { code }        -> unlocks this device (max 2 per code)
export default async function handler(
  req: IncomingMessage & { body?: unknown },
  res: ServerResponse,
) {
  const send = (status: number, body: object) => {
    res.statusCode = status
    res.setHeader('Content-Type', 'application/json')
    res.setHeader('Cache-Control', 'no-store')
    res.end(JSON.stringify(body))
  }

  try {
    if (req.method === 'GET') return send(200, { ok: await hasAccess(req) })
    if (req.method !== 'POST') return send(405, { error: 'Method not allowed' })

    const body = (req.body ?? JSON.parse((await readBody(req)) || '{}')) as {
      code?: string
    }
    const code = normCode(body.code ?? '')
    const entry = code ? await getCode(code) : null
    if (!entry) return send(401, { error: "That code isn't valid." })
    if (entry.devices.length >= MAX_DEVICES) {
      return send(403, {
        error: `This code is already in use on ${MAX_DEVICES} devices. Ask the seller to reset it.`,
      })
    }

    // ponytail: read-then-write, two devices unlocking in the same instant
    // could both get in; use a Lua script / WATCH if that ever matters.
    const deviceId = randomUUID()
    entry.devices.push(deviceId)
    await saveCode(code, entry)

    const https = req.headers['x-forwarded-proto'] === 'https'
    res.setHeader(
      'Set-Cookie',
      `access=${encodeURIComponent(`${code}.${deviceId}`)}; Path=/; Max-Age=315360000; HttpOnly; SameSite=Lax${https ? '; Secure' : ''}`,
    )
    send(200, { ok: true })
  } catch {
    send(500, { error: 'Could not check the code. Try again.' })
  }
}

async function readBody(req: IncomingMessage) {
  let data = ''
  for await (const chunk of req) data += chunk
  return data
}
