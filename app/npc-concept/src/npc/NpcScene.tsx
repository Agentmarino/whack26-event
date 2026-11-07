import { forwardRef, useEffect, useImperativeHandle, useRef, useState, type CSSProperties } from 'react'
import { describeAgent } from './describe'
import { NpcEngine, type AgentState, type Emote, type Gesture, type NpcSnapshot } from './engine'
import type { ColorName } from './palette'
import { NATIVE_H, NATIVE_W } from './raster'
import { PAPER_END, PAPER_SIZE, TRAY } from './scene'

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
}

// Hit areas in native pixels for the keyboard/mouse hotspots over the canvas.
const TRAY_HOT = { x: TRAY.x - 4, y: TRAY.y - 12, w: TRAY.w + 8, h: TRAY.h + 16 }
const PAPER_HOT = { x: PAPER_END.x - 3, y: PAPER_END.y - 3, w: PAPER_SIZE.w + 6, h: PAPER_SIZE.h + 6 }
const box = (r: { x: number; y: number; w: number; h: number }, s: number): CSSProperties => ({
  left: r.x * s, top: r.y * s, width: r.w * s, height: r.h * s,
})

export const NpcScene = forwardRef<NpcHandle, NpcSceneProps>(function NpcScene(props, ref) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const engineRef = useRef<NpcEngine | null>(null)
  const propsRef = useRef(props)
  propsRef.current = props
  const [snap, setSnap] = useState<NpcSnapshot | null>(null)

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

  const s = props.scale
  const size = { width: NATIVE_W * s, height: NATIVE_H * s }
  return (
    <div className="npc-scene" style={size}>
      <canvas ref={canvasRef} className="npc-canvas" style={size} role="img" aria-label={describeAgent(snap)} />
      <button
        type="button"
        className="npc-hotspot"
        style={box(TRAY_HOT, s)}
        aria-label="Document tray. Choose a file to hand to the agent, or drop one anywhere on the page."
        data-npc-hotspot="tray"
        onClick={() => fileRef.current?.click()}
        onFocus={() => engineRef.current?.setDropHover(true)}
        onBlur={() => engineRef.current?.setDropHover(false)}
      />
      <input
        ref={fileRef}
        type="file"
        hidden
        tabIndex={-1}
        onChange={(e) => {
          const file = e.target.files?.[0]
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
