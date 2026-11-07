---
id: 106
title: Optional add-on, check the AI's advice (backend)
status: ready
owner: mihael
concept: lenders-eyes
created: 2026-11-06
time-budget: 1h30m
---

# 106: Optional add-on, check the AI's advice (backend)

## Goal
`POST /api/check-advice` takes advice a chatbot gave the person, has Claude split it into claims, and checks each claim against the person's own credit file and transactions with code: a verdict, a confidence, a plain explanation and the evidence. On the sample advice it reproduces `chatbot-advice-key.json`.

**Optional.** On the cut list ("cut first"). Promote it to must-have if the brief is about fraud, scams or AI money advice; then Cowork moves it before 107.

## Context
- Read first: `prep/lenders-eyes/spec.md` section "Add-on", `prep/lenders-eyes/prompts.md` (Prompt 2: system prompt, user template, checker), `app/backend/data/advice-checks.json` (closed claim-type list, data checks, verdict table, templates, sources), `app/backend/data/chatbot-advice.txt`, `app/backend/data/chatbot-advice-key.json`, `app/CONTRACT.md`
- Starts after: 105 (reuses its Claude client, cache and `DEMO_OFFLINE` handling) and the engine from 103 (R-SRCH, R-ROLL and the plan dates feed the checks)
- Interface: `POST /api/check-advice` exactly as in `app/CONTRACT.md`. The frontend panel (104, optional) already builds to the example in `contract-examples.json`
- Env vars: as 105

## Requirements
- [ ] Reject advice over 4,000 characters with HTTP 422 `{"error": "Please paste at most 4,000 characters."}`, and empty advice with 422 `{"error": "Please paste some advice to check."}`. Unknown profile: 404
- [ ] One Claude call with Prompt 2 from `prompts.md`, word for word; `{claim_type_list}` built from `advice-checks.json` (`claim_type: for_claude`, one per line). Same model settings as 105. Read the reply by joining all `text` blocks; ignore `thinking` blocks
- [ ] Checker from `prompts.md` Prompt 2: JSON shape, closed list (unknown types become AC-OTHER), every quote must be a verbatim substring of the pasted text after collapsing whitespace (drop and log the rest), 0 to 12 claims, one retry on bad JSON, then HTTP 502 `{"error": "Could not read the advice. Try a shorter paste."}`. Zero claims (from Claude, or after dropping quotes) is a valid answer, not an error: return `claims: []` and an all-zero summary with HTTP 200
- [ ] For each kept claim, code runs the claim type's `data_check`, picks the matching `outcome` (verdict, confidence), fills the `template` from the profile's data and the 103 engine (for example `{hard_90d}` = 3 and `{search_dates}` = "2026-09-03, 2026-10-12 and 2026-10-29" for Jordan), and builds the evidence list (file ids, transaction ids, and one `source` item per source id with its URL from `lender-rules.json` or `advice-checks.json`). `claim_id` = C1, C2, ... in order
- [ ] `summary` counts per verdict
- [ ] Cache the Claude split by the sha256 of the advice text (first 12 hex characters) in `ai-cache.json`; `DEMO_OFFLINE=true` reads only the cache, and if the entry is missing returns 503 `{"error": "Advice check needs the network. Offline mode only has the sample."}`
- [ ] Run the sample once live so the cache has it; commit `ai-cache.json`
- [ ] Remove the 101 stub
- [ ] Commit after each working step

## Out of scope
- New claim types beyond the closed list (log unknown advice as AC-OTHER)
- Judging advice with Claude (code decides the verdicts)
- `app/frontend/`

## Verification
Backend running, `DEMO_OFFLINE=false`.
1. `jq -Rs '{profile_id:"jordan-before", advice:.}' app/backend/data/chatbot-advice.txt > /tmp/advice-body.json` then `curl -s -X POST localhost:8000/api/check-advice -H 'content-type: application/json' -d @/tmp/advice-body.json | jq -c '[.summary, [.claims[]|[.claim_id,.claim_type,.verdict,.confidence]]]'` prints `[{"supported":2,"contradicted":4,"misleading":1,"cannot_check":1},[["C1","AC-MULTI-APPLY","contradicted",0.9],["C2","AC-LATE-EXPIRY","contradicted",0.95],["C3","AC-ROLL","supported",0.9],["C4","AC-PAY-BEFORE-STATEMENT","supported",0.7],["C5","AC-STUDENT-LOAN","contradicted",0.85],["C6","AC-ADDRESS-LINK","contradicted",0.9],["C7","AC-PAYDAY","misleading",0.8],["C8","AC-OTHER","cannot_check",null]]]`
2. Same call with `| jq -r '.claims[0].explanation'` prints: You already have 3 hard searches in the last 90 days, on 2026-09-03, 2026-10-12 and 2026-10-29. Each application adds another, and Experian suggests at most one every three months. A soft-search eligibility check does not show to lenders.
3. Every quote is in the sample: `curl ... | jq -r '.claims[].quote'` and check each line appears in `chatbot-advice.txt`
4. `curl -s -X POST localhost:8000/api/check-advice -H 'content-type: application/json' -d '{"profile_id":"jordan-before","advice":"Hello! Hope you are well."}' | jq -c .summary` prints `{"supported":0,"contradicted":0,"misleading":0,"cannot_check":0}` (if Claude returns the greeting as an AC-OTHER claim instead, record it as a prompt delta and tighten "Ignore greetings" in `prompts.md`)
5. A 4,001-character paste returns 422 with the message above
6. Restart with `DEMO_OFFLINE=true`: step 1 gives the same output from the cache. A different advice text returns 503 with the offline message
7. If any claim type or verdict differs from `chatbot-advice-key.json`, record which and the Claude split in RESULT (prompt delta)

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
