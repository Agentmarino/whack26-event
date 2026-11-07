// Read the agent's lines aloud with the browser's own voice (speechSynthesis, en-GB).
import { useEffect, useRef } from 'react'

let voice: SpeechSynthesisVoice | null | undefined

function pickVoice(): SpeechSynthesisVoice | null {
  if (voice !== undefined && voice !== null) return voice
  const all = window.speechSynthesis?.getVoices() ?? []
  voice = all.find((v) => v.lang === 'en-GB' && v.localService) ?? all.find((v) => v.lang === 'en-GB') ?? all.find((v) => v.lang.startsWith('en')) ?? null
  return voice
}

export const speechAvailable = () => typeof window !== 'undefined' && 'speechSynthesis' in window

/** Speak now. Call it inside a tap: iOS only lets a page talk after its first utterance came from a gesture. */
export function speakNow(text: string, rate: number) {
  if (!speechAvailable()) return
  const u = new SpeechSynthesisUtterance(text)
  u.lang = 'en-GB'
  u.rate = rate
  const v = pickVoice()
  if (v) u.voice = v
  window.speechSynthesis.cancel()
  window.speechSynthesis.speak(u)
}

export function useSpeech(text: string | null, key: string | null, enabled: boolean, rate: number) {
  const wasEnabled = useRef(enabled)
  useEffect(() => {
    if (!speechAvailable()) return
    const synth = window.speechSynthesis
    const justTurnedOn = enabled && !wasEnabled.current
    wasEnabled.current = enabled
    // 115: switching read aloud on says its own confirmation (SettingsSheet). Don't read the line on
    // screen over it, and don't cancel it when no line is showing; every new line from here on is read.
    if (justTurnedOn) return
    if (!enabled || !text) {
      synth.cancel()
      return
    }
    synth.cancel()
    const u = new SpeechSynthesisUtterance(text.replace(/£/g, '£ ').replace(/\s+/g, ' '))
    u.lang = 'en-GB'
    u.rate = rate
    const v = pickVoice()
    if (v) u.voice = v
    synth.speak(u)
    return () => synth.cancel()
  }, [key, enabled, rate]) // eslint-disable-line react-hooks/exhaustive-deps
}
