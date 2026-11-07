---
id: 113
title: Phase B backend, Fastify, conversation, ingest, Claude with checker, what-if, paper PDF
status: done
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
- 2026-11-07: no `contract.ts` change. `POST /api/upload` also takes a `text` field instead of `file` (a pasted letter); an unreadable file is HTTP 200 with `ok: false` and a friendly `error`. `POST /api/whatif` answers 409 `{error}` before the check and 422 `{error}` (a friendly sentence) when the text maps to no lever. `POST /api/turn` answers 404 `{error}` for an unknown session (start again). Documented in `app/CONTRACT.md`
- 2026-11-07: `app/shared/conversation.md` gains "What the backend adds (113)": nudges at upload steps, out-of-order files, a letter after `assessing` re-runs the result, re-asks with ids `q-age-again`/`q-income-again`, Mei/Alex "your sample already has..." messages, plan switching in coach with exactly "3 months"/"6 months", `writtenBy`

---

## RESULT (filled in by Claude Code)
- Status: done (2026-11-07). Branch `mihael/113`, pushed after every block; `main` untouched (no new commits on `main` to merge, the frontend has not touched `app/shared`)
- Time taken: about 40 minutes of build (17:22 status flip to 18:00 last push), plus a 12 minute reviewer pass and its fixes. All three blocks were in before the 19:30 checkpoint
- What was built (`app/backend/src/`):
  - **Server** (`app.ts`, `server.ts`, `config.ts`): Fastify on `0.0.0.0:8000`. CORS for localhost and any private LAN address on any port (the phone). Every error is `{error: string}`; 5xx bodies are generic. Every route from 112: health, personas, turn, upload (multipart), whatif, paper. Settings come from the repo-root `.env` via `process.loadEnvFile` (`LLM_MODEL`, default `claude-sonnet-5-5`; `DEMO_OFFLINE`; `AI_FALLBACK`)
  - **Conversation** (`conversation.ts`, `session.ts`, `questions.ts`, `templates.ts`, `personas.ts`, `analysis.ts`): in-memory sessions and the step machine from `conversation.md`
    - Samples: Priya is split into report, bank and letter. Mei and Alex are report files, and the agent says "your sample already has..." at the bank and letter steps
    - A letter at any step gets one acknowledgement, with step and expects unchanged. After `assessing` the result is re-run so the paper covers the letter
    - Questions: the missing form fields, goal and horizon always, then up to 2 data questions (roll, minimum-only card without a Direct Debit). Unreadable answers are asked again. A goal in the person's own words goes to Claude (card, mortgage or build only)
    - `assessing` runs the engine as `run()` + `decodeDecline()`, composed so findings survive. Diagnosis, decline, paper and coach come from templates with `ref`s; plan choice uses chips; one `step` message per step; then projection, ladder and the what-if prompt
    - What-if chips are built from the data
  - **What-if** (`whatif.ts`): free text goes to Claude with only the engine's levers and is validated with `ClaudeChange`. A paydown amount must be a number the person said (digits or words); unknown levers are rejected. The keyword reader is the fallback when Claude is off or unsure.
    - The slider path (`changes`) refuses `set` paths through `__proto__`, `constructor` or `prototype`, and checks the engine's answer with `EngineWhatIf`
    - Answers quote the chosen plan: up, "stays" (when the plan already covers it), or "would drop" for changes that take something away. `POST /api/whatif` returns 422 with a friendly message when nothing fits
  - **Claude wording** (`wording.ts`, `checker.ts`, `claude.ts`, `cache.ts`): the headline, each reason and each plan step, in the agent's voice. `plainEnglish` asks for a reading age of about 9 with terms explained.
    - One batched call per turn. The checker tests every £, %, count (digits and words) and month against the engine data for that item, plus length, promises and American spelling
    - One retry lists the problems, then the template. Every message is tagged `writtenBy: claude | template`
    - Good outputs are cached per item in `data/ai-cache.json` (session-free key) and re-checked when read
    - The diagnosis is worded ahead while `assessing` shows, and both plans while the diagnosis shows. A 12 s turn budget falls back to templates
    - `DEMO_OFFLINE=true` returns before an SDK client exists (cache, then templates). Replies join the `text` blocks and ignore `thinking`; there is no `thinking` parameter
  - **Uploads** (`ingest.ts`, `bank.ts`, `uploads.ts`):
    - Report: engine JSON (`credit-coach-report/v1` or a Profile), or a PDF/photo that Claude reads into the report schema. It is accepted only if `parseReport` succeeds and the engine result fits `EngineResult` with no NaN
    - Bank: a CSV (Monzo, Starling or Barclays-style headers) through a keyword categoriser, with Claude only for unknown payee names (amounts never go to Claude). A PDF or photo has its rows listed by Claude
    - Letter: text, PDF or photo becomes `{lender, product, date, cra, reasons}`. For text the lender must appear in the letter, and a pattern reader is used offline
    - HEIC and unknown files get friendly errors; the reason goes to the log. A `text` field takes a pasted letter
  - **Paper** (`paper.ts`): pdfkit, A4, 1 to 2 pages, built from the engine result only. It has the headline, the score, the top 3 reasons with evidence, the letter (likely reasons, fix, reapply), the chosen plan's steps with dates, both projections labelled "estimate", the missed-payment risk, the card ladder and checklist, and your rights
  - **Tests** (vitest, 50): Priya start to coach; the letter during the questions; no letter; Mei and Alex through every what-if chip; no data at all; `/api/whatif` text, sliders, 409 and 422; the lever checker; the keyword reader; the number checker; uploads (JSON, CSV, letter, pasted text, broken reports, junk, HEIC); the paper model's numbers for 3 personas × 2 plans; the paper route
  - **Scripts**: `curl-walk.sh` (verification 2 to 4, `PLAIN=true` for Plain English), `make-paper.ts`, `make-sample-report-pdf.ts`, `try-whatif.ts`, `try-bank.ts`, `try-goal.ts`. Samples in `data/samples/`, all marked as made up
- Files changed: `app/backend/{package.json,vitest.config.ts,src/*.ts (19),test/*.test.ts (5),scripts/* (7),data/ai-cache.json,data/samples/*}`, `app/CONTRACT.md`, `app/shared/conversation.md`, `app/DEMO.md`, `app/DISCLOSURES.md`, `pnpm-lock.yaml`, this file. No change to `contract.ts`, the examples, `app/frontend/`, `app/npc-concept/` or `engine.js`
- Verification run and output (final code, 2026-11-07 17:55 to 18:00, Node v24.14.1):
```
1. $ pnpm --filter backend test
 Test Files  5 passed (5)
      Tests  50 passed (50)          (44 before the goal fix; tsc: pnpm -r exec tsc --noEmit exit 0)

2-4. $ bash app/backend/scripts/curl-walk.sh        (server: pnpm --filter backend start, Claude on; * = worded by Claude)
greet       {"type":"start"}                                         | text,text
ask_report  {"type":"choice","value":"Let's start"}                  | text
ask_bank    {"type":"sample","fileKind":"credit_report","personaId":"priya"} | text,text
ask_letter  {"type":"sample","fileKind":"bank"}                      | text,text
questions   {"type":"skip"}                                          | text
questions   {"type":"choice","value":"A credit card"}                | text
questions   {"type":"choice","value":"3 months"}                     | text
questions   {"type":"choice","value":"Yes, I can"}                   | text
assessing   {"type":"choice","value":"Yes"}                          | text
diagnosis   {"type":"skip"}                                          | text*,text,reason*,reason*,reason*,text
diagnosis: 3 reason messages; refs resolve in result:
  utilisation -> Credit utilisation, red
  identity -> Identity & stability, red
  searches -> Recent applications, red
paper       {"type":"choice","value":"What can I do?"}               | paper
paper /api/paper/e70bc136-....pdf -> HTTP 200, 5597 bytes, %PDF-
coach       {"type":"choice","value":"Make me a plan"}               | text
coach       {"type":"choice","value":"3 months"}                     | text,step*,step*,step*,step*,step*,step*,step*,step*,step*,step*,step*,projection,ladder,text
coach       {"type":"text","value":"What if I pay £300 a month?"}   | whatif
  Paying £300 extra a month: by Feb 2027 your score could be 743 to 848, up from 735 to 836. An estimate. You'd get under 30% by Jan 2027.
== edge walk: skip the letter, hand it over during the questions ==
questions   {"type":"skip"}                                          | text
questions   {"type":"sample","fileKind":"letter"}                    | text
  ack: 1 message: Thanks, that's a letter from Capital One. I'll go through it after your results.
  step still questions: questions; expects unchanged: yes
...
diagnosis   {"type":"skip"}                                          | text*,text,reason*,reason*,reason*,text
decline     {"type":"choice","value":"Tell me about the letter"}     | decline,text,text,text
  after diagnosis: step decline, lender Capital One
== POST /api/whatif {text} ==
{"changes":[{"lever":"paydown","value":300}],"before3m":{"low":735,"high":836},"after3m":{"low":743,"high":848},"before6m":{"low":772,"high":891},"after6m":{"low":772,"high":891},"kind":"whatif",...}
exit 0

5. DEMO_OFFLINE=true ANTHROPIC_BASE_URL=http://127.0.0.1:9 pnpm start, same script: exit 0, identical steps and numbers,
   Claude wording replayed from the cache (text*, reason*, step*), paper HTTP 200 %PDF-, uploads from the cache:
   sample-credit-report.pdf {"ok":true,"findings":13}, priya-bank.csv {"ok":true,"findings":7}, letter {"ok":true,"first":"Capital One, Balance Transfer credit card, 6 Oct 2026"}
   server log: "Claude OFF (DEMO_OFFLINE=true: cache, then templates); 48 cached outputs", then only the upload lines, no API errors
   (the dead base URL would have logged a connection error on any call)

6. Priya with the letter, 6-month plan, paper step; pdftotext on the PDF against that response's `result`:
Title: Your credit check   Pages: 2
43/43 engine strings and numbers found verbatim in the PDF text
   (score 700 out of 999 (Experian); 3 reasons and their evidence; 735 to 836 by Feb 2027 and 772 to 891 by May 2027;
    every 6-month step; the decline reasons, fix, "Not before Jul 2027", the 4 rights; risk line; Capital One Classic and the checklist)
```
  - Live Claude checks (Claude on): the sample PDF report read in 8 s with the same 13 findings as its JSON source. A letter photo (PNG) read in 2.3 s: Capital One, Balance Transfer credit card, 2026-10-06, Experian. A bank PDF read in 13 s gave the same figures as the CSV (£1,680 income, £650 rent, bills, subscriptions, £40 BNPL). The CSV is instant; Claude sorted 2 unknown payees. "two hundred quid" became paydown 200, and "cleared my barclaycard and stopped klarna" became clearCard plus stop bnpl. On the first live walk all 18 worded items passed the checker first time. Plain English example: "Utilisation means how much of your limit you use. Under 30% looks in control."
  - Jag's unmerged `origin/partner/engine-fixes` engine, swapped in temporarily and then restored (not committed): 38/38 tests passed and `make-examples.ts` stayed valid. Priya's headline becomes the right one ("Your credit utilisation and identity & stability are holding you back most.")
- Reviewer (`reviewer` agent on `git diff origin/main...HEAD`): it found all six verification items and every requirement met, and ran its own sweep: 24 full walks, a letter at each of 10 steps, every chip, free-text and slider what-ifs, 414 Claude-worded messages re-checked with 0 problems, and a fake Claude server sending invented numbers (all caught). Fixed everything it raised:
  - (medium) an uploaded report with a card missing `limit`, `balance` or `opened` was accepted and later broke the zod schemas with "NaN%". Uploads now must run through the engine and fit `EngineResult`, and the Claude prompt requires those card fields
  - The checker missed number words (sixty, a thousand, eighteen, twenty-five) and short months ("by Feb"). Both are read now, and cached wording is re-checked on read
  - The keyword what-if reader took "in 3 months I pay 200" as £3, and "rent" hid a paydown. It now skips durations and rent figures and prefers £ amounts
  - "Come off the electoral roll" was worded as "stays". It now says "would drop to X to Y" from the engine numbers
  - A `set` path through `__proto__` could pollute the prototype, and a wrong-type `set` broke `WhatIfResponse`. Both now give a friendly 422
  - The goal in own words used regex only (`conversation.md` says Claude). It now goes to Claude, and I fixed "rent a flat" being read as a mortgage
  - Uncommitted cache and script were committed
- Follow-ups needed after the first prompt (the prompt deltas):
  - The handoff says "Fastify", but CLAUDE.md's stack section still says Python + FastAPI. I followed the handoff and 112 (Node, pnpm). CLAUDE.md is Mihael's to update
  - The handoff did not say how the status flip works when the session must stay on its own branch. The user asked for it on `mihael/113`, so `handoffs/INDEX.md` was not touched (it still says `ready`)
  - "Claude turns text into `changes[]`": I kept a keyword reader as the fallback, so what-ifs work offline (verification 5) and when Claude is unsure
  - Uploads needed things the spec did not name: a `text` field for pasted letters, HEIC rejection, and validating uploaded reports through the engine (found in review)
  - The skill's default is to add server-side refusal fallbacks for `claude-sonnet-5-5`. I did not add them: a refusal (or any failure) falls back to the template, which is the handoff's rule
- Open issues / follow-ups:
  - **Engine (for Mihael and Jag):** `origin/partner/engine-fixes` (what-ifs on top of the plan, thin-file headline) is not on `main`. The backend works on it (tested above). After merging it, re-run the demo walk once with Claude on to refresh the wording cache for the new headline, and commit `data/ai-cache.json`
  - **Before the demo:** walk the exact demo path once online (and once with Plain English if it will be shown), then commit `data/ai-cache.json`. Offline replays only what is cached; anything else uses templates (still correct, less voice)
  - **114:** the backend is ready for `VITE_USE_MOCK=false`: start it with `pnpm --filter backend dev`. New behaviour is listed under "Contract changes" and in `conversation.md` "What the backend adds (113)". `writtenBy` is set on every message, `whatIf` on every what-if answer
  - First turn latency with Claude on: the diagnosis waits for the ahead-of-time wording (about 3 to 6 s after `assessing`; then 12 s at most before templates). The plan is worded while the diagnosis shows. Cached runs are instant
  - Sessions and uploads live in memory: a backend restart mid-demo gives 404 "start again"
  - Not done: a bank statement as JSON, and photos in HEIC (we ask for a screenshot or PDF instead). Not tested on a real bureau PDF, only our sample made from Alex's JSON
  - I stopped my servers on :8000 when finishing
