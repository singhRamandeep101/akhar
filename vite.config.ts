import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// GitHub Pages: set VITE_BASE=/akhar/ in CI. Locally stays "/".
export default defineConfig({
  plugins: [react()],
  base: process.env.VITE_BASE || '/',
})
