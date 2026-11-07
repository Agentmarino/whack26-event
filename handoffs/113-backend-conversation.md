---
id: 113
title: Phase B backend, Fastify, conversation, ingest, Claude with checker, what-if, paper PDF
status: in-progress
owner: mihael
concept: lenders-eyes
created: 2026-11-07
time-budget: 6h
---

# 113: Phase B backend

## Goal
A Fastify backend in `app/backend/` that runs the whole conversation on Jag's engine: intake (samples, uploads, Claude reading of PDFs and letters), questions, diagnosis, decline decoder, paper PDF, coach mode with what-if. Built side by side with 114 (frontend) to the contract from 112.

## Context
- Read first: `app/CONTRACT.md`, `app/shared/contract.ts`, `app/shared/conversation.md`, `prep-incoming/credit-coach/README.md`, `app/backend/engine/index.ts`
- **Contract rule:** you own `app/shared/`. If you must change it, change `contract.ts` and the examples (re-run `make-examples.ts`), commit with a message starting `CONTRACT:`, and add a dated line to the "Contract changes" list at the bottom of this file. 114 reads that list. Never break a field 114 already uses without adding the new one first
- Env (repo root `.env`, never print the key): `ANTHROPIC_API_KEY`, `LLM_MODEL` (default `claude-sonnet-5-5`), `DEMO_OFFLINE` (default `false`), `AI_FALLBACK` (`template`). No `thinking` parameter. Read every Claude reply by joining all `text` blocks and ignoring `thinking` blocks
- Lessons kept from the Lender's Eyes prep: code computes, Claude words; every number in Claude's text must exist in the data; retry once, then a fixed template; cache good outputs so the demo runs offline

## Requirements (in this order; push after each block; checkpoints in brackets)
### Block 1: conversation on personas [by 19:30]
- [ ] Fastify on port 8000, CORS for `http://localhost:5173` and the LAN origin, `{error: string}` bodies for every error, all routes from 112
- [ ] In-memory sessions. `POST /api/turn` runs the steps in `conversation.md`. `sample` input with a `personaId` loads that persona (Priya, Mei Lin, Alex). Questions map answers onto the engine `Profile`; data-based follow-up questions built from the profile. A `letter` at any step runs the decline decoder, gets one acknowledgement message, and the step does not change
- [ ] `assessing` runs `analyse()`. Diagnosis, decline and coach messages built from the result with templates (no Claude yet) and `ref`s into it
- [ ] `GET /api/personas`
- [ ] Tests (vitest): Priya from `start` to `coach` produces the step sequence and messages that validate against the zod schemas

### Block 2: what-if and coach [by 22:30]
- [ ] `POST /api/whatif` with `changes[]` calls the engine's `whatIf`. With `text`, Claude turns it into `changes[]` (only the engine's lever list; validate with zod; unknown levers rejected with a friendly message)
- [ ] Coach flow: plan choice chips, steps by week, projection, card ladder, free-text what-ifs answered as `whatif` messages

### Block 3: real inputs and Claude [by 01:30]
- [ ] `POST /api/upload`: credit report as engine JSON (validate), PDF or image (Claude extraction to the engine's report schema, validated; on failure a friendly "I couldn't read that, try the sample?" with the reason in the log); bank CSV (keyword categoriser first, Claude only for unknown payees); decline letter text, PDF or photo (Claude extraction to `{lender, product, date, cra, reasons}`)
- [ ] Claude wording for the headline and each reason and step, in the agent's voice. `settings.plainEnglish` asks for a reading age of about 9 with jargon explained. **Checker:** every £ amount, %, count and date in Claude's text must appear in the engine data for that item; one retry with the problems listed; then the template. Tag each message with how it was written (`claude` or `template`) for the debug panel
- [ ] Cache good Claude outputs in `app/backend/data/ai-cache.json` (key: session-free hash of the input). `DEMO_OFFLINE=true` makes no network calls and uses the cache, then templates
- [ ] `GET /api/paper/:sessionId.pdf`: a clean one- to two-page summary (headline, top reasons with the evidence, the chosen plan's steps with dates, the projection range labelled "estimate", the card ladder, your rights from the decline section). Add the PDF library to `app/DISCLOSURES.md`

### Always
- [ ] Every package added goes into `app/DISCLOSURES.md` at once
- [ ] Start command in `app/DEMO.md`
- [ ] Merge `main` into your branch after every push from the frontend session that touches `app/shared`; never edit `app/frontend/`

## Out of scope
- `app/frontend/`, `app/npc-concept/`, engine logic (report engine bugs to Mihael instead)

## Verification
1. `pnpm --filter backend test` passes
2. curl walk: `start` → `sample` Priya → bank `sample` → `skip` letter → answers → diagnosis has 3 `reason` messages whose `ref`s resolve in `result` → `paper` → `coach`
3. Letter sample during `questions`: one acknowledgement, step unchanged, `decline` step appears after diagnosis
4. `POST /api/whatif {text: "what if I pay 300 a month extra"}` returns a `whatif` with before/after ranges
5. `DEMO_OFFLINE=true`: the whole walk works with the network off
6. The PDF opens and its numbers match the engine result

## Contract changes
(dated lines, newest last)

---

## RESULT (filled in by Claude Code)
- Status:
- Time taken:
- What was built:
- Files changed:
- Verification run and output:
- Open issues / follow-ups:
