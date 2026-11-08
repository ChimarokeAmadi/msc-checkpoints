import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  server: {
    // In development (npm run dev), send /api calls to the Express server on port 3000
    proxy: { '/api': 'http://localhost:3000' },
  },
  build: {
    // "npm run build" puts the production files straight into the backend's
    // public/ folder, which Express serves (the step "copy your built React
    // frontend into the backend project")
    outDir: '../public',
    emptyOutDir: true,
  },
})
