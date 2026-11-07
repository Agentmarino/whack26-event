// 114 verification: walk the whole chat from greet to coach and screenshot every step and card.
// Playwright WebKit with the iPhone 15 profile (393x659, dpr 3, touch) unless --desktop.
//
//   node scripts/walk.mjs [--base http://localhost:5173] [--desktop] [--keyboard] [--reduced]
//                         [--text 150] [--colour okabe|contrast] [--prefix name] [--live] [--until coach]
//
// Screens go to app/frontend/screens/<prefix>-NN-<step>.png. Every screenshot is taken twice (the first
// can lag one action behind) and the second is kept. Exits 1 on a console error or a stuck step.
import { chromium, devices, webkit } from 'playwright'
import { mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const args = process.argv.slice(2)
const flag = (n) => args.includes(`--${n}`)
const opt = (n, d) => {
  const i = args.indexOf(`--${n}`)
  return i >= 0 && args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : d
}

const base = opt('base', 'http://localhost:5173')
const desktop = flag('desktop')
const keyboard = flag('keyboard')
const reduced = flag('reduced')
const textSize = Number(opt('text', '100'))
const colour = opt('colour', 'standard')
const live = flag('live')
const prefix = opt('prefix', desktop ? 'desktop' : 'iphone')
const outDir = fileURLToPath(new URL('../screens/', import.meta.url))
mkdirSync(outDir, { recursive: true })

const browser = desktop ? await chromium.launch() : await webkit.launch()
const context = await browser.newContext({
  ...(desktop ? { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 } : devices['iPhone 15']),
  reducedMotion: reduced ? 'reduce' : 'no-preference',
})
// Settings before the app loads: instant text so the walk is quick (the typewriter is checked separately).
await context.addInitScript(
  ({ textSize, colour }) => {
    try {
      localStorage.setItem(
        'whack26.settings.v1',
        JSON.stringify({ speed: 'instant', demo: false, textSize, colour, plainEnglish: false, readAloud: false, voiceRate: 1 }),
      )
    } catch {}
  },
  { textSize, colour },
)
const page = await context.newPage()
const problems = []
page.on('console', (m) => {
  if (m.type() === 'error') problems.push(`console error: ${m.text()}`)
  if (m.type() === 'warning' && m.text().includes('[api]')) problems.push(`contract mismatch: ${m.text()}`)
})
page.on('pageerror', (e) => problems.push(`page error: ${e.message}`))

let n = 0
const shots = []
// Every visible control at least 44x44 CSS px (Apple's 44 pt). Inline links inside text are exempt.
const small = new Set()
async function targets(where) {
  const bad = await page.evaluate(() =>
    [...document.querySelectorAll('button, [role=switch], input:not([type=hidden]):not([type=file]):not(.sr-only), select, textarea, summary')]
      .filter((el) => {
        const r = el.getBoundingClientRect()
        const cs = getComputedStyle(el)
        if (!r.width || !r.height || cs.visibility === 'hidden' || el.closest('.sr-only, [aria-hidden=true]')) return false
        // a visually hidden input is measured by its visible label
        // an input inside a label is hit through the whole label
        const box = el.matches('input') && el.closest('label') ? el.closest('label').getBoundingClientRect() : r
        return box.width < 43.5 || box.height < 43.5
      })
      .map((el) => `${el.tagName.toLowerCase()}[${el.getAttribute('data-action') ?? el.getAttribute('aria-label') ?? el.textContent?.trim().slice(0, 24)}] ${Math.round(el.getBoundingClientRect().width)}x${Math.round(el.getBoundingClientRect().height)}`),
  )
  for (const b of bad) small.add(`${b} (at ${where})`)
}
async function shot(name) {
  await page.waitForTimeout(reduced ? 150 : 450)
  const file = `${outDir}${prefix}-${String(++n).padStart(2, '0')}-${name}.png`
  await page.screenshot({ path: file })
  await page.waitForTimeout(250)
  await page.screenshot({ path: file })
  shots.push(file.split('/').pop())
  await targets(name)
}

const dock = page.getByTestId('dock')
const mode = () => dock.getAttribute('data-mode')
async function settle() {
  for (let i = 0; i < 100; i++) {
    const m = await mode()
    if (m !== 'busy') return m
    await page.waitForTimeout(100)
  }
  throw new Error('stuck: the agent never answered')
}

/** Activate a control: a click, or (with --keyboard) Tab to it and press Enter. */
async function press(locator, what) {
  await locator.first().waitFor({ state: 'visible', timeout: 5000 })
  if (!keyboard) {
    await locator.first().click()
    return
  }
  const target = await locator.first().elementHandle()
  for (let i = 0; i < 60; i++) {
    const on = await page.evaluate((el) => document.activeElement === el, target)
    if (on) {
      await page.keyboard.press('Enter')
      return
    }
    // Safari (and Playwright's WebKit) only Tab to buttons with Option held, unless the user turned on
    // "Press Tab to highlight each item"; Option+Tab is what a keyboard user on a Mac presses.
    await page.keyboard.press(desktop ? 'Tab' : 'Alt+Tab')
  }
  throw new Error(`keyboard: could not Tab to ${what}`)
}

/** Tap Next through the queued messages, screenshotting each card on the way. */
async function drain(label) {
  for (let i = 0; i < 40; i++) {
    const m = await settle()
    if (m !== 'next') return m
    const kind = await page.locator('[data-current] [data-kind]').first().getAttribute('data-kind').catch(() => null)
    const id = await page.locator('[data-current] [data-message-id]').first().getAttribute('data-message-id').catch(() => null)
    if (kind && kind !== 'text') await shot(`${label}-${kind}-${id}`)
    else if (id && /decline|flags|headline/.test(id)) await shot(`${label}-${id}`)
    if (keyboard) {
      // Space outside a control is "next"; inside the dock, Enter on the Next button does it.
      await press(page.locator('[data-action="next"]'), 'Next')
    } else await page.locator('[data-action="next"]').click()
  }
  throw new Error(`stuck in ${label}`)
}

const chip = (text) => page.locator(`[data-chip="${text}"]`)
const action = (a) => page.locator(`[data-action="${a}"]`)
const steps = []
const step = async () => {
  const s = await page.locator('.app').getAttribute('data-step')
  if (steps[steps.length - 1] !== s) steps.push(s)
  return s
}

try {
  await page.goto(`${base}/${live ? '?mock=off' : ''}`)
  await page.getByTestId('dock').waitFor()
  await settle()
  await step()
  await shot('greet')
  await drain('greet')
  await press(chip("Let's start"), "Let's start")
  await settle()
  await step()
  await shot('ask-report')

  // Use a sample -> persona picker -> Priya
  await press(action('sample'), 'Use a sample')
  await page.getByTestId('persona-sheet').waitFor({ state: 'visible' })
  await shot('persona-picker')
  await press(page.locator('[data-persona="priya"]'), 'Priya')
  await settle()
  await step()
  await shot('ask-bank-ack')
  await drain('ask-bank')
  await shot('ask-bank')
  await press(action('sample'), 'sample bank')
  await settle()
  await step()
  await drain('ask-letter')
  await shot('ask-letter')
  await press(action('sample'), 'sample letter')
  await settle()
  await step()
  await drain('questions')
  await shot('q-goal')
  await press(chip('A credit card'), 'A credit card')
  await settle()
  await step()
  await drain('questions')
  await shot('q-horizon')
  await press(chip('3 months'), '3 months')
  await settle()
  await drain('questions')
  await shot('q-roll')
  await press(chip('Yes, I can'), 'Yes, I can')
  await settle()
  await drain('questions')
  await shot('q-dd')
  await press(chip('No'), 'No')
  await settle()
  await step()
  await shot('assessing')
  await drain('assessing')
  if ((await mode()) === 'continue') await press(action('continue'), 'Continue')
  await settle()
  await step()
  await drain('diagnosis')
  await shot('diagnosis-end')
  // the because-trail drawer on the last reason in history
  const why = page.locator('[data-action="why"]').first()
  await why.scrollIntoViewIfNeeded()
  await press(why, 'Why?')
  await page.getByTestId('why-sheet').waitFor({ state: 'visible' })
  await shot('why-drawer')
  await page.keyboard.press('Escape')
  await page.getByTestId('why-sheet').waitFor({ state: 'hidden' })

  await press(chip('Tell me about the letter'), 'letter chip')
  await settle()
  await step()
  await drain('decline')
  await shot('decline-end')
  await press(chip('Got it'), 'Got it')
  await settle()
  await step()
  await drain('paper')
  await page.waitForTimeout(reduced ? 100 : 1800) // the sheet slides across the desk
  await shot('paper')
  // tap the sheet on the desk (keyboard: the "Read it" button on the card)
  if (keyboard) await press(action('open-paper'), 'Read it')
  else await page.locator('[data-npc-hotspot="paper"]').click()
  await page.getByTestId('paper-sheet').waitFor({ state: 'visible' })
  await shot('paper-overlay')
  await press(action('download'), 'Download')
  await page.getByTestId('paper-status').filter({ hasText: /./ }).waitFor({ timeout: 5000 }).catch(() => {})
  await shot('paper-download')
  await page.keyboard.press('Escape')
  await page.getByTestId('paper-sheet').waitFor({ state: 'hidden' })

  await press(chip('Make me a plan'), 'Make me a plan')
  await settle()
  await step()
  await drain('coach')
  await shot('coach-choose')
  if (opt('until') !== 'coach-choose') {
    await press(chip('3 months'), 'plan 3 months')
    await settle()
    await drain('plan')
    await shot('plan-end')
    await press(chip('What if I pay £300 a month?'), 'what-if chip')
    await settle()
    await drain('whatif')
    await shot('whatif-chip')
    const sliders = action('whatif-sheet')
    if (await sliders.count()) {
      await press(sliders, 'sliders')
      await page.getByTestId('whatif-sheet').waitFor({ state: 'visible', timeout: 3000 })
      // slider by keyboard (works for touch and keys alike): 12 steps of £25 = £300, then stop BNPL
      await page.getByTestId('paydown').focus()
      for (let i = 0; i < 12; i++) await page.keyboard.press('ArrowRight')
      const bnpl = page.locator('[data-lever="bnpl"]')
      if (await bnpl.count()) {
        if (keyboard) {
          await bnpl.focus()
          await page.keyboard.press('Space')
        } else await bnpl.check()
      }
      await shot('whatif-sheet')
      await press(action('whatif-run'), 'run what-if')
      await settle()
      await drain('whatif-sliders')
      await shot('whatif-sliders')
    }
  }
  await step()
} catch (e) {
  problems.push(`walk failed: ${e.message.split('\n')[0]}`)
  await page.screenshot({ path: `${outDir}${prefix}-FAILED.png` }).catch(() => {})
}

// layout checks on the final screen: dock on screen, no horizontal scroll
const layout = await page.evaluate(() => {
  const d = document.querySelector('[data-testid="dock"]')?.getBoundingClientRect()
  return {
    vw: window.innerWidth,
    vh: window.innerHeight,
    scrollW: document.documentElement.scrollWidth,
    dockBottom: d ? Math.round(d.bottom) : null,
    dockTop: d ? Math.round(d.top) : null,
  }
})
if (layout.scrollW > layout.vw) problems.push(`horizontal scroll: ${layout.scrollW} > ${layout.vw}`)
if (layout.dockBottom === null || layout.dockBottom > layout.vh) problems.push(`dock off screen: ${JSON.stringify(layout)}`)

for (const t of small) problems.push(`touch target under 44px: ${t}`)
console.log(JSON.stringify({ prefix, desktop, keyboard, reduced, textSize, colour, live, steps: steps.join(', '), shots: shots.length, layout }, null, 1))
for (const p of problems) console.log('PROBLEM', p)
await browser.close()
process.exit(problems.length ? 1 : 0)
