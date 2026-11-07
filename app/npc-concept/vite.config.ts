import react from '@vitejs/plugin-react'
import { existsSync } from 'node:fs'
import { defineConfig } from 'vite'

// The official Capital One logo is used only if the file has been added to public/brand/.
// It is shown unchanged on the desk monitor's screen (scaled to fit); never redraw or trace it.
const logo = ['svg', 'png']
  .map((ext) => `brand/capital-one-logo.${ext}`)
  .find((file) => existsSync(new URL(`./public/${file}`, import.meta.url)))

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  define: { 'import.meta.env.VITE_NPC_LOGO': JSON.stringify(logo ? `/${logo}` : '') },
})
