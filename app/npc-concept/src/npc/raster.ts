// Tiny palette-indexed raster. Everything is drawn into a 320x180 index buffer,
// then converted to RGBA once per frame. Integer coordinates only.
import { CHAR_INDEX } from './palette'

export const NATIVE_W = 320
export const NATIVE_H = 180

export interface Sprite {
  w: number
  h: number
  px: Uint8Array // palette indices, 0 = transparent
}

/** Parse sprite rows written with palette chars ('.' = transparent). */
export function sprite(rows: readonly string[]): Sprite {
  const h = rows.length
  const w = rows[0].length
  rows.forEach((r, y) => {
    if (r.length !== w) throw new Error(`Sprite row ${y} is ${r.length} wide, expected ${w}: ${r}`)
  })
  const px = new Uint8Array(w * h)
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const idx = CHAR_INDEX[row[x]]
      if (idx === undefined) throw new Error(`Unknown palette char '${row[x]}' in sprite row ${y}: ${row}`)
      px[y * w + x] = idx
    }
  })
  return { w, h, px }
}

export function flipX(s: Sprite): Sprite {
  const px = new Uint8Array(s.w * s.h)
  for (let y = 0; y < s.h; y++) for (let x = 0; x < s.w; x++) px[y * s.w + x] = s.px[y * s.w + (s.w - 1 - x)]
  return { w: s.w, h: s.h, px }
}

export function transpose(s: Sprite): Sprite {
  const px = new Uint8Array(s.w * s.h)
  for (let y = 0; y < s.h; y++) for (let x = 0; x < s.w; x++) px[x * s.h + y] = s.px[y * s.w + x]
  return { w: s.h, h: s.w, px }
}

/** An index buffer you can draw into (used for the screen and for temporary layer groups). */
export class IndexBuffer {
  readonly w: number
  readonly h: number
  readonly px: Uint8Array
  constructor(w: number, h: number) {
    this.w = w
    this.h = h
    this.px = new Uint8Array(w * h)
  }
  clear(idx = 0) {
    this.px.fill(idx)
  }
  dot(x: number, y: number, idx: number) {
    x |= 0
    y |= 0
    if (x < 0 || y < 0 || x >= this.w || y >= this.h || idx === 0) return
    this.px[y * this.w + x] = idx
  }
  rect(x: number, y: number, w: number, h: number, idx: number) {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.dot(x + i, y + j, idx)
  }
  /** 1px rectangle outline. */
  frame(x: number, y: number, w: number, h: number, idx: number) {
    this.rect(x, y, w, 1, idx)
    this.rect(x, y + h - 1, w, 1, idx)
    this.rect(x, y, 1, h, idx)
    this.rect(x + w - 1, y, 1, h, idx)
  }
  /** Dashed 1px outline; phase shifts the dashes (marching ants). */
  dashed(x: number, y: number, w: number, h: number, idx: number, phase: number) {
    const on = (i: number) => ((i + phase) >> 1) % 2 === 0
    for (let i = 0; i < w; i++) {
      if (on(i)) this.dot(x + i, y, idx)
      if (on(i + 1)) this.dot(x + w - 1 - i, y + h - 1, idx)
    }
    for (let j = 0; j < h; j++) {
      if (on(j + 1)) this.dot(x, y + h - 1 - j, idx)
      if (on(j)) this.dot(x + w - 1, y + j, idx)
    }
  }
  blit(s: Sprite, x: number, y: number) {
    x |= 0
    y |= 0
    for (let j = 0; j < s.h; j++) {
      for (let i = 0; i < s.w; i++) {
        const v = s.px[j * s.w + i]
        if (v) this.dot(x + i, y + j, v)
      }
    }
  }
  /** Blit with a horizontal row shear: rows above pivotY shift by round((pivotY - row) * k). Fakes a head tilt. */
  blitShear(s: Sprite, x: number, y: number, k: number, pivotY: number) {
    for (let j = 0; j < s.h; j++) {
      const dx = Math.round((pivotY - j) * k)
      for (let i = 0; i < s.w; i++) {
        const v = s.px[j * s.w + i]
        if (v) this.dot(x + i + dx, y + j, v)
      }
    }
  }
  /** Copy a whole buffer of the same size (opaque pixels only). */
  blitBuffer(b: IndexBuffer, x = 0, y = 0) {
    this.blit({ w: b.w, h: b.h, px: b.px }, x, y)
  }
  /** Thick line made by stamping a disc of radius r (r*r <= rr) along a Bresenham line. */
  thickLine(x0: number, y0: number, x1: number, y1: number, rr: number, r: number, idx: number) {
    x0 |= 0
    y0 |= 0
    x1 |= 0
    y1 |= 0
    const dx = Math.abs(x1 - x0)
    const dy = -Math.abs(y1 - y0)
    const sx = x0 < x1 ? 1 : -1
    const sy = y0 < y1 ? 1 : -1
    let err = dx + dy
    for (;;) {
      for (let j = -r; j <= r; j++) for (let i = -r; i <= r; i++) if (i * i + j * j <= rr) this.dot(x0 + i, y0 + j, idx)
      if (x0 === x1 && y0 === y1) break
      const e2 = 2 * err
      if (e2 >= dy) {
        err += dy
        x0 += sx
      }
      if (e2 <= dx) {
        err += dx
        y0 += sy
      }
    }
  }
  /** Write the buffer into RGBA pixels using a colour table. */
  toRGBA(out: Uint32Array, colors: Uint32Array, background: number) {
    for (let i = 0; i < this.px.length; i++) {
      const v = this.px[i]
      out[i] = v ? colors[v] : colors[background]
    }
  }
}
