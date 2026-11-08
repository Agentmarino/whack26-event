// Setting since 110: the agent at his desk in front of a glass wall, an open-plan office behind it.
// Everything is drawn in code with palette indices. The office behind the glass is cooler, lighter and
// lower in contrast than the agent so he pops; the background variants (day, evening) only swap the
// office* palette values (see BACKGROUNDS in palette.ts). Back to front:
//   office (buildOffice + drawOfficeLife) -> glass (frames, frosted band, reflections) -> agent -> desk -> props.
import { IDX } from './palette'
import { IndexBuffer, NATIVE_H, NATIVE_W, sprite, tintWhere, type Sprite } from './raster'

/**
 * Where the 49x60 character box sits in the scene. Since 111 the head rises 5 rows above the box (head top at
 * y 13), and the box, the desk and every desk prop sit 3 px lower than in 110 (the desk front panel is shorter).
 */
export const AGENT_ORIGIN = { x: 44, y: 18 }
/** Desk top runs y 73..82 (seen from above), front panel 83..95. The desk hides the agent below y 73. */
export const COUNTER_TOP_Y = 73
export const DESK_FRONT_Y = 83
/** In-tray on the desk, between the monitor and the keyboard (the drop zone and the phone's tap target). */
export const TRAY = { x: 31, y: 76, w: 18, h: 6 }
export const CALC = { x: 84, y: 76 }
export const KEYBOARD = { x: 58, y: 76, w: 22, h: 5 }
export const PAPER_SIZE = { w: 20, h: 5 }
export const PAPER_START = { x: 59, y: 74 }
export const PAPER_END = { x: 59, y: 78 }
/**
 * 115: Cap's business card. Smaller than the sheet, same slide (same rows and hand). It sits left of the
 * sheet's column so the flat hand (native x 66 to 75) rests on its right end and the rest of it shows.
 */
export const CARD_SIZE = { w: 14, h: 5 }
export const CARD_START = { x: 57, y: 74 }
export const CARD_END = { x: 57, y: 78 }
/** Desk monitor. SCREEN is the lit area where NpcScene shows the official logo file. */
export const MONITOR = { x: 5, y: 47, w: 40, h: 23 }
export const SCREEN = { x: 7, y: 49, w: 36, h: 17 }
/**
 * 117: desk layouts. 'standard' is the 110 desk. 'close' is for a camera too tight for the monitor at x 5: a
 * smaller monitor right next to Cap's left arm (his arm passes in front of its right bezel, never the screen),
 * so the logo stays in frame. Only the monitor moves; the tray, keyboard, paper and card keep their places.
 */
export type DeskLayout = 'standard' | 'close' | 'none'
export const MONITOR_CLOSE = { x: 29, y: 53, w: 18, h: 15 }
export const SCREEN_CLOSE = { x: 30, y: 54, w: 15, h: 10 }
/** 'none' (117 follow-up, phone portrait): no desk monitor at all; the Capital One badge on his chest carries the logo. */
export function monitorFor(layout: DeskLayout) {
  if (layout === 'none') return null
  return layout === 'close' ? { monitor: MONITOR_CLOSE, screen: SCREEN_CLOSE } : { monitor: MONITOR, screen: SCREEN }
}
/**
 * 117 follow-up: the Capital One badge on his chest, replacing the 110 name badge. Torso-local (the torso sprite's
 * top-left), so it moves with him (breathing, leaning). A 1 px outline and a white card; the official logo file
 * shows through the white (NpcScene puts it under the canvas, the engine makes those pixels see-through), so a hand
 * passing in front still covers it. Its top row is torso row 15, below the business-card portrait's crop.
 */
export const BADGE = { x: 6, y: 15, w: 10, h: 7 }
export const MUG = { x: 95, y: 69 }
export const PLANT = { x: 107, y: 62 }
export const BUBBLE_AT = { x: 82, y: 5 }

// ---------- office behind the glass ----------
// (116: the constants ExtendedScene continues sideways and upwards are exported; the drawing is unchanged.)
/** Mullions (2 px: light edge, then dark) between the panes. The outer frames are the 1 px columns x 0 and 127. */
export const MULLIONS = [42, 98]
/** Frosted band, just under the back desk tops (111: moved down from y 37 so the colleagues' arms show). */
export const FROSTED = { y: 42, h: 5 }
/** Head top-left of each seated colleague; their forearms rest on the back desk top at y 41. */
const COLLEAGUE_A = { x: 21, y: 24 } // at desk A, their monitor beside them
const COLLEAGUE_B = { x: 110, y: 24 } // at desk B with a mug
/** Ceiling light panels: 22 px wide, every 44 px from x 8 (rows 5-6 lit, row 7 the shade lip). */
export const LIGHTS = [8, 52, 96]
export const LIGHT_W = 22
/** The window band on the back wall: sky from y 12, the city stands on y 34; wall piers every 32 px from x 30. */
export const WINDOW_BAND = { top: 12, base: 34, pierX: 30, pierEvery: 32, pierW: 3 }

/** Far row: tall, plain; near row: lower, with window pairs. Fixed shapes, no randomness. Together they span x 0..127. */
const CITY_FAR = [[0, 9, 16], [10, 19, 21], [20, 27, 14], [28, 39, 19], [40, 47, 23], [48, 59, 15], [60, 69, 20], [70, 81, 13], [82, 91, 18], [92, 103, 22], [104, 115, 16], [116, 127, 20]]
const CITY_NEAR = [[3, 14, 24], [18, 27, 27], [31, 44, 22], [50, 61, 26], [66, 77, 23], [82, 93, 27], [97, 108, 24], [112, 123, 26]]

export function buildings(b: IndexBuffer, x0: number, x1: number, base: number) {
  const far = CITY_FAR
  for (const [a, z, top] of far) b.rect(Math.max(a, x0), top, Math.min(z, x1) - Math.max(a, x0) + 1, base - top, IDX.cityFar)
  const near = CITY_NEAR
  for (const [a, z, top] of near) {
    const l = Math.max(a, x0)
    const r = Math.min(z, x1)
    if (r < l) continue
    b.rect(l, top, r - l + 1, base - top, IDX.cityNear)
    for (let y = top + 2; y < base - 1; y += 3) for (let x = a + 2; x + 1 <= z - 2; x += 4) if (x >= x0 && x + 1 <= x1) b.rect(x, y, 2, 1, IDX.cityWindow)
  }
}

/** The tall office plant: pot at (potX, 40), 8x7, behind the frosted band; leaves in chunky clumps above it. */
export function drawTallPlant(b: IndexBuffer, potX: number, ox = 0, oy = 0) {
  b.rect(potX + ox, 40 + oy, 8, 7, IDX.officePot)
  const leaves: [number, number, number, number][] = [[2, 14, 3, 8], [-1, 19, 4, 7], [5, 17, 4, 9], [-2, 27, 4, 8], [6, 25, 4, 9], [1, 31, 5, 9]]
  for (const [dx, y, w, h] of leaves) {
    b.rect(potX + dx + ox, y + oy, w, h, IDX.officePlant)
    b.rect(potX + dx + w - 1 + ox, y + 1 + oy, 1, h - 1, IDX.officePlantShade)
  }
}

/** Static part of the office: ceiling, back wall with windows on the city, desks, the tall plant. */
export function buildOffice(): IndexBuffer {
  const b = new IndexBuffer(NATIVE_W, NATIVE_H)
  // ceiling with three light panels
  b.rect(0, 0, NATIVE_W, 10, IDX.ceiling)
  for (const x of LIGHTS) {
    b.rect(x, 5, LIGHT_W, 2, IDX.ceilingLight)
    b.rect(x, 7, LIGHT_W, 1, IDX.officeWallShade)
  }
  // back wall and the long window band (sky, city), split by wall piers
  b.rect(0, 10, NATIVE_W, 36, IDX.officeWall)
  b.rect(0, 10, NATIVE_W, 1, IDX.officeWallShade)
  const { top, base } = WINDOW_BAND
  b.rect(0, top, NATIVE_W, 10, IDX.skyTop)
  b.rect(0, top + 10, NATIVE_W, base - top - 10, IDX.skyLow)
  buildings(b, 0, NATIVE_W - 1, base)
  for (let x = WINDOW_BAND.pierX; x < NATIVE_W; x += WINDOW_BAND.pierEvery) b.rect(x, top, WINDOW_BAND.pierW, base - top, IDX.officeWall)
  b.rect(0, base, NATIVE_W, 2, IDX.officeWallShade)
  // floor
  b.rect(0, 46, NATIVE_W, NATIVE_H - 46, IDX.officeFloor)
  // tall plant in the back left corner (leaves in chunky clumps, pot behind the frosted band)
  drawTallPlant(b, 3)
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

/**
 * A colleague seated at a back desk, facing us: head, neck, rounded shoulders, upper arms split from the
 * body by a seam in the shade tone, forearms on the desk top with the hands together. The head is columns
 * 4..11; the last row lies on the desk top. Soft colours only (colleague*), so they stay behind the agent.
 */
const SEATED_ROWS = [
  '....========....',
  '...==========...',
  '...==========...',
  '...=++++++++=...',
  '...=++++++++=...',
  '....++++++++....',
  '....++++++++....',
  '....++++++++....',
  '.....++++++.....',
  '......++++......',
  '...~~~~~~~~~~...',
  '..~~~~~~~~~~~~..',
  '..~~(~~~~~~(~~..',
  '.~~~(~~~~~~(~~~.',
  '.~~~~(~~~~(~~~~.',
  '~~~~~~(~~(~~~~~~',
  '((~~~~~~~~~~~~((',
  '.(((~~++++~~(((.',
]
const SEATED_A: Sprite = sprite(SEATED_ROWS)
const SEATED_B: Sprite = sprite(SEATED_ROWS.map((r) => r.replace(/~/g, '-').replace(/\(/g, ')')))

/** x, y: the head's top-left. Eyes are 1x2 so they read at a distance; looking down they become 2x1 lids. */
function seated(b: IndexBuffer, s: Sprite, x: number, y: number, lookDown: boolean) {
  b.blit(s, x - 4, y)
  if (lookDown) {
    b.rect(x + 1, y + 5, 2, 1, IDX.colleagueHair)
    b.rect(x + 5, y + 5, 2, 1, IDX.colleagueHair)
  } else {
    b.rect(x + 2, y + 4, 1, 2, IDX.colleagueHair)
    b.rect(x + 5, y + 4, 1, 2, IDX.colleagueHair)
  }
}

/** Colleagues and the light flicker. Animated only when ambient is on and motion is allowed. */
export function drawOfficeLife(b: IndexBuffer, t: number, animate: boolean) {
  // colleague A at desk A, their monitor beside them (back towards us); looks down at the keyboard now and then
  const a = COLLEAGUE_A
  seated(b, SEATED_A, a.x, a.y, animate && Math.floor(t / 4200) % 3 === 2)
  b.rect(a.x + 12, a.y + 7, 7, 9, IDX.monitorBack)
  b.rect(a.x + 13, a.y + 8, 5, 1, IDX.colleagueTopAShade)
  b.rect(a.x + 14, a.y + 16, 3, 1, IDX.monitorBack)
  // colleague B at desk B with a mug beside the right hand; lifts it to the chest now and then
  const c = COLLEAGUE_B
  const sip = animate && Math.floor(t / 5300) % 4 === 1
  seated(b, SEATED_B, c.x, c.y, false)
  if (sip) {
    b.rect(c.x + 4, c.y + 17, 7, 1, IDX.deskBack) // the right forearm leaves the desk...
    b.rect(c.x + 7, c.y + 12, 3, 4, IDX.colleagueTopB) // ...and comes up to the chest
    b.rect(c.x + 6, c.y + 12, 1, 4, IDX.colleagueTopBShade)
    b.rect(c.x + 6, c.y + 11, 2, 2, IDX.colleagueSkin)
  }
  const mx = sip ? c.x + 3 : c.x + 12
  const my = sip ? c.y + 9 : c.y + 14
  b.rect(mx, my, 4, 4, IDX.officePot) // mug
  b.rect(mx, my, 4, 1, IDX.officeWallShade)
  // one ceiling light flickers off for a moment every ~9 s
  if (animate && t % 9000 < 140) b.rect(LIGHTS[2], 5, 22, 2, IDX.ceiling)
}

/** Lighter index for each office colour: what a reflection on the glass turns it into. */
let SHINE: Map<number, number> | null = null
export function shineMap() {
  SHINE ??= new Map([
    [IDX.skyTop, IDX.skyShine], [IDX.skyLow, IDX.skyLowShine], [IDX.cityFar, IDX.cityShine], [IDX.cityNear, IDX.cityFar],
    [IDX.cityWindow, IDX.skyLowShine], [IDX.officeWall, IDX.wallShine], [IDX.officeWallShade, IDX.officeWall],
    [IDX.ceiling, IDX.wallShine], [IDX.officeFloor, IDX.deskBack], [IDX.deskBack, IDX.officeWall], [IDX.deskBackShade, IDX.deskBack],
    [IDX.officePlant, IDX.officePlantShade], [IDX.colleagueTopA, IDX.cityShine], [IDX.colleagueTopAShade, IDX.colleagueTopA],
    [IDX.monitorBack, IDX.officePlantShade],
  ])
  return SHINE
}

let FROST: Map<number, number> | null = null
export function frostMap() {
  if (FROST) return FROST
  const darker = [IDX.cityNear, IDX.cityFar, IDX.officeWallShade, IDX.deskBackShade, IDX.monitorBack, IDX.officePlant,
    IDX.officePlantShade, IDX.colleagueTopA, IDX.colleagueTopB, IDX.colleagueTopAShade, IDX.colleagueTopBShade,
    IDX.colleagueHair, IDX.colleagueSkin, IDX.officeFloor]
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
  tintWhere(b, shineMap(), (x, y) => y < COUNTER_TOP_Y && (band(x, y, 36, 5) || band(x, y, 44, 2) || (x > 99 && (band(x, y, 132, 5) || band(x, y, 140, 2)))))
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
export function drawMonitor(b: IndexBuffer, logo: boolean, layout: DeskLayout = 'standard') {
  const m = monitorFor(layout)
  if (!m) return
  const { monitor, screen } = m
  const { x, y, w, h } = monitor
  const mid = x + (w >> 1)
  b.rect(mid - 3, y + h, 6, COUNTER_TOP_Y - (y + h) + 1, IDX.standFrameShade) // neck
  b.rect(mid - 2, y + h, 1, COUNTER_TOP_Y - (y + h) + 1, IDX.standFrame)
  const baseW = layout === 'close' ? 10 : 14
  b.rect(mid - (baseW >> 1), COUNTER_TOP_Y + 1, baseW, 2, IDX.outline) // base on the desk
  b.rect(mid - (baseW >> 1) + 1, COUNTER_TOP_Y + 1, baseW - 2, 1, IDX.standFrameShade)
  b.rect(x, y, w, h, IDX.outline)
  b.rect(x + 1, y + 1, w - 2, h - 2, IDX.bezel)
  b.rect(x + 1, y + h - 3, w - 2, 2, IDX.bezelLight) // chin
  b.rect(screen.x, screen.y, screen.w, screen.h, IDX.screenWhite)
  if (!logo) {
    // no logo file: a plain dashboard so the screen is not empty (never a drawn logo)
    const big = layout === 'standard'
    const pad = big ? 3 : 2
    b.rect(screen.x + pad, screen.y + pad, big ? 14 : 7, 2, IDX.brandNavy)
    b.rect(screen.x + pad, screen.y + (big ? 7 : 5), big ? 10 : 5, 1, IDX.ink)
    if (big) for (let i = 0; i < 5; i++) b.rect(screen.x + 20 + i * 3, screen.y + 12 - i * 2, 2, 3 + i * 2, i === 4 ? IDX.red : IDX.brandNavyLight)
    else for (let i = 0; i < 3; i++) b.rect(screen.x + 9 + i * 2, screen.y + 7 - i * 2, 1, 2 + i * 2, i === 2 ? IDX.red : IDX.brandNavyLight)
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

/** 115: the business card on the desk: white face, a red band at the left end, a navy name line. */
export const BUSINESS_CARD = sprite([
  'kkkkkkkkkkkkkk',
  'krr]]]]]]]]]]k',
  'krr]uuuuu]]]]k',
  'kRRWWWWWWWWWWk',
  'kkkkkkkkkkkkkk',
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
