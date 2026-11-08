---
id: 119
title: Engine wording for a narrow file, re-cache, deliverables, Demo mode at 2x
status: in-progress
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
- Status:
