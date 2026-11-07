---
id: 110
title: NPC art direction pass, detailed agent at a desk, glass wall office
status: done
owner: mihael
concept: lenders-eyes
created: 2026-11-07
time-budget: 75m
---

# 110: NPC art direction pass, detailed agent at a desk, glass wall office

## Goal
Redraw the agent and the scene so they match the user's art direction, then present options for him to pick. Same rig and component API as 109, so 102 is not affected.

## Context
- 109 is merged. Read `app/npc-concept/ART-GUIDE.md` and `src/npc/` first
- The user rejected 109's look: arms too thin, face generic, tie a plain rectangle, screen empty. Several direction frames were tried with him since (2026-11-07, 13:10 to 14:32). What he wants, in his words: indie-style pixel art, more detail and more interesting, "do more with less" (not too many pixels), friendly not "dodgy", camera not too close
- **Reference images** in `app/npc-concept/refs/` (local only, gitignored, never shown in the app or committed):
  - `style-ref-1.png`, `style-ref-2.png`: **the target style.** Head-and-shoulders avatars. Chunky outline in a dark tone, flat colours with one or two shades per material, hair in chunky tufts with clusters of highlight, eyes with a white highlight, a beard or stubble as a flat darker skin-tone shape (not dither), a simple bold moustache in ref 2, a friendly smile. Use them for style only. Our agent is an original character
  - `composition-ref.png`: **the target framing and layout** (option A on the left). Camera distance, the agent behind a desk with both hands on the keyboard, a slim modern monitor on the desk at the left showing the logo, mug and small plant at the right, a glass wall behind him. The agent and office in this frame are placeholders: the user said the agent lost his detail and the office is bad
  - `detail-ref.png`: the right level of detail on the agent (face texture, hair tufts, suit and tie), but the face is too intense and the camera too close. `detail-ref-max.png`: too much detail; the upper limit
- Agent: an original friendly businessman. Navy suit with a light and a dark side, white shirt with collar points, red tie with a real knot and a stripe or two, pocket square, name badge. Short tufty hair with highlights. Calm open eyes, soft brows, a warm smile, a light blush. Facial hair as an optional layer (variants below). No pencil, no grey patch
- Logo: the official file `app/npc-concept/public/brand/capital-one-logo.png` shown unchanged on the desk monitor's screen (scaled to fit, smoothing allowed for this image only). Never redraw or trace it

## Requirements
### Tools and method
- [ ] Check `claude-pxl` (github.com/crsolver/claude-pxl) and `pixel-mcp` (willibrandon). Use one only if its licence is MIT, Apache 2.0, CC0 or similar and it helps; record the decision in RESULT and DISCLOSURES
- [ ] Work in rounds. Each round: render with Playwright, put your render next to the style refs and the composition ref in one image (`screens/compare-roundN.png`), and write a short critique against the checklist below before the next round. At least 3 rounds
- [ ] Checklist: (1) reads as the same style as the style refs at phone size; (2) agent fills about the same share of the frame as in the composition ref; (3) face friendly and calm, not intense; (4) arms and hands thick, with cuffs; (5) tie has a knot and shape; (6) background has depth but stays behind the agent (lower contrast, cooler, softer than him); (7) no single pixels of noise; (8) every pixel block is one flat colour

### Scene
- [ ] Native canvas about 128x96 (keep the 4:3 iPhone-first layout from 109; adjust if the style needs it and say why). Whole-number scaling
- [ ] **Glass wall office background, done well:** a glass partition with slim dark frames and a frosted band, a few subtle diagonal reflections. Behind it an office with depth: a back wall with windows (city or sky), two or three desks with monitors, one or two colleagues at a readable size (not tiny), a tall plant, ceiling lights. Fewer, larger, cleaner shapes; cooler and lower contrast than the agent so he pops. Optional slow ambient life (a colleague shifts, a light flickers) behind a flag, off in reduced motion
- [ ] Desk: light top with a thin highlight, a front panel in navy with a red stripe, kept short so the agent has room. Monitor (slim bezel, stand) at the left with the logo, keyboard in front of him, mug and plant at the right. The drop tray from 109 stays on the desk (tap target on iPhone)

### Agent
- [ ] Redrawn on the 109 rig layers (body, head, eyes, brows, mouth, arms, hands, held items). All 11 states, 4 emotes and 6 gestures from 108/109 still work and read at a glance
- [ ] Facial hair as a separate layer with three settings: none, neat moustache, moustache with light stubble. Default none

### Options for the user
- [ ] Before finishing, produce `screens/options.png`: three variants side by side in the idle state on the final scene: (A) clean-shaven, (B) neat moustache, (C) moustache with light stubble. Plus `screens/backgrounds.png` with two background variants (for example daytime city and warm evening). Keep the debug panel able to switch both at runtime

### Docs
- [ ] Update `ART-GUIDE.md`: the style rules from the checklist, palette, sizes, how the facial hair and background variants switch

## Out of scope
- `app/frontend/`, the backend, chat logic
- Committing the reference images (keep `app/npc-concept/refs/` in `.gitignore`)

## Verification
1. Playwright WebKit `iPhone 15` portrait and desktop 1440x900: contact sheet of every state, emote and gesture (`screens/contact-sheet.png`) and the 25% version (`screens/contact-sheet-small.png`)
2. `screens/compare-round1.png` to `compare-roundN.png` exist, each with a written critique in RESULT
3. `screens/options.png` and `screens/backgrounds.png` exist
4. "Play sample conversation" runs end to end on the iPhone profile, no console errors. Reduced motion and keyboard checks still pass
5. `git check-ignore app/npc-concept/refs/style-ref-1.png` prints the path (refs are not committed)

---

## RESULT (filled in by Claude Code)
- Status: done
- Time taken: about 50 min wall clock (status flip 14:37, done after the review fixes and a full re-run)
- What was built:
  - **Canvas 128 x 96** (was 160 x 120), still 4:3. Same framing as the composition ref, which is itself 128 x 96 at 6x. Bigger pixels fit "do more with less". iPhone 15 is now a crisp 9x (1152 x 864 device px = 384 x 288 CSS px), and desktop 1440 x 900 is 5x (640 x 480).
  - **Agent redrawn on the 109 rig layers** (`sprites/art.ts` + `sprites/character.ts`):
    - Head 25 x 27 with three hair tufts, a fringe lock, highlight clusters and ears.
    - Eyes are 3 x 2 like style ref 1: a dark lid row over a white sclera pixel and a 2 px iris. Glances move the iris.
    - Soft 1 px brows, a nose shade, blush, and a warm closed smile at rest.
    - Navy suit with a light side and a dark side, plus lapels with a dark outer edge.
    - Clean white collar points, and a red tie with a real knot, a narrow neck, a blade and two 2 px stripes. Pocket square and name badge.
    - Arms are 9 px sleeves shaded like a cylinder (light rim, 2 px dark rim) with a white cuff and a dark hem. Hands are 9 px.
    - All 11 states, 4 emotes and 6 gestures re-posed for the desk: hands on the keyboard in idle, the reach to the tray, point-down to the tray, tap-calc, slide-paper over the desk, and so on.
  - **Facial hair layer**: `none` (default), `moustache`, `stubble` (moustache plus a flat darker skin-tone stubble shape, no dither). It is drawn with the head group, so tilts and nods move it.
  - **Glass wall office** (`scene.ts`):
    - Behind the glass: a ceiling with three light panels, a back wall with a window band (sky and a two-row city with 2x1 windows), two back desks, colleague A seated behind a monitor facing us, colleague B standing with a mug, and a tall plant.
    - The glass itself: a top rail with a brand red line, slim dark mullions with a light edge, a translucent frosted band (shapes show through as two soft tones) and two pairs of diagonal reflections (a lighter-colour map, not paint).
    - Everything behind the glass is cooler, lighter and lower in contrast than the agent.
    - Ambient life sits behind the `ambient` flag and is off in reduced motion: colleague A looks down, colleague B lifts the mug, one light flickers for 140 ms every ~9 s.
  - **Background variants**: `day` (default) and `evening` (warm walls and lights, dusk sky, lit city windows). Each is a palette swap of the office colours only (`BACKGROUNDS` in `palette.ts`).
  - **Desk**:
    - Light top with a thin highlight, and a short navy front panel with a red stripe.
    - Slim monitor at the left (bezel, chin, neck, base) with the official logo PNG shown unchanged on its white screen. The artwork is scaled to fit and smoothed; only white margin falls outside. If the file is missing, a plain coded dashboard shows instead, never a drawn logo.
    - Navy in-tray with a red label (drop zone and tap target), keyboard under his hands, calculator, red mug and a small plant at the right.
  - **Debug panel** gained "Facial hair" and "Background" switches; the info list shows both.
  - **ART-GUIDE.md**: the style checklist, agent and scene description, new sizes table, layers, the facial hair and background switches, palette rows for every new colour, and authoring notes. Stale stand/counter wording removed.
- Files changed (app/npc-concept unless noted):
  - Source: `src/npc/{palette,raster,scene,engine,NpcScene,describe,hooks,index}.ts(x)`, `src/npc/npc.css`, `src/npc/sprites/character.ts`, new `src/npc/sprites/art.ts`, `src/App.tsx`
  - Docs: `ART-GUIDE.md`, `app/DISCLOSURES.md`
  - Screens: `screens/{contact-sheet,contact-sheet-small,contact-sheet-desktop,options,backgrounds,iphone-page,iphone-reply-focused,iphone-reduced-motion,desktop-1440}.png`
  - Root `.gitignore`
- Verification run and output (Playwright 1.56.1 scripts outside the repo, dev server on :5173; WebKit `iPhone 15` portrait and Chromium 1440 x 900 dpr 1):
  Final run, after the reviewer fixes:
  1. Contact sheets: `node shots.mjs iphone final-iphone` and `node shots.mjs desktop final-desktop`. Each covers 29 frames: 11 states, 4 emotes, 6 gestures, coach-talking, drop-zone, palette-recolour, 3 facial hair options and 2 backgrounds.
     - iPhone metrics `{"dpr":3,"cssRect":[5,52,384,288],"devicePx":[1152,864],"canvas":[1152,864],"rendering":"pixelated","scrollW":393,"clientW":393,"coarse":true}`, console: vite connect lines only.
     - Desktop `{"dpr":1,"cssRect":[400,60,640,480],"canvas":[640,480]}`, console: the React DevTools info line only.
     - `python3 sheet.py final-iphone 6` → `big (3132, 4956)`, `small (1182, 1910) tile (288, 216)` → `screens/contact-sheet.png`, `screens/contact-sheet-small.png` (25%). Desktop → `screens/contact-sheet-desktop.png`.
     - Pixel test (every scaled native block one flat colour; the monitor screen is reported apart because the logo image may be smoothed): `final-iphone/state-idle.png: 12288 native blocks of 9x9; not flat outside the logo screen: 0; inside the logo screen (smooth logo image, allowed): 192`. Same 0 outside for state-greeting (188 inside), state-receive-document (190), background-evening and option-stubble. Desktop state-idle and gesture-wave: 0 outside, 175 inside (5x5).
  2. `screens/compare-round1.png`, `compare-round2.png`, `compare-round3.png` exist (our render next to both style refs and the composition ref, critique printed under them). They are **gitignored** (`app/npc-concept/screens/compare-round*.png`) because they contain the reference images, which must never be committed. Critiques below.
  3. `screens/options.png` (A clean-shaven, B neat moustache, C moustache with light stubble; idle, reduced motion so no blink is caught, final scene) and `screens/backgrounds.png` (day city, warm evening) exist and are committed. Both switch at runtime from the debug panel.
  4. `node checks.mjs iphone` / `desktop`:
     - **Sample conversation** `{"result":"done","seconds":35.838,"statesSeen":["greeting","asking","receive-document","reading","thinking","explaining","slide-paper","coach"],"consoleErrorsAndWarnings":[]}` (iPhone); desktop `done` in 37.359 s, same 8 states, no errors or warnings.
     - **Reduced motion** `{"distinctIdleFramesOver3s":1,"unprintedChars":0}` on both.
     - **Tray tap** (iPhone) `filePickerOpened: true, accept ".pdf,.csv,image/*", line "Agent says: Thank you. I have credit-report.pdf. Let me read it."`, no errors.
     - **Keyboard** (desktop) tab order `page-debug-toggle, tray, INPUT(1x), npc-next, npc-chip, npc-reply__input, npc-reply__send`, all `solid 3px rgb(255, 216, 77)`. `D` focuses `npc-debug-title`. The paper hotspot is 130 x 65 (tray hotspot 130 x 110) and Enter gives "This is your summary sheet...". Drag and drop: `highlightedWhileDragging: true`, line "Thank you. I have statement.csv...".
     - **Touch targets** (iPhone) all at least 44 x 44 (tray hotspot 78 x 66). Reply pinned above the keyboard: `{"pinned":true,"position":"fixed","formBottom":659,"visualViewportBottom":659}`. No horizontal scroll.
  5. `git check-ignore app/npc-concept/refs/style-ref-1.png` → `app/npc-concept/refs/style-ref-1.png`
  - Also: `pnpm exec tsc -b` clean, `pnpm lint` exit 0.
- Round critiques (one line each; the full checklist text is in each compare image):
  - Round 1 (first redraw at 128 x 96): framing, outline, flat fills, calm face and thick cuffed arms OK. Collar wings and tie stripes were single-pixel noise. Colleague B was a pink block cut by a solid frosted band. Next to the composition ref the head read small.
  - Round 2 (head 25 x 27, ref-style lid and sclera eyes, solid collar triangles, 2 px tie stripes, lapel edges, translucent frosted band, standing colleague): proportions now match the ref and the noise is gone. The rest smile was too small, and the grey tray under the monitor read as part of the monitor.
  - Round 3 (warmer 7 px smile, a navy in-tray with a red label beside the monitor, facial hair and evening variants): all 8 checklist points pass at phone size. After the full contact sheet, the open palm (asking, open-palm) was moved off the monitor bezel to in front of the chest.
- Pixel-art tool used: none.
  - claude-pxl (crsolver/claude-pxl) is MIT, but it is a second sprite format with a PNG build step, and our rig composes palette-indexed layers at runtime.
  - pixel-mcp (willibrandon/pixel-mcp) is MIT, but it needs Aseprite, which is not installed.
  - Instead, a small Python design script (outside the repo, recorded in DISCLOSURES) builds the agent's sprite rows from fills, an automatic outside outline and hand-placed details, and writes `src/npc/sprites/art.ts`. That TS file is the source of truth now.
- API changes (if any): additive only. 102 can lift `src/npc/` unchanged.
  - `NpcScene` props `facialHair?` and `background?`.
  - `NpcHandle.setFacialHair()` and `setBackground()`.
  - `NpcSnapshot.facialHair` and `.background`.
  - Exports `FACIAL_HAIR`, `FacialHair`, `BACKGROUNDS`, `BACKGROUND_NAMES` and `Background`.
  - `NATIVE_W`/`NATIVE_H` values are now 128/96. Code that sizes by them (as `App.tsx` does) needs no change.
  - `wordmarkSrc` keeps its name; the logo now shows on the desk monitor instead of a top band.
- Reviewer (fresh-context `reviewer` agent on `git diff main...mihael/110`):
  - It found that all requirements are met and the scope was respected. It ran `tsc`, `lint` and `vite build`, did a headless render of 105 frames with no throws, and ran the sample conversation in a Chromium iPhone 15 profile: done in 36.7 s, 0 errors.
  - **Fixed:**
    1. HIGH: the logo box sat on top of the canvas and cut off the left arm with a white edge in greeting, wave, asking, open-palm and receive-document. The logo now sits under the canvas (z-index 0/1/2), and the engine makes the monitor's white screen pixels transparent while the logo shows, so arms and documents paint over it.
    2. Stale guide numbers: lean 2 px, wave swing 6 px, the palette labels of the glass/desk colours, the skyLowShine row, the sleeve rim description, the API list, the "drawn in code" note, the logo layering, and the usage snippet now shows `wordmarkSrc` plus copying the PNG.
    3. Removed two unused new palette entries (`mug`, `shine`).
    4. The desk plant floated 1 row above the desk; it now sits at y 59.
    5. Colleague A's lowered eyes were 1x1; they are now 2x1 lids.
    6. Cuff and hem are skipped where the forearm is too short to keep them off the elbow.
    7. `KEYBOARD.h` set to 5, and the vite.config.ts comment updated.
  - **Noted:**
    - The reviewer could not run WebKit (its Playwright had no matching build), so the WebKit numbers above are from my runs.
    - The compare images are local only (see Verification 2).
- Open issues / follow-ups:
  - The user picks a facial hair option (A, B, C) and a background (day, evening) from `screens/options.png` and `screens/backgrounds.png`. Then set the defaults (the `useState` values in `App.tsx`, or the props in 102).
  - Not checked on a real iPhone (emulation only), same as 109.
  - The hands could take one more detail pass (finger lines) if the user wants more; it was left to keep "do more with less".
  - Follow-ups needed after the first prompt (prompt deltas): none from the user in this session. One deviation: the handoff asks for `compare-roundN.png` in `screens/` and also says the refs are never committed. The compare images embed the refs, so they are made locally and gitignored. Future handoffs should say "local only" for any image that contains the refs.
