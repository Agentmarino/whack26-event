// 117: the camera. Over the extended scene it picks a crop window of the native scene and a whole number of
// device pixels per scene pixel (never a blur), so Cap fills the screen instead of the desk. It crops the sides
// and the floor before it shrinks Cap. Pure: the app calls it with the stage size and the room its dialogue
// box takes at rest, and passes the result to ExtendedScene's `camera` prop and NpcScene's `layout` prop.
//
// Three framings (screens/117-framing-options.png):
//   A  head and shoulders: his head, shoulders and chest above the box; the desk is behind the box at rest
//   B  waist up (default): head to the desk strip (his hands, the keyboard, the tray, the paper and card) just
//      above the box, the monitor and its logo in frame
//   C  the tightest that still shows his hands on the keyboard above the box (the tray, paper and card land
//      behind the box at rest)
// When the box at rest would cover what the framing must show (a short landscape screen, big text), the
// camera reports mode 'bubble': the app shows the line in a speech bubble beside or above his head and keeps
// only the inputs at the bottom, and the camera frames for that smaller bottom bar.
import { NATIVE_H, NATIVE_W } from './raster'
import { COUNTER_TOP_Y, DESK_FRONT_Y, MONITOR, MONITOR_CLOSE, type DeskLayout } from './scene'

export type Framing = 'A' | 'B' | 'C'
export const FRAMINGS: Record<Framing, string> = {
  A: 'Head and shoulders',
  B: 'Waist up, desk strip and monitor',
  C: 'Tightest with his hands on the keyboard',
}

/** Cap's landmarks in native scene px, at rest (he leans and bobs a pixel). Right and bottom edges exclusive. */
export const CAP_MARKS = {
  /** first row of hair */
  headTop: 13,
  /** the chin outline (head row 29): nothing of the app's goes above this line but the corner icons */
  chin: 43,
  mouth: { x: 68, y: 37 },
  head: { x0: 55, x1: 82 },
  /** shoulders and arms */
  body: { x0: 45, x1: 96 },
  /** the torso alone (head and shoulders) */
  torso: { x0: 48, x1: 89 },
}
/** The desk top (73, his head-to-desk region ends here), the row under his fingers on the keyboard, the strip's end. */
export const DESK_MARKS = { top: COUNTER_TOP_Y, hands: 77, strip: DESK_FRONT_Y }

/** One row of air above his hair. */
const TOP_ROW = CAP_MARKS.headTop - 1
/** The head-to-desk-top region the fill share is measured on. */
const REGION = DESK_MARKS.top - CAP_MARKS.headTop

/** `bottom`: the first native row that may sit behind the box at rest. */
const SPEC: Record<Framing, { bottom: number; keepLogo: boolean }> = {
  A: { bottom: 64, keepLogo: true },
  B: { bottom: DESK_MARKS.strip, keepLogo: true },
  C: { bottom: DESK_MARKS.hands, keepLogo: true },
}

export interface CameraInput {
  /** The stage in CSS px. */
  w: number
  h: number
  dpr: number
  framing: Framing
  /** CSS px at the bottom the dialogue box takes at rest: name plate, three lines, the Next row, the fine print. */
  restBox: number
  /** CSS px at the bottom the inputs alone take (bubble mode). */
  dockBox: number
  /** CSS px a speech bubble needs above his head (bubble mode on a narrow screen). */
  bubbleTop: number
  /** CSS px a speech bubble needs beside his head (bubble mode on a wide screen). */
  bubbleSide: number
  /** CSS px of air over his head. */
  topPad: number
  /** CSS px the top corner icons take from each top corner: his head stays between them, or below them. */
  corner: { w: number; h: number }
  /** The least share of the height his head-to-desk-top region fills (0.55 on a phone, 0.5 on a desktop). */
  minFill: number
}

export interface Camera {
  framing: Framing
  /** Device px per scene px, and CSS px per scene px. */
  k: number
  scale: number
  /** The base 128x96 frame's box in CSS px, relative to the stage (may be partly off screen). */
  base: { left: number; top: number; width: number; height: number }
  layout: DeskLayout
  /** 'box': the dialogue box at the bottom; 'bubble': the line in a speech bubble on `side`. */
  mode: 'box' | 'bubble'
  side: 'right' | 'left' | 'above'
  /** Landmarks in stage CSS px. */
  chinY: number
  deskTopY: number
  stripY: number
  mouth: { x: number; y: number }
  head: { left: number; right: number; top: number }
  /** The share of the height his head-to-desk-top region fills. */
  fill: number
}

/** The scene columns the window keeps when it can: the monitor (with the logo) through his right arm. */
function want(layout: DeskLayout) {
  return { x0: (layout === 'close' ? MONITOR_CLOSE : MONITOR).x, x1: CAP_MARKS.body.x1 }
}

function place(inp: CameraInput, k: number, reserve: number, topPad: number, bottomRow: number, keepLogo: boolean) {
  const { w, h, dpr } = inp
  const s = k / dpr
  const win = (w * dpr) / k
  // horizontal: centred on Cap; with the logo kept, shifted (and the monitor moved in) to keep it in frame
  const cx = (CAP_MARKS.head.x0 + CAP_MARKS.head.x1) / 2
  let x0 = cx - win / 2
  let layout: DeskLayout = 'standard'
  const std = want('standard')
  if (win < std.x1 - std.x0) layout = 'close'
  if (keepLogo) {
    const span = want(layout)
    if (win >= span.x1 - span.x0) x0 = Math.min(Math.max(x0, span.x1 - win), span.x0)
    else x0 = Math.min(span.x0 - 1, CAP_MARKS.head.x0 - 2) // keep the monitor; his far arm may be cut
  }
  // never lose his head
  x0 = Math.min(Math.max(x0, CAP_MARKS.head.x1 + 2 - win), CAP_MARKS.head.x0 - 2)
  // vertical: the framing's bottom row on the box's top edge; if that pushes his head off the top, the head wins
  let y12 = h - reserve - (bottomRow - TOP_ROW) * s
  if (y12 < topPad) y12 = topPad
  // the corner icons: his head between them, else below them
  if (y12 + (CAP_MARKS.headTop - TOP_ROW) * s < inp.corner.h) {
    const lo = CAP_MARKS.head.x1 - (w - inp.corner.w) / s
    const hi = CAP_MARKS.head.x0 - inp.corner.w / s
    if (lo <= hi) x0 = Math.min(Math.max(x0, lo), hi)
    else y12 = inp.corner.h - (CAP_MARKS.headTop - TOP_ROW) * s
  }
  const left = Math.round(-x0 * s)
  const top = Math.round(y12 - TOP_ROW * s)
  const at = (row: number) => top + row * s
  const col = (c: number) => left + c * s
  return {
    k,
    scale: s,
    base: { left, top, width: NATIVE_W * s, height: NATIVE_H * s },
    layout,
    chinY: at(CAP_MARKS.chin),
    deskTopY: at(DESK_MARKS.top),
    stripY: at(DESK_MARKS.strip),
    mouth: { x: col(CAP_MARKS.mouth.x + 0.5), y: at(CAP_MARKS.mouth.y + 0.5) },
    head: { left: col(CAP_MARKS.head.x0), right: col(CAP_MARKS.head.x1), top: at(CAP_MARKS.headTop) },
    fill: (REGION * s) / h,
    bottomY: at(bottomRow),
  }
}

function pickK(inp: CameraInput, framing: Framing, reserve: number, topPad: number): number {
  const { w, h, dpr, minFill } = inp
  const fitFor = (f: Framing) => Math.floor(((h - reserve - topPad) * dpr) / (SPEC[f].bottom - TOP_ROW) + 1e-6)
  const kMin = Math.ceil((minFill * h * dpr) / REGION - 1e-6)
  // the narrowest the window may get: his shoulders and arms (A: the torso)
  const kBody = Math.floor((w * dpr) / (CAP_MARKS.body.x1 - CAP_MARKS.body.x0) + 1e-6)
  const kTorso = Math.floor((w * dpr) / (CAP_MARKS.torso.x1 - CAP_MARKS.torso.x0) + 1e-6)
  const kB = Math.min(kBody, Math.max(kMin, fitFor('B')))
  if (framing === 'B') return Math.max(1, kB)
  const kC = Math.min(kBody, Math.max(kB, fitFor('C')))
  if (framing === 'C') return Math.max(1, kC)
  return Math.max(1, Math.min(kTorso, Math.max(kC + 1, fitFor('A'))))
}

/**
 * Frame the scene for the stage. Box mode when the dialogue box at rest leaves what the framing must show (at
 * most two scene rows of tolerance); otherwise bubble mode, framed for the inputs alone at the bottom, the
 * bubble beside his head when there is room for it, else above it.
 */
export function frameCamera(inp: CameraInput): Camera {
  const spec = SPEC[inp.framing]
  const k = pickK(inp, inp.framing, inp.restBox, inp.topPad)
  const box = place(inp, k, inp.restBox, inp.topPad, spec.bottom, spec.keepLogo)
  const underChin = inp.h - box.chinY - 8 >= inp.restBox
  const fitsBox = box.bottomY - 2 * box.scale <= inp.h - inp.restBox + 0.5 && underChin
  if (fitsBox) return finish(inp, box, 'box', 'right')
  // bubble beside his head when the stage is wide enough (right first: the monitor is on the left)
  const kSide = pickK(inp, inp.framing, inp.dockBox, inp.topPad)
  const side = place(inp, kSide, inp.dockBox, inp.topPad, spec.bottom, spec.keepLogo)
  const roomRight = inp.w - side.head.right
  const roomLeft = side.head.left
  if (roomRight >= inp.bubbleSide) return finish(inp, side, 'bubble', 'right')
  if (roomLeft >= inp.bubbleSide) return finish(inp, side, 'bubble', 'left')
  // a narrow screen (big text on a phone): the box still fits under his chin, over his chest and the desk
  if (underChin) return finish(inp, box, 'box', 'right')
  const top = inp.topPad + inp.bubbleTop
  const kAbove = pickK(inp, inp.framing, inp.dockBox, top)
  return finish(inp, place(inp, kAbove, inp.dockBox, top, spec.bottom, spec.keepLogo), 'bubble', 'above')
}

function finish(inp: CameraInput, p: ReturnType<typeof place>, mode: Camera['mode'], side: Camera['side']): Camera {
  const { bottomY: _b, ...rest } = p
  void _b
  return { framing: inp.framing, ...rest, mode, side }
}
