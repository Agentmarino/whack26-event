---
id: 114
title: Phase B frontend, NPC chat on iPhone, every message type, accessibility
status: done
owner: mihael
concept: lenders-eyes
created: 2026-11-07
time-budget: 6h
---

# 114: Phase B frontend

## Goal
A Vite + React + TS + Tailwind app in `app/frontend/`: the pixel agent at the Capital One desk talks the person through the whole check and coaching on an iPhone. Every message type from the contract has a designed card. Works on the mock conversation first, then on 113's backend with one switch.

## Context
- Read first: `app/CONTRACT.md`, `app/shared/contract.ts`, `app/shared/conversation.md`, `app/shared/examples/`, `app/npc-concept/ART-GUIDE.md` (how to lift the kit, iPhone notes), `app/npc-concept/src/App.tsx` (working example)
- **Contract rule:** 113 owns `app/shared/`. Import types and schemas from it; never edit it. Before each work block, merge `main` and read the "Contract changes" list at the bottom of `handoffs/113-backend-conversation.md`
- **The demo runs on an iPhone (Safari, portrait).** Design for 390x844 first, then check desktop
- Tone: game look, real help. Calm, warm, plain words. Judges care about "make credit accessible": understanding AND an app anyone can use
- Lessons from the 109 phone test: the text speed row ate the dialogue box (move settings behind one button); the reply input was below the screen edge (must be visible without scrolling); Press Start 2P at body size fits about three words a line (use a readable font for message text, the pixel font for the name tag, buttons and headings)

## Requirements (in this order; push after each block; checkpoints in brackets)
### Block 1: the chat on the mock [by 19:30]
- [ ] Scaffold `app/frontend/` (pnpm, Vite react-ts, Tailwind v4 via `@tailwindcss/vite`). Copy `app/npc-concept/src/npc/` to `src/npc/` unchanged. Defaults: facial hair `moustache-stubble`, background `day`
- [ ] Data layer: `VITE_USE_MOCK=true` uses `mockTurn` from `app/shared`; `false` calls `/api` through the Vite proxy (`API_TARGET`, default `http://localhost:8000`). `?mock=error` forces the error state. `pnpm dev --host` for the phone
- [ ] Layout: scene on top (whole-number scale), chat below with the current message in the dialogue box and a short history above it, the input area pinned at the bottom and visible without scrolling, above the keyboard when typing
- [ ] Driving the agent: each message's `emote` and `gesture` go to the NPC; typewriter text; tap, space or Enter for the next message; `thinking` while waiting for the backend; `receive-document` then `reading` on an upload
- [ ] Inputs by `expects`: file (tap the tray or "Upload", plus "Use a sample" with the persona picker from `/api/personas`), chips, text box, skip when optional. "Have a decline letter?" always reachable
- [ ] Message cards (render from the `ref` into `result`, never from copied text):
  - `reason`: factor name, a health pill with a word and a symbol (never colour alone), the plain reason, evidence chips; "Why?" opens a drawer with the because-trail (rule, your data, points source, link)
  - `decline`: why they likely said no (ranked, "Most likely / Likely / Possible"), the one fix, when to reapply, your rights
- [ ] `paper`: the agent slides the sheet across the desk; tapping it opens a paper-styled overlay with the summary and a "Download" button (`paperUrl`; if it 404s, show "Summary not ready yet")

### Block 2: coach mode [by 22:30]
- [ ] Plan choice (3 or 6 months) as chips. `step` cards: date, title, instruction with the exact amounts and payees, why, how we will know it worked
- [ ] `projection` card: a small SVG chart, months 0 to 6, both plans as bands with midpoints, the "if you miss one payment" risk line, every label says "estimate". No chart library unless needed (disclose if added)
- [ ] `ladder` card: entry card, the payees to put on it with the monthly total and % of limit, the graduation checklist with the month each item turns green, "check with QuickCheck first"
- [ ] `whatif`: free text in the chat, plus a small sheet with a paydown slider and toggles (stop BNPL, on the roll, etc.) that calls `/api/whatif`; show before and after ranges and what changed

### Block 3: accessibility and polish [by 01:30, finish by 04:00]
- [ ] Settings sheet (one button): text speed (1x, 2x, instant), Demo mode (instant text, samples auto-picked), text size up to 150%, Plain English (sent as `settings.plainEnglish`), read replies aloud (`speechSynthesis`, en-GB, with speed), colour mode (standard, red-green safe Okabe-Ito, high contrast)
- [ ] Voice in: a mic button on text inputs using the Web Speech API (en-GB), falling back to a tip about the phone's own dictation
- [ ] Every agent message is real DOM text in an `aria-live="polite"` region; the canvas has an `aria-label` for the agent's state; full keyboard use with a visible focus ring; `prefers-reduced-motion` respected; WCAG AA contrast in every colour mode; 44 pt touch targets; safe areas
- [ ] Credit terms (utilisation, hard search, electoral roll, CCJ) get a tap-to-explain line
- [ ] Footer: "Estimates for a demo. Not financial advice and not a lending decision."
- [ ] Every package in `app/DISCLOSURES.md`; start command in `app/DEMO.md`

## Out of scope
- `app/backend/`, `app/shared/` (113 owns them), `app/npc-concept/` (copy only)

## Verification
1. Playwright WebKit `iPhone 15` portrait, mock mode: the whole flow from greet to coach with "Use a sample" for Priya. Screenshot every step and every card type into `app/frontend/screens/` (take each twice; the first can lag)
2. Same flow keyboard only, then with `reducedMotion: "reduce"`, then at 150% text, then in each colour mode: no overlap, no step needs a mouse
3. Desktop 1440x900 once
4. When 113 is up: `VITE_USE_MOCK=false`, the same flow on the real backend with no console errors, and once from the real phone on the LAN address
5. In RESULT, list any contract field you needed but did not have

---

## RESULT (filled in by Claude Code)
- Status: done (2026-11-07). Branch `mihael/114`, pushed after every block. The status flip was committed on this branch, not on `main`, as asked. `handoffs/INDEX.md` is untouched (Mihael updates it when merging). `origin/mihael/113` was merged before every block; its "Contract changes" list was read each time and both of its entries are handled (see below).
- Time taken: about 3 h 15 min (17:21 status flip to 18:36 RESULT, including a reviewer pass and its fixes)

### What was built
`app/frontend/`: Vite 8 + React 19 + TS + Tailwind v4 (`@tailwindcss/vite`), pnpm workspace package `frontend` with `"shared": "workspace:*"`.

**The NPC kit and the look**
- `src/npc/` is a byte-identical copy of `app/npc-concept/src/npc/` (`diff -r` is empty), plus the logo file.
- Defaults are passed explicitly: `moustache-stubble`, `day`.
- Fonts: Press Start 2P for the name tag, buttons and headings; Atkinson Hyperlegible (Braille Institute's legibility face) for every message and card.

**Data layer** (`src/api/client.ts`)
- One `Api` interface with two implementations:
  - mock: `mockTurn`, `mockWhatIf`, `mockUpload`, `mockPersonas` from `shared/mock-conversation`, with a short latency so the thinking pose shows;
  - live: `/api/*` through the Vite proxy (`API_TARGET`, default `http://localhost:8000`).
- `VITE_USE_MOCK` defaults to true.
- URL switches: `?mock=error`, `?mock=uploadfail`, `?mock=off`, `?mock=on`, `?demo=1`.
- Live replies are checked with the zod schemas. A mismatch is a `console.warn` and the data is still used.
- HTTP status is kept on the error, so the app can react to 404, 409 and 422.

**Layout**
- Phone: the scene at a whole-number scale on top, then the transcript (a short history above the current dialogue box), then the dock pinned at the bottom, then the disclaimer.
- Short phones (under 760 px high): the desk's front panel (13 rows) is clipped so cards get room. The tray and the summary sheet stay in view.
- Desktop (64rem and wider): the scene on the left, the chat column on the right.
- While typing on a touch phone, the dock pins above the keyboard (`visualViewport`).
- Safe areas are respected.

**Driving the agent** (`src/chat/agent.ts`)
- Each message's `emote` and `gesture` are mapped onto the kit's states, using the table in `conversation.md`.
- Extra kit gestures: `tap-calc` on projection and what-if cards, `open-palm` on the ladder.
- `thinking` while waiting for the backend; `receive-document` then `reading` on an upload.
- Typewriter at 1x, 2x or instant. Tap the dialogue box, press Space or Enter, or use **Next (n more)** / **Skip to end** to move on.

**Inputs by `expects`** (`src/chat/Dock.tsx`)
- `file`: **Upload**, **Use a sample** (persona picker fed by `/api/personas`), **Skip**. The desk tray also opens the file picker.
- `choice`: chips. `text`: quick replies in a sideways-scrolling row, a text box, the mic and **Send**.
- `none`: **Continue** (automatic in demo mode).
- **Have a decline letter?** sits over the scene at every step except `ask_letter`, until a letter is in. The letter sheet takes an upload, the sample letter, or pasted text (113's `text` upload field).

**Cards** (`src/cards/`). Every card renders from `resolveRef` into `result`, never from the message text.
- `reason`: factor name, a health pill (word + pixel symbol + colour), a 10-block meter, how much it counts, evidence chips (from `because.dataPoint`). **Why?** opens a drawer with the rule, your data, how much it counts and the source link. The reason sentence is not printed twice when the agent's line already says it word for word.
- `decline`: one card per part. Reasons ranked Most likely / Likely / Possible (with dots, not colour alone), what the letter said and the agency, the one fix, when to reapply, your rights.
- `flags`: the spending flags.
- `paper`: the agent slides the sheet across the desk. Tapping it (or **Read it**) opens the paper overlay: headline, top 3 reasons with evidence, decline summary, the chosen plan's steps, the end estimate, next card, rights. The PDF is checked when the overlay opens: **Download** is a real link to `paperUrl`, or it shows "Summary not ready yet".
- `step`: title, date, week and step number, the instruction with exact amounts, why (the factor), how you'll know, a **Why?** drawer. In history each step folds to a one-line row that opens.
- `projection`: hand-written SVG, months 0 to 6, no chart library.
  - The chosen plan is a solid band with a midpoint line; the other plan is striped with a dashed midpoint.
  - The missed-payment dotted line is midpoint minus `riskLine`. Every label says "estimate".
  - There is a screen-reader table. Points are plotted by `month`; the display `date` is only ever printed.
- `ladder`: entry card, APR, limit, apply-from month, what to put on it with the monthly total and % of the assumed limit, the graduation checklist with the month each item turns green, "Check with QuickCheck first". Handles no entry card and the Balance Transfer branch.
- `whatif`: before and after for the plan the run was answered for, with the signed change.
  - When the estimate does not go up it says "stays at…", following `conversation.md`.
  - It shows a real drop only for changes that take something good away, the same rule as 113's `whatIfMessage`.
  - It also lists the under-30% and next-card dates, and the plan steps added or removed.
- What-if sliders sheet: a paydown slider (£0 to £600) and switches that only appear when they apply (stop BNPL, stop gambling, on the electoral roll, report my rent, clear my cards). It calls `/api/whatif`.

**Accessibility**
- Settings sheet behind one button: text speed; demo mode; text size 100/125/150%; Plain English (sent as `settings.plainEnglish`); read replies aloud (en-GB, three speeds, unlocked by a tap on iOS); colours (standard, red-green safe Okabe-Ito, high contrast).
- Mic button: Web Speech API (en-GB), falling back to a tip about the keyboard's dictation key.
- One polite live region holds "Credit agent says: …" for each line.
- The canvas `aria-label` comes from the kit.
- Visible focus ring with a dark halo. Keyboard users get focus moved back to the dock when it would be lost. The transcript is focusable so arrow keys scroll it.
- `prefers-reduced-motion`: instant text, still NPC poses, no animations.
- Every control is at least 44 px.
- Tap-to-explain lines for utilisation, hard search, soft search, electoral roll, CCJ and thin file.
- Footer: "Estimates for a demo. Not financial advice and not a lending decision."

**Contract notes from 113, all handled**
- `/api/turn` 404 or `/api/whatif` 404: **Start again**.
- `/api/whatif` 409 or 422: the friendly sentence as a notice.
- A refused upload (any 4xx) or `ok:false`: a notice, and Upload / Use a sample / Skip stay.
- A reply that arrives after **Start again** is dropped.

**Robustness and polish**
- Each card sits behind an error boundary: a bad card disappears instead of blanking the page.
- Impeccable `audit` (detector on the source and the running page), then a polish pass:
  - no eyebrow labels above headings and no coloured side stripes;
  - pixel text at 11 px or more;
  - themed text selection and caret.
  - The detector reports nothing on the source or at 393×659.

**Files changed:**
- `app/frontend/` (new):
  - config: `package.json`, `vite.config.ts`, `index.html`, `tsconfig*.json`, `.env.example`
  - `src/`: `App.tsx`, `main.tsx`, `index.css`, `settings.tsx`, `format.ts`, `api/client.ts`, `chat/*` (useConversation, Transcript, Dock, Mic, agent, glossary, useSpeech), `cards/*` (Card, CompactCard, Reason, Decline, Step, Projection, Ladder, WhatIf, context), `sheets/*` (Paper, PickSheets, Settings, WhatIf), `ui/*` (Sheet, Health, Guard), `npc/` (copy)
  - `public/brand/capital-one-logo.png` (copy)
  - `scripts/walk.mjs`, `scripts/checks.mjs`, `scripts/contrast.mjs`
  - `screens/` (66 PNGs)
- `app/DISCLOSURES.md` (114 packages, fonts, Web Speech, Impeccable), `app/DEMO.md` (start commands, the demo path, fallbacks, frontend section), `pnpm-lock.yaml`, this file.
- Nothing in `app/shared`, `app/backend` or `app/npc-concept`. `git diff 0ad083d..HEAD --stat -- app/shared app/backend` is identical to `git diff 0ad083d..origin/mihael/113 --stat -- app/shared app/backend`: 38 files, 3680+, 1−. Those are 113's changes, merged.

### Verification run and output (2026-11-07, 18:10 to 18:35, final code)
WebKit is Playwright 1.56.1's WebKit 26 with `devices['iPhone 15']` (393×659, dpr 3, touch). The Playwright MCP here is Chromium-only, so the library is used from `app/frontend/scripts/`. Mock runs used the dev server for this worktree on :5174, because :5173 was still held by the old `npc-concept` server from the main checkout (left running).

1. **WebKit iPhone 15, mock, greet to coach with "Use a sample" → Priya.** Every step and card is in `app/frontend/screens/iphone-01…43-*.png`, each taken twice with the second kept:
```
$ node scripts/walk.mjs --base http://127.0.0.1:5174 --prefix iphone
 "steps": "greet, ask_report, ask_bank, ask_letter, questions, assessing, diagnosis, decline, paper, coach",
 "shots": 43,   (no PROBLEM lines: no console errors, no contract warnings, no control under 44 px, no horizontal scroll, dock on screen)
```
2. **The same flow keyboard-only + `reducedMotion: "reduce"`, then at 150% text, then in each colour mode.** All 43 shots each, no PROBLEM lines (overlap, sub-44 px targets, console errors):
```
keyboard-reduced  "steps": "greet, ask_report, ask_bank, ask_letter, questions, assessing, diagnosis, decline, paper, coach"  "shots": 43
text150           (same steps)  "shots": 43
okabe             (same steps)  "shots": 43
contrast          (same steps)  "shots": 43
```
  - Keyboard pass details:
    - Safari/WebKit only Tab to buttons with Option held, so the script uses Option+Tab (what a Mac keyboard user presses).
    - It goes through the persona sheet, Why? drawer, paper overlay and Download, and the what-if sheet (slider by arrow keys, checkbox by Space).
    - It found one real trap, now fixed: after a sheet closed whose opener had gone, focus fell to `<body>` and WebKit's Tab went nowhere.
  - `node scripts/contrast.mjs`: `all pairs pass`. 27 pairs × 3 colour modes, read from `src/index.css`.
  - `node scripts/checks.mjs --base http://127.0.0.1:5174 --live-base http://127.0.0.1:5175`: `all 18 passed`:
```
PASS  live region holds the whole line at once  [Credit agent says: Hello, welcome to the Capital One desk. I]
PASS  1x typewriter: dock says "Show all of it" while typing, then Next  [next -> next]
PASS  canvas has an aria-label for the agent  [Credit agent at his desk in a Capital One office, waving hello. Expression: warm and friendly.]
PASS  canvas label follows the state
PASS  no console errors (1)
PASS  ?mock=error shows the error line and Try again
PASS  a failed upload shows a friendly notice and keeps Upload / Use a sample
PASS  tray upload: the agent reads it, then the chat moves on
PASS  a letter at any step: one acknowledgement, step unchanged  [ask_bank -> ask_bank: Thanks, that's a letter from Capital One. I'll go ]
PASS  the letter button goes once a letter is in
PASS  no console errors (4)
PASS  read aloud speaks the line in en-GB at the chosen rate  [{"lang":"en-GB","rate":1.2000000476837158}]
PASS  settings: colour mode and text size apply to the page  [contrast, 24px]
PASS  mic: listens (en-GB) or explains the keyboard dictation fallback  [listening]
PASS  a credit term gets a tap-to-explain line  [electoral roll: ...]
PASS  a refused upload (413) says why and keeps Upload / Use a sample  [That file is too big. Try one under 10 MB.]
PASS  a lost session on /api/whatif offers Start again
PASS  Start again begins a new conversation
```
3. **Desktop 1440×900** (Chromium, dpr 1): `node scripts/walk.mjs --desktop`, same steps, 43 shots, no problems (`screens/desktop-13-*`, `desktop-38-*`).
4. **Real backend.**
   - During block 2, against 113's own server (Claude on): the whole walk passed with no console errors and no contract warnings.
   - Final run: 113's server had stopped (that session finished). I started the merged backend from this worktree with `DEMO_OFFLINE=true pnpm --filter backend start` (cache, then templates; no code changed) and a frontend with `VITE_USE_MOCK=false pnpm exec vite --host --port 5175`. Then I walked it **over the LAN address**:
```
backend on http://localhost:8000 and http://100.65.209.5:8000 ...; Claude OFF (DEMO_OFFLINE=true: cache, then templates); 48 cached outputs
$ curl http://100.65.209.5:5175/api/health  ->  {"ok":true} [200]
$ node scripts/walk.mjs --base http://100.65.209.5:5175 --prefix live
 "steps": "greet, ask_report, ask_bank, ask_letter, questions, assessing, diagnosis, decline, paper, coach",  "shots": 43   (no PROBLEM lines)
page check: data-api=live, requests: GET /api/personas, POST /api/turn
```
   - The real PDF is ready at the paper step (`live-24`, no "not ready" line), and the slider what-if is computed by the engine (`live-43`: £300 + stop BNPL → 743 to 848).
   - **Not done: the run from the real iPhone.** That needs a person with the phone. See follow-ups.
5. **Contract fields I needed but did not have** (all worked around on the client; none block):
   - The plan a `WhatIfRun` was answered for: kept client-side by id.
   - The chosen plan on `TurnResponse`: taken from the `step`/`projection` refs.
   - A per-month missed-payment line: `riskLine` is one number, drawn as midpoint minus `riskLine` from month 1. That is my reading of "show as a dip below the bands"; confirm with Jag.
   - Projection midpoints: computed as (low + high) / 2.
   - A week number per step: computed from `result.result.start`.
   - A separate evidence list: chips split from `because.dataPoint`.
   - The persona in play: not echoed in `TurnResponse`, so it is tracked client-side.

**Reviewer** (`reviewer` agent on `0ad083d..HEAD`): every requirement is met; scope is clean; the npc copy is identical; disclosures are complete. It found 8 gaps, all fixed and re-verified:
1. A refused upload looped on "Try again".
2. A 404 on `/api/whatif` looped.
3. Impeccable was not disclosed for 114.
4. The chart's labels at 150% text.
5. A reply arriving after Start again leaked into the new chat.
6. There was no error boundary around cards.
7. The what-if card could contradict the agent's line, and quoted the current plan.
8. The transcript could not be scrolled by keyboard in Safari.

It also flagged two iOS risks, now hardened but untested: Download is a real link instead of a scripted click, and read-aloud is unlocked by a tap.

### Follow-ups needed after the first prompt (the prompt deltas)
- The handoff says to merge `main`; the session prompt said merge `origin/mihael/113` and never touch `main`. I followed the prompt. `origin/mihael/113` did not exist for block 1; it was merged before blocks 2 and 3 and at the end.
- The status flip happened on the branch (prompt), not on `main` (the `/handoff` skill).
- Port 5173 was taken by the old `app/npc-concept` dev server from the main checkout. I did not stop it. All checks ran on 5174/5175, and the scripts default to 5173 for everyone else.
- The Playwright MCP is Chromium-only, so the WebKit iPhone checks use the Playwright library (dev dependency, disclosed), as in 109.
- 113 finished during this run, so the last real-backend walk used its merged code with `DEMO_OFFLINE=true`, not its live Claude server.

### Open issues / follow-ups
- **On the real iPhone (Safari), before the demo** (`app/DEMO.md` has the commands):
  1. Run the whole flow on the LAN URL.
  2. Check the dock pins above the keyboard in the goal and what-if text boxes.
  3. Check **Download** opens the PDF.
  4. Turn on read aloud and check he speaks.
  5. Check the mic (Safari's Web Speech; otherwise the dictation tip shows).
- Stop the old `npc-concept` server on :5173 before `pnpm dev --host` in `app/frontend` (Vite uses `strictPort`).
- Seen in the backend by the reviewer (113 territory, not changed here):
  - "what if I win the lottery" was read as "stop gambling".
  - With no report, coming off the electoral roll showed a rise.
- Plain English only changes words on the real backend; the mock always answers in the same words.
- `/impeccable init` (PRODUCT.md) was not run: it writes outside `app/frontend`. Offer it to the team.
- Not tested: VoiceOver on a real device, forced-colours mode, Android.
