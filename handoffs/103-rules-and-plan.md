---
id: 103
title: Rules engine, plan engine and after projection (no AI)
status: ready
owner: mihael
concept: lenders-eyes
created: 2026-11-06
time-budget: 2h30m
---

# 103: Rules engine, plan engine and after projection (no AI)

## Goal
`POST /api/assess` and `POST /api/plan` compute their answers from the fixtures with deterministic code: the 9 illustrative rules, the evidence per rule, template reasons, the dated plan, the affordability check and the projected "after" file. The output for `jordan-before` matches `answer-key.json` exactly. No Claude yet (105 adds the explanations).

## Context
- Read first: `prep/lenders-eyes/spec.md` (sections "Decision rules", "Plan engine", "After projection", "Edge cases"), `app/backend/data/lender-rules.json` (each rule's `measures`, `fail_if`, `watch_if`, `evidence`, `plan_logic`), `app/backend/data/answer-key.json` (the expected numbers, with the working), `prep/lenders-eyes/prompts.md` section "Templates", `app/CONTRACT.md`
- Starts after: 101
- Interface: `app/CONTRACT.md` (written in 101). Shapes do not change. `contract-examples.json` shows the target output; the only allowed differences are `plain_reason` wording for rules that 105 will hand to Claude (until 105 these use templates and `explained_by: "template"`, with `cited_ids: []`)
- Data: `app/backend/data/transactions.csv`, `credit-file.json`, `credit-file-after.json` (expected projection), `lender-rules.json`
- Patterns: keep the engine in its own module (for example `engine.py`) with plain functions that take a credit file, the transactions and a check date, so 105 and 106 can reuse them

## Requirements
- [ ] Conventions, exactly as in the spec: check date = the file's `as_of`; calendar-day arithmetic; whole calendar months; percentages rounded half up to 1 decimal place (use decimals, not floats, to avoid 44.85 becoming 44.8); "latest reported" = newest monthly entry with `reported_on` on or before the check date
- [ ] The 9 rules from `lender-rules.json` (R-UTIL, R-SRCH, R-ROLL, R-LATE, R-PUBLIC, R-DTI, R-HCSTC, R-OD, R-HIST): result, `measured` string, `threshold` string, `clears_on`, evidence list and sources, in that order. Use the `measured` and `threshold` strings exactly as in `contract-examples.json` (for example `"94.5%"`, `"3 in 90 days"`, `"fail above 50%, watch above 25%"`)
- [ ] Evidence per rule as listed in the spec section "Evidence per rule", with the same ids, dates, labels and amounts as the `POST /api/assess` example. Transaction labels are `DESCRIPTION (card)` or `DESCRIPTION (current account)`
- [ ] Decision: `decline` if any rule with severity `decline` fails, else `approve_likely`. `decision_line`: "Declined under this illustrative policy. N reasons." or "Likely approved under this illustrative policy. N things to watch." (N in figures; "1 reason", "1 thing")
- [ ] Template `plain_reason` for every rule (`explained_by: "template"`), from `prompts.md` "Templates"
- [ ] `file_summary` as in the example
- [ ] Plan engine (spec "Plan engine"): A1 pay, A2 register, A3 wait, in that order and only for failing rules; `approval_likely_from`; headline and `before_you_apply` templates; `why_this_date` text as in the example; affordability with recurring-payment detection (same counterparty and amount in each of the last 3 complete calendar months) and the £200 buffer
- [ ] `clears_on` on each failing rule = its action's `clears_on`; on R-LATE watch = recorded date plus 6 years; null for passes
- [ ] After projection (spec "After projection"): build the projected file from the before file and the plan, then run the same rules at `approval_likely_from`. The result goes in `plan.after` and is also returned by `POST /api/assess` for `jordan-after`. Evidence for projected entries has `kind: "projected"`. Compare your projected file with `credit-file-after.json`: same entries, balances and dates
- [ ] If the projection is not done by 2h, cut it: load `credit-file-after.json` directly as the after file and run the rules on it (note the cut in RESULT)
- [ ] Every response passes the Pydantic models from 101
- [ ] Remove the 101 stubs for assess and plan. Keep the check-advice stub (106)
- [ ] Commit after each working step (rules, then plan, then projection). Rules plus plan are the 15:00 checkpoint: tell partner when those two are on `main` (until the projection lands, `plan.after` may run the rules on `credit-file-after.json` directly), then finish the projection

## Out of scope
- Claude calls, the checker, the cache, `DEMO_OFFLINE` (105)
- `/api/check-advice` (106)
- `app/frontend/`
- New rules (gambling, BNPL): not in the policy, see `lender-rules.json` "not_included"

## Verification
Backend running (`cd app/backend && uv run uvicorn main:app --reload --port 8000`).
1. `curl -s -X POST localhost:8000/api/assess -H 'content-type: application/json' -d '{"profile_id":"jordan-before"}' | jq -c '[.decision, [.rules[]|[.rule_id,.result,.measured]]]'` prints `["decline",[["R-UTIL","fail","94.5%"],["R-SRCH","fail","3 in 90 days"],["R-ROLL","fail","not registered at current address"],["R-LATE","watch","newest late payment 19 months old"],["R-PUBLIC","pass","none"],["R-DTI","pass","2.9%"],["R-HCSTC","pass","none"],["R-OD","pass","1 day overdrawn, 0 beyond limit"],["R-HIST","pass","49 months"]]]`
2. `curl -s -X POST localhost:8000/api/assess -H 'content-type: application/json' -d '{"profile_id":"jordan-before"}' | jq -c '[.rules[0].evidence[].id]'` prints `["CARD-2026-09","CARD-2026-08","CARD-2026-07","TX-020","TX-022","TX-024","TX-027","TX-032","TX-007","TX-030","TX-051","TX-070"]`
3. `curl -s -X POST localhost:8000/api/assess -H 'content-type: application/json' -d '{"profile_id":"jordan-before"}' | jq -c '[.rules[]|.clears_on]'` prints `["2027-01-13","2027-01-10","2026-12-01","2031-03-10",null,null,null,null,null]`
4. `curl -s -X POST localhost:8000/api/plan -H 'content-type: application/json' -d '{"profile_id":"jordan-before"}' | jq -c '[.approval_likely_from, [.actions[]|[.action_id,.amount_gbp,.by_date,.clears_on]], .affordability.lowest_projected_balance_gbp, .affordability.ok]'` prints `["2027-01-13",[["A1",565,"2026-11-17","2027-01-13"],["A2",null,"2026-11-10","2026-12-01"],["A3",null,"2027-01-10","2027-01-10"]],556.24,true]` (565 may print as 565.0)
5. `curl -s -X POST localhost:8000/api/plan -H 'content-type: application/json' -d '{"profile_id":"jordan-before"}' | jq -r .headline` prints exactly: Pay £565 to your Larkfield Card by 2026-11-17 and register to vote at your new address by 2026-11-10. Make no credit applications before 2027-01-13. Under this illustrative policy you are likely to be approved from 2027-01-13.
6. `curl -s -X POST localhost:8000/api/plan -H 'content-type: application/json' -d '{"profile_id":"jordan-before"}' | jq -c '[.after.decision, [.after.rules[]|[.rule_id,.result,.measured]]]'` prints `["approve_likely",[["R-UTIL","watch","44.8%"],["R-SRCH","pass","1 in 90 days"],["R-ROLL","pass","registered at current address"],["R-LATE","watch","newest late payment 22 months old"],["R-PUBLIC","pass","none"],["R-DTI","pass","2.9%"],["R-HCSTC","pass","none"],["R-OD","pass","1 day overdrawn, 0 beyond limit"],["R-HIST","pass","52 months"]]]`
7. `curl -s -X POST localhost:8000/api/assess -H 'content-type: application/json' -d '{"profile_id":"jordan-after"}' | jq -c '[.as_of,.decision,.decision_line]'` prints `["2027-01-13","approve_likely","Likely approved under this illustrative policy. 2 things to watch."]`
8. Paste all outputs into RESULT. If any line differs, say which and why

---

## RESULT (filled in by Claude Code)
- Status:
- Time taken:
- What was built:
- Files changed:
- Verification run and output:
- Follow-ups needed after the first prompt (prompt deltas): what extra guidance was needed, or "none"
- Practice review (practice runs only, fill in as you go; Cowork turns it into `prep/<concept>/review.md`):
  | Component | Planned | Actual | What took the time |
  |---|---|---|---|
  | Setup (repo, env, keys) | | | |
  | Data in (API / fixtures) | | | |
  | Core logic | | | |
  | AI parts (prompts, parsing) | | | |
  | UI | | | |
  | Demo path polish | | | |
  | Devpost, screenshots, pitch | | | |
  - Files Claude read, and how many times:
  - Files read but not needed:
  - Context used at the end of the session (`/context`):
- Open issues / follow-ups:
