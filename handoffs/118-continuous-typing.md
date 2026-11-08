---
id: 118
title: Continuous typing in one message, the box scrolls line by line (no page breaks)
status: in-progress
owner: mihael
concept: lenders-eyes
created: 2026-11-08
time-budget: 3h (overnight, unattended)
---

# 118: Continuous typing in one message, the box scrolls line by line

## Goal
Within one message the text types out continuously, with no Next mid-message. When the typewriter reaches the end of the box's last visible line, the text scrolls up one line (smooth, about 150 ms) and keeps typing, like a classic RPG box. Next shows only when the whole message has typed.

## Context
- User, 2026-11-08 ~01:40, as an overnight job with nobody to answer questions:
  - "within one message, the text types out continuously with no Next mid-message"
  - "when the typewriter reaches the end of the last visible line, the text scrolls up one line at a time (smooth, about 150 ms per line) and keeps typing"
  - Decisions are made here and written in RESULT.
- Read first:
  - `app/frontend/src/game/GameBox.tsx`: the box, the bubble and 117's `paginate`
  - `app/frontend/src/App.tsx`: pages, the typewriter, `advance`, Demo mode pacing
  - `app/frontend/src/npc/hooks.ts`: `useTypewriter`, a kit file; both kit copies must stay identical
  - 117's RESULT (camera, bubble, Demo mode)
- Branch `mihael/118` from `main`, not the `/handoff` status flip on `main`: the user asked for main to stay untouched unless every check passes.

## Requirements
- [ ] One message types continuously. The box shows its usual number of lines. At the end of the last visible line it scrolls up one line (smooth, about 150 ms) and keeps typing.
- [ ] Next (tap, Space, Enter) only once the whole message has typed. A tap while typing finishes the message at once, scrolled to its end.
- [ ] The page-break logic for messages is removed. The speech-bubble fallback uses the same scrolling.
- [ ] Demo mode: auto-advance after the whole message finishes, with a reading pause based on its length (as now).
- [ ] Reduced motion: the whole message at once. If it is longer than the box, the box scrolls by tap or arrow keys, with a visible scroll indicator.
- [ ] Screen readers still get the whole message at once in the live region.
- [ ] Text size 125% and 150%, and Readable font, still fit and scroll correctly.
- [ ] `deliverables/pitch/demo-script.md`: the new tap count and time. `app/DEMO.md` if anything changed.

## Out of scope
- The backend, the contract, the camera framing, the menus' own paging (choices still page with More), `context/`

## Verification
On the iPhone 15 profile and desktop:
1. The 20 checks (`scripts/checks.mjs`)
2. The full demo walk on the live stack with `DEMO_OFFLINE=true` (`scripts/demo-walk.mjs`)
3. Keyboard-only, reduced motion, 150% text (`scripts/walk.mjs`)
4. If and only if every check passes: merge `mihael/118` into `main` with `--no-ff` and push. Otherwise push the branch only, leave `main` untouched, and write what failed at the top of RESULT.

---

## RESULT (filled in by Claude Code)
- Status: in progress
