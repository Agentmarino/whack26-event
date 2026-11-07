---
id: 102
title: Frontend, the NPC stand and chat on mocks (rewritten 2026-11-07)
status: ready
owner: partner
concept: lenders-eyes
created: 2026-11-07
time-budget: 120m
---

# 102: Frontend, the NPC stand and chat on mocks

## Goal
A Vite + React + TypeScript + Tailwind app in `app/frontend/`: a pixel-art credit agent at a Capital One stand who talks the user through the whole check as a chat. Uploads (credit report, bank data, optional letter), quick-reply chips, the report one message at a time with evidence, the paper summary sliding across the desk, then coach mode. Works on the mock first, then on the backend from 101 with one switch.

## Context
- **Brief (2026-11-07): Capital One "Make credit accessible".** Our angle: credit is inaccessible because nobody can understand it. The agent makes the lender's view understandable, in plain words, one message at a time. Accessibility also means the app itself must work for everyone (see the Accessibility requirements)
- **This replaces the old 102 (Start screen plus Lender view).** The old flow is gone; the app is one screen: the stand scene on top, the chat below
- Tone: game look, real help. The agent is calm, warm and direct. No points, levels or jokes. The person may have just been declined
- Capital One branding is allowed (team decision). Their navy and red, the "Capital One" name on the stand. Do not hand-draw their logo: keep the text placeholder from 108 until we get the official asset
- **The character is done (108 to 111, merged):** `app/npc-concept/src/npc/` is a self-contained kit: `NpcScene` (128x96 canvas, 4:3, whole-number scaling, glass-wall office, desk with the logo monitor and the upload tray), `DialogueBox`, `useIntegerScale`, `usePrefersReducedMotion`, and the `NpcHandle` (`setState`, `emote`, `gesture`, `talk`, `stopTalking`). Defaults: facial hair `moustache-stubble`, background `day`. Copy the folder into `app/frontend/src/npc/` unchanged and follow `app/npc-concept/ART-GUIDE.md` (how to lift it, the font, iPhone notes). `app/npc-concept/src/App.tsx` is a full working example including the sample conversation runner. Do not edit the kit; ask Mihael if it needs a change
- **The demo runs on an iPhone (Safari, portrait).** Design for 390x844 first, then check desktop. Lessons from the 109 phone screenshot: (1) the text speed row ate a third of the dialogue box, so put speed and Demo mode behind a small settings button; (2) the reply input started below the screen edge, so the input area must be visible without scrolling on a 390x844 screen; (3) Press Start 2P at body size fits about three words a line, so test a smaller pixel font for message text, or a clean readable font for the body with the pixel font for the name tag and buttons (readability is the brief). Tray tap opens the file picker (no drag and drop on iPhone)
- Read first: `CLAUDE.md`, `.claude/rules/frontend.md`, `context/concepts.md` (Lender's Eyes)
- Starts after: nothing. 101 may not be finished: build against the mock and switch when Mihael says the backend is up
- Mock data: copy `prep/lenders-eyes/fixtures/contract-examples.json` into `app/frontend/src/mocks/` (ignore keys that start with `_`). For `/api/turn`, write a mock script in `src/mocks/turns.ts` that returns the same step order as the contract below on Jordan's sample (use the `POST /api/assess` example for the report messages), so the whole chat runs in mock mode
- Env vars: `VITE_USE_MOCK` (default `true`), `API_TARGET` for the Vite proxy (default `http://localhost:8000`)
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
  - **Conversation (added 2026-11-07, the app is now a chat with the pixel NPC agent; the backend owns the conversation, the frontend only renders it)**
  - `AgentMessage` = `{"id": string, "text": string, "emote": "neutral"|"warm"|"concerned"|"pleased", "gesture": "none"|"wave"|"asking"|"receive-document"|"reading"|"thinking"|"explaining"|"slide-paper"|"coach", "rule_id": string|null, "evidence": [Evidence]}`. Frontend maps `gesture` and `emote` onto the 108 NPC states; `text` is shown with the typewriter, one message at a time
  - `Expects` = `{"kind": "file"|"choice"|"text"|"none", "file_kinds": ["credit_report"|"bank"|"letter"], "chips": [string], "optional": boolean, "placeholder": string|null}`. What input the agent waits for next
  - `Step` = `"greet"|"ask_report"|"ask_bank"|"ask_letter"|"questions"|"assessing"|"report"|"paper"|"coach"`
  - `POST /api/upload` multipart form: `session_id`, `file_kind` (`credit_report`|`bank`|`letter`), `file`. Returns `{"file_id": string, "file_kind": string, "name": string, "read_ok": boolean, "summary": string}` (summary is one plain line, for example "Credit report: 3 accounts, 4 searches, 2 addresses")
  - `POST /api/turn` body `{"session_id": string|null, "input": {"type": "start"|"file"|"skip"|"choice"|"text", "file_kind": string|null, "file_id": string|null, "sample": boolean, "value": string|null}}`. `start` with `session_id: null` opens a session. `sample: true` with `type: "file"` uses the built-in Jordan file of that kind (demo button "Use sample"). A `letter` file is accepted at ANY step: the agent acknowledges it in one message and carries on where it was
  - Returns `{"session_id": string, "step": Step, "messages": [AgentMessage], "expects": Expects, "assessment": Assessment|null, "plan": Plan|null, "paper_url": string|null}`. `assessment` is set from the `report` step on, `paper_url` from the `paper` step on
  - Step order: `greet` (wave, then ask for the credit report) → `ask_report` → `ask_bank` → `ask_letter` (optional, chips "Upload letter" / "I don't have one") → `questions` (2 to 4, some built from the data, for example "Your rent has gone to Hollis Lettings since 2026-08-01. Did you move recently?") → `assessing` (thinking) → `report` (decision line, then ONE message per failing reason, gesture `explaining`, `emote` `concerned` for bad news delivered kindly, then watch items in one message) → `paper` (gesture `slide-paper`, the summary sheet) → `coach` (goal chips "Credit card", "Car finance", "Mortgage", "Something else"; then horizon chips "3 months", "6 months", "12 months"; then free text)
  - `GET /api/paper/{session_id}.pdf` returns the summary package (built in 114; until then 404 `{"error": "Summary not built yet"}`)

## Requirements
- [ ] Wait until `app/` exists on `main` (101 creates it), or create only `app/frontend/` if it does not
- [ ] Scaffold non-interactively: `pnpm create vite@latest <frontend folder> --template react-ts`, then Tailwind v4 via the `@tailwindcss/vite` plugin and `@import "tailwindcss";` in the main CSS (no `tailwind.config.js`, no PostCSS setup). Run the dev server in the background. Add every package to `app/DISCLOSURES.md`
- [ ] Vite dev proxy `/api` to the target in env `API_TARGET`, default `http://localhost:8000` (not hard-coded)
- [ ] Types in `src/api.ts` mirror the contract exactly. `VITE_USE_MOCK=true` uses the mocks after a short delay (600 ms); `false` calls the backend. `?mock=error` forces the error state
- [ ] Run `/impeccable init` (PRODUCT.md: a pixel-art credit agent at a Capital One stand who explains, in plain words, why a lender said no and how to get to yes; game look, real help; calm, warm, no blame). Answer its questions yourself from this Context
- [ ] **Layout:** one screen. Scene on top (the kit's 4:3 `NpcScene`, whole-number scaling), chat below: the current agent message in the dialogue box, a scrollable history above it (collapsed to the last few by default), and the input area under it, which changes with `expects`: file drop plus "Use sample" and "Choose file" buttons for `file`, chips for `choice`, a text box for `text`, nothing for `none`. "Skip" shown when `optional`
- [ ] **Driving the NPC:** for each message, call the NPC with its `gesture` and `emote`, type the text, and wait for the user (click, space or Enter) before the next message. While waiting for a reply, `thinking`. On a file drop: `receive-document`, then `reading` while the upload runs
- [ ] **Letter any time:** a small "Have a decline letter?" button is always visible; it uploads a `letter` file and sends a `file` turn
- [ ] **Report messages:** a message with `rule_id` shows a compact card under the text: rule name, `measured` against `threshold`, and evidence chips. Click a chip to open the evidence drawer (side panel, bottom sheet under 640px): every evidence row (date, label, amount, kind tag) and the rule's sources (title, quote, link in a new tab). Esc closes it
- [ ] **Paper:** on `slide-paper`, the sheet slides across the counter. Clicking it opens a paper-styled summary overlay of the assessment (decision line, the reasons, the plan headline if present) with a "Download" button that opens `paper_url` (show "Summary not built yet" if it 404s; 114 builds the PDF)
- [ ] **Coach mode:** when `step` becomes `coach`, the NPC switches to its coach look; chips for goal and horizon, then the text box
- [ ] **Speed:** a speed control (1x, 2x, instant) and a "Demo mode" toggle that sets instant text and auto-clicks "Use sample" for each file step (for the timed pitch)
- [ ] **Accessibility (this is the brief, judges will check it):**
  - Every agent message is real DOM text (not drawn on canvas), in an `aria-live="polite"` region, so screen readers read it. The scene canvas has an `aria-label` describing what the agent is doing
  - Full keyboard use: Tab through chips, buttons and the drop zone; Enter or space activates; visible focus ring
  - Text size control (A, A+, A++) for the chat; at the largest size nothing overlaps
  - `prefers-reduced-motion`: no idle bobbing or sliding, state changes still shown (instant), typewriter off
  - Contrast at least WCAG AA for all text, including on navy and red. Never colour alone for pass/fail (words plus colour)
  - Plain words on every label. Any credit term shown (for example "utilisation", "hard search") has a tap-to-explain tooltip in one plain line
- [ ] States: loading (agent `thinking`), error (agent `concerned`, message "Something went wrong on my side. Try again?" with a Retry chip), all reachable in mock mode
- [ ] Footer: "Illustrative rules for a demo. Not financial advice and not a real lending decision."
- [ ] Start command in `app/DEMO.md` (`cd app/frontend && pnpm dev`). Open `http://localhost:5173`, never `http://127.0.0.1:5173`
- [ ] Commit after each working step

## Out of scope
- `app/backend/` and `app/npc-concept/` (Mihael's)
- Real file reading (112), coach plans and coach chat (113), the PDF (114)
- `/impeccable polish` and `/impeccable audit` (107)

## Verification
1. `cd app/frontend && pnpm dev --host` with `VITE_USE_MOCK=true`. Playwright WebKit `iPhone 15` portrait first, then desktop 1440x900
2. With Playwright MCP, run the whole mock chat with "Use sample" for each file: greet, report, bank, skip letter, three answers, report messages (one card per failing reason, chips open the drawer), paper slides and opens, coach chips. Screenshot each step (wait a second and take it twice) into `app/frontend/screens/`
3. Keyboard only (no mouse): run the same flow with Tab, Enter and space. Note any step that needs the mouse
4. Reduced motion (Playwright `reducedMotion: "reduce"`): no animation, flow still works. Largest text size: screenshot, nothing overlaps
5. `?mock=error`: the error message and Retry chip show
6. When the backend is up: `VITE_USE_MOCK=false`, run the flow once against `localhost:8000`, no console errors

---

## RESULT (filled in by Claude Code)
- Status:
- Time taken:
- What was built:
- Files changed:
- Verification run and output:
- Follow-ups needed after the first prompt (prompt deltas):
- Open issues / follow-ups:
