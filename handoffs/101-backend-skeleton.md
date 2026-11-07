---
id: 101
title: Backend skeleton, disclosures, contract, fixtures, stub endpoints and the scripted conversation
status: ready
owner: mihael
concept: lenders-eyes
created: 2026-11-06
time-budget: 100m
---

# 101: Backend skeleton, disclosures, contract, fixtures, stub endpoints and the scripted conversation

## Goal
A running FastAPI backend in `app/backend/` that loads the Lender's Eyes fixtures, answers every endpoint of the contract below with the example responses (stubs, replaced by real logic in 103, 105 and 106), plus `app/DISCLOSURES.md`, `app/DEMO.md` and `app/CONTRACT.md`. Partner builds the frontend against the same contract in parallel (102). Also a scripted conversation (`/api/turn`, `/api/upload`) that walks the whole chat on Jordan's sample files, so the NPC chat works end to end before the real logic lands.

**Brief (2026-11-07): Capital One "Make credit accessible".** Our angle: credit is inaccessible because nobody can understand it. The agent makes the lender's view understandable, in plain words, one message at a time.

## Context
- Read first: `CLAUDE.md`, `.claude/rules/python.md`, `templates/DISCLOSURES.md`, `templates/DEMO.md`, `prep/lenders-eyes/spec.md` (sections "Data model" and "Decision rules"), `prep/lenders-eyes/fixtures/README.md`
- Starts after: nothing, 11:00
- Fixtures to copy into `app/backend/data/`: `prep/lenders-eyes/fixtures/transactions.csv`, `credit-file.json`, `credit-file-after.json`, `lender-rules.json`, `answer-key.json`, `advice-checks.json`, `chatbot-advice.txt`, `chatbot-advice-key.json`, `contract-examples.json`
- Env vars (in `.env` at the repo root, see `.env.example`): `ANTHROPIC_API_KEY` (required, fail loudly at startup if missing), `LLM_MODEL` (default `claude-sonnet-5-5`), `DEMO_OFFLINE` (default `false`), `AI_FALLBACK` (default `template`), `DATA_SOURCE` (default `fixtures`). Add the last four to `.env.example` with their defaults
- **Interface with 102 (both sides build to this, do not change it without telling the other person):**
  - Backend on `http://localhost:8000`, all routes under `/api`. CORS allows `http://localhost:5173`
  - `GET /api/health` returns `{"status": "ok"}`
  - Shared shapes. `Evidence` = `{"kind": "transaction"|"file"|"projected", "id": string, "date": string, "label": string, "amount_gbp": number|null}`. `Source` = `{"title": string, "url": string, "quote": string}`. `Rule` = `{"rule_id": string, "name": string, "severity": "decline"|"watch", "result": "fail"|"watch"|"pass", "measured": string, "threshold": string, "clears_on": string|null, "plain_reason": string, "explained_by": "claude"|"template", "cited_ids": [string], "evidence": [Evidence], "sources": [Source]}`. `Assessment` = `{"profile_id": string, "as_of": string, "applicant": {"name": string, "synthetic": boolean}, "policy": {"name": string, "illustrative": boolean, "note": string}, "decision": "decline"|"approve_likely", "decision_line": string, "file_summary": {"revolving_utilisation_pct": number, "hard_searches_90d": number, "on_roll_at_current_address": boolean, "oldest_account_opened": string, "monthly_income_gbp": number, "dti_pct": number, "data_window": {"from": string, "to": string}}, "rules": [Rule]}`
  - `POST /api/assess` body `{"profile_id": string}` returns `Assessment`. The demo profile is `"jordan-before"`
  - `POST /api/plan` body `{"profile_id": string}` returns `{"profile_id": string, "as_of": string, "headline": string, "approval_likely_from": string|null, "before_you_apply": string, "actions": [{"action_id": string, "rule_id": string, "kind": "pay"|"register"|"wait", "do": string, "amount_gbp": number|null, "by_date": string, "clears_on": string, "why_this_date": string}], "affordability": {"balance_now_gbp": number, "balance_date": string, "bills_before_payday_gbp": number, "next_payday": string, "lowest_projected_balance_gbp": number, "buffer_gbp": number, "ok": boolean, "note": string}, "after": Assessment}`
  - `POST /api/check-advice` body `{"profile_id": string, "advice": string}` returns `{"profile_id": string, "claims": [{"claim_id": string, "quote": string, "claim_type": string, "verdict": "supported"|"contradicted"|"misleading"|"cannot_check", "confidence": number 0..1|null, "explanation": string, "evidence": [{"kind": "transaction"|"file"|"source", "id": string, "label": string, "url": string|null}]}], "summary": {"supported": number, "contradicted": number, "misleading": number, "cannot_check": number}}`. Optional add-on (handoff 106); until 106 is done it returns the example response
  - Dates are `YYYY-MM-DD` strings. Money is a number in pounds; negative means money out
  - Errors: HTTP 4xx/5xx with `{"error": string}`. Unknown `profile_id` returns 404
  - One example response per endpoint: `prep/lenders-eyes/fixtures/contract-examples.json` (key `"METHOD /api/path"`)
  - **Conversation (added 2026-11-07, the app is now a chat with the pixel NPC agent; the backend owns the conversation, the frontend only renders it)**
  - `AgentMessage` = `{"id": string, "text": string, "emote": "neutral"|"warm"|"concerned"|"pleased", "gesture": "none"|"wave"|"asking"|"receive-document"|"reading"|"thinking"|"explaining"|"slide-paper"|"coach", "rule_id": string|null, "evidence": [Evidence]}`. Frontend maps `gesture` and `emote` onto the 108 NPC states; `text` is shown with the typewriter, one message at a time
  - `Expects` = `{"kind": "file"|"choice"|"text"|"none", "file_kinds": ["credit_report"|"bank"|"letter"], "chips": [string], "optional": boolean, "placeholder": string|null}`. What input the agent waits for next
  - `Step` = `"greet"|"ask_report"|"ask_bank"|"ask_letter"|"questions"|"assessing"|"report"|"paper"|"coach"`
  - `POST /api/upload` multipart form: `session_id`, `file_kind` (`credit_report`|`bank`|`letter`), `file`. Returns `{"file_id": string, "file_kind": string, "name": string, "read_ok": boolean, "summary": string}` (summary is one plain line, for example "Credit report: 3 accounts, 4 searches, 2 addresses")
  - `POST /api/turn` body `{"session_id": string|null, "input": {"type": "start"|"file"|"skip"|"choice"|"text", "file_kind": string|null, "file_id": string|null, "sample": boolean, "value": string|null}}`. `start` with `session_id: null` opens a session. `sample: true` with `type: "file"` uses the built-in Jordan file of that kind (demo button "Use sample"). A `letter` file is accepted at ANY step: the agent acknowledges it in one message and carries on where it was
  - Returns `{"session_id": string, "step": Step, "messages": [AgentMessage], "expects": Expects, "assessment": Assessment|null, "plan": Plan|null, "paper_url": string|null}`. `assessment` is set from the `report` step on, `paper_url` from the `paper` step on
  - Step order: `greet` (wave, then ask for the credit report) → `ask_report` → `ask_bank` → `ask_letter` (optional, chips "Upload letter" / "I don't have one") → `questions` (2 to 4, some built from the data, for example "Your rent has gone to Hollis Lettings since 2026-08-01. Did you move recently?") → `assessing` (thinking) → `report` (decision line, then ONE message per failing reason, gesture `explaining`, `emote` `concerned` for bad news delivered kindly, then watch items in one message) → `paper` (gesture `slide-paper`, the summary sheet) → `coach` (goal chips "Credit card", "Car finance", "Mortgage", "Something else"; then horizon chips "3 months", "6 months", "12 months"; then free text)
  - `GET /api/paper/{session_id}.pdf` returns the summary package (built in 114; until then 404 `{"error": "Summary not built yet"}`)
- Pattern: the setup lines in this handoff are the generic ones that passed practice (the generic handoffs are not copied into the event repo, so there is nothing to look up)

## Requirements
- [ ] Create `app/`. Copy `templates/DISCLOSURES.md` and `templates/DEMO.md` into it. Fill the first DISCLOSURES rows: Claude Code, FastAPI, uvicorn, anthropic SDK, python-dotenv, plus every package in the lock file. Under "APIs and data" add: "Claude API (Anthropic): explanations and advice splitting, from 105"; and "Lender's Eyes fixtures (`app/backend/data/`): synthetic transactions, credit file, illustrative rules and answer keys, prepared before the event, data not code. Rule thresholds quote public pages from Experian, Equifax and Capital One UK (URLs in `lender-rules.json`)". Change the Claude API row's "incl. web search tool" to "no tools"
- [ ] Write `app/CONTRACT.md` with the interface above, word for word
- [ ] `app/backend/` with uv, non-interactively: `uv init --app --no-package` (plain `--app` makes a src/ layout the start command cannot load), then `uv add fastapi uvicorn anthropic python-dotenv`. FastAPI app in `main.py`, CORS for `http://localhost:5173`
- [ ] Copy the nine fixture files listed in Context into `app/backend/data/`
- [ ] Pydantic models that mirror the contract exactly (Evidence, Source, Rule, Assessment, Plan, Action, Affordability, AdviceClaim, AdviceEvidence, AdviceResult). At startup, validate every example in `data/contract-examples.json` against its model (skip keys that start with `_`) and stop with a clear message if one fails. Number types: `file_summary.hard_searches_90d` and the four `summary` counts in the advice result (`supported`, `contradicted`, `misleading`, `cannot_check`) are `int`, so they never serialise as `3.0`. Every money field (`*_gbp`), percentage (`*_pct`) and `confidence` is `float`. Months and days only appear inside strings (`measured`, `threshold`), never as number fields
- [ ] Loaders, kept separate from the routes so 103 can use them: transactions from the CSV (amounts as decimals, dates as dates), credit files from the JSON, rules from `lender-rules.json`. At startup print one line: `Loaded 89 transactions, 3 accounts, 4 searches, 9 rules`
- [ ] Profiles: `jordan-before` uses `credit-file.json`; `jordan-after` uses `credit-file-after.json`. Anything else returns 404 `{"error": "Unknown profile_id: <id>"}`
- [ ] Stubs: `POST /api/assess`, `POST /api/plan` and `POST /api/check-advice` return the matching example from `contract-examples.json` for a known profile id. Mark each stub in a code comment with the handoff that replaces it (103 for assess and plan, 106 for check-advice)
- [ ] Config read once at startup: key from `.env` (fail loudly if missing), `LLM_MODEL` default `claude-sonnet-5-5` (one config line), `DEMO_OFFLINE`, `AI_FALLBACK`, `DATA_SOURCE`. Print the model name and the two flags at startup. No Claude call yet (105 adds it)
- [ ] Error handler so every error body is `{"error": string}`, including 422 validation errors
- [ ] Pydantic models for `AgentMessage`, `Expects`, the upload result and the turn request/response. Add one example for `POST /api/turn` (the `report` step) and one for `POST /api/upload` to `data/contract-examples.json` and validate them at startup like the others; 102 copies them as mocks
- [ ] Sessions in memory (a dict keyed by session id, no database). Store uploaded files under `app/backend/data/uploads/<session_id>/` (gitignored). `read_ok` and `summary` are fixed lines in 101: any uploaded file maps to Jordan's matching fixture, with a comment that 112 replaces this with real reading
- [ ] `POST /api/turn` runs the step order above as a small state machine with scripted messages for Jordan. Report messages are built from the `POST /api/assess` example (one per `fail` rule, using its `plain_reason`, `rule_id` and cited evidence). Questions: (1) "What are you hoping to apply for?" chips "Credit card", "Car finance", "Mortgage", "Something else"; (2) the Hollis Lettings move question, chips "Yes", "No"; (3) "Roughly what do you take home each month?" text. Coach stub: after a goal and horizon chip, one message that reads the `POST /api/plan` example headline, then "Coach mode is coming next" for free text (113 replaces it). Messages: short, plain, at most 40 words each, "you", British spelling, no jargon without a one-line meaning
- [ ] Any step: a `letter` file input gets one acknowledgement message and the step does not change. Unknown session id returns 404 `{"error": "Unknown session"}`
- [ ] Start command in `app/DEMO.md`: `cd app/backend && uv run uvicorn main:app --reload --port 8000`. Run it in the background
- [ ] Commit after each working step

## Out of scope
- `app/frontend/` (partner's, 102)
- Rules, plan, projection (103), Claude calls (105), advice checking (106)
- Any database, auth, deployment, the Capital One API adapter (only if their brief requires it; Cowork adds a handoff)

## Verification
1. Start the backend with the command in `app/DEMO.md`. The log shows `Loaded 89 transactions, 3 accounts, 4 searches, 9 rules`, the model name, and no validation errors
2. `curl -s localhost:8000/api/health` prints `{"status":"ok"}`
3. `curl -s -X POST localhost:8000/api/assess -H 'content-type: application/json' -d '{"profile_id":"jordan-before"}' | jq -c '[.decision, (.rules|length), .rules[0].measured]'` prints `["decline",9,"94.5%"]`
4. `curl -s -X POST localhost:8000/api/plan -H 'content-type: application/json' -d '{"profile_id":"jordan-before"}' | jq -c '[.approval_likely_from, .after.decision, (.actions|length)]'` prints `["2027-01-13","approve_likely",3]`
5. `curl -s -X POST localhost:8000/api/check-advice -H 'content-type: application/json' -d '{"profile_id":"jordan-before","advice":"Apply for two or three other cards this week."}' | jq -c .summary` prints `{"supported":2,"contradicted":4,"misleading":1,"cannot_check":1}` (stub)
6. `curl -s -o /dev/null -w '%{http_code}\n' -X POST localhost:8000/api/assess -H 'content-type: application/json' -d '{"profile_id":"nobody"}'` prints `404`, and the body is `{"error":"Unknown profile_id: nobody"}`
7. `curl -s -X POST localhost:8000/api/assess -H 'content-type: application/json' -d '{}'` returns a 422 with an `{"error": ...}` body
8. Conversation walk with curl (save `session_id` from the first reply): `start` → file `credit_report` sample → file `bank` sample → `skip` → three answers → coach chips. Each reply has the expected `step` in order (`greet`, `ask_bank`, `ask_letter`, `questions`, ..., `report`, `paper`, `coach`), the `report` reply has one message per `fail` rule plus the decision line, and `assessment.decision` is `"decline"`
9. Send a `letter` sample file during `questions`: one acknowledgement message, `step` stays `questions`
10. `curl -s -F session_id=<id> -F file_kind=credit_report -F file=@app/backend/data/credit-file.json localhost:8000/api/upload | jq -c .read_ok` prints `true`
11. `app/DISCLOSURES.md` lists every package in `app/backend/uv.lock` and the fixtures row; `app/CONTRACT.md` matches the interface above word for word (`diff` against this file's bullets)

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
