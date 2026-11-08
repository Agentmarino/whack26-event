// The demo script (deliverables/pitch/demo-script.md) as a walk: WebKit iPhone 15, Demo mode ON (it moves on by
// itself), Plain English ON (preset, as before judging), framing B. Taps exactly what the script taps, counts and
// times every beat, logs every line shown (118: each types out whole, the box scrolling; logged with its line count
// and how long it took to type), and reports requests to any other host (none expected offline).
//   env SPEED=2x: the text speed setting (default 1x, as on the phone).
//   node scripts/demo-walk.mjs [base] [outdir, default <tmp>/demo-walk] [framing]
//   base: the phone URL, e.g. http://$(ipconfig getifaddr en0):5173 (default http://127.0.0.1:5173)
//   env SKIP=steps,reasons,plan: the script's three Skip all taps (the 20-tap path). NOWHY=1: no Why? drawer.
//   The rehearsal: SKIP=steps,reasons,plan NOWHY=1 node scripts/demo-walk.mjs http://<ip>:5173
//   A PROBLEM line (or exit 1) means a beat failed or Demo mode did not hold where it should.
import { chromium, webkit, devices } from 'playwright'
import { mkdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
const [base = 'http://127.0.0.1:5173', out = join(tmpdir(), 'demo-walk'), framing = 'B'] = process.argv.slice(2)
mkdirSync(out, { recursive: true })
// 118: env DESKTOP=1 walks it in Chromium at 1440x900 instead of the iPhone
const desktop = !!process.env.DESKTOP
const browser = desktop ? await chromium.launch() : await webkit.launch()
const ctx = await browser.newContext(desktop ? { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 } : { ...devices['iPhone 15'] })
await ctx.addInitScript((speed) => {
  try { localStorage.setItem('whack26.settings.v1', JSON.stringify({ speed, demo: true, plainEnglish: true, textSize: 100, colour: 'standard', readAloud: false, voiceRate: 1, framing: 'B' })) } catch {}
}, process.env.SPEED || '1x')
const page = await ctx.newPage()
const problems = []
const external = []
const baseHost = new URL(base).host
page.on('request', (r) => { try { if (new URL(r.url()).host !== baseHost && !r.url().startsWith('data:') && !r.url().startsWith('blob:')) external.push(r.url()) } catch {} })
page.on('requestfailed', (r) => problems.push(`request failed: ${r.url()} ${r.failure()?.errorText}`))
page.on('console', (m) => m.type() === 'error' && problems.push(`console error: ${m.text()}`))
page.on('pageerror', (e) => problems.push(`page error: ${e.message}`))
const t00 = Date.now()
const sec = () => ((Date.now() - t00) / 1000).toFixed(1)
let beat = null
const beats = []
const start = (name) => { beat = { name, taps: [], t0: Date.now() }; beats.push(beat) }
const tap = async (loc, label) => { await loc.click(); beat.taps.push(label) }
// log every line that shows (polling). 118: progress is a new line, or the line typing on or scrolling.
const seen = new Map()
const lines = []
let lastPageAt = Date.now()
let words = 0
let progress = ''
let polling = true
;(async () => {
  while (polling) {
    const r = await page.evaluate(() => {
      const t = document.querySelector('[data-testid="dialogue-text"]')?.textContent
      const g = document.querySelector('.gbox')
      const w = document.querySelector('[data-testid="data-window"]')
      return t ? { t, id: g?.dataset.messageId, n: g?.dataset.lines, top: g?.dataset.top, typed: g?.dataset.typed, w: w && !w.hidden ? w.dataset.window : '' } : null
    }).catch(() => null)
    if (r) {
      const sig = `${r.id}:${r.typed}:${r.top}`
      if (sig !== progress) { progress = sig; lastPageAt = Date.now() }
      words = r.t.split(/\s+/).filter(Boolean).length
      if (!seen.has(r.id)) { seen.set(r.id, { at: Date.now(), i: lines.length }); lines.push(`${sec().padStart(6)}s [${r.n} lines]${r.w ? ` {${r.w}}` : ''} ${r.t}`) }
      const s0 = seen.get(r.id)
      if (r.typed === 'done' && !s0.typedIn) { s0.typedIn = ((Date.now() - s0.at) / 1000).toFixed(1); lines[s0.i] = lines[s0.i].replace(' lines]', ` lines, typed ${s0.typedIn}s]`) }
    }
    await page.waitForTimeout(100)
  }
})()
// wait for a locator to be visible; demo mode should get there by itself. A Next tap (counted, a PROBLEM) only
// when nothing has moved for 12 s plus the line's reading pause (250 ms a word) while the box says Next.
const reach = async (loc, label, maxMs = 240000) => {
  const tEnd = Date.now() + maxMs
  while (Date.now() < tEnd) {
    if (await loc.first().isVisible().catch(() => false)) return loc.first()
    const mode = await page.getByTestId('dock').getAttribute('data-mode').catch(() => null)
    const more = page.locator('[data-action="menu-more"]')
    if (label.startsWith('"') && mode === 'input' && (await more.isVisible().catch(() => false))) { await tap(more, 'More'); continue }
    if (mode === 'next' && Date.now() - lastPageAt > 12000 + 250 * words) {
      problems.push(`stuck before ${label} (${beat.name}); tapped Next`)
      problems.push(`  state then: ${await page.evaluate(() => { const g = document.querySelector('.gbox'); const d = document.querySelector('.game'); return JSON.stringify({ id: g?.dataset.messageId, typed: g?.dataset.typed, top: g?.dataset.top, lines: g?.dataset.lines, demo: d?.dataset.demo, step: d?.dataset.step, dialog: !!document.querySelector('dialog[open]'), focus: document.activeElement?.getAttribute('data-action') ?? document.activeElement?.tagName }) }).catch((e) => e.message)}`)
      lastPageAt = Date.now()
      await tap(page.locator('[data-action="next"]'), 'Next (stuck)')
    }
    await page.waitForTimeout(150)
  }
  throw new Error(`never reached ${label}`)
}
// 118: a line types out before Demo mode decides; wait for it, then check Demo mode says it holds (data-demo="hold") and
// the line is still there after longer than its reading pause would be
const typedOut = async () => { for (let i = 0; i < 300 && (await page.locator('.gbox').getAttribute('data-typed')) !== 'done'; i++) await page.waitForTimeout(100) }
const holds = async (what) => {
  await typedOut()
  const id = await page.locator('.gbox').getAttribute('data-message-id')
  const words = (await page.getByTestId('dialogue-text').textContent()).split(/\s+/).filter(Boolean).length
  if ((await page.locator('.game').getAttribute('data-demo')) !== 'hold') problems.push(`demo mode is not holding at ${what}`)
  await page.waitForTimeout(Math.max(2500, 250 * words) + 1500)
  if ((await page.locator('.gbox').getAttribute('data-message-id')) !== id) problems.push(`demo mode did not hold at ${what}`)
}
const skipAll = async (label) => { const l = await reach(page.locator('[data-action="show-all"]'), 'Skip all'); await tap(l, `Skip all (${label})`) }
const SKIP = new Set((process.env.SKIP ?? '').split(',').filter(Boolean))
const chip = async (t) => tap(await reach(page.locator(`[data-chip="${t}"]`), `"${t}"`), `"${t}"`)
let n = 0
const shot = async (name) => { await page.waitForTimeout(300); await page.screenshot({ path: `${out}/${String(++n).padStart(2, '0')}-${name}.png` }) }
try {
  start('open, card')
  await page.goto(`${base}/?framing=${framing}`)
  const card = page.getByTestId('business-card')
  await card.waitFor({ state: 'visible', timeout: 15000 })
  await page.waitForTimeout(1500)
  await shot('card')
  await tap(page.locator('[data-action="card-close"]'), 'card away')
  start('nice to meet you')
  await chip('Nice to meet you, Cap!')
  start('declined')
  await chip("I've been declined already")
  start('three samples')
  for (let i = 0; i < 3; i++) await tap(await reach(page.locator('[data-action="sample"]'), 'Use a sample'), 'Use a sample')
  start('decline, fix, reapply, rights')
  await chip('What can I do?')
  start('steps, goals')
  if (SKIP.has('decline')) { /* placeholder */ }
  if (SKIP.has('steps')) await skipAll('steps')
  await chip('The Balance Transfer card')
  await chip('3 months')
  await chip('Yes, I can')
  await chip('No')
  start('plan built, reasons (stops at Why?)')
  const why = await reach(page.locator('[data-testid="data-window"] [data-action="why"]'), 'Why?', 90000)
  await holds('the Why? moment')
  await shot('why-stop')
  if (!process.env.NOWHY) {
    await tap(why, 'Why?')
    await page.getByTestId('why-sheet').waitFor({ state: 'visible' })
    await shot('why-open')
    await tap(page.getByTestId('why-sheet').locator('header button').first(), 'close Why')
  }
  start('rest of reasons')
  if (SKIP.has('reasons')) await skipAll('reasons')
  await chip('Sum it up for me')
  start('paper (stops)')
  const paper = await reach(page.locator('[data-npc-hotspot="paper"]'), 'paper on the desk')
  await holds('the paper')
  await shot('paper-stop')
  await tap(paper, 'paper on the desk')
  await page.getByTestId('paper-sheet').waitFor({ state: 'visible' })
  await tap(page.getByTestId('paper-sheet').locator('header button').first(), 'close paper')
  start('plan')
  await chip('Make me a plan')
  await chip('3 months')
  if (SKIP.has('plan')) await skipAll('plan')
  start('what-if £400')
  await chip('What if I pay £400 a month?')
  await reach(page.locator('[data-testid="data-window"][data-window="whatif"]'), 'what-if window', 60000)
  await typedOut()
  await page.waitForTimeout(500)
  await shot('whatif')
  start('end')
} catch (e) {
  problems.push(`walk failed in "${beat?.name}": ${e.message.split('\n')[0]}`)
  await page.screenshot({ path: `${out}/FAILED.png` }).catch(() => {})
}
polling = false
await new Promise((r) => setTimeout(r, 400))
let total = 0
for (let i = 0; i < beats.length - 1; i++) {
  const b = beats[i]
  const ms = beats[i + 1].t0 - b.t0
  total += b.taps.length
  console.log(`${b.name.padEnd(38)} ${String((ms / 1000).toFixed(1)).padStart(5)}s  ${b.taps.length} taps: ${b.taps.join(', ')}`)
}
console.log(`TOTAL ${total} taps, ${sec()}s`)
console.log('--- lines (time shown, line count, time to type) ---')
for (const l of lines) console.log(l)
console.log(`requests to other hosts: ${external.length}${external.length ? ' ' + [...new Set(external)].join(' ') : ''}`)
for (const p of problems) console.log('PROBLEM', p)
await browser.close()
process.exit(problems.length ? 1 : 0)
