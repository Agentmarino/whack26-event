---
id: 108
title: Pixel-art NPC credit agent, first concept (character rig, animation states, stand scene)
status: in-progress
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
- Status:
- Time taken:
- What was built:
- Files changed:
- Verification run and output:
- Pixel-art skill: found / licence / used or not
- Follow-ups needed after the first prompt (prompt deltas):
- Open issues / follow-ups:
