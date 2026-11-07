// 115: small pixel icons for the big opening and goals chips. Each one sits next to the chip's words, so
// nothing depends on the icon (or its colour) alone. Drawn on a 9x9 grid, '#' is a filled pixel.
type IconKey = 'letter' | 'report' | 'ready' | 'new' | 'target' | 'card' | 'car' | 'home' | 'other' | 'calendar' | 'next'

const ART: Record<IconKey, string[]> = {
  letter: ['.........', '#########', '##.....##', '#.#...#.#', '#..#.#..#', '#...#...#', '#.......#', '#########', '.........'],
  report: ['.######..', '.#....##.', '.#.##..#.', '.#.....#.', '.#.###.#.', '.#.....#.', '.#.###.#.', '.#.....#.', '.#######.'],
  ready: ['.........', '........#', '.......##', '#.....##.', '##...##..', '.##.##...', '..###....', '...#.....', '.........'],
  new: ['......##.', '.....####', '.##..###.', '####.##..', '.####....', '....#....', '....#....', '..#####..', '...###...'],
  target: ['..#####..', '.#.....#.', '#..###..#', '#.#...#.#', '#.#.#.#.#', '#.#...#.#', '#..###..#', '.#.....#.', '..#####..'],
  card: ['.........', '#########', '#########', '#.......#', '#.......#', '#.###...#', '#.......#', '#########', '.........'],
  car: ['.........', '..#####..', '.#..#..#.', '#########', '##.###.##', '#########', '.##...##.', '.##...##.', '.........'],
  home: ['....#....', '...###...', '..##.##..', '.##...##.', '##.....##', '.#.....#.', '.#..##.#.', '.#..##.#.', '.#######.'],
  other: ['.........', '#########', '#.......#', '#.#.#.#.#', '#.......#', '#########', '..##.....', '.#.......', '.........'],
  calendar: ['.#.....#.', '#########', '#########', '#.......#', '#.#.#.#.#', '#.......#', '#.#.#.#.#', '#.......#', '#########'],
  next: ['.........', '....#....', '....##...', '#######..', '########.', '#######..', '....##...', '....#....', '.........'],
}

/** One path of 1x1 runs per row, so the icon stays on the pixel grid at any size. */
const PATHS = Object.fromEntries(
  (Object.keys(ART) as IconKey[]).map((k) => {
    let d = ''
    ART[k].forEach((row, y) => {
      for (const m of row.matchAll(/#+/g)) d += `M${m.index} ${y}h${m[0].length}v1H${m.index}z`
    })
    return [k, d]
  }),
) as Record<IconKey, string>

const EXACT: Record<string, IconKey> = {
  "i've been declined already": 'letter',
  "i've got a credit report i want help with": 'report',
  'i want to get ready before i apply': 'ready',
  "i'm new to credit or new to the uk": 'new',
  'a target score': 'target',
  'a specific card': 'card',
  'car finance': 'car',
  'a loan or car finance': 'car',
  'a mortgage': 'home',
  'something else': 'other',
}

export function chipIcon(chip: string): IconKey {
  const t = chip.trim().toLowerCase().replace(/[‘’]/g, "'")
  const exact = EXACT[t]
  if (exact) return exact
  if (/\bcard\b|classic|balance transfer|0% purchase/.test(t)) return 'card'
  if (/^\d{3}\b/.test(t) || /\bscore\b/.test(t)) return 'target'
  if (/\bmonths?\b|\byears?\b/.test(t)) return 'calendar'
  if (/\bmortgage\b|\bhome\b/.test(t)) return 'home'
  if (/\bcar\b|\bloan\b/.test(t)) return 'car'
  if (/\bdeclined?\b|\bletter\b/.test(t)) return 'letter'
  if (/\breport\b/.test(t)) return 'report'
  return 'next'
}

export function ChipIcon({ chip }: { chip: string }) {
  return (
    <span className="chip__icon" aria-hidden="true" data-icon={chipIcon(chip)}>
      <svg viewBox="0 0 9 9" shapeRendering="crispEdges" fill="currentColor">
        <path d={PATHS[chipIcon(chip)]} />
      </svg>
    </span>
  )
}
