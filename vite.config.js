import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Forward /webhook/* → n8n on port 5678
      // This avoids CORS completely (same-origin from browser's perspective)
      '/webhook': {
        target: 'http://localhost:5678',
        changeOrigin: true,
      },
      '/webhook-test': {
        target: 'http://localhost:5678',
        changeOrigin: true,
      },
    },
  },
})
