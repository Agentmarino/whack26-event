// 119: Demo mode starts at text speed 2x (?demo=1 on fresh settings, and the Settings toggle); a speed picked after stays
import { webkit, devices } from 'playwright'
const base = process.argv[2] || 'http://127.0.0.1:5176'
const b = await webkit.launch()
const read = (p) => p.evaluate(() => JSON.parse(localStorage.getItem('whack26.settings.v1') || '{}'))
const out = []
// 1. fresh, ?demo=1
{ const c = await b.newContext({ ...devices['iPhone 15'] }); const p = await c.newPage(); await p.goto(`${base}/?demo=1`); await p.waitForTimeout(1500); const s = await read(p); out.push(['?demo=1 fresh', s.demo === true && s.speed === '2x', JSON.stringify({ demo: s.demo, speed: s.speed })])
  // pick 1x, reload with ?demo=1: stays 1x
  await p.evaluate(() => { const s = JSON.parse(localStorage.getItem('whack26.settings.v1')); s.speed = '1x'; localStorage.setItem('whack26.settings.v1', JSON.stringify(s)) })
  await p.goto(`${base}/?demo=1`); await p.waitForTimeout(1500); const s2 = await read(p); out.push(['?demo=1 again after picking 1x', s2.speed === '1x', s2.speed]); await c.close() }
// 2. the Settings toggle
{ const c = await b.newContext({ ...devices['iPhone 15'] }); const p = await c.newPage(); await p.goto(base); await p.waitForTimeout(1500)
  const s0 = await read(p)
  await p.getByTestId('business-card').waitFor({ state: 'visible', timeout: 15000 }); await p.waitForTimeout(800); await p.locator('[data-action="card-close"]').click(); await p.waitForTimeout(500)
  await p.locator('[data-action="settings"], [aria-label="Settings"]').first().click(); await p.getByTestId('settings-sheet').waitFor({ state: 'visible' })
  await p.locator('label:has([data-testid="toggle-demo"])').click(); await p.waitForTimeout(400); const s1 = await read(p)
  out.push(['toggle on from 1x', s0.speed === '1x' && s1.demo === true && s1.speed === '2x', JSON.stringify({ before: s0.speed, after: s1.speed, demo: s1.demo })])
  const checked = await p.getByTestId('settings-sheet').getByRole('radio', { name: '2x' }).isChecked().catch((e) => e.message.split('\n')[0])
  await p.getByTestId('settings-sheet').getByRole('radio', { name: '2x' }).scrollIntoViewIfNeeded().catch(() => {}); out.push(['sheet shows 2x selected', checked === true, String(checked)])
  await p.screenshot({ path: process.argv[3] || '/tmp/settings-2x.png' })
  await p.locator('label:has([data-testid="toggle-demo"])').click(); await p.waitForTimeout(400); const s3 = await read(p); out.push(['toggle off leaves speed', s3.demo === false && s3.speed === '2x', s3.speed]); await c.close() }
await b.close()
let bad = 0; for (const [n, ok, v] of out) { console.log(`${ok ? 'PASS' : 'FAIL'} ${n}: ${v}`); if (!ok) bad++ }
process.exit(bad ? 1 : 0)
