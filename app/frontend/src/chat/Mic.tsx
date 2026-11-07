// Voice in: the Web Speech API (en-GB) where the browser has it. Where it does not (or it is blocked),
// a tip points at the phone keyboard's own dictation key instead.
import { useEffect, useRef, useState } from 'react'

interface Recognition {
  lang: string
  interimResults: boolean
  continuous: boolean
  maxAlternatives: number
  start(): void
  stop(): void
  abort(): void
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null
  onerror: ((e: { error: string }) => void) | null
  onend: (() => void) | null
}
type RecognitionCtor = new () => Recognition

const getCtor = (): RecognitionCtor | null => {
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

export function MicButton({ onText }: { onText: (text: string) => void }) {
  const [listening, setListening] = useState(false)
  const [tip, setTip] = useState<string | null>(null)
  const rec = useRef<Recognition | null>(null)
  useEffect(() => () => rec.current?.abort(), [])

  const start = () => {
    const Ctor = getCtor()
    if (!Ctor) {
      setTip("Voice isn't available in this browser. Tap the microphone on your keyboard to dictate instead.")
      return
    }
    if (listening) {
      rec.current?.stop()
      return
    }
    const r = new Ctor()
    r.lang = 'en-GB'
    r.interimResults = false
    r.continuous = false
    r.maxAlternatives = 1
    r.onresult = (e) => {
      const parts: string[] = []
      for (let i = 0; i < e.results.length; i++) {
        const res = e.results[i]
        if (res?.isFinal && res[0]) parts.push(res[0].transcript)
      }
      const text = parts.join(' ').trim()
      if (text) onText(text)
    }
    r.onerror = (e) => {
      setTip(
        e.error === 'not-allowed' || e.error === 'service-not-allowed'
          ? 'The microphone is blocked. Allow it in your browser settings, or tap the microphone on your keyboard to dictate.'
          : "I didn't catch that. Try again, or tap the microphone on your keyboard to dictate.",
      )
    }
    r.onend = () => setListening(false)
    rec.current = r
    setTip(null)
    try {
      r.start()
      setListening(true)
    } catch {
      setTip('Voice could not start. Tap the microphone on your keyboard to dictate instead.')
    }
  }

  return (
    <>
      <button
        type="button"
        className={listening ? 'btn btn--primary' : 'btn'}
        aria-label={listening ? 'Stop listening' : 'Speak your answer'}
        aria-pressed={listening}
        onClick={start}
        data-action="mic"
      >
        <svg width="14" height="18" viewBox="0 0 7 9" shapeRendering="crispEdges" aria-hidden="true" fill="currentColor">
          <path d="M2 0h3v1H2zM1 1h1v4H1zM5 1h1v4H5zM2 1h3v4H2zM0 3h1v2H0zM6 3h1v2H6zM1 5h1v1H1zM5 5h1v1H5zM2 6h3v1H2zM3 7h1v1H3zM1 8h5v1H1z" />
        </svg>
      </button>
      {tip && (
        <p role="status" className="basis-full text-sm leading-snug text-muted" data-testid="mic-tip">
          {tip}
        </p>
      )}
    </>
  )
}
