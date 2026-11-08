// 114 checks the walk does not cover: the live region and canvas label, the error and upload-failure
// states, a letter at any step, the typewriter at 1x, read aloud (speechSynthesis, en-GB), the mic
// button, the settings sheet and colour modes. WebKit, iPhone 15 (118: or --desktop, Chromium 1440x900). Screens to
// screens/check-*.png (desktop: check-desktop-*.png).
//   node scripts/checks.mjs [--base http://localhost:5173] [--live-base http://localhost:5175] [--desktop]
// --live-base: a dev server started with VITE_USE_MOCK=false (backend up) for the HTTP error checks.
import { chromium, devices, webkit } from 'playwright'
import { fileURLToPath } from 'node:url'

const args = process.argv.slice(2)
const base = args.includes('--base') ? args[args.indexOf('--base') + 1] : 'http://localhost:5173'
const liveBase = args.includes('--live-base') ? args[args.indexOf('--live-base') + 1] : null
const out = fileURLToPath(new URL('../screens/', import.meta.url))
const desktop = args.includes('--desktop')
const browser = desktop ? await chromium.launch() : await webkit.launch()
const results = []
const ok = (name, pass, detail = '') => results.push({ name, pass: !!pass, detail })

async function open(query = '', settings = { speed: 'instant' }, at = base, routes = null) {
  const ctx = await browser.newContext(desktop ? { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 } : { ...devices['iPhone 15'] })
  if (routes) await routes(ctx)
  await ctx.addInitScript((s) => {
    try {
      localStorage.setItem('whack26.settings.v1', JSON.stringify(s))
    } catch {}
    // record what would be spoken (on the prototype: WebKit hands out a fresh speechSynthesis object)
    window.__spoken = []
    if (window.SpeechSynthesis) {
      window.SpeechSynthesis.prototype.speak = (u) => window.__spoken.push({ text: u.text, lang: u.lang, rate: u.rate })
      window.SpeechSynthesis.prototype.cancel = () => {}
    }
  }, settings)
  const page = await ctx.newPage()
  const errors = []
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
  page.on('pageerror', (e) => errors.push(e.message))
  await page.goto(`${at}/${query}`)
  await page.getByTestId('dock').waitFor()
  return { ctx, page, errors }
}
const mode = (page) => page.getByTestId('dock').getAttribute('data-mode')
async function settle(page) {
  for (let i = 0; i < 80; i++) {
    if ((await mode(page)) !== 'busy') return
    await page.waitForTimeout(100)
  }
}
async function drain(page) {
  // 118: a line typing at 1x takes two taps (finish, then Next)
  for (let i = 0; i < 100; i++) {
    await settle(page)
    if ((await mode(page)) !== 'next') return
    await page.locator('[data-action="next"]').click()
  }
}
// 115: Cap's business card opens over everything on the first turn; put it away before tapping.
async function closeCard(page, wait = 6000) {
  const card = page.getByTestId('business-card')
  try {
    await card.waitFor({ state: 'visible', timeout: wait })
  } catch {
    return
  }
  await page.locator('[data-action="card-close"]').click()
  await card.waitFor({ state: 'hidden' })
}
/** 115: past the card and the opening question, into the report branch (where "Let's start" used to go). */
async function toReport(page) {
  await closeCard(page)
  await drain(page)
  await page.locator('[data-chip="Nice to meet you, Cap!"]').click()
  await settle(page)
  await drain(page)
  await page.locator(`[data-chip="I've got a credit report I want help with"]`).click()
  await settle(page)
  await drain(page)
}
/** 116: tap a menu row, paging with More until it shows (menus page when they do not fit). */
async function menuPick(page, selector) {
  for (let i = 0; i < 6; i++) {
    if (await page.locator(selector).first().isVisible().catch(() => false)) return page.locator(selector).first().click()
    const more = page.locator('[data-action="menu-more"]')
    if (!(await more.count())) break
    await more.click()
  }
  return page.locator(selector).first().click()
}
/** 116: page the menu with More until `selector` shows; if it never does, back to page 1. True if shown. */
async function reveal(page, selector) {
  await page.waitForTimeout(100)
  for (let i = 0; i < 6; i++) {
    if (await page.locator(selector).first().isVisible().catch(() => false)) return true
    const more = page.locator('[data-action="menu-more"]')
    if (!(await more.isVisible().catch(() => false))) break
    await more.click()
  }
  const back = page.locator('[data-action="menu-back"]')
  if (await back.isVisible().catch(() => false)) await back.click()
  return false
}
const shot = async (page, name) => {
  await page.waitForTimeout(400)
  await page.screenshot({ path: `${out}check-${desktop ? 'desktop-' : ''}${name}.png` })
  await page.waitForTimeout(250)
  await page.screenshot({ path: `${out}check-${desktop ? 'desktop-' : ''}${name}.png` })
}

// 1. live region, canvas label, typewriter at 1x
{
  const { ctx, page, errors } = await open('', { speed: '1x' })
  await settle(page)
  await page.waitForTimeout(100)
  const live = await page.getByTestId('live').textContent()
  const typingMode = await mode(page)
  const label1 = await page.locator('canvas.npc-canvas').getAttribute('aria-label')
  await shot(page, 'typing-1x')
  await page.waitForTimeout(4500)
  const after = await mode(page)
  ok('live region holds the whole line at once', live?.startsWith("Cap says: Hi, nice to meet you. My name's Cap"), live?.slice(0, 60))
  ok('1x typewriter: dock says "Show all of it" while typing, then Next', typingMode === 'next' && after === 'next', `${typingMode} -> ${after}`)
  ok('canvas has an aria-label for the agent', label1?.includes('Cap'), label1 ?? '')
  await toReport(page)
  await settle(page)
  const label2 = await page.locator('canvas.npc-canvas').getAttribute('aria-label')
  ok('canvas label follows the state', label2 !== label1, label2 ?? '')
  ok('no console errors (1)', errors.length === 0, errors.join(' | '))
  await ctx.close()
}

// 2. error state (?mock=error) and retry
{
  const { ctx, page } = await open('?mock=error')
  await settle(page)
  await page.getByTestId('error').waitFor({ timeout: 5000 })
  const m = await mode(page)
  await shot(page, 'error')
  ok('?mock=error shows the error line and Try again', m === 'error' && (await page.locator('[data-action="retry"]').count()) === 1)
  await ctx.close()
}

// 3. upload failure (?mock=uploadfail): friendly notice, inputs stay
{
  const { ctx, page } = await open('?mock=uploadfail')
  await toReport(page)
  await settle(page)
  const chooser = page.waitForEvent('filechooser')
  await page.locator('[data-action="upload"]').click()
  const fc = await chooser
  await fc.setFiles({ name: 'holiday-photo.jpg', mimeType: 'image/jpeg', buffer: Buffer.from('not a report') })
  await settle(page)
  await page.locator('.gbox [data-entry="notice"]').waitFor({ timeout: 5000 })
  await shot(page, 'upload-failed')
  ok('a failed upload shows a friendly notice and keeps Upload / Use a sample', (await mode(page)) === 'input' && (await page.locator('[data-action="sample"]').count()) === 1)
  await ctx.close()
}

// 4. a real upload through the tray, then a letter at another step
{
  const { ctx, page, errors } = await open()
  // 117: Cap is close, so the file menu's box (up to his chin) covers the desk; the tray shows while the box is
  // at rest, on the lines before the menu (118: or while the request line types). Tap it there, where it is uncovered.
  await closeCard(page)
  await drain(page)
  await page.locator('[data-chip="Nice to meet you, Cap!"]').click()
  await settle(page)
  await drain(page)
  await page.locator(`[data-chip="I've got a credit report I want help with"]`).click()
  await settle(page)
  const trayFree = () =>
    page.evaluate(() => {
      const t = document.querySelector('[data-npc-hotspot="tray"]')
      if (!t) return false
      const r = t.getBoundingClientRect()
      const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)
      return hit === t
    })
  for (let i = 0; i < 40 && !(await trayFree()) && (await mode(page)) === 'next'; i++) {
    await page.locator('[data-action="next"]').click()
    await page.waitForTimeout(100)
  }
  ok('117: the tray is uncovered and tappable while the box is at rest', await trayFree())
  const chooser = page.waitForEvent('filechooser')
  await page.locator('[data-npc-hotspot="tray"]').click()
  const fc = await chooser
  await fc.setFiles({ name: 'experian-report.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4 sample') })
  await page.waitForTimeout(200)
  const reading = await page.getByTestId('pending').textContent().catch(() => '')
  await shot(page, 'upload-reading')
  await settle(page)
  const you = await page.locator('[data-entry="you"]').last().textContent()
  ok('tray upload: the agent reads it, then the chat moves on', reading?.includes('reading experian-report.pdf') && you?.includes('Handed over experian-report.pdf'), `${reading} / ${you}`)
  await drain(page)
  // a letter at ask_bank, from the always-there button
  const stepBefore = await page.locator('.game').getAttribute('data-step')
  await page.locator('[data-action="letter"]').click()
  await page.getByTestId('letter-sheet').waitFor({ state: 'visible' })
  await shot(page, 'letter-sheet')
  await page.locator('[data-action="letter-sample"]').click()
  await settle(page)
  const stepAfter = await page.locator('.game').getAttribute('data-step')
  const text = await page.locator('[data-current] [data-testid="dialogue-text"]').textContent()
  ok('a letter at any step: one acknowledgement, step unchanged', stepBefore === stepAfter && /letter/i.test(text ?? ''), `${stepBefore} -> ${stepAfter}: ${text?.slice(0, 50)}`)
  ok('the letter button goes once a letter is in', (await page.locator('[data-action="letter"]').count()) === 0)
  ok('no console errors (4)', errors.length === 0, errors.join(' | '))
  await ctx.close()
}

// 5. read aloud, mic, settings sheet, explain a term
{
  const { ctx, page } = await open('', { speed: 'instant', readAloud: true, voiceRate: 1.2 })
  await settle(page)
  await page.waitForTimeout(300)
  const spoken = await page.evaluate(() => window.__spoken)
  ok('read aloud speaks the line in en-GB at the chosen rate', spoken?.[0]?.lang === 'en-GB' && Math.abs(spoken[0].rate - 1.2) < 0.001 && spoken[0].text.startsWith('Hi, nice to meet you'), JSON.stringify({ ...(spoken?.[0] ?? {}), text: spoken?.[0]?.text?.slice(0, 30) }))
  await closeCard(page)
  await page.locator('[data-action="settings"]').click()
  await page.getByTestId('settings-sheet').waitFor({ state: 'visible' })
  await shot(page, 'settings')
  await page.locator('label:has-text("High contrast")').click()
  const colour = await page.evaluate(() => document.documentElement.dataset.colour)
  await page.locator('label:has-text("150%")').click()
  const size = await page.evaluate(() => getComputedStyle(document.documentElement).fontSize)
  ok('settings: colour mode and text size apply to the page', colour === 'contrast' && size === '24px', `${colour}, ${size}`)
  await page.locator('label:has-text("Standard")').click()
  await page.locator('label:has-text("100%")').click()
  await page.keyboard.press('Escape')
  // to the goal question (text box with the mic): samples, then chips, until the reply box shows
  await toReport(page)
  for (let i = 0; i < 10 && !(await page.locator('#reply-box').isVisible().catch(() => false)); i++) {
    await drain(page)
    if (await reveal(page, '[data-action="sample"]')) {
      await page.locator('[data-action="sample"]').click()
      if (await page.locator('[data-persona="priya"]').isVisible().catch(() => false)) await page.locator('[data-persona="priya"]').click()
    } else if (await reveal(page, '[data-action="type-own"]')) await page.locator('[data-action="type-own"]').click()
    else if (!(await page.locator('#reply-box').isVisible().catch(() => false))) await menuPick(page, '[data-chip]')
    await settle(page)
  }
  await drain(page)
  await page.locator('[data-action="mic"]').click()
  await page.waitForTimeout(400)
  const pressed = await page.locator('[data-action="mic"]').getAttribute('aria-pressed')
  const tip = await page.getByTestId('mic-tip').textContent().catch(() => null)
  await shot(page, 'mic')
  ok('mic: listens (en-GB) or explains the keyboard dictation fallback', pressed === 'true' || !!tip, pressed === 'true' ? 'listening' : tip ?? '')
  await ctx.close()
}

// 5b. 115: switching read aloud on says its confirmation in full (the line on screen is not read over
//     it); the next new line is read
{
  const { ctx, page } = await open('', { speed: 'instant', readAloud: false, voiceRate: 1 })
  await settle(page)
  await closeCard(page)
  await page.locator('[data-action="settings"]').click()
  await page.getByTestId('settings-sheet').waitFor({ state: 'visible' })
  await page.locator('label').filter({ has: page.getByTestId('toggle-voice') }).click()
  await page.waitForTimeout(400)
  const afterToggle = await page.evaluate(() => window.__spoken.map((u) => u.text))
  await page.keyboard.press('Escape')
  await drain(page)
  await page.locator('[data-chip="Nice to meet you, Cap!"]').click()
  await settle(page)
  await page.waitForTimeout(300)
  const afterChip = await page.evaluate(() => window.__spoken.map((u) => u.text))
  ok(
    'read aloud on: the confirmation alone, then the next line in full',
    afterToggle.length === 1 && afterToggle[0] === "I'll read my replies aloud." && afterChip.length > 1 && /credit search|make your credit better/.test(afterChip.at(-1) ?? ''),
    JSON.stringify({ afterToggle, next: afterChip.at(-1)?.slice(0, 40) }),
  )
  await ctx.close()
}

// 6. tap-to-explain a credit term
{
  const { ctx, page } = await open('?demo=1', { speed: 'instant', demo: true })
  await closeCard(page)
  for (let i = 0; i < 60; i++) {
    if (await page.locator('[data-term]').count()) break
    const m = await mode(page)
    if (m === 'next' || m === 'continue') await page.locator(`[data-action="${m}"]`).click()
    else if (m === 'input') {
      if (await reveal(page, '[data-action="sample"]')) await page.locator('[data-action="sample"]').click()
      else await menuPick(page, '[data-chip]')
    }
    await settle(page)
  }
  const term = page.locator('[data-term]').first()
  const word = await term.textContent()
  await term.click()
  const explain = await page.getByTestId('term-explain').textContent()
  await shot(page, 'explain-term')
  ok('a credit term gets a tap-to-explain line', !!explain && explain.length > 40, `${word}: ${explain?.slice(0, 60)}`)
  await ctx.close()
}

// 7. HTTP errors from the real backend's routes (needs --live-base): a refused upload keeps the inputs;
//    a lost session on /api/whatif offers Start again (not a Try again that loops)
if (liveBase) {
  const refuse = async (ctx) => {
    await ctx.route('**/api/upload', (r) => r.fulfill({ status: 413, contentType: 'application/json', body: JSON.stringify({ error: 'That file is too big. Try one under 10 MB.' }) }))
    await ctx.route('**/api/whatif', (r) => r.fulfill({ status: 404, contentType: 'application/json', body: JSON.stringify({ error: 'Unknown session' }) }))
  }
  const { ctx, page } = await open('?demo=1', { speed: 'instant', demo: true }, liveBase, refuse)
  await toReport(page)
  await settle(page)
  const chooser = page.waitForEvent('filechooser')
  await page.locator('[data-action="upload"]').click()
  await (await chooser).setFiles({ name: 'huge.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4') })
  await settle(page)
  const notice = await page.locator('[data-entry="notice"]').last().textContent().catch(() => '')
  ok('a refused upload (413) says why and keeps Upload / Use a sample', (await mode(page)) === 'input' && notice?.includes('too big') && (await reveal(page, '[data-action="sample"]')), notice ?? '')
  // on to the coach with samples, then a slider what-if that meets a lost session
  for (let i = 0; i < 80 && (await page.locator('.game').getAttribute('data-step')) !== 'coach'; i++) {
    const m = await mode(page)
    if (m === 'next' || m === 'continue') await page.locator(`[data-action="${m}"]`).click()
    else if (m === 'input') {
      if (await reveal(page, '[data-action="sample"]')) await page.locator('[data-action="sample"]').click()
      else await menuPick(page, '[data-chip]')
    }
    await settle(page)
  }
  await drain(page)
  if (await reveal(page, '[data-chip="Make me a plan"]')) {
    await page.locator('[data-chip="Make me a plan"]').click()
    await settle(page)
    await drain(page)
  }
  if (await reveal(page, '[data-chip="3 months"]')) {
    await page.locator('[data-chip="3 months"]').click()
    await settle(page)
    await drain(page)
  }
  await menuPick(page, '[data-action="whatif-sheet"]')
  await page.getByTestId('paydown').focus()
  for (let i = 0; i < 8; i++) await page.keyboard.press('ArrowRight')
  await page.locator('[data-action="whatif-run"]').click()
  await settle(page)
  await shot(page, 'session-gone')
  ok('a lost session on /api/whatif offers Start again', (await page.locator('[data-action="restart-chat"]').count()) === 1 && (await page.locator('[data-action="retry"]').count()) === 0)
  await page.locator('[data-action="restart-chat"]').click()
  await settle(page)
  ok('Start again begins a new conversation', (await page.locator('.game').getAttribute('data-step')) === 'intro')
  await ctx.close()
}

await browser.close()
for (const r of results) console.log(`${r.pass ? 'PASS' : 'FAIL'}  ${r.name}${r.detail ? `  [${r.detail}]` : ''}`)
const failed = results.filter((r) => !r.pass).length
console.log(failed ? `${failed} failed` : `all ${results.length} passed`)
process.exit(failed ? 1 : 0)
