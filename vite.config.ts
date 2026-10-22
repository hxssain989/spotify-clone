import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv, type Plugin } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'
import accessHandler from './api/access.ts'
import spotifyHandler from './api/spotify.ts'
import youtubeHandler from './api/youtube.ts'

// Dev: serve the Vercel functions at the same paths.
function apiRoutes(): Plugin {
  return {
    name: 'api-routes',
    configureServer(server) {
      const routes = {
        '/api/youtube': youtubeHandler,
        '/api/access': accessHandler,
        '/api/spotify': spotifyHandler,
      }
      for (const [path, handler] of Object.entries(routes)) {
        server.middlewares.use(path, (req, res) => {
          // Re-read .env per request so new keys need no restart.
          const env = loadEnv(server.config.mode, server.config.root, '')
          for (const [k, v] of Object.entries(env)) if (v) process.env[k] = v
          void handler(req, res)
        })
      }
    },
  }
}

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    apiRoutes(),
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
