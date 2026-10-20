// Seller's tool for access codes. Reads the Upstash keys from .env.
//   npm run code -- "Ahmed"            make a code for a buyer
//   npm run codes                      list buyers and device counts
//   npm run reset -- AHMED-7K3Q-9XPA   clear its devices (new phone)
//   npm run revoke -- AHMED-7K3Q-9XPA  turn the code off for good
import {
  getCode,
  MAX_DEVICES,
  normCode,
  redis,
  saveCode,
  type AccessCode,
} from '../api/_access.ts'

// No 0/O or 1/I, so codes are easy to read out and type. 32 symbols divide
// 256 evenly, so every symbol is equally likely: 8 of them = ~1.1 trillion.
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

function randomPart(length: number) {
  const bytes = crypto.getRandomValues(new Uint8Array(length))
  return [...bytes].map((b) => ALPHABET[b % ALPHABET.length]).join('')
}

const [command, arg = ''] = process.argv.slice(2)

async function main() {
  if (command === 'new') {
    const name = arg.trim()
    if (!name) throw new Error('Give the buyer a name: npm run code -- "Ahmed"')
    const prefix = name.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 8) || 'CODE'
    const entry: AccessCode = {
      name,
      created: new Date().toISOString(),
      devices: [],
    }
    for (;;) {
      const code = `${prefix}-${randomPart(4)}-${randomPart(4)}`
      // NX: never overwrite an existing code
      const ok = await redis('SET', `code:${code}`, JSON.stringify(entry), 'NX')
      if (ok) return console.log(`Code for ${name}: ${code}`)
    }
  }

  if (command === 'list') {
    const keys = (await redis<string[]>('KEYS', 'code:*')).sort()
    if (!keys.length) return console.log('No codes yet.')
    for (const key of keys) {
      const code = key.slice('code:'.length)
      const entry = await getCode(code)
      if (!entry) continue
      console.log(
        `${code.padEnd(22)} ${entry.name.padEnd(20)} ${entry.devices.length}/${MAX_DEVICES} devices   made ${entry.created.slice(0, 10)}`,
      )
    }
    return
  }

  const code = normCode(arg)
  if ((command === 'reset' || command === 'revoke') && !code) {
    throw new Error(`Give the code: npm run ${command} -- AHMED-7K3Q-9XPA`)
  }

  if (command === 'reset') {
    const entry = await getCode(code)
    if (!entry) throw new Error(`No such code: ${code}`)
    await saveCode(code, { ...entry, devices: [] })
    return console.log(`Reset ${code} (${entry.name}). It can unlock ${MAX_DEVICES} new devices.`)
  }

  if (command === 'revoke') {
    const deleted = await redis<number>('DEL', `code:${code}`)
    return console.log(deleted ? `Revoked ${code}.` : `No such code: ${code}`)
  }

  throw new Error('Commands: code, codes, reset, revoke (see scripts/codes.ts)')
}

main().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : e)
  process.exit(1)
})
