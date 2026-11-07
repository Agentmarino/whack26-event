// Setting B, camera in: the Capital One stand, close up. Every layer is built in code.
// Top band with the wordmark, the agent in the middle, the counter at the bottom.
// To change the setting (A bank counter, C market stall) replace buildBackdrop,
// buildCounter and drawScreen; the character never changes.
import { IDX } from './palette'
import { IndexBuffer, NATIVE_H, NATIVE_W, sprite, type Sprite } from './raster'

/** Where the 64x72 character box sits in the scene. */
export const AGENT_ORIGIN = { x: 48, y: 20 }
/** Counter top runs y 84..99 (seen from above), front panel 101..119. The counter hides the agent below y 84. */
export const COUNTER_TOP_Y = 84
export const TRAY = { x: 20, y: 88, w: 30, h: 8 }
export const CALC = { x: 118, y: 88 }
export const PAPER_SIZE = { w: 22, h: 7 }
export const PAPER_START = { x: 69, y: 85 }
export const PAPER_END = { x: 69, y: 92 }
/** Stand screen, the one ambient touch (only drawn when ambient is on). */
export const SCREEN = { x: 125, y: 29, w: 24, h: 16 }
export const BUBBLE_AT = { x: 96, y: 18 }
/** Top band that holds the wordmark layer. */
export const BAND = { x: 2, y: 0, w: NATIVE_W - 4, h: 13 }

// ---------- pixel font for the wordmark placeholder ----------
const GLYPHS: Record<string, string[]> = {
  C: ['.###.', '#...#', '#....', '#....', '#....', '#...#', '.###.', '.....', '.....'],
  O: ['.###.', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.', '.....', '.....'],
  a: ['.....', '.....', '.###.', '....#', '.####', '#...#', '.####', '.....', '.....'],
  p: ['.....', '.....', '####.', '#...#', '#...#', '#...#', '####.', '#....', '#....'],
  i: ['#', '.', '#', '#', '#', '#', '#', '.', '.'],
  t: ['.#.', '.#.', '###', '.#.', '.#.', '.#.', '..#', '...', '...'],
  l: ['#.', '#.', '#.', '#.', '#.', '#.', '.#', '..', '..'],
  n: ['.....', '.....', '####.', '#...#', '#...#', '#...#', '#...#', '.....', '.....'],
  e: ['.....', '.....', '.###.', '#...#', '#####', '#....', '.###.', '.....', '.....'],
  ' ': ['...', '...', '...', '...', '...', '...', '...', '...', '...'],
}

/** Render text in the pixel font; '#' becomes the given palette char. */
export function pixelText(text: string, ch = 'w'): Sprite {
  const glyphs = [...text].map((c) => GLYPHS[c] ?? GLYPHS[' '])
  const rows: string[] = []
  for (let y = 0; y < 9; y++) rows.push(glyphs.map((g) => g[y].replaceAll('#', ch)).join('.'))
  return sprite(rows)
}

/** Placeholder wordmark, its own layer: plain pixel text, not the logo. NpcScene's wordmarkSrc swaps in the official file. */
export const WORDMARK = pixelText('Capital One')
export const WORDMARK_AT = { x: Math.round((NATIVE_W - WORDMARK.w) / 2), y: 3 }

// ---------- static layers ----------
export function buildBackdrop(): IndexBuffer {
  const b = new IndexBuffer(NATIVE_W, NATIVE_H)
  // calm navy panel, thin frame edge at the sides
  b.rect(0, 0, NATIVE_W, NATIVE_H, IDX.standPanel)
  b.rect(BAND.x, BAND.y, BAND.w, BAND.h, IDX.brandNavy)
  b.rect(BAND.x, BAND.h, BAND.w, 3, IDX.red)
  b.rect(BAND.x, BAND.h + 3, BAND.w, 1, IDX.redShade)
  b.rect(0, 0, 2, NATIVE_H, IDX.standFrame)
  b.rect(1, 0, 1, NATIVE_H, IDX.standFrameShade)
  b.rect(NATIVE_W - 2, 0, 2, NATIVE_H, IDX.standFrame)
  b.rect(NATIVE_W - 2, 0, 1, NATIVE_H, IDX.standFrameShade)
  return b
}

export function buildCounter(): IndexBuffer {
  const b = new IndexBuffer(NATIVE_W, NATIVE_H)
  // top surface, seen slightly from above
  b.rect(0, COUNTER_TOP_Y, NATIVE_W, 16, IDX.counterTop)
  b.rect(0, COUNTER_TOP_Y, NATIVE_W, 1, IDX.outline)
  b.rect(0, COUNTER_TOP_Y + 1, NATIVE_W, 1, IDX.counterTopShade)
  b.rect(0, 99, NATIVE_W, 1, IDX.shirt)
  b.rect(0, 100, NATIVE_W, 1, IDX.outline)
  // front panel in navy with the red band
  b.rect(0, 101, NATIVE_W, 19, IDX.brandNavy)
  b.rect(0, 101, NATIVE_W, 2, IDX.brandNavyShade)
  b.rect(0, 106, NATIVE_W, 3, IDX.red)
  b.rect(0, 109, NATIVE_W, 1, IDX.redShade)
  b.rect(0, 117, NATIVE_W, 3, IDX.brandNavyShade)
  return b
}

export const CALCULATOR = sprite([
  '.kkkkkkkkkk.',
  'kcccccccccck',
  'kcddddddddck',
  'kcddddddddck',
  'kcccccccccck',
  'kcCCcCCcCCck',
  'kcccccccccck',
  'kcCCcCCcCCck',
  'kcccccccccck',
  '.kkkkkkkkkk.',
])

export const TRAY_DOC = sprite([
  'kkkkkkkkkkkkkkkkkkkk',
  'kppqqqqqqqqqqqqppppk',
  'kppppqqqqqqqqqppPPPk',
  'kPPPPPPPPPPPPPPPPPPk',
  'kkkkkkkkkkkkkkkkkkkk',
])

export const PAPER = sprite([
  'kkkkkkkkkkkkkkkkkkkkkk',
  'kprrrrrrrppppppppppppk',
  'kppppppppppppppppppppk',
  'kpqqqqqqqqqqqqqqqqqqpk',
  'kpqqqqqqqqqqqqpppppppk',
  'kPPPPPPPPPPPPPPPPPPPPk',
  'kkkkkkkkkkkkkkkkkkkkkk',
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

export function drawTray(b: IndexBuffer) {
  b.rect(TRAY.x, TRAY.y, TRAY.w, TRAY.h, IDX.outline)
  b.rect(TRAY.x + 1, TRAY.y + 1, TRAY.w - 2, TRAY.h - 2, IDX.standFrame)
  b.rect(TRAY.x + 2, TRAY.y + 2, TRAY.w - 4, TRAY.h - 4, IDX.standFrameShade)
  b.rect(TRAY.x + 1, TRAY.y + TRAY.h - 2, TRAY.w - 2, 1, IDX.standFrame)
}

/** The stand's screen with its bezel and pole. Animated unless reduced motion; hidden when ambient is off. */
export function drawScreen(b: IndexBuffer, t: number, animate: boolean) {
  const { x, y, w, h } = SCREEN
  b.rect(x + w / 2 - 1, y + h + 2, 2, COUNTER_TOP_Y - (y + h + 2), IDX.standFrameShade)
  b.rect(x - 2, y - 2, w + 4, h + 4, IDX.outline)
  b.rect(x - 1, y - 1, w + 2, h + 2, IDX.calc)
  b.rect(x, y, w, h, IDX.screen)
  const step = animate ? Math.floor(t / 1600) : 0
  for (let i = 0; i < 4; i++) {
    const bh = 3 + ((i * 7 + step * (i + 3)) % 9)
    b.rect(x + 3 + i * 5, y + h - 3 - bh, 3, bh, IDX.screenLit)
  }
  b.rect(x + 2, y + h - 2, w - 4, 1, IDX.ink)
  if (!animate || Math.floor(t / 500) % 2 === 0) b.rect(x + 2, y + 2, 2, 1, IDX.screenLit)
}
