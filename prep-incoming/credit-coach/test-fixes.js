// Quick tests for the two engine fixes (partner/engine-fixes). Run: node prep-incoming/credit-coach/test-fixes.js
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const E = require('./engine.js');

let n = 0;
const ok = (name, fn) => { fn(); n++; console.log('ok', name); };

const reports = ['mock-credit-report.json', 'mock-report-mei.json'].map(f => E.parseReport(JSON.parse(fs.readFileSync(path.join(__dirname, f), 'utf8'))).profile);
const profiles = Object.values(E.PERSONAS).concat(reports);
const levers = [
  [{ lever: 'electoralRoll' }], [{ lever: 'removeAssociates' }], [{ lever: 'clearCard' }],
  [{ lever: 'stop', what: 'bnpl' }], [{ lever: 'stop', what: 'gambling' }], [{ lever: 'stop', what: 'payday' }],
  [{ lever: 'rentReporting', value: true }], [{ lever: 'rentReporting', value: false }],
  [{ lever: 'paydown', value: 100 }], [{ lever: 'paydown', value: 300 }], [{ lever: 'paydown', value: 400 }],
  [{ lever: 'paydown', value: 400 }, { lever: 'stop', what: 'bnpl' }, { lever: 'electoralRoll' }, { lever: 'clearCard' }],
];
const START = { start: '2026-11-09' };

// Bug 1: a what-if lever is extra action on top of the plan, so it never lowers the estimate
ok('what-if levers never lower the 3m or 6m estimate (5 profiles x 12 lever sets)', () => {
  for (const p of profiles) for (const ch of levers) {
    const w = E.whatIf(p, ch, START);
    for (const k of ['m3', 'm6']) for (const b of ['low', 'high'])
      assert(w.delta[k][b] >= 0, `${p.name} ${JSON.stringify(ch)} ${k}.${b} = ${w.delta[k][b]}`);
  }
});
ok('Priya: plan-included levers are 0 and say so', () => {
  for (const ch of [[{ lever: 'electoralRoll' }], [{ lever: 'stop', what: 'bnpl' }]]) {
    const w = E.whatIf(E.PERSONAS.priya, ch, START);
    assert.deepStrictEqual([w.delta.m3, w.delta.m6], [{ low: 0, high: 0 }, { low: 0, high: 0 }]);
    assert(/already in your plan/.test(w.applied.join(' ')), w.applied.join(' '));
  }
});
ok('Priya: paying £400 a month or clearing the card now raises the 3-month estimate', () => {
  for (const ch of [[{ lever: 'paydown', value: 400 }], [{ lever: 'clearCard' }]]) {
    const w = E.whatIf(E.PERSONAS.priya, ch, START);
    assert(w.delta.m3.low > 0 && w.delta.m3.high > 0, JSON.stringify(w.delta));
  }
});

// Bug 2: thin-file headline only for a thin file
const THIN = /very little of it/;
ok('Priya (one 2-year-old card, late payment, searches) does not get the thin-file headline', () => {
  const h = E.run(E.PERSONAS.priya, START).headline;
  assert(!THIN.test(h), h);
  assert(/holding you back/.test(h), h);
});
ok('Sam (no credit) and Mei (new to the UK) still get the thin-file headline', () => {
  assert(THIN.test(E.run(E.PERSONAS.sam, START).headline));
  assert(THIN.test(E.run(reports[1], START).headline));
});

console.log(`ALL ${n} TESTS PASS`);
