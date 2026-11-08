// The demo script (deliverables/pitch/demo-script.md) as a walk: WebKit iPhone 15, Demo mode ON (it moves on by
// itself), Plain English ON (preset, as before judging), framing B. Taps exactly what the script taps, counts and
// times every beat, logs every page shown, and reports requests to any other host (none expected offline).
//   node scripts/demo-walk.mjs [base] [outdir, default <tmp>/demo-walk] [framing]
//   base: the phone URL, e.g. http://$(ipconfig getifaddr en0):5173 (default http://127.0.0.1:5173)
//   env SKIP=steps,reasons,plan: the script's three Skip all taps (the 20-tap path). NOWHY=1: no Why? drawer.
//   The rehearsal: SKIP=steps,reasons,plan NOWHY=1 node scripts/demo-walk.mjs http://<ip>:5173
//   A PROBLEM line (or exit 1) means a beat failed or Demo mode did not hold where it should.
import { webkit, devices } from 'playwright'
import { mkdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
const [base = 'http://127.0.0.1:5173', out = join(tmpdir(), 'demo-walk'), framing = 'B'] = process.argv.slice(2)
mkdirSync(out, { recursive: true })
const browser = await webkit.launch()
const ctx = await browser.newContext({ ...devices['iPhone 15'] })
await ctx.addInitScript(() => {
  try { localStorage.setItem('whack26.settings.v1', JSON.stringify({ speed: '1x', demo: true, plainEnglish: true, textSize: 100, colour: 'standard', readAloud: false, voiceRate: 1, framing: 'B' })) } catch {}
})
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
// log every page that shows (polling)
const seen = new Set()
const lines = []
let lastPageAt = Date.now()
let polling = true
;(async () => {
  while (polling) {
    const r = await page.evaluate(() => {
      const t = document.querySelector('[data-testid="dialogue-text"]')?.textContent
      const g = document.querySelector('.gbox')
      const w = document.querySelector('[data-testid="data-window"]')
      return t ? { t, id: g?.dataset.messageId, p: g?.dataset.page, w: w && !w.hidden ? w.dataset.window : '' } : null
    }).catch(() => null)
    if (r && !seen.has(`${r.id}:${r.p}`)) { lastPageAt = Date.now(); seen.add(`${r.id}:${r.p}`); lines.push(`${sec().padStart(6)}s [${r.p}]${r.w ? ` {${r.w}}` : ''} ${r.t}`) }
    await page.waitForTimeout(100)
  }
})()
// wait for a locator to be visible; demo mode should get there by itself. A Next tap (counted, a PROBLEM) only
// when no new page has shown for 12 s while the box says Next.
const reach = async (loc, label, maxMs = 240000) => {
  const tEnd = Date.now() + maxMs
  while (Date.now() < tEnd) {
    if (await loc.first().isVisible().catch(() => false)) return loc.first()
    const mode = await page.getByTestId('dock').getAttribute('data-mode').catch(() => null)
    const more = page.locator('[data-action="menu-more"]')
    if (label.startsWith('"') && mode === 'input' && (await more.isVisible().catch(() => false))) { await tap(more, 'More'); continue }
    if (mode === 'next' && Date.now() - lastPageAt > 12000) {
      problems.push(`stuck before ${label} (${beat.name}); tapped Next`)
      lastPageAt = Date.now()
      await tap(page.locator('[data-action="next"]'), 'Next (stuck)')
    }
    await page.waitForTimeout(150)
  }
  throw new Error(`never reached ${label}`)
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
  await page.waitForTimeout(3000) // demo mode must be holding here
  await shot('why-stop')
  const heldOn = await page.locator('.gbox').getAttribute('data-message-id')
  await page.waitForTimeout(2000)
  if ((await page.locator('.gbox').getAttribute('data-message-id')) !== heldOn) problems.push('demo mode did not hold at the Why? moment')
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
  await page.waitForTimeout(2500)
  await shot('paper-stop')
  const paperMsg = await page.locator('.gbox').getAttribute('data-message-id')
  await page.waitForTimeout(2000)
  if ((await page.locator('.gbox').getAttribute('data-message-id')) !== paperMsg) problems.push('demo mode did not hold at the paper')
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
  await page.waitForTimeout(3500)
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
console.log('--- pages (time, page) ---')
for (const l of lines) console.log(l)
console.log(`requests to other hosts: ${external.length}${external.length ? ' ' + [...new Set(external)].join(' ') : ''}`)
for (const p of problems) console.log('PROBLEM', p)
await browser.close()
process.exit(problems.length ? 1 : 0)
