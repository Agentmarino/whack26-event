import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// 114. Mock or real backend: VITE_USE_MOCK (default true) picks it in the app (src/api/client.ts).
// The real backend (113) is reached through this proxy, so the phone only needs the Vite address.
// API_TARGET defaults to http://localhost:8000. `pnpm dev --host` serves the LAN address for the phone.
export default defineConfig(({ mode }) => {
  const env = { ...loadEnv(mode, process.cwd(), ''), ...process.env }
  const target = env.API_TARGET || 'http://localhost:8000'
  return {
    plugins: [react(), tailwindcss()],
    server: {
      port: 5173,
      strictPort: true,
      proxy: { '/api': { target, changeOrigin: true } },
    },
    preview: { port: 5173, proxy: { '/api': { target, changeOrigin: true } } },
  }
})
