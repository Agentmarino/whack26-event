---
id: 109
title: NPC art pass, camera in, chunky businessman, iPhone first
status: ready
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
- Status:
- Time taken:
- What was built:
- Files changed:
- Verification run and output:
- Hardest emotes or gestures to tell apart:
- API changes (if any):
- Follow-ups needed after the first prompt (prompt deltas):
- Open issues / follow-ups:
