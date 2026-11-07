// Node smoke check for the credit engine. Run: node prep-incoming/credit-coach/check.js
const fs = require('fs');
const path = require('path');
const E = require('./engine.js');

const out = r => {
  const s = JSON.parse(E.summary(r));
  return `${s.person.name}, score ${s.person.score}/${s.person.scaleMax}, ${s.factors.length} factors, ${s.plan3m.length} plan steps | "${s.headline}"`;
};

console.log('exports:', Object.keys(E).join(', '));
for (const [id, p] of Object.entries(E.PERSONAS)) {
  const r = E.run(p);
  console.log(`persona ${id}: OK ->`, out(r));
}
for (const f of ['mock-credit-report.json', 'mock-report-mei.json']) {
  const parsed = E.parseReport(JSON.parse(fs.readFileSync(path.join(__dirname, f), 'utf8')));
  const profile = parsed.profile || parsed;
  const r = E.run(profile);
  console.log(`report ${f}: OK ->`, out(r));
}
console.log('ALL OK');
