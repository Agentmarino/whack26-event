// 116: the scene filling its parent. The unchanged NpcScene (engine canvas, hotspots, logo, cardRect) sits at a
// whole-number device scale with Cap's desk just above the app's dialogue box; a second canvas behind it paints
// the extension (extend.ts) at the same scale and on the same device-pixel grid, so the seams cannot show.
import { forwardRef, useEffect, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { buildExtended, extendedLayout } from './extend'
import { NpcScene, type NpcHandle, type NpcSceneProps } from './NpcScene'
import { BACKGROUNDS, buildColorTable, IDX, type Background, type ColorName } from './palette'
import { NATIVE_H, NATIVE_W } from './raster'

export interface ExtendedSceneLayout {
  /** CSS px per native pixel (whole in device pixels). */
  scale: number
  /** The base 128x96 scene's box in CSS px, relative to the ExtendedScene element. */
  base: { left: number; top: number; width: number; height: number }
}

export interface ExtendedSceneProps extends Omit<NpcSceneProps, 'scale'> {
  /** CSS px at the bottom covered by the app's dialogue box. The base scene's bottom sits just above it. */
  reserveBottom: number
  /** CSS px at the top kept for corner icons (default 0). The base scene never starts above it. */
  reserveTop?: number
  /** Called when the scale or the base scene's box changes. */
  onLayout?: (l: ExtendedSceneLayout) => void
  /**
   * 117: a camera (camera.ts, frameCamera) instead of the fit-the-frame layout: `k` device px per scene px and
   * the base frame's top-left in CSS px, which may be off screen (the sides and the floor cropped). reserveTop and
   * reserveBottom are then ignored.
   */
  camera?: { k: number; left: number; top: number } | null
}

/** Put an element's top-left on a whole CSS px with a relative offset (same rule as NpcScene, see 109). */
function snapToWholePx(el: HTMLElement) {
  el.style.left = '0px'
  el.style.top = '0px'
  const r = el.getBoundingClientRect()
  const x = r.left + window.scrollX
  const y = r.top + window.scrollY
  el.style.left = `${Math.round(x) - x}px`
  el.style.top = `${Math.round(y) - y}px`
}

const typing = () =>
  !!document.activeElement?.matches('input:not([type=radio]):not([type=file]), textarea') &&
  window.matchMedia('(pointer: coarse)').matches

export const ExtendedScene = forwardRef<NpcHandle, ExtendedSceneProps>(function ExtendedScene(props, ref) {
  const { reserveBottom, reserveTop = 0, onLayout, onChange, camera, ...sceneProps } = props
  const wrapRef = useRef<HTMLDivElement>(null)
  const extRef = useRef<HTMLCanvasElement>(null)
  const baseRef = useRef<HTMLDivElement>(null)
  const npcRef = useRef<NpcHandle>(null)
  const [box, setBox] = useState(() => ({ w: window.innerWidth, h: window.innerHeight, dpr: window.devicePixelRatio || 1 }))
  const [palette, setPalette] = useState<Partial<Record<ColorName, string>>>({})
  const [background, setBackground] = useState<Background>(props.background ?? 'day')
  const onChangeRef = useRef(onChange)
  const onLayoutRef = useRef(onLayout)
  useLayoutEffect(() => {
    onChangeRef.current = onChange
    onLayoutRef.current = onLayout
  })
  useEffect(() => {
    if (props.background) setBackground(props.background)
  }, [props.background])

  // Watch the parent's size. Phone: an on-screen keyboard can shrink the window while a text box has focus,
  // so (like useIntegerScale) height-only changes wait until the text box closes.
  useLayoutEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const measure = (force: boolean) => {
      const r = el.getBoundingClientRect()
      const next = { w: r.width, h: r.height, dpr: window.devicePixelRatio || 1 }
      setBox((prev) => {
        if (prev.w === next.w && prev.h === next.h && prev.dpr === next.dpr) return prev
        if (!force && prev.w === next.w && prev.dpr === next.dpr && typing()) return prev
        return next
      })
    }
    measure(true)
    const ro = new ResizeObserver(() => measure(false))
    ro.observe(el)
    const onResize = () => measure(false)
    const onFocusOut = () => window.setTimeout(() => measure(false), 0)
    window.addEventListener('resize', onResize)
    window.addEventListener('focusout', onFocusOut)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', onResize)
      window.removeEventListener('focusout', onFocusOut)
    }
  }, [])

  const camK = camera?.k
  const camL = camera?.left
  const camT = camera?.top
  const layout = useMemo(() => {
    if (camK === undefined || camL === undefined || camT === undefined)
      return extendedLayout(box.w, box.h, reserveTop, reserveBottom, box.dpr)
    const scale = camK / box.dpr
    return { k: camK, scale, base: { left: camL, top: camT, width: NATIVE_W * scale, height: NATIVE_H * scale } }
  }, [box.w, box.h, box.dpr, reserveTop, reserveBottom, camK, camL, camT])
  const { k, scale, base } = layout
  const sceneBox = { width: Math.ceil(NATIVE_W * scale - 1e-6), height: Math.ceil(NATIVE_H * scale - 1e-6) }
  // The extension canvas covers the whole element (one spare CSS px for the snap), a whole number of CSS px.
  const extW = Math.ceil(box.w) + 1
  const extH = Math.ceil(box.h) + 1

  useLayoutEffect(() => {
    onLayoutRef.current?.({ scale: layout.scale, base: { ...layout.base } })
  }, [layout])

  // Paint the extension on the base scene's device-pixel grid. Both boxes are snapped to whole CSS px; the
  // offset between them, in device px, decides where native column 0 of the base lands on the extension canvas.
  const cache = useRef<{ key: string; img: HTMLCanvasElement; px: ImageData; idx: Uint8Array; w: number; h: number } | null>(null)
  useLayoutEffect(() => {
    const canvas = extRef.current
    const sceneEl = baseRef.current?.firstElementChild as HTMLElement | null
    if (!canvas || !sceneEl) return
    const paint = () => {
      snapToWholePx(canvas)
      snapToWholePx(sceneEl) // NpcScene snaps itself too; this covers a move without a window resize
      const dpr = window.devicePixelRatio || 1
      const devW = Math.round(extW * dpr)
      const devH = Math.round(extH * dpr)
      if (canvas.width !== devW) canvas.width = devW
      if (canvas.height !== devH) canvas.height = devH
      const cr = canvas.getBoundingClientRect()
      const sr = sceneEl.getBoundingClientRect()
      const bx = Math.round((sr.left - cr.left) * dpr)
      const by = Math.round((sr.top - cr.top) * dpr)
      const nL = Math.max(0, Math.ceil(bx / k))
      const nT = Math.max(0, Math.ceil(by / k))
      const nR = Math.max(0, Math.ceil((devW - bx - NATIVE_W * k) / k))
      const nB = Math.max(0, Math.ceil((devH - by - NATIVE_H * k) / k))
      const key = `${nL},${nT},${nR},${nB}`
      let c = cache.current
      if (!c || c.key !== key) {
        const buf = buildExtended(nL, nT, nR, nB)
        const img = document.createElement('canvas')
        img.width = buf.w
        img.height = buf.h
        const ictx = img.getContext('2d')
        if (!ictx) return
        c = { key, img, px: ictx.createImageData(buf.w, buf.h), idx: buf.px, w: buf.w, h: buf.h }
        cache.current = c
      }
      const colors = buildColorTable({ ...BACKGROUNDS[background], ...palette })
      const out = new Uint32Array(c.px.data.buffer)
      for (let i = 0; i < c.idx.length; i++) out[i] = colors[c.idx[i] || IDX.ceiling]
      c.img.getContext('2d')?.putImageData(c.px, 0, 0)
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      ctx.imageSmoothingEnabled = false
      ctx.clearRect(0, 0, devW, devH)
      ctx.drawImage(c.img, bx - nL * k, by - nT * k, c.w * k, c.h * k)
    }
    paint()
    // a page-level resize can move the scene by a fraction of a px without changing this box: repaint then too
    window.addEventListener('resize', paint)
    return () => window.removeEventListener('resize', paint)
  }, [k, base.left, base.top, extW, extH, palette, background])

  useImperativeHandle(ref, () => ({
    setState: (s) => npcRef.current?.setState(s),
    emote: (e) => npcRef.current?.emote(e),
    gesture: (g) => npcRef.current?.gesture(g),
    talk: (ch) => npcRef.current?.talk(ch),
    stopTalking: () => npcRef.current?.stopTalking(),
    setTrayDoc: (on) => npcRef.current?.setTrayDoc(on),
    setDropHover: (on) => npcRef.current?.setDropHover(on),
    clearPaper: () => npcRef.current?.clearPaper(),
    clearCard: () => npcRef.current?.clearCard(),
    cardRect: () => npcRef.current?.cardRect() ?? null,
    setPalette: (o) => {
      npcRef.current?.setPalette(o)
      setPalette(o)
    },
    setFacialHair: (f) => npcRef.current?.setFacialHair(f),
    setBackground: (b) => {
      npcRef.current?.setBackground(b)
      setBackground(b)
    },
    reset: () => npcRef.current?.reset(),
    settleIn: () => npcRef.current?.settleIn() ?? 0,
    snapshot: () => npcRef.current?.snapshot() ?? null,
  }), [])

  return (
    <div ref={wrapRef} className="npc-ext">
      <canvas ref={extRef} className="npc-ext__canvas" style={{ width: extW, height: extH }} aria-hidden="true" />
      <div ref={baseRef} className="npc-ext__base" style={{ left: base.left, top: base.top, ...sceneBox }}>
        <NpcScene
          ref={npcRef}
          {...sceneProps}
          scale={scale}
          onChange={(s) => {
            setBackground(s.background)
            onChangeRef.current?.(s)
          }}
        />
      </div>
    </div>
  )
})
