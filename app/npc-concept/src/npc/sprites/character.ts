// The credit agent, drawn as palette-indexed layers. Original character:
// a chunky pixel businessman. Short neat hair, navy suit, white shirt, red tie,
// a small staff name badge. Big head, bold 1px outline, flat colours with one shade.
// Coordinates are local to the 64x72 character box (see ART-GUIDE.md).
import { IDX } from '../palette'
import { flipX, IndexBuffer, sprite, transpose, type Sprite } from '../raster'

/** Draw a sprite with code (for larger, mostly geometric parts). Still palette indices only. */
function drawn(w: number, h: number, draw: (b: IndexBuffer) => void): Sprite {
  const b = new IndexBuffer(w, h)
  draw(b)
  return { w, h, px: b.px }
}

/** Turn every filled pixel that touches an empty one (or the edge) into the outline colour. */
function outlineShape(b: IndexBuffer, idx: number) {
  const src = b.px.slice()
  const empty = (x: number, y: number) => x < 0 || y < 0 || x >= b.w || y >= b.h || src[y * b.w + x] === 0
  for (let y = 0; y < b.h; y++) {
    for (let x = 0; x < b.w; x++) {
      if (!src[y * b.w + x]) continue
      if (empty(x - 1, y) || empty(x + 1, y) || empty(x, y - 1) || empty(x, y + 1)) b.px[y * b.w + x] = idx
    }
  }
}

// ---------- head (24x26) at local (20, 0) ----------
// Hair cap rows 0-6, hairline row 7, forehead 8-11, eyes 13-15, nose 16-17, mouth 19-22, chin 25.
export const HEAD_POS = { x: 20, y: 0 }
const s = (n: number) => 's'.repeat(n)
export const HEAD = sprite([
  '........kkkkkkkk........',
  '.....kkkhhhhhhhhkkk.....',
  '....khhhhHHHHhhhhhhk....',
  '...khhHHhhhhhhhhhhhhk...',
  '..khhhhhhhhhhhhhhhhhhk..',
  '..khhhhhhhhhhhhhhhhhhk..',
  '.khhhhhhhhhhhhhhhhhhhhk.',
  '.khhhhhh' + s(10) + 'hhhhk.',
  '.khhh' + s(16) + 'hk.',
  '.khh' + s(17) + 'hk.',
  '.khh' + s(17) + 'hk.',
  '.kh' + s(18) + 'hk.',
  'kkh' + s(18) + 'hkk',
  'kS' + s(20) + 'Sk',
  'kS' + s(20) + 'Sk',
  'k' + s(22) + 'k',
  '.k' + s(10) + 'S' + s(9) + 'k.',
  '..k' + s(8) + 'SS' + s(8) + 'k..',
  '..k' + s(18) + 'k..',
  '..k' + s(18) + 'k..',
  '..k' + s(18) + 'k..',
  '..kS' + s(16) + 'Sk..',
  '...kS' + s(14) + 'Sk...',
  '....kS' + s(12) + 'Sk....',
  '.....kk' + s(10) + 'kk.....',
  '.......kkkkkkkkkk.......',
])

// ---------- eyes (12x5) drawn at head (6, 12); left eye at x1-2, right eye at x9-10 ----------
export const EYES_POS = { x: 6, y: 12 }
export const EYES = {
  open: sprite(['............', '.oe......oe.', '.ee......ee.', '.ee......ee.', '............']),
  left: sprite(['............', 'oe......oe..', 'ee......ee..', 'ee......ee..', '............']),
  right: sprite(['............', '..oe......oe', '..ee......ee', '..ee......ee', '............']),
  down: sprite(['............', '.SS......SS.', '.ee......ee.', '.ee......ee.', '............']),
  'down-left': sprite(['............', 'SS......SS..', 'ee......ee..', 'ee......ee..', '............']),
  'down-right': sprite(['............', '..SS......SS', '..ee......ee', '..ee......ee', '............']),
  up: sprite(['.oe......oe.', '.ee......ee.', '.ee......ee.', '............', '............']),
  'up-right': sprite(['..oe......oe', '..ee......ee', '..ee......ee', '............', '............']),
  half: sprite(['............', '............', '.SS......SS.', '.ee......ee.', '............']),
  closed: sprite(['............', '............', '............', 'eeee....eeee', '............']),
  // emote variants of 'open'
  warm: sprite(['............', '.oe......oe.', '.ee......ee.', '.SS......SS.', '............']),
  soft: sprite(['............', '.SS......SS.', '.oe......oe.', '.ee......ee.', '............']),
  happy: sprite(['............', '.ee......ee.', 'e..e....e..e', '............', '............']),
} satisfies Record<string, Sprite>
export type EyeKey = keyof typeof EYES

// ---------- eyebrows (12x3) drawn at head (6, 9); 2px thick, 4 wide over each eye ----------
export const BROWS_POS = { x: 6, y: 9 }
export const BROWS = {
  neutral: sprite(['............', 'hhhh....hhhh', 'hhhh....hhhh']),
  raised: sprite(['hhhh....hhhh', 'hhhh....hhhh', '............']),
  warm: sprite(['............', '.hhh....hhh.', 'hh.h....h.hh']),
  pleased: sprite(['.hhh....hhh.', 'hh.h....h.hh', '............']),
  concerned: sprite(['..hh....hh..', 'hhh......hhh', 'h..........h']),
  quizzical: sprite(['hhhh........', 'hhhh....hhhh', '........hhhh']),
} satisfies Record<string, Sprite>
export type BrowKey = keyof typeof BROWS

// ---------- mouth (8x4) drawn at head (8, 19) ----------
// Rest mouths per emote plus the talking frames: closed (the rest mouth), small, open, wide.
export const MOUTH_POS = { x: 8, y: 19 }
export const MOUTHS = {
  flat: sprite(['........', '..mmmm..', '........', '........']),
  smile: sprite(['........', '.m....m.', '..mmmm..', '........']),
  frown: sprite(['........', '..mmmm..', '.m....m.', '........']),
  grin: sprite(['.mmmmmm.', '.mwwwwm.', '..mnnm..', '...mm...']),
  small: sprite(['........', '..mmmm..', '..mnnm..', '...mm...']),
  smallSmile: sprite(['........', '.m....m.', '.mmnnmm.', '..mmmm..']),
  open: sprite(['..mmmm..', '.mnnnnm.', '.mnnnnm.', '..mmmm..']),
  wide: sprite(['.mmmmmm.', 'mwwwwwwm', 'mnnnnnnm', '.mmmmmm.']),
} satisfies Record<string, Sprite>
export type MouthKey = keyof typeof MOUTHS

// ---------- glasses (22x5) drawn at head (1, 12), coach mode: thin dark reading frames ----------
export const GLASSES_POS = { x: 1, y: 12 }
export const GLASSES = sprite([
  '....kkkkkk..kkkkkk....',
  'kkkkk....kkkk....kkkkk',
  '....k....k..k....k....',
  '....k....k..k....k....',
  '....kkkkkk..kkkkkk....',
])

// ---------- torso (40x48) at local (12, 24); counter hides it from torso y 40 ----------
export const TORSO_POS = { x: 12, y: 24 }
export const TORSO = drawn(40, 48, (b) => {
  const K = IDX.outline
  // suit: rounded shoulders, slight taper, bold outline
  const edge = (y: number) => (y === 4 ? 9 : y === 5 ? 5 : y === 6 ? 3 : y === 7 ? 2 : y < 30 ? 1 : 2)
  for (let y = 4; y < 48; y++) for (let x = edge(y); x <= 39 - edge(y); x++) b.dot(x, y, IDX.uniform)
  outlineShape(b, K)
  for (let y = 8; y < 47; y++) b.dot(38 - edge(y), y, IDX.uniformShade)
  // shirt V with a dark edge and lapel shade
  for (let y = 4; y <= 22; y++) {
    const l = 13 + Math.floor((y - 4) / 3)
    const r = 39 - l
    b.rect(l, y, r - l + 1, 1, IDX.shirt)
    b.dot(l - 1, y, K)
    b.dot(r + 1, y, K)
    b.rect(l - 3, y, 2, 1, IDX.uniformShade)
    b.rect(r + 2, y, 2, 1, IDX.uniformShade)
  }
  // collar top and neck
  b.rect(12, 3, 16, 1, K)
  b.rect(16, 0, 8, 4, IDX.skin)
  b.rect(17, 0, 6, 2, IDX.skinShade)
  b.rect(16, 0, 1, 4, K)
  b.rect(23, 0, 1, 4, K)
  // tie: knot, shade under the knot, blade with one shade column
  b.rect(17, 4, 6, 5, K)
  b.rect(18, 5, 4, 3, IDX.red)
  b.rect(18, 8, 4, 1, IDX.redShade)
  for (let y = 9; y <= 22; y++) {
    b.dot(17, y, K)
    b.dot(22, y, K)
    b.rect(18, y, 4, 1, IDX.red)
    b.dot(21, y, IDX.redShade)
  }
  // jacket closure and buttons below the V
  for (let y = 23; y < 48; y++) b.dot(20, y, IDX.uniformShade)
  b.rect(19, 28, 2, 1, K)
  b.rect(19, 35, 2, 1, K)
  // name badge on the chest (white plate, red bar, grey name line)
  b.rect(27, 16, 7, 5, K)
  b.rect(28, 17, 5, 1, IDX.red)
  b.rect(28, 18, 5, 2, IDX.shirt)
  b.rect(29, 18, 3, 1, IDX.ink)
})

// Shoulder joints (local coords), arms hang from here.
export const SHOULDER_L = { x: 17, y: 31 }
export const SHOULDER_R = { x: 46, y: 31 }

// ---------- hands (anchored at their centre) ----------
const rest = sprite(['.kkkkkk.', 'kssssssk', 'kssssssk', 'kSsSsSsk', 'kssssssk', '.kkkkkk.'])
const grip = sprite(['.kkkkk.', 'ksssssk', 'kSsSsSk', 'ksssssk', 'kSsSsSk', 'ksssssk', '.kkkkk.'])
// open hand, palm out: three spread fingers and a thumb, so a wave reads as a wave
const open = sprite([
  '.kk.kk.kk..',
  'kssksskssk.',
  'kssksskssk.',
  'kssksskssk.',
  'ksssssssskk',
  'kssssssssSk',
  'kssssssssk.',
  '.kSssssssk.',
  '..kkkkkkk..',
])
const pointDown = sprite([
  '.kkkkk.',
  'ksssssk',
  'ksssssk',
  'kSsSsSk',
  '.kksssk',
  '..kssk.',
  '..kssk.',
  '..kssk.',
  '..kssk.',
  '...kk..',
])
const flat = sprite(['.kkkkkkk.', 'ksssssssk', 'kSsssssSk', '.kkkkkkk.'])
export const HANDS = {
  rest,
  grip,
  open,
  openL: flipX(open),
  pointDown,
  pointRight: transpose(pointDown),
  flat,
} satisfies Record<string, Sprite>
export type HandKey = keyof typeof HANDS

/** A sheet of paper with grey text lines. */
function page(w: number, h: number, lines: number[]): Sprite {
  return drawn(w, h, (b) => {
    b.rect(0, 0, w, h, IDX.outline)
    b.rect(1, 1, w - 2, h - 2, IDX.paper)
    b.rect(1, h - 2, w - 2, 1, IDX.paperShade)
    lines.forEach((len, i) => b.rect(2, 2 + i * 2, Math.min(len, w - 4), 1, IDX.ink))
  })
}

// ---------- held items (anchored at their top-left, local coords given by the pose) ----------
export const ITEMS = {
  /** Folded document in one hand. */
  docSmall: page(10, 12, [5, 6, 6, 4]),
  /** Document held up with both hands for reading. */
  docHeld: page(24, 18, [12, 20, 16, 20, 18, 11, 20]),
  /** Coach mode: a red planner with a white label and page edges. */
  planner: drawn(13, 15, (b) => {
    b.rect(0, 0, 13, 15, IDX.outline)
    b.rect(1, 1, 10, 13, IDX.red)
    b.rect(1, 1, 2, 13, IDX.redShade)
    b.rect(11, 1, 1, 13, IDX.paper)
    b.rect(4, 4, 6, 3, IDX.shirt)
    b.rect(5, 5, 4, 1, IDX.ink)
  }),
} satisfies Record<string, Sprite>
export type ItemKey = keyof typeof ITEMS

/** Thinking bubble (drawn in scene coords next to the head). */
export const BUBBLE = drawn(22, 13, (b) => {
  b.rect(1, 0, 20, 10, IDX.outline)
  b.rect(0, 1, 22, 8, IDX.outline)
  b.rect(1, 1, 20, 8, IDX.shirt)
  b.rect(2, 10, 3, 2, IDX.outline)
  b.dot(3, 10, IDX.shirt)
  b.rect(0, 12, 2, 1, IDX.outline)
})
