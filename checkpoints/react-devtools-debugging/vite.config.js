import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Two pages: index.html is the fixed app, buggy.html is the original buggy app
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        main: 'index.html',
        buggy: 'buggy.html',
      },
    },
  },
})
