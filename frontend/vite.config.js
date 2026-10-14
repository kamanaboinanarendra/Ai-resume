import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Dev-only config. In production the frontend is built into the
// backend image and calls the API via relative "/api" URLs, so no
// API origin is ever baked into the bundle.
// The dev proxy target can be overridden with VITE_BACKEND_URL.
const backend = process.env.VITE_BACKEND_URL || 'http://localhost:8000'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': { target: backend, changeOrigin: true }
    }
  },
  preview: {
    port: 4173,
    proxy: {
      '/api': { target: backend, changeOrigin: true }
    }
  }
})
