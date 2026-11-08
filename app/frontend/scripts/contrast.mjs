// WCAG 2.2 contrast for every colour pair the UI uses, in each colour mode. Reads the tokens from
// src/index.css (standard :root, then the okabe and contrast overrides). Exits 1 if any pair fails.
//   node scripts/contrast.mjs
import { readFileSync } from 'node:fs'

const css = readFileSync(new URL('../src/index.css', import.meta.url), 'utf8')
// every block with this exact selector, merged in order (118: the PWA's safe-area :root block comes before the
// colour tokens' :root block, so reading only the first found no colours at all)
const block = (sel) => {
  const out = {}
  let i = css.indexOf(`\n${sel} {`)
  if (i < 0) throw new Error(`no ${sel} block`)
  while (i >= 0) {
    const body = css.slice(i, css.indexOf('}', i))
    for (const m of body.matchAll(/--([\w-]+):\s*(#[0-9a-fA-F]{6})/g)) out[m[1]] = m[2]
    i = css.indexOf(`\n${sel} {`, i + 1)
  }
  return out
}
const standard = block(':root')
const modes = {
  standard,
  okabe: { ...standard, ...block(":root[data-colour='okabe']") },
  contrast: { ...standard, ...block(":root[data-colour='contrast']") },
}

const lum = (hex) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
const ratio = (a, b) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p)
  return (x + 0.05) / (y + 0.05)
}

// [foreground, background, needed, where]
const PAIRS = [
  ['text', 'panel', 4.5, 'dialogue text, chips, buttons'],
  ['text', 'page', 4.5, 'history, page text'],
  ['muted', 'page', 4.5, 'history lines, footer, dock status'],
  ['muted', 'panel', 4.5, 'Explain label, placeholders'],
  ['muted', 'panel-deep', 4.5, 'reply placeholder'],
  ['text', 'panel-deep', 4.5, 'reply text'],
  ['text', 'you-bg', 4.5, 'your replies'],
  ['accent-text', 'accent', 4.5, 'name tag, primary buttons'],
  ['ink', 'paper', 4.5, 'cards and sheets'],
  ['ink-muted', 'paper', 4.5, 'card tags, notes'],
  ['ink', 'paper-shade', 4.5, 'evidence chips, persona buttons'],
  ['ink-muted', 'paper-shade', 4.5, 'persona blurbs, QuickCheck note'],
  ['link', 'paper', 4.5, 'source links'],
  ['bad-ink', 'bad-bg', 4.5, '"Needs work" pill'],
  ['warn-ink', 'warn-bg', 4.5, '"Fair" pill'],
  ['good-ink', 'good-bg', 4.5, '"Good" pill, what-if gain'],
  ['bad-ink', 'paper', 4.5, 'step date, risk label'],
  ['paper', 'ink', 4.5, 'ink buttons, chosen settings'],
  ['focus', 'page', 3, 'focus ring on the page'],
  ['focus', 'panel', 3, 'focus ring on the dialogue'],
  ['focus', 'halo', 3, 'focus ring on its halo (over paper and the scene)'],
  ['halo', 'paper', 3, 'focus halo against paper'],
  ['chart-a', 'paper', 3, 'chosen plan line'],
  ['chart-b', 'paper', 3, 'other plan hatch and line'],
  ['risk', 'paper', 3, 'missed-payment line'],
  ['bad-edge', 'paper', 3, 'pill border'],
  ['edge', 'page', 3, 'dialogue and button borders'],
]

let fails = 0
for (const [mode, t] of Object.entries(modes)) {
  console.log(`\n${mode}`)
  for (const [fg, bg, need, where] of PAIRS) {
    if (!t[fg] || !t[bg]) {
      console.log(`  ?? ${fg} on ${bg}: token missing`)
      fails++
      continue
    }
    // in high contrast some pairs are the same colour on purpose (e.g. ink buttons are black boxes with white text)
    const r = ratio(t[fg], t[bg])
    const ok = r >= need
    if (!ok) fails++
    console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${r.toFixed(2).padStart(5)}:1 (need ${need}) ${fg} ${t[fg]} on ${bg} ${t[bg]}  ${where}`)
  }
}
console.log(fails ? `\n${fails} pair(s) fail` : '\nall pairs pass')
process.exit(fails ? 1 : 0)
