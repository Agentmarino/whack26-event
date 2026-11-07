import { useEffect, useRef, useState } from 'react'
import { NATIVE_H, NATIVE_W } from './raster'

/** True when the user asked the OS for reduced motion. */
export function usePrefersReducedMotion(): boolean {
  const query = '(prefers-reduced-motion: reduce)'
  const [v, setV] = useState(() => window.matchMedia(query).matches)
  useEffect(() => {
    const mq = window.matchMedia(query)
    const on = () => setV(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])
  return v
}

/**
 * Largest whole-number scale (in device pixels) at which the 320x180 scene fits.
 * reserveRem: height kept free for the dialogue box etc., in rem so it grows with text size.
 * reserveWidthPx: width kept free (e.g. an open side panel).
 */
export function useIntegerScale(reserveRem: number, reserveWidthPx = 0) {
  const compute = () => {
    const dpr = window.devicePixelRatio || 1
    const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16
    const availW = (document.documentElement.clientWidth - 32 - reserveWidthPx) * dpr
    const availH = (window.innerHeight - reserveRem * rem) * dpr
    const deviceScale = Math.max(1, Math.floor(Math.min(availW / NATIVE_W, availH / NATIVE_H)))
    return { deviceScale, scale: deviceScale / dpr }
  }
  const [v, setV] = useState(compute)
  const computeRef = useRef(compute)
  computeRef.current = compute
  useEffect(() => {
    const on = () => {
      const next = computeRef.current()
      setV((prev) => (prev.deviceScale === next.deviceScale && prev.scale === next.scale ? prev : next))
    }
    on()
    window.addEventListener('resize', on)
    // root font-size changes (text zoom tests) also change the reserve
    const mo = new MutationObserver(on)
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['style', 'class'] })
    return () => {
      window.removeEventListener('resize', on)
      mo.disconnect()
    }
  }, [reserveRem, reserveWidthPx])
  return v
}

export type Speed = '1x' | '2x' | 'instant'

/**
 * Typewriter over a fixed line. The full text is always in the DOM; only `printed` advances.
 * Pauses after punctuation so the mouth (driven by onChar) stops there.
 */
export function useTypewriter(
  text: string,
  lineKey: string | number,
  opts: { speed: Speed; instant: boolean; onChar?: (ch: string) => void; onDone?: () => void },
) {
  const instant = opts.instant || opts.speed === 'instant'
  const [st, setSt] = useState({ key: lineKey, n: 0 })
  const printed = st.key === lineKey ? Math.min(st.n, text.length) : instant ? text.length : 0
  const done = printed >= text.length
  const onChar = useRef(opts.onChar)
  const onDone = useRef(opts.onDone)
  onChar.current = opts.onChar
  onDone.current = opts.onDone

  useEffect(() => {
    if (done) return
    if (instant) {
      setSt({ key: lineKey, n: text.length })
      return
    }
    const base = opts.speed === '2x' ? 14 : 28
    const prev = text[printed - 1]
    let delay = printed === 0 ? 120 : base
    if (prev && /[.!?]/.test(prev)) delay = base * 11
    else if (prev && /[,;:]/.test(prev)) delay = base * 5
    const id = window.setTimeout(() => {
      onChar.current?.(text[printed])
      setSt({ key: lineKey, n: printed + 1 })
    }, delay)
    return () => window.clearTimeout(id)
  }, [printed, done, instant, text, lineKey, opts.speed])

  useEffect(() => {
    if (done) onDone.current?.()
  }, [done, lineKey])

  const finish = () => setSt({ key: lineKey, n: text.length })
  return { printed, done, finish }
}
