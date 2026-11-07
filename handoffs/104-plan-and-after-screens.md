---
id: 104
title: Plan and After screens, real backend, optional advice panel
status: ready
owner: partner
concept: lenders-eyes
created: 2026-11-06
time-budget: 2h30m
---

# 104: Plan and After screens, real backend, optional advice panel

## Goal
The rest of the demo path: the Plan screen (headline, dated timeline, action cards, affordability) and the After view, where the same Lender view shows the projected file and the decision flips to "Likely approved". Switched to the real backend once 103 is merged. If time allows, the optional "Check advice" panel behind a flag.

## Context
- Read first: `prep/lenders-eyes/spec.md` (section "Screens and states", screens 3, 4 and 5), `prep/lenders-eyes/demo-script.md` (steps 0:50 to 1:30), `app/CONTRACT.md`, `app/frontend/src/api.ts` (from 102)
- Starts after: 102. The real-backend step needs 103 merged (Mihael will say)
- Interface: `app/CONTRACT.md`, unchanged. Plan data from `POST /api/plan` with `{"profile_id": "jordan-before"}`; the After view uses `plan.after` (same `Assessment` shape as the Lender view). Advice from `POST /api/check-advice`
- Mock data: `app/frontend/src/mocks/contract-examples.json` (already copied in 102). For the advice panel, copy `prep/lenders-eyes/fixtures/chatbot-advice.txt` into `app/frontend/src/mocks/` too
- Env vars: `VITE_USE_MOCK`, `API_TARGET`, `VITE_SHOW_ADVICE` (default `false`)
- Design: keep using Impeccable (`/impeccable shape` for each new screen). Same type, colour and spacing as the Lender view

## Requirements
- [ ] **Plan screen** (spec screen 3), opened by "Show the plan" on the Lender view:
  - `headline` as the largest text on the screen
  - Timeline from `as_of` (2026-11-07) to `approval_likely_from` (2027-01-13): for each action a filled marker at `by_date` and an outlined marker at `clears_on`, labelled with the action's `do`, and a final marker "Likely approved from 2027-01-13". Plain CSS or SVG, no chart library. Dates as `YYYY-MM-DD`. At 390px it becomes a vertical list in date order
  - Action cards A1 to A3: `do`, £ amount when not null, "By `by_date`", "Changes on `clears_on`", `why_this_date`
  - Affordability strip: `note`, and "Lowest projected balance before payday (`next_payday`): £556.24". Amber with the words "Check this" if `ok` is false
  - `before_you_apply` line
  - Button "See my file on `approval_likely_from`" opens the After view
  - States: loading, result, error (Retry)
- [ ] **After view** (spec screen 4): reuse the Lender view component with `plan.after`. The banner shows `after.decision_line` in the likely-approved style. On each rule, a change marker computed in the frontend by matching `rule_id` with the before assessment: "Was fail, now watch", "Was fail, now pass", or nothing if unchanged. A Before / After toggle at the top. Projected evidence rows carry a "projected" tag in the drawer
- [ ] Back navigation between Lender view, Plan and After without refetching (keep the responses in state)
- [ ] Switch to the real backend: `VITE_USE_MOCK=false`, walk Start, Lender view, Plan, After. Note any difference from the mock in RESULT and tell Mihael (the numbers must be identical; only `plain_reason` wording may differ)
- [ ] **Optional, cut first** (spec screen 5), only if the above is done and screenshotted: "Check advice" panel shown only when `VITE_SHOW_ADVICE=true`. Textarea (max 4,000 characters), "Use sample advice" fills the text of `chatbot-advice.txt`, "Check" calls `POST /api/check-advice`. Summary counts at the top, then one row per claim: the quote, the verdict as a word and a colour (supported, contradicted, misleading, cannot check), confidence as a whole percentage or "cannot check" when null, the explanation, evidence chips (source chips open their `url` in a new tab). States: empty (Check disabled), loading, result, "No checkable claims found" (empty `claims`), error
- [ ] Add any new packages to `app/DISCLOSURES.md`
- [ ] Commit after each working step

## Out of scope
- `app/backend/`
- `/impeccable polish` and `/impeccable audit` (107)
- Any money movement, reminders or calendar export

## Verification
1. Mock mode, Playwright MCP at 1440px: open `http://localhost:5173`, Open Jordan's file, Show the plan. Screenshot the Plan screen at 1440px and 390px. Visible: the headline starting "Pay £565 to your Larkfield Card by 2026-11-17", three action cards (A1 £565.00 by 2026-11-17, changes on 2027-01-13; A2 by 2026-11-10, changes on 2026-12-01; A3 until 2027-01-10), the timeline ending at 2027-01-13, and "£556.24"
2. Screenshot the Plan loading state and the Plan error state (forced in mock mode)
3. Click "See my file on 2027-01-13". Screenshot the After view at 1440px and 390px. Visible: "Likely approved under this illustrative policy. 2 things to watch.", R-UTIL "Was fail, now watch" at 44.8%, R-SRCH "Was fail, now pass" at 1 in 90 days, R-ROLL "Was fail, now pass"
4. Open the drawer on the After R-UTIL rule and screenshot: CARD-2026-11 £537.20 and P-02 LARKFIELD CARD PAYMENT, plan action A1, £565.00, both with a "projected" tag
5. Real backend (`VITE_USE_MOCK=false`, 103 merged): repeat 1, 3 and 4 and screenshot. Numbers and evidence ids identical to the mock (only `plain_reason` wording may differ)
6. If the advice panel was built: `VITE_SHOW_ADVICE=true`, mock mode, click "Use sample advice", Check. Screenshot the result at 1440px: summary "2 supported, 4 contradicted, 1 misleading, 1 cannot check" and eight rows. Screenshot the empty and error states
7. `pnpm build` passes with no type errors. Paste screenshot paths into RESULT

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
