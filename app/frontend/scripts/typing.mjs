// 118 checks: one message types out continuously and the box scrolls up a line at a time. iPhone 15 (WebKit) or
// --desktop (Chromium 1440x900). Screens to screens/118-<profile>-*.png.
//   node scripts/typing.mjs [--base http://localhost:5173] [--desktop]
// A recorder in the page samples every animation frame while a long line types (data-top, the letters printed, the
// text's transform, the Dock's button, whether the letter being typed is inside the box), so timing is measured, not
// guessed.
import { chromium, devices, webkit } from 'playwright'
import { fileURLToPath } from 'node:url'

const args = process.argv.slice(2)
const opt = (n, d) => (args.includes(`--${n}`) ? args[args.indexOf(`--${n}`) + 1] : d)
const base = opt('base', 'http://localhost:5173')
const desktop = args.includes('--desktop')
const profile = desktop ? 'desktop' : 'iphone'
const out = fileURLToPath(new URL('../screens/', import.meta.url))
const browser = desktop ? await chromium.launch() : await webkit.launch()
const results = []
const ok = (name, pass, detail = '') => results.push({ name: `${profile}: ${name}`, pass: !!pass, detail })

// the longest lines: 6+ on the phone; desktop's wide box tops out at 5 (the decline's fix and reapply lines)
const LONG = desktop ? 5 : 6
const DEVICE = desktop ? { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 } : devices['iPhone 15']
async function open({ settings = {}, reduced = false, query = '', device = DEVICE } = {}) {
  const ctx = await browser.newContext({ ...device, reducedMotion: reduced ? 'reduce' : 'no-preference' })
  await ctx.addInitScript((s) => {
    try {
      localStorage.setItem('whack26.settings.v1', JSON.stringify(s))
    } catch {}
  }, { speed: '1x', demo: false, textSize: 100, readable: false, framing: 'B', ...settings })
  // the text's real line pitch, from its letters' positions (getComputedStyle's line-height ignores font-size-adjust)
  await ctx.addInitScript(() => {
    window.__pitch = (p) => {
      const r = document.createRange()
      let first = null
      for (const span of p.children) {
        const node = span.firstChild
        if (!node) continue
        for (let i = 0; i < node.textContent.length; i++) {
          if (!/\S/.test(node.textContent[i])) continue
          r.setStart(node, i)
          r.setEnd(node, i + 1)
          const top = r.getBoundingClientRect().top
          if (first === null) first = top
          else if (top > first + 4) return top - first
        }
      }
      return parseFloat(getComputedStyle(p).lineHeight)
    }
    window.__ty = (p) => {
      const m = getComputedStyle(p).transform
      return m && m !== 'none' ? parseFloat(m.split(',')[5]) : 0
    }
  })
  const page = await ctx.newPage()
  const errors = []
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
  page.on('pageerror', (e) => errors.push(e.message))
  await page.goto(`${base}/${query}`)
  await page.getByTestId('dock').waitFor()
  const card = page.getByTestId('business-card')
  await card.waitFor({ state: 'visible', timeout: 8000 }).catch(() => {})
  if (await card.isVisible().catch(() => false)) {
    await page.locator('[data-action="card-close"]').click()
    await card.waitFor({ state: 'hidden' })
  }
  return { ctx, page, errors }
}
const box = (page) => page.evaluate(() => {
  const g = document.querySelector('.gbox')
  return g ? { id: g.dataset.messageId, top: Number(g.dataset.top), lines: Number(g.dataset.lines), typed: g.dataset.typed, more: g.dataset.more !== undefined, mode: document.querySelector('[data-testid="dock"]')?.dataset.mode } : null
})
const PREFER = ['Nice to meet you, Cap!', "I've been declined already", 'What can I do?', 'The Balance Transfer card', '3 months', 'Yes, I can', 'No', 'Sum it up for me', 'Make me a plan']
/** Drive the declined branch until a line longer than the box (`min` lines) is on screen; returns its state. */
async function toLongLine(page, min = 4, { typing = true, orNull = false, more = false } = {}) {
  for (let i = 0; i < 300; i++) {
    const b = await box(page)
    if (b?.mode === 'busy' || !b) {
      await page.waitForTimeout(100)
      continue
    }
    if (b.id && b.lines >= min && (!typing || b.typed === 'typing') && (!more || b.more)) return b
    if (b.mode === 'next') await page.locator('[data-action="next"]').click()
    else if (b.mode === 'input') {
      const sample = page.locator('[data-action="sample"]')
      if (await sample.isVisible().catch(() => false)) {
        await sample.click()
        // outside Demo mode the first sample asks whose: Priya, the demo's persona
        const priya = page.locator('[data-persona="priya"]')
        if (await priya.isVisible({ timeout: 800 }).catch(() => false)) await priya.click()
      }
      else {
        let picked = false
        for (const c of PREFER) {
          if (await page.locator(`[data-chip="${c}"]`).isVisible().catch(() => false)) {
            await page.locator(`[data-chip="${c}"]`).click()
            picked = true
            break
          }
        }
        if (!picked) {
          const more = page.locator('[data-action="menu-more"]')
          if (await more.isVisible().catch(() => false)) await more.click()
          else await page.locator('[data-chip]').first().click()
        }
      }
    } else if (b.mode === 'continue') await page.locator('[data-action="continue"]').click()
    await page.waitForTimeout(80)
  }
  if (orNull) return null
  throw new Error(`no line of ${min}+ lines`)
}
/** Record every frame until the line is typed (or `ms`). */
async function record(page, ms = 40000) {
  return page.evaluate((ms) => new Promise((resolve) => {
    const rec = []
    const t0 = performance.now()
    const id = document.querySelector('.gbox')?.dataset.messageId
    const pitch = window.__pitch(document.querySelector('[data-testid="dialogue-text"]'))
    const frame = () => {
      const g = document.querySelector('.gbox')
      const p = document.querySelector('[data-testid="dialogue-text"]')
      const w = document.querySelector('[data-testid="dialogue-window"]')
      const btn = document.querySelector('[data-action="next"]')
      if (!g || !p || !w || g.dataset.messageId !== id) return resolve(rec)
      const printedNode = p.firstElementChild?.firstChild
      const printed = p.firstElementChild?.textContent?.length ?? 0
      let inView = null
      if (printedNode && printed > 0) {
        const r = document.createRange()
        r.setStart(printedNode, printed - 1)
        r.setEnd(printedNode, printed)
        const c = r.getBoundingClientRect()
        const wr = w.getBoundingClientRect()
        // a space at a line's end has no box of its own; only real letters count
        if (c.height && /\S/.test(printedNode.textContent[printed - 1])) inView = c.top >= wr.top - 2 && c.bottom <= wr.bottom + 2
      }
      rec.push({
        t: performance.now() - t0,
        top: Number(g.dataset.top),
        lines: Number(g.dataset.lines),
        typed: g.dataset.typed,
        printed,
        len: p.textContent.length,
        ty: window.__ty(p),
        lh: pitch,
        wh: w.getBoundingClientRect().height,
        btn: btn?.textContent?.trim() ?? null,
        live: document.querySelector('[data-testid="live"]')?.textContent ?? '',
        dur: getComputedStyle(p).transitionDuration,
        inView,
      })
      if (g.dataset.typed === 'done' && rec.filter((f) => f.typed === 'done').length > 20) return resolve(rec)
      if (performance.now() - t0 > ms) return resolve(rec)
      requestAnimationFrame(frame)
    }
    requestAnimationFrame(frame)
  }), ms)
}
const shot = async (page, name) => {
  await page.waitForTimeout(350)
  await page.screenshot({ path: `${out}118-${profile}-${name}.png` })
}

// 1. A long line at 1x: continuous, a line at a time, smooth, typing waits for the scroll, Next only at the end
{
  const { ctx, page, errors } = await open()
  const b = await toLongLine(page, LONG)
  const rec = await record(page)
  const typing = rec.filter((f) => f.typed === 'typing')
  const done = rec.filter((f) => f.typed === 'done')
  const lh = rec[0].lh
  const rows = Math.round(rec[0].wh / lh)
  const steps = []
  for (let i = 1; i < rec.length; i++) if (rec[i].top !== rec[i - 1].top) steps.push({ i, from: rec[i - 1].top, to: rec[i].top, t: rec[i].t })
  ok('a long line types continuously: no Next while it types (the button says Show all)', typing.length > 20 && typing.every((f) => f.btn === 'Show all'), `${b.id}, ${b.lines} lines, ${typing.length} typing frames, buttons ${[...new Set(typing.map((f) => f.btn))].join('/')}`)
  ok('the box shows its usual lines (3) and scrolls one line at a time to the end', rows === 3 && steps.length >= 1 && steps.every((s) => s.to - s.from === 1) && done.at(-1)?.top === b.lines - rows, `rows ${rows}, steps ${steps.map((s) => `${s.from}->${s.to}`).join(' ')}, end top ${done.at(-1)?.top}/${b.lines}`)
  // smooth: each step eases over about 150 ms (intermediate transforms), ending exactly on the line
  const anims = steps.map((s) => {
    const target = -s.to * lh
    const after = rec.slice(s.i)
    const settled = after.find((f) => Math.abs(f.ty - target) < 0.5)
    const mid = after.filter((f) => f.t < (settled?.t ?? Infinity) && Math.abs(f.ty - target) >= 0.5 && Math.abs(f.ty + s.from * lh) >= 0.5)
    return { ms: settled ? Math.round(settled.t - s.t) : null, mid: mid.length, dur: rec[s.i].dur }
  })
  ok('each scroll is smooth, about 150 ms', anims.every((a) => a.dur === '0.15s' && a.ms !== null && a.ms >= 80 && a.ms <= 320 && a.mid >= 1), anims.map((a) => `${a.ms}ms/${a.mid}f/${a.dur}`).join(' '))
  // typing waits for the scroll: no new letter in the first 100 ms of a step
  const held = steps.map((s) => {
    const p0 = rec[s.i].printed
    return rec.slice(s.i).filter((f) => f.t - s.t < 100).every((f) => f.printed <= p0 + 1)
  })
  ok('typing waits while the box scrolls (no letters in the first 100 ms)', held.every(Boolean), held.join(' '))
  // the letter being typed is always inside the box once a scroll has settled
  const settledFrames = typing.filter((f) => f.inView !== null && Math.abs(f.ty + f.top * lh) < 0.5)
  ok('the letter being typed is always in view (it never types below the box)', settledFrames.length > 10 && settledFrames.every((f) => f.inView), `${settledFrames.filter((f) => !f.inView).length} of ${settledFrames.length} frames out of view`)
  ok('Next shows once the whole line has typed', done.length > 0 && done.at(-1).btn?.startsWith('Next') !== false && done.at(-1).printed === done.at(-1).len, `after: ${done.at(-1)?.btn}`)
  ok('screen readers get the whole line at once while it types', typing.length > 0 && typing.every((f) => f.live.endsWith(f.live.includes('says: ') ? f.live.split('says: ')[1] : '') && f.live.length >= f.len), `${typing[0]?.live.slice(0, 50)}…`)
  await shot(page, 'typed-end')
  ok('no console errors (1)', errors.length === 0, errors.join(' | '))
  await ctx.close()
}

// 2. A tap while typing finishes the line at once, scrolled to its end
{
  const { ctx, page } = await open()
  const b = await toLongLine(page, LONG)
  // wait for the first scroll, then tap the text (at least two lines from the end: a real jump)
  for (let i = 0; i < 100 && (await box(page)).top < 1; i++) await page.waitForTimeout(50)
  await page.locator('[data-testid="dialogue-window"]').click()
  const after = await page.evaluate(() => {
    const g = document.querySelector('.gbox')
    const p = document.querySelector('[data-testid="dialogue-text"]')
    return { typed: g.dataset.typed, top: Number(g.dataset.top), lines: Number(g.dataset.lines), printed: p.firstElementChild.textContent.length, len: p.textContent.length, dur: getComputedStyle(p).transitionDuration, ty: window.__ty(p), lh: window.__pitch(p) }
  })
  ok('a tap while typing finishes the line at once, scrolled to its end (already there: no animation)', after.typed === 'done' && after.printed === after.len && after.top === after.lines - 3 && Math.abs(after.ty + after.top * after.lh) < 0.5, JSON.stringify({ id: b.id, ...after }))
  await shot(page, 'tap-finished')
  // Space: the next line
  await page.evaluate(() => (document.activeElement instanceof HTMLElement ? document.activeElement.blur() : null))
  await page.keyboard.press('Space')
  await page.waitForTimeout(400)
  const next = await box(page)
  ok('then Space goes on to the next line', next?.id !== b.id, `${b.id} -> ${next?.id}`)
  await ctx.close()
}

// 3. Reduced motion: the whole line at once; tap and arrow keys scroll it, with the indicator; a tap at the end goes on
{
  const { ctx, page, errors } = await open({ reduced: true })
  // a line with more after it, so its Next button and "a tap at the end goes on" are both exercised
  const b = await toLongLine(page, 4, { typing: false, more: true })
  const s0 = await page.evaluate(() => {
    const p = document.querySelector('[data-testid="dialogue-text"]')
    const ind = document.querySelector('[data-testid="scroll-indicator"]')
    return { printed: p.firstElementChild.textContent.length, len: p.textContent.length, ind: !!ind && getComputedStyle(ind).display !== 'none', upOff: !!ind?.querySelector('.is-off') }
  })
  const g0 = await box(page)
  ok('reduced motion: the whole line at once, from its top, with a scroll indicator', s0.printed === s0.len && g0.top === 0 && g0.typed === 'done' && s0.ind && s0.upOff, JSON.stringify({ id: b.id, ...s0, top: g0.top, lines: g0.lines }))
  await shot(page, 'reduced-top')
  await page.evaluate(() => (document.activeElement instanceof HTMLElement ? document.activeElement.blur() : null))
  await page.keyboard.press('ArrowDown')
  const g1 = await box(page)
  await page.keyboard.press('ArrowUp')
  const g2 = await box(page)
  ok('reduced motion: the down and up arrow keys scroll it a line', g1.top === 1 && g2.top === 0, `${g0.top} -> ${g1.top} -> ${g2.top}`)
  // the Dock's button says More while lines are below the box, scrolls on without leaving the line, then says Next
  const label = () => page.locator('[data-action="next"]').textContent().then((t) => t.trim()).catch(() => null)
  const l0 = await label()
  await page.locator('[data-action="next"]').click()
  const gm = await box(page)
  const l1 = await label()
  ok('reduced motion: the big button says More while lines are below, scrolls on a box-full, then says Next', l0 === 'More' && gm.id === b.id && gm.top === Math.min(3, g0.lines - 3) && (gm.top < g0.lines - 3 || l1 === 'Next'), `${l0} -> top ${gm.top}/${gm.lines} -> ${l1}`)
  for (let i = 0; i < 6; i++) await page.keyboard.press('ArrowUp')
  await page.locator('[data-testid="dialogue-window"]').click()
  const g3 = await box(page)
  ok('reduced motion: a tap scrolls on a box-full (never past the end)', g3.top === Math.min(3, g0.lines - 3) && g3.id === b.id, `top ${g3.top} of ${g3.lines}`)
  await shot(page, 'reduced-scrolled')
  for (let i = 0; i < 10 && (await box(page)).top < g0.lines - 3; i++) await page.locator('[data-testid="dialogue-window"]').click()
  const g4 = await box(page)
  const indEnd = await page.evaluate(() => document.querySelector('[data-testid="scroll-indicator"]')?.firstElementChild?.classList.contains('is-off'))
  ok('reduced motion: at the end the indicator shows the top is above', g4.top === g0.lines - 3 && indEnd === false, `top ${g4.top}, up arrow lit ${indEnd === false}`)
  if (g4.mode === 'next') {
    await page.locator('[data-testid="dialogue-window"]').click()
    await page.waitForTimeout(300)
    const g5 = await box(page)
    ok('reduced motion: a tap at the end goes on', g5?.id !== b.id, `${b.id} -> ${g5?.id}`)
    // the tapped window had focus: it keeps it on the next line (a keyboard user's next Tab goes on from there)
    const focus = await page.evaluate(() => document.activeElement?.dataset.testid ?? document.activeElement?.tagName)
    ok('focus stays on the text when the next line comes in (not dropped to the page)', focus === 'dialogue-window', `focus: ${focus}`)
  } else ok('reduced motion: a tap at the end goes on (choices are up: nothing to go on to)', true, `mode ${g4.mode}`)
  ok('no console errors (3)', errors.length === 0, errors.join(' | '))
  await ctx.close()
}

// 4. Text size and Readable font: the window holds whole lines, the measured lines match the layout, the box fits
for (const [label, settings] of [['125%', { textSize: 125 }], ['150%', { textSize: 150 }], ['Readable font', { readable: true }], ['150% Readable', { textSize: 150, readable: true }]]) {
  const { ctx, page, errors } = await open({ settings, reduced: true })
  const b = await toLongLine(page, 4, { typing: false, orNull: true })
  if (!b) {
    // nothing on the declined branch is longer than the box at this size: check every line fits instead
    const fit = await page.evaluate(() => {
      const g = document.querySelector('.gbox')
      return { boxOver: g.scrollHeight - g.clientHeight, boxBottom: Math.round(g.getBoundingClientRect().bottom), vh: window.innerHeight }
    })
    await shot(page, `text-${label.replace(/[^a-z0-9]+/gi, '').toLowerCase()}`)
    ok(`${label}: no line on the declined branch is longer than the box here (nothing to scroll); the box fits`, fit.boxOver <= 1 && fit.boxBottom <= fit.vh, JSON.stringify(fit))
    ok(`no console errors (${label})`, errors.length === 0, errors.join(' | '))
    await ctx.close()
    continue
  }
  const m = await page.evaluate(() => {
    const g = document.querySelector('.gbox')
    const p = document.querySelector('[data-testid="dialogue-text"]')
    const w = document.querySelector('[data-testid="dialogue-window"]')
    const lh = window.__pitch(p)
    const hud = document.querySelector('.game__hud').getBoundingClientRect()
    return { lh, rows: w.getBoundingClientRect().height / lh, layoutLines: p.getBoundingClientRect().height / lh, measured: Number(g.dataset.lines), boxOver: g.scrollHeight - g.clientHeight, boxBottom: Math.round(g.getBoundingClientRect().bottom), vh: window.innerHeight, hudTop: Math.round(hud.top), font: document.querySelector('.game').dataset.font }
  })
  // scroll to the end with the keyboard and check the last line is fully in view
  await page.evaluate(() => (document.activeElement instanceof HTMLElement ? document.activeElement.blur() : null))
  for (let i = 0; i < 20; i++) await page.keyboard.press('ArrowDown')
  const end = await page.evaluate(() => {
    const p = document.querySelector('[data-testid="dialogue-text"]')
    const w = document.querySelector('[data-testid="dialogue-window"]').getBoundingClientRect()
    const node = p.lastElementChild.firstChild ?? p.firstElementChild.firstChild
    const r = document.createRange()
    r.setStart(node, node.textContent.length - 1)
    r.setEnd(node, node.textContent.length)
    const c = r.getBoundingClientRect()
    return { lastIn: c.top >= w.top - 1 && c.bottom <= w.bottom + 1, top: Number(document.querySelector('.gbox').dataset.top) }
  })
  await shot(page, `text-${label.replace(/[^a-z0-9]+/gi, '').toLowerCase()}`)
  ok(
    `${label}: whole lines in the box, measured lines match the layout, scrolls to the last line, the box fits`,
    Math.abs(m.rows - Math.round(m.rows)) < 0.02 && Math.round(m.rows) === 3 && Math.abs(m.layoutLines - m.measured) < 0.05 && end.lastIn && end.top === m.measured - 3 && m.boxOver <= 1 && m.boxBottom <= m.vh,
    JSON.stringify({ id: b.id, ...m, rows: +m.rows.toFixed(3), layoutLines: +m.layoutLines.toFixed(3), endTop: end.top }),
  )
  ok(`no console errors (${label})`, errors.length === 0, errors.join(' | '))
  await ctx.close()
}

// 5. The speech bubble (a short landscape screen) scrolls the same way (phone only: the bubble is the phone's fallback)
if (!desktop) {
  const land = { ...devices['iPhone 15 landscape'], viewport: { width: 734, height: 343 } }
  const { ctx, page, errors } = await open({ device: land })
  const b = await toLongLine(page)
  const inBubble = await page.evaluate(() => !!document.querySelector('[data-testid="speech-bubble"] [data-testid="dialogue-window"]'))
  const rec = await record(page)
  const tops = [...new Set(rec.map((f) => f.top))]
  const settled = rec.filter((f) => f.typed === 'typing' && f.inView !== null && Math.abs(f.ty + f.top * f.lh) < 0.5)
  ok('the speech bubble types and scrolls the same way', inBubble && tops.length >= 2 && tops.every((t, i) => i === 0 || t - tops[i - 1] === 1) && settled.every((f) => f.inView) && rec.at(-1).top === b.lines - 3, `${b.id}: tops ${tops.join(',')}, ${settled.length} settled frames all in view`)
  await shot(page, 'bubble')
  ok('no console errors (5)', errors.length === 0, errors.join(' | '))
  await ctx.close()
}

// 6. Demo mode: types the whole line first, then waits a reading pause for its length (250 ms a word, at least 1.2 s)
{
  const { ctx, page, errors } = await open({ settings: { demo: true }, query: '?demo=1' })
  // a long line with more after it (a line that ends the turn on choices rightly holds)
  const b = await toLongLine(page, 4, { more: true })
  const words = (await page.locator('[data-testid="dialogue-text"]').textContent()).split(/\s+/).filter(Boolean).length
  const t = await page.evaluate((id) => new Promise((resolve) => {
    let doneAt = null
    const t0 = performance.now()
    const tick = () => {
      const g = document.querySelector('.gbox')
      if (g?.dataset.messageId === id && g.dataset.typed === 'done' && doneAt === null) doneAt = performance.now()
      if (g?.dataset.messageId !== id) return resolve({ doneAt: doneAt && doneAt - t0, leftAt: performance.now() - t0, windowUp: !!document.querySelector('[data-testid="data-window"]') })
      if (performance.now() - t0 > 90000) return resolve({ doneAt: doneAt && doneAt - t0, leftAt: null })
      requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }), b.id)
  const pause = Math.max(1200, 250 * words)
  const waited = t.leftAt !== null && t.doneAt !== null ? t.leftAt - t.doneAt : null
  ok('Demo mode: the whole line types, then a reading pause for its length, then it moves on', t.doneAt !== null && t.doneAt > 400 && waited !== null && waited >= pause - 100 && waited <= Math.max(pause, 2500) + 1500, `${b.id}: typed in ${Math.round(t.doneAt)} ms, then waited ${Math.round(waited)} ms (pause for ${words} words: ${pause} ms)`)
  ok('no console errors (6)', errors.length === 0, errors.join(' | '))
  await ctx.close()
}

await browser.close()
for (const r of results) console.log(`${r.pass ? 'PASS' : 'FAIL'}  ${r.name}${r.detail ? `  [${r.detail}]` : ''}`)
const failed = results.filter((r) => !r.pass).length
console.log(failed ? `${failed} failed` : `all ${results.length} passed`)
process.exit(failed ? 1 : 0)
