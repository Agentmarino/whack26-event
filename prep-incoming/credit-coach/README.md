# Credit Coach engine (incoming, handoff 07)

Jag's credit engine from the Credit Coach prototype, built 2026-11-07 during the event. `engine.js` is copied unchanged and is meant to be the backend's brain. Not shipped from here: Mihael's build reads it from this folder. No API keys, no `.env`, no network calls in `engine.js`.

## Files
| File | What it is |
|---|---|
| `engine.js` | The engine. Plain JavaScript, no dependencies, no DOM. Browser: `window.CreditEngine`. Node: `require('./engine.js')` |
| `index.html` | Prototype UI that drives the engine (loads `engine.js` and the two mock reports by these file names). For ideas only. Serve the folder statically to open it, e.g. `npx serve .`. Loads Google Fonts |
| `mock-credit-report.json` | Mock Experian report, `credit-coach-report/v1`: **Alex Morgan**, 682/999, 2 cards at 76%, a late payment, 2 hard searches, bank data, a Capital One decline letter |
| `mock-report-mei.json` | Mock Experian report, `credit-coach-report/v1`: **Mei Lin**, 455/999, international student 4 months in the UK, no credit accounts, a phone contract decline |
| `personas/priya.json`, `personas/sam.json`, `personas/dan.json` | `Profile` objects exported verbatim from `PERSONAS` in `engine.js` (added for this handoff so the check runs; `engine.js` stays the source) |
| `check.js` | Smoke check: every persona and both reports through the engine |

### No `rules.json` or `cards.json`
The build plan names `rules.json`, `cards.json` and `personas/*.json`. Rules and cards were never split out; they live inside `engine.js`:
- **Rules** (R1, R2, R3 ..., C1 ...): code in `run()`. Each step carries a `because` with rule id, data point, source and points source. Sources are in `SRC`. Our assumptions are labelled `SRC.ours` ("Our assumption (tunable in rules)") or "Our assumption: ..." in the points text, **in `engine.js`, not in a rules.json** (the disclosure line says rules.json; this is where they really are)
- **Capital One cards**: the `CARDS` object ("as of 7 Nov 2026")
- **Personas**: the `PERSONAS` object (exported to `personas/` here)

## Exports (`CreditEngine`)
| Function | Signature | Returns |
|---|---|---|
| `analyse` | `analyse(input, opts?)` | Main entry. `input` is a `credit-coach-report/v1` report (detected by `accounts`) or a `Profile`. Returns plain JSON `{ profile, findings, result, decline }`. `findings` is `{report, bank, letter}` lists for reports, else null |
| `run` | `run(profile, opts?)` | Raw result (Date objects inside): `headline`, `diagnosis` (`ranked` factors with RAG, `flags`, `declineWhy`), `cash`, `sim` (paydown), `plans['3m'|'6m']` (`steps`, `projection`), `contributions`, `ladder` (Capital One), `riskLine`, `build`, `profile`, `bureau`, `scaleMax` |
| `whatIf` | `whatIf(profile, changes, opts?)` | `{ applied, before, after, delta: {m3, m6}, because: {effectChanges, stepsAdded, stepsRemoved, under30, nextCard}, result, profile }` |
| `applyChanges` | `applyChanges(profile, changes)` | `{ profile, applied }`. `changes` items: `{lever:'paydown', value}`, `{lever:'stop', what:'bnpl'|'gambling'|'payday'}`, `{lever:'electoralRoll', value?}`, `{lever:'removeAssociates'}`, `{lever:'clearCard', card?}`, `{lever:'rentReporting', value}`, `{lever:'set', path:'bank.rent', value}` |
| `decodeDecline` | `decodeDecline(runResult)` | Why the last decline probably happened, or null if `profile.decline` is empty |
| `parseReport` | `parseReport(reportJson)` | `{ profile, found }`. Throws if the JSON isn't a report |
| `summary` | `summary(runResult)` | A **JSON string** (parse it) sized for a Claude prompt: person, headline, factors, flags, plans, projections, Capital One ladder, decline decoded |
| `normalise` | `normalise(profile)` | Profile with all defaults filled (partial profiles from chat still run) |
| `toJSON` | `toJSON(x)` | Clean JSON copy (dates as ISO strings) |
| Data/helpers | `PERSONAS`, `CARDS`, `SRC`, `SCALE` (`experian 999, equifax 1000, transunion 710`), `fmtDate`, `fmtMonth`, `gbp`, `gbp2` | |

`opts.start` sets the plan start date (default: next Monday).

## Input formats
**`credit-coach-report/v1`** (see the two mock reports): top-level `format, note, provider, reportDate, score {value, scaleMax, band}, personal {name, dateOfBirth, declaredIncome, employment, residentialStatus, student?, newToUK?, ukSince?, canRegisterToVote?}, addresses[], electoralRoll[], accounts[] (type credit_card | current_account | current_account_overdraft | communications | ..., lender, opened, status, limit, balance, apr, directDebit, paymentPattern, paymentHistory[]), searches[] (hard/soft), publicRecords, defaults, financialAssociates, declineLetters[], bankData`.

**`Profile`** (what `run` takes; every field optional, defaults from `normalise`):
```
name, age, grossIncome, netIncome (monthly), housing, goal ('build'|'card'|'mortgage'),
bureau ('experian'|'equifax'|'transunion'), score,
cards[{name, limit, balance, apr, minOnly, hasDD, openedYears}], loans[{name, monthly, openedYears}],
lates[{account, monthsAgo}], defaults[{account, monthsAgo}], ccjs[], searches[monthsAgo...],
electoralRoll, addresses3y, staleAssociates[], oldestAccountYears, errorsOnReport[],
decline {lender, productId, monthsAgo, product?, agency?, statedReason?}, paydownOverride,
student, newToUK, ukMonths, canRegisterToVote, hasPhoneContract,
bank {rent, rentByTransfer, councilTax, bills[{name, amount}], subscriptions[{name, amount}], groceries,
      transport, bnpl, gambling, payday, cashAdvances, savings, lateFees3m, overdraftDays3m, billsInOwnName}
```

## Main demo persona
The build plan's worked example (section 8) is **Priya**: 23, renting, Barclaycard £950 of £1,200 at 29.9% paying minimums, late in July, not on the electoral roll, 3 recent hard searches, £40/month BNPL, declined by Capital One a month ago. The prototype UI's upload demo uses **Alex** and **Mei** reports instead. Jag to confirm which one leads the pitch.

Fields that drive the best moments for Priya:
- `decline` → `decodeDecline`: why Capital One said no (late in 12 months, recent search, utilisation over 30%)
- `cards[0].balance/limit` (79%) and `bank` → paydown of £175 then £215/month and the month she crosses 30%
- `electoralRoll: false` → "Register to vote" step
- `bank.bnpl` → spending flag; what-if `{lever:'stop', what:'bnpl'}`
- `lates`, `searches` → when she can next apply (Capital One ladder `graduateWhen`)

## Run it
```
cd prep-incoming/credit-coach && node -e "const E=require('./engine.js'); const r=E.analyse(require('./personas/priya.json')); console.log(Object.keys(r), r.result && r.result.headline)"
node prep-incoming/credit-coach/check.js    # from the repo root
```

## Check
Real output, 2026-11-07, Node v22.23.3:
```
$ node -e "const E=require('./engine.js'); const r=E.analyse(require('./personas/priya.json')); console.log(Object.keys(r), r.result && r.result.headline)"
[ 'profile', 'findings', 'result', 'decline' ] You don't have bad credit, you have very little of it. This plan builds it from zero.

$ node prep-incoming/credit-coach/check.js
exports: run, summary, parseReport, decodeDecline, whatIf, applyChanges, analyse, toJSON, SRC, PERSONAS, CARDS, normalise, fmtDate, fmtMonth, gbp, gbp2, SCALE
persona priya: OK -> Priya, score 700/999, 6 factors, 12 plan steps | "You don't have bad credit, you have very little of it. This plan builds it from zero."
persona sam: OK -> Sam, score 560/999, 6 factors, 6 plan steps | "You don't have bad credit, you have very little of it. This plan builds it from zero."
persona dan: OK -> Dan, score 420/1000, 6 factors, 5 plan steps | "Your payment history and identity & stability are holding you back most."
report mock-credit-report.json: OK -> Alex, score 682/999, 6 factors, 11 plan steps | "Your credit utilisation and identity & stability are holding you back most."
report mock-report-mei.json: OK -> Mei, score 455/999, 6 factors, 11 plan steps | "You don't have bad credit, you have very little of it. This plan builds it from zero."
ALL OK
```

## Known gaps
- **Priya's headline is wrong for her.** She gets "you have very little of it ... builds it from zero" because the thin-file test (`engine.js` line ~359: oldest account under 1 year OR fewer than 2 credit accounts) fires on her single card. Her real story is utilisation + late payment + decline. Likely fix: only use the build headline when there are no credit accounts or the oldest is under 1 year. Not changed here (engine copied unchanged)
- Rules, cards and personas are inside `engine.js`, not separate JSON files (see above)
- No Priya mock report file; she exists only as a persona
- PDF report extraction via Claude (build plan section 2) is not in the engine; it only takes `credit-coach-report/v1` JSON or a Profile
- Points are on a 0-999 reference scale, rescaled to the bureau (`SCALE`); many impacts are our assumptions (labelled in `engine.js`)

## Changes after `credit-engine-build-plan.md`
Not checked line by line. The plan's later sections (10: decline decoder, build-from-zero, accessibility; 11: explainability and what-if API) are implemented (`decodeDecline`, `build`, `because` on every step, `whatIf`/`applyChanges`). Jag to add anything else he changed.
