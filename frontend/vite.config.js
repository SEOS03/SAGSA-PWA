import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // PWA: manifest + Service Worker generado por Workbox (generateSW). Solo
    // precachea los archivos estáticos del build; las llamadas a la API no se
    // cachean (datos en tiempo real como el calendario). En el Sprint 5 se
    // migra a injectManifest para manejar notificaciones push.
    VitePWA({
      strategies: 'generateSW',
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      // Sin Service Worker en `npm run dev`: solo existe en build/preview.
      devOptions: {
        enabled: false,
      },
      // Iconos generados a partir del logo oficial (public/branding/sagsa_logo.jpg).
      manifest: {
        name: 'Sagsa Academy - Control de Vuelos',
        short_name: 'Sagsa PWA',
        description: 'Programación de vuelos, recursos y progreso de alumnos de Sagsa Academy.',
        lang: 'es',
        theme_color: '#0d0d0d',
        background_color: '#0d0d0d',
        display: 'standalone',
        start_url: '/login',
        scope: '/',
        icons: [
          { src: '/icons/pwa-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icons/pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/icons/maskable-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      // Favicon de la pestaña (mismo ajuste del logo que pwa-192x192).
      includeAssets: ['favicon.png'],
      // Los iconos del manifest se agregan solos al precache; aquí se suma el
      // logo del encabezado (jpg) y los svg.
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,jpg}'],
      },
    }),
  ],
})
