# Fixtures: Lender's Eyes

Data files only. 101 copies every file except this README into `app/backend/data/`. 102 copies `contract-examples.json` (and 104 `chatbot-advice.txt`) into `app/frontend/src/mocks/`.

The person, addresses, lenders, merchants and accounts are invented. No real account numbers, sort codes or personal data. Lender names used: Larkfield Card, Brookmere Bank, Ashgrove Mobile, Orbitel Mobile, Pennant Finance, Brindlemoor Bank, Hollis Lettings (all fictional).

| File | What it is | Source | Retrieved or written | Real or synthetic |
|---|---|---|---|---|
| `transactions.csv` | 89 transactions, 2026-07-01 to 2026-11-06, for Jordan Ashby's current account (ACC-CUR) and credit card (ACC-CARD). Columns: `txn_id, date, account_id, description, amount_gbp, balance_after_gbp, category, counterparty, synthetic`. Sign: negative = money out of the current account or spend on the card. `balance_after_gbp`: current account = money in the account (negative = overdrawn); card = amount owed | Written for this pack | Written 2026-11-06 | SYNTHETIC. Balances add up: current account opens at £612.40 on 2026-06-30 and ends at £1,230.23; card owed £210.00 after the 2026-06-18 statement and £1,127.20 at the end |
| `credit-file.json` | Credit file as at 2026-11-07: addresses, electoral roll, 3 accounts with monthly history (CARD-*, PHN-*, CUR-*), 3 hard and 1 soft search, no public records, no financial associations. Every citable entry has an `entry_id` | Written for this pack | Written 2026-11-06 | SYNTHETIC. Not a real agency format. Card statement balances match `transactions.csv` |
| `credit-file-after.json` | The same file projected to 2027-01-13 after the plan: projected card entries CARD-2026-10/11/12, electoral roll ER-02, projected events P-01 to P-04 (`"projected": true`) | Computed from the two files above by running the plan once by hand | Written 2026-11-06 | SYNTHETIC projection |
| `lender-rules.json` | The illustrative policy: 9 rules with thresholds, evidence rules, plan logic and the quoted public basis; plus topics left out and why | Our rules. Basis quotes copied from 14 public pages (Experian, Equifax, Capital One UK), URLs inside | Pages retrieved 2026-11-06 (HTTP 200); rules written 2026-11-06 | Thresholds: ours, illustrative, NOT any lender's model. Quotes and URLs: real |
| `answer-key.json` | Expected decision, the 3 decline reasons with evidence ids and stories, the watch item, the plan numbers with full working, and the after results | Computed by running `lender-rules.json` once by hand on the fixtures | Written 2026-11-06 | SYNTHETIC (derived) |
| `advice-checks.json` | Closed list of advice claim types for the add-on: what Claude looks for, the data check, verdict and confidence table, explanation templates, sources | Written for this pack; source quotes from Capital One UK and Experian, URLs inside | Pages retrieved 2026-11-06; table written 2026-11-06 | Table and confidences: ours. Quotes: real |
| `chatbot-advice.txt` | Sample "advice a chatbot gave you" with 8 claims | Written for this pack | Written 2026-11-06 | SYNTHETIC. Not real chatbot output |
| `chatbot-advice-key.json` | Expected claims, types, verdicts, confidences and evidence ids for `chatbot-advice.txt` | Written for this pack | Written 2026-11-06 | SYNTHETIC (derived) |
| `contract-examples.json` | One valid example response per endpoint, keyed by `"METHOD /api/path"`: health, assess (jordan-before), plan (with `after`), check-advice. A `_note` key explains it (skip keys that start with `_`) | Built from the files above | Written 2026-11-06 | SYNTHETIC. The four `explained_by: "claude"` reasons are hand-written examples that pass the number checker, not real Claude output |

## The demo story in numbers (all synthetic)
- Before (2026-11-07): decline. R-UTIL fail 94.5% (CARD-2026-09, £1,134.22 of £1,200). R-SRCH fail, 3 hard searches in 90 days (SRCH-01 2026-09-03, SRCH-02 2026-10-12, SRCH-03 2026-10-29). R-ROLL fail (ER-01 at the previous address; rent to Hollis Lettings from TX-023, 2026-08-01). R-LATE watch (PHN-2025-03, recorded 2025-03-10, drops off 2031-03-10). 5 passes
- Plan: A1 pay £565 by 2026-11-17 (clears 2027-01-13); A2 register by 2026-11-10 (clears 2026-12-01); A3 no applications until 2027-01-10. Likely approved from 2027-01-13. Lowest projected balance before payday £556.24 (buffer £200)
- After (2027-01-13): approve_likely. R-UTIL watch 44.8% (CARD-2026-11, £537.20), R-SRCH pass (1), R-ROLL pass (ER-02), R-LATE watch. 2 watches, 7 passes, 0 fails

## Simplifications to say out loud if asked
- The card charges no interest, so the maths stays visible
- Categories come pre-filled, as a bank feed would supply them
- Reported balance = statement balance, reported 27 days after the statement in the history; the plan assumes the cautious 56 days

## Checks run on 2026-11-06
- Every `.json` parses (`python3 -m json.tool`), `transactions.csv` has a header row and 89 data rows
- Running balances recompute from the amounts; card statement balances in `credit-file.json` equal the card ledger on each statement date inside the data window (2026-07-18, 2026-08-18, 2026-09-18), and the 2026-06-18 balance (£210.00) is the ledger's opening balance
- Running the rules once by hand reproduces `answer-key.json` and the after file
- The four example Claude reasons pass the number rule in `prompts.md` (every number and date appears in that rule's facts)
- Every advice quote in `chatbot-advice-key.json` is a verbatim substring of `chatbot-advice.txt`
