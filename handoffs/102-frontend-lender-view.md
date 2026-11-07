---
id: 102
title: Frontend shell and the Lender view on mocks
status: ready
owner: partner
concept: lenders-eyes
created: 2026-11-06
time-budget: 90m
---

# 102: Frontend shell and the Lender view on mocks

## Goal
A Vite + React + TypeScript + Tailwind app in `app/frontend/` with the Start screen and the Lender view: decision banner, the three reason cards with evidence chips, watch and pass lists, and the evidence drawer. Works on the mock first, then on the backend from 101 with one switch.

## Context
- Read first: `CLAUDE.md`, `.claude/rules/frontend.md`, `prep/lenders-eyes/spec.md` (sections "The one demo flow" and "Screens and states", screens 1 and 2), `prep/lenders-eyes/demo-script.md` (steps 0:00 to 0:50)
- Starts after: nothing, 11:00
- Mock data: copy `prep/lenders-eyes/fixtures/contract-examples.json` into `app/frontend/src/mocks/` (ignore keys that start with `_`)
- Env vars: `VITE_USE_MOCK` (default `true`), `API_TARGET` for the Vite proxy (default `http://localhost:8000`), `VITE_SHOW_ADVICE` (default `false`, used in 104)
- **Interface with 101 (do not change it without telling Mihael):**
  - Backend on `http://localhost:8000`, all routes under `/api`. CORS allows `http://localhost:5173`
  - `GET /api/health` returns `{"status": "ok"}`
  - Shared shapes. `Evidence` = `{"kind": "transaction"|"file"|"projected", "id": string, "date": string, "label": string, "amount_gbp": number|null}`. `Source` = `{"title": string, "url": string, "quote": string}`. `Rule` = `{"rule_id": string, "name": string, "severity": "decline"|"watch", "result": "fail"|"watch"|"pass", "measured": string, "threshold": string, "clears_on": string|null, "plain_reason": string, "explained_by": "claude"|"template", "cited_ids": [string], "evidence": [Evidence], "sources": [Source]}`. `Assessment` = `{"profile_id": string, "as_of": string, "applicant": {"name": string, "synthetic": boolean}, "policy": {"name": string, "illustrative": boolean, "note": string}, "decision": "decline"|"approve_likely", "decision_line": string, "file_summary": {"revolving_utilisation_pct": number, "hard_searches_90d": number, "on_roll_at_current_address": boolean, "oldest_account_opened": string, "monthly_income_gbp": number, "dti_pct": number, "data_window": {"from": string, "to": string}}, "rules": [Rule]}`
  - `POST /api/assess` body `{"profile_id": string}` returns `Assessment`. The demo profile is `"jordan-before"`
  - `POST /api/plan` body `{"profile_id": string}` returns `{"profile_id": string, "as_of": string, "headline": string, "approval_likely_from": string|null, "before_you_apply": string, "actions": [{"action_id": string, "rule_id": string, "kind": "pay"|"register"|"wait", "do": string, "amount_gbp": number|null, "by_date": string, "clears_on": string, "why_this_date": string}], "affordability": {"balance_now_gbp": number, "balance_date": string, "bills_before_payday_gbp": number, "next_payday": string, "lowest_projected_balance_gbp": number, "buffer_gbp": number, "ok": boolean, "note": string}, "after": Assessment}`
  - `POST /api/check-advice` body `{"profile_id": string, "advice": string}` returns `{"profile_id": string, "claims": [{"claim_id": string, "quote": string, "claim_type": string, "verdict": "supported"|"contradicted"|"misleading"|"cannot_check", "confidence": number 0..1|null, "explanation": string, "evidence": [{"kind": "transaction"|"file"|"source", "id": string, "label": string, "url": string|null}]}], "summary": {"supported": number, "contradicted": number, "misleading": number, "cannot_check": number}}`. Optional add-on (handoff 106); until 106 is done it returns the example response
  - Dates are `YYYY-MM-DD` strings. Money is a number in pounds; negative means money out
  - Errors: HTTP 4xx/5xx with `{"error": string}`. Unknown `profile_id` returns 404
  - One example response per endpoint: `prep/lenders-eyes/fixtures/contract-examples.json` (key `"METHOD /api/path"`)
- 101 may not be finished when you start. Build against the mock and switch when Mihael says the backend is up
- Pattern: the setup lines in this handoff are the generic ones that passed practice (the generic handoffs are not copied into the event repo, so there is nothing to look up)

## Requirements
- [ ] Wait until `app/` exists on `main` (101 creates it), or create only `app/frontend/` if it does not
- [ ] Scaffold non-interactively: `pnpm create vite@latest <frontend folder> --template react-ts`, then Tailwind v4 via the `@tailwindcss/vite` plugin and `@import "tailwindcss";` in the main CSS (no `tailwind.config.js`, no PostCSS setup). Run the dev server in the background. Add every package to `app/DISCLOSURES.md` (if 101 has not created it yet, keep a list in RESULT and add them after the merge)
- [ ] Vite dev proxy `/api` to the target in env `API_TARGET`, default `http://localhost:8000` (not hard-coded)
- [ ] Types in `src/api.ts` mirror the contract exactly. `VITE_USE_MOCK=true` returns the matching example from `src/mocks/contract-examples.json` after a 1 second delay; `false` calls the backend. A dev-only way to force the error state in mock mode (for example `?mock=error` in the URL)
- [ ] Run `/impeccable init` (writes PRODUCT.md for this app: a calm, private, plain-English tool for a person who has just been declined; dignity, no blame, no jargon) and `/impeccable shape` for the Lender view. Distinctive, not the generic AI look. It should feel like reading a well-set official document, not a fintech dashboard
- [ ] **Start screen** (empty state): one sentence "See your credit file the way a lender's rules see it, and the date the answer changes", button "Open Jordan's file", and "Synthetic profile: invented person and lenders"
- [ ] **Lender view** (`POST /api/assess` with `{"profile_id": "jordan-before"}`), per spec screen 2:
  - Header: `applicant.name` with a "Synthetic" badge, "As of `as_of`", `policy.name`, and the line "Illustrative rules, not a real lender's model" always visible
  - Decision banner with `decision_line`. Decline and likely-approve states use colour and words (never colour alone)
  - One reason card per rule with `result: "fail"`, in contract order: `name`, `measured` against `threshold`, `plain_reason`, "Changes on `clears_on`" when not null, evidence chips (ids in `cited_ids` first, marked "cited"), and a small line from `explained_by`: "Explained by Claude, checked against your data" or "Standard wording"
  - Watch rules (amber, with their `plain_reason`) below the cards, then a collapsed "N checks passed" list
  - Money in tabular figures, right-aligned in lists, with £ and two decimals; negative amounts shown as money out
  - Evidence drawer: click any chip to open a side panel (bottom sheet at 390px) listing every evidence row of that rule (date, label, amount, a kind tag: transaction, file or projected) and then its sources (title, quote, link that opens in a new tab). Close with Esc or a close button
  - Button "Show the plan" (it can lead to a placeholder until 104)
- [ ] States: empty (Start), loading (skeleton of the banner and three cards), result, error ("Could not load the file", with Retry). All four reachable in mock mode
- [ ] Footer on every screen: "Illustrative rules for a demo. Not financial advice and not a real lending decision."
- [ ] No Capital One logo, colours or product names anywhere in the UI
- [ ] Start command added to `app/DEMO.md` (`cd app/frontend && pnpm dev`). Open `http://localhost:5173`, never `http://127.0.0.1:5173` (CORS allows `localhost` only)
- [ ] Commit after each working step

## Out of scope
- `app/backend/` (Mihael's)
- Plan, After and Advice screens (104)
- `/impeccable polish` and `/impeccable audit` (107 does them across all screens)

## Verification
1. `pnpm dev` with `VITE_USE_MOCK=true`. Use Playwright MCP to open `http://localhost:5173` at 1440px. Screenshot the Start screen
2. Click "Open Jordan's file". Screenshot the loading state, then the result at 1440px and at 390px. Visible: "Declined under this illustrative policy. 3 reasons.", three cards "Card balances compared with limits" (94.5%), "Recent credit applications" (3 in 90 days), "Electoral roll at your current address", the amber "Late or missed payments" watch, and "5 checks passed"
3. Click the chip for TX-020 on the first card. Screenshot the drawer at 1440px and 390px: it lists TX-020 OAKLEAF FURNITURE COVENTRY £520.00, TX-070 LARKFIELD CARD PAYMENT DD £25.00, the CARD-2026-09 entry £1,134.22, and the Experian source with its link
4. Force the error state in mock mode and screenshot it
5. With 101 running and `VITE_USE_MOCK=false`: open the Lender view and screenshot the same result from the real backend
6. `pnpm build` passes with no type errors
7. Paste the screenshot paths into RESULT

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
