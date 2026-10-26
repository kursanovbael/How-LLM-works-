import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// relative base so the build works on a GitHub Pages project URL
export default defineConfig({ base: './', plugins: [react()], server: { port: 5173 } })
