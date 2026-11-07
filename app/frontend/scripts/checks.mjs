// 114 checks the walk does not cover: the live region and canvas label, the error and upload-failure
// states, a letter at any step, the typewriter at 1x, read aloud (speechSynthesis, en-GB), the mic
// button, the settings sheet and colour modes. WebKit, iPhone 15. Screens to screens/check-*.png.
//   node scripts/checks.mjs [--base http://localhost:5173]
import { devices, webkit } from 'playwright'
import { fileURLToPath } from 'node:url'

const args = process.argv.slice(2)
const base = args.includes('--base') ? args[args.indexOf('--base') + 1] : 'http://localhost:5173'
const out = fileURLToPath(new URL('../screens/', import.meta.url))
const browser = await webkit.launch()
const results = []
const ok = (name, pass, detail = '') => results.push({ name, pass: !!pass, detail })

async function open(query = '', settings = { speed: 'instant' }) {
  const ctx = await browser.newContext({ ...devices['iPhone 15'] })
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
  await page.goto(`${base}/${query}`)
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
  for (let i = 0; i < 30; i++) {
    await settle(page)
    if ((await mode(page)) !== 'next') return
    await page.locator('[data-action="next"]').click()
  }
}
const shot = async (page, name) => {
  await page.waitForTimeout(400)
  await page.screenshot({ path: `${out}check-${name}.png` })
  await page.waitForTimeout(250)
  await page.screenshot({ path: `${out}check-${name}.png` })
}

// 1. live region, canvas label, typewriter at 1x
{
  const { ctx, page, errors } = await open('', { speed: '1x' })
  await settle(page)
  await page.waitForTimeout(100)
  const live = await page.getByTestId('live').textContent()
  const typingMode = await mode(page)
  const label1 = await page.locator('canvas').getAttribute('aria-label')
  await shot(page, 'typing-1x')
  await page.waitForTimeout(4500)
  const after = await mode(page)
  ok('live region holds the whole line at once', live?.startsWith('Credit agent says: Hello, welcome'), live?.slice(0, 60))
  ok('1x typewriter: dock says "Show all of it" while typing, then Next', typingMode === 'next' && after === 'next', `${typingMode} -> ${after}`)
  ok('canvas has an aria-label for the agent', label1?.includes('Credit agent'), label1 ?? '')
  await drain(page)
  await page.locator(`[data-chip="Let's start"]`).click()
  await settle(page)
  const label2 = await page.locator('canvas').getAttribute('aria-label')
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
  await drain(page)
  await page.locator(`[data-chip="Let's start"]`).click()
  await settle(page)
  const chooser = page.waitForEvent('filechooser')
  await page.locator('[data-action="upload"]').click()
  const fc = await chooser
  await fc.setFiles({ name: 'holiday-photo.jpg', mimeType: 'image/jpeg', buffer: Buffer.from('not a report') })
  await settle(page)
  await page.locator('[data-entry="notice"]').waitFor({ timeout: 5000 })
  await shot(page, 'upload-failed')
  ok('a failed upload shows a friendly notice and keeps Upload / Use a sample', (await mode(page)) === 'input' && (await page.locator('[data-action="sample"]').count()) === 1)
  await ctx.close()
}

// 4. a real upload through the tray, then a letter at another step
{
  const { ctx, page, errors } = await open()
  await drain(page)
  await page.locator(`[data-chip="Let's start"]`).click()
  await settle(page)
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
  const stepBefore = await page.locator('.app').getAttribute('data-step')
  await page.locator('[data-action="letter"]').click()
  await page.getByTestId('letter-sheet').waitFor({ state: 'visible' })
  await shot(page, 'letter-sheet')
  await page.locator('[data-action="letter-sample"]').click()
  await settle(page)
  const stepAfter = await page.locator('.app').getAttribute('data-step')
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
  ok('read aloud speaks the line in en-GB at the chosen rate', spoken?.[0]?.lang === 'en-GB' && Math.abs(spoken[0].rate - 1.2) < 0.001 && spoken[0].text.startsWith('Hello'), JSON.stringify({ ...(spoken?.[0] ?? {}), text: spoken?.[0]?.text?.slice(0, 30) }))
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
  // to the goal question (text box with the mic)
  await drain(page)
  await page.locator(`[data-chip="Let's start"]`).click()
  for (let i = 0; i < 3; i++) {
    await drain(page)
    await page.locator('[data-action="sample"]').click()
    if (i === 0) {
      await page.locator('[data-persona="priya"]').click()
    }
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

// 6. tap-to-explain a credit term
{
  const { ctx, page } = await open('?demo=1')
  for (let i = 0; i < 60; i++) {
    if (await page.locator('[data-term]').count()) break
    const m = await mode(page)
    if (m === 'next' || m === 'continue') await page.locator(`[data-action="${m}"]`).click()
    else if (m === 'input') {
      const chip = page.locator('[data-chip]').first()
      if (await page.locator('[data-action="sample"]').count()) await page.locator('[data-action="sample"]').click()
      else await chip.click()
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

await browser.close()
for (const r of results) console.log(`${r.pass ? 'PASS' : 'FAIL'}  ${r.name}${r.detail ? `  [${r.detail}]` : ''}`)
const failed = results.filter((r) => !r.pass).length
console.log(failed ? `${failed} failed` : `all ${results.length} passed`)
process.exit(failed ? 1 : 0)
