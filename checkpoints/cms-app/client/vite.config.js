import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  server: {
    // In development (npm run dev), send /api calls to the Express server on port 3000
    proxy: { '/api': 'http://localhost:3000' },
  },
  build: {
    // The built shop goes straight into the backend's public/ folder, which Express serves
    outDir: '../public',
    emptyOutDir: true,
  },
})
