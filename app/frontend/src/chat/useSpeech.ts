// Read the agent's lines aloud with the browser's own voice (speechSynthesis, en-GB).
import { useEffect } from 'react'

let voice: SpeechSynthesisVoice | null | undefined

function pickVoice(): SpeechSynthesisVoice | null {
  if (voice !== undefined && voice !== null) return voice
  const all = window.speechSynthesis?.getVoices() ?? []
  voice = all.find((v) => v.lang === 'en-GB' && v.localService) ?? all.find((v) => v.lang === 'en-GB') ?? all.find((v) => v.lang.startsWith('en')) ?? null
  return voice
}

export const speechAvailable = () => typeof window !== 'undefined' && 'speechSynthesis' in window

export function useSpeech(text: string | null, key: string | null, enabled: boolean, rate: number) {
  useEffect(() => {
    if (!speechAvailable()) return
    const synth = window.speechSynthesis
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
