// The credit agent, drawn as palette-indexed layers. Original character:
// short side-swept hair, navy blazer, red lanyard with a staff badge.
// Coordinates are local to the 48x64 character box (see ART-GUIDE.md).
import { flipX, sprite, transpose, type Sprite } from '../raster'

// ---------- head (20x22) at local (14, 0) ----------
export const HEAD_POS = { x: 14, y: 0 }
export const HEAD = sprite([
  '......kkkkkkkk......',
  '....kkhhhhhhhhkk....',
  '...khhhhhhhhhhhhk...',
  '..khhhhhhhhhHHhhhk..',
  '..khhhhhhhhHHhhhhk..',
  '.khhhhhhhhhhhhhhhhk.',
  '.khhhhhhhhhhhhhhhhk.',
  '.khhhhhhhhhhhhhhhhk.',
  '.khhhhhhhhhssssshhk.',
  '.khhhhhssssssssshhk.',
  '.khhsssssssssssshhk.',
  'kshsssssssssssssshsk',
  'kSssssssssssssssssSk',
  'kssssssssssssssssssk',
  '.kssssssssssssssssk.',
  '.kssssssssssssssssk.',
  '.ksssssssSssssssssk.',
  '..kssssssssssssssk..',
  '..kSssssssssssssSk..',
  '...kSssssssssssSk...',
  '....kkSssssssSkk....',
  '......kkkkkkkk......',
])

// ---------- eyes (12x5) drawn at head (4, 12) ----------
export const EYES_POS = { x: 4, y: 12 }
const E = (rows: string[]) => sprite(rows)
export const EYES = {
  open: E(['............', '.oe......oe.', '.ee......ee.', '.ee......ee.', '............']),
  left: E(['............', 'oe......oe..', 'ee......ee..', 'ee......ee..', '............']),
  right: E(['............', '..oe......oe', '..ee......ee', '..ee......ee', '............']),
  down: E(['............', '.SS......SS.', '.ee......ee.', '.ee......ee.', '............']),
  'down-left': E(['............', 'SS......SS..', 'ee......ee..', 'ee......ee..', '............']),
  'down-right': E(['............', '..SS......SS', '..ee......ee', '..ee......ee', '............']),
  up: E(['.oe......oe.', '.ee......ee.', '.ee......ee.', '............', '............']),
  'up-right': E(['..oe......oe', '..ee......ee', '..ee......ee', '............', '............']),
  half: E(['............', '.SS......SS.', '.ee......ee.', '.ee......ee.', '............']),
  // lid fully down: skin-shade rows and a lash line
  closed: E(['............', '.SS......SS.', '.SS......SS.', '.ee......ee.', '............']),
} satisfies Record<string, Sprite>
export type EyeKey = keyof typeof EYES

// ---------- eyebrows (12x3) drawn at head (4, 9) ----------
export const BROWS_POS = { x: 4, y: 9 }
const B = (rows: string[]) => sprite(rows)
export const BROWS = {
  neutral: B(['............', '............', 'hhh......hhh']),
  raised: B(['............', 'hhh......hhh', '............']),
  warm: B(['............', '.h........h.', 'h.h......h.h']),
  pleased: B(['............', '.hh......hh.', 'h..h....h..h']),
  concerned: B(['............', '..h......h..', 'hh........hh']),
  quizzical: B(['............', 'hhh.........', '.........hhh']),
} satisfies Record<string, Sprite>
export type BrowKey = keyof typeof BROWS

// ---------- mouth (6x3) drawn at head (7, 17) ----------
export const MOUTH_POS = { x: 7, y: 17 }
const M = (rows: string[]) => sprite(rows)
export const MOUTHS = {
  neutral: M(['......', '..mm..', '......']),
  smile: M(['......', '.m..m.', '..mm..']),
  bigSmile: M(['m....m', '.mmmm.', '......']),
  concerned: M(['......', '..mm..', '.m..m.']),
  talk1: M(['......', '.mmmm.', '..mm..']),
  talk2: M(['.mmmm.', '.mnnm.', '..mm..']),
  talkSmall: M(['......', '..mm..', '..mm..']),
  talkSmile: M(['m....m', '.mnnm.', '..mm..']),
} satisfies Record<string, Sprite>
export type MouthKey = keyof typeof MOUTHS

// ---------- glasses (14x5) drawn at head (3, 12), coach mode ----------
export const GLASSES_POS = { x: 3, y: 12 }
export const GLASSES = sprite([
  '.rrrr....rrrr.',
  'rr..rrrrrr..rr',
  '.r..r....r..r.',
  '.r..r....r..r.',
  '.rrrr....rrrr.',
])

// ---------- torso (28x43) at local (10, 21) ----------
export const TORSO_POS = { x: 10, y: 21 }
const blazer = '.kuuuuuuuuuuuUuuuuuuuuuuUUk.'
const button = '.kuuuuuuuuuuuvuuuuuuuuuuUUk.'
const belt = '.kUUUUUUUUUUUUUUUUUUUUUUUUk.'
const legs = '.kUUUUUUUUUUUkkUUUUUUUUUUUk.'
export const TORSO = sprite([
  '...........kSSSSk...........',
  '...........kssssk...........',
  '...........kssssk...........',
  '....kkkkkkwwsssswwkkkkkk....',
  '..kuuuuuuurwwsswwruuuuuuuk..',
  '.kuuuuuuuuurwwwwruuuuuuuuuk.',
  '.kuuuuuuuuuurwwruuuuuuuuuuk.',
  '.kuuuuuuuuuuurruuuuuuuuuuuk.',
  '.kuuuuuuuuuuuRRuuuuuuuuuuuk.',
  '.kuuuuuuuukkkkkkkkuuuuuuuuk.',
  '.kuuuuuuuukrrrrrrkuuuuuuuuk.',
  '.kuuuuuuuukwwwwwwkuuuuuuuuk.',
  '.kuuuuuuuukwqqqqwkuuuuuuuuk.',
  '.kuuuuuuuukwwwwwwkuuuuuuuuk.',
  '.kuuuuuuuukwqqqwwkuuuuuuuuk.',
  '.kuuuuuuuukkkkkkkkuuuuuuuuk.',
  blazer,
  blazer,
  button,
  blazer,
  blazer,
  blazer,
  button,
  blazer,
  belt,
  belt,
  ...Array.from({ length: 17 }, () => legs),
])

// Shoulder joints (local coords), arms hang from here.
export const SHOULDER_L = { x: 14, y: 27 }
export const SHOULDER_R = { x: 33, y: 27 }

// ---------- hands (anchored at their centre) ----------
const rest = sprite(['.kkk.', 'ksssk', 'ksSsk', '.kkk.'])
const grip = sprite(['.kkk.', 'kSssk', 'ksssk', 'ksSsk', '.kkk.'])
const open = sprite(['.kkk..', 'ksssk.', 'kssskk', 'ksssSk', 'kSsssk', '.kkkk.'])
const pointDown = sprite(['.kkk.', 'ksssk', 'ksssk', 'kSsSk', '.ksk.', '.ksk.', '..k..'])
const flat = sprite(['.kkkk.', 'ksssSk', '.kkkk.'])
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

// ---------- held items (anchored at their top-left, local coords given by the pose) ----------
export const ITEMS = {
  /** Folded document in one hand. */
  docSmall: sprite([
    'kkkkkkk.',
    'kpppppkk',
    'kpqqqpPk',
    'kpppppPk',
    'kpqqqqpk',
    'kpppppPk',
    'kpqqqppk',
    'kpppppPk',
    'kPPPPPPk',
    'kkkkkkkk',
  ]),
  /** Document held up with both hands for reading. */
  docHeld: sprite([
    'kkkkkkkkkkkkkk',
    'kppppppppppppk',
    'kpqqqqqqqppppk',
    'kppppppppppppk',
    'kpqqqqqqqqqqpk',
    'kpqqqqqqqqpppk',
    'kppppppppppppk',
    'kpqqqqqqqqqqpk',
    'kpqqqqqqqqqqpk',
    'kpqqqqqqpppppk',
    'kppppppppppppk',
    'kpqqqqqqqqqqpk',
    'kpqqqqqpppppPk',
    'kppppppppppPPk',
    'kPPPPPPPPPPPPk',
    'kkkkkkkkkkkkkk',
  ]),
  /** Coach mode: a closed red planner with a label and page edges. */
  planner: sprite([
    'kkkkkkkkkk',
    'krrrrrrrwk',
    'krrrrrrrwk',
    'krwwwwrrwk',
    'krrrrrrrwk',
    'krrrrrrrwk',
    'kRrrrrrrwk',
    'kRrrrrrrwk',
    'kRRRRRRRwk',
    'kkkkkkkkkk',
  ]),
} satisfies Record<string, Sprite>
export type ItemKey = keyof typeof ITEMS

/** Thinking bubble (drawn in scene coords next to the head). */
export const BUBBLE = sprite([
  '.kkkkkkkkkkkkkkkk.',
  'kwwwwwwwwwwwwwwwwk',
  'kwwwwwwwwwwwwwwwwk',
  'kwwwwwwwwwwwwwwwwk',
  'kwwwwwwwwwwwwwwwwk',
  'kwwwwwwwwwwwwwwwwk',
  '.kkkkkkkkkkkkkkkk.',
  '.kwk..............',
  'kwk...............',
  'kk................',
])
