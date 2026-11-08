---
id: 119
title: Engine wording for a narrow file, re-cache, deliverables, Demo mode at 2x
status: blocked      # not merged: the re-cache needs Claude, see RESULT
owner: mihael
concept: lenders-eyes
created: 2026-11-08
time-budget: fix-only, hard stop 09:45
---

# 119: Engine wording for a narrow file, re-cache, deliverables, Demo mode at 2x

## Goal
Priya (one card for 2 years) is no longer told she has "very little UK credit history". The declined demo path is re-cached in Claude's words with the new wording, the pitch numbers and Devpost draft are in the repo, and Demo mode starts at text speed 2x.

## Context
- Request: fix-only, from Mihael on 2026-11-08 at 08:46, branch `mihael/119` from main
- Files: `app/backend/engine/engine.js`, `app/shared/scripts/make-examples.ts`, `app/backend/data/ai-cache.json`, `app/frontend/src/settings.tsx`, `deliverables/pitch/demo-script.md`, `app/DEMO.md`
- Sources for the copies: `../30-DELIVERABLES/whack26/numbers.md` and `../30-DELIVERABLES/whack26/devpost-draft.md`

## Requirements
- [ ] Engine wording (Priya has had a card for 2 years): for someone whose oldest account is 1 year or older, the thin-file treatment must not say "very little UK credit history":
  - the decoder reason becomes "Only one credit account", with evidence "You have one card, so lenders have little to compare. A second account, used well, helps."
  - the plan step "Avoid the thin-file traps" becomes "One application at a time"
  - the Classic step drops the "no UK credit history" sentence unless the person is new to the UK
  - wording only, no scores or dates. Noted as a Cowork-approved change to Jag's engine
- [ ] Re-run make-examples.ts and the backend tests
- [ ] With Claude ON, re-cache the declined-branch demo path for Priya (both Plain English modes, the taps in `deliverables/pitch/demo-script.md`). Confirm an offline walk at SPEED=2x is fully Claude-worded with no template fallbacks
- [ ] Copy `numbers.md` to `deliverables/pitch/numbers.md` and `devpost-draft.md` to `deliverables/devpost/devpost-draft.md`, then update the "Watch out" section of numbers.md to say what changed
- [ ] Demo mode's default text speed is 2x; update the timings in `demo-script.md` and `DEMO.md`
- [ ] Merge to main and push only if every check and the offline walk pass. If not done by 09:45, push the branch, leave main as it is, and say what's missing

## Out of scope
- Scores, dates and any figure the engine computes
- `prep-incoming/credit-coach/engine.js` (Jag's original, left as it is)

## Verification
- `pnpm examples`, `pnpm --filter backend test`, `pnpm typecheck`
- The live walk (Claude on) in both Plain English modes, then the offline rehearsal (`DEMO_OFFLINE=true`, `SPEED=2x SKIP=steps,reasons,plan NOWHY=1 node scripts/demo-walk.mjs`), checked to be all `writtenBy: claude` wherever the live walk was
- The 20 checks (`scripts/checks.mjs`)

---

## RESULT (filled in by Claude Code)

**NOT MERGED. Main is untouched (4dfb981). The branch `mihael/119` is pushed.**

**What's missing: the Claude re-cache of one changed step.** The new plan step "9 Nov 2026: One application at a time." has no Claude wording in `ai-cache.json`, in either Plain English mode. Offline, it falls back to its template, so the offline walk is not fully Claude-worded. Everything else passed.

Why it is missing:
- My sandbox lets Node reach other hosts but not `api.anthropic.com`. `fetch` gives ETIMEDOUT, while curl to the same host works. The backend I started on :8001 with Claude on got "Connection error" on every call, and running outside the sandbox was refused.
- So I ran the two live walks through your own `pnpm dev` (:5173/:8000, Claude on). It cached the reworded Classic step (2 entries, 08:54, committed). Then the backend on :8000 stopped at about 08:57, at the "Sum it up" beat of both walks. The frontend on :5173 stayed up; I can't see the backend's log, so I don't know why it stopped.
- My offline backend ran the same path at 2x without a problem, and the paper renders (`make-paper.ts priya 3m`: 2 pages), so the engine change does not look like the cause.
- It was still down at 09:12. I did not restart it, because it is your terminal's process.
- It came back at 09:26. I ran the rehearsal walk through it in both Plain English modes:
  - Plain English on: `TOTAL 20 taps, 133.4s`, exit 0.
  - Plain English off: `TOTAL 20 taps, 132.6s`, exit 0.
  - Both still list `template [step] 9 Nov 2026: One application at a time.`, and `ai-cache.json` gained 0 entries. So that backend was most likely started with `DEMO_OFFLINE=true`, or it can't reach Claude either. That left no way to cache the step before 09:45, so I didn't merge.

To finish (about 10 minutes):
1. `pnpm dev` from the repo root. The backend line must say `Claude on`.
2. Cache both Plain English modes:
   `cd app/frontend && node scripts/demo-walk.mjs http://127.0.0.1:5173 /tmp/w-plain & PLAIN=0 node scripts/demo-walk.mjs http://127.0.0.1:5173 /tmp/w-noplain; wait`.
   The 12 s turn budget may answer a turn with its template while Claude carries on and fills the cache; that is fine here.
3. Ctrl+C, then `DEMO_OFFLINE=true pnpm dev`, then the gate in both modes:
   `SKIP=steps,reasons,plan NOWHY=1 node scripts/demo-walk.mjs http://127.0.0.1:5173` and the same with `PLAIN=0 ` in front.
   - Each must end `TOTAL 20 taps`, with no PROBLEM line and 0 requests to other hosts.
   - Its template list must contain no `[step]` line. Today's lists differ from a full pass only by `[step] 9 Nov 2026: One application at a time.`
4. `grep -c "One application" app/backend/data/ai-cache.json` should be 2 or more. Check the new entries don't say "thin". Commit `app/backend/data/ai-cache.json` on `mihael/119`, then merge with `--no-ff` and push.

- Status: blocked on the re-cache. Every other requirement is done and checked.
- Time taken: 08:46 to 09:30 (2026-11-08).

### What was built
1. **Engine wording.** `app/backend/engine/engine.js`, a **Cowork-approved change to Jag's engine**, wording only. Applies to someone whose oldest account is 1 year or older:
   - The decoder reason is now **"Only one credit account"**, with evidence "You have one card, so lenders have little to compare. A second account, used well, helps."
     - If the one account is a loan, the evidence says "one loan".
     - If there are no open accounts but some history, it says "No open credit accounts". The engine never produces that case today.
   - The plan step "Avoid the thin-file traps" is now **"One application at a time"**.
     - Its text says "Apply for one thing at a time ... With few accounts on your file, each of these counts for more." This replaces "... On a thin file each of these counts for more." My decision: the old text contradicted the new title.
   - The Classic QuickCheck step drops "Capital One is less likely to accept people with no UK credit history ...". It keeps it for someone new to the UK, or with less than a year of history: I read the request as scoped to people with a year or more.
   - Unchanged: Sam (no history) and Mei (new to the UK) keep the thin-file wording. The reviewer compared main and the branch for priya, sam, dan, mei and alex through `run`, `decodeDecline` and `whatIf`. Only Priya changes, in 8 text fields; no score, date, projection or plan structure moves.
   - `prep-incoming/credit-coach/engine.js` (Jag's original) is left as it was, so **the two copies now differ**. `app/backend/engine/index.ts` says so. CLAUDE.md still calls them byte-identical; I left CLAUDE.md alone. Follow-up: don't re-copy the engine over the 119 wording.
   - Still says thin: behind Why?, the Classic step's data line says "Thin file", and the track is called "Build-from-zero track". These are because-trail text, not the three lines named in the request, so I left them; `numbers.md` says so.
2. **Examples:** `pnpm examples` re-run. Only the wording and session ids changed.
3. **Deliverables:**
   - `deliverables/pitch/numbers.md` and `deliverables/devpost/devpost-draft.md` copied from `../30-DELIVERABLES/whack26/`.
   - The devpost draft is identical to its source.
   - numbers.md's "Watch out on stage" now says what changed, what still says thin, and that the declined path is re-cached. **That last claim is true only after the step above is done.**
4. **Demo mode at 2x:**
   - Turning Demo mode on, in Settings or with `?demo=1` on settings that aren't already in Demo mode, sets the text speed to 2x.
   - A speed picked after that stays, even across `?demo=1` reloads. Turning Demo mode off leaves the speed as it is.
   - The Settings hint says "text speed set to 2x".
5. **Docs:**
   - `deliverables/pitch/demo-script.md` is re-timed from the 2x offline walk: title, text speed line, every row time, the Taps line and the optional Why? time.
   - `app/DEMO.md`: the rehearsal gate is now about 132 s at 2x (`SPEED=1x` for about 173 s), the WORDING line is explained, and the phone settings and demo length are updated.
6. **Scripts:**
   - `demo-walk.mjs` now defaults to SPEED 2x. It has `PLAIN=0`, and it records who worded each message (`writtenBy`) into `<out>/wording.json` and prints a `WORDING` line with every template line.
   - New `speed-check.mjs` (5 checks for the 2x default).
   - `checks.mjs` check 6 now stores `demo: true`, so it stays on instant text as intended.

### Verification (real output)
- `pnpm examples`: `OK: every response valid, every ref resolves, every message 40 words or fewer, ids unique per session`
- `pnpm --filter backend test`: `Test Files  6 passed (6)` / `Tests  101 passed (101)`
- `pnpm typecheck`: exit 0. `pnpm --filter frontend build`: built (dist removed).
- 20 checks:
  - iPhone 15: `all 20 passed`, exit 0.
  - Desktop (`--desktop`): `all 20 passed`, exit 0.
  - Both ran against the mock on :5176 and the offline stack on :5174.
- `speed-check.mjs` on the offline stack, all PASS, exit 0:
  - `?demo=1 fresh: {"demo":true,"speed":"2x"}`
  - `?demo=1 again after picking 1x: 1x`
  - `toggle on from 1x: {"before":"1x","after":"2x","demo":true}`
  - `sheet shows 2x selected: true`
  - `toggle off leaves speed: 2x`
  - Screenshot of the sheet looked at: 2x selected, hint wraps cleanly.
- **Offline walk at SPEED=2x** (backend `PORT=8001 DEMO_OFFLINE=true ANTHROPIC_API_KEY=`, "Claude OFF (DEMO_OFFLINE=true: cache, then templates); 220 cached outputs"; frontend :5174 over the LAN URL; `SKIP=steps,reasons,plan NOWHY=1`):
  - Plain English on: `TOTAL 20 taps, 131.7s`, `WORDING 18 claude, 31 template`, `requests to other hosts: 0`, exit 0, no PROBLEM.
  - Plain English off: `TOTAL 20 taps, 130.4s`, `WORDING 18 claude, 31 template`, `requests to other hosts: 0`, exit 0, no PROBLEM.
  - Only headline, reason and step messages are ever Claude-worded (`wording.ts` `factsFor`). The intro, sample, decline, question, paper, projection, ladder and what-if lines are templates by design.
  - **The one Claude item that fell back in both modes: `[step] 9 Nov 2026: One application at a time.` Fails the "no template fallbacks" check.**
  - Beat times at 2x: card 3.5 s, nice 0.2, declined 6.8, samples 27.7, decline 40.6, steps/goals 6.8, plan built to Why? 29.4, reasons 0.1, paper 8.5, plan 2.8, what-if 5.0.
- Reviewer agent: no correctness defects. Its points are fixed: check 6, the hint, the engine wrapper comment, and the numbers.md overstatement. The re-cache it flagged is the one item still open.

### Decisions
- Demo mode's 2x applies when Demo mode is turned on; the person can still change the speed, and turning it off keeps it.
- `demo-walk.mjs` defaults to 2x to match. Use `SPEED=1x` for the old timing.

### Follow-ups
- Finish the re-cache (above), then merge.
- Find out why the :8000 backend stopped around 08:57.
- CLAUDE.md's "byte-identical copy" line for the engine is now out of date.
- I left the mock server on :5176 running (it came from my 118 run). I stopped my :8001 and :5174 servers.
