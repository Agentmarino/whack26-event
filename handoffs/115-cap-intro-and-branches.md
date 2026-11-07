---
id: 115
title: Cap, business card intro, opening question and branching flow
status: done
owner: mihael
concept: lenders-eyes
created: 2026-11-07
time-budget: 2h
---

# 115: Cap, business card intro, opening question and branching flow

## Goal
The agent becomes **Cap**, introduces himself by sliding his business card across the desk, then asks where to start. The conversation branches by the person's situation and joins up again at a shared goals step before the advice we already have. Backend, contract and frontend in one session (all on `main` now).

## Context
- User's flow notes, 2026-11-07 19:29 (decisions in brackets are Cowork defaults; the user can change them):
  - Everything centres on accessibility: make credit simpler to understand and act on. The agent flexes to different problems and starting points
  - **Intro:** "Hi, nice to meet you. My name's Cap, here's my card." Cap slides a business card across the desk; the card then fills the screen. Card: the Capital One logo (official PNG, unchanged), the name **Cap**, a title line [default: "Credit Coach", with "Here to make your credit make sense" under it]
  - **Opening question,** friendly and bubbly: "I understand you're here to make your credit better. Where should we start?" Choices:
    - A) I've been declined already
    - B) I've got a credit report I want help with
    - C) I want to get ready before I apply
    - [D) I'm new to credit or new to the UK. Cowork addition: the engine's build-from-zero track and the Mei Lin persona already cover it; drop it if the user says so]
  - **Branches:**
    - **Declined:** first explain clearly why they were likely declined, then concrete steps to improve, then the goals step
    - **Report / get ready:** straight to the goals step [Cowork: "get ready" also asks which product they want first, so readiness is checked against it]
  - **Goals step (shared):** what the person wants: a target score, eligibility for a specific card (Classic, Balance Transfer, 0% purchase from the engine's card list), car finance, a mortgage, or their own words; and the time frame (3 or 6 months)
  - After goals: the advice structure we already have (diagnosis reasons, plan steps, projection, card ladder, paper, what-if)
- Read first: `app/shared/contract.ts`, `app/shared/conversation.md`, `app/backend/` conversation code, `app/frontend/` message cards, `app/npc-concept/ART-GUIDE.md`
- The kit's `slide-paper` gesture already slides a sheet across the desk; the business card is the same motion with a smaller card sprite

## Requirements
### Contract (app/shared), logged under "Contract changes" in 113's handoff
- [ ] Steps: add `intro`, `opening`, `goals`. Add `branch: declined | report | prepare | new` to the session and to `TurnResponse`
- [ ] Message kind `card` (the business card) and gesture `slide-card`. Keep every existing field; additions only
- [ ] Regenerate the examples for each branch on its persona (declined and report: Priya; prepare: Alex or Priya with a Classic target; new: Mei Lin); `mockTurn` follows the branches

### Conversation (backend)
- [ ] `intro`: Cap's greeting, gesture `slide-card`, then a `card` message. `opening`: the question above with the choice chips. The decline letter stays accepted at any step (dropping a letter during `opening` picks the declined branch)
- [ ] **declined:** ask for the letter (or, if they don't have it, chips for who declined them and for what, which become the engine's decline input), then the report and bank (upload or sample), then the decline explanation first (decoder: ranked likely reasons, the one fix, when to reapply), then the top improvement steps, then `goals`
- [ ] **report:** report, bank, the existing questions, then `goals`, then diagnosis and advice
- [ ] **prepare:** which product first (chips from the card list plus car, mortgage, other), then report and bank, then readiness against that product (the card ladder's criteria with the month each turns green), then `goals` to confirm, then advice
- [ ] **new:** the build-from-zero questions (time in the UK, student, bank account age), bank data, then the build-from-zero steps, then `goals`, then advice
- [ ] `goals`: chips for target score, a specific card, car finance, mortgage, something else (free text), then 3 or 6 months. Feeds the engine's goal and horizon
- [ ] Tone: Cap is friendly and a little bubbly, never jokey about money. At most 40 words a message, British spelling. Claude wording goes through the checker as before
- [ ] Tests: each branch from `intro` to `coach` on its persona, validating against the schemas

### Frontend
- [ ] Name tag "Cap" in the dialogue box
- [ ] On `slide-card`: Cap slides a small card across the desk; when it lands it grows to fill the screen as a crisp business card: the official logo PNG at the top (unchanged), "Cap" large, the title line, a small pixel portrait of Cap's face from the kit. Tap or Enter to put it away. Reduced motion: show the card directly. Screen readers get the card text
- [ ] Opening and goals choices as large, friendly chips (44 pt, words plus a small icon each, never colour alone)
- [ ] Update `deliverables/pitch/demo-script.md`: the demo opens with Cap's card, then "I've been declined already" with Priya

## Verification
1. `pnpm --filter backend test` and typecheck pass; one test per branch
2. Playwright WebKit iPhone 15, mock and real backend: each of the four branches from intro to coach; screenshots of the card animation (start, mid, full screen) and the opening chips into `app/frontend/screens/`
3. Keyboard-only and reduced-motion passes still green
4. Demo walk (declined branch, Priya) with Claude on, cache refreshed and committed; push `main` and print the phone URL

---

## RESULT (filled in by Claude Code)
- Status: done (2026-11-07), on `main` as asked (no branch). INDEX row added as `ready` at the start, `done` now.
- Time taken: about 1 h 25 min (19:35 to 21:00), including a reviewer pass and its fixes. The frontend half ran in parallel in a subagent once the contract was fixed.
- What was built:
  - **Contract** (`app/shared/contract.ts`, additions only): steps `intro`, `opening`, `goals`; `Branch` (`declined | report | prepare | new`) on `TurnResponse.branch`; message kind `card` (no ref); gesture `slide-card`. `greet` stays in the enum, no longer sent.
  - **Backend** (`app/backend/src/conversation.ts`, `questions.ts`, `templates.ts`, `session.ts`): a stage list per branch (`BRANCH_STAGES`).
    - `intro`: "Hi, nice to meet you. My name's Cap, here's my card." (`slide-card`) and the `card` message. `opening`: the safety line, then "I understand you're here to make your credit better. Where should we start?" with the four chips. A letter at `opening` picks `declined`.
    - **declined**: the letter, or Skip → "Who turned you down?" and "And what were you applying for?" (chips become the engine's decline input) → report → bank → the decline explained first (decoder: ranked reasons, the one fix, when to reapply, rights) → "What can I do?" → the first 3-month step for each likely reason (up to three, as plain lines, Claude-worded) → goals.
    - **report**: report → bank → the questions → goals.
    - **prepare**: "What would you like to apply for first?" → report → bank → readiness (Classic: apply-from month; Balance Transfer / 0% Purchase: criteria met today, when all turn green, and the ones still to turn green with their months) → goals confirm.
    - **new**: new to the UK / student / never had credit (+ time in the UK) → bank account age → optional report → bank → the first three build steps ("from zero" only on the engine's build track) → goals.
    - **goals** (shared): the card they were declined for or want first leads the chips; "A target score" (next three round fifties), "A specific card" (the three cards), "Car finance", "A mortgage", "Something else" (own words via Claude); then 3 or 6 months. The assessing line names the goal ("…towards the Balance Transfer card").
    - The early read runs the engine once (goal guessed from the product); the final run after goals and the data questions feeds the existing diagnosis, paper, coach. Answers given before the report are kept (`s.answers`). Files are welcome until the final run.
  - **Mock and examples**: `make-examples.ts` now drives the real backend through each branch (declined, report, prepare on Priya; new on Mei Lin) and validates every response; `mockTurn` replays intro → opening → the branch → coach; `mock-walk.ts` checks all four and the edge paths.
  - **Frontend** (subagent): name tag "Cap"; kit `slide-card` state (the slide-paper push with a small card); on landing the card grows into a full-screen business card (logo PNG unchanged, portrait from the kit's sprites, "Cap", "Credit Coach", "Here to make your credit make sense"), dismissed by tap / Enter / Space / Escape, focus managed, reduced motion shows it at once, screen readers get the card text, a history row reopens it. Opening and goals chips are large with words plus a pixel icon. Read aloud: switching it on says only its confirmation; every later new line is read in full.
  - **Demo script** rewritten from the real output of the declined branch for Priya (every quote, the four questions, every tap counted); read aloud has its own beat at 2:00.
  - **Cache** (`app/backend/data/ai-cache.json`, 213 entries): every answer path of the declined branch for Priya, and every first-question path of the other three branches, both Plain English modes.
- Contract changes: logged in `handoffs/113-backend-conversation.md` ("Contract changes", 2026-11-07 (115)); flow in `app/shared/conversation.md` "Branches"; `app/CONTRACT.md` updated.
- Files changed: `app/shared/{contract.ts,conversation.md,mock-conversation.ts,scripts/*,examples/*}`, `app/backend/{src/conversation.ts,questions.ts,templates.ts,session.ts,test/conversation.test.ts,scripts/curl-walk.sh,data/ai-cache.json}`, `app/frontend/{src/App.tsx,cards/*,chat/*,npc/*,index.css,index.html,scripts/walk.mjs,scripts/checks.mjs,screens/115-*,screens/check-*}`, `app/CONTRACT.md`, `app/DEMO.md`, `app/DISCLOSURES.md`, `app/npc-concept/ART-GUIDE.md`, `deliverables/pitch/demo-script.md`, `handoffs/INDEX.md`, this file.
- Verification run and output (final code, 2026-11-07 20:40 to 21:00):
```
1. $ pnpm --filter backend test        Test Files 6 passed (6)   Tests 101 passed (101)
   $ pnpm typecheck                     exit 0
   One test per branch, intro to coach, every response through the zod schemas (declined, report, prepare x2, new x2),
   plus the no-letter, letter-at-opening and reviewer cases. engine.js byte-identical to prep-incoming.
   $ pnpm examples   → declined priya 12 turns, report priya 11, prepare priya 11, new mei 13; OK: every response valid,
                       every ref resolves, every message 40 words or fewer, ids unique per session
   $ pnpm --filter shared mock-walk → all four branches and the edge walk; mock walk OK

2. WebKit iPhone 15 (walk.mjs --branch), mock (:5176) and real backend (:5173 → :8000, Claude on):
   live-declined  intro, opening, ask_letter, ask_report, ask_bank, decline, goals, questions, assessing, diagnosis, paper, coach | 0 problems
   live-report    intro, opening, ask_report, ask_bank, questions, goals, assessing, diagnosis, paper, coach              | 0 problems
   live-prepare   intro, opening, questions, ask_report, ask_bank, goals, questions, assessing, diagnosis, paper, coach   | 0 problems
   live-new       intro, opening, questions, ask_report, ask_bank, goals, assessing, diagnosis, decline, paper, coach     | 0 problems
   mock: the same four (0 problems each); desktop 1440 declined; 150% text declined (0 problems)
   ("problems" = console errors, controls under 44 px, horizontal scroll, dock off screen)
   Screens: app/frontend/screens/115-iphone-card-1-start, -2-sliding, -3-growing, -4-full; 115-desktop-card-full;
   115-iphone-reduced-card-full; 115-iphone-opening-chips; 115-desktop-opening-chips; goals, each branch's key step, what-if

3. Keyboard only + reduced motion (walk.mjs --keyboard --reduced, declined): 0 problems
   $ node scripts/checks.mjs --base :5176 --live-base :5173 → all 19 passed, including the new
   "read aloud on: the confirmation alone, then the next line in full"; contrast.mjs: all pairs pass

4. Cache and demo walk, Claude on (structured output):
   declined branch, Priya, every answer path: letter or no letter (2 lenders x 7 products) x 9 goal choices x 3/6 months
   x 3 roll x 3 Direct Debit x Plain English off/on = 4,860 paths: 160,920/160,920 worded messages by Claude
   other branches, every first-question chip (report: Priya, Mei, Alex; prepare: 6 products; new: newWhy x UK time x
   bank age on Priya and Mei, and Alex), both modes: 84 paths, 2,494/2,494 by Claude
   Offline (DEMO_OFFLINE=true) on the final code: the same 4,860 + 84 paths fully Claude-worded from the cache.
   Demo script walked in WebKit on the live stack: 19/19 worded messages from the cache, Plain English sent from the
   opening on; the read-aloud toggle says only "I'll read my replies aloud."; the £400 answer is spoken in full, no cancel.
```
- Reviewer (`reviewer` agent on `d24433f..HEAD`): nothing breaking the demo path; 2,400 random offline walks all valid; cache coverage for the declined branch confirmed independently (17,664 paths). Fixed what it raised: "Another credit card" read as car finance; a letter during the who/what questions was overwritten; early-read readiness cards re-resolving against the final ladder (now plain lines); files after the early read refused; "The letter said: No specific reason given" with no letter (now "Reason given: None, there was no letter"); typed score goals; "from zero" for a non-thin file; read-aloud confirmation cancelled when no line shows; the declined test stopping at paper; demo script tap counts; a stale doc path.
- Open issues / follow-ups:
  - At 150% text on a phone the goals question is partly hidden behind the chip grid (it scrolls; reachable but tight).
  - In the declined branch the decline card in the history resolves against the final result: an answer that changes the decoder (e.g. "No, I can't" register) can change its 4th reason after the fact. The text above it names no reasons, so nothing contradicts; the paper uses the final decline.
  - "Something else" (free text) goals are not pre-cached; they go to Claude live (or the template offline).
  - Not tested on a real iPhone or with VoiceOver. Web speech is muted by the iPhone's silent switch.
  - The canvas label still says "sliding his business card" while the card overlay is open.
