---
id: 117
title: Cap closer, framing options, speech bubble fallback, demo-mode auto-advance
status: done
owner: mihael
concept: lenders-eyes
created: 2026-11-07
time-budget: 90m
---

# 117: Cap closer, framing options, speech bubble fallback, demo-mode auto-advance

## Goal
Cap fills the screen on iPhone and desktop instead of the desk. Show the user framing options, apply the default, keep the game dialogue box at the bottom where it fits and fall back to a pixel speech bubble where it does not. Also make Demo mode auto-advance so the live demo needs few taps.

## Context
- User, 2026-11-07 23:12, after seeing 116 on his iPhone and desktop: "I'd rather Cap was much closer, especially on iOS. In both desktop and iOS the desk is like 90% of the real estate. The messages can be in a speech bubble if there is not enough space at the bottom, but there still should be [a dialogue box at the bottom where there is space]"
- 116 extended the scene to fill the viewport (more ceiling above, desk front and floor below). That extension is what made the desk dominate
- Read first: 116's RESULT and session notes, `app/frontend/` scene and dialogue box code, `app/npc-concept/src/npc/` (ExtendedScene), `ART-GUIDE.md`
- The user decides design by seeing it: produce options as screenshots, then apply the recommended default

## Requirements
### Framing
- [ ] A camera/framing layer on top of the kit: choose a crop window of the native scene and a whole-number scale so that **Cap's head-to-desk-top region fills at least 55% of the visible height** on iPhone 15 portrait and at least 50% on desktop 1440x900. Crop the sides and the floor before shrinking Cap. Whole-number scaling only, no blur
- [ ] The desk stays visible as a thin strip with his hands, keyboard and the tray; the desk front panel and floor mostly out of frame (only what the dialogue box does not cover)
- [ ] Keep the Capital One logo visible: if the crop cuts the desk monitor, move the monitor into frame for that layout (a kit layout variant, both kit copies identical, ART-GUIDE updated), or let it sit partly behind Cap's shoulder. Say which in RESULT
- [ ] Produce `app/frontend/screens/117-framing-options.png` with three framings side by side on iPhone 15 and below them on desktop: (A) head and shoulders plus desk strip, (B) waist up with the desk strip and monitor, (C) the tightest that still shows his hands on the keyboard. Default to B unless A or C is clearly better; switchable in the debug panel so the user can pick after
- [ ] Gestures that reach the desk (receive document, slide paper, slide card) still read in the chosen framing; the card and paper still end where the user can tap them

### Dialogue box and speech bubble
- [ ] The game dialogue box stays at the bottom whenever at least 3 lines of Press Start 2P plus the name plate fit below Cap's chin line. Otherwise (short landscape screens, large text sizes, keyboard open) the line shows as a pixel speech bubble beside or above Cap's head, with the tail pointing at his mouth, same font and paging rules
- [ ] Choices and the text field stay pinned at the bottom in both modes and never cover Cap's face

### Demo mode auto-advance
- [ ] In Demo mode each page advances by itself after a reading pause (about 250 ms per word, minimum 1.2 s; 2.5 s on pages with an item window) and stops only at choices, the paper, the business card and the "Why?" moment. A tap still skips ahead. Outside Demo mode nothing changes
- [ ] Re-walk the declined branch for Priya on the live stack and rewrite `deliverables/pitch/demo-script.md`: target at most 20 taps and about 2:00

### Keep
- [ ] Every 114/116 accessibility check still passes (live region, keyboard, reduced motion, 150% text, readable font, colour modes)
- [ ] Commit the uncommitted ai-cache.json entry

## Verification
1. `117-framing-options.png` exists and you looked at it; the default applied
2. Playwright WebKit iPhone 15 portrait, iPhone landscape, desktop 1440x900 and a short desktop window (1280x720): screenshots of a long line, a choice, an item window and the paper, into `app/frontend/screens/117-*`; at least one shows the speech bubble fallback
3. Measured share of visible height for Cap's head-to-desk-top region in each, written in RESULT
4. Demo mode walk: tap count and duration in RESULT; all accessibility checks pass; real backend, no console errors
5. Push `main`; print the phone URL for the hotspot (`ipconfig getifaddr en0`, currently 172.20.10.6)

---

## RESULT (filled in by Claude Code)
- Status: done
- Time taken: about 3 h 15, 2026-11-07 ~21:15 to 2026-11-08 ~00:30, against a 90 min budget. Most of it went on the camera's rules and the demo timing.
- Work was on `main` throughout (the user asked for no branch), in small commits from `0f26c81` to the RESULT commit.

### Framing chosen and measurements
- **Default B, "waist up, desk strip and monitor".** Switch it in Settings → "Camera (for testing)": A, B, C or Full (116's whole desk). `?framing=A|B|C|full` also works.
- **Options**: `app/frontend/screens/117-framing-options.png`, looked at. Each framing is shown on iPhone 15 and desktop 1440x900, with its share and scale.
  - **A** (head and shoulders): 76% on the phone, 80% on the desktop. The box covers the desk and his hands.
  - **B**: 58% / 60%. His hands, the keyboard and the tray sit just above the box. The logo is in frame.
  - **C** (hands): 61% / 67%. His fingers on the keyboard show; the tray, paper and card land behind the box.
  - B is the only one that keeps the paper and card tappable on the desk.
- **The camera** (kit `camera.ts`, `frameCamera`) picks k, a whole number of device px per scene px, so there is no blur:
  - k fits the framing's rows between the top and the box at rest.
  - k is never below the share floor: 0.55 for a phone in portrait, 0.5 elsewhere.
  - It crops the sides and the floor first. His head stays between the top corner icons.
  - The box's resting height is estimated from the CSS: 7.25rem plus 3 lines plus the fine print. It was measured in WebKit at 216 px on iPhone 15 and 238 px at 1440x900.
- **Measured share** of the visible height, Cap's head top (row 13) to the desk top (row 73), from the camera's `data-fill` on each screen:

| Screen | Share | Scale (device px per scene px) | Line shows in |
|---|---|---|---|
| iPhone 15 portrait 393x659 | **57.7%** (needs ≥ 55%) | 19 | the box |
| iPhone 15 landscape 734x343 | 58.3% | 10 | a **speech bubble** right of his head |
| Desktop 1440x900 | **60.0%** (needs ≥ 50%) | 9 | the box |
| Desktop 1280x720 | 50.0% | 6 | the box |
| iPhone 15 at 150% text | 57.7% | 19 | the box, over his chest, under his chin |
| 116 before, for comparison | iPhone 27.6%, desktop 33% | | |

### Dialogue box and speech bubble
- The box stays at the bottom whenever the box at rest (name plate plus 3 lines) fits under his chin and leaves the framing's desk rows in view.
- Otherwise the line goes to a **pixel speech bubble**: the box's colours and border, the "Cap" plate, a stepped tail at his mouth, the same font and paging. The box then keeps only the inputs and the fine print.
  - On a wide, short screen (iPhone landscape) the bubble goes **beside** his head, right first because the monitor is on the left. The box stops under the bubble, and menus go into two columns.
  - On a narrow screen where the box still fits under his chin (150% text on a phone), the box stays, over his chest.
  - Otherwise the bubble goes **above** his head.
  - With an on-screen keyboard open (touch screen, text box focused, visual viewport 120 px shorter than the window), the bubble goes over the top of the visible part, pointing down at him.
- With the camera, a page is never more than 3 lines: no fourth line for a short tail. The box at rest stays the height the camera framed for.
- The box (or the inputs) grows at most to just under his chin, so menus cover his chest and the desk but never his face. Item windows also stop under his chin.
- The paper's window rises above the desk top, so the sheet on the desk stays visible and tappable.
- "Have a decline letter?" is an envelope icon in the corner when the camera is on, so it no longer covers his hair.

### Logo placement
- **The monitor moves into frame** (a kit layout variant). The handoff's other option, the monitor partly behind his shoulder, was not used.
- Desk layout **'close'**: a smaller monitor at native x 29..46, y 53..67 (screen 30..44 x 54..63), right next to his left arm. His arm covers only its right bezel; the logo file is shown unchanged, scaled to its screen.
- The camera picks 'close' when its window is narrower than the standard monitor-to-arm span (91 native px): B and C on a phone. Desktop keeps the standard 110 desk.
- In A on a phone, even the close monitor is cut by the crop, so the logo shows only in part. In C on a phone it is cut at the left edge but still reads "CapitalOne".
- Both kit copies are identical (`diff -r` empty). npc-concept passes `tsc -b` and `vite build`; ART-GUIDE has a new "Camera and desk layouts (117)" section.

### Demo mode: taps and duration
- **Pacing**: in Demo mode each page moves on after 250 ms a word. The minimum is 1.2 s, and 2.5 s while an item window is up.
- **Stops** only at:
  - choices (the turn waits for an answer)
  - the paper, on the line's last page, until it has been opened
  - the business card
  - the first reason's Why?, on that line's last page, until Why? has been opened
- A sheet, the notebook or a Why? drawer pauses it. With read aloud on it waits for the voice. A tap still skips ahead. Outside Demo mode nothing changes.
- **Live walk** (`demo117.mjs`, WebKit iPhone 15, real backend on :5173, Priya declined branch, Demo mode and Plain English on): **`TOTAL 20 taps, 108.2s`**, exit 0, no PROBLEM line. It held at the Why? moment and at the paper (checked: same message 2 s later).

```
open, card                               3.7s  1 taps: card away
nice to meet you                         0.2s  1 taps: "Nice to meet you, Cap!"
declined                                 6.1s  1 taps: "I've been declined already"
three samples                           26.3s  3 taps: Use a sample, Use a sample, Use a sample
decline, fix, reapply, rights           30.9s  1 taps: "What can I do?"
steps, goals                             9.5s  5 taps: Skip all (steps), "The Balance Transfer card", "3 months", "Yes, I can", "No"
plan built, reasons (stops at Why?)     18.9s  0 taps:
rest of reasons                          0.2s  2 taps: Skip all (reasons), "Sum it up for me"
paper (stops)                            6.1s  2 taps: paper on the desk, close paper
plan                                     1.8s  3 taps: "Make me a plan", "3 months", Skip all (plan)
what-if £400                             4.0s  1 taps: "What if I pay £400 a month?"
TOTAL 20 taps, 108.2s
```
- `deliverables/pitch/demo-script.md` is rewritten from that run: 20 numbered taps, about 2:05 with a person tapping.
  - The Why? drawer, the typed what-if, read aloud and the full steps are optional beats, each with its tap cost.
  - Other timed runs: with Why? opened, the path is 22 taps and 107.2 s. With no Skip all on steps or reasons, it is 20 taps and 163.8 s.
- Plain English is now set before judging, not tapped during the demo.

### Files changed
`git diff --stat dd29d5f..HEAD`: 27 files without the PNGs (+994 −134), plus 38 PNGs.
- **Kit**, both copies:
  - `camera.ts` (new)
  - `scene.ts`: the close layout and `drawMonitor(layout)`
  - `engine.ts`: `setLayout`
  - `NpcScene.tsx`: the `layout` prop
  - `ExtendedScene.tsx`: the `camera` prop
  - `index.ts`
  - `app/npc-concept/ART-GUIDE.md`
- **App**:
  - `App.tsx`: the camera, bubble placement, keyboard, box height, Demo mode pacing
  - `game/GameBox.tsx`: bubble mode, `strictLines`
  - `game/DataWindow.tsx`: `maxBottom` lift, `side`
  - `game/SidePanel.tsx`: `LetterIcon`
  - `chat/Dock.tsx`: `twoCols`
  - `settings.tsx` and `sheets/SettingsSheet.tsx`: the framing setting
  - `index.css`: the bubble
  - `scripts/checks.mjs`: check 4 now taps the tray while the box is at rest, plus a new check that the tray is uncovered then
- **Other**:
  - `app/DISCLOSURES.md`: two rows, no new libraries
  - `deliverables/pitch/demo-script.md`
  - `app/frontend/screens/117-*`: 25 screens, 3 live, the options sheet
  - refreshed `screens/check-*`
  - `app/backend/data/ai-cache.json`: 116's uncommitted entry, its own commit

### Verification run and output (2026-11-08, `pnpm dev` live on :5173 with backend :8000, mock on :5176)
1. `117-framing-options.png` exists and was looked at; B is applied by default.
2. Playwright WebKit screens (`screens117.mjs`, Demo mode, framing B) are in `app/frontend/screens/117-<screen>-<moment>.png`, all looked at.
   - Screens: iPhone 15 portrait, iPhone landscape, desktop 1440x900, desktop 1280x720 and iPhone at 150% text.
   - Moments on each: a choice (the opening menu), a long line ("Have you got the letter they sent?", page 1 of 3), item windows (decline and Reason 1) and the paper on the desk.
   - **Landscape shows the speech bubble fallback** on every moment. No console errors on any screen.
3. Measurements are in the table above.
4. `node scripts/checks.mjs --base http://127.0.0.1:5176 --live-base http://127.0.0.1:5173`: **`all 20 passed`**. That is the 19 from 114/116 (live region, canvas label, keyboard-free mic, read aloud, colour modes and text size, tap-to-explain, error states) plus the new 117 tray check.
   - Before the fix, check 4 timed out: the file menu's box covered the tray.
5. `node scripts/walk.mjs`, every run exit 0 with 0 PROBLEM lines:
   - mock `--branch declined` (46 shots), `--desktop` (45), `--keyboard --reduced` (46), `--text 150` (46), `--readable` (45), `--colour contrast` (46)
   - live `--live` (46)
6. `pnpm typecheck` exit 0. `pnpm --filter backend test`: `Tests 101 passed (101)`. `pnpm --filter frontend build`: built. npc-concept `vite build`: built. `node scripts/contrast.mjs`: `all pairs pass`.

### Review
The `reviewer` agent read `dd29d5f..HEAD`. It swept `frameCamera` over 648 cases (25 viewports, dpr 1/2/3, A/B/C, text 100/125/150, Readable, panel open/closed): k is always a whole number ≥ 1 and never NaN. It also probed the mock in WebKit.
- **No defects found in:**
  - Demo mode pacing (no double advance; pauses for sheets, the panel and Why?; nothing moves with Demo off)
  - the bubble's paging and measurer
  - the live region
  - the kit copies (identical)

Findings and what was done (fixed in `cc3f1e8`):
1. *High*: at 125% or 150% text on a landscape phone (and some short desktop windows), the "above" bubble pushed Cap off the screen, and the box covered the bubble.
   - **Fixed:** before going above, the camera tries Cap at the left edge (the monitor kept) with the bubble on his right.
   - "Above" is used only if he still fits under it with the inputs below; otherwise the widest side bubble.
   - Checked at 734x343 at 125% and 150%: side bubble, Cap and the logo in view.
2. *Medium*: on the phone (B) the tray is covered while a file menu is up, a regression from 116. Check 4 now taps it earlier, while the box is at rest.
   - **Not changed in the app.** Keeping the tray clear would page the file menu: Skip would go behind More while the line says "Tap Skip", and the demo would need more taps.
   - The demo script line now says "Upload, or drop a file anywhere on the page". Listed below.
3. *Medium-low*: RESULT said pushed before the push. **Fixed:** pushed after this RESULT commit (see below).
4. *Low*: the bubble's tail could hang below a one-line bubble. **Fixed:** the tail is kept 1.75rem above the bubble's bottom edge.
5. *Low*: at 150% on the iPhone the logo was clipped, and the envelope icon touched his hair. The camera assumed one icon's width in the left corner.
   - **Fixed:** the camera keeps room for two left icons (6.5rem) and one right (3.5rem). At 150% his head now moves below the icons.
   - At 100% the placement is byte-for-byte the same, so the demo path is unchanged.
   - At 150% the monitor now sits behind the box over his chest; the box covers the desk at that size.
6. *Low*: ART-GUIDE said his arm never covers the close screen; a raised hand (the file request, the wave) does, for a moment. **Fixed** the wording.
7. *Low, not checked on a device*:
   - The side bubble now has a CSS `max-width` that keeps it clear of `env(safe-area-inset-right)` on a real landscape iPhone.
   - The keyboard-open bubble can land oddly when iOS scrolls to the field. It only matters for the optional typed what-if beat: try that beat on the phone before judging.
- **After the fixes:** `checks.mjs` `all 20 passed`, `pnpm typecheck` exit 0, kit copies identical, npc-concept `tsc -b` ok. The iPhone 15 100% camera is unchanged: same base `left: -182px; top: -72px`.

### Open issues / follow-ups
- **Landscape menus page one row at a time.** Under the side bubble a 4-choice menu shows 1 row plus More, even in two columns (More takes a cell). A landscape layout with the box beside Cap, not under him, would fix it.
- **The tray is covered while a file menu is up** on the phone (B), because the menu's box grows over the desk. Ways to hand a file over at that point:
  - the menu's Upload row
  - a drop anywhere
  - tapping the tray on the request's earlier pages, while the box is at rest (checked)
- **Not checked on a device:** the keyboard-open bubble. Playwright has no on-screen keyboard. On iPhone portrait it covers the top of the scene (his hair) while typing.
- **The demo needs three Skip all taps** to stay near 2:00. Every page at the reading pace would be about 5 minutes; the 12-step plan alone is about 110 s.
- The screens and walks used the mock frontend for speed, apart from the live demo walk, the live walk and the live checks.
- Not covered by the reviewer's fixes: an open tap-to-explain term does not pause Demo mode, and the bubble's Explain buttons come before Settings in Tab order (the bubble is a portal before the corner icons).
- Prompt deltas (follow-ups needed after the first prompt):
  - The user asked to show the options PNG path as soon as it existed. It was shown.
  - The user asked to work on `main` without switching branches.
  - The user asked to push and print the phone URL: `main` is pushed after this commit. `ipconfig getifaddr en0` gave `100.65.209.5`, not the hotspot's 172.20.10.6, so the laptop was not on the hotspot at the time.
