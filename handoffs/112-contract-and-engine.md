---
id: 112
title: Phase A, shared contract, engine import, examples and mock conversation
status: ready
owner: mihael
concept: lenders-eyes
created: 2026-11-07
time-budget: 30m
---

# 112: Phase A, shared contract, engine import, examples and mock conversation

## Goal
The fence that the backend (113) and frontend (114) build to in parallel: Jag's engine inside `app/backend/`, one shared typed contract in `app/shared/`, real example responses for every conversation step from Priya's actual engine output, and a mock conversation the frontend can run before the backend exists. Pushed to `main` within 30 minutes.

## Context
- Plan approved 2026-11-07 16:12: Jag's credit engine is the brain, the pixel NPC agent at the Capital One desk is the face. The agent asks for the inputs, then delivers the engine's result one idea per message
- Read first: `prep-incoming/credit-coach/README.md` (Jag's engine: files, exports, input format, demo persona), then skim `engine.js` exports and one persona. The engine design doc is summarised in the README; if anything there disagrees with the code, the code wins
- `app/npc-concept/` holds the finished character kit (states, emotes, gestures in `ART-GUIDE.md`). Messages carry an `emote` and a `gesture` the frontend maps onto it
- Brief: Capital One "Make credit accessible". Hackathon, no compliance work. Score ranges are shown, always labelled "estimate"
- Stack: Node 20+, TypeScript, pnpm workspace. Backend Fastify (113). Frontend Vite + React + TS + Tailwind v4 (114). Validation with zod, shared by both sides
- Claude never computes a number. The engine computes; Claude only reads documents into the engine's input, writes wording (checked), and turns free-text what-ifs into the engine's `changes[]`

## Requirements
- [ ] pnpm workspace at the repo root (`pnpm-workspace.yaml`: `app/backend`, `app/frontend`, `app/shared`). Do not create `app/frontend/` (114 does); the workspace entry is fine before it exists
- [ ] `app/backend/engine/`: copy `engine.js`, `rules.json`, `cards.json` from `prep-incoming/credit-coach/` UNCHANGED. Personas and mock reports into `app/backend/data/personas/`. A typed wrapper `app/backend/engine/index.ts` (with a `.d.ts` or JSDoc types) exposing `analyse`, `whatIf`, `decodeDecline` and anything else the README lists. No logic changes to the engine; if a bug blocks you, note it in RESULT and tell Mihael
- [ ] `app/shared/contract.ts`: zod schemas plus inferred types for:
  - `EngineResult` typed from the REAL output of `analyse()` on Priya (headline, score, factors with health/rag/reason/because, plans 3m/6m with steps and projection, cardLadder, riskLine, decline). Run the engine and type what it actually returns
  - `Step` = `greet | ask_report | ask_bank | ask_letter | questions | assessing | diagnosis | decline | paper | coach`
  - `AgentMessage` = `{id, kind, text, emote: neutral|warm|concerned|pleased, gesture: none|wave|asking|receive-document|reading|thinking|explaining|slide-paper|coach, ref?}` where `kind` = `text | reason | decline | step | projection | ladder | whatif | paper` and `ref` points into the engine result (for example `{factorId}`, `{plan, stepIndex}`), so cards render real data, not copied numbers
  - `Expects` = `{kind: file|choice|text|none, fileKinds?: (credit_report|bank|letter)[], chips?: string[], optional?: boolean, placeholder?: string, allowVoice?: boolean}`
  - `TurnRequest` = `{sessionId: string|null, input: {type: start|file|sample|skip|choice|text, fileKind?, fileId?, personaId?, value?}, settings?: {plainEnglish: boolean}}`. A `letter` file is accepted at ANY step
  - `TurnResponse` = `{sessionId, step, messages: AgentMessage[], expects: Expects, result: EngineResult|null, paperUrl: string|null}`
  - `UploadResult`, `WhatIfRequest {sessionId, text?: string, changes?: Change[]}`, `WhatIfResponse` (from the engine's `whatIf` output), `Persona {id, name, blurb}`
- [ ] Routes (documented, built in 113): `GET /api/health`, `GET /api/personas`, `POST /api/turn`, `POST /api/upload` (multipart), `POST /api/whatif`, `GET /api/paper/:sessionId.pdf`. Backend on `http://localhost:8000`, frontend on `5173`, CORS for both `localhost` and the phone's LAN address
- [ ] `app/shared/conversation.md`: the step order and what the agent says and asks at each step, in plain words (at most 40 words per message, "you", British spelling). Diagnosis = headline, then one message per top-3 factor (kind `reason`, emote `concerned` for red, `warm` for amber), then spending flags. Decline step only if a letter or decline exists. Questions = the engine's form fields (age, income, housing, goal: card/car/mortgage/build/own words, horizon 3m/6m, bureau) as chat questions with chips, plus up to 2 questions the backend builds from the data (for example a new address and not on the roll, a BNPL payee). Coach = choose plan, then steps week by week (kind `step`), projection (kind `projection`), card ladder (kind `ladder`), then free text what-ifs (kind `whatif`)
- [ ] `app/shared/examples/`: one `TurnResponse` JSON per step for Priya, generated by a script (`app/shared/scripts/make-examples.ts`) that calls the real engine, plus examples for upload, whatif and personas. All validate against the zod schemas (the script fails if not)
- [ ] `app/shared/mock-conversation.ts`: a pure function `mockTurn(state, request) -> {state, response}` that walks the steps using the examples, so 114 can run the whole chat with no backend
- [ ] `app/CONTRACT.md`: short human summary pointing at `contract.ts` and `conversation.md`. Mark the old Lender's Eyes contract (Jordan, `/api/assess`, `/api/plan`) as replaced
- [ ] Mark handoffs 101 to 107 as `superseded` in `handoffs/INDEX.md` (the Lender's Eyes Python plan); 113 and 114 replace them
- [ ] Commit and push to `main` directly (this is the fence; it must land fast)

## Out of scope
- Server routes (113), any UI (114), Claude calls, uploads

## Verification
1. `pnpm -r exec tsc --noEmit` passes for `app/shared` and `app/backend`
2. `pnpm --filter shared exec tsx scripts/make-examples.ts` regenerates every example and prints one line per step with the number of messages
3. A one-line script runs `mockTurn` from `start` to `coach` on Priya and prints the step sequence: `greet, ask_report, ask_bank, ask_letter, questions..., assessing, diagnosis, decline, paper, coach`
4. `node -e` on the wrapper prints Priya's headline and 3m/6m projection ranges, matching the engine run in Jag's README

---

## RESULT (filled in by Claude Code)
- Status:
- Time taken:
- What was built:
- Engine output surprises (fields that differ from the plan doc):
- Files changed:
- Verification run and output:
- Open issues / follow-ups:
