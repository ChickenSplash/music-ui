import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Same paths the production nginx proxies, so the app never needs CORS or a base URL.
// Point this at a running HMS (`php artisan serve` by default). Without nginx in front, HMS
// sends the MP3s itself, so leave MUSIC_ACCEL_PREFIX unset there.
const hms = process.env.HMS_URL ?? 'http://localhost:8000'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api/': hms,
      '/sanctum/': hms,
    },
  },
})
