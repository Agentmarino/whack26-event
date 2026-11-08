---
id: 118
title: Continuous typing in one message, the box scrolls line by line (no page breaks)
status: done
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
- [x] One message types continuously. The box shows its usual number of lines. At the end of the last visible line it scrolls up one line (smooth, about 150 ms) and keeps typing.
- [x] Next (tap, Space, Enter) only once the whole message has typed. A tap while typing finishes the message at once, scrolled to its end.
- [x] The page-break logic for messages is removed. The speech-bubble fallback uses the same scrolling.
- [x] Demo mode: auto-advance after the whole message finishes, with a reading pause based on its length (as now).
- [x] Reduced motion: the whole message at once. If it is longer than the box, the box scrolls by tap or arrow keys, with a visible scroll indicator.
- [x] Screen readers still get the whole message at once in the live region.
- [x] Text size 125% and 150%, and Readable font, still fit and scroll correctly.
- [x] `deliverables/pitch/demo-script.md`: the new tap count and time. `app/DEMO.md` if anything changed.

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
- **Status: done. Every check passed, so `mihael/118` is merged into `main` with `--no-ff` and pushed.**
- Time taken: about 2 h, 2026-11-08 01:41 to ~03:45, unattended. Most of it was verification: two review rounds, and the matrix run three times on frozen code.

### Read this first (three things you may want to change)
1. **The demo is longer now: 20 taps, 173.1 s with a robot** (it was 113.2 s), about 3:10 with your own taps.
   - Every line now types out before its reading pause, as asked: "reading pause based on its length, as now".
   - **Text speed 2x** keeps the same 20 taps: 133.3 s, about 2:30 with your taps. It's one setting on the phone; the demo script and DEMO.md say so.
   - If you'd rather keep 1x and about 2:00: subtract the typing time from Demo mode's pause, e.g. `max(min, 250*words - typedMs)` in `App.tsx`'s `demoPause`. I did not, because you specified the pause.
2. **Demo mode now types.** Since 114 it had shown instant text. Your spec, "auto-advance after the whole message finishes", only works if the text types, and instant text would never show a long line's hidden lines. The Settings hint no longer says "Instant text".
3. **Pre-existing on `main`, not from 118:** at 150% text on the iPhone, the summary sheet on the desk is covered by the paper's window and the box, so it can't be tapped.
   - I proved it on `main` itself: I put `main`'s `src` back in the working tree for one run, and `walk.mjs --text 150` failed the same way (`main-text150/iphone-declined-FAILED.png` in the session scratchpad), then restored the branch.
   - The paper still opens with **Read it** in its window. `walk.mjs` now taps the desk sheet only when it is uncovered, and logs which way it opened the paper.
   - The app is unchanged here. It's a follow-up (below).

### What was built
- **One message types out continuously.**
  - The box shows its usual lines: 3 with the camera.
  - When typing reaches the end of the last visible line, the text slides up one line (`transform`, 150 ms ease-out) and typing waits that long before the new line's first letter.
  - Measured on the iPhone: each scroll settles in 134 to 135 ms. In 100 frames of typing the letter being typed was never outside the box.
  - The whole message is in the DOM: printed and unprinted spans. Where each visual line starts is measured with `Range` rects in the existing hidden measurer (`lineStarts` in `GameBox.tsx`), again on font load and resize.
- **Next only once the whole message has typed.**
  - While it types, the button says **Show all** and the ▼ is hidden.
  - A tap, Space, Enter or Show all while typing finishes it at once, scrolled to its end, with no animation. Even a one-line jump is instant.
- **Page breaks removed.** 117's `paginate`, its break rules and the "extra line" orphan logic are gone. The speech bubble uses the same window and the same scrolling: checked in landscape, tops 0,1,2,3.
- **Reduced motion and Instant text:** the whole message at once, from its top. A message longer than the box gets a pixel **scroll indicator** in the ▼ gutter: a ▲ that lights when there is text above, a track with the part in view, and a ▼.
  - **Tap, Space or Enter** scroll on a box-full; at the end they go on.
  - **↑ ↓** scroll a line, **Page Up/Down** a box-full, and **Home/End** jump (Home/End with the text focused). The wheel scrolls one line a notch.
  - The **big button says More** while lines are below and scrolls first, so it never skips them (review finding). It says Next at the end. A line that ends its turn on Continue shows More first too.
  - The arrow keys never take over a menu, a text field, a slider, a sheet or the notebook.
- **Demo mode:**
  - Each line types out, then waits 250 ms a word of the whole line: at least 1.2 s, at least 2.5 s with an item window. Then it moves on. It never moves mid-line.
  - Shown whole (reduced motion), it scrolls on a box-full at a time, each with the pause for the words in view.
  - It still stops at choices, the paper, the business card and the first Why?, once the line's end is in view.
  - **Skip all** lands on the turn's last line already typed out.
- **Screen readers:** the live region still gets the whole message at once.
  - When a long line can scroll, the text window is a focusable region labelled "Cap's line, scrolls with the up and down arrow keys", holding the line as screen-reader text.
  - A tap never moves focus there, so a phone's keyboard stays open. Focus that is there stays on the next line, rather than dropping to the page.
- **Text size and fonts:** the window is `calc(N * 1lh)`. `1lh` follows VT323's `font-size-adjust` (26.0 px, where `getComputedStyle` says 26.4), so it always holds whole lines. Checked at 125%, 150%, Readable and 150% Readable, on both profiles.
- Kit `useTypewriter` has a new optional `pauseBefore(i)`. Both kit copies are identical (`diff -r` empty).

### Verification (2026-11-08, frozen code at `a92a747` plus script-only changes; offline stack and mock)
Stacks:
- **Live, offline:** backend `PORT=8001 DEMO_OFFLINE=true ANTHROPIC_API_KEY= pnpm start`, which printed "Claude OFF (DEMO_OFFLINE=true: cache, then templates); 218 cached outputs". Frontend `VITE_USE_MOCK=false API_TARGET=http://localhost:8001 vite --port 5174 --host`.
- **Mock:** the frontend on :5176.
- Your own `pnpm dev` on :5173/:8000 was left alone.

| Check | iPhone 15 (WebKit) | Desktop 1440x900 (Chromium) |
|---|---|---|
| The 20 checks, `checks.mjs --base :5176 --live-base :5174 [--desktop]` | `all 20 passed` | `all 20 passed` |
| Demo walk, live offline stack on the LAN URL `http://172.20.10.6:5174`, `SKIP=steps,reasons,plan NOWHY=1` | `TOTAL 20 taps, 173.1s`; 2x: `TOTAL 20 taps, 133.3s`. Exit 0, no PROBLEM, `requests to other hosts: 0` | `TOTAL 20 taps, 174.5s`, exit 0, no PROBLEM, `requests to other hosts: 0` |
| 118 checks, `typing.mjs [--desktop]` | `all 30 passed` | `all 28 passed` (no landscape bubble on desktop) |
| Keyboard only, `walk.mjs --keyboard` | exit 0, 42 shots, 0 PROBLEM | exit 0, 42 shots, 0 PROBLEM |
| Reduced motion, `--reduced`; and `--keyboard --reduced` | exit 0 / exit 0 | exit 0 |
| 150% text, `--text 150` | exit 0. The paper opened with Read it; the desk is covered (pre-existing, see above) | exit 0 |
| Readable font / typing at 1x / live offline stack | exit 0 / exit 0 / exit 0 | — / exit 0 / exit 0 |

- **The demo walk holds:** it waits for the line to type out, requires `data-demo="hold"`, then checks the line is still there past its reading pause. It held at the Why? moment and at the paper.
- **Static:** `pnpm typecheck` exit 0; `pnpm --filter backend test` `Tests 101 passed (101)`; `pnpm --filter frontend build` built; `node scripts/contrast.mjs` `all pairs pass`; kit `diff -r` empty.
- **Fixed in a script, not the app:** `contrast.mjs` failed in the first matrix ("token missing", 55 pairs).
  - The PWA commit `426eaca` on `main` added a safe-area `:root {}` block before the colour tokens, and the script read only the first block. `main`'s `index.css` has the same block order, so it fails there too; I didn't run it on `main`.
  - It now merges every block with the same selector. 118 adds no colour values.
- **Screens:**
  - Committed: `app/frontend/screens/118-{iphone,desktop}-*.png` (typed out, tap to finish, reduced motion top and scrolled, 125/150/Readable, the bubble), refreshed `check-*.png` and new `check-desktop-*.png`.
  - The ones I looked at: iPhone typing mid-scroll and typed out, tap-finished, reduced motion top (with More), 150%, Readable, the landscape bubble; desktop reduced motion top (before and after the 1rem indicator fix), 150% (the bubble); the demo walk's Why? stop and what-if; the 150% paper failure on the branch and on `main`.
  - The other screens are from the same checks, which passed, but I didn't open each one.
  - Walk and demo-walk screens are in the session scratchpad, not committed, to avoid churning about 300 PNGs.

### Review
The `reviewer` agent read the diff twice, without browsers while the timings ran.
- **Round 1:** no logic or crash bugs in the scroll model, `advance`, Skip all or Demo mode holds; kit copies identical.
  1. Docs not updated: done.
  2. Demo longer: measured, kept as you specified, 2x documented.
  3. In reduced motion the Next button skipped the lines below the box: **fixed** with More (`f6ac3f9`).
  4. Focus dropped to `<body>` when the text stopped being scrollable: **fixed** with `tabIndex -1` and the region's text.
- **Round 2:**
  - Continue still skipped lines in reduced motion: **fixed**, More first.
  - A tap on the text could take focus off a phone's text field: **fixed** with `mousedown` `preventDefault` (`a92a747`).
  - It confirmed More never shows wrongly in typed mode, and `-1` doesn't change the Tab order.
- The whole matrix ran again after round 2's fixes (which include round 1's). The walks ran once more after the `walk.mjs` paper-step change.

### Files changed (`git diff --stat main...mihael/118`, without PNGs)
- `app/frontend/src/`:
  - `App.tsx`
  - `game/GameBox.tsx`
  - `game/PixelArrow.tsx`: ▲
  - `chat/Dock.tsx`: More
  - `index.css`
  - `settings.tsx` and `sheets/SettingsSheet.tsx`: the Demo mode hint
  - `npc/hooks.ts`
- `app/npc-concept/src/npc/hooks.ts`: identical to the frontend copy
- `app/frontend/scripts/`:
  - `typing.mjs`: new
  - `demo-walk.mjs`: whole lines, typing counts as progress, strict holds, `SPEED`, `DESKTOP`
  - `checks.mjs`: `--desktop`
  - `walk.mjs`: `--speed`, the desk-or-Read-it paper step
  - `contrast.mjs`
- `app/DISCLOSURES.md`: one row, no new libraries
- `app/DEMO.md`: the rehearsal gate's time, text speed, `?demo=1` wording, the check commands, a rehearsal entry
- `deliverables/pitch/demo-script.md`: 20 taps, the 1x times, the 2x option
- `handoffs/INDEX.md`: the 118 row, and 117 set to done (its file already said done)
- Screens

### Open issues / follow-ups
- **The demo length** (see Read this first): choose 1x (about 3:10) or 2x (about 2:30) before judging, and re-run the rehearsal gate with `SPEED=2x` if 2x.
- **At 150% text on a phone, the desk sheet is covered** by the paper's window and the box, on `main` too. Read it works. A fix would keep the box under the desk top while the paper is on the desk, e.g. fewer text rows there. Not done: it's pre-existing and touches the camera's layout.
- **Not checked on a device:** Safari on the iPhone, the scroll's feel at 120 Hz, a tap on the text with the keyboard open (the fix is standard WebKit behaviour, untested on iOS), and VoiceOver on the scrollable region.
- **The optional Why? beat, re-timed:** the same walk with `NOWHY` unset (Why? opened and closed at the hold) gave `TOTAL 22 taps, 174.0s`, exit 0, `requests to other hosts: 0`, against 173.1 s without it.
  - So it costs 2 taps, and its time is whatever you spend talking over the drawer.
  - The two other optional beats (steps in full, read aloud) are not re-timed after 118; the script says so.
- Prompt deltas: none. It ran unattended from one prompt; every judgement call above is mine.
