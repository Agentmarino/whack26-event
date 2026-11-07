---
id: 109
title: NPC art pass, camera in, chunky businessman, iPhone first
status: done
owner: mihael
concept: lenders-eyes
created: 2026-11-07
time-budget: 60m
---

# 109: NPC art pass, camera in, chunky businessman, iPhone first

## Goal
The agent from 108, redrawn and reframed so his face carries the conversation on an iPhone screen. Same component API, so nothing downstream changes.

## Context
- 108 is merged. Read `app/npc-concept/ART-GUIDE.md` and `src/npc/` first
- Review of 108 (Cowork, 2026-11-07): the rig works, but the agent is 48x64 in a 320x180 scene, about a seventh of the frame. The four emotes look the same at normal size, the coach glasses read as a red smudge, gestures differ by a few pixels, and the busy hall pulls the eye away
- **The demo runs on an iPhone (Safari, portrait).** Desktop must still work, but the phone is the target
- **Style direction (user):** classic chunky pixel-art character, like a stock "pixel detective" sprite: a big head (about a third of the visible figure), a bold 1 px dark outline around every shape, flat colours with one shade each, a simple face that reads from far away (dark eyes with a white highlight, thick eyebrows, a clear mouth). Low detail, big readable pixels. Original character: a businessman, not a detective. No hat, no trench coat, no magnifying glass
- Torso only is fine: head, shoulders, arms and hands above the counter
- Brand: Capital One navy and red stay. The wordmark stays its own layer (see Requirements)

## Requirements
### Camera and canvas
- [ ] Native canvas 160x120 (4:3, suits a portrait phone). Whole-number scaling using `devicePixelRatio` (for example an iPhone 15 at 1179 device px wide gets 7x). No blur
- [ ] Camera in on the stand: top band of the backdrop with the wordmark layer, the agent in the middle, the counter at the bottom with the tray and the paper. Drop the hall, booths, truss and lamps (a thin edge of backdrop is fine). Keep one small ambient touch (the stand screen) behind a flag
- [ ] The agent's visible figure (head to counter) is at least half the canvas height. Head about 24 to 28 px tall

### The agent (redraw, same layer system)
- [ ] Businessman: short neat hair, navy suit (`uniform` palette entries), white shirt, red tie, a small Capital One name badge. Bold 1 px outline (`outline` colour) around head, hair, body, arms, hands, held items
- [ ] Face: eyes at least 2x2 with a 1 px highlight, eyebrows 1 to 2 px thick, mouth with 4 talking frames (closed, small, open, wide)
- [ ] Emotes must be told apart at a glance, by eyebrows, eyes and mouth together: `neutral` (level brows, flat mouth), `warm` (soft brows, small smile), `concerned` (inner brows up, slight frown, eyes a little softer), `pleased` (brows up, open smile, happy eyes)
- [ ] Gestures move the whole arm, not a few pixels: `wave` (hand up by the head), `point-down` (arm across to the tray), `point-side`, `chin`, `tap-calc`, `open-palm`. Each should be clear in a thumbnail
- [ ] Coach mode: thin dark-framed reading glasses (not red) plus the planner. Readable at a glance
- [ ] Keep the layers, palette indices and state machine from 108. Keep `NpcHandle` (`setState`, `emote`, `gesture`, `talk`, `stopTalking`, `setPalette`) and the `NpcScene` and `DialogueBox` props unchanged. If a prop must change, list it in the RESULT
- [ ] Idle stays alive: breathing, blinks, glances, all scaled to the new size

### Wordmark
- [ ] Keep `WORDMARK` as its own layer. If an official logo file exists at `app/npc-concept/public/brand/capital-one-logo.svg` or `.png`, draw that image in the layer area instead of the text, scaled to fit, with no redrawing or tracing of it. Otherwise keep the plain pixel text "Capital One". Do not draw or trace the Capital One logo by hand
- [ ] Add a line to `app/DISCLOSURES.md`: "Capital One name and logo used with the sponsor's permission for their challenge" (logo row only once the file is added)

### iPhone
- [ ] Drag and drop does not exist on iPhone: the tray is a tap target that opens the file picker (`<input type="file" accept=".pdf,.csv,image/*">`). Keep drag and drop on desktop
- [ ] Touch targets at least 44x44 pt. Respect safe areas (`env(safe-area-inset-*)`). No hover-only controls
- [ ] Layout in portrait: scene full width at the top, dialogue box below, the input area pinned above the keyboard when the text box is focused
- [ ] `pnpm dev --host` so the phone on the same wifi can open it. Note the URL in `app/DEMO.md`

### Docs
- [ ] Update `ART-GUIDE.md`: new sizes, the style rules above, the iPhone notes

## Out of scope
- No chat logic, no backend, no `app/frontend/`
- No talking portrait (no room on the phone)

## Verification
1. Playwright MCP with the WebKit `iPhone 15` device (portrait): screenshot every state, emote and gesture from the debug panel (wait a second and take it twice). New contact sheet at `app/npc-concept/screens/contact-sheet.png`
2. Make a second contact sheet with every frame at 25% size (`contact-sheet-small.png`). The four emotes and six gestures must still be told apart. Say in the RESULT which ones are hardest to tell apart
3. Same run at desktop 1440x900: whole-number scale, no blur
4. Reduced motion and keyboard-only checks from 108 still pass
5. Tap the tray in iPhone emulation: the file picker opens (or the input's click fires); drag and drop still works on desktop
6. "Play sample conversation" runs end to end on the iPhone profile with no console errors

---

## RESULT (filled in by Claude Code)
- Status: done (2026-11-07, branch `mihael/109`, last code commit `25354a2`)
- Time taken: about 46 min, 12:21 to 13:07 GMT (status flip to reviewer fixes), inside the 60 min budget
- What was built (all in `app/npc-concept/`):
  - **Camera in:**
    - Native canvas 160x120 (4:3).
    - The close-up stand has a navy backdrop, a top band with the wordmark layer and a red band. The agent is in the middle and a full-width counter is at the bottom, with the tray (left), calculator (right) and summary sheet (centre).
    - Hall, booths, truss, lamps, passer-by, poster, leaflets and plant are gone. The stand screen is the one ambient touch, drawn only when `ambient` is on.
    - The visible figure runs from y 20 to 84 (64 px of 120). The head is 24x26.
  - **Chunky businessman (same layer system, palette indices and state machine):**
    - Big head with a bold 1 px `outline` on every shape. Short neat hair with a side shine, navy suit drawn in code from palette indices, white shirt V, red tie, and a white name badge with a red bar.
    - Eyes are 2x3 with a 1 px highlight. Brows are 2 px thick.
    - Emotes change brows, eyes and mouth together. New emote eyes: warm (narrowed), soft (concerned) and happy arcs (pleased).
    - The mouth has 4 talking frames: closed (the rest mouth), small, open, wide. They cycle small, open, wide, open, small, closed at 75 ms.
    - Sleeves are 7 px wide with an outline and white cuffs. The open hand now shows three spread fingers and a thumb.
    - Every gesture moves the whole arm:
      - wave: hand up by the head
      - point-down: arm across the body to the tray
      - point-side: arm straight out
      - chin: forearm up across the chest
      - tap-calc: arm out to the calculator
      - open-palm: forearm out at chest height
    - Coach mode: thin dark reading glasses plus the red planner.
    - Idle keeps breathing, blinks and glances.
  - **Crisp on the iPhone:**
    - `useIntegerScale` has no side gutter under 640 CSS px, giving 7x on an iPhone 15.
    - The canvas renders at device resolution inside a whole-CSS-px box with a matching backing store, and `NpcScene` snaps its top-left onto a whole CSS px.
    - Why: WebKit painted the 373.33 CSS px 7x canvas 1119 px wide and drew one native column 6 px wide. Found by the pixel test and fixed.
  - **iPhone:**
    - `viewport-fit=cover` with safe-area padding.
    - Portrait layout: slim header (title and a Debug button), scene edge to edge, dialogue below.
    - Every control is at least 44x44 CSS px. Canvas hotspots grow around their centre; chips, speed options, next, reply, Send, Debug and the debug buttons on touch screens use a 2.75rem minimum.
    - The tray opens `<input type="file" accept=".pdf,.csv,image/*">`. It is visually hidden, not `hidden`, so Safari opens it from the tap. Drag and drop is kept on desktop.
    - The reply row pins above the on-screen keyboard while the reply box is focused, using `visualViewport`.
    - Send keeps focus. The reply input is 16 px, so Safari does not zoom.
    - No rescale happens while typing on touch, and the debug panel opens without scrolling.
  - **Wordmark:**
    - `WORDMARK` is still its own layer, plain pixel text, because no logo file exists.
    - If `public/brand/capital-one-logo.svg` or `.png` is added, `vite.config.ts` detects it and `NpcScene` shows that image over the band, scaled to fit, hiding the pixel text.
    - Tested with a plain grey dummy file, then removed.
  - **Desktop:** 1440x900 runs at 4x (640x480) with the whole page, reply row included, above the fold.
  - **Docs:**
    - `ART-GUIDE.md` rewritten: style rules, new sizes, layers, emote, gesture and talk tables, wordmark, and an iPhone section that says what emulation cannot cover.
    - `app/DEMO.md`: phone URL and the `pnpm dev --host` steps.
    - `app/DISCLOSURES.md`: Capital One name row with the handoff's wording; the logo row waits for the file. Playwright library, WebKit and Pillow rows added. Art redraw row added.
- Files changed:
  - `app/npc-concept/`: `index.html`, `vite.config.ts`, `ART-GUIDE.md`, `src/App.tsx`, `src/index.css`, and `src/npc/` (`raster.ts`, `scene.ts`, `engine.ts`, `sprites/character.ts`, `NpcScene.tsx`, `DialogueBox.tsx`, `DebugPanel.tsx`, `hooks.ts`, `npc.css`).
  - `screens/`: 108's 31 screenshots deleted (they showed the old art; they are still in git history, and handoff 108's RESULT cites them). New: `contact-sheet.png`, `contact-sheet-small.png`, `contact-sheet-desktop.png`, `iphone-page.png`, `iphone-reply-focused.png`, `iphone-reduced-motion.png`, `desktop-1440.png`.
  - `app/DEMO.md`, `app/DISCLOSURES.md`.
  - Nothing in `app/frontend/`, `context/`, backend or chat logic.
- Verification run and output:
  - Tooling: `npx tsc -b`, `pnpm lint` (oxlint) and `pnpm build` (`✓ built in 72ms`) all ran clean.
  - The Playwright MCP here is Chromium-only. The WebKit `iPhone 15` checks used the Playwright library (1.56.1, WebKit 26, `devices['iPhone 15']`: 393x659, dpr 3, touch) from scripts in the session scratchpad. Desktop used Chromium 1440x900 at dpr 1.
  1. **Every state, emote and gesture on the iPhone 15 profile:**
     - Each frame was tapped from the debug panel, waited 1 s and was shot twice, keeping the second: 11 states, 4 emotes, 6 gestures, plus coach-talking, the drop zone and the recolour.
     - `screens/contact-sheet.png`: 24 frames, native pixels x3.
     - Headless WebKit runs `requestAnimationFrame` unevenly between captures, so one early run caught 3 blinks. The sheet script now flags closed eyes; the final run had only false flags (the asking tilt and the coach glasses), checked by eye.
  2. **`screens/contact-sheet-small.png`** shows every frame at 25% of the iPhone capture (280x210 per tile). The four emotes and six gestures can all be told apart:
     - Gestures differ by the whole arm silhouette.
     - pleased (happy eyes, open grin) and concerned (slanted brows, frown) are clear.
     - Hardest to tell apart: see the next field.
  3. **Desktop 1440x900, same run:** `screens/contact-sheet-desktop.png`. Whole-number scale, no blur. The pixel test checks that every k x k block is one flat colour:
     - iPhone 15: canvas at device (30, 156), 1120x840, 7x: `0 of 19200 blocks not flat`
     - Desktop 1440x900, dpr 1: 640x480, 4x: `0 of 19200 blocks not flat`
     - The reviewer also ran desktop at dpr 2: 9x device, 0 not flat
     - Before the device-resolution fix, the iPhone canvas painted 1119 px wide: `633 of 19080 blocks not flat`, with no blended colours, just one 6 px column
  4. **Reduced motion and keyboard (108's checks):**
     - With `reducedMotion: "reduce"`: `{"distinctIdleFramesOver3s": 1, "unprintedChars": 0}` on both profiles. Screen: `screens/iphone-reduced-motion.png`.
     - Keyboard-only on desktop: Tab order is Debug button, tray, speed (1x), next, chip, reply, Send. Every stop showed `solid 3px rgb(255, 216, 77)`.
     - `D` moved focus to `npc-debug-title`. Enter on `slide-paper`, then Tab to the sheet and Enter, gave "This is your summary sheet. In the full app, this is where your download package opens."
     - Change from 108: the new Debug button now comes first in the Tab order.
  5. **Tray and drag and drop:**
     - iPhone tap on the tray: `{"accept": ".pdf,.csv,image/*", "filePickerOpened": true, "multiple": false, "line": "Agent says: Thank you. I have credit-report.pdf. Let me read it."}`. The Playwright `filechooser` event fired, and setting a file fired `onFileDrop`.
     - Desktop, Tab Tab Enter on the tray: the same result.
     - Desktop drag and drop (synthetic `DragEvent` carrying a `File`): `{"highlightedWhileDragging": true, "line": "Agent says: Thank you. I have statement.csv. Let me read it."}`.
  6. **"Play sample conversation" on the iPhone profile**, started with the chip on a fresh load, after the reviewer fixes:
     - `{"result": "done", "seconds": 35.876, "statesSeen": ["greeting","asking","receive-document","reading","thinking","explaining","slide-paper","coach"], "consoleErrorsAndWarnings": []}`. The only console lines were the two Vite debug lines.
     - Desktop: done in 36.954 s, 0 errors or warnings.
     - The reviewer also ran it from the debug panel and under reduced motion (15 s): 0 errors.
  - **Other iPhone checks:**
    - Touch targets: Debug 100x44, tray hotspot 89x56, speed options 44x44, 44x44 and 104x44, chip 341x52, reply 257x44, Send 76x44. All are at least 44.
    - No horizontal scroll.
    - Focusing the reply box: `{"pinned": true, "position": "fixed", "formBottom": 659, "visualViewportBottom": 659}`. After typing and tapping Send: `{"stillFocused": true, "stillPinned": true}`, and the line came back.
    - Viewport shrunk to 393x340 while typing: the canvas stayed at 374 CSS px.
    - Opening Debug: `scrollY` stays 0.
  - **Reviewer agent:** found no blockers and confirmed every requirement met. 6 gaps:
    - Fixed:
      - Rescale while typing could collapse the scene to 1x.
      - The debug panel focus scrolled the agent out of view.
      - `Math.round` on a non-whole scale could crop the scene; it now rounds down.
      - At dpr 2, desktop scrolled about 20 px; the reserve is now 23rem.
      - A guide link pointed at a deleted screenshot.
    - Not changed: the reply row starts below the fold on an iPhone 15. A sticky row was tried, but it covered the end of long agent lines, so it was reverted. See open issues.
- Hardest emotes or gestures to tell apart:
  - Emotes: `neutral` vs `warm` at 25%, a few pixels of mouth and brow. Warm's smile was widened to 8 px to help.
  - Gestures: `wave` vs `open-palm`, both the left hand open (by the head vs at chest height).
  - Also `chin` vs the `thinking` state, which share the pose; thinking adds the bubble.
- API changes (if any):
  - `NpcHandle` and the `DialogueBox` props are unchanged.
  - Additive changes:
    - `NpcScene` has a new optional prop, `wordmarkSrc?: string`.
    - `NpcEngine` gained `setOutput(deviceScale, backingW, backingH)` and `setWordmarkVisible(on)`.
    - `useIntegerScale` keeps its signature; it drops the side gutter under 640 CSS px and ignores resizes while typing on touch.
  - Behaviour changes:
    - The canvas backing store is device resolution, so read pixels from screenshots, not from `getImageData` at native coordinates.
    - The concept page calls `useIntegerScale(23)`; it was 16.
    - New DOM hooks: `.npc-reply-slot`, `data-npc-pinned`, `data-npc-file`, `#npc-debug-panel` and a `.page-debug-toggle` button.
- Follow-ups needed after the first prompt (prompt deltas): none. The handoff ran from the first prompt with no mid-task additions.
  - Two things the next UI handoff should say up front:
    1. "The Playwright MCP is Chromium-only. For iPhone checks, use the Playwright library with WebKit and `devices['iPhone 15']`, or set the MCP to `--browser webkit --device 'iPhone 15'` before the session."
    2. "Check crispness with a pixel test (every scaled block one flat colour) on a device-scale screenshot, not by eye." Without that, the 1119 px canvas would have shipped.
- Open issues / follow-ups:
  - **Check on the real iPhone before the demo:**
    - keyboard pinning, which emulation tests without an on-screen keyboard
    - the file picker sheet from the tray
    - safe areas on a notched screen (emulation has no notch)
    - that the LAN URL works on the venue wifi (DEMO.md has a hotspot fallback)
  - **The reply row starts just below the fold on an iPhone 15** (top at 652 in a 659 px viewport). The scene, the first lines and the "Start the sample conversation" chip are on screen. Options if wanted: a 0.75rem dialogue font on phones, a shorter opening line, or collapsing the speed selector on phones.
  - **108's screenshots were deleted from `screens/`**, as they showed the old art. Handoff 108's RESULT still names them; they are in git history at `518567b`.
  - **The verification scripts live in the session scratchpad, not in the repo:** `shots.mjs`, `checks.mjs`, `sheet.py`, `pixeltest.py`. If 102 or 107 want them, add them to `app/npc-concept/scripts/` with `playwright` as a dev dependency, and disclose that.
  - **Logo:** none added. When the official file arrives:
    1. Put it at `public/brand/capital-one-logo.svg` or `.png`.
    2. Restart `pnpm dev`.
    3. Add the logo row to `app/DISCLOSURES.md`.
  - **Not covered:** no real screen-reader test; no forced colours; the 200% text check was not re-run after the 109 layout. The rem rules are unchanged, so it should still hold.
  - **Lifting into 102:** the kit is still self-contained (`src/npc/`). 102 needs the viewport meta (`viewport-fit=cover`), safe-area padding and `useIntegerScale(23)`, or a reserve that suits its layout.
