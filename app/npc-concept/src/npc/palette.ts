// One palette for the whole scene. Sprites store palette indices, never colours,
// so recolouring (e.g. the uniform) is a change to this file only.
// Each entry: [char used in sprite strings, name, hex]. '.' is always transparent.

export const PALETTE_DEF = [
  // character
  ['k', 'outline', '#15131c'],
  ['s', 'skin', '#c98d63'],
  ['S', 'skinShade', '#a06a46'],
  ['h', 'hair', '#2a1c17'],
  ['H', 'hairLight', '#4b3329'],
  ['e', 'eye', '#17121c'],
  ['o', 'eyeLight', '#ffffff'],
  ['m', 'mouth', '#5b2a29'],
  ['n', 'mouthInner', '#a9484a'],
  ['u', 'uniform', '#004977'], // Capital One navy (approximation, swap for the official value)
  ['U', 'uniformShade', '#00304f'],
  ['v', 'uniformLight', '#2a6f9c'],
  ['r', 'red', '#d03027'], // Capital One red (approximation)
  ['R', 'redShade', '#9a1f19'],
  ['w', 'shirt', '#f3f2ec'],
  ['W', 'shirtShade', '#c7c9cf'],
  ['q', 'ink', '#8a93a3'],
  ['p', 'paper', '#fbf8ee'],
  ['P', 'paperShade', '#dcd5c2'],
  ['c', 'calc', '#3a3f4b'],
  ['C', 'calcKey', '#aab2bf'],
  ['d', 'calcScreen', '#a5cf9f'],
  ['y', 'glow', '#ffd84d'],
  ['Y', 'glowSoft', '#fff1a8'],
  // scene
  ['a', 'hallWall', '#161c28'],
  ['A', 'hallWallLight', '#1e2635'],
  ['f', 'floor', '#262c3a'],
  ['F', 'floorLight', '#30374a'],
  ['t', 'truss', '#3b4354'],
  ['l', 'spot', '#ffe7a6'],
  ['g', 'standFrame', '#c9ced8'],
  ['G', 'standFrameShade', '#8a909c'],
  ['b', 'counterTop', '#d9d2c3'],
  ['B', 'counterTopShade', '#b3ab9a'],
  ['x', 'screen', '#0d2131'],
  ['X', 'screenLit', '#5fc3e8'],
  ['z', 'silhouette', '#0d1119'],
  ['i', 'boothA', '#2d3b35'],
  ['I', 'boothB', '#3b2f3d'],
  ['j', 'plant', '#3f7a4a'],
  ['J', 'plantShade', '#2a5534'],
  ['K', 'pot', '#7b5a44'],
  ['N', 'standPanel', '#06375a'],
] as const

export type ColorName = (typeof PALETTE_DEF)[number][1]

/** UI colours for the DOM parts (dialogue box, debug panel). Mirrored as CSS variables in npc.css. */
export const UI_COLORS = {
  uiBg: '#0b1d2e',
  uiBgDeep: '#06131f',
  uiText: '#f3f2ec',
  uiMuted: '#b9c3cf',
  uiAccent: '#d03027',
  uiFocus: '#ffd84d',
  pageBg: '#10141c',
} as const

/** char -> palette index (index 0 is transparent). */
export const CHAR_INDEX: Record<string, number> = { '.': 0 }
/** name -> palette index. */
export const IDX = {} as Record<ColorName, number>

PALETTE_DEF.forEach(([ch, name], i) => {
  CHAR_INDEX[ch] = i + 1
  IDX[name] = i + 1
})

function hexToABGR(hex: string): number {
  const n = parseInt(hex.slice(1), 16)
  const r = (n >> 16) & 255
  const g = (n >> 8) & 255
  const b = n & 255
  return ((255 << 24) | (b << 16) | (g << 8) | r) >>> 0
}

/** Build the 32-bit colour table used by the raster. Pass overrides to recolour, e.g. { uniform: '#1b5e20' }. */
export function buildColorTable(overrides: Partial<Record<ColorName, string>> = {}): Uint32Array {
  const table = new Uint32Array(PALETTE_DEF.length + 1)
  table[0] = 0
  PALETTE_DEF.forEach(([, name, hex], i) => {
    table[i + 1] = hexToABGR(overrides[name] ?? hex)
  })
  return table
}
