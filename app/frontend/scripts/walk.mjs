// 114/115 verification: walk a branch from Cap's card to the plan and a what-if, screenshotting every step and card.
// Playwright WebKit with the iPhone 15 profile (393x659, dpr 3, touch) unless --desktop.
//
//   node scripts/walk.mjs [--base http://localhost:5173] [--branch declined|report|prepare|new] [--desktop] [--keyboard]
//                         [--reduced] [--text 150] [--colour okabe|contrast] [--readable] [--prefix name] [--live] [--cardshots]
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
// 116: Readable font (VT323 in the box instead of Press Start 2P)
const readable = flag('readable')
const live = flag('live')
const branch = opt('branch', 'declined')
const cardShots = flag('cardshots')
const prefix = opt('prefix', `${desktop ? 'desktop' : 'iphone'}-${branch}`)
const outDir = opt('out', fileURLToPath(new URL('../screens/', import.meta.url))).replace(/\/?$/, '/')
mkdirSync(outDir, { recursive: true })

const browser = desktop ? await chromium.launch() : await webkit.launch()
const context = await browser.newContext({
  ...(desktop ? { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 } : devices['iPhone 15']),
  reducedMotion: reduced ? 'reduce' : 'no-preference',
})
// Settings before the app loads: instant text so the walk is quick (the typewriter is checked separately).
await context.addInitScript(
  ({ textSize, colour, readable }) => {
    try {
      localStorage.setItem(
        'whack26.settings.v1',
        JSON.stringify({ speed: 'instant', demo: false, textSize, colour, plainEnglish: false, readAloud: false, voiceRate: 1, readable }),
      )
    } catch {}
  },
  { textSize, colour, readable },
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

/** Tap Next through the queued messages (and 116: the pages of a long line), screenshotting each card once. */
let whyDone = false
const seen = new Set()
async function drain(label) {
  for (let i = 0; i < 80; i++) {
    const m = await settle()
    if (m !== 'next') return m
    // 116: the dialogue box carries the current line's kind and id itself
    const cur = page.locator('.gbox[data-current]')
    const kind = await cur.getAttribute('data-kind', { timeout: 500 }).catch(() => null)
    const id = await cur.getAttribute('data-message-id', { timeout: 500 }).catch(() => null)
    const first = id && !seen.has(id)
    if (id) seen.add(id)
    if (first && kind && kind !== 'text') await shot(`${label}-${kind}-${id}`)
    else if (first && /decline|flags|headline/.test(id)) await shot(`${label}-${id}`)
    // 116: a reason's item window has Why?: open the because-trail once
    if (kind === 'reason' && !whyDone && (await page.locator('[data-testid="data-window"] [data-action="why"]').count())) {
      whyDone = true
      await press(page.locator('[data-testid="data-window"] [data-action="why"]'), 'Why?')
      await page.getByTestId('why-sheet').waitFor({ state: 'visible' })
      await shot('why-drawer')
      await page.keyboard.press('Escape')
      await page.getByTestId('why-sheet').waitFor({ state: 'hidden' })
    }
    if (keyboard) {
      // Space outside a control is "next"; inside the dock, Enter on the Next button does it.
      await press(page.locator('[data-action="next"]'), 'Next')
    } else await page.locator('[data-action="next"]').click()
  }
  throw new Error(`stuck in ${label}`)
}

const chip = (text) => page.locator(`[data-chip="${text}"]`)
const action = (a) => page.locator(`[data-action="${a}"]`)
/** 116: menus page ("More"): page on until `locator` shows. True if it does. */
async function reveal(locator) {
  await page.waitForTimeout(100)
  for (let p = 0; p < 8; p++) {
    if (await locator.first().isVisible().catch(() => false)) return true
    if (!(await action('menu-more').isVisible().catch(() => false))) break
    await press(action('menu-more'), 'More')
  }
  await firstPage()
  return false
}
/** Back to the menu's first page (the last page has "Back"). */
async function firstPage() {
  if (await action('menu-back').isVisible().catch(() => false)) await press(action('menu-back'), 'Back')
}
/** 116: the chips on every page of the menu (pages through with More, then back to page 1). */
async function allChips() {
  await page.waitForTimeout(100)
  await firstPage()
  const all = []
  for (let p = 0; p < 8; p++) {
    all.push(...(await page.locator('[data-chip]').evaluateAll((els) => els.map((e) => e.getAttribute('data-chip')))))
    if (!(await action('menu-more').isVisible().catch(() => false))) break
    await press(action('menu-more'), 'More')
  }
  if (await action('menu-back').isVisible().catch(() => false)) await press(action('menu-back'), 'Back')
  return all
}
const steps = []
const step = async () => {
  const s = await page.locator('.game').getAttribute('data-step')
  if (steps[steps.length - 1] !== s) steps.push(s)
  return s
}

// 115: the branch to walk, and its persona. declined is the demo path (Priya with her letter).
const BRANCH_CHIP = {
  declined: "I've been declined already",
  report: "I've got a credit report I want help with",
  prepare: 'I want to get ready before I apply',
  new: "I'm new to credit or new to the UK",
}
const PERSONA = { declined: 'priya', report: 'priya', prepare: 'priya', new: 'mei' }
// Chips the walk prefers when they are offered (the demo path); otherwise the first chip.
const PREFER = [
  BRANCH_CHIP[branch], 'Nice to meet you, Cap!', 'What can I do?', 'The Balance Transfer card', 'Capital One Classic', 'The Classic card',
  "I'm new to the UK", 'Under 6 months', '3 months', 'Yes, I can', 'No', 'Tell me about the letter', 'Got it', 'Sum it up for me', 'Make me a plan',
]

/** The business card overlay (115): screenshot it growing, then put it away. */
async function businessCard() {
  const card = page.getByTestId('business-card')
  if (cardShots) {
    await shot('card-start')
    await page.waitForTimeout(700)
    await page.screenshot({ path: `${outDir}${prefix}-${String(++n).padStart(2, '0')}-card-mid.png` })
    shots.push('card-mid')
  }
  await card.waitFor({ state: 'visible', timeout: 8000 })
  await page.waitForTimeout(reduced ? 150 : 900)
  await shot('card-full')
  if (keyboard) await page.keyboard.press('Escape')
  else await press(action('card-close'), 'put the card away')
  await card.waitFor({ state: 'hidden', timeout: 4000 })
}

/** Use a sample, picking the branch's persona when the picker opens. */
async function useSample(label) {
  await press(action('sample'), `sample ${label}`)
  const picker = page.getByTestId('persona-sheet')
  if (await picker.isVisible().catch(() => false)) {
    await press(page.locator(`[data-persona="${PERSONA[branch]}"]`), PERSONA[branch])
  }
}

try {
  await page.goto(`${base}/${live ? '?mock=off' : ''}`)
  await page.getByTestId('dock').waitFor()
  await businessCard()
  await settle()
  await step()
  let plans = 0
  let whatIf = false
  const done = new Set()
  for (let i = 0; i < 80; i++) {
    const m = await drain(`t${i}`)
    const s = await step()
    if (m === 'continue') {
      await press(action('continue'), 'Continue')
      await settle()
      continue
    }
    if (m !== 'input') break
    // One-off extras on the way, as a person would: the Why? drawer, the paper, the opening chips.
    if (s === 'opening' && !done.has('opening')) {
      done.add('opening')
      await shot('opening-chips')
    }
    if (s === 'paper' && !done.has('paper')) {
      done.add('paper')
      await page.waitForTimeout(reduced ? 100 : 1800) // the sheet slides across the desk
      if (keyboard) await press(action('open-paper'), 'Read it')
      else await page.locator('[data-npc-hotspot="paper"]').click()
      await page.getByTestId('paper-sheet').waitFor({ state: 'visible' })
      await shot('paper-overlay')
      await page.keyboard.press('Escape')
      await page.getByTestId('paper-sheet').waitFor({ state: 'hidden' })
    }
    const mode = await dock.getAttribute('data-expects').catch(() => null)
    if (await reveal(action('sample'))) {
      await shot(`${s}`)
      await useSample(s)
      await settle()
      continue
    }
    const chips = await allChips()
    if (s === 'coach' && chips.includes('3 months') && plans === 0) {
      plans++
      await shot('coach-choose')
      await reveal(chip('3 months'))
      await press(chip('3 months'), 'plan 3 months')
      await settle()
      continue
    }
    if (s === 'coach' && plans > 0) {
      if (!whatIf && chips.length) {
        whatIf = true
        await shot('plan-end')
        await reveal(chip(chips[0]))
        await press(chip(chips[0]), 'what-if chip')
        await settle()
        await drain('whatif')
        await shot('whatif')
      }
      // 116: the notebook, both tabs, then closed again
      await press(action('panel'), 'notebook')
      await page.getByTestId('side-panel').waitFor({ state: 'visible' })
      await page.waitForTimeout(reduced ? 50 : 400)
      await shot('panel-chat')
      await press(action('tab-plan'), 'Your plan')
      await shot('panel-plan')
      await page.keyboard.press('Escape')
      await page.waitForTimeout(reduced ? 50 : 400)
      break
    }
    if (chips.length) {
      const pick = PREFER.find((c) => chips.includes(c)) ?? chips[0]
      await reveal(chip(pick))
      await shot(`${s}-${pick.replace(/[^a-z0-9]+/gi, '-').toLowerCase().slice(0, 24)}`)
      await press(chip(pick), pick)
      await settle()
      continue
    }
    // Text with no chips (a typed answer).
    const box = page.locator('#reply-box')
    if (!(await box.count()) && (await reveal(action('type-own')))) await press(action('type-own'), 'Type my own')
    if (await box.count()) {
      await box.fill(['31', 'about 28k', 'a car'][i % 3])
      await press(action('send'), 'Send')
      await settle()
      continue
    }
    problems.push(`no way forward at step ${s} (dock mode ${mode})`)
    break
  }
  await step()
} catch (e) {
  problems.push(`walk failed: ${e.message.split('\n')[0]}`)
  await page.screenshot({ path: `${outDir}${prefix}-FAILED.png` }).catch(() => {})
  // 116: what the dialogue box looked like (its room, its content, the menu's page)
  const box = await page
    .evaluate(() => {
      const g = document.querySelector('.gbox')
      const h = document.querySelector('.game__hud')
      return g && h
        ? { box: [g.offsetTop, g.offsetHeight, g.clientHeight, g.scrollHeight], hudMax: h.style.maxHeight, rowsFit: g.dataset.rowsFit, page: g.dataset.page, menu: document.querySelector('.gmenu')?.dataset.menuPage, rows: document.querySelectorAll('.mrow').length, kids: [...g.children].map((c) => `${String(c.className || c.tagName).split(' ')[0]}:${c.offsetHeight}`) }
        : null
    })
    .catch(() => null)
  console.log('box at failure', JSON.stringify(box))
  console.log(e.message.split('\n').slice(0, 14).join('\n'))
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
console.log(JSON.stringify({ prefix, branch, desktop, keyboard, reduced, textSize, colour, live, steps: steps.join(', '), shots: shots.length, layout }, null, 1))
for (const p of problems) console.log('PROBLEM', p)
await browser.close()
process.exit(problems.length ? 1 : 0)
