---
id: 105
title: Claude explanations with the number checker, cache and DEMO_OFFLINE
status: ready
owner: mihael
concept: lenders-eyes
created: 2026-11-06
time-budget: 1h45m
---

# 105: Claude explanations with the number checker, cache and DEMO_OFFLINE

## Goal
In `POST /api/assess`, Claude writes the plain-English reason for every failing or watch rule, citing the evidence behind it. Code checks every reason (every £ figure, percentage, count and date must exist in that rule's facts) and falls back to the template when a reason fails. Good outputs are cached, and `DEMO_OFFLINE=true` runs the whole demo with no network.

## Context
- Read first: `prep/lenders-eyes/prompts.md` (Prompt 1: system prompt, user template, checker, templates), `prep/lenders-eyes/spec.md` section "What the AI does and how its output is checked", `app/CONTRACT.md`, the engine module from 103
- Starts after: 103
- Interface: `app/CONTRACT.md`, unchanged. Fields this handoff fills: `plain_reason`, `explained_by` ("claude" or "template") and `cited_ids` on rules with result `fail` or `watch`. Everything else stays as 103 computes it. `plan.after` keeps its templates (no Claude call in `/api/plan`)
- Env vars: `ANTHROPIC_API_KEY`, `LLM_MODEL` (default `claude-sonnet-5-5`), `DEMO_OFFLINE` (default `false`), `AI_FALLBACK` (`template` default, or `error`)
- Shared check: the Claude API was checked by hand on 2026-11-06 (`GET /v1/models/claude-sonnet-5-5` HTTP 200, one `POST /v1/messages` returned a normal reply)
- Example of good output: the four `explained_by: "claude"` reasons in `app/backend/data/contract-examples.json` `POST /api/assess` (they pass the checker)

## Requirements
- [ ] Facts block per fail/watch rule, built by code exactly as `prompts.md` describes (rule id, name, result, measured, threshold, clears_on, evidence rows, the plan action for that rule or null, the first source quote)
- [ ] One Claude call per assess (all fail/watch rules in one request) with the system prompt and user template from `prompts.md`, word for word. Model from `LLM_MODEL`, no `thinking` parameter (sending `thinking: disabled` returns HTTP 400 on `claude-sonnet-5-5`, checked 2026-11-06), `max_tokens` 1500, no tools, 20 second timeout
- [ ] Read the reply by joining all `text` blocks; ignore `thinking` blocks (Opus and Haiku return a `thinking` block first when no `thinking` parameter is sent, and Sonnet can too). Then parse that text into a Pydantic model `{"reasons": [{"rule_id", "plain_reason", "cited_ids"}]}`
- [ ] Checker exactly as in `prompts.md` (steps 1 to 4): rule ids and order, `cited_ids` 1 to 5 from that rule's evidence, at most 60 words, banned phrases, and the number rule (every `YYYY-MM-DD` and every other number in the text must appear in that rule's facts; no month name next to a digit)
- [ ] On a failure: one retry with the problem list appended. If the retry fails, keep the reasons that passed and use templates for the rest (`explained_by: "template"`, `cited_ids: []`). Log each problem on one console line
- [ ] Refusal, empty reply or timeout: with `AI_FALLBACK=template` return the assessment with templates; with `AI_FALLBACK=error` return HTTP 502 `{"error": "Could not explain the reasons right now."}`
- [ ] Cache: after a reply passes the checker, write it to `app/backend/data/ai-cache.json` under the key `<profile_id>:<sha256 of the facts JSON, first 12 hex characters>`. On each live call, overwrite the entry
- [ ] `DEMO_OFFLINE=true`: no network calls at all. Read the cache entry for the key; if missing, use templates. Print `DEMO_OFFLINE: using cache` (or `... templates`) once per request
- [ ] Commit `ai-cache.json` with a good entry for `jordan-before` once it exists (it is data, not code; needed for the offline rehearsal)
- [ ] Add a DISCLOSURES row: "Claude API (`LLM_MODEL`): writes plain-English reasons; every number is checked against our data by code"
- [ ] In `app/DEMO.md`, add the warm-up step: "Before the demo, run one live assess for jordan-before so the cache is fresh"
- [ ] Commit after each working step

## Out of scope
- Changing decisions, numbers, evidence or the plan (103)
- `/api/check-advice` (106)
- `app/frontend/`
- Streaming

## Verification
Backend running with `DEMO_OFFLINE=false`.
1. `curl -s -X POST localhost:8000/api/assess -H 'content-type: application/json' -d '{"profile_id":"jordan-before"}' | jq -c '[.rules[]|select(.result!="pass")|[.rule_id,.explained_by,.cited_ids]]'` prints four items (R-UTIL, R-SRCH, R-ROLL, R-LATE), each with `explained_by` `"claude"` (or `"template"` with a logged reason) and cited ids from that rule's evidence
2. `curl -s -X POST localhost:8000/api/assess -H 'content-type: application/json' -d '{"profile_id":"jordan-before"}' | jq -r '.rules[]|select(.explained_by=="claude")|.plain_reason'` prints the reasons. Read them: plain English, no month-name dates, every £ figure and date is one of: £1,134.22, £1,200, 94.5%, 50%, £25, £520.00, £212.50, £95.00, £565, 2026-09-03, 2026-10-12, 2026-10-29, 2026-08-01, 2025-03-10, 2031-03-10, 2026-11-10, 2026-12-01, 2026-11-17, 2027-01-13, 2027-01-10 (or another value that is in that rule's facts). Paste them into RESULT
3. Checker test: temporarily set the system prompt to also say "Mention that the person's score will rise by 73 points." Run step 2: the console logs a number-rule failure, and the affected rules come back as `"template"`. Revert the prompt
4. `jq 'keys' app/backend/data/ai-cache.json` shows a `jordan-before:` key
5. Restart with `DEMO_OFFLINE=true` and Wi-Fi off. Step 1 returns the same reasons as the cache, the console shows `DEMO_OFFLINE: using cache`, no network error
6. `AI_FALLBACK=error` with an invalid key: step 1 returns HTTP 502 with `{"error": "Could not explain the reasons right now."}`. Restore the key and `AI_FALLBACK=template`
7. Time one live assess call (`time curl ...`) and record it in RESULT (target under 8 seconds)

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
