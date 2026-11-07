---
id: 108
title: Pixel-art NPC credit agent, first concept (character rig, animation states, stand scene)
status: done
owner: mihael
concept: lenders-eyes
created: 2026-11-07
time-budget: 60m
---

# 108: Pixel-art NPC credit agent, first concept

## Goal
A running concept page with a robust, animated 8-bit credit agent at a Capital One stand. Every state the chat will need is shown and switchable. The output is the visual guide for 102 (frontend): the character, the art rules and a reusable component.

## Context
- Product (restructured 2026-11-07): Lender's Eyes becomes a chat with a pixel-art NPC credit agent. Flow: agent asks for the credit report, then bank data, then a decline letter (optional, can be dropped any time), then personal questions (some based on what it found). It gives the "lender's eye" result one message at a time, slides a paper summary across the desk (download package), then switches to coach mode (3/6/12 month plans for a goal: credit card, car finance, mortgage, or the user's own goal)
- The serious premise stays serious: the agent is calm, warm and direct. Game look, real help. No points, levels or jokes
- Setting: B, a Capital One stand (expo booth) in their navy and red. Capital One branding is allowed by the team. Do not hand-draw their logo: use a plain pixel-font "Capital One" wordmark as a placeholder in a separate layer, to be swapped for the official asset later
- Keep the scene in layers so the setting can be changed later (A bank counter, C market stall) without touching the character
- Partner owns the final frontend (Vite + React + TS + Tailwind). Build this so his 102 can lift the component folder unchanged
- Read first: `.claude/rules/frontend.md`, `context/concepts.md` (Lender's Eyes section)

## Requirements
### Tools
- [ ] Look for a pixel-art skill for Claude Code (GitHub, skill marketplaces). Use one only if its licence allows it (MIT, Apache 2.0, CC0 or similar). Record what you found, the licence and whether you used it in the RESULT. If none fits, carry on without one
- [ ] Use Playwright MCP for every visual check
- [ ] Any art asset or font from outside: CC0 or OFL/MIT only, listed in `app/DISCLOSURES.md` with its URL and licence. Default: draw everything in code, font Press Start 2P (OFL) or similar

### Rendering approach (so the character can be dynamic)
- [ ] Native canvas 320x180, scaled by an integer to fit the window (`image-rendering: pixelated`, no smoothing, no sub-pixel positions)
- [ ] Character about 48 to 64 px tall at native size, drawn as palette-indexed frames in code (JSON or TS arrays), not as one baked image
- [ ] Character built from layers: body, head, eyes, eyebrows, mouth, arms/hands, held item. Each layer has its own frames, so expressions and gestures combine without redrawing the whole sprite
- [ ] One palette file (character, Capital One navy and red, stand, UI). Recolouring the uniform is a palette change only
- [ ] A small state machine drives the animation: `setState('talking')`, plus `emote('concerned')`, plus `gesture('point-down')`. Frame timing by `requestAnimationFrame` with a fixed step
- [ ] Idle never freezes: breathing bob (2 frames), random blink every 2 to 6 s, small glances

### States the chat will need (all must exist and be switchable)
- [ ] `idle`: breathing, blinking, glancing
- [ ] `greeting`: wave
- [ ] `talking`: mouth frames synced to the typewriter text (mouth moves only while characters are printing, stops on punctuation pauses)
- [ ] `listening`: small nod, eyes towards the user's input area
- [ ] `asking`: head tilt, eyebrows up
- [ ] `receive-document`: hand reaches to the counter drop zone, takes the file, it appears in hand
- [ ] `reading`: holds the paper, eyes scan line by line
- [ ] `thinking`: hand to chin or tapping a calculator, small "..." bubble
- [ ] `explaining`: points at a reason card or the paper
- [ ] Emotes combinable with any state: `neutral`, `warm`, `concerned` (bad news delivered kindly), `pleased` (good news)
- [ ] `slide-paper`: the agent pushes a paper sheet across the counter towards the user; the sheet ends at the front edge, glows once, and is clickable (fires a `onPaperClick` callback, no download logic here)
- [ ] `coach`: the agent switches mode visibly (for example puts on glasses or takes out a planner), so the change from checker to coach reads without words

### Scene
- [ ] Layers back to front: hall background, stand backdrop with the wordmark placeholder and red band, the agent, the counter (front, covers the agent's lower body), props on the counter, the drop zone
- [ ] Counter drop zone: highlighted when a file is dragged over the page (visual only, accept any file and fire `onFileDrop(file)`)
- [ ] Subtle life in the background: one or two slow ambient animations (a passer-by silhouette, a blinking screen). Off by a flag

### Dialogue
- [ ] Retro dialogue box under the scene: typewriter text, speaker name (placeholder "Agent", name TBD), "next" indicator, click or space to finish the line instantly, a speed setting (1x, 2x, instant)
- [ ] The box shows quick-reply chips and a text input below the text, styled to match

### Concept page
- [ ] Standalone page at `app/npc-concept/` (Vite + React + TS). Component code in `app/npc-concept/src/npc/` with no imports from outside that folder, so 102 can copy it
- [ ] A debug panel (toggle with `D`) with buttons for every state, emote and gesture, plus a "play sample conversation" button that runs: greeting, ask for report, receive-document, reading, thinking, explaining with `concerned`, slide-paper, coach
- [ ] `app/npc-concept/ART-GUIDE.md`: palette with hex values, native sizes, layer list, frame counts and timings per state, how to add a state, do and don't (original character only, no likeness to any existing game or mascot)

## Out of scope
- No backend, no real file parsing, no download package, no chat logic beyond the sample script
- Do not touch `app/frontend/` or the partner's 102 files

## Verification
1. `cd app/npc-concept && pnpm install && pnpm dev`, open `http://localhost:5173` (never 127.0.0.1) at 1440x900
2. With Playwright MCP, take a screenshot of each state and emote from the debug panel (wait one second and take it twice, the first can lag). Save to `app/npc-concept/screens/<state>.png`, and put them together in `app/npc-concept/screens/contact-sheet.png`
3. Run "play sample conversation" end to end with no console errors (`read console` in Playwright shows none)
4. Check at 1280 and 1920 widths that the scale stays a whole number and pixels stay sharp (no blur in the screenshots)
5. In the RESULT, list: the pixel-art skill you found (or none), each state with its frame count, and anything that looked wrong

---

## RESULT (filled in by Claude Code)
- Status: done (2026-11-07, branch `mihael/108`, last commit `f5de8bc` before this RESULT)
- Time taken: about 50 min of build and checks (11:26 to 12:15 GMT), over the 60 min budget once the reviewer fixes are counted. The accessibility addition was folded in from the start
- What was built:
  - Pre-step (user request): `app/` created with `app/DISCLOSURES.md` and `app/DEMO.md` copied from `templates/`, as 101 would. DEMO.md is an untouched copy; DISCLOSURES gained 108's rows only
  - `app/npc-concept/`: Vite 8 + React 19 + TS page. The reusable kit is `src/npc/`; it imports nothing from outside the folder except React
    - Native 320x180 canvas, scaled by a whole number of device pixels (`useIntegerScale`), `image-rendering: pixelated`. A palette-indexed raster draws every layer in code, with no image assets
    - Original character, 48x64 box. Separate layers: torso, head, eyes (10 frames), eyebrows (6), mouth (8), glasses, arms (23 poses: outline, sleeve, cuff), hands (7 sprites), held items (document, held document, planner)
    - `palette.ts` holds all colours. Recolouring the uniform is a palette change only (`screens/palette-recolour.png`); the stand has its own navy entries
    - Engine: fixed 60 Hz step on `requestAnimationFrame`. API: `setState`, `emote`, `gesture`, `talk(char)`, `settleIn()`, plus scene calls. Idle runs a breathing bob (2 frames), random blinks every 2 to 6 s and glances
    - Scene in layers: hall, passer-by and blinking screen (ambient, off by flag), stand backdrop with red band, wordmark placeholder layer ("Capital One" in our own pixel font, not their logo), agent back pass, counter, props, drop zone, agent front pass (arms over the counter), thinking bubble
    - Drop zone: a file dragged anywhere over the page highlights the tray; a drop fires `onFileDrop(file)`. The tray is also a keyboard button that opens a file picker. The summary sheet slides to the front edge, glows once, and fires `onPaperClick` (mouse or keyboard)
    - `DialogueBox`: real DOM text, typewriter (1x, 2x, Instant), mouth synced to printed letters and closed on punctuation pauses, speaker tab "Agent", next arrow, click or Space to finish the line, quick-reply chips, reply input
    - `DebugPanel` (`D`): every state, emote and gesture, play/stop sample, test line, tray document, drag highlight, clear paper, ambient, recolour, reset, reduced-motion override, live readout (state, emote, scale, sample status)
    - `ART-GUIDE.md`: palette with hex (generated from `palette.ts`), native sizes, layer order, frame counts and timings per state, emote and gesture, how to add a state, how to change the setting, do and don't, how 102 lifts the folder, and the Accessibility section
  - Accessibility (user addition, Capital One brief "Make credit accessible"):
    - Dialogue is DOM text in `aria-live="polite"` `aria-atomic`, with one plain screen-reader copy per line; the per-character typing layer is `aria-hidden`
    - The canvas has `role="img"` and an `aria-label` rebuilt from the engine state (`describe.ts`)
    - Every control is a native button, radio or input with a 3px `#ffd84d` focus ring. Hotspots on the canvas get a dark halo so the ring stays visible on the beige counter
    - `prefers-reduced-motion` turns off the bob, blinks, glances, nods, eye scan, ambient, slide, glow, arrow bounce, mouth flaps, typewriter and next-arrow blink. States jump to their end pose instantly
    - AA contrast is computed in ART-GUIDE. All sizes are in rem; at 200% text the layout wraps and the scene steps down a scale
- Files changed: `app/DEMO.md`, `app/DISCLOSURES.md` (new from templates, plus 108 rows), everything under `app/npc-concept/` (code, `ART-GUIDE.md`, `screens/`), and the repo-root `.gitignore` (one line: `.playwright-mcp/`). The `.gitignore` line is outside the named folders; it keeps Playwright MCP output out of git. Nothing in `app/frontend/` or `context/`
- Verification run and output:
  1. `cd app/npc-concept && pnpm install && pnpm dev`. Output: `VITE v8.3.6 ready in 667 ms ➜ Local: http://localhost:5173/`; `curl localhost:5173` → 200. Opened `http://localhost:5173` at 1440x900 in Playwright MCP. Also `npx tsc -b` (no errors), `pnpm lint` (oxlint, no warnings) and `pnpm build` (`✓ built in 63ms`)
  2. Screenshots from the debug panel, each one 1 s after the click and taken twice (the second is kept): `screens/<state>.png` for all 11 states, `emote-*.png` (4), `gesture-*.png` (6), `drop-zone-highlight.png`, `palette-recolour.png`, combined in `screens/contact-sheet.png` (23 frames)
  3. "Play sample conversation" on a fresh page load, run with Playwright MCP after the last code change: `{"sample":"done","seconds":37.583,"statesSeen":["greeting","asking","receive-document","reading","thinking","explaining","slide-paper","coach"]}`. `browser_console_messages` (level warning): `Total messages: 3 (Errors: 0, Warnings: 0)`; the 3 are Vite and React DevTools info lines. Under `reducedMotion: "reduce"` the sample also completes (15.1 s, text instant)
  4. Width check, canvas size, integer scale and a pixel test (every scale x scale block must be one flat colour):
     - 1280x800: 960x540, scale 3, 0 of 57,600 blocks blurred
     - 1440x900: 960x540, scale 3, 0 blurred
     - 1920x1080: 1280x720, scale 4, 0 blurred
     - All dpr 1, `image-rendering: pixelated`, canvas at whole-pixel left/top. Screens: `screens/width-1280.png`, `width-1440.png`, `width-1920.png`
     - The first 1280 capture showed 8,149 non-flat blocks; it was taken mid-resize (the lag noted in the frontend rules), and a clean retake was 0
  - Mouth sync: sampling the mouth region while the test line printed gave 7 distinct frames while printing, and after the line only the 2 breathing-bob positions
  - Accessibility checks with Playwright:
    - Reduced motion (`reducedMotion: "reduce"`, `screens/a11y-reduced-motion.png`): the idle canvas hash was identical for 3 s (1 distinct frame); 0 unprinted characters 50 ms after a line starts; the paper was clickable and coach mode on within 100 ms of the state change
    - Keyboard-only pass: Tab order tray → speed radio → next → chip → reply → Send, each with `solid 3px rgb(255, 216, 77)`. Arrow keys switch speed (1x → 2x → 1x). Enter on the tray opened the file picker, and the chosen file gave "Thank you. I have credit-report.pdf." with the label "...reading your document..."
    - `D` moved focus to the panel heading; Enter on `slide-paper` worked; Tab reached the summary sheet and Enter gave the summary line; Enter on the chip started the sample; Space finished a line. Screens: `a11y-keyboard-tray-focus.png`, `a11y-keyboard-paper-focus.png`, `a11y-keyboard-chip-focus.png`
    - 200% root font (32px): 0 overlapping boxes among canvas, speaker, speed, text, next, chips, input, Send and header; `scrollWidth` 1440 = viewport, so no horizontal scroll; scene steps to 2x (640 px). Screen: `a11y-text-200.png`
    - Contrast (WCAG formula): dialogue text 15.23:1, white on red 5.08:1, muted 9.57:1, placeholder 10.50:1. The focus ring on the beige counter failed at 1.09:1, so the dark halo was added (12.22:1)
  - `reviewer` agent on the diff: no blockers and every requirement met; 12 findings
    - Fixed and re-verified in the browser:
      1. A sample chip ("Here it is") stopped the sample; it now advances it
      2. Space after a mouse click on Play restarted the sample
      3. The tray highlight stuck on after click-to-upload
      4. The typewriter retyped a finished line after a speed change
      5. The hover glow could stick
      6. A held document floated during gestures
      7. `asking` lost its raised eyebrows under emotes
      8. `explaining` pointed at the calculator; it now points at the front-centre of the counter
      9. Per-character spans for screen readers
      10. Overlapping file drops
      11. The ART-GUIDE glance wording and the gesture-after-setState note
      12. `data-sample` on stop
    - Re-check after the fixes: `{"activeAfterClick":"BODY","unprintedAfterSpace":0,"sampleAfterChip":"running","sampleAfterStop":"stopped","unprintedAfterSwitchBack":0,"sr":{"live":"polite","typingHidden":true},"errors":[]}`. After a mouse-click upload the label no longer says "tray is highlighted"; keyboard focus still does
  - States and frame counts:

    | State | Frames |
    |---|---|
    | `idle` | arm 1, breathing 2, blink 3, glance 3 |
    | `greeting` | 3 (raise, wave A, wave B) |
    | `talking` | 3 mouth (talk A, talk B, rest) per emote |
    | `listening` | nod 2, eyes down |
    | `asking` | 1 pose plus tilt |
    | `receive-document` | 6 keyframes |
    | `reading` | 1 pose, 4 eye frames |
    | `thinking` | 1 pose, 3 bubble frames |
    | `explaining` | 2 |
    | `slide-paper` | 12 push positions, retract 1, glow 4 |
    | `coach` | 5 keyframes |
    | emotes | 4, each with eyebrows, rest mouth and a talk pair |
    | gestures | 6, each 1 or 2 frames |

    Timings are in ART-GUIDE.md
- Pixel-art skill: searched GitHub and skill indexes. Found 3, all MIT, none used:
  - sprite-forge (tdimino/claude-code-minoan): built around paid generative image providers and baked sprite sheets, and the handoff wants frames drawn in code
  - pixel-art (wanshuiyin/Auto-claude-code-research-in-sleep, ARIS): makes SVG illustrations for READMEs, not runtime sprites
  - pixel-art-sprites (AbsolutelySkilled): repo is MIT, but the indexed `skills/pixel-art-sprites/SKILL.md` path returns 404 in the repo today
  - Recorded in DISCLOSURES
- Follow-ups needed after the first prompt (prompt deltas):
  1. "app/ does not exist yet: create app/DISCLOSURES.md and app/DEMO.md from templates/ first, as 101 would." The handoff assumed 101 had run
  2. Accessibility addition, sent mid-task: "brief is Capital One 'Make credit accessible': the dialogue box must be real DOM text, not drawn on the canvas, inside an aria-live="polite" region. The canvas gets an aria-label that describes the agent's current state. Every control (debug panel, chips, speed setting, drop zone) works by keyboard with a visible focus ring. prefers-reduced-motion turns off idle bobbing, sliding and the typewriter, but state changes still show instantly. Text in the dialogue box meets WCAG AA contrast, and font size can be raised to 200% without overlap. Add an Accessibility section to ART-GUIDE.md and check it with Playwright (reducedMotion: "reduce" screenshot, keyboard-only pass)." Fold both into the template for future UI handoffs
- Open issues / follow-ups:
  - **101 merge order:** 101 says "Create `app/`. Copy templates". When 108 is merged first, 101 must edit the existing `app/DISCLOSURES.md` and `app/DEMO.md` instead of copying again. A 101 branch cut before this merge will hit an add/add conflict on both files: keep 108's rows and add 101's
  - **Not tested:** no real screen reader (VoiceOver or NVDA), only DOM and ARIA checks; forced colours / Windows High Contrast; dpr 2 screens (the scale code handles device pixels, but all checks ran at dpr 1)
  - **Character size:** the character is small in a 320x180 scene (the head is 20x22 native). Expressions read at 3x and 4x but are subtle at 2x (200% text). If 102 wants more face, consider a close-up crop or a bigger native character; 48 to 64 px is the handoff's limit
  - **Design process:** the handoff fixed the visual direction, so no `design-options` round and no `/impeccable` pass were run on this concept page. Partner's 102 is the place for Impeccable
  - **Placeholders:** the Capital One hex values are approximations, and the wordmark is a placeholder. Swap in the official values and asset; the agent's name is still TBD ("Agent")
  - **Known edge:** with Instant speed (or reduced motion), a line that started while instant and is then switched to 1x stays printed (fixed). A line already typing at 1x when Instant is picked jumps to the end, as intended
  - **Concept page only:** free-text replies outside the sample just echo "Noted" (chat logic is out of scope)
