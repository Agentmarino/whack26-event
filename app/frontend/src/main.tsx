import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource/press-start-2p/400.css'
import '@fontsource/vt323/400.css'
import '@fontsource/atkinson-hyperlegible/400.css'
import '@fontsource/atkinson-hyperlegible/700.css'
import './index.css'
import App from './App.tsx'
import { SettingsProvider } from './settings.tsx'

// PWA testing (117 follow-up): ?inset=top,right,bottom,left (CSS px) stands in for the safe areas of a notch and a
// home bar in a browser that has none (Playwright). Never set in normal use.
const inset = new URLSearchParams(window.location.search).get('inset')
if (inset) {
  const [t = 0, r = 0, b = 0, l = 0] = inset.split(',').map((v) => Number(v) || 0)
  const st = document.documentElement.style
  st.setProperty('--safe-top', `${t}px`)
  st.setProperty('--safe-right', `${r}px`)
  st.setProperty('--safe-bottom', `${b}px`)
  st.setProperty('--safe-left', `${l}px`)
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SettingsProvider>
      <App />
    </SettingsProvider>
  </StrictMode>,
)
