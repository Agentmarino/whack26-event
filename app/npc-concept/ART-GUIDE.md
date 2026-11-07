# Credit agent: art guide

The rules for the pixel-art credit agent and its stand. The code in `src/npc/` is the source of truth; this file explains it. Every state, emote and gesture is in `screens/contact-sheet.png` (iPhone 15, WebKit), at 25% in `screens/contact-sheet-small.png`, and at desktop size in `screens/contact-sheet-desktop.png`.

Tone: game look, real help. The agent is calm, warm and direct. No points, levels, jokes or mascot antics.

**The demo runs on an iPhone (Safari, portrait).** Desktop must still work, but the phone is the target. See "iPhone" below.

## Running it
```
cd app/npc-concept && pnpm install && pnpm dev --host   # http://localhost:5173 and a Network: URL for the phone
```
The phone on the same wifi opens the `Network:` URL (see `app/DEMO.md`). Tap **Debug** (top right) or press `D` for the debug panel: buttons for every state, emote and gesture, plus "Play sample conversation".

## Lifting it into 102 (frontend)
1. Copy `src/npc/` unchanged. It imports nothing from outside the folder except React.
2. Load the font once in the app: `pnpm add @fontsource/press-start-2p` and `import '@fontsource/press-start-2p/400.css'` (or any Press Start 2P source). Without it the dialogue falls back to monospace.
3. In `index.html` use `<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />` and pad the page with `env(safe-area-inset-*)` (see `src/index.css`).
4. Use it:
```tsx
import { NpcScene, DialogueBox, NATIVE_W, useIntegerScale, usePrefersReducedMotion, type NpcHandle } from './npc'
const npc = useRef<NpcHandle>(null)
const { scale } = useIntegerScale(23)            // rem kept free under the scene for the dialogue box
const reduced = usePrefersReducedMotion()
<NpcScene ref={npc} scale={scale} reducedMotion={reduced} onFileDrop={f => ...} onPaperClick={() => ...} />
<DialogueBox line={line} width={NATIVE_W * scale} speed={speed} onSpeedChange={setSpeed} reducedMotion={reduced}
  onChar={c => npc.current?.talk(c)} onLineDone={() => npc.current?.stopTalking()} chips={chips} onChip={...} onSubmit={...} />
npc.current?.setState('reading'); npc.current?.emote('concerned'); npc.current?.gesture('point-down')
```
`npc.css` (imported by `index.ts`) uses `npc-` class names only, and its class selectors win over Tailwind's preflight. `src/App.tsx` is a full example, including the sample conversation runner.

**API since 108:** `NpcHandle` and the `DialogueBox` props are unchanged. `NpcScene` gained one optional prop, `wordmarkSrc` (see Wordmark). `useIntegerScale` keeps its signature; on screens under 640 CSS px it no longer reserves a side gutter. `NpcEngine` gained `setOutput()` and `setWordmarkVisible()` (used by `NpcScene`). The canvas backing store is now device resolution, not 160x120: read pixels from a screenshot, not from `getImageData` at native coordinates.

## Style
- Classic chunky pixel-art character: a big head (26 px of a 64 px visible figure), a bold 1 px `outline` around every shape (head, hair, body, sleeves, hands, held items), flat colours with one shade each, big readable pixels and low detail.
- The face must read from far away: dark eyes (2x3) with a 1 px white highlight, eyebrows 2 px thick, a clear mouth.
- Original character: a businessman. Short neat hair with a side shine, navy suit, white shirt, red tie, a small white name badge with a red bar. No hat, coat, magnifying glass or likeness to any existing game character, mascot or real person.
- Torso only: head, shoulders, arms and hands above the counter.
- Gestures move the whole arm, never a few pixels, so each one reads in a thumbnail.
- The backdrop stays calm (navy panel, red band, wordmark) so the face carries the conversation. One ambient touch only: the stand screen, behind the `ambient` flag.

## Native sizes
| Thing | Size (px) | Where |
|---|---|---|
| Canvas | 160 x 120 (4:3) | Whole-number device scale (`useIntegerScale`); iPhone 15 portrait 7x (1120 x 840 device px), desktop 1440 x 900 4x (640 x 480 at dpr 1, 8x device at dpr 2) |
| Character box | 64 x 72 | Top-left at scene (48, 20). Visible figure head to counter: y 20 to 84 = 64 px, over half the canvas |
| Head | 24 x 26 | Box (20, 0). Hair rows 0 to 6, hairline 7, forehead 8 to 11, eyes 13 to 15, nose 16 to 17, mouth 19 to 22 |
| Eyes layer | 12 x 5 | Head (6, 12). Each eye 2 x 3 with a 1 px highlight (left eye x 1-2, right eye x 9-10) |
| Eyebrows layer | 12 x 3 | Head (6, 9). 4 wide, 2 px thick |
| Mouth layer | 8 x 4 | Head (8, 19) |
| Glasses (coach) | 22 x 5 | Head (1, 12). Thin dark frames and temples, clear lenses |
| Torso | 40 x 48, drawn in code | Box (12, 24). Shoulder joints at box (17, 31) and (46, 31). Hidden by the counter from torso y 40 |
| Sleeves | 7 px wide (outline), 5 px fill | Thick lines shoulder, elbow, hand; white cuff 4 px before the hand |
| Hands | rest 8x6, grip 7x7, open 11x9 (three spread fingers and a thumb), point down 7x10, point right 10x7, flat 9x4 | Centred on the hand point of the arm pose |
| Held items | doc 10x12, doc held 24x18, planner 13x15 | Top-left given by the pose |
| Counter | top y 84 to 99, front 101 to 119 | Full width. Hides the agent below y 84 |
| Tray (drop zone) | 30 x 8 at (20, 88) | Tap / keyboard hotspot covers it plus the arrow above |
| Calculator | 12 x 10 at (118, 88) | `tap-calc` hits it |
| Summary sheet | 22 x 7, slides from y 85 to y 92 | Ends on the front edge of the counter |
| Wordmark | pixel text 54 x 9 at (53, 3) | Its own layer (`WORDMARK` in `scene.ts`) in the top band (y 0 to 12) |
| Stand screen | 24 x 16 at (125, 29) | Ambient only |

## Layers (back to front)
1. Stand backdrop (`buildBackdrop`): navy panel, top band, red band, thin frame edges
2. Wordmark (`WORDMARK`): plain pixel text "Capital One", or the official logo file (see Wordmark)
3. Stand screen (`drawScreen`): only when `ambient` is on; bar chart and blinking cursor, still under reduced motion
4. Agent, back pass: torso, then the head group (head, eyes, glasses, eyebrows, mouth), composed together so a tilt moves them as one
5. Counter (`buildCounter`)
6. Counter props: calculator, tray, document in the tray, summary sheet
7. Drop zone highlight: marching dashes and a bouncing arrow over the tray
8. Agent, front pass: arms (outline then navy fill, white cuff), held items, hands. Arms are drawn after the counter so hands can rest on it and reach the tray and calculator
9. Thinking bubble

Dropped in 109: the hall (wall, truss, lamps, booths, floor), the passer-by, the poster, the leaflets and the plant. To change the setting (A bank counter, C market stall), replace layers 1, 3 and 5. Keep `AGENT_ORIGIN`, `COUNTER_TOP_Y`, `TRAY`, `CALC` and the paper positions, or move them together with the arm poses that touch them (`reach*`, `tap*`, `pointDownR`, slide hand).

## Wordmark
`WORDMARK` stays its own layer. If an official logo file exists at `public/brand/capital-one-logo.svg` or `.png`, `vite.config.ts` finds it at start-up (restart `pnpm dev` after adding it) and `App` passes it to `NpcScene` as `wordmarkSrc`. `NpcScene` shows the image as-is over the wordmark's area of the top band, scaled to fit (`object-fit: contain`), and hides the pixel text. If the file fails to load, the pixel text comes back. Never draw or trace the Capital One logo by hand. Add a logo row to `app/DISCLOSURES.md` when the file is added. Checked with a plain grey test file on 2026-11-07, then removed: no logo file is in the repo.

## Palette
One file: `src/npc/palette.ts`. Sprites store palette indices (one character per pixel, `.` is transparent), never colours. Recolouring is a palette change only: `npc.current.setPalette({ uniform: '#1f6b45', uniformShade: '#124a2f', uniformLight: '#3d8c63' })` turns the uniform green and leaves the stand alone (screenshot: the `palette-recolour` tile in `screens/contact-sheet.png`). The stand's navy has its own entries (`brandNavy*`, `standPanel`). `red` is shared on purpose: tie, badge bar, planner and stand bands are all the brand red. The coach glasses are `outline` (dark), not red. The Capital One hex values are approximations; swap in the official ones.

| Char | Name | Hex | Group |
|---|---|---|---|
| `k` | outline | `#15131c` | Character and props |
| `s` | skin | `#c98d63` | Character and props |
| `S` | skinShade | `#a06a46` | Character and props |
| `h` | hair | `#2a1c17` | Character and props |
| `H` | hairLight | `#4b3329` | Character and props |
| `e` | eye | `#17121c` | Character and props |
| `o` | eyeLight | `#ffffff` | Character and props |
| `m` | mouth | `#5b2a29` | Character and props |
| `n` | mouthInner | `#a9484a` | Character and props |
| `u` | uniform | `#004977` | Character and props |
| `U` | uniformShade | `#00304f` | Character and props |
| `v` | uniformLight | `#2a6f9c` | Character and props |
| `r` | red | `#d03027` | Character and props |
| `R` | redShade | `#9a1f19` | Character and props |
| `w` | shirt | `#f3f2ec` | Character and props |
| `W` | shirtShade | `#c7c9cf` | Character and props |
| `q` | ink | `#8a93a3` | Character and props |
| `p` | paper | `#fbf8ee` | Character and props |
| `P` | paperShade | `#dcd5c2` | Character and props |
| `c` | calc | `#3a3f4b` | Character and props |
| `C` | calcKey | `#aab2bf` | Character and props |
| `d` | calcScreen | `#a5cf9f` | Character and props |
| `y` | glow | `#ffd84d` | Character and props |
| `Y` | glowSoft | `#fff1a8` | Character and props |
| `a` | hallWall | `#161c28` | Scene (unused since 109, kept so indices stay stable) |
| `A` | hallWallLight | `#1e2635` | Scene (unused since 109) |
| `f` | floor | `#262c3a` | Scene (unused since 109) |
| `F` | floorLight | `#30374a` | Scene (unused since 109) |
| `t` | truss | `#3b4354` | Scene (unused since 109) |
| `l` | spot | `#ffe7a6` | Scene (unused since 109) |
| `g` | standFrame | `#c9ced8` | Scene |
| `G` | standFrameShade | `#8a909c` | Scene |
| `b` | counterTop | `#d9d2c3` | Scene |
| `B` | counterTopShade | `#b3ab9a` | Scene |
| `x` | screen | `#0d2131` | Scene |
| `X` | screenLit | `#5fc3e8` | Scene |
| `z` | silhouette | `#0d1119` | Scene (unused since 109) |
| `i` | boothA | `#2d3b35` | Scene (unused since 109) |
| `I` | boothB | `#3b2f3d` | Scene (unused since 109) |
| `j` | plant | `#3f7a4a` | Scene (unused since 109) |
| `J` | plantShade | `#2a5534` | Scene (unused since 109) |
| `K` | pot | `#7b5a44` | Scene (unused since 109) |
| `N` | standPanel | `#06375a` | Scene |
| `M` | brandNavy | `#004977` | Scene |
| `L` | brandNavyShade | `#00304f` | Scene |
| `V` | brandNavyLight | `#2a6f9c` | Scene |

UI colours (DOM, mirrored as CSS variables in `npc.css`): `uiBg #0b1d2e`, `uiBgDeep #06131f`, `uiText #f3f2ec`, `uiMuted #b9c3cf`, `uiAccent #d03027`, `uiFocus #ffd84d`, page `#10141c`.

## Animation system
- Fixed step: 60 updates per second (`STEP_MS`), driven by `requestAnimationFrame` with an accumulator. Timing does not depend on the display's refresh rate. Positions are whole pixels.
- The frame is built in a 160x120 palette-index buffer, then copied onto the visible canvas at the whole device scale with smoothing off (`setOutput`). The canvas box is a whole number of CSS px with a matching backing store, and `NpcScene` puts its top-left corner on a whole CSS px. The browser never rescales it (see iPhone).
- API: `setState(state)`, `emote(emote)`, `gesture(gesture)`, `talk(char)`, `stopTalking()`, `setTrayDoc`, `setDropHover`, `clearPaper`, `setPalette`, `reset`, `settleIn()` (ms until a one-shot state has finished), `snapshot()`.
- Emotes and gestures combine with any state. A non-neutral emote wins the eyebrows, except in `asking`, which keeps its eyebrows up unless the emote is `concerned`. `thinking` shows quizzical eyebrows with `neutral`. An emote's eyes replace the plain open eyes only; a state's own eyes (reading, listening, glances, looking at the calculator) win.
- Idle never freezes: the breathing bob (1 px) and blinks run in every state unless reduced motion is on. Glances (1 px eye shift) run in `idle`, after the wave in `greeting` and after the switch in `coach`.
- `setState()` clears any running gesture, so call `gesture()` after `setState()`, not before.

## States: frames and timings
| State | Frames | Timing |
|---|---|---|
| `idle` | arms rest on the counter (1); breathing 2; blink 3 (half, closed, half); glance 1 of left, right, down | bob every 750 ms; blink 140 ms, every 2 to 6 s; glance 0.6 to 1.1 s, every 2.5 to 6 s |
| `greeting` | left arm: raise, wave A, wave B (3); open hand by the head | raise 150 ms, wave swaps every 200 ms until 1650 ms, then rest |
| `talking` | mouth cycles small, open, wide, open, small, closed | 75 ms per mouth frame; open while a letter was printed in the last 130 ms; punctuation closes it at once |
| `listening` | eyes down; head nod 2 (0, +1 px) | two 180 ms nods every 2.2 s |
| `asking` | open palm out at chest height (1); head tilt (row shear, 2 px at the top); eyebrows raised | static pose |
| `receive-document` | left arm 6 keyframes: reach 1, reach 2, take (hand on the tray), back 2, back 1, hold | 0, 200, 450, 700, 950, 1200 ms; document leaves the tray at 600 ms; lean 3 px from 200 to 950 ms |
| `reading` | both hands hold the document at the chest (1); eyes 4 (down-left, down, down-right, half) | one line every 1.5 s (450, 450, 450, 150 ms) |
| `thinking` | right hand to chin, forearm up across the chest (1); eyes up-right; bubble dots 3 | dots step every 400 ms |
| `explaining` | right hand points down at the front-centre of the counter, where the summary lands (2: tap +1 px) | 450 ms per frame |
| `slide-paper` | flat right hand rides on the sheet as it slides to the front edge, retract (1), glow 4 | push 250 to 1000 ms, retract to 1200 ms, glow 1000 to 1600 ms (once); sheet clickable from 1000 ms |
| `coach` | left hand to the face 2, glasses on, rest, planner up | 0, 250, glasses at 450, 600, 850 ms; glasses stay on in every later state (coach mode) |

Emotes change eyebrows, eyes and mouth together:
| Emote | Eyebrows | Eyes | Mouth at rest | Talk frames (small, open, wide) |
|---|---|---|---|---|
| `neutral` | level, 2 px | open 2x3 with highlight | flat line, 4 px | small, open, wide |
| `warm` | soft arch | slightly narrowed (lower lid) | small smile, 8 px with corners up | smile-small, open, wide |
| `concerned` | inner ends up (slanted) | softer: upper lid down | slight frown | small, small, open (restrained) |
| `pleased` | raised arch | happy (closed upward arcs) | open smile with teeth | smile-small, grin, wide |

Gestures move the whole arm:
| Gesture | Arm and pose | Duration |
|---|---|---|
| `wave` | left: hand up by the head, open hand swings 7 px | 1600 ms, 2 frames at 200 ms |
| `open-palm` | left: forearm out to the side, open palm at chest height | 1800 ms |
| `point-down` | right: arm crosses the body to the tray, finger down at its right edge | 2000 ms |
| `point-side` | right: arm straight out to screen right, finger pointing; eyes right | 2000 ms |
| `chin` | right: hand to chin, forearm up across the chest; eyes up-right | 2500 ms |
| `tap-calc` | right: arm out to the calculator, finger taps it; eyes down-right; display flickers | 2000 ms, 2 frames at 220 ms |
| `none` | back to the state's arms | |

Left and right always mean screen left and right. At 25% size the hardest pair to tell apart is `neutral` vs `warm` (a few pixels of mouth and brow), then `wave` vs `open-palm` (both the left hand open, head height vs chest height). See `screens/contact-sheet-small.png`.

## How to add a state
1. Add the name to `AGENT_STATES` in `engine.ts` (TypeScript then lists every place that needs it).
2. If it needs new arm positions, add them to `ARM_POSES` (elbow point, hand point, hand sprite, `grounded` if the hand rests on the counter). Move the whole arm. If it needs a new face part, add a sprite to `EYES`, `BROWS`, `MOUTHS` or `ITEMS` in `sprites/character.ts`, using palette characters only.
3. Add a `case` in `stateFrame()` that returns the arms, items, eyes and head offsets for a given time. Use `seq(T, [[ms, pose], ...])` for keyframes and the `rm` flag for the reduced-motion end pose.
4. If it is a one-shot, add its length to `SEQUENCE_MS`, and any side effect (an item changing hands) to `applyStateEffects()`.
5. Add a sentence to `STATE_TEXT` in `describe.ts` for the canvas label.
6. Check it from the debug panel on the iPhone profile and with reduced motion on, and add it to the contact sheet.

## Do and don't
- Do keep the character original (see Style).
- Do keep every pixel on the native grid: whole-number positions, no rotation, no smoothing, no sub-pixel easing. Fake tilts with row shears and depth with layer order.
- Do outline every part with `outline` and keep sprites palette-indexed so a recolour stays a palette change. Parts drawn in code (torso, items, bubble) use palette indices too.
- Do keep new colours in `palette.ts`, appended at the end so indices stay stable; keep the stand and the suit on separate entries.
- Don't draw or trace the Capital One logo. The wordmark is pixel text or the official file.
- Don't add jokes, points, levels or celebratory effects. Concerned news stays kind: inner brows up, softer eyes, slight frown, no tears.
- Don't bake the character into one image; each layer has its own frames so expressions and gestures combine.
- Don't put dialogue text on the canvas. It is DOM text (see Accessibility).

## iPhone
- **Scale:** `useIntegerScale` picks the largest whole device scale that fits. iPhone 15 portrait is 393 CSS px at dpr 3 = 1179 device px, so 1179 / 160 gives 7x (1120 x 840 device px). Under 640 CSS px wide there is no side gutter, so the scene runs edge to edge.
- **No blur, no dropped columns:** 7x at dpr 3 is 373.333 CSS px, which layout cannot store exactly; WebKit then painted the canvas 1119 px wide and drew one native column 6 px wide. So the canvas box is rounded up to whole CSS px (374), its backing store matches it in device px (1122), the engine draws the frame at 7x inside it, and `NpcScene` nudges its top-left onto a whole CSS px. Checked: 0 of 19,200 7x7 blocks not flat.
- **Layout (portrait):** header (title and Debug button) in a slim row, the scene full width under it, the dialogue box below. Safe areas: `viewport-fit=cover` and `env(safe-area-inset-*)` padding on the page; the pinned reply row also respects the side insets.
- **Reply row:** on an iPhone 15 the first line, the chip and the scene fit on screen; the reply row starts just below the fold (scroll, or tap it to pin it above the keyboard). A sticky reply row was tried and dropped: it covered the end of long agent lines.
- **Keyboard:** when the reply box is focused on a touch screen (`pointer: coarse`), the reply row is pinned just above the on-screen keyboard. It uses `visualViewport` (offsetTop + height), fixed position, and keeps its old space so nothing above it jumps. Tapping Send keeps focus (and the keyboard) in the reply box. The reply input is 16 px on phones so Safari does not zoom in. While a text box has focus on a touch screen, `useIntegerScale` ignores window resizes, so a shrinking window cannot collapse the scene.
- **Files:** drag and drop does not exist on iPhone. The tray is a button that opens the file picker (`<input type="file" accept=".pdf,.csv,image/*">`, visually hidden rather than `display: none`, so Safari opens it from the tap). Picking a file fires `onFileDrop` exactly like a drop. Desktop keeps drag and drop anywhere on the page.
- **Touch targets** are at least 44 x 44 CSS px (Apple's 44 pt): canvas hotspots grow around their centre to 44 px, and chips, speed options, the next arrow, reply box, Send, the Debug button and (on touch screens) the debug panel buttons have a 2.75rem minimum. Nothing depends on hover: the summary sheet's hover glow is extra, and focus or tap does the same.
- **Debug on the phone:** the Debug button in the header (there is no `D` key on a phone). The panel sits below the dialogue on narrow screens and beside the scene from 64rem; opening it does not scroll the page. For the live demo use the "Start the sample conversation" chip, not the panel.
- **Not covered by emulation:** the keyboard pinning, the file picker sheet and safe-area insets were checked in Playwright's WebKit `iPhone 15` profile, which has no on-screen keyboard and no notch. Check on the real phone before the demo.

## Accessibility
The brief is Capital One's "Make credit accessible", so the agent has to work for everyone.

**Dialogue is real text.** `DialogueBox` renders each line as DOM text inside `<p aria-live="polite" aria-atomic="true">`. The live region holds one plain copy of the line for screen readers ("Agent says: ...", visually hidden), next to the visible typing layer, which is `aria-hidden` and built from one span per character. The typewriter only changes a class on characters not yet printed (`color: transparent`), never the text, so a screen reader hears each line once, in full. Characters do not jump between lines while typing, because the space for the whole line is already reserved.

**The canvas describes itself.** The canvas has `role="img"` and an `aria-label` rebuilt from the engine snapshot on every state, emote or scene change (`describe.ts`), for example: "Credit agent at the Capital One stand, reading your document line by line. Expression: concerned but kind. A summary sheet is at the front of the counter."

**Keyboard.** Every control is a native button, radio or input with a visible focus ring (3px `#ffd84d`, offset 2 to 3px). Tab order: Debug button, tray, text speed, next, quick replies, reply box, Send.
| Control | Keys |
|---|---|
| Drop zone (tray) | Tab to it (keyboard focus lights it up like a drag), Enter or Space opens the file picker; picking a file fires `onFileDrop` just like a drop |
| Summary sheet (once it is on the counter) | Tab to it, Enter or Space fires `onPaperClick` |
| Next / show whole line | Tab to the arrow button, or press Space anywhere outside a control |
| Text speed | Tab to the group, arrow keys switch 1x, 2x and Instant |
| Quick replies, reply box, Send | Tab, Enter |
| Debug panel | `D` toggles it (not while typing) or the Debug button; focus moves to its heading; every state, emote, gesture and scene button is a normal button with `aria-pressed` |

The canvas hotspots (tray and sheet) are transparent DOM buttons placed over the art, so they are in the tab order and keep the canvas purely visual. Their focus ring has a dark halo (`#15131c`) on both sides, so it stays visible (at least 3:1) on the navy stand and on the beige counter.

**Reduced motion.** With `prefers-reduced-motion: reduce` (or `reducedMotion` forced on), the following are off: the breathing bob, blinks, glances, nods, eye scanning, the screen animation, the drop-arrow bounce, the paper slide and glow, mouth flaps and the typewriter (text appears at once) and the blinking next arrow. State changes still show instantly in their end pose: the paper is on the front edge and clickable at once, the coach glasses go on at once, the thinking bubble shows three still dots, and the greeting shows a raised hand for 1.5 s.

**Contrast (WCAG 2.2 AA).** Computed with the WCAG relative-luminance formula. Unchanged in 109 (same UI colours):
| Pair | Colours | Ratio | Needed |
|---|---|---|---|
| Dialogue text, chip text | `#f3f2ec` on `#0b1d2e` | 15.23:1 | 4.5:1 |
| Speaker name, Send, chip hover | `#ffffff` on `#d03027` | 5.08:1 | 4.5:1 |
| Speed legend | `#b9c3cf` on `#0b1d2e` | 9.57:1 | 4.5:1 |
| Selected speed, selected Debug button | `#0b1d2e` on `#f3f2ec` | 15.23:1 | 4.5:1 |
| Reply text / placeholder | `#f3f2ec` / `#b9c3cf` on `#06131f` | 16.71:1 / 10.50:1 | 4.5:1 |
| Focus ring on dialogue / page | `#ffd84d` on `#0b1d2e` / `#10141c` | 12.35:1 / 13.33:1 | 3:1 |
| Hotspot focus halo on counter; ring on halo | `#15131c` on `#d9d2c3`; `#ffd84d` on `#15131c` | 12.22:1; 13.30:1 | 3:1 |
| Page title, Debug button text | `#f3f2ec` on `#10141c` | 16.44:1 | 4.5:1 |

**Text size.** All sizes are in rem. At 200% root font size the dialogue box grows and wraps, and the scene steps down to the next whole scale instead of overlapping (checked in 108; the 109 layout keeps the same rem rules).

**Checked with Playwright** (2026-11-07): WebKit `iPhone 15` profile and Chromium 1440 x 900, reduced motion, keyboard-only pass, tray tap, drag and drop, the sample conversation. Results are in handoff 109's RESULT. Screens: `screens/iphone-page.png`, `screens/iphone-reply-focused.png`, `screens/iphone-reduced-motion.png`, `screens/desktop-1440.png`.

**Not covered yet:** no real screen-reader test (VoiceOver or NVDA), only the DOM and ARIA checks above; forced colours not checked; the iPhone checks ran in emulation, not on a device.
