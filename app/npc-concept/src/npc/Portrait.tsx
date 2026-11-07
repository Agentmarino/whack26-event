// 115: a small pixel portrait of the agent (head and shoulders) for his business card, drawn from the
// kit's own sprites with the warm face. Same rules as the scene: palette indices, whole device pixels,
// no smoothing, so it stays crisp at any size.
import { useLayoutEffect, useRef } from 'react'
import { buildColorTable, IDX } from './palette'
import { IndexBuffer } from './raster'
import {
  BROWS, BROWS_POS, DEFAULT_FACIAL_HAIR, EYES, EYES_POS, HEAD, HEAD_POS, MOUSTACHE, MOUSTACHE_POS, MOUTH_POS, MOUTHS,
  normalizeFacialHair, STUBBLE, TORSO, TORSO_POS, type FacialHair,
} from './sprites/character'

/** The crop, in the 49x60 character box: two rows above the hair down to the tie knot and the badge. */
const CROP = { x: 4, y: -7, w: 41, h: 46 }
export const PORTRAIT_SIZE = { w: CROP.w, h: CROP.h }

function paint(facialHair: FacialHair): IndexBuffer {
  const b = new IndexBuffer(CROP.w, CROP.h)
  b.blit(TORSO, TORSO_POS.x - CROP.x, TORSO_POS.y - CROP.y)
  const hx = HEAD_POS.x - CROP.x
  const hy = HEAD_POS.y - CROP.y
  b.blit(HEAD, hx, hy)
  if (facialHair === 'moustache-stubble') b.blit(STUBBLE, hx, hy)
  b.blit(EYES.warm, hx + EYES_POS.x, hy + EYES_POS.y)
  b.blit(BROWS.warm, hx + BROWS_POS.x, hy + BROWS_POS.y)
  b.blit(MOUTHS.smile, hx + MOUTH_POS.x, hy + MOUTH_POS.y)
  if (facialHair !== 'none') b.blit(MOUSTACHE, hx + MOUSTACHE_POS.x, hy + MOUSTACHE_POS.y)
  return b
}

export interface NpcPortraitProps {
  /** Wanted width in CSS px; rounded down to a whole number of device px per native pixel (at least 1). */
  width: number
  facialHair?: FacialHair | 'stubble'
  className?: string
}

export function NpcPortrait({ width, facialHair = DEFAULT_FACIAL_HAIR, className }: NpcPortraitProps) {
  const ref = useRef<HTMLCanvasElement>(null)
  const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1
  const k = Math.max(1, Math.floor((width * dpr) / CROP.w + 1e-6))
  const fh = normalizeFacialHair(facialHair)
  useLayoutEffect(() => {
    const canvas = ref.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    const native = document.createElement('canvas')
    native.width = CROP.w
    native.height = CROP.h
    const nctx = native.getContext('2d')
    if (!nctx) return
    const image = nctx.createImageData(CROP.w, CROP.h)
    paint(fh).toRGBA(new Uint32Array(image.data.buffer), buildColorTable(), IDX.officeWall)
    nctx.putImageData(image, 0, 0)
    canvas.width = CROP.w * k
    canvas.height = CROP.h * k
    ctx.imageSmoothingEnabled = false
    ctx.drawImage(native, 0, 0, CROP.w * k, CROP.h * k)
  }, [fh, k])
  return (
    <canvas
      ref={ref}
      className={className}
      aria-hidden="true"
      data-testid="cap-portrait"
      style={{ width: (CROP.w * k) / dpr, height: (CROP.h * k) / dpr, imageRendering: 'pixelated' }}
    />
  )
}
