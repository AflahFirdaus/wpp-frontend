// vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0', // Memaksa vite mendengarkan semua interface jaringan
    port: 5173,
    strictPort: true, // Memastikan tidak pindah port kalau 5173 dipakai
    proxy: {
      '/api': {
        target: 'http://localhost:21465',
        changeOrigin: true,
        secure: false,
      }
    }
  }
})