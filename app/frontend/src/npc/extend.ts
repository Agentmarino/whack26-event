// 116: the extended scene. The engine always draws the fixed 128x96 frame; ExtendedScene paints this around it,
// on a second canvas behind it at the same whole device scale, so a tall or wide screen gets more room
// instead of a stretched scene. Static only (no colleagues, no animation), palette indices only, so colour
// modes (setPalette) and day/evening apply exactly as in the base frame.
//
// Coordinates are base-scene coordinates: X 0..127, Y 0..95 is the engine's frame. The extension is X < 0,
// X >= 128, Y < 0 and Y >= 96. Every edge row and column next to the base continues the base's own colours:
//   top     the glass rail (y 0..1 glassFrame) gets one more glassFrame row and a light top edge, then a transom
//           pane (the office ceiling seen through glass), a head rail, and our own ceiling with the same light rhythm
//   sides   the glass wall carries on: a mullion at the seam (x -1 light + the base frame at x 0; x 127 frame +
//           x 128 light), then panes every 56 px with the same ceiling, window band, floor, frosted band and
//           diagonal reflections continuing across them; back desks and plants in the new panes
//   bottom  the desk front's dark bottom (y 94..95) gets one more row and a dark edge, then the floor on our side
//   desk    rows 73..95 are uniform, so the counter just runs on sideways
import { IDX } from './palette'
import { IndexBuffer, NATIVE_H, NATIVE_W, tintWhere } from './raster'
import {
  buildDesk, buildings, buildOffice, COUNTER_TOP_Y, drawGlass, drawTallPlant, FROSTED, frostMap, LIGHT_W, LIGHTS,
  MULLIONS, shineMap, WINDOW_BAND,
} from './scene'

/** Mullion spacing in the extension (the base's middle pane is 54 px between 2 px mullions). */
export const EXT_PANE = 56
/** Transom pane above the base's top rail: rows -18..-3 (the rail is rows -2..2 once extended). */
export const EXT_TRANSOM = { top: -18, bottom: -3 }
/** Head rail where the glass wall meets our ceiling: rows -21..-19. Our ceiling is everything above it. */
export const EXT_HEAD_RAIL = { top: -21, bottom: -19 }
/** The desk front ends one row below the base (dark bottom), then a dark edge; our floor starts at row 98. */
export const EXT_FLOOR_Y = NATIVE_H + 2

const LIGHT_PERIOD = LIGHTS[1] - LIGHTS[0] // 44
const FIRST_LIGHT = LIGHTS[0] // 8

/** A base-coordinate painter over an IndexBuffer that has the base frame at (ox, oy). */
class Painter {
  readonly b: IndexBuffer
  readonly ox: number
  readonly oy: number
  readonly x0: number
  readonly x1: number
  readonly y0: number
  readonly y1: number
  constructor(b: IndexBuffer, ox: number, oy: number) {
    this.b = b
    this.ox = ox
    this.oy = oy
    this.x0 = -ox
    this.x1 = b.w - ox - 1
    this.y0 = -oy
    this.y1 = b.h - oy - 1
  }
  rect(x: number, y: number, w: number, h: number, idx: number) {
    // clip first so huge rows stay cheap
    const l = Math.max(x, this.x0)
    const r = Math.min(x + w - 1, this.x1)
    const t = Math.max(y, this.y0)
    const btm = Math.min(y + h - 1, this.y1)
    if (r < l || btm < t) return
    this.b.rect(l + this.ox, t + this.oy, r - l + 1, btm - t + 1, idx)
  }
  /** Full-width rows. */
  rows(y: number, h: number, idx: number) {
    this.rect(this.x0, y, this.x1 - this.x0 + 1, h, idx)
  }
  /** Calls fn(x) for every x = start + period * k whose span [x, x + w) is in view. */
  every(start: number, period: number, w: number, fn: (x: number) => void) {
    const k0 = Math.floor((this.x0 - w + 1 - start) / period)
    for (let x = start + k0 * period; x <= this.x1; x += period) if (x + w - 1 >= this.x0) fn(x)
  }
}

/** The ceiling light panels at the base rhythm (22 px every 44 px from x 8), on rows [y, y + h) with a shade lip below. */
function lightRow(p: Painter, y: number, h: number) {
  p.every(FIRST_LIGHT, LIGHT_PERIOD, LIGHT_W, (x) => {
    p.rect(x, y, LIGHT_W, h, IDX.ceilingLight)
    p.rect(x, y + h, LIGHT_W, 1, IDX.officeWallShade)
  })
}

/** Sky and city strip (window band rows only), 128 wide, tiled every 128 px. Piers are period 32, so they tile too. */
let STRIP: IndexBuffer | null = null
function windowStrip(): IndexBuffer {
  if (STRIP) return STRIP
  const { top, base } = WINDOW_BAND
  const b = new IndexBuffer(NATIVE_W, NATIVE_H)
  b.rect(0, top, NATIVE_W, 10, IDX.skyTop)
  b.rect(0, top + 10, NATIVE_W, base - top - 10, IDX.skyLow)
  buildings(b, 0, NATIVE_W - 1, base)
  for (let x = WINDOW_BAND.pierX; x < NATIVE_W; x += WINDOW_BAND.pierEvery) b.rect(x, top, WINDOW_BAND.pierW, base - top, IDX.officeWall)
  STRIP = b
  return b
}

/** The base frame's static layers (office, glass, desk), used under the engine's canvas so no gap can show. */
let BASE: IndexBuffer | null = null
function staticBase(): IndexBuffer {
  if (BASE) return BASE
  const b = new IndexBuffer(NATIVE_W, NATIVE_H)
  b.blitBuffer(buildOffice())
  drawGlass(b)
  b.blitBuffer(buildDesk())
  BASE = b
  return b
}

/** Posts (x of the light column, x of the dark column) left and right of the base, out to the edges of the view. */
function extensionPosts(p: Painter): [number, number][] {
  const posts: [number, number][] = [[-1, 0], [128, 127]] // seam posts: a light column against the base's own frame
  for (let j = 1; -EXT_PANE * j >= p.x0; j++) posts.push([-1 - EXT_PANE * j, -EXT_PANE * j])
  for (let j = 1; 127 + EXT_PANE * j <= p.x1; j++) posts.push([127 + EXT_PANE * j, 128 + EXT_PANE * j])
  return posts
}

/** A back desk with a monitor seen from behind, inside the pane that starts at x s (54 wide). */
function backDesk(p: Painter, s: number) {
  p.rect(s + 10, 41, 34, 2, IDX.deskBack)
  p.rect(s + 10, 43, 34, 4, IDX.deskBackShade)
  p.rect(s + 20, 31, 12, 9, IDX.monitorBack)
  p.rect(s + 21, 32, 10, 1, IDX.officeWallShade)
  p.rect(s + 25, 40, 2, 1, IDX.monitorBack)
}

/** A low cabinet and a tall plant inside the pane that starts at x s. */
function plantCorner(p: Painter, s: number) {
  p.rect(s + 6, 37, 22, 1, IDX.deskBack)
  p.rect(s + 6, 38, 22, 9, IDX.deskBackShade)
  p.rect(s + 6, 41, 22, 1, IDX.officeWallShade)
  drawTallPlant(p.b, s + 36, p.ox, p.oy)
}

/** Diagonal reflections on the glass: the base's two band pairs continue, and repeat every 96 px further out. */
function onReflection(x: number, y: number) {
  const pair = (s: number) => {
    const m = ((s % 96) + 96) % 96
    return m < 5 || (m >= 8 && m < 10)
  }
  if (x <= 99) {
    const s = x + y - 36
    return s <= 9 && pair(s)
  }
  const s = x + y - 132
  return s >= 0 && pair(s)
}

/**
 * Paint the extended scene: a buffer of (nL + 128 + nR) x (nT + 96 + nB) palette indices with the base frame's
 * top-left at (nL, nT). The base region holds the static base (office, glass, desk); the engine's canvas covers it.
 */
export function buildExtended(nL: number, nT: number, nR: number, nB: number): IndexBuffer {
  const b = new IndexBuffer(nL + NATIVE_W + nR, nT + NATIVE_H + nB)
  const p = new Painter(b, nL, nT)

  // 1 the office behind the glass (transom rows and the base rows), full width
  p.rect(p.x0, EXT_TRANSOM.top, p.x1 - p.x0 + 1, 10 - EXT_TRANSOM.top, IDX.ceiling)
  lightRow(p, -11, 2) // the office ceiling through the transom
  lightRow(p, 5, 2) // the base's own row, continued sideways
  p.rows(10, 36, IDX.officeWall)
  p.rows(10, 1, IDX.officeWallShade)
  const strip = windowStrip()
  const { top, base } = WINDOW_BAND
  for (let m = Math.floor(p.x0 / NATIVE_W); m * NATIVE_W <= p.x1; m++) {
    if (m === 0) continue
    for (let y = top; y < base; y++) {
      for (let i = 0; i < NATIVE_W; i++) {
        const x = m * NATIVE_W + i
        if (x < p.x0 || x > p.x1 || y < p.y0 || y > p.y1) continue
        b.px[(y + p.oy) * b.w + x + p.ox] = strip.px[y * NATIVE_W + i]
      }
    }
  }
  p.rows(base, 2, IDX.officeWallShade)
  p.rows(46, COUNTER_TOP_Y - 46, IDX.officeFloor)

  // back desks and plants in the new panes; desk B (x 88..127 in the base) runs on 16 px into the first right pane
  p.rect(NATIVE_W, 41, 16, 2, IDX.deskBack)
  p.rect(NATIVE_W, 43, 16, 4, IDX.deskBackShade)
  drawTallPlant(b, 157, p.ox, p.oy)
  for (let j = 1; -EXT_PANE * j + 54 >= p.x0; j++) {
    const s = -EXT_PANE * j + 1
    if (j % 2 === 1) backDesk(p, s)
    else plantCorner(p, s)
  }
  for (let j = 2; EXT_PANE * j + 73 <= p.x1; j++) {
    const s = EXT_PANE * j + 73
    if (j % 2 === 0) backDesk(p, s)
    else plantCorner(p, s)
  }

  // 2 glass: reflections (lighter-colour map), the frosted band, then the frames on top
  const ox = p.ox
  const oy = p.oy
  tintWhere(b, shineMap(), (bx, by) => {
    const x = bx - ox
    const y = by - oy
    return y >= EXT_TRANSOM.top && y < COUNTER_TOP_Y && onReflection(x, y)
  })
  tintWhere(b, frostMap(), (_bx, by) => by - oy > FROSTED.y && by - oy < FROSTED.y + FROSTED.h - 1)
  p.rows(FROSTED.y, 1, IDX.frostedLine)
  p.rows(FROSTED.y + FROSTED.h - 1, 1, IDX.frostedLine)
  const postRows = [
    [EXT_TRANSOM.top, EXT_TRANSOM.bottom - EXT_TRANSOM.top + 1],
    [3, COUNTER_TOP_Y - 3],
  ] as const
  const posts: [number, number][] = [[MULLIONS[0], MULLIONS[0] + 1], [MULLIONS[1], MULLIONS[1] + 1], ...extensionPosts(p)]
  for (const [y, h] of postRows) {
    for (const [light, dark] of posts) {
      p.rect(light, y, 1, h, IDX.glassFrameLight)
      p.rect(dark, y, 1, h, IDX.glassFrame)
    }
    // the base's outer frames continue up through the transom
    p.rect(0, y, 1, h, IDX.glassFrame)
    p.rect(NATIVE_W - 1, y, 1, h, IDX.glassFrame)
  }
  // rail: the base's rows 0..1 (frame) and 2 (red line) run on sideways; one more frame row and a light top edge
  p.rows(-2, 1, IDX.glassFrameLight)
  p.rows(-1, 3, IDX.glassFrame)
  p.rows(2, 1, IDX.red)
  // head rail where the glass wall meets our ceiling
  p.rows(EXT_HEAD_RAIL.top, 1, IDX.officeWallShade)
  p.rows(EXT_HEAD_RAIL.top + 1, 2, IDX.glassFrame)

  // 3 our ceiling above the head rail: the same panels at the same x rhythm; rows grow (2..6 tall) and spread as they come closer
  if (p.y0 < EXT_HEAD_RAIL.top) {
    p.rect(p.x0, p.y0, p.x1 - p.x0 + 1, EXT_HEAD_RAIL.top - p.y0, IDX.ceiling)
    let lip = EXT_HEAD_RAIL.top - 6
    for (let r = 0; lip >= p.y0; r++) {
      const h = Math.min(2 + r, 6)
      lightRow(p, lip - h, h)
      lip -= h + 1 + 8 + 3 * r
    }
  }

  // 4 the counter runs on sideways (its rows are uniform), and its front runs one row further down to a dark edge
  const desk = buildDesk()
  for (let y = COUNTER_TOP_Y; y < NATIVE_H; y++) p.rows(y, 1, desk.px[y * NATIVE_W])
  p.rows(NATIVE_H, 1, IDX.brandNavyShade)
  p.rows(NATIVE_H + 1, 1, IDX.outline)

  // 5 our floor: dark, with lines that open up towards us
  if (p.y1 >= EXT_FLOOR_Y) {
    p.rect(p.x0, EXT_FLOOR_Y, p.x1 - p.x0 + 1, p.y1 - EXT_FLOOR_Y + 1, IDX.floor)
    for (let y = EXT_FLOOR_Y + 2, gap = 4; y <= p.y1; y += gap, gap += 3) p.rows(y, 1, IDX.floorLight)
  }

  // 6 the static base under the engine's canvas
  b.blitBuffer(staticBase(), nL, nT)
  return b
}

/** At most this many native rows of the leftover height go below the base (the rest goes above). */
const MAX_ROWS_BELOW = 6

/**
 * The scale rule. k (device px per native px) = the smaller of floor(W * dpr / 128) and
 * floor((H - reserveTop - reserveBottom) * dpr / 96), at least 1; scale = k / dpr CSS px.
 * The base is centred horizontally (whole CSS px). Of the leftover height, a quarter (at most 6 native rows) goes
 * below the base and the rest above it, so the desk sits just above the dialogue box and tall screens get more ceiling.
 */
export function extendedLayout(W: number, H: number, reserveTop: number, reserveBottom: number, dpr: number) {
  const kW = Math.floor((W * dpr) / NATIVE_W + 1e-6)
  const kH = Math.floor(((H - reserveTop - reserveBottom) * dpr) / NATIVE_H + 1e-6)
  const k = Math.max(1, Math.min(kW, kH))
  const scale = k / dpr
  const width = NATIVE_W * scale
  const height = NATIVE_H * scale
  const leftover = Math.max(0, H - reserveTop - reserveBottom - height)
  const rowsBelow = Math.min(MAX_ROWS_BELOW, Math.floor(leftover / scale / 4))
  // when even 1x does not fit, keep the desk (the bottom) visible and let the ceiling go
  const top = Math.floor(H - reserveBottom - rowsBelow * scale - height)
  const left = Math.floor((W - width) / 2)
  return { k, scale, base: { left, top, width, height } }
}
