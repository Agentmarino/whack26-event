---
id: 112
title: Phase A, shared contract, engine import, examples and mock conversation
status: done
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
- Status: done (2026-11-07). Branch `mihael/112`, fast-forwarded onto `main` as the requirement says
- Time taken: about 30 minutes (16:39 status flip to 17:08 push), including a reviewer pass and its fixes
- What was built:
  - **pnpm workspace** at the root (`pnpm-workspace.yaml`: `app/backend`, `app/frontend` (not created), `app/shared`; `allowBuilds: esbuild` so tsx installs). Root `package.json` with `typecheck` and `examples` scripts
  - **`app/backend/engine/`**: `engine.js` copied byte-identical (`cmp` below). `index.ts` is a typed wrapper: `analyse`, `whatIf` (toJSON'd), `run` (opaque `RawRun`), `serialise`, `decodeDecline(raw)`, `decodeDeclineFor(profile)`, `applyChanges`, `parseReport`, `summary`, `normalise`, `toJSON`, `PERSONAS`, `CARDS`, `SRC`, `SCALE`, `fmtDate`, `fmtMonth`, `gbp`, `gbp2`. No logic. Loads the UMD engine with a side-effect import and reads `globalThis.CreditEngine` (works under ESM, tsx, vitest, and plain `node` with type stripping)
  - **`app/backend/data/personas/`**: priya, sam, dan, `mock-credit-report.json` (Alex), `mock-report-mei.json` (Mei) copied unchanged, plus `index.json` (the 3 demo samples: priya, mei, alex, with blurbs)
  - **`app/shared/contract.ts`**: zod schemas and types. Engine half typed from real `analyse()`/`whatIf()` output on all 5 inputs plus 2 edge branches (`EngineResult`, `RunResult`, `Factor`, `PlanStep`, `ProjectionPoint`, `Ladder`, `DeclineDecoded`, `Profile`, `EngineWhatIf`, `Change`, `ClaudeChange`, `CreditReport`). Conversation half: `Step`, `AgentMessage`, `Ref` (tagged union), `Expects`, `TurnInput`, `TurnRequest`, `TurnResponse`, `UploadResult`, `WhatIfRequest`, `WhatIfRun`, `WhatIfResponse`, `Persona`, `ApiError`, `ROUTES`, `paperUrlFor`, and `resolveRef()` so cards read real data
  - **`app/shared/conversation.md`**: step table, samples, a letter at any step, questions (form fields + 2 data questions), diagnosis, decline, paper, coach, what-ifs, gesture → NPC kit mapping
  - **`app/shared/examples/`**: generated by `scripts/make-examples.ts` from the real engine: 20 turns in `turns/` (greet to coach, both plans, 4 what-ifs), `letter-ack.json`, `whatif.json`, `upload.json` (Alex's report findings, plus an error response), `personas.json`, `engine-result-priya.json`, `walk.json` (the request behind each turn), `bundle.ts` (for the mock). The script validates every example with zod, checks every `ref` resolves, at most 40 words and a few American spellings, and checks all 5 inputs and the 2 edge branches against `EngineResult`. It exits 1 on any problem
  - **`app/shared/mock-conversation.ts`**: pure `mockTurn(state, request)`, plus `mockWhatIf`, `mockUpload`, `mockPersonas`, `initialMockState`. Handles skips (drops the ack), a letter at any step (one ack, step and expects kept), plan choice, chip or text what-ifs, restart (new sessionId). `scripts/mock-walk.ts` runs the demo path and an edge path, and checks message ids are unique
  - **`app/CONTRACT.md`**: summary, routes, how to import `shared`, additions beyond the spec, the Lender's Eyes contract marked replaced. **`handoffs/INDEX.md`**: 101 to 107 set to `superseded`. **`app/DISCLOSURES.md`**: zod, typescript, tsx, esbuild, @types/node; the engine row corrected (no rules.json)
- Engine output surprises (fields that differ from the plan doc):
  - `analyse()` returns `{profile, findings, result, decline}`, so the factors are at `result.result.diagnosis.ranked` (there is no top-level `factors`), the score is at `result.result.profile.score`, `cardLadder` is `result.result.ladder`, and the decoded decline is `result.decline`. Typed as is; `resolveRef()` hides the nesting
  - Projection `date` is a display month from `fmtMonth` ("Feb 2027"), not ISO. `new Date("Feb 2027")` is Invalid Date in Safari. The other dates (`start`, step `date`, `ladder.applyFrom`) are ISO
  - The Balance Transfer ladder branch (clean file, expensive card) has no `graduation[].month` and no `graduateWhen`, and adds `saving`. `parseReport` sets `decline.agency: null` when the letter names no agency
  - `PlanStep.why` is a factor id, not a sentence. Factors have a because-trail but no separate "evidence" list
  - **No `rules.json` or `cards.json` upstream** (README says so). Rules, cards and assumptions live inside `engine.js`. Nothing was split out (engine unchanged)
  - The handoff's gesture list mixes NPC kit **states** (`asking`, `receive-document`, `reading`, `thinking`, `explaining`, `slide-paper`, `coach`) with gestures. The kit's real gestures are `none, wave, point-down, point-side, chin, tap-calc, open-palm`. I kept the spec names; the mapping table is in `conversation.md`
  - **What-ifs compare against the plan, not against doing nothing.** For Priya, `stop bnpl` gives +0. `electoralRoll: true` *lowers* the estimate (735-836 → 719-811 at 3m), because the baseline plan already counts "register to vote" and the change removes that step. `clearCard` also lowers it (722-814). Only the paydown amount moves it up (£300: 743-848). On the 6-month plan, extra paydown lands on the same range. **Reported to Mihael as engine behaviour**: the chips and template were chosen to avoid showing a drop
  - Priya's headline is still the known thin-file bug ("very little of it ... from zero"), and her decoded decline lists "Very little UK credit history" as Most likely for the same reason
- Files changed: `pnpm-workspace.yaml`, `package.json`, `pnpm-lock.yaml`, `app/backend/{package.json,tsconfig.json,engine/engine.js,engine/index.ts,data/personas/*}`, `app/shared/{package.json,tsconfig.json,contract.ts,conversation.md,mock-conversation.ts,scripts/make-examples.ts,scripts/mock-walk.ts,examples/**}`, `app/CONTRACT.md`, `app/DISCLOSURES.md`, `handoffs/INDEX.md`, this file
- Verification run and output (after the review fixes, 2026-11-07 17:04, Node v24.14.1, pnpm 12.18.0). `pnpm -r exec tsc --noEmit` runs in both packages: `pnpm -r exec pwd` lists app/shared and app/backend, and a deliberate type error made it fail with TS2322. The regenerated examples left `git status` clean:
```
$ pnpm -r exec tsc --noEmit
exit 0

$ pnpm --filter shared exec tsx scripts/make-examples.ts
greet          step=greet      2 messages
ask_report     step=ask_report 1 messages
ask_bank       step=ask_bank   2 messages
ask_letter     step=ask_letter 2 messages
questions-1    step=questions  2 messages
questions-2    step=questions  1 messages
questions-3    step=questions  1 messages
questions-4    step=questions  1 messages
assessing      step=assessing  1 messages
diagnosis      step=diagnosis  6 messages
decline        step=decline    4 messages
paper          step=paper      1 messages
coach-choose   step=coach      1 messages
coach-plan-3m  step=coach      16 messages
coach-plan-6m  step=coach      19 messages
coach-whatif-paydown-3m step=coach      1 messages
coach-whatif-paydown-6m step=coach      1 messages
coach-whatif-bnpl-3m step=coach      1 messages
coach-whatif-bnpl-6m step=coach      1 messages
letter-ack     step=questions  1 message (step unchanged)
whatif         1 message, after 3m 747-854
upload         13 findings; personas priya, mei, alex
OK: 20 turn examples written to app/shared/examples/, all valid, all refs resolve
exit 0

$ cd app/shared && pnpm exec tsx -e "<mockTurn start→coach, Priya>"
greet, ask_report, ask_bank, ask_letter, questions, questions, questions, questions, assessing, diagnosis, decline, paper, coach
exit 0

$ cd app/backend && node -e "<wrapper: headline + 3m/6m>"
headline: You don't have bad credit, you have very little of it. This plan builds it from zero.
3m: 735-836 by Feb 2027 | 6m: 772-891 by May 2027
exit 0

$ (Jag original) cd prep-incoming/credit-coach && node -e "<same, require engine.js>"
You don't have bad credit, you have very little of it. This plan builds it from zero.
3m 735-836 Feb 2027
6m 772-891 May 2027

$ cmp engine.js
identical

$ pnpm --filter shared exec tsx scripts/mock-walk.ts
greet, ask_report, ask_bank, ask_letter, questions, questions, questions, questions, assessing, diagnosis, decline, paper, coach, coach, coach
edge walk OK, 47 unique message ids; last what-ifs:
  Stopping buy now, pay later: your estimate by Ma
  Paying £300 extra a month: your estimate by May 
exit 0
```
  Verification 4: Jag's README shows only the headline (it matches). The 3m/6m ranges match a direct `require` of his original `prep-incoming/credit-coach/engine.js` (shown above)
- Reviewer (`reviewer` agent on the diff): fixed all three schema mismatches (projection `date`; BT ladder fields; nullable `decline.agency`/`productId`/`product`), each now covered by the edge-case check in `make-examples.ts`. Also fixed: the chip vs text rule for what-ifs (documented: both count the same), unique mock ids (ack counter, new sessionId on restart), what-if answers now quote the chosen plan (m3 or m6), `CreditReport` relaxed (`scaleMax` and `name` optional), `PERSONAS` typed by key, `ClaudeChange` added, and the docs corrected. Left as is (mock only): skipping the report doesn't ask age, income, housing or bureau, and `result.decline` is still set on the no-letter path
- Follow-ups needed after the first prompt (the prompt deltas):
  - The engine has no `rules.json`/`cards.json` to copy (requirement assumed them)
  - The gesture enum in the spec is mostly kit states → kept, with a mapping table
  - Added `TurnResponse.whatIf`, `AgentMessage.writtenBy`, `ClaudeChange`, tagged `Ref`, and the `UploadResult` shape (the spec named it without fields)
  - Verification 4 says "matching Jag's README", but the README has no projection ranges, so I checked them against his original file instead
  - The review found 3 schema gaps that Priya never hits. The spec's "type from Priya" was too narrow, so I added edge-case inputs to the generator
- Open issues / follow-ups:
  - **For Mihael / Jag (engine):** (1) the what-if levers already in the baseline plan give 0 or a drop (`electoralRoll`, `clearCard`). Consider a "from today, doing nothing" baseline or a "not in plan" flag. (2) The thin-file headline bug for Priya (README Known gaps). No engine change made
  - **113:** validate Claude what-ifs with `ClaudeChange`; accept chip `choice` and `text` alike in coach and at the goal question; the sample split for Priya (report / bank / letter) is in `conversation.md`; `make-examples.ts` holds first-cut templates you can lift; car finance has no engine goal (mapped to `build`)
  - **114:** add `"shared": "workspace:*"`; never `new Date()` a projection `date`; alias the kit's own `Gesture` type on import; reason cards show `because.*`, not an evidence list
  - Unverified: a fresh `pnpm install` inside `app/npc-concept` now that a root workspace exists. `pnpm ls` and `vite` there still resolve it as its own project, but I didn't reinstall it (114 copies the kit anyway)
  - The 112 row in `handoffs/INDEX.md` still says `in-progress` (the skill leaves INDEX to Mihael)
  - Plain `node` running `.ts` (verification 4) needs Node 22.6 or later; tsx works on Node 20
