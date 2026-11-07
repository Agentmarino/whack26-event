---
id: 116
title: Full-screen scene, 8-bit game dialogue text, expandable side panel
status: ready
owner: mihael
concept: lenders-eyes
created: 2026-11-07
time-budget: 2h
---

# 116: Full-screen scene, 8-bit game dialogue text, expandable side panel

## Goal
The app looks and reads like a real 8-bit game: the scene with Cap fills the whole screen, his words appear in a classic game dialogue box over the scene in proper pixel text, and the history and detail cards live in a side panel that opens when you want it.

## Context
- User, 2026-11-07 19:59: "I want the text to come up on the screen like proper 8-bit video game text, not generic text. Also it should be over the full character screen, with the side part being an expandable feature"
- Today the scene sits on top and the chat (history, cards, input) sits below or beside it in normal web text. 114 switched message text to a readable non-pixel font for accessibility; the user now wants pixel text. Keep accessibility through settings (below), not by defaulting to a web font
- Read first: `app/frontend/` layout and message cards, `app/frontend/src/npc/` (kit, unchanged unless noted), `app/npc-concept/ART-GUIDE.md`
- Runs after 115 (Cap intro and branches) is on `main`

## Requirements
### 1. Font options first (show the user, then build)
- [ ] Pick three free pixel fonts with a licence that allows this (OFL or CC0; for example Press Start 2P, Pixelify Sans, Silkscreen, Tiny5, or m6x11 if its licence is clear). Render one real Cap message and one reason card in each at the dialogue size on the iPhone 15 profile, side by side: `app/frontend/screens/font-options.png`. Default to the most readable one, make the other two selectable in Settings, and say in RESULT which you chose and why. List the fonts in DISCLOSURES

### 2. Full-screen scene
- [ ] The scene fills the whole viewport on iPhone portrait and on desktop. Keep whole-number pixel scaling: the width sets the scale; on a tall screen, extend the scene vertically instead of stretching it (more ceiling and glass-wall office above, the desk front and floor below), drawn in the same style and palette. On a wide screen extend sideways the same way. Cap, the desk, the logo monitor and the tray stay fully visible above the dialogue box
- [ ] Any change to the kit goes in `app/npc-concept/src/npc/` first and is copied to the frontend, with `ART-GUIDE.md` updated

### 3. Game dialogue box over the scene
- [ ] Classic RPG box over the lower part of the scene: chunky pixel border (navy and white, Capital One red accent), a name plate tab "Cap", pixel text, letter-by-letter reveal with a soft blip per letter (off by default, toggle in Settings, never on during read aloud), a blinking ▼ when the line is done, tap or Enter to finish the line or go on
- [ ] Long messages page inside the box (two to four lines a page, ▼ between pages), never scroll inside the box
- [ ] Choices appear as a game menu inside or just above the box: a pixel ▶ cursor, up and down keys or tap, 44 pt rows. Text input opens as a pixel text field in the same box; the mic button sits beside it
- [ ] Data moments get a small game window above the dialogue box, like an item pop-up: for a reason, the one key fact ("79% of your limit used") with a pixel health bar and its word (Good / Watch / Problem, never colour alone); for a step, its date and title; for the projection, a tiny pixel chart; for the ladder, the card name. Each window has "Details" that opens the side panel at that item
- [ ] Settings button as a pixel icon in a top corner; the side panel button as a pixel notebook icon in the other top corner

### 4. Expandable side panel
- [ ] Closed by default. Opens from the notebook icon or "Details": a slide-in panel from the right on desktop (about 40% width, the scene stays visible) and a full-height sheet on iPhone that slides over the scene, closed with a swipe, the X or Esc
- [ ] Two tabs: **Chat** (the full history, every message in pixel text) and **Your plan** (all the detail cards already built: reasons with evidence and Why?, decline, steps, projection chart, card ladder, what-if). Styled as a pixel notebook or folder to match the game, not a web page
- [ ] The paper overlay and download from 114 stay as they are

### 5. Accessibility (keep every 114 check green)
- [ ] The dialogue text is real DOM text over the canvas, in the `aria-live` region; the typewriter reveal is visual only (screen readers get the whole line at once)
- [ ] Settings: "Readable font" switches all text to a clean sans; text size up to 150% (the box grows and pages more, nothing overlaps); reduced motion shows whole lines with no reveal and no slide animations; colour modes apply to the box, windows and panel
- [ ] Keyboard: Enter or space advances, arrows move the menu cursor, Tab reaches the icons and panel, Esc closes the panel

## Verification
1. `font-options.png` exists, then the chosen default is applied
2. Playwright WebKit iPhone 15 portrait and desktop 1440x900: the declined branch from Cap's card to coach; screenshots of the dialogue box, a menu, a data window, the open panel on both tabs, into `app/frontend/screens/`
3. Every 114 accessibility check still passes, plus 150% text and Readable font with the new box
4. Real backend run with no console errors; push `main` and print the phone URL

---

## RESULT (filled in by Claude Code)
- Status:
- Time taken:
- Font chosen and why:
- What was built:
- Files changed:
- Verification run and output:
- Open issues / follow-ups:
