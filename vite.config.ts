import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { defineConfig, loadEnv, type Plugin } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

function jamendoProxy(): Plugin {
  return {
    name: 'jamendo-proxy',
    configureServer(server) {
      server.middlewares.use(
        '/api/tracks',
        async (req: IncomingMessage, res: ServerResponse) => {
          const env = loadEnv(server.config.mode, server.config.root, '')
          const clientId = env.JAMENDO_CLIENT_ID
          if (!clientId) {
            res.statusCode = 500
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: 'Missing JAMENDO_CLIENT_ID in .env' }))
            return
          }
          const url = new URL(req.url ?? '/', 'http://localhost')
          const params = new URLSearchParams(url.search)
          params.set('client_id', clientId)
          params.set('format', 'json')
          try {
            const r = await fetch(
              `https://api.jamendo.com/v3.0/tracks?${params}`,
            )
            const body = await r.text()
            res.statusCode = r.status
            res.setHeader('Content-Type', 'application/json')
            res.end(body)
          } catch {
            res.statusCode = 502
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: 'Jamendo request failed' }))
          }
        },
      )
    },
  }
}

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    jamendoProxy(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/*.svg'],
      manifest: {
        name: 'Music Player',
        short_name: 'Music',
        description: 'Search and play music',
        theme_color: '#121212',
        background_color: '#121212',
        display: 'standalone',
        start_url: '/',
        icons: [
          {
            src: '/icons/icon-192.svg',
            sizes: '192x192',
            type: 'image/svg+xml',
          },
          {
            src: '/icons/icon-512.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
          },
          {
            src: '/icons/icon-maskable.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,svg,woff2}'],
        navigateFallback: '/index.html',
        runtimeCaching: [],
      },
    }),
  ],
})
