import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['@tailwindcss/oxide', '@tailwindcss/vite'],
  },
  build: {
    rollupOptions: {
      external: [/\.node$/, /^@tailwindcss\/oxide(?:\/.*)?$/],
    },
    commonjsOptions: {
      ignore: [/\.node$/, '@tailwindcss/oxide'],
    },
  },
})
