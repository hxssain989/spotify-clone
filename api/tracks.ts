import type { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const clientId = process.env.JAMENDO_CLIENT_ID
  if (!clientId) {
    res.status(500).json({ error: 'Missing JAMENDO_CLIENT_ID' })
    return
  }

  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(req.query)) {
    if (value === undefined) continue
    if (Array.isArray(value)) {
      value.forEach((v) => params.append(key, v))
    } else {
      params.set(key, value)
    }
  }
  params.set('client_id', clientId)
  params.set('format', 'json')

  try {
    const upstream = await fetch(
      `https://api.jamendo.com/v3.0/tracks?${params}`,
    )
    const data = await upstream.json()
    res.status(upstream.status).json(data)
  } catch {
    res.status(502).json({ error: 'Jamendo request failed' })
  }
}
