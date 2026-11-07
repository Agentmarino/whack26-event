---
id: 110
title: NPC art direction pass, detailed agent at a desk, glass wall office
status: in-progress
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
- Status:
- Time taken:
- What was built:
- Files changed:
- Verification run and output:
- Round critiques (one line each):
- Pixel-art tool used: name / licence / or none
- API changes (if any):
- Open issues / follow-ups:
