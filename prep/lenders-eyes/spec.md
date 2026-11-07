# Lender's Eyes (concept C2, Capital One UK): spec

Full pack, written 2026-11-06. Priority 6 of 8. Capital One's other lead is C1 Clean Slate; pick by the brief's wording (`context/concepts.md`). Use this pack for "make credit simple / understand or improve your credit", "financial literacy / everyday money / fair access", and, with the add-on, "fraud, scams or AI money advice".

Pitch line: "Not a credit score. The lender's reasons, in your words, with a date when the answer changes."

## What it is, in one paragraph
You open your own file and see it the way a lender's rules see it. An illustrative lender policy (code, with stated thresholds from public UK credit reference agency guidance) runs over your credit file and your bank transactions and says decline or likely approve. Each reason to say no is tied to the exact transactions and file entries behind it. Claude explains each reason in plain words, and code checks that every £ figure and date it writes exists in the data or the computed plan. Then code computes a dated plan: "pay £565 by 2026-11-17, register to vote by 2026-11-10, no applications before 2027-01-13, likely approved from 2027-01-13". Finally it shows your file as it should look on that date, and the decision flips.

## Where we sit next to Capital One (say this in the pitch)
Checked on Capital One UK's own pages on 2026-11-06:
- **QuickCheck** (https://www.capitalone.co.uk/creditcards/credit-card-eligibility-checker): "Get a straight yes or no in 60 seconds", "without affecting your credit score". It says yes or no. It does not say why, or when a no becomes a yes
- **CreditWise UK** (https://www.capitalone.co.uk/free-credit-score): free score and report "powered by TransUnion", shows "what's holding back your credit score", and a "Score Simulator" that "shows how getting credit (like cards or loans) might affect your score". It works from the credit report and a score
- **Lender's Eyes is different in four ways.** (1) A decision with reasons, not a score. (2) Each reason is tied to your own bank transactions as well as file entries (the furniture on the card, the £25 minimums, the rent to a new landlord that shows you moved). (3) A computed plan with an amount and a date per action, and one "likely approved from" date, worked out from statement dates, search ageing and electoral roll timing. (4) The after-file re-run that shows the flip. It sits after a QuickCheck "no": QuickCheck says no in 60 seconds; Lender's Eyes says why, and the date it turns into a yes, then sends you back to QuickCheck before you apply
- We never copy their branding, names or look. Fictional lenders only. The policy is ours and labelled illustrative on every screen

## Problem
- Brief fit: CP1 "make credit simple: understand and improve your credit" (our estimate 40%) and CP4 "fair access to credit: thin files, newcomers" (10%) (`../10-KNOWLEDGE/ideas/brief-forecast.md`). With the add-on: CP6 "trustworthy money guidance" (4%)
- Kept problems: Capital One's only kept card is C-027 (Clean Slate's). C2 rests on the brief families above plus three register cards that were not on the kept list (judgement call, flagged in the report). Evidence from `register-r5-final.jsonl`, not re-checked today:
  - **C-381 Excluded consumers declined for everyday finance** (score 3.46; 12 items: UK Parliament evidence 9, institutions 1, Stack Exchange 1, Hacker News 1). Card: people with thin files or irregular income "are often refused... After a decline they get no route to a good outcome and turn to high-cost lenders". Quote from an institution item: "What technological solutions can help to increase the probability of consumers being accepted when they apply for everyday financial services..."
  - **C-303 Unexplained lending and credit outcomes** (2.99; 3 Stack Exchange items, 7,060 views). Quote: "my credit scores dropped over 40 points. I don't understand, why did it drop and will it go back up?"
  - **C-487 Unclear rights over automated credit refusals** (2.28; UK statutory instruments and the FCA Regulatory Initiatives Grid). "Refused applicants rarely learn whether a decision was automated, or how to seek human review or an explanation"
- Real numbers, retrieved 2026-11-06 (FCA Financial Lives 2024 survey, "Credit & loans" selected findings, May 2025, https://www.fca.org.uk/publication/financial-lives/fls-2024-credit-loans.pdf):
  - "Of the 15.3m adults who applied for a regulated credit agreement in the 2 years to May 2024, 22% (3.2m) were declined"
  - "45% of the 3.2m adults who were declined ... said they were unable to get the product or service they needed at all"
  - "10% of adults (5.5m) avoided applying for a regulated credit agreement", and "64% did so because they thought they would be rejected or considered not eligible"
- What people are told today: Citizens Advice says that if a lender refuses you after checking your file, "they must tell you why credit has been refused and give you the details of the credit reference agency they used" (https://www.citizensadvice.org.uk/debt-and-money/borrowing-money/how-lenders-decide-whether-to-give-you-credit/). Experian says "It’s always the lender that decides ... we’re not told when you’re refused or why" and "there’s no universal ‘pass mark’ for credit scoring, so you should ask the lender why you were refused" (https://www.experian.co.uk/consumer/guides/refused-credit.html). Our inference (not measured): the applicant can learn that the file was the reason and which agency holds it, but not which entries, what to change, or when the answer changes. That gap is the product

## User
- Primary: a young adult with a short or messy file, recently declined, about to apply again. Our demo person is **Jordan Ashby (SYNTHETIC)**, 23, first full-time job from 2026-07, moved flat on 2026-08-01, declined three times between 2026-09-03 and 2026-10-29 with no reasons
- Secondary (the business pitch): Capital One's near-prime and credit-builder applicants who get a QuickCheck "no"

## The one demo flow (90 seconds; `demo-script.md` has the clicks and lines)
1. Start screen. Click "Open Jordan's file". Badge: "Synthetic profile"
2. Lender view: red banner "Declined under this illustrative policy. 3 reasons."
3. Reason 1, card balances 94.5% against a 50% line. Open the evidence: furniture and moving costs on the card (TX-020 £520.00, TX-022 £212.50, TX-024 £95.00), then only £25 a month going in (TX-007, TX-030, TX-051, TX-070)
4. Reason 2, three hard searches in 90 days, dated. Reason 3, electoral roll still at the old address while rent has gone to Hollis Lettings since 2026-08-01
5. "Show the plan": the headline sentence, three dated actions on a timeline, the affordability line (lowest projected balance £556.24)
6. "See my file on 2027-01-13": the banner turns to "Likely approved under this illustrative policy. 2 things to watch." The three reasons flip: 94.5% to 44.8% (amber), 3 searches to 1 (pass), roll registered (pass)
7. Say the pitch line. Optional 20 seconds if the brief is about AI advice: paste the sample chatbot advice, 8 claims checked, 4 contradicted

## Screens and states
1. **Start** (empty state): product name, one sentence ("See your credit file the way a lender's rules see it, and the date the answer changes"), button "Open Jordan's file", "Synthetic profile: invented person and lenders". If `VITE_SHOW_ADVICE=true`, a second entry "Check advice a chatbot gave you"
2. **Lender view** (main screen, from `POST /api/assess`):
   - Header: applicant name with "Synthetic" badge, `as_of`, policy name with "Illustrative rules, not a real lender's model" always visible
   - Decision banner: `decision_line`, colour plus words (never colour alone)
   - Reason cards for `result: "fail"` rules, in contract order: rule name, `measured` against `threshold`, `plain_reason`, "Changes on `clears_on`", evidence chips (cited ones first and marked "cited"), a small "Explained by Claude, checked against your data" or "Standard wording" note from `explained_by`
   - Watch rules (amber) under the reasons, then a collapsed "5 checks passed" list
   - Evidence drawer: opens from any chip. Lists every evidence row for that rule (date, label, £ amount right-aligned in tabular figures, kind: transaction / file / projected), then the sources with their quote and link
   - Button "Show the plan"
   - States: loading (skeleton of banner and three cards), result, error ("Could not load the file", Retry)
3. **Plan** (from `POST /api/plan`):
   - `headline` as the largest text on the screen
   - Timeline from `as_of` to `approval_likely_from`: each action's `by_date` (filled marker) and `clears_on` (outlined marker), plus the approval date. Plain CSS, no chart library
   - Action cards: `do`, £ amount if any, by date, clears on, `why_this_date`
   - Affordability strip: `note` and "Lowest projected balance before payday: £556.24", amber if `ok` is false
   - `before_you_apply` line. Button "See my file on 2027-01-13"
   - States: loading, result, error (Retry)
4. **After** (from `plan.after`, same component as the Lender view): banner from `after.decision_line`; on each rule a change marker computed by the frontend by matching `rule_id` between before and after ("fail to watch", "fail to pass", "no change"); a Before / After toggle
5. **Advice check** (optional add-on, behind `VITE_SHOW_ADVICE`): textarea, "Use sample advice" (fills `fixtures/chatbot-advice.txt`), Check button. Results: one row per claim with the quote, verdict word and colour, confidence as a percentage (or "cannot check"), explanation, evidence chips with source links; summary counts at the top. States: empty (button disabled), loading, result, "No checkable claims found", error
- Every state is reachable in mock mode (`VITE_USE_MOCK=true`)

## Data model (all fixtures SYNTHETIC unless stated; see `fixtures/README.md`)
- **Transactions** `transactions.csv` (89 rows, 2026-07-01 to 2026-11-06): `txn_id, date, account_id (ACC-CUR | ACC-CARD), description, amount_gbp (negative = money out of the current account or spend on the card), balance_after_gbp (current account: money in the account, negative = overdrawn; card: amount owed), category, counterparty, synthetic`. Categories come pre-filled, as a bank feed would supply them
- **Credit file** `credit-file.json` (as at 2026-11-07): subject, `addresses` (ADDR-CUR, ADDR-PREV), `electoral_roll` (ER-01), `accounts` (ACC-CUR current account with £250 arranged overdraft; ACC-CARD Larkfield Card, limit £1,200, statement day 18, minimum £25, monthly entries CARD-YYYY-MM with `statement_date`, `balance_gbp`, `limit_gbp`, `reported_on`; ACC-PHONE Ashgrove Mobile, 24 monthly payment-history entries PHN-YYYY-MM), `searches` (SRCH-01..03 hard, SOFT-01 soft), `public_records`, `financial_associations`. Every entry a reason can cite has an `entry_id`
- **Policy** `lender-rules.json`: 9 rules with severity, thresholds, evidence rule, plan logic, and the quoted public basis with URLs. Also a "not included" list
- **Projected file** `credit-file-after.json` (as at 2027-01-13): the before file plus projected entries (`"projected": true`): CARD-2026-10, CARD-2026-11, CARD-2026-12, ER-02, and `projected_events` P-01..P-04
- **Answer keys**: `answer-key.json` (decision, reasons, evidence ids, plan numbers with working, after results) and `chatbot-advice-key.json`
- **AI cache** `app/backend/data/ai-cache.json` (written on the day): last good Claude output per profile and per advice text hash

## Decision rules (code decides; full text in `fixtures/lender-rules.json`)
Conventions: check date = the file's `as_of`. Day counts are calendar days. "Months" = whole calendar months between two dates (if the day of month has not been reached, subtract one). Percentages round half up to 1 decimal place; money to 2 decimal places. "Latest reported" = the newest monthly entry with `reported_on` on or before the check date. A rule with severity `decline` and result `fail` makes the decision `decline`; otherwise `approve_likely`. Watch results never block.

| Rule | Fails if | Watch if | Jordan before (2026-11-07) | Jordan after (2027-01-13) |
|---|---|---|---|---|
| R-UTIL card balances vs limits | above 50.0% | above 25.0% | fail, 94.5% (CARD-2026-09, £1,134.22 of £1,200) | watch, 44.8% (CARD-2026-11, £537.20) |
| R-SRCH hard searches in last 90 days | more than 1 | never | fail, 3 | pass, 1 (SRCH-03) |
| R-ROLL electoral roll at current address | not registered | never | fail (only ER-01, old address) | pass (ER-02 from 2026-12-01) |
| R-LATE late or missed payments | newest under 12 months old | 12 to 72 months | watch, 19 months (PHN-2025-03) | watch, 22 months |
| R-PUBLIC defaults and CCJs | any in 6 years | never | pass | pass |
| R-DTI repayments vs income | above 50.0% | 30.0% to 50.0% | pass, 2.9% (£57 / £1,960.00) | pass |
| R-HCSTC payday loans (watch only) | never | any in the data | pass | pass |
| R-OD overdraft | beyond the arranged limit | never | pass (1 day overdrawn, TX-042, -£19.99) | pass |
| R-HIST length of history (watch only) | never | under 12 months | pass, 49 months | pass, 52 months |

Every threshold line is our own choice, anchored on a quoted public source in `lender-rules.json` (Experian's 25% rule of thumb, "one every three months", six years for late payments and defaults, "within 30 days" and "from 1 December" for the electoral roll, Experian's DTI bands; Equifax keeps search footprints one year). These are illustrative, not any lender's model. Gambling is deliberately not a rule: no primary source was retrieved today (UNVERIFIED).

**Evidence per rule** (code collects it; Claude only chooses which to cite):
- R-UTIL: the latest reported card entry and the two before it; every card purchase of £40 or more in the data window; every current-account payment to the card; in a projected file, also the projected payments to the card (P-01, P-02, `kind: "projected"`)
- R-SRCH, in date order: every hard search in the last 90 days; soft searches listed as "not counted, lenders cannot see it"; in the after view, hard searches that have aged out listed as "older than 90 days, not counted"
- R-ROLL: current and previous address entries, every electoral roll entry (in the after view including the projected ER-02), every rent and deposit transaction
- The example after view in `contract-examples.json` (`POST /api/plan` → `after`) follows these rules
- R-LATE: each late entry. R-DTI: the 3 salary credits used and the commitment lines. R-OD: the overdrawn days. R-HIST: the oldest account

## Plan engine (code; no AI)
For each failing decline rule, in this order:
- **R-UTIL, action A1 "pay"**: next statement date = the next day-18 after the check date (2026-11-18). Projected statement balance = current card balance (£1,127.20, TX-085) minus scheduled card payments before it (the £25 Direct Debit on 2026-11-08) plus scheduled card spend before it (none) = £1,102.20. Target = 45% of the limit rounded down to the pound = £540 (the 50% line minus a 5-point margin). Amount = projected minus target, rounded up to the next £5 = £565. Pay by = the day before the statement (2026-11-17). Clears on = statement date plus 56 days (Experian: reports "can take around 4 to 8 weeks to update"; we use 8) = 2027-01-13
- **R-ROLL, action A2 "register"**: register by = check date plus 3 days = 2026-11-10. If that date is in August to November (the annual canvass), clears on = 1 December that year (Experian), else plus 30 days. Here 2026-12-01
- **R-SRCH, action A3 "wait"**: clears on = the second newest hard search date plus 90 days = 2026-10-12 + 90 = 2027-01-10. Action: make no credit applications until then
- **Approval likely from** = the latest clears-on date across actions = 2027-01-13. If any failing rule cannot clear by an action or within 12 months (e.g. R-PUBLIC), `approval_likely_from` is null and the headline says which rule still declines and until when
- **Headline** (template): "Pay £{A1} to your {card lender} by {A1 by} and register to vote at your new address by {A2 by}. Make no credit applications before {approval date}. Under this illustrative policy you are likely to be approved from {approval date}." Leave out the parts whose rule did not fail
- **Affordability**: balance now (last current-account balance, £1,230.23 on 2026-11-06). Bills before the next payday: recurring payments (same counterparty and amount in each of the last 3 complete months) whose next date falls between the check date and the next salary date (2026-11-28): card Direct Debit £25, phone £32, gym £24.99, broadband £27 = £108.99. Lowest projected balance = balance now minus bills minus the plan payment = £556.24. `ok` if that is at least the £200 everyday-spending buffer. If not ok, say so in amber and suggest splitting the payment over two statements (clears on moves a month later)
- **Before you apply** (template): use a soft-search eligibility checker first; lenders cannot see soft searches (Capital One UK myths page)

## After projection (code)
Copy the before file. Set `as_of` to the approval date. Add projected card entries for each statement up to the check date: balance after scheduled payments, known subscriptions and the plan payment, `reported_on` = statement date plus 56 days (cautious; entries not reported by the check date are ignored by the rules). Add a projected electoral roll entry at the current address from A2's clears-on date. Add projected events for the payments and the "no applications" rule. Re-run the same rules on the same transactions. Assumptions shown on screen: no new card spending except the known subscription, the minimum Direct Debit each month, no new applications, no interest (the synthetic card charges none). The result must equal `fixtures/credit-file-after.json` and the `after` block of `answer-key.json`.

## What the AI does and how its output is checked
- **One Claude call in `POST /api/assess`** (handoff 105): it writes `plain_reason` and `cited_ids` for every rule with result `fail` or `watch`. Passing rules use fixed templates. The decision, the numbers, the evidence and the plan never come from Claude
- Model from env `LLM_MODEL`, default `claude-sonnet-5-5`; no `thinking` parameter (sending `thinking: disabled` returns HTTP 400 on `claude-sonnet-5-5`, checked 2026-11-06); `max_tokens` 1500; no tools (we use our own data, never web search, never memory). Prompt in `prompts.md`
- Input: a facts block per rule built by code: rule id, name, result, measured, threshold, `clears_on`, the evidence rows (id, date, label, amount), the plan action for that rule (do, amount, by date, clears on), and one source quote
- **Checker (code), per reason**: (1) valid JSON, one item per fail/watch rule, same rule ids; (2) `cited_ids` are 1 to 5 ids from that rule's evidence; (3) at most 60 words, and none of "credit score will", "guarantee", "will be approved", "definitely"; (4) every `YYYY-MM-DD` date in the text appears in that rule's facts; no date written with a month name next to a number; every other number (money, percentages, counts) appears in that rule's facts, comparing after removing £, commas, % and sign. On any failure: retry once with the list of problems; then that rule falls back to its template and `explained_by` is `"template"`. Unchecked Claude text never reaches the screen
- **One switch for refusals and bad output**: env `AI_FALLBACK`, default `template` (the deterministic Assessment is still returned, with templates). Set `error` to return `{"error": "Could not explain the reasons right now."}` with HTTP 502 instead, per the shared convention. Our default differs because the code already has the full answer; we flag this as a judgement call
- **Cache and offline**: each good Claude result is written to `app/backend/data/ai-cache.json` keyed by profile id plus a hash of the facts. With `DEMO_OFFLINE=true` the backend makes no network calls: it reads the cache, and uses templates for anything missing

## Add-on: "check the AI's advice" (optional, handoff 106; promote to must-have for a fraud or AI-advice brief)
- `POST /api/check-advice` with pasted text. Claude only splits it into claims (verbatim quotes) and picks one claim type from the closed list in `fixtures/advice-checks.json`. Code checks each quote is a verbatim substring of the pasted text (after collapsing whitespace) and drops any that are not. Code runs the claim type's data check against the file and transactions, takes the verdict and confidence from the table, and fills the explanation template. Evidence carries file ids, transaction ids and source URLs
- Demo input: `fixtures/chatbot-advice.txt` (SYNTHETIC, written for this pack). Expected: 8 claims, 2 supported, 4 contradicted, 1 misleading, 1 cannot check (`chatbot-advice-key.json`)
- Why it fits: Capital One UK's own survey (OnePoll, 2,000 UK adults, March 2026): "one in eight people (13%) said they had asked an AI tool for personal finance information or advice in the last year", and, asked whether they had received incorrect financial information or advice from an AI tool, "the other half (49%) said they either have (28%) or can’t be sure (21%)" (https://www.capitalone.co.uk/blog/ai-matches-parents-personal-finance-advice, retrieved 2026-11-06)

## Capital One hackathon API: adapter shape
- Checked 2026-11-06: `hackathon.capitalone.co.uk` does not resolve (DNS NXDOMAIN, curl exit 6, HTTP 000). Same as 2026-11-05. See `libraries.md`
- If their brief asks for it: get access from their engineers at 10:00 Sat. Swap in transactions only; a bank API will not give a credit file, so the credit file stays our fixture. Env `DATA_SOURCE=fixtures|capitalone` (default `fixtures`), `CAPONE_API_BASE`, `CAPONE_API_KEY`
- Adapter: one loader that returns rows in exactly the `transactions.csv` columns: their transaction id to `txn_id`, date to `YYYY-MM-DD`, their account id mapped to `ACC-CUR` or `ACC-CARD`, merchant or description to `description`, amount with our sign rule (money out negative), running balance if given else computed, their category mapped to our category list (unknown to `other`), `synthetic` = `"true"` (their data is also fake). Field names are UNVERIFIED until we can read their `/docs`
- Keep the demo on our fixture story (it is what the reasons and plan were tuned on). Show their API as "also works with Capital One's sandbox data" on a second profile id if time allows. Their fake-fraud transactions fit the add-on for a fraud brief

## Edge cases
- Equal to a line: 50.0% is watch, not fail ("above 50.0%"); a search exactly 90 days old is not counted
- No cards: R-UTIL passes with "No credit or store cards on your file"; the plan has no A1
- No salary found in the last 3 complete months: R-DTI is watch with "No regular income found in your transactions"; do not divide by zero
- A late payment inside 12 months: R-LATE fails; no action can clear it; the plan shows "Changes on {recorded date + 12 months}" as a wait action
- Payment not affordable (`ok` false): amber strip, split suggestion, approval date moves a month
- Unknown `profile_id`: HTTP 404 `{"error": "Unknown profile_id: x"}`. Missing body field: 422 from FastAPI is fine
- Claude timeout (20 seconds): treat as bad output, go to the fallback
- Advice text over 4,000 characters: HTTP 422 `{"error": "Please paste at most 4,000 characters."}`

## What NOT to build
- No real credit file pulls, no Open Banking connection, no login, no database
- No credit score number anywhere. No quizzes, games, streaks or badges
- No money movement and no "autopilot". The vault concept's consented autopilot (scheduled payments before the statement date) is a "what next", not a build item
- No chatbot. Claude writes reasons and splits advice; it does not chat
- No Capital One logo, colours, product names in the UI or anything that imitates them. Fictional lenders only (Larkfield Card, Brindlemoor Bank, Pennant Finance, Orbitel Mobile, Ashgrove Mobile, Brookmere Bank)
- No advice wording ("you should") beyond the computed plan. Footer on every screen: "Illustrative rules for a demo. Not financial advice and not a real lending decision."

## Cut list
- **Must have**: 101, 102, 103, 104 (without the advice panel), 105, 107. The flip from decline to likely approved, evidence drawer, dated plan, checker with template fallback, `DEMO_OFFLINE`
- **Cut first**: 106 and the advice panel; the affordability strip; source quotes in the drawer (keep the links)
- **Cut second**: the after projection engine (load `credit-file-after.json` directly and run the rules on it); the timeline (keep the action cards); Claude explanations (templates only; the demo still works, the AI story gets weaker)
- **If the brief is fraud or AI advice**: promote 106 and the advice panel to must have; cut the affordability strip and the timeline instead

## Fallbacks
- Claude API down or slow: `DEMO_OFFLINE=true` (cache, then templates). Rehearsed in 107
- Bad AI output: per-rule template, tagged "Standard wording"
- Backend down on stage: frontend `VITE_USE_MOCK=true` serves `contract-examples.json`, which tells the same story
- Everything down: the recorded backup video from 107
- Capital One API required but not reachable: say so, show the adapter shape, demo on fixtures

## Handoffs and timeline
| id | title | owner | budget | starts after |
|---|---|---|---|---|
| 101 | Backend skeleton, disclosures, contract, fixtures, stub endpoints | mihael | 75m | nothing, 11:00 |
| 102 | Frontend shell and the Lender view on mocks | partner | 90m | nothing, 11:00 |
| 103 | Rules engine, plan engine and after projection (no AI) | mihael | 2h30m | 101 |
| 104 | Plan and After screens, switch to the real backend, optional advice panel | partner | 2h30m | 102 (real-backend step after 103) |
| 105 | Claude explanations with the number checker, cache and DEMO_OFFLINE | mihael | 1h45m | 103 |
| 106 | Optional: check the AI's advice (backend) | mihael | 1h30m | 105 |
| 107 | Demo path solid: polish, DEMO.md, offline rehearsal, video, screenshots | partner | 2h | 104, 105 |
- Lanes: mihael 7h00 (6h00 without 106), partner 6h00. Partner attends the Capital One talk (provisionally 16:00) in the gap between 104 and 107
- Critical path: 101 (11:00 to 12:15), lunch, 103 (12:45 to 15:15), 105 (15:15 to 17:00), 107 (17:00 to 19:00). Demo-ready about 19:00, well before 01:00. Feature freeze 07:00 Sun
- 15:00 checkpoint, defined for this pack: real `POST /api/assess` and `POST /api/plan` for `jordan-before` (103's first two commits, about 14:45), with the Lender view and Plan screen showing them end to end. The after projection, 103's last step, follows by about 15:15; until then `plan.after` may come from `credit-file-after.json`

## Open questions and residuals
- UNVERIFIED: whether every UK lender reports the statement balance. Our synthetic card does by construction; the plan uses Experian's 4 to 8 weeks
- UNVERIFIED: MoneyHelper and TransUnion pages (HTTP 403 to curl), FCA Handbook CONC 5.2A (no text returned). Not used
- UNVERIFIED: gambling as a lender signal. Not a rule
- Capital One's hackathon API: unreachable; field names unknown
- Whether a consumer product like this needs FCA permissions (credit information services or debt advice): flagged in our vault notes, not checked today. On stage: "illustrative information, not advice; inside Capital One it would sit within their permissions"
