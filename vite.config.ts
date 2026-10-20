import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv, type Plugin } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'
import youtubeHandler from './api/youtube.ts'

// Dev: serve the Vercel function at the same path.
function youtubeApi(): Plugin {
  return {
    name: 'youtube-api',
    configureServer(server) {
      server.middlewares.use('/api/youtube', (req, res) => {
        // Re-read .env per request so adding the key needs no restart.
        const env = loadEnv(server.config.mode, server.config.root, '')
        if (env.YOUTUBE_API_KEY) process.env.YOUTUBE_API_KEY = env.YOUTUBE_API_KEY
        void youtubeHandler(req, res)
      })
    },
  }
}

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    youtubeApi(),
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
