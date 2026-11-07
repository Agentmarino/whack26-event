// One palette for the whole scene. Sprites store palette indices, never colours,
// so recolouring (e.g. the uniform) is a change to this file only.
// Each entry: [char used in sprite strings, name, hex]. '.' is always transparent.

export const PALETTE_DEF = [
  // character
  ['k', 'outline', '#15131c'],
  ['s', 'skin', '#e0a47a'],
  ['S', 'skinShade', '#b9774f'],
  ['h', 'hair', '#3b2a22'],
  ['H', 'hairLight', '#6e4c38'],
  ['e', 'eye', '#211a22'],
  ['o', 'eyeLight', '#ffffff'],
  ['m', 'mouth', '#6a2c2a'],
  ['n', 'mouthInner', '#b5524c'],
  ['u', 'uniform', '#1d4b7e'], // Capital One navy (approximation, swap for the official value)
  ['U', 'uniformShade', '#122f55'],
  ['v', 'uniformLight', '#2e65a0'],
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
  ['b', 'counterTop', '#e6e1d7'],
  ['B', 'counterTopShade', '#bfb6a6'],
  ['x', 'screen', '#0d2131'],
  ['X', 'screenLit', '#5fc3e8'],
  ['z', 'silhouette', '#0d1119'],
  ['i', 'boothA', '#2d3b35'],
  ['I', 'boothB', '#3b2f3d'],
  ['j', 'plant', '#3f7a4a'],
  ['J', 'plantShade', '#2a5534'],
  ['K', 'pot', '#7b5a44'],
  ['N', 'standPanel', '#06375a'],
  ['M', 'brandNavy', '#004977'], // stand and counter navy, separate from the uniform
  ['L', 'brandNavyShade', '#00304f'],
  ['V', 'brandNavyLight', '#2a6f9c'],
  // ---- 110: character detail ----
  ['1', 'skinLight', '#f0c39c'],
  ['2', 'blush', '#e98a76'],
  ['3', 'stubble', '#b98c6e'],
  ['4', 'redLight', '#ef6a5c'],
  ['5', 'counterTopLight', '#f8f6f1'],
  ['6', 'keyboard', '#4a5260'],
  ['7', 'keyboardKey', '#8e97a6'],
  ['8', 'mug', '#d03027'],
  ['9', 'leaf', '#5b9a5a'],
  ['0', 'leafShade', '#3c7445'],
  // ---- 110: office behind the glass (cool, low contrast; the evening variant swaps these values) ----
  ['D', 'skyTop', '#a9c8dc'],
  ['E', 'skyLow', '#c3dae7'],
  ['O', 'cityFar', '#8eabc1'],
  ['Q', 'cityNear', '#7895ae'],
  ['T', 'cityWindow', '#a4bfd2'],
  ['Z', 'officeWall', '#c9d2da'],
  ['!', 'officeWallShade', '#b3bec9'],
  ['@', 'ceiling', '#dde3e8'],
  ['#', 'ceilingLight', '#f7fafc'],
  ['$', 'officeFloor', '#a3afbb'],
  ['%', 'deskBack', '#b9c3cc'],
  ['^', 'deskBackShade', '#97a3b0'],
  ['&', 'monitorBack', '#5d6878'],
  ['*', 'monitorBackLit', '#9fbcd2'],
  ['+', 'colleagueSkin', '#c9a08a'],
  ['=', 'colleagueHair', '#6b5a55'],
  ['~', 'colleagueTopA', '#7f8ea3'],
  ['-', 'colleagueTopB', '#a08595'],
  ['_', 'officePlant', '#7ba38a'],
  [':', 'officePlantShade', '#62897a'],
  [';', 'officePot', '#a6a09c'],
  ['<', 'glassFrame', '#2b3442'],
  ['>', 'glassFrameLight', '#56637a'],
  ['?', 'frosted', '#e4ebf1'],
  ['/', 'frostedLine', '#d2dce5'],
  ['|', 'shine', '#e9f1f7'],
  ['{', 'skyShine', '#d3e5f0'],
  ['`', 'skyLowShine', '#dceaf2'],
  ['}', 'cityShine', '#a7c1d4'],
  ['[', 'wallShine', '#dbe2e8'],
  [']', 'screenWhite', '#ffffff'],
  [',', 'bezel', '#22262e'],
  ['"', 'bezelLight', '#3a404b'],
] as const

export type ColorName = (typeof PALETTE_DEF)[number][1]

/**
 * Background variants: the office behind the glass is drawn once with the office* entries above;
 * a variant only swaps their values. 'day' is the default (the values above).
 */
export const BACKGROUNDS = {
  day: {},
  evening: {
    skyTop: '#3e5276', skyLow: '#df9f74', skyShine: '#5a6d90', skyLowShine: '#e8b48f',
    cityFar: '#5a6380', cityNear: '#464e68', cityWindow: '#f2c46e', cityShine: '#6b7591',
    officeWall: '#c4b8ac', officeWallShade: '#ab9f95', wallShine: '#d3c9be', ceiling: '#d2c7bb', ceilingLight: '#ffe8b5',
    officeFloor: '#9d9189', deskBack: '#b6aa9f', deskBackShade: '#958980', monitorBack: '#56606e', monitorBackLit: '#e9cc92',
    colleagueSkin: '#c59b83', colleagueHair: '#5d4b46', colleagueTopA: '#7b8398', colleagueTopB: '#9c7f87',
    officePlant: '#7d9a77', officePlantShade: '#607e62', officePot: '#a2978e', frosted: '#eee4d8', frostedLine: '#dcd0c3', shine: '#f4ebe1',
  },
} as const satisfies Record<string, Partial<Record<ColorName, string>>>
export type Background = keyof typeof BACKGROUNDS
export const BACKGROUND_NAMES = Object.keys(BACKGROUNDS) as Background[]

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
