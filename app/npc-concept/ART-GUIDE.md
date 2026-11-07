# Credit agent: art guide

The rules for the pixel-art credit agent, his desk and the glass wall office behind him (since handoff 110). The code in `src/npc/` is the source of truth; this file explains it. Every state, emote and gesture is in `screens/contact-sheet.png` (iPhone 15, WebKit), at 25% in `screens/contact-sheet-small.png`, and at desktop size in `screens/contact-sheet-desktop.png`. The facial hair options are in `screens/options.png`, the background variants in `screens/backgrounds.png`.

Tone: game look, real help. The agent is calm, warm and direct. No points, levels, jokes or mascot antics.

**The demo runs on an iPhone (Safari, portrait).** Desktop must still work, but the phone is the target. See "iPhone" below.

## Running it
```
cd app/npc-concept && pnpm install && pnpm dev --host   # http://localhost:5173 and a Network: URL for the phone
```
The phone on the same wifi opens the `Network:` URL (see `app/DEMO.md`). Tap **Debug** (top right) or press `D` for the debug panel: buttons for every state, emote and gesture, the facial hair and background switches, plus "Play sample conversation".

## Lifting it into 102 (frontend)
1. Copy `src/npc/` unchanged. It imports nothing from outside the folder except React. Copy `public/brand/capital-one-logo.png` into the app's `public/` and pass it as `wordmarkSrc` (without it the monitor shows a plain coded dashboard).
2. Load the font once in the app: `pnpm add @fontsource/press-start-2p` and `import '@fontsource/press-start-2p/400.css'` (or any Press Start 2P source). Without it the dialogue falls back to monospace.
3. In `index.html` use `<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />` and pad the page with `env(safe-area-inset-*)` (see `src/index.css`).
4. Use it:
```tsx
import { NpcScene, DialogueBox, NATIVE_W, useIntegerScale, usePrefersReducedMotion, type NpcHandle } from './npc'
const npc = useRef<NpcHandle>(null)
const { scale } = useIntegerScale(23)            // rem kept free under the scene for the dialogue box
const reduced = usePrefersReducedMotion()
<NpcScene ref={npc} scale={scale} reducedMotion={reduced} wordmarkSrc="/brand/capital-one-logo.png" onFileDrop={f => ...} onPaperClick={() => ...} />
<DialogueBox line={line} width={NATIVE_W * scale} speed={speed} onSpeedChange={setSpeed} reducedMotion={reduced}
  onChar={c => npc.current?.talk(c)} onLineDone={() => npc.current?.stopTalking()} chips={chips} onChip={...} onSubmit={...} />
npc.current?.setState('reading'); npc.current?.emote('concerned'); npc.current?.gesture('point-down')
// optional since 110: <NpcScene facialHair="moustache" background="evening" ... /> or npc.current?.setFacialHair('stubble')
```
`npc.css` (imported by `index.ts`) uses `npc-` class names only, and its class selectors win over Tailwind's preflight. `src/App.tsx` is a full example, including the sample conversation runner.

**API since 110:** nothing removed or renamed. Added, all optional: `NpcScene` props `facialHair` (`'none' | 'moustache' | 'stubble'`, default `'none'`) and `background` (`'day' | 'evening'`, default `'day'`); `NpcHandle.setFacialHair()` and `setBackground()`; `NpcSnapshot.facialHair` and `.background`; exports `FACIAL_HAIR`, `BACKGROUNDS`, `BACKGROUND_NAMES` and their types. `NATIVE_W` x `NATIVE_H` is now 128 x 96 (still 4:3), so the scene is chunkier at the same screen size. `wordmarkSrc` keeps its name; the logo now shows on the desk monitor.

**API since 108 (109 notes):** `NpcHandle` and the `DialogueBox` props are unchanged. `NpcScene` gained one optional prop, `wordmarkSrc` (see Logo). `useIntegerScale` keeps its signature; on screens under 640 CSS px it no longer reserves a side gutter. `NpcEngine` gained `setOutput()` and `setWordmarkVisible()` (used by `NpcScene`). The canvas backing store is now device resolution, not 160x120: read pixels from a screenshot, not from `getImageData` at native coordinates.

## Style
Target: indie pixel-art avatars (the user's style refs, kept locally in `refs/`, never in the app or the repo). "Do more with less": few, chunky pixels, each one deliberate.

**Checklist** (every round was checked against it, see handoff 110 RESULT):
1. Reads as the same style as the style refs at phone size: a chunky dark outline (`outline`) around every shape, flat colours with one or two shades per material, hair in chunky tufts with clusters of highlight, eyes with a white highlight.
2. The agent fills about the same share of the frame as the composition ref: head top at y 15, desk top at y 70 (55 of 96 rows), about 40 of 128 columns wide.
3. Face friendly and calm, not intense: open eyes, soft 1 px brows set two rows above them, a warm closed smile, a light blush.
4. Arms and hands thick (9 px sleeves, 9 px hands) with white cuffs.
5. The tie has a knot, a narrow neck and a blade with two 2 px stripes.
6. The background has depth but stays behind the agent: cooler, lighter and lower in contrast than him.
7. No single pixels of noise: details come in pairs or clusters (hair strands 2 px, city windows 2x1, colleagues' eyes 1x2, tie stripes 2 px thick).
8. Every scaled pixel block is one flat colour (no smoothing; checked with the pixel test).

**The agent** (original character, a friendly businessman): short tufty hair (three tufts, a fringe lock, highlight clusters, two 2 px strands), ears, calm eyes (each 3x2: a dark lid row over a white sclera pixel and a 2 px iris; glances move the iris), soft 1 px brows, small nose shade, blush on both cheeks, a warm closed smile at rest. Navy suit with a light side (screen left, `uniformLight`) and a dark side (`uniform`, `uniformShade` at the edge), lapels with a dark outer edge, white shirt with collar points, red tie with a knot and stripes (`redLight`), pocket square (screen right), name badge (screen left). No pencil, no grey patch, no hat, no likeness to any existing character or real person.

**Facial hair** is its own layer with three settings: `none` (default, clean-shaven), `moustache` (a neat bold moustache over the upper lip), `stubble` (the moustache plus light stubble: a flat darker skin-tone shape over the jaw, chin and upper lip, no dither).

**The scene:** the agent sits behind a desk in front of a glass wall. Behind the glass: a ceiling with three light panels, a back wall with a long window band (sky and a two-row city), two back desks, colleague A seated behind a monitor (facing us), colleague B standing with a mug, a tall plant in the back left corner. The glass has a top rail with a brand red line, two slim dark mullions with a light edge, a frosted band (translucent: what is behind shows as two soft tones) and two pairs of diagonal reflections (a wide and a thin band, done as a lighter-colour map, not a paint stroke). On the desk: a slim monitor at the left showing the official logo, the navy in-tray (drop zone), the keyboard under his hands, the calculator, a red mug and a small plant at the right. The desk top is light with a thin highlight; the front panel is navy with a red stripe and kept short.

## Native sizes
| Thing | Size (px) | Where |
|---|---|---|
| Canvas | 128 x 96 (4:3) | Whole-number device scale (`useIntegerScale`); iPhone 15 portrait 9x (1152 x 864 device px = 384 x 288 CSS px), desktop 1440 x 900 5x (640 x 480) at dpr 1 |
| Character box | 49 x 60 | Top-left at scene (44, 15). Visible figure head to desk: y 15 to 70 |
| Head | 25 x 27 | Box (12, 0), centre column 12. Tufts rows 0 to 1, hair to row 10, brows row 13, eyes 15 to 16, nose 17 to 18, mouth 19 to 22, chin 25 |
| Eyes layer | 11 x 4 | Head (7, 14). Each eye 3 x 2 (lid row, then sclera pixel and 2 px iris); left eye x 0-2, right eye x 8-10 |
| Eyebrows layer | 11 x 3 | Head (7, 12). 3 wide, 1 px |
| Mouth layer | 9 x 4 | Head (8, 19) |
| Facial hair | stubble 25 x 27 (head-sized), moustache 9 x 2 | Stubble at head (0, 0) under the eyes and mouth; moustache at head (8, 19) over the mouth |
| Glasses (coach) | 18 x 4 | Head (3, 14) |
| Torso | 41 x 36 | Box (4, 24). Shoulder joints at box (9, 33) and (39, 33). Hidden by the desk from torso y 31 |
| Sleeves | 9 px wide (outline), 7 px fill | Screen-left sleeve `uniformLight` with a 2 px `uniform` rim on the right; screen-right sleeve `uniform` with a 1 px `uniformLight` rim on the left and a 2 px `uniformShade` rim on the right; white cuff 3.5 to 6 px back from the hand, dark hem behind it (skipped where the forearm is too short) |
| Hands | rest 9x6, grip 8x7, open 11x9, point down 8x10, point right 10x8, flat 10x4 | Centred on the hand point of the arm pose |
| Held items | doc 8x10, doc held 20x14, planner 10x12 | Top-left given by the pose |
| Desk | top y 70 to 79, front panel 80 to 95 | Full width. Hides the agent below y 70 |
| Monitor | 40 x 23 at (5, 44); screen 36 x 17 at (7, 46) | `MONITOR`, `SCREEN` in `scene.ts` |
| Tray (drop zone) | 18 x 6 at (31, 73) | Tap / keyboard hotspot covers it plus the arrow above (at least 44 CSS px) |
| Keyboard | 22 x 5 at (58, 73) | Under the hands in idle |
| Calculator | 11 x 6 at (84, 73) | `tap-calc` hits it |
| Mug, desk plant | 9 x 8 at (95, 66); 15 x 14 at (107, 59) | Right side of the desk |
| Summary sheet | 20 x 5, slides from y 71 to y 75 | Ends on the front edge of the desk |
| Thinking bubble | 18 x 11 at (82, 5) | |
| Office | ceiling y 0 to 9, wall 10 to 45 (windows 12 to 33), floor from 46 | Behind the glass; colleague A at (21, 24), colleague B at (111, 19) |
| Glass | top rail y 0 to 2, mullions x 42 and 98, frosted band y 37 to 41 | Drawn over the office, under the agent |

## Layers (back to front)
1. Office (`buildOffice`, static): ceiling and lights, back wall, sky and city, back desks, tall plant
2. Office life (`drawOfficeLife`): the two colleagues; with `ambient` on and motion allowed, colleague A looks down now and then, colleague B lifts the mug, one ceiling light flickers off for 140 ms every ~9 s
3. Glass (`drawGlass`): reflections (lighter-colour map in two diagonal band pairs), the translucent frosted band, the top rail with the red line, mullions
4. Agent, back pass: torso, then the head group (head, stubble, eyes, glasses, eyebrows, mouth, moustache), composed together so a tilt moves them as one
5. Desk (`buildDesk`)
6. Desk props: monitor (white screen, transparent while the logo file shows through from under the canvas), keyboard, mug, plant, calculator, tray, document in the tray, summary sheet
7. Drop zone highlight: marching dashes and a bouncing arrow over the tray
8. Agent, front pass: arms (outline, shaded fill, cuff, hem), held items, hands. Arms are drawn after the desk so hands can rest on the keyboard and reach the tray and calculator
9. Thinking bubble

To change the setting, replace layers 1 to 3 and 5. Keep `AGENT_ORIGIN`, `COUNTER_TOP_Y`, `TRAY`, `CALC`, `KEYBOARD` and the paper positions, or move them together with the arm poses that touch them (`rest*`, `reach*`, `tap*`, `pointDownR`, `explain*`, slide hand).

## Facial hair and background variants
- **Facial hair:** `<NpcScene facialHair="none" | "moustache" | "stubble">` or `npc.current.setFacialHair(...)`. Default `none`. Debug panel: "Facial hair" buttons. See `screens/options.png` (A clean-shaven, B neat moustache, C moustache with light stubble, idle, final scene).
- **Background:** `<NpcScene background="day" | "evening">` or `npc.current.setBackground(...)`. Default `day`. Debug panel: "Background" buttons. A variant only swaps the office colours (`BACKGROUNDS` in `palette.ts`): evening warms the walls and ceiling lights, turns the sky to dusk and lights the city windows. The agent, desk and brand colours never change. See `screens/backgrounds.png`.
- To add a variant, add an entry to `BACKGROUNDS` with overrides for the `office*`, `sky*`, `city*`, `desk*`, `colleague*`, `frosted*` and `*Shine` names. `setPalette()` overrides are applied on top of the background.

## Authoring
The agent's pixels live in `src/npc/sprites/art.ts` as rows of palette characters (`HEAD_ART`, `EYES_ART`, `TORSO_ART` and so on). In 110 they were generated by a small design script (Python, outside the repo) that builds each part from fills, an automatic outside outline, mirrored collar shapes and hand-placed highlights, then writes `art.ts`. The TS file is the source of truth now: edit the rows by hand (every row of a sprite must have the same width; `sprite()` throws if not). `sprites/character.ts` places the parts; `scene.ts` draws the office and desk in code with palette indices.

## Logo
The official file `public/brand/capital-one-logo.png` (231 x 218, artwork in the box (5, 71) to (225, 146) on white) is shown unchanged on the desk monitor's screen. `vite.config.ts` finds it at start-up and `App` passes it to `NpcScene` as `wordmarkSrc`. `NpcScene` puts a white box at `SCREEN` under the canvas (z-index 0, canvas 1, hotspots 2) and scales the image inside so its artwork fits with a small margin (smoothing is allowed for this image only; only white margin falls outside the box). While the logo is shown, the engine writes the monitor's white screen pixels as transparent, so the logo shows through and any arm, hand or document drawn over the monitor stays on top of it. If the file is missing or fails to load, the monitor shows a plain dashboard drawn in code (bars and lines, never a drawn logo). Never draw or trace the Capital One logo. The logo row is in `app/DISCLOSURES.md`.

## Palette
One file: `src/npc/palette.ts`. Since 110 the stand entries (`standPanel`, `hall*`, `booth*` and so on) are unused but kept so indices stay stable; new colours are appended at the end. Sprites store palette indices (one character per pixel, `.` is transparent), never colours. Recolouring is a palette change only: `npc.current.setPalette({ uniform: '#1f6b45', uniformShade: '#124a2f', uniformLight: '#3d8c63' })` turns the suit green (arms included) and leaves the desk and office alone (screenshot: the `palette-recolour` tile in `screens/contact-sheet.png`). The desk's navy has its own entries (`brandNavy*`). `red` is shared on purpose: tie, badge bar, planner, the desk stripe, the tray label and the glass rail line are all the brand red. The coach glasses are `outline` (dark), not red. The Capital One hex values are approximations; swap in the official ones.

| Char | Name | Hex | Group |
|---|---|---|---|
| `k` | outline | `#15131c` | Character and props |
| `s` | skin | `#e0a47a` | Character and props |
| `S` | skinShade | `#b9774f` | Character and props |
| `h` | hair | `#3b2a22` | Character and props |
| `H` | hairLight | `#6e4c38` | Character and props |
| `e` | eye | `#211a22` | Character and props |
| `o` | eyeLight | `#ffffff` | Character and props |
| `m` | mouth | `#6a2c2a` | Character and props |
| `n` | mouthInner | `#b5524c` | Character and props |
| `u` | uniform | `#1d4b7e` | Character and props |
| `U` | uniformShade | `#122f55` | Character and props |
| `v` | uniformLight | `#2e65a0` | Character and props |
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
| `b` | counterTop | `#e6e1d7` | Scene |
| `B` | counterTopShade | `#bfb6a6` | Scene |
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
| `1` | skinLight | `#f0c39c` | Character and props |
| `2` | blush | `#e98a76` | Character and props |
| `3` | stubble | `#b98c6e` | Character and props |
| `4` | redLight | `#ef6a5c` | Character and props |
| `5` | counterTopLight | `#f8f6f1` | Character and props |
| `6` | keyboard | `#4a5260` | Character and props |
| `7` | keyboardKey | `#8e97a6` | Character and props |
| `9` | leaf | `#5b9a5a` | Character and props |
| `0` | leafShade | `#3c7445` | Character and props |
| `D` | skyTop | `#a9c8dc` | Office (day value; evening swaps it) |
| `E` | skyLow | `#c3dae7` | Office (day value; evening swaps it) |
| `O` | cityFar | `#8eabc1` | Office (day value; evening swaps it) |
| `Q` | cityNear | `#7895ae` | Office (day value; evening swaps it) |
| `T` | cityWindow | `#a4bfd2` | Office (day value; evening swaps it) |
| `Z` | officeWall | `#c9d2da` | Office (day value; evening swaps it) |
| `!` | officeWallShade | `#b3bec9` | Office (day value; evening swaps it) |
| `@` | ceiling | `#dde3e8` | Office (day value; evening swaps it) |
| `#` | ceilingLight | `#f7fafc` | Office (day value; evening swaps it) |
| `$` | officeFloor | `#a3afbb` | Office (day value; evening swaps it) |
| `%` | deskBack | `#b9c3cc` | Office (day value; evening swaps it) |
| `^` | deskBackShade | `#97a3b0` | Office (day value; evening swaps it) |
| `&` | monitorBack | `#5d6878` | Office (day value; evening swaps it) |
| `*` | monitorBackLit | `#9fbcd2` | Office (day value; evening swaps it) |
| `+` | colleagueSkin | `#c9a08a` | Office (day value; evening swaps it) |
| `=` | colleagueHair | `#6b5a55` | Office (day value; evening swaps it) |
| `~` | colleagueTopA | `#7f8ea3` | Office (day value; evening swaps it) |
| `-` | colleagueTopB | `#a08595` | Office (day value; evening swaps it) |
| `_` | officePlant | `#7ba38a` | Office (day value; evening swaps it) |
| `:` | officePlantShade | `#62897a` | Office (day value; evening swaps it) |
| `;` | officePot | `#a6a09c` | Office (day value; evening swaps it) |
| `<` | glassFrame | `#2b3442` | Glass and desk (same in every background) |
| `>` | glassFrameLight | `#56637a` | Glass and desk (same in every background) |
| `?` | frosted | `#e4ebf1` | Office (day value; evening swaps it) |
| `/` | frostedLine | `#d2dce5` | Office (day value; evening swaps it) |
| `{` | skyShine | `#d3e5f0` | Office (day value; evening swaps it) |
| `` ` `` | skyLowShine | `#dceaf2` | Office (day value; evening swaps it) |
| `}` | cityShine | `#a7c1d4` | Office (day value; evening swaps it) |
| `[` | wallShine | `#dbe2e8` | Office (day value; evening swaps it) |
| `]` | screenWhite | `#ffffff` | Desk props |
| `,` | bezel | `#22262e` | Desk props |
| `"` | bezelLight | `#3a404b` | Desk props |

UI colours (DOM, mirrored as CSS variables in `npc.css`): `uiBg #0b1d2e`, `uiBgDeep #06131f`, `uiText #f3f2ec`, `uiMuted #b9c3cf`, `uiAccent #d03027`, `uiFocus #ffd84d`, page `#10141c`.

## Animation system
- Fixed step: 60 updates per second (`STEP_MS`), driven by `requestAnimationFrame` with an accumulator. Timing does not depend on the display's refresh rate. Positions are whole pixels.
- The frame is built in a 128x96 palette-index buffer, then copied onto the visible canvas at the whole device scale with smoothing off (`setOutput`). The canvas box is a whole number of CSS px with a matching backing store, and `NpcScene` puts its top-left corner on a whole CSS px. The browser never rescales it (see iPhone).
- API: `setState(state)`, `emote(emote)`, `gesture(gesture)`, `talk(char)`, `stopTalking()`, `setTrayDoc`, `setDropHover`, `clearPaper`, `setPalette`, `setFacialHair`, `setBackground`, `reset`, `settleIn()` (ms until a one-shot state has finished), `snapshot()`.
- Emotes and gestures combine with any state. A non-neutral emote wins the eyebrows, except in `asking`, which keeps its eyebrows up unless the emote is `concerned`. `thinking` shows quizzical eyebrows with `neutral`. An emote's eyes replace the plain open eyes only; a state's own eyes (reading, listening, glances, looking at the calculator) win.
- Idle never freezes: the breathing bob (1 px) and blinks run in every state unless reduced motion is on. Glances (the iris moves inside the eye) run in `idle`, after the wave in `greeting` and after the switch in `coach`.
- `setState()` clears any running gesture, so call `gesture()` after `setState()`, not before.

## States: frames and timings
| State | Frames | Timing |
|---|---|---|
| `idle` | both hands on the keyboard (1); breathing 2; blink 3 (half, closed, half); glance 1 of left, right, down | bob every 750 ms; blink 140 ms, every 2 to 6 s; glance 0.6 to 1.1 s, every 2.5 to 6 s |
| `greeting` | left arm: raise, wave A, wave B (3); open hand by the head | raise 150 ms, wave swaps every 200 ms until 1650 ms, then rest |
| `talking` | mouth cycles small, open, wide, open, small, closed | 75 ms per mouth frame; open while a letter was printed in the last 130 ms; punctuation closes it at once |
| `listening` | eyes down (lid lowered); head nod 2 (0, +1 px) | two 180 ms nods every 2.2 s |
| `asking` | open palm presented in front of the chest (1); head tilt (row shear, 2 px at the top); eyebrows raised | static pose |
| `receive-document` | left arm 6 keyframes: reach 1, reach 2, take (hand on the tray), back 2, back 1, hold | 0, 200, 450, 700, 950, 1200 ms; document leaves the tray at 600 ms; lean 2 px from 200 to 950 ms |
| `reading` | both hands hold the document at the chest (1); eyes 4 (down-left, down, down-right, half) | one line every 1.5 s (450, 450, 450, 150 ms) |
| `thinking` | right hand to chin, forearm up across the chest (1); eyes up-right; bubble dots 3 | dots step every 400 ms |
| `explaining` | right hand points down at the front-centre of the desk, where the summary lands (2: tap +1 px) | 450 ms per frame |
| `slide-paper` | flat right hand rides on the sheet as it slides to the front edge, retract (1), glow 4 | push 250 to 1000 ms, retract to 1200 ms, glow 1000 to 1600 ms (once); sheet clickable from 1000 ms |
| `coach` | left hand to the face 2, glasses on, rest, planner up | 0, 250, glasses at 450, 600, 850 ms; glasses stay on in every later state (coach mode) |

Emotes change eyebrows, eyes and mouth together:
| Emote | Eyebrows | Eyes | Mouth at rest | Talk frames (small, open, wide) |
|---|---|---|---|---|
| `neutral` | level, 1 px | open: lid, sclera, iris | warm closed smile, 7 px | small, open, wide |
| `warm` | soft arch | narrowed (iris row shaded) | wide smile, 9 px with corners up | smile-small, open, wide |
| `concerned` | inner ends up (slanted) | softer: outer lid corners down | slight frown | small, small, open (restrained) |
| `pleased` | raised arch | happy (closed upward arcs) | open smile with teeth | smile-small, grin, wide |

Gestures move the whole arm:
| Gesture | Arm and pose | Duration |
|---|---|---|
| `wave` | left: hand up by the head, open hand swings 6 px | 1600 ms, 2 frames at 200 ms |
| `open-palm` | left: forearm raised in front of the chest, open palm presented (clear of the monitor) | 1800 ms |
| `point-down` | right: arm crosses the body to the in-tray, finger down at its right edge | 2000 ms |
| `point-side` | right: arm straight out to screen right, finger pointing; eyes right | 2000 ms |
| `chin` | right: hand to chin, forearm up across the chest; eyes up-right | 2500 ms |
| `tap-calc` | right: arm out to the calculator, finger taps it; eyes down-right; display flickers | 2000 ms, 2 frames at 220 ms |
| `none` | back to the state's arms | |

Left and right always mean screen left and right. At 25% size the hardest pair to tell apart is `neutral` vs `warm` (both smile; warm is wider with narrowed eyes), then `wave` vs `open-palm` (both the left hand open, head height vs chest height). See `screens/contact-sheet-small.png`.

## How to add a state
1. Add the name to `AGENT_STATES` in `engine.ts` (TypeScript then lists every place that needs it).
2. If it needs new arm positions, add them to `ARM_POSES` (elbow point, hand point, hand sprite, `grounded` if the hand rests on the desk). Move the whole arm. If it needs a new face part, add rows to `EYES_ART`, `BROWS_ART`, `MOUTHS_ART` or `ITEMS_ART` in `sprites/art.ts`, using palette characters only.
3. Add a `case` in `stateFrame()` that returns the arms, items, eyes and head offsets for a given time. Use `seq(T, [[ms, pose], ...])` for keyframes and the `rm` flag for the reduced-motion end pose.
4. If it is a one-shot, add its length to `SEQUENCE_MS`, and any side effect (an item changing hands) to `applyStateEffects()`.
5. Add a sentence to `STATE_TEXT` in `describe.ts` for the canvas label.
6. Check it from the debug panel on the iPhone profile and with reduced motion on, and add it to the contact sheet.

## Do and don't
- Do keep the character original (see Style).
- Do keep every pixel on the native grid: whole-number positions, no rotation, no smoothing, no sub-pixel easing. Fake tilts with row shears and depth with layer order.
- Do outline every part with `outline` and keep sprites palette-indexed so a recolour stays a palette change. Parts drawn in code (office, glass, desk, monitor, tray, arms) use palette indices too; the agent's parts are rows in `sprites/art.ts`.
- Do keep new colours in `palette.ts`, appended at the end so indices stay stable; keep the desk and the suit on separate entries, and keep office colours light, cool and low in contrast so the agent pops.
- Don't draw or trace the Capital One logo. It is the official file on the monitor or nothing.
- Don't commit or show the reference images (`refs/`, gitignored) or the round comparisons (`screens/compare-round*.png`, gitignored).
- Don't add jokes, points, levels or celebratory effects. Concerned news stays kind: inner brows up, softer eyes, slight frown, no tears.
- Don't bake the character into one image; each layer has its own frames so expressions and gestures combine.
- Don't put dialogue text on the canvas. It is DOM text (see Accessibility).

## iPhone
- **Scale:** `useIntegerScale` picks the largest whole device scale that fits. iPhone 15 portrait is 393 CSS px at dpr 3 = 1179 device px, so 1179 / 128 gives 9x (1152 x 864 device px, exactly 384 x 288 CSS px). Under 640 CSS px wide there is no side gutter, so the scene runs edge to edge.
- **No blur, no dropped columns:** (109 notes, still in place) 7x at dpr 3 was 373.333 CSS px, which layout cannot store exactly; WebKit then painted the canvas 1119 px wide and drew one native column 6 px wide. So the canvas box is rounded up to whole CSS px (374), its backing store matches it in device px (1122), the engine draws the frame at 7x inside it, and `NpcScene` nudges its top-left onto a whole CSS px. Checked: 0 of 19,200 7x7 blocks not flat.
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

**The canvas describes itself.** The canvas has `role="img"` and an `aria-label` rebuilt from the engine snapshot on every state, emote or scene change (`describe.ts`), for example: "Credit agent at his desk in a Capital One office, reading your document line by line. Expression: concerned but kind. A summary sheet is at the front of the desk."

**Keyboard.** Every control is a native button, radio or input with a visible focus ring (3px `#ffd84d`, offset 2 to 3px). Tab order: Debug button, tray, text speed, next, quick replies, reply box, Send.
| Control | Keys |
|---|---|
| Drop zone (tray) | Tab to it (keyboard focus lights it up like a drag), Enter or Space opens the file picker; picking a file fires `onFileDrop` just like a drop |
| Summary sheet (once it is on the desk) | Tab to it, Enter or Space fires `onPaperClick` |
| Next / show whole line | Tab to the arrow button, or press Space anywhere outside a control |
| Text speed | Tab to the group, arrow keys switch 1x, 2x and Instant |
| Quick replies, reply box, Send | Tab, Enter |
| Debug panel | `D` toggles it (not while typing) or the Debug button; focus moves to its heading; every state, emote, gesture and scene button is a normal button with `aria-pressed` |

The canvas hotspots (tray and sheet) are transparent DOM buttons placed over the art, so they are in the tab order and keep the canvas purely visual. Their focus ring has a dark halo (`#15131c`) on both sides, so it stays visible (at least 3:1) on the light office, the navy tray and the light desk.

**Reduced motion.** With `prefers-reduced-motion: reduce` (or `reducedMotion` forced on), the following are off: the breathing bob, blinks, glances, nods, eye scanning, the office life (colleagues, light flicker), the drop-arrow bounce, the paper slide and glow, mouth flaps and the typewriter (text appears at once) and the blinking next arrow. State changes still show instantly in their end pose: the paper is on the front edge and clickable at once, the coach glasses go on at once, the thinking bubble shows three still dots, and the greeting shows a raised hand for 1.5 s.

**Contrast (WCAG 2.2 AA).** Computed with the WCAG relative-luminance formula. Unchanged in 109 (same UI colours):
| Pair | Colours | Ratio | Needed |
|---|---|---|---|
| Dialogue text, chip text | `#f3f2ec` on `#0b1d2e` | 15.23:1 | 4.5:1 |
| Speaker name, Send, chip hover | `#ffffff` on `#d03027` | 5.08:1 | 4.5:1 |
| Speed legend | `#b9c3cf` on `#0b1d2e` | 9.57:1 | 4.5:1 |
| Selected speed, selected Debug button | `#0b1d2e` on `#f3f2ec` | 15.23:1 | 4.5:1 |
| Reply text / placeholder | `#f3f2ec` / `#b9c3cf` on `#06131f` | 16.71:1 / 10.50:1 | 4.5:1 |
| Focus ring on dialogue / page | `#ffd84d` on `#0b1d2e` / `#10141c` | 12.35:1 / 13.33:1 | 3:1 |
| Hotspot focus halo on the desk; ring on halo | `#15131c` on `#e6e1d7`; `#ffd84d` on `#15131c` | 14.11:1; 13.30:1 | 3:1 |
| Page title, Debug button text | `#f3f2ec` on `#10141c` | 16.44:1 | 4.5:1 |

**Text size.** All sizes are in rem. At 200% root font size the dialogue box grows and wraps, and the scene steps down to the next whole scale instead of overlapping (checked in 108; the 109 layout keeps the same rem rules).

**Checked with Playwright** (2026-11-07, again after the 110 redraw): WebKit `iPhone 15` profile and Chromium 1440 x 900, reduced motion, keyboard-only pass, tray tap, drag and drop, the sample conversation. Results are in handoffs 109 and 110 RESULT. Screens: `screens/iphone-page.png`, `screens/iphone-reply-focused.png`, `screens/iphone-reduced-motion.png`, `screens/desktop-1440.png`.

**Not covered yet:** no real screen-reader test (VoiceOver or NVDA), only the DOM and ARIA checks above; forced colours not checked; the iPhone checks ran in emulation, not on a device.
