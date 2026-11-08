// Settings behind one button (lesson from the 109 phone test). Kept per device in localStorage
// (wrapped in try/catch: private mode can throw). Text size and colour mode are applied to <html>.
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Speed } from './npc'

export type ColourMode = 'standard' | 'okabe' | 'contrast'
export type TextSize = 100 | 125 | 150
export type VoiceRate = 0.85 | 1 | 1.2
/** 117: the camera (npc/camera.ts): A head and shoulders, B waist up (default), C tightest with his hands; 'full' is 116's whole desk. */
export type FramingSetting = 'A' | 'B' | 'C' | 'full'

export interface Settings {
  speed: Speed
  /** Samples auto-picked (Priya); each line moves on by itself after a reading pause (118: it types out first). */
  demo: boolean
  textSize: TextSize
  /** Sent to the backend as settings.plainEnglish. */
  plainEnglish: boolean
  readAloud: boolean
  voiceRate: VoiceRate
  colour: ColourMode
  /** 116: VT323 in the dialogue box, menus and windows instead of Press Start 2P (font-options.png). */
  readable: boolean
  /** 116: a soft blip per letter while a line types (never during read aloud). */
  blip: boolean
  /** 117: the camera, in the debug part of Settings (and ?framing=A|B|C|full). */
  framing: FramingSetting
}

export const DEFAULT_SETTINGS: Settings = {
  speed: '1x',
  demo: false,
  textSize: 100,
  plainEnglish: false,
  readAloud: false,
  voiceRate: 1,
  colour: 'standard',
  readable: false,
  blip: false,
  framing: 'B',
}

const KEY = 'whack26.settings.v1'

function load(): Settings {
  try {
    const raw = window.localStorage.getItem(KEY)
    const q = new URLSearchParams(window.location.search)
    const fr = q.get('framing')
    const fromUrl = {
      ...(q.get('demo') === '1' ? { demo: true } : {}),
      ...(fr === 'A' || fr === 'B' || fr === 'C' || fr === 'full' ? { framing: fr as FramingSetting } : {}),
    }
    return { ...DEFAULT_SETTINGS, ...(raw ? (JSON.parse(raw) as Partial<Settings>) : {}), ...fromUrl }
  } catch {
    return DEFAULT_SETTINGS
  }
}

interface Ctx {
  settings: Settings
  set: <K extends keyof Settings>(key: K, value: Settings[K]) => void
}

const SettingsContext = createContext<Ctx | null>(null)

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(load)
  useEffect(() => {
    try {
      window.localStorage.setItem(KEY, JSON.stringify(settings))
    } catch {
      // private mode or blocked storage: settings just don't persist
    }
    const html = document.documentElement
    html.style.fontSize = `${settings.textSize}%`
    html.dataset.colour = settings.colour
    html.dataset.textSize = String(settings.textSize)
  }, [settings])
  const value = useMemo<Ctx>(
    () => ({ settings, set: (key, value) => setSettings((s) => ({ ...s, [key]: value })) }),
    [settings],
  )
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
}

export function useSettings(): Ctx {
  const ctx = useContext(SettingsContext)
  if (!ctx) throw new Error('useSettings outside SettingsProvider')
  return ctx
}
