---
id: 111
title: NPC face proportions and small fixes, set defaults (stubble, day)
status: done
owner: mihael
concept: lenders-eyes
created: 2026-11-07
time-budget: 40m
---

# 111: NPC face proportions and small fixes, set defaults

## Goal
The user picked option C (moustache with light stubble) and the day background. Make his face longer and less squashed, matching the head proportions of `refs/style-ref-1.png`, fix the small issues below, and set the defaults. Nothing else changes.

## Context
- 110 is merged. Read `app/npc-concept/ART-GUIDE.md`, `screens/options.png` (option C) and `app/npc-concept/refs/style-ref-1.png`
- User, 2026-11-07 15:21: "C is close, very close. His face needs to be longer vertically, a little less squashed, same composition as this image" (style-ref-1)
- What style-ref-1 does with the head (copy the proportions, not the character): the face is clearly taller than wide (about 4:5 for the skin area without ears); hair adds volume on top so the whole head is taller still; eyes sit near the vertical middle of the face with a full forehead above them; nose in the lower-middle; mouth about three quarters down; a defined chin with the stubble shape following the jaw; ears visible at eye-to-nose height; a visible neck before the collar
- Keep the agent's place in the frame from 110 (camera distance, desk, monitor). If the longer head needs space, take it from the hair top or shift him up a little, not by moving the camera in

## Requirements
- [ ] Redraw the head layers (head, eyes, brows, mouth, facial hair) with the longer proportions above. Same pixel size and style as 110. Every emote and the talking mouth frames redrawn to fit
- [ ] Eyes: open and calm at rest, not sleepy (white on both sides of the iris, a clear highlight, no heavy lid line across the top)
- [ ] Stubble and moustache (option C) follow the new jaw: a flat darker skin-tone shape along the jaw and chin and around the mouth, like style-ref-1
- [ ] Defaults: facial hair `moustache-stubble`, background `day`. The debug panel still switches both
- [ ] Hair: lit side and shaded side differ (highlight clusters on the light side, darker tone on the far side)
- [ ] Colleagues behind the glass: give them shoulders and arms at a desk, not heads over boxes. Keep them soft and low contrast
- [ ] Desk front panel a few pixels shorter, so the agent has more room
- [ ] Update `ART-GUIDE.md` (head proportions, defaults)

## Out of scope
- Anything outside `app/npc-concept/`

## Verification
1. Playwright WebKit `iPhone 15` and desktop 1440x900: new `screens/contact-sheet.png`, `contact-sheet-small.png` and `screens/default.png` (idle, defaults)
2. Local only (gitignored, embeds the refs): `screens/compare-face.png` with the new head next to style-ref-1 at the same height, and one line in RESULT on how the proportions compare (face height to width, eye line, mouth line)
3. Sample conversation on the iPhone profile, no console errors; reduced motion and keyboard checks pass

---

## RESULT (filled in by Claude Code)
- Status: done
- Time taken: about 30 min wall clock (status flip 15:22, done after the review fixes and a final iPhone re-run)
- What was built (all in `app/npc-concept/`):
  - **Head redrawn longer** (style-ref-1 proportions, our own character).
    - Head is 25 x 31 (was 25 x 27). The face skin without ears is 17 wide x 21 tall, about 4:5 (was 19 x 17).
    - Hair adds 8 rows of volume on top.
    - Eyes sit at rows 17-19, near the middle, with a full forehead above. The nose is at 21-22 and the mouth line at 25.
    - Ears are at eye-to-nose height (17-22).
    - The jaw runs straight to the mouth line, then tapers to a 7 px chin. Two rows of neck show above the collar.
    - Same pixel size and style as 110 (outline, flat fills, 1-2 shades).
  - **Eyes:** each is 4 x 3: a 2 x 3 iris with a white highlight at its top-left and white sclera on both sides, with no lid line across the top. All 13 eye frames are redrawn (glances, down, half and closed blink, up, warm, soft, happy).
  - **Face parts:** brows (4 wide, 1 px, one free row above the eyes), all 8 mouths (rest mouths for every emote plus the small, open and wide talking frames), moustache and the coach glasses are all re-fitted.
  - **Stubble** (option C) is a flat `stubble` shape along the jaw that widens towards the chin, covering the chin and the area around the mouth. The moustache sits over the upper lip.
  - **Defaults:** facial hair `moustache-stubble`, background `day`.
    - Set in the engine (`DEFAULT_FACIAL_HAIR`) and in `App.tsx`.
    - The debug panel still switches both (`screens/options.png`, `screens/backgrounds.png` regenerated).
    - The value `'stubble'` is now `'moustache-stubble'`. `setFacialHair()` and the `facialHair` prop still accept `'stubble'`.
  - **Hair:** the lit side (screen left) has `hairLight` clusters. The far side and sideburn use a new darker `hairShade` (`8`).
  - **Colleagues** behind the glass are seated at the back desks: rounded shoulders, upper arms split from the body by a seam in a new shade tone, elbows out and forearms on the desk with the hands together.
    - A has a monitor beside them, not in front. B has a mug by the right hand and lifts it to the chest now and then.
    - They stay soft, using only the colleague* colours; the evening background has values for the new shades.
    - The frosted band moved from y 37 to y 42, just under the back desk tops, so the arms show.
  - **Desk front panel** is 13 rows (was 16). The desk, every desk prop and the agent's body moved 3 px down together, so every arm pose is still correct relative to the desk. The head rises 5 rows above the character box: the head top is at y 13 (was 15), so his place in the frame is the same and the camera did not move.
  - **ART-GUIDE.md:** a "Head proportions" section, the defaults, an "API since 111" note, new sizes and positions, palette rows for `8`, `(` and `)`, the seated colleagues and the frosted band.
- Files changed:
  - `app/npc-concept/src/npc/{sprites/art.ts, sprites/character.ts, engine.ts, scene.ts, palette.ts, NpcScene.tsx, index.ts}`
  - `app/npc-concept/src/App.tsx`
  - `app/npc-concept/ART-GUIDE.md`
  - `app/npc-concept/.gitignore` (adds `screens/compare-face.png`)
  - `app/npc-concept/screens/{contact-sheet, contact-sheet-small, contact-sheet-desktop, default (new), options, backgrounds, iphone-page, iphone-reply-focused, iphone-reduced-motion, desktop-1440}.png`
  - One row in `app/DISCLOSURES.md`. This is outside the handoff's folder, but the competition rule in CLAUDE.md says to log every tool use, and the 111 redraw reused the design script, Playwright and Pillow.
- Verification run and output:
  - Setup:
    - Playwright 1.56.1 scripts outside the repo (same as 110), WebKit `iPhone 15` and Chromium 1440 x 900 dpr 1.
    - Dev server: my own on :5199 with its own cache dir. The 110 server on :5173 answered `504 (Outdated Optimize Dep)` and was started by another session, so I left it alone.
  1. **Contact sheets:** `node shots.mjs iphone r-iphone` / `node shots.mjs desktop r-desktop`. 30 frames each: 11 states, 4 emotes, 6 gestures, coach-talking, drop-zone, palette-recolour, 3 facial hair options, 2 backgrounds and `default`.
     - iPhone metrics `{"dpr":3,"cssRect":[5,52,384,288],"devicePx":[1152,864],"canvas":[1152,864],"rendering":"pixelated","scrollW":393,"clientW":393,"coarse":true}`, console `["debug: [vite] connecting...","debug: [vite] connected."]`.
     - Desktop `{"dpr":1,"canvas":[640,480],"scrollW":1440}`, console: vite lines and the React DevTools info line only.
     - `python3 sheet.py r-iphone 6` → `big (3132, 4956)`, `small (1182, 1910) tile (288, 216)`; desktop → `big (2108, 3420)`. These are `screens/contact-sheet.png`, `contact-sheet-small.png` (25%) and `contact-sheet-desktop.png`.
     - `screens/default.png`: iPhone 15 scene, idle, defaults untouched (moustache + stubble, day), with reduced motion on so no blink is caught.
     - Pixel test (every 9x9 or 5x5 block one flat colour; the logo screen is counted apart):
       - iPhone `state-idle`, `state-greeting`, `state-receive-document`, `background-evening`, `option-moustache-stubble` and `default`: `not flat outside the logo screen: 0`.
       - Desktop `state-idle`, `gesture-wave` and `default`: `0`.
  2. **`screens/compare-face.png`** (local only, gitignored by `app/npc-concept/.gitignore`, because it embeds style-ref-1): our head next to style-ref-1 at the same head height, with lines for head top, eye, mouth and chin. `git check-ignore -v` → `app/npc-concept/.gitignore:27:screens/compare-face.png`. No file under `refs/` is committed (`git ls-files app/npc-concept/refs` is empty).
  3. **Checks** (`node checks.mjs iphone` / `desktop`, re-run on iPhone after the reviewer fixes):
     - **Sample conversation (iPhone):** `{"result":"done","seconds":35.465,"statesSeen":["greeting","asking","receive-document","reading","thinking","explaining","slide-paper","coach"],"consoleErrorsAndWarnings":[]}`. Desktop: `done` in 36.655 s, same 8 states, `[]`.
     - **Reduced motion** `{"distinctIdleFramesOver3s":1,"unprintedChars":0}` on both.
     - **Keyboard (desktop):** tab order `page-debug-toggle, tray, INPUT(1x), npc-next, npc-chip, npc-reply__input, npc-reply__send`, all `solid 3px rgb(255, 216, 77)`.
       - `D` focuses `npc-debug-title`.
       - Tray: Tab, Tab, Enter opens the picker (`accept ".pdf,.csv,image/*"`).
       - Paper hotspot 130 x 65; Enter gives "This is your summary sheet...".
       - Drag and drop highlights the tray.
     - **iPhone:** tray tap opens the file picker, all touch targets at least 44 x 44, no horizontal scroll. The reply row is pinned above the keyboard (`formBottom 659 = visualViewportBottom 659`).
     - `pnpm exec tsc -b` exit 0; `pnpm lint` (oxlint) exit 0.
  - I looked at the iPhone and desktop page screenshots: no overflow or clipping, and the logo sits on the moved monitor.
- Proportions vs style-ref-1 (as a share of the face height, hairline to chin outline, measured on the ref's pixels: hairline y 104, chin y 239, face 128 px wide):
  - **Face width to height:** ref 0.95 (0.85 from the temple hairline), ours 17:21 = 0.81, the 4:5 the handoff asked for.
  - **Eye line:** ref 0.39, ours 0.45.
  - **Mouth line:** ref 0.77, ours 0.79.
  - Ours is a little narrower than the ref, and the eyes sit a little lower, nearer the middle as the handoff describes.
- Reviewer (fresh-context `reviewer` agent on `git diff main...mihael/111`): it found nothing blocking.
  - **Checks it ran:** tsc, lint and build all clean. It parsed every sprite (all rows the right width, all palette chars known), confirmed the geometry move has no stale hard-coded y, confirmed the `'stubble'` alias is the only remaining use of the old name, and found the scope clean.
  - **Fixed:**
    - The coach "glasses on" hand (`toFace2L`) had not moved up with the eyes and landed on the cheek. It is now at the left eye (checked in a render at 300 and 500 ms).
    - Stale comments: eye row 0, the neutral-eyes row in the emote table, and the "pot hidden by the monitor" comment.
  - **Noted:** `default.png` and `iphone-reduced-motion.png` are the same picture, because both are the idle scene with defaults and reduced motion. That is expected.
- Open issues / follow-ups:
  - If the user wants the face as wide as style-ref-1 (about 0.9), widen the skin to 19 columns. One change in the design script: the per-row `FACE` outline.
  - Not checked on a real iPhone (emulation only), same as 109 and 110.
  - `app/DISCLOSURES.md` got one 111 row (see Files changed); Mihael may want to confirm that when merging.
  - Follow-ups needed after the first prompt (prompt deltas): none from the user in this session.
  - Two deviations from the handoff's wording:
    1. Seating the colleagues "at a desk" needed the frosted band moved down 5 px, otherwise it covered their arms.
    2. The handoff's own scope rule kept the gitignore line for `compare-face.png` in `app/npc-concept/.gitignore`, not the root one.
