# Credit agent: art guide

The rules for the pixel-art credit agent and its stand. The code in `src/npc/` is the source of truth; this file explains it. Screenshots of every state are in `screens/` and `screens/contact-sheet.png`.

Tone: game look, real help. The agent is calm, warm and direct. No points, levels, jokes or mascot antics.

## Running it
```
cd app/npc-concept && pnpm install && pnpm dev   # http://localhost:5173
```
Press `D` for the debug panel: buttons for every state, emote and gesture, plus "Play sample conversation".

## Lifting it into 102 (frontend)
1. Copy `src/npc/` unchanged. It imports nothing from outside the folder except React.
2. Load the font once in the app: `pnpm add @fontsource/press-start-2p` and `import '@fontsource/press-start-2p/400.css'` (or any Press Start 2P source). Without it the dialogue falls back to monospace.
3. Use it:
```tsx
import { NpcScene, DialogueBox, useIntegerScale, usePrefersReducedMotion, type NpcHandle } from './npc'
const npc = useRef<NpcHandle>(null)
const { scale } = useIntegerScale(16)            // rem kept free under the scene for the dialogue box
const reduced = usePrefersReducedMotion()
<NpcScene ref={npc} scale={scale} reducedMotion={reduced} onFileDrop={f => ...} onPaperClick={() => ...} />
<DialogueBox line={line} width={320 * scale} speed={speed} onSpeedChange={setSpeed} reducedMotion={reduced}
  onChar={c => npc.current?.talk(c)} onLineDone={() => npc.current?.stopTalking()} chips={chips} onChip={...} onSubmit={...} />
npc.current?.setState('reading'); npc.current?.emote('concerned'); npc.current?.gesture('point-down')
```
`npc.css` (imported by `index.ts`) uses `npc-` class names only, and its class selectors win over Tailwind's preflight. `src/App.tsx` is a full example, including the sample conversation runner.

## Native sizes
| Thing | Size (px) | Where |
|---|---|---|
| Canvas | 320 x 180 | Scaled by a whole number of device pixels (`useIntegerScale`), `image-rendering: pixelated`, no smoothing |
| Character box | 48 x 64 | Top-left at scene (136, 50). Feet at y 114, hidden by the counter |
| Head | 20 x 22 | Box (14, 0) |
| Eyes layer | 12 x 5 | Head (4, 12) |
| Eyebrows layer | 12 x 3 | Head (4, 9) |
| Mouth layer | 6 x 3 | Head (7, 17) |
| Glasses (coach) | 14 x 5 | Head (3, 12) |
| Torso | 28 x 43 | Box (10, 21). Shoulders at box (14, 27) and (33, 27) |
| Hands | 5x4 rest, 5x5 grip, 6x6 open, 5x7 point down, 7x5 point right, 6x3 flat | Centred on the hand point of the arm pose |
| Held items | doc 8x10, doc held 14x16, planner 10x10 | Top-left given by the pose |
| Counter | top y 100 to 117, front 118 to 158 | Hides the agent below y 100 |
| Tray (drop zone) | 24 x 8 at (114, 103) | Keyboard hotspot covers it plus the arrow above |
| Summary sheet | 16 x 5, slides from y 101 to y 112 | Ends on the front edge of the counter |
| Wordmark placeholder | 54 x 9 at (133, 20) | Its own layer (`WORDMARK` in `scene.ts`) |

At 1440 x 900 the scale is 3 (960 x 540), at 1920 x 1080 it is 4 (1280 x 720), at 1280 x 800 it is 3.

## Layers (back to front)
1. Hall background (`buildHall`): wall, truss, lamps, far booths, floor
2. Ambient: passer-by silhouette walking behind the stand (off with `ambient={false}` and in reduced motion)
3. Stand backdrop (`buildBackdrop`): frame, navy panel, red band, card poster, screen bezel
4. Wordmark placeholder (`WORDMARK`): plain pixel text "Capital One", not their logo. Swap the sprite for the official asset
5. Stand screen (`drawScreen`): bar chart and blinking cursor (still when ambient is off)
6. Agent, back pass: torso, then the head group (head, eyes, glasses, eyebrows, mouth), composed together so a tilt moves them as one
7. Counter (`buildCounter`)
8. Counter props: leaflets and plant (static), calculator, tray, document in the tray, summary sheet
9. Drop zone highlight: marching dashes and a bouncing arrow over the tray
10. Agent, front pass: arms (outline then fill, white cuff), held items, hands. Arms are drawn after the counter so hands can rest on it and reach the tray
11. Thinking bubble

To change the setting (A bank counter, C market stall), replace layers 1, 3, 4, 5, 7 and the static props. Keep `AGENT_ORIGIN`, `COUNTER_TOP_Y`, `TRAY`, `CALC` and the paper positions, or move them together with the arm poses that touch them (`reach*`, `tap*`, slide hand).

## Palette
One file: `src/npc/palette.ts`. Sprites store palette indices (one character per pixel, `.` is transparent), never colours. Recolouring is a palette change only: `npc.current.setPalette({ uniform: '#1f6b45', uniformShade: '#124a2f', uniformLight: '#3d8c63' })` turns the uniform green and leaves the stand alone (screenshot: `screens/palette-recolour.png`). The stand's navy has its own entries (`brandNavy*`, `standPanel`). `red` is shared on purpose: lanyard, glasses, planner and stand band are all the brand red. The Capital One hex values are approximations; swap in the official ones.

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
| `a` | hallWall | `#161c28` | Scene |
| `A` | hallWallLight | `#1e2635` | Scene |
| `f` | floor | `#262c3a` | Scene |
| `F` | floorLight | `#30374a` | Scene |
| `t` | truss | `#3b4354` | Scene |
| `l` | spot | `#ffe7a6` | Scene |
| `g` | standFrame | `#c9ced8` | Scene |
| `G` | standFrameShade | `#8a909c` | Scene |
| `b` | counterTop | `#d9d2c3` | Scene |
| `B` | counterTopShade | `#b3ab9a` | Scene |
| `x` | screen | `#0d2131` | Scene |
| `X` | screenLit | `#5fc3e8` | Scene |
| `z` | silhouette | `#0d1119` | Scene |
| `i` | boothA | `#2d3b35` | Scene |
| `I` | boothB | `#3b2f3d` | Scene |
| `j` | plant | `#3f7a4a` | Scene |
| `J` | plantShade | `#2a5534` | Scene |
| `K` | pot | `#7b5a44` | Scene |
| `N` | standPanel | `#06375a` | Scene |
| `M` | brandNavy | `#004977` | Scene |
| `L` | brandNavyShade | `#00304f` | Scene |
| `V` | brandNavyLight | `#2a6f9c` | Scene |

UI colours (DOM, mirrored as CSS variables in `npc.css`): `uiBg #0b1d2e`, `uiBgDeep #06131f`, `uiText #f3f2ec`, `uiMuted #b9c3cf`, `uiAccent #d03027`, `uiFocus #ffd84d`, page `#10141c`.

## Animation system
- Fixed step: 60 updates per second (`STEP_MS`), driven by `requestAnimationFrame` with an accumulator. Timing does not depend on the display's refresh rate. Positions are whole pixels.
- API: `setState(state)`, `emote(emote)`, `gesture(gesture)`, `talk(char)`, `stopTalking()`, `setTrayDoc`, `setDropHover`, `clearPaper`, `setPalette`, `reset`, `settleIn()` (ms until a one-shot state has finished), `snapshot()`.
- Emotes and gestures combine with any state. A non-neutral emote wins the eyebrows, except in `asking`, which keeps its eyebrows up unless the emote is `concerned` (whose eyebrows are already raised at the inner ends). `thinking` shows quizzical eyebrows with `neutral`.
- Idle never freezes: the breathing bob and blinks run in every state unless reduced motion is on. Glances run in `idle`, after the wave in `greeting` and after the switch in `coach` (other states fix the eyes).
- `setState()` clears any running gesture, so call `gesture()` after `setState()`, not before.

## States: frames and timings
| State | Frames | Timing |
|---|---|---|
| `idle` | arms rest (1); breathing 2; blink 3 (half, closed, half); glance 1 of left, right, down | bob every 750 ms; blink 140 ms, every 2 to 6 s; glance 0.6 to 1.1 s, every 2.5 to 6 s |
| `greeting` | arm: raise, wave A, wave B (3) | raise 150 ms, wave swaps every 200 ms until 1650 ms, then rest |
| `talking` | mouth: talk A, talk B, rest (cycle A, B, A, rest) | 80 ms per mouth frame; open while a letter was printed in the last 130 ms; punctuation closes it at once |
| `listening` | eyes down; head nod 2 (0, +1 px) | two 180 ms nods every 2.2 s |
| `asking` | open palm (1); head tilt (row shear, 2 px at the top); eyebrows raised | static pose |
| `receive-document` | arm 6 keyframes: reach 1, reach 2, take, back 2, back 1, hold | 0, 200, 450, 700, 950, 1200 ms; document leaves the tray at 600 ms; lean 2 px from 200 to 950 ms |
| `reading` | both hands hold the document (1); eyes 4 (down-left, down, down-right, half) | one line every 1.5 s (450, 450, 450, 150 ms) |
| `thinking` | hand to chin (1); eyes up-right; bubble dots 3 | dots step every 400 ms |
| `explaining` | point down at the front-centre of the counter, where the summary lands and towards the chat's reason cards below (2: tap +1 px) | 450 ms per frame |
| `slide-paper` | push hand follows the sheet (12 positions), retract (1), glow 4 | push 250 to 1000 ms, retract to 1200 ms, glow 1000 to 1600 ms (once); sheet clickable from 1000 ms |
| `coach` | hand to face 2, glasses on, rest, planner up | 0, 250, glasses at 450, 600, 850 ms; glasses stay on in every later state (coach mode) |

| Emote | Eyebrows | Mouth at rest | Talk mouths |
|---|---|---|---|
| `neutral` | state default | small line | talk A, talk B |
| `warm` | soft arch | smile | talk A, smile-talk |
| `concerned` | inner ends up | small frown | small O, talk A |
| `pleased` | raised arch | wide smile | smile-talk, talk B |

| Gesture | Arm | Duration |
|---|---|---|
| `wave` | left (screen) | 1600 ms, 2 frames at 200 ms |
| `open-palm` | left | 1800 ms |
| `point-down` | right | 2000 ms |
| `point-side` | right, eyes right | 2000 ms |
| `chin` | right, eyes up-right | 2500 ms |
| `tap-calc` | right, eyes down-right, calculator display flickers | 2000 ms, 2 frames at 220 ms |
| `none` | back to the state's arms | |

Left and right always mean screen left and right.

## How to add a state
1. Add the name to `AGENT_STATES` in `engine.ts` (TypeScript then lists every place that needs it).
2. If it needs new arm positions, add them to `ARM_POSES` (elbow point, hand point, hand sprite, `grounded` if the hand rests on the counter). If it needs a new face part, add a sprite to `EYES`, `BROWS`, `MOUTHS` or `ITEMS` in `sprites/character.ts`, using palette characters only.
3. Add a `case` in `stateFrame()` that returns the arms, items, eyes and head offsets for a given time. Use `seq(T, [[ms, pose], ...])` for keyframes and the `rm` flag for the reduced-motion end pose.
4. If it is a one-shot, add its length to `SEQUENCE_MS`, and any side effect (an item changing hands) to `applyStateEffects()`.
5. Add a sentence to `STATE_TEXT` in `describe.ts` for the canvas label.
6. Check it from the debug panel at 1x and with reduced motion on, and take a screenshot.

## Do and don't
- Do keep the character original: short side-swept hair, navy blazer, red lanyard with a staff badge. No likeness to any existing game character, mascot or real person.
- Do keep every pixel on the native grid: whole-number positions, no rotation, no smoothing, no sub-pixel easing. Fake tilts with row shears and depth with layer order.
- Do outline every part with `outline` and keep sprites palette-indexed so a recolour stays a palette change.
- Do keep new colours in `palette.ts`; keep the stand and the uniform on separate entries.
- Don't draw the Capital One logo. The wordmark is a placeholder in its own layer.
- Don't add jokes, points, levels or celebratory effects. Concerned news stays kind: brows up at the inner ends, small frown, no tears.
- Don't bake the character into one image; each layer has its own frames so expressions and gestures combine.
- Don't put dialogue text on the canvas. It is DOM text (see Accessibility).

## Accessibility
The brief is Capital One's "Make credit accessible", so the agent has to work for everyone.

**Dialogue is real text.** `DialogueBox` renders each line as DOM text inside `<p aria-live="polite" aria-atomic="true">`. The live region holds one plain copy of the line for screen readers ("Agent says: ...", visually hidden), next to the visible typing layer, which is `aria-hidden` and built from one span per character. The typewriter only changes a class on characters not yet printed (`color: transparent`), never the text, so a screen reader hears each line once, in full, and reads it as normal text afterwards. Characters do not jump between lines while typing, because the space for the whole line is already reserved.

**The canvas describes itself.** The canvas has `role="img"` and an `aria-label` rebuilt from the engine snapshot on every state, emote or scene change (`describe.ts`), for example: "Credit agent at the Capital One stand, reading your document line by line. Expression: concerned but kind. A summary sheet is at the front of the counter."

**Keyboard.** Every control is a native button, radio or input with a visible focus ring (3px `#ffd84d`, offset 2 to 3px):
| Control | Keys |
|---|---|
| Drop zone (tray) | Tab to it (keyboard focus lights it up like a drag), Enter or Space opens the file picker; picking a file fires `onFileDrop` just like a drop |
| Summary sheet (once it is on the counter) | Tab to it, Enter or Space fires `onPaperClick` |
| Next / show whole line | Tab to the arrow button, or press Space anywhere outside a control |
| Text speed | Tab to the group, arrow keys switch 1x, 2x and Instant |
| Quick replies, reply box, Send | Tab, Enter |
| Debug panel | `D` toggles it (not while typing) and moves focus to its heading; every state, emote, gesture and scene button is a normal button with `aria-pressed` |

The canvas hotspots (tray and sheet) are transparent DOM buttons placed over the art, so they are in the tab order and keep the canvas purely visual. Their focus ring has a dark halo (`#15131c`) on both sides, so it stays visible (at least 3:1) on the navy stand and on the beige counter.

**Reduced motion.** With `prefers-reduced-motion: reduce` (or `reducedMotion` forced on), the following are off: the breathing bob, blinks, glances, nods, eye scanning, the passer-by, the screen animation, the drop-arrow bounce, the paper slide and glow, mouth flaps and the typewriter (text appears at once) and the blinking next arrow. State changes still show instantly in their end pose: the paper is on the front edge and clickable at once, the coach glasses go on at once, the thinking bubble shows three still dots, and the greeting shows a raised hand for 1.5 s.

**Contrast (WCAG 2.2 AA).** Computed with the WCAG relative-luminance formula:
| Pair | Colours | Ratio | Needed |
|---|---|---|---|
| Dialogue text, chip text | `#f3f2ec` on `#0b1d2e` | 15.23:1 | 4.5:1 |
| Speaker name, Send, chip hover | `#ffffff` on `#d03027` | 5.08:1 | 4.5:1 |
| Speed legend | `#b9c3cf` on `#0b1d2e` | 9.57:1 | 4.5:1 |
| Selected speed | `#0b1d2e` on `#f3f2ec` | 15.23:1 | 4.5:1 |
| Reply text / placeholder | `#f3f2ec` / `#b9c3cf` on `#06131f` | 16.71:1 / 10.50:1 | 4.5:1 |
| Focus ring on dialogue / page | `#ffd84d` on `#0b1d2e` / `#10141c` | 12.35:1 / 13.33:1 | 3:1 |
| Hotspot focus halo on counter; ring on halo | `#15131c` on `#d9d2c3`; `#ffd84d` on `#15131c` | 12.22:1; 13.30:1 | 3:1 |
| Page hint | `#b9c3cf` on `#10141c` | 10.33:1 | 4.5:1 |

**Text size.** All sizes are in rem. At 200% root font size the dialogue box grows and wraps, chips and the reply row wrap, and the scene steps down to the next whole scale (2x at 1440 x 900) instead of overlapping; the page scrolls vertically, with no horizontal scroll. Checked by bounding boxes: no overlaps.

**Checked with Playwright** (2026-11-07, Chromium, 1440 x 900): `screens/a11y-reduced-motion.png` (`reducedMotion: "reduce"`), `screens/a11y-keyboard-tray-focus.png`, `a11y-keyboard-paper-focus.png`, `a11y-keyboard-chip-focus.png` (keyboard-only pass), `screens/a11y-text-200.png`. Results are in handoff 108's RESULT.

**Not covered yet:** no real screen-reader test (VoiceOver or NVDA), only the DOM and ARIA checks above. Windows High Contrast / forced colours not checked.
