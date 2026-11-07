---
id: 115
title: Cap, business card intro, opening question and branching flow
status: ready
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
- Status:
- Time taken:
- What was built:
- Contract changes:
- Files changed:
- Verification run and output:
- Open issues / follow-ups:
