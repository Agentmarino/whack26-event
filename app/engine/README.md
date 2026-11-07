# Credit engine (from the Credit Coach prototype)

The credit engine Jagt built and tested in the Credit Coach prototype on Sat 7 Nov (after 11:00), copied here unchanged so Mihael can wire it into the build. It follows the plan in the team's credit-engine build plan (rules, Capital One card ladder, decline decoder, what-if).

## Files
| File | What it is |
|---|---|
| `engine.js` | The engine. Plain JavaScript, no dependencies, no DOM. Works in the browser (`window.CreditEngine`) and in Node (`require('./engine.js')`) |
| `index.html` | The prototype page that drives the engine (loads `engine.js` and the two mock reports). Open it through any static server, e.g. `npx serve app/engine` |
| `mock-credit-report.json` | Mock Experian report for **Alex Morgan** (fix my credit) |
| `mock-report-mei.json` | Mock Experian report for **Mei Lin** (international student, build from zero) |
| `check.js` | Node smoke check: runs every persona and both mock reports through the engine |

## What is NOT a separate file (yet)
The build plan names `rules.json`, `cards.json` and `personas/*.json`. They do not exist as separate files. In the prototype they live inside `engine.js`:
- **Rules** (R1, R2, R3 ... with impacts and sources): written as code in `run()`, sources in `SRC`
- **Capital One cards**: the `CARDS` object ("as of 7 Nov 2026")
- **Personas**: the `PERSONAS` object, with **Priya** (maxed card, late payment, declined), **Sam** (student, thin file) and **Dan** (old default, linked to an ex). Priya has no mock report file; she exists only as a persona

Pulling these out into JSON is a follow-up, not done here.

## API (exported as `CreditEngine`)
`run, summary, parseReport, decodeDecline, whatIf, applyChanges, analyse, toJSON, SRC, PERSONAS, CARDS, normalise, fmtDate, fmtMonth, gbp, gbp2, SCALE`

Typical use:
```js
const E = require('./engine.js');
const r = E.run(E.PERSONAS.priya);                       // or E.run(E.parseReport(reportJson))
const s = JSON.parse(E.summary(r));                      // summary() returns a JSON string
```

## Check
```
node app/engine/check.js
```
Expected: one OK line per persona and per mock report, then `ALL OK`.

## Notes
- No API keys, no network calls in `engine.js`. `index.html` loads Google Fonts only.
- All personas and reports are mock data, not real people.
