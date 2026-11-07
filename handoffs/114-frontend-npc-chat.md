---
id: 114
title: Phase B frontend, NPC chat on iPhone, every message type, accessibility
status: in-progress
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
- Status:
- Time taken:
- What was built:
- Files changed:
- Verification run and output:
- Open issues / follow-ups:
