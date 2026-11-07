import { forwardRef, useEffect, useImperativeHandle, useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import { describeAgent } from './describe'
import { NpcEngine, type AgentState, type Emote, type Gesture, type NpcSnapshot } from './engine'
import type { ColorName } from './palette'
import { NATIVE_H, NATIVE_W } from './raster'
import { PAPER_END, PAPER_SIZE, TRAY, WORDMARK, WORDMARK_AT } from './scene'

export interface NpcHandle {
  setState(s: AgentState): void
  emote(e: Emote): void
  gesture(g: Gesture): void
  /** Call per printed character to move the mouth. */
  talk(ch: string): void
  stopTalking(): void
  setTrayDoc(on: boolean): void
  setDropHover(on: boolean): void
  clearPaper(): void
  setPalette(overrides: Partial<Record<ColorName, string>>): void
  reset(): void
  /** ms until the current one-shot animation (wave, reach, slide, coach switch) has finished. */
  settleIn(): number
  snapshot(): NpcSnapshot | null
}

export interface NpcSceneProps {
  /** CSS pixels per native pixel. Use useIntegerScale() so it is whole in device pixels. */
  scale: number
  ambient?: boolean
  reducedMotion?: boolean
  onPaperClick?: () => void
  onFileDrop?: (file: File) => void
  onChange?: (s: NpcSnapshot) => void
  /**
   * Optional URL of the official logo file. When it loads, it is shown in the wordmark layer's
   * area instead of the pixel text, scaled to fit. Never redraw or trace the logo.
   */
  wordmarkSrc?: string
}

// Hit areas in native pixels for the touch/keyboard/mouse hotspots over the canvas.
const TRAY_HOT = { x: TRAY.x - 4, y: TRAY.y - 12, w: TRAY.w + 8, h: TRAY.h + 16 }
const PAPER_HOT = { x: PAPER_END.x - 3, y: PAPER_END.y - 4, w: PAPER_SIZE.w + 6, h: PAPER_SIZE.h + 8 }
/** Room for the official logo: the wordmark's spot, a little wider and taller. */
const LOGO_BOX = { x: WORDMARK_AT.x - 13, y: WORDMARK_AT.y - 1, w: WORDMARK.w + 26, h: 9 }
/** Touch targets are at least 44x44 CSS px (Apple HIG 44pt), grown around their centre. */
const MIN_TARGET = 44
const box = (r: { x: number; y: number; w: number; h: number }, s: number): CSSProperties => {
  const w = Math.max(r.w * s, MIN_TARGET)
  const h = Math.max(r.h * s, MIN_TARGET)
  return { left: (r.x + r.w / 2) * s - w / 2, top: (r.y + r.h / 2) * s - h / 2, width: w, height: h }
}

export const NpcScene = forwardRef<NpcHandle, NpcSceneProps>(function NpcScene(props, ref) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const sceneRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const engineRef = useRef<NpcEngine | null>(null)
  const propsRef = useRef(props)
  propsRef.current = props
  const [snap, setSnap] = useState<NpcSnapshot | null>(null)
  const [logoOk, setLogoOk] = useState(false)

  useEffect(() => {
    const engine = new NpcEngine(canvasRef.current!, {
      ambient: propsRef.current.ambient ?? true,
      reducedMotion: propsRef.current.reducedMotion ?? false,
      onChange: (s) => {
        setSnap(s)
        propsRef.current.onChange?.(s)
      },
    })
    engineRef.current = engine
    engine.start()
    setSnap(engine.snapshot())
    return () => {
      engine.destroy()
      engineRef.current = null
    }
  }, [])

  useEffect(() => engineRef.current?.setAmbient(props.ambient ?? true), [props.ambient])
  useEffect(() => engineRef.current?.setReducedMotion(props.reducedMotion ?? false), [props.reducedMotion])
  useEffect(() => engineRef.current?.setWordmarkVisible(!(props.wordmarkSrc && logoOk)), [props.wordmarkSrc, logoOk])

  // Put the scene's top-left corner on a whole CSS pixel. Centring can leave it at x.5 device px
  // (iPhone 15: 9.83 CSS px = 29.48 device px), and WebKit then paints the 7x canvas 1119 px wide
  // instead of 1120, so one native column is drawn 6 px wide. A relative offset is exact in layout units.
  const s = props.scale
  useLayoutEffect(() => {
    const el = sceneRef.current
    if (!el) return
    const snap = () => {
      el.style.left = '0px'
      el.style.top = '0px'
      const r = el.getBoundingClientRect()
      const x = r.left + window.scrollX
      const y = r.top + window.scrollY
      el.style.left = `${Math.round(x) - x}px`
      el.style.top = `${Math.round(y) - y}px`
    }
    snap()
    const ro = new ResizeObserver(snap)
    ro.observe(document.documentElement)
    window.addEventListener('resize', snap)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', snap)
    }
  }, [s])

  useImperativeHandle(ref, () => ({
    setState: (s) => engineRef.current?.setState(s),
    emote: (e) => engineRef.current?.emote(e),
    gesture: (g) => engineRef.current?.gesture(g),
    talk: (ch) => engineRef.current?.talk(ch),
    stopTalking: () => engineRef.current?.stopTalking(),
    setTrayDoc: (on) => engineRef.current?.setTrayDoc(on),
    setDropHover: (on) => engineRef.current?.setDropHover(on),
    clearPaper: () => engineRef.current?.clearPaper(),
    setPalette: (o) => engineRef.current?.setPalette(o),
    reset: () => engineRef.current?.reset(),
    settleIn: () => engineRef.current?.settleIn() ?? 0,
    snapshot: () => engineRef.current?.snapshot() ?? null,
  }), [])

  // A file dragged anywhere over the page highlights the tray; dropping anywhere hands it over.
  useEffect(() => {
    let depth = 0
    const hasFiles = (e: DragEvent) => !!e.dataTransfer && Array.from(e.dataTransfer.types).includes('Files')
    const enter = (e: DragEvent) => {
      if (!hasFiles(e)) return
      e.preventDefault()
      depth++
      engineRef.current?.setDropHover(true)
    }
    const over = (e: DragEvent) => {
      if (!hasFiles(e)) return
      e.preventDefault()
      if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy'
    }
    const leave = (e: DragEvent) => {
      if (!hasFiles(e)) return
      depth = Math.max(0, depth - 1)
      if (depth === 0) engineRef.current?.setDropHover(false)
    }
    const drop = (e: DragEvent) => {
      if (!hasFiles(e)) return
      e.preventDefault()
      depth = 0
      engineRef.current?.setDropHover(false)
      const file = e.dataTransfer?.files[0]
      if (file) propsRef.current.onFileDrop?.(file)
    }
    window.addEventListener('dragenter', enter)
    window.addEventListener('dragover', over)
    window.addEventListener('dragleave', leave)
    window.addEventListener('drop', drop)
    return () => {
      window.removeEventListener('dragenter', enter)
      window.removeEventListener('dragover', over)
      window.removeEventListener('dragleave', leave)
      window.removeEventListener('drop', drop)
    }
  }, [])

  // The canvas box is a whole number of CSS px and its backing store matches it in device px, so the
  // browser maps it 1:1. The engine draws the 160x120 frame at deviceScale inside it (iPhone 15: 7x =
  // 1120 device px in a 374 CSS px = 1122 device px box; the last 2 device px stay transparent).
  const dpr = window.devicePixelRatio || 1
  const deviceScale = Math.max(1, Math.round(s * dpr))
  const size = { width: Math.ceil(NATIVE_W * s - 1e-6), height: Math.ceil(NATIVE_H * s - 1e-6) }
  const backingW = Math.round(size.width * dpr)
  const backingH = Math.round(size.height * dpr)
  useEffect(() => engineRef.current?.setOutput(deviceScale, backingW, backingH), [deviceScale, backingW, backingH])
  return (
    <div ref={sceneRef} className="npc-scene" style={size}>
      <canvas ref={canvasRef} className="npc-canvas" style={size} role="img" aria-label={describeAgent(snap)} />
      {props.wordmarkSrc && (
        <img
          className="npc-logo"
          src={props.wordmarkSrc}
          alt=""
          style={{
            left: LOGO_BOX.x * s, top: LOGO_BOX.y * s, width: LOGO_BOX.w * s, height: LOGO_BOX.h * s,
            visibility: logoOk ? 'visible' : 'hidden',
          }}
          onLoad={() => setLogoOk(true)}
          onError={() => setLogoOk(false)}
        />
      )}
      <button
        type="button"
        className="npc-hotspot"
        style={box(TRAY_HOT, s)}
        aria-label="Document tray. Tap to choose a file to hand to the agent, or drop one anywhere on the page."
        data-npc-hotspot="tray"
        onClick={() => fileRef.current?.click()}
        onFocus={(e) => e.currentTarget.matches(':focus-visible') && engineRef.current?.setDropHover(true)}
        onBlur={() => engineRef.current?.setDropHover(false)}
      />
      {/* Visually hidden, not display:none, so iOS Safari opens the picker from the tray tap. */}
      <input
        ref={fileRef}
        type="file"
        accept=".pdf,.csv,image/*"
        className="npc-sr-only"
        tabIndex={-1}
        aria-hidden="true"
        data-npc-file
        onChange={(e) => {
          const file = e.target.files?.[0]
          engineRef.current?.setDropHover(false)
          if (file) propsRef.current.onFileDrop?.(file)
          e.target.value = ''
        }}
      />
      {snap?.paper === 'ready' && (
        <button
          type="button"
          className="npc-hotspot"
          style={box(PAPER_HOT, s)}
          aria-label="Summary sheet on the counter. Open your summary."
          data-npc-hotspot="paper"
          onClick={() => propsRef.current.onPaperClick?.()}
          onMouseEnter={() => engineRef.current?.setPaperHover(true)}
          onMouseLeave={() => engineRef.current?.setPaperHover(false)}
          onFocus={() => engineRef.current?.setPaperHover(true)}
          onBlur={() => engineRef.current?.setPaperHover(false)}
        />
      )}
    </div>
  )
})
