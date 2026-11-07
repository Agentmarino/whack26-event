// Setting B: a Capital One stand in an expo hall. Every layer is built in code.
// To change the setting (A bank counter, C market stall) replace buildHall,
// buildBackdrop, buildCounter and COUNTER_PROPS; the character never changes.
import { IDX } from './palette'
import { IndexBuffer, NATIVE_H, NATIVE_W, sprite, type Sprite } from './raster'

/** Where the 48x64 character box sits in the scene. */
export const AGENT_ORIGIN = { x: 136, y: 50 }
/** Counter top runs y 100..117, front panel 118..158. The counter hides the agent below y 100. */
export const COUNTER_TOP_Y = 100
export const TRAY = { x: 114, y: 103, w: 24, h: 8 }
export const CALC = { x: 182, y: 103 }
export const PAPER_SIZE = { w: 16, h: 5 }
export const PAPER_START = { x: 152, y: 101 }
export const PAPER_END = { x: 152, y: 112 }
export const SCREEN = { x: 223, y: 47, w: 32, h: 22 }
export const BUBBLE_AT = { x: 170, y: 39 }

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

/** Placeholder wordmark, its own layer. Swap this sprite for the official asset later. */
export const WORDMARK = pixelText('Capital One')
export const WORDMARK_AT = { x: Math.round((NATIVE_W - WORDMARK.w) / 2), y: 20 }

// ---------- static layers ----------
export function buildHall(): IndexBuffer {
  const b = new IndexBuffer(NATIVE_W, NATIVE_H)
  b.rect(0, 0, NATIVE_W, 124, IDX.hallWall)
  for (let x = 16; x < NATIVE_W; x += 32) b.rect(x, 14, 1, 110, IDX.hallWallLight)
  // ceiling truss
  b.rect(0, 1, NATIVE_W, 1, IDX.truss)
  b.rect(0, 6, NATIVE_W, 1, IDX.truss)
  for (let x = 0; x < NATIVE_W; x++) b.dot(x, 1 + Math.abs((x % 10) - 5), IDX.truss)
  // lamps with dithered light cones
  for (let lx = 20; lx < NATIVE_W; lx += 40) {
    b.rect(lx - 1, 7, 3, 2, IDX.standFrameShade)
    b.dot(lx, 9, IDX.spot)
    for (let j = 0; j < 16; j++) {
      const half = 1 + (j >> 1)
      for (let i = -half; i <= half; i++) if (((i + j) & 1) === 0) b.dot(lx + i, 10 + j, IDX.hallWallLight)
    }
  }
  // far booths at the sides
  b.rect(0, 46, 34, 78, IDX.boothA)
  b.rect(0, 40, 36, 6, IDX.standFrameShade)
  b.rect(4, 42, 18, 2, IDX.ink)
  b.rect(286, 46, 34, 78, IDX.boothB)
  b.rect(284, 40, 36, 6, IDX.standFrameShade)
  b.rect(298, 42, 18, 2, IDX.ink)
  // floor
  b.rect(0, 124, NATIVE_W, 56, IDX.floor)
  b.rect(0, 124, NATIVE_W, 1, IDX.hallWallLight)
  for (const y of [131, 142, 158, 174]) b.rect(0, y, NATIVE_W, 1, IDX.floorLight)
  return b
}

export function buildBackdrop(): IndexBuffer {
  const b = new IndexBuffer(NATIVE_W, NATIVE_H)
  // frame posts and top beam
  b.rect(40, 8, 4, 121, IDX.standFrame)
  b.rect(43, 12, 1, 117, IDX.standFrameShade)
  b.rect(276, 8, 4, 121, IDX.standFrame)
  b.rect(276, 12, 1, 117, IDX.standFrameShade)
  b.rect(40, 8, 240, 4, IDX.standFrame)
  b.rect(44, 11, 232, 1, IDX.standFrameShade)
  // navy panel with red band
  b.rect(44, 12, 232, 116, IDX.standPanel)
  b.rect(44, 34, 232, 4, IDX.red)
  b.rect(44, 38, 232, 1, IDX.redShade)
  b.rect(40, 124, 240, 5, IDX.brandNavyShade)
  // left poster: a generic card illustration (not a logo)
  b.rect(62, 52, 32, 20, IDX.outline)
  b.rect(63, 53, 30, 18, IDX.shirt)
  b.rect(63, 53, 30, 4, IDX.red)
  b.rect(67, 60, 6, 5, IDX.glow)
  b.frame(67, 60, 6, 5, IDX.standFrameShade)
  for (let i = 0; i < 4; i++) b.rect(67 + i * 6, 67, 4, 1, IDX.ink)
  // right screen bezel (content is drawn per frame, see drawScreen)
  b.rect(220, 44, 38, 28, IDX.outline)
  b.rect(221, 45, 36, 26, IDX.calc)
  b.rect(238, 72, 2, 10, IDX.standFrameShade)
  b.rect(232, 82, 14, 2, IDX.standFrameShade)
  return b
}

export function buildCounter(): IndexBuffer {
  const b = new IndexBuffer(NATIVE_W, NATIVE_H)
  // top surface (seen slightly from above)
  b.rect(62, 100, 196, 18, IDX.counterTop)
  b.rect(62, 100, 196, 1, IDX.counterTopShade)
  b.rect(62, 100, 1, 18, IDX.counterTopShade)
  b.rect(257, 100, 1, 18, IDX.counterTopShade)
  b.rect(62, 117, 196, 1, IDX.shirt)
  b.rect(62, 118, 196, 1, IDX.outline)
  // front panel in navy with the red band
  b.rect(64, 119, 192, 40, IDX.brandNavy)
  b.rect(64, 119, 192, 2, IDX.brandNavyShade)
  b.rect(64, 127, 192, 4, IDX.red)
  b.rect(64, 131, 192, 1, IDX.redShade)
  b.rect(64, 152, 192, 7, IDX.brandNavyShade)
  b.rect(63, 119, 1, 40, IDX.outline)
  b.rect(256, 119, 1, 40, IDX.outline)
  b.rect(60, 159, 200, 3, IDX.silhouette)
  return b
}

/** Props that never change: leaflet holder and a plant. */
export function buildCounterProps(): IndexBuffer {
  const b = new IndexBuffer(NATIVE_W, NATIVE_H)
  // leaflet holder
  const leaflets = [IDX.brandNavyLight, IDX.red, IDX.shirt]
  leaflets.forEach((c, i) => {
    const x = 72 + i * 6
    b.rect(x, 88 + i, 6, 12 - i, IDX.outline)
    b.rect(x + 1, 89 + i, 4, 10 - i, c)
  })
  b.rect(70, 99, 22, 3, IDX.standFrameShade)
  b.rect(70, 102, 22, 1, IDX.outline)
  // plant
  b.rect(236, 93, 10, 8, IDX.outline)
  b.rect(237, 94, 8, 6, IDX.pot)
  const leaves = [
    [240, 80], [237, 83], [243, 83], [235, 87], [245, 87], [239, 86], [241, 89], [237, 90], [244, 90],
  ]
  for (const [x, y] of leaves) {
    b.rect(x - 1, y - 1, 4, 4, IDX.plantShade)
    b.rect(x, y, 2, 2, IDX.plant)
  }
  return b
}

export const CALCULATOR = sprite([
  '.kkkkkkkk.',
  'kcddddddck',
  'kcddddddck',
  'kcccccccck',
  'kcCcCcCcck',
  'kcccccccck',
  'kcCcCcCcck',
  '.kkkkkkkk.',
])

export const TRAY_DOC = sprite([
  'kkkkkkkkkkkkkkkk',
  'kpqqqqqqqqqqpppk',
  'kpppqqqqqqpppPPk',
  'kkkkkkkkkkkkkkkk',
])

export const PAPER = sprite([
  'kkkkkkkkkkkkkkkk',
  'kprrrrrpppppppPk',
  'kpqqqqqqqqqqqqPk',
  'kpqqqqqqqqpppPPk',
  'kkkkkkkkkkkkkkkk',
])

export const DROP_ARROW = sprite([
  '.kkkkk.',
  '.kyyyk.',
  'kkyyykk',
  '.kyyyk.',
  '..kyk..',
  '...k...',
])

const WALKER_TOP = [
  '...zzz...', '..zzzzz..', '..zzzzz..', '...zzz...', '...zzz...', '.zzzzzzz.', 'zzzzzzzzz', 'zzzzzzzzz',
  'zzzzzzzzz', 'zzzzzzzzz', 'z.zzzzz.z', 'z.zzzzz.z', 'z.zzzzz.z', '..zzzzz..', '..zzzzz..',
]
export const WALKER = [
  sprite([...WALKER_TOP, '..zz.zz..', '..zz.zz..', '.zz...zz.', '.zz...zz.', '.zz...zz.', 'zz.....zz', 'zz.....zz', 'zz.....zz', 'zzz...zzz']),
  sprite([...WALKER_TOP, '..zz.zz..', '..zz.zz..', '..zz.zz..', '...zzz...', '...zzz...', '...zzz...', '...zzz...', '...zzz...', '..zzzzz..']),
]

export function drawTray(b: IndexBuffer) {
  b.rect(TRAY.x, TRAY.y, TRAY.w, TRAY.h, IDX.outline)
  b.rect(TRAY.x + 1, TRAY.y + 1, TRAY.w - 2, TRAY.h - 2, IDX.standFrame)
  b.rect(TRAY.x + 2, TRAY.y + 2, TRAY.w - 4, TRAY.h - 4, IDX.standFrameShade)
  b.rect(TRAY.x + 1, TRAY.y + TRAY.h - 2, TRAY.w - 2, 1, IDX.standFrame)
}

/** The stand's screen. Animated when ambient is on, otherwise a still chart. */
export function drawScreen(b: IndexBuffer, t: number, animate: boolean) {
  b.rect(SCREEN.x, SCREEN.y, SCREEN.w, SCREEN.h, IDX.screen)
  const step = animate ? Math.floor(t / 1600) : 0
  for (let i = 0; i < 4; i++) {
    const h = 4 + ((i * 7 + step * (i + 3)) % 11)
    b.rect(SCREEN.x + 4 + i * 7, SCREEN.y + SCREEN.h - 4 - h, 4, h, IDX.screenLit)
  }
  b.rect(SCREEN.x + 2, SCREEN.y + SCREEN.h - 3, SCREEN.w - 4, 1, IDX.ink)
  if (!animate || Math.floor(t / 500) % 2 === 0) b.rect(SCREEN.x + 3, SCREEN.y + 2, 3, 2, IDX.screenLit)
}
