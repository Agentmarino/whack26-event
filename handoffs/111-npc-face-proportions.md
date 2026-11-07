---
id: 111
title: NPC face proportions and small fixes, set defaults (stubble, day)
status: ready
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
- Status:
- Time taken:
- What was built:
- Files changed:
- Verification run and output:
- Proportions vs style-ref-1:
- Open issues / follow-ups:
