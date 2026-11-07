// Setting since 110: the agent at his desk in front of a glass wall, an open-plan office behind it.
// Everything is drawn in code with palette indices. The office behind the glass is cooler, lighter and
// lower in contrast than the agent so he pops; the background variants (day, evening) only swap the
// office* palette values (see BACKGROUNDS in palette.ts). Back to front:
//   office (buildOffice + drawOfficeLife) -> glass (frames, frosted band, reflections) -> agent -> desk -> props.
import { IDX } from './palette'
import { IndexBuffer, NATIVE_H, NATIVE_W, sprite, tintWhere } from './raster'

/** Where the 49x60 character box sits in the scene. Head top at y 15, shoulders at y 48. */
export const AGENT_ORIGIN = { x: 44, y: 15 }
/** Desk top runs y 70..79 (seen from above), front panel 80..95. The desk hides the agent below y 70. */
export const COUNTER_TOP_Y = 70
export const DESK_FRONT_Y = 80
/** In-tray on the desk, between the monitor and the keyboard (the drop zone and the phone's tap target). */
export const TRAY = { x: 31, y: 73, w: 18, h: 6 }
export const CALC = { x: 84, y: 73 }
export const KEYBOARD = { x: 58, y: 73, w: 22, h: 4 }
export const PAPER_SIZE = { w: 20, h: 5 }
export const PAPER_START = { x: 59, y: 71 }
export const PAPER_END = { x: 59, y: 75 }
/** Desk monitor. SCREEN is the lit area where NpcScene shows the official logo file. */
export const MONITOR = { x: 5, y: 44, w: 40, h: 23 }
export const SCREEN = { x: 7, y: 46, w: 36, h: 17 }
export const MUG = { x: 95, y: 66 }
export const PLANT = { x: 107, y: 55 }
export const BUBBLE_AT = { x: 82, y: 5 }

// ---------- office behind the glass ----------
const MULLIONS = [42, 98]
const FROSTED = { y: 37, h: 5 }
const COLLEAGUE_A = { x: 21, y: 24 } // seated behind a monitor, facing us
const COLLEAGUE_B = { x: 111, y: 19 } // standing by the right desk with a mug
const LIGHTS = [8, 52, 96]

function buildings(b: IndexBuffer, x0: number, x1: number, base: number) {
  // far row: tall, plain; near row: lower, with window pairs. Fixed shapes, no randomness.
  const far = [[0, 9, 16], [10, 19, 21], [20, 27, 14], [28, 39, 19], [40, 47, 23], [48, 59, 15], [60, 69, 20], [70, 81, 13], [82, 91, 18], [92, 103, 22], [104, 115, 16], [116, 127, 20]]
  for (const [a, z, top] of far) b.rect(Math.max(a, x0), top, Math.min(z, x1) - Math.max(a, x0) + 1, base - top, IDX.cityFar)
  const near = [[3, 14, 24], [18, 27, 27], [31, 44, 22], [50, 61, 26], [66, 77, 23], [82, 93, 27], [97, 108, 24], [112, 123, 26]]
  for (const [a, z, top] of near) {
    const l = Math.max(a, x0)
    const r = Math.min(z, x1)
    if (r < l) continue
    b.rect(l, top, r - l + 1, base - top, IDX.cityNear)
    for (let y = top + 2; y < base - 1; y += 3) for (let x = a + 2; x + 1 <= z - 2; x += 4) if (x >= x0 && x + 1 <= x1) b.rect(x, y, 2, 1, IDX.cityWindow)
  }
}

/** Static part of the office: ceiling, back wall with windows on the city, desks, the tall plant. */
export function buildOffice(): IndexBuffer {
  const b = new IndexBuffer(NATIVE_W, NATIVE_H)
  // ceiling with three light panels
  b.rect(0, 0, NATIVE_W, 10, IDX.ceiling)
  for (const x of LIGHTS) {
    b.rect(x, 5, 22, 2, IDX.ceilingLight)
    b.rect(x, 7, 22, 1, IDX.officeWallShade)
  }
  // back wall and the long window band (sky, city), split by wall piers
  b.rect(0, 10, NATIVE_W, 36, IDX.officeWall)
  b.rect(0, 10, NATIVE_W, 1, IDX.officeWallShade)
  const top = 12
  const base = 34
  b.rect(0, top, NATIVE_W, 10, IDX.skyTop)
  b.rect(0, top + 10, NATIVE_W, base - top - 10, IDX.skyLow)
  buildings(b, 0, NATIVE_W - 1, base)
  for (let x = 30; x < NATIVE_W; x += 32) b.rect(x, top, 3, base - top, IDX.officeWall)
  b.rect(0, base, NATIVE_W, 2, IDX.officeWallShade)
  // floor
  b.rect(0, 46, NATIVE_W, NATIVE_H - 46, IDX.officeFloor)
  // tall plant in the back left corner (leaves in chunky clumps, pot hidden by the desk monitor)
  b.rect(3, 40, 8, 7, IDX.officePot)
  const leaves: [number, number, number, number][] = [[5, 14, 3, 8], [2, 19, 4, 7], [8, 17, 4, 9], [1, 27, 4, 8], [9, 25, 4, 9], [4, 31, 5, 9]]
  for (const [x, y, w, h] of leaves) {
    b.rect(x, y, w, h, IDX.officePlant)
    b.rect(x + w - 1, y + 1, 1, h - 1, IDX.officePlantShade)
  }
  // back desk A (left) with colleague A's monitor, back desk B (right)
  b.rect(12, 41, 32, 2, IDX.deskBack)
  b.rect(12, 43, 32, 4, IDX.deskBackShade)
  b.rect(88, 41, 40, 2, IDX.deskBack)
  b.rect(88, 43, 40, 4, IDX.deskBackShade)
  // a monitor on desk B seen from the side: thin dark edge, the lit screen faces screen right
  b.rect(91, 30, 9, 10, IDX.monitorBack)
  b.rect(92, 31, 7, 8, IDX.monitorBackLit)
  b.rect(94, 40, 3, 1, IDX.monitorBack)
  return b
}

/** A small person facing us: head with hair, neck, rounded shoulders. dy moves the head (a nod). */
function person(b: IndexBuffer, x: number, y: number, top: number, dy: number, bodyH: number) {
  b.rect(x - 4, y + 10, 16, bodyH, top) // shoulders and body
  b.rect(x - 5, y + 11, 18, bodyH - 1, top)
  b.rect(x + 2, y + 8, 4, 2, IDX.colleagueSkin) // neck
  b.rect(x, y + dy, 8, 9, IDX.colleagueSkin) // head
  b.rect(x, y + dy, 8, 3, IDX.colleagueHair)
  b.rect(x - 1, y + 1 + dy, 1, 4, IDX.colleagueHair)
  b.rect(x + 8, y + 1 + dy, 1, 4, IDX.colleagueHair)
  b.rect(x + 2, y + 4 + dy, 1, 2, IDX.colleagueHair) // eyes, 1x2 so they read at a distance
  b.rect(x + 5, y + 4 + dy, 1, 2, IDX.colleagueHair)
}

/** Colleagues and the light flicker. Animated only when ambient is on and motion is allowed. */
export function drawOfficeLife(b: IndexBuffer, t: number, animate: boolean) {
  // colleague A, seated behind a monitor, facing us; looks down at the keyboard now and then
  const a = COLLEAGUE_A
  const down = animate && Math.floor(t / 4200) % 3 === 2 ? 1 : 0
  person(b, a.x, a.y, IDX.colleagueTopA, down, 8)
  if (down) b.rect(a.x + 2, a.y + 5, 4, 1, IDX.colleagueSkin) // eyes lowered
  b.rect(a.x - 6, a.y + 13, 20, 5, IDX.monitorBack) // their monitor, back towards us
  b.rect(a.x + 3, a.y + 18, 2, 1, IDX.monitorBack)
  // colleague B, standing by desk B with a mug; lifts it now and then
  const c = COLLEAGUE_B
  const sip = animate && Math.floor(t / 5300) % 4 === 1
  person(b, c.x, c.y, IDX.colleagueTopB, 0, 16)
  b.rect(c.x + 10, c.y + 13, 3, 9, IDX.colleagueTopB) // arm
  const my = sip ? c.y + 11 : c.y + 19
  b.rect(c.x + 9, my, 4, 4, IDX.officeWall) // mug
  b.rect(c.x + 9, my, 4, 1, IDX.officeWallShade)
  // one ceiling light flickers off for a moment every ~9 s
  if (animate && t % 9000 < 140) b.rect(LIGHTS[2], 5, 22, 2, IDX.ceiling)
}

/** Lighter index for each office colour: what a reflection on the glass turns it into. */
let SHINE: Map<number, number> | null = null
function shineMap() {
  SHINE ??= new Map([
    [IDX.skyTop, IDX.skyShine], [IDX.skyLow, IDX.skyLowShine], [IDX.cityFar, IDX.cityShine], [IDX.cityNear, IDX.cityFar],
    [IDX.cityWindow, IDX.skyLowShine], [IDX.officeWall, IDX.wallShine], [IDX.officeWallShade, IDX.officeWall],
    [IDX.ceiling, IDX.wallShine], [IDX.officeFloor, IDX.deskBack], [IDX.deskBack, IDX.officeWall], [IDX.deskBackShade, IDX.deskBack],
    [IDX.officePlant, IDX.officePlantShade], [IDX.colleagueTopA, IDX.cityShine], [IDX.monitorBack, IDX.officePlantShade],
  ])
  return SHINE
}

let FROST: Map<number, number> | null = null
function frostMap() {
  if (FROST) return FROST
  const darker = [IDX.cityNear, IDX.cityFar, IDX.officeWallShade, IDX.deskBackShade, IDX.monitorBack, IDX.officePlant,
    IDX.officePlantShade, IDX.colleagueTopA, IDX.colleagueTopB, IDX.colleagueHair, IDX.colleagueSkin, IDX.officeFloor]
  const lighter = [IDX.skyTop, IDX.skyLow, IDX.cityWindow, IDX.officeWall, IDX.ceiling, IDX.deskBack, IDX.monitorBackLit, IDX.officePot]
  FROST = new Map([...darker.map((i) => [i, IDX.frostedLine] as const), ...lighter.map((i) => [i, IDX.frosted] as const)])
  return FROST
}

/** The glass partition over the office: slim dark frames, a frosted band and two diagonal reflections. */
export function drawGlass(b: IndexBuffer) {
  // reflections: a wide and a thin band at 45 degrees on each outer pane
  const band = (x: number, y: number, c: number, w: number) => {
    const d = x + y - c
    return d >= 0 && d < w
  }
  tintWhere(b, shineMap(), (x, y) => y < 70 && (band(x, y, 36, 5) || band(x, y, 44, 2) || (x > 99 && (band(x, y, 132, 5) || band(x, y, 140, 2)))))
  // frosted band: translucent, shapes behind it show as two soft tones; thin lines at its edges
  tintWhere(b, frostMap(), (_x, y) => y > FROSTED.y && y < FROSTED.y + FROSTED.h - 1)
  b.rect(0, FROSTED.y, NATIVE_W, 1, IDX.frostedLine)
  b.rect(0, FROSTED.y + FROSTED.h - 1, NATIVE_W, 1, IDX.frostedLine)
  // frames: top rail with a brand red line, slim mullions with a light edge
  b.rect(0, 0, NATIVE_W, 2, IDX.glassFrame)
  b.rect(0, 2, NATIVE_W, 1, IDX.red)
  for (const x of MULLIONS) {
    b.rect(x, 3, 2, COUNTER_TOP_Y - 3, IDX.glassFrame)
    b.rect(x, 3, 1, COUNTER_TOP_Y - 3, IDX.glassFrameLight)
  }
  b.rect(0, 3, 1, COUNTER_TOP_Y - 3, IDX.glassFrame)
  b.rect(NATIVE_W - 1, 3, 1, COUNTER_TOP_Y - 3, IDX.glassFrame)
}

// ---------- the agent's desk ----------
export function buildDesk(): IndexBuffer {
  const b = new IndexBuffer(NATIVE_W, NATIVE_H)
  // top surface, seen slightly from above: outline, thin highlight, light top, shade at the front edge
  b.rect(0, COUNTER_TOP_Y, NATIVE_W, 10, IDX.counterTop)
  b.rect(0, COUNTER_TOP_Y, NATIVE_W, 1, IDX.outline)
  b.rect(0, COUNTER_TOP_Y + 1, NATIVE_W, 1, IDX.counterTopLight)
  b.rect(0, DESK_FRONT_Y - 1, NATIVE_W, 1, IDX.counterTopShade)
  // front panel: navy with a red stripe, kept short
  b.rect(0, DESK_FRONT_Y, NATIVE_W, NATIVE_H - DESK_FRONT_Y, IDX.brandNavy)
  b.rect(0, DESK_FRONT_Y, NATIVE_W, 1, IDX.outline)
  b.rect(0, DESK_FRONT_Y + 1, NATIVE_W, 1, IDX.brandNavyShade)
  b.rect(0, DESK_FRONT_Y + 5, NATIVE_W, 2, IDX.red)
  b.rect(0, DESK_FRONT_Y + 7, NATIVE_W, 1, IDX.redShade)
  b.rect(0, NATIVE_H - 2, NATIVE_W, 2, IDX.brandNavyShade)
  return b
}

/** Desk monitor facing the customer: slim bezel, chin, stand. The screen is white; the logo file sits on top as DOM. */
export function drawMonitor(b: IndexBuffer, logo: boolean) {
  const { x, y, w, h } = MONITOR
  b.rect(x + 17, y + h, 6, COUNTER_TOP_Y - (y + h) + 1, IDX.standFrameShade) // neck
  b.rect(x + 18, y + h, 1, COUNTER_TOP_Y - (y + h) + 1, IDX.standFrame)
  b.rect(x + 13, COUNTER_TOP_Y + 1, 14, 2, IDX.outline) // base on the desk
  b.rect(x + 14, COUNTER_TOP_Y + 1, 12, 1, IDX.standFrameShade)
  b.rect(x, y, w, h, IDX.outline)
  b.rect(x + 1, y + 1, w - 2, h - 2, IDX.bezel)
  b.rect(x + 1, y + h - 3, w - 2, 2, IDX.bezelLight) // chin
  b.rect(SCREEN.x, SCREEN.y, SCREEN.w, SCREEN.h, IDX.screenWhite)
  if (!logo) {
    // no logo file: a plain dashboard so the screen is not empty (never a drawn logo)
    b.rect(SCREEN.x + 3, SCREEN.y + 3, 14, 2, IDX.brandNavy)
    b.rect(SCREEN.x + 3, SCREEN.y + 7, 10, 1, IDX.ink)
    for (let i = 0; i < 5; i++) b.rect(SCREEN.x + 20 + i * 3, SCREEN.y + 12 - i * 2, 2, 3 + i * 2, i === 4 ? IDX.red : IDX.brandNavyLight)
  }
}

export const KEYBOARD_SPRITE = sprite([
  '.kkkkkkkkkkkkkkkkkkkk.',
  'k66666666666666666666k',
  'k67767767767767767766k',
  'k66776776776776776776k',
  '.kkkkkkkkkkkkkkkkkkkk.',
])

export const MUG_SPRITE = sprite([
  'kkkkkkk..',
  'kRRRRRk..',
  'k4rrrrkkk',
  'k4rrrrk.k',
  'k4rrrrk.k',
  'k4rrrrkkk',
  'krrrrRk..',
  '.kkkkk...',
])

export const DESK_PLANT = sprite([
  '....kk..kk.....',
  '...k99kk90k....',
  '..k9990k990k...',
  '.kk990kk9990kk.',
  'k99k0k99k0kk90k',
  'k990k999k0k990k',
  '.k00kk990kk00k.',
  '..kkk.k0k.kkk..',
  '...kkkkkkkkk...',
  '...kwwwwwwWk...',
  '...kwwwwwwWk...',
  '...kwwwwwwWk...',
  '....kwwwwWk....',
  '....kkkkkkk....',
])

export const CALCULATOR = sprite([
  '.kkkkkkkkk.',
  'kcddddddcck',
  'kcCcCcCcCck',
  'kcccccccccK',
  'kcCcCcCcCck',
  '.kkkkkkkkk.',
].map((r) => r.replace('K', 'k')))

export const TRAY_DOC = sprite([
  'kkkkkkkkkkkkkk',
  'kppqqqqqqqpppk',
  'kpppqqqqqpPPPk',
  'kkkkkkkkkkkkkk',
])

export const PAPER = sprite([
  'kkkkkkkkkkkkkkkkkkkk',
  'kprrrrrrpppppppppppk',
  'kpqqqqqqqqqqqqqqqqpk',
  'kPPPPPPPPPPPPPPPPPPk',
  'kkkkkkkkkkkkkkkkkkkk',
])

export const DROP_ARROW = sprite([
  '.kkkkk.',
  '.kyyyk.',
  'kkyyykk',
  'kyyyyyk',
  '.kyyyk.',
  '..kyk..',
  '...k...',
])

/** A navy in-tray seen from above: the dark floor inside, light rims, a red label on the front lip. */
export function drawTray(b: IndexBuffer) {
  const { x, y, w, h } = TRAY
  b.rect(x, y, w, h, IDX.outline)
  b.rect(x + 1, y + 1, w - 2, h - 2, IDX.brandNavyLight)
  b.rect(x + 2, y + 1, w - 4, h - 4, IDX.brandNavyShade)
  b.rect(x + 1, y + h - 2, w - 2, 1, IDX.brandNavy)
  b.rect(x + (w >> 1) - 3, y + h - 2, 6, 1, IDX.red)
}
