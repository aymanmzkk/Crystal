import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      // Genera los iconos de la app a partir de public/logo.svg (ver pwa-assets.config.ts)
      pwaAssets: { config: true },
      manifest: {
        name: 'Crystal',
        short_name: 'Crystal',
        description: 'Crystal: tu vida organizada. Calendario, tareas, finanzas y más',
        lang: 'es',
        display: 'standalone',
        start_url: '/',
        theme_color: '#0a0b0f',
        background_color: '#0a0b0f',
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
      },
    }),
  ],
})
