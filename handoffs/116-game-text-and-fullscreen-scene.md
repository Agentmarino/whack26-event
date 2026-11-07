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

## Session notes: pick up here (first session ran out of context, 2026-11-07 ~21:30)
Work is on `main`, **all uncommitted** apart from `044883f` (handoff + INDEX row). Nothing pushed. Start with `git status` and `git diff --stat`; commit in small steps once each part is verified.

### Also asked by the user for this handoff
- Fix the 150% text overlap on the goals question inside the new dialogue box: the menu must page instead of covering the question. **Built** (see "Menu" below); still to verify with screenshots.
- After 116: re-walk `deliverables/pitch/demo-script.md` on the live stack and update any taps or timings the new layout changes.
- Show the `font-options.png` path as soon as it exists (**done**: `app/frontend/screens/font-options.png`, untracked).
- Push `main` when verified and print the phone URL (`http://$(ipconfig getifaddr en0):5173/`; it was `http://100.65.209.5:5173/`).

### Done (uncommitted, typechecks clean as of the last run: `pnpm --filter frontend typecheck`)
- **Fonts**: `@fontsource/vt323` and `@fontsource/pixelify-sans` 5.3.0 (OFL-1.1) added to `app/frontend/package.json`, imported in `src/main.tsx`. `font-options.png` (rendered from a scratch HTML page) compares Pixelify Sans, VT323 and Press Start 2P. **Chosen default: VT323**: the most readable at dialogue size (tall x-height, simple monospaced shapes, "79%"/"£1,200" unambiguous); Pixelify's bold C reads like an O and some glyphs are quirky; Press Start 2P is the widest, so the fewest words per line. **Still to do: list both new fonts in `app/DISCLOSURES.md`.**
- **Settings** (`src/settings.tsx`, `src/sheets/SettingsSheet.tsx`): `font: 'vt323' | 'pixelify' | 'arcade'` (Game font choice), `readable` (Readable font toggle, testId `toggle-readable`), `blip` (Letter sound toggle, testId `toggle-blip`, primes WebAudio on tap). `<html data-font>` is `readable` or the font id; CSS swaps `--font-game` / `--font-body` / `--font-pixel` and uses `font-size-adjust` to even out pixel font sizes.
- **`src/game/blip.ts`**: a short square-wave blip per letter, never during read aloud (App checks `settings.blip && !settings.readAloud && !reduced`).
- **`src/game/GameBox.tsx`**: the RPG box (name plate "Cap", red accent, navy and white border). Pages the current line by measuring words into 2–4-line pages with a hidden measurer (a 1–2-word last page folds back). Per-page typewriter (in App, via the kit's `useTypewriter` keyed `msgKey:page`), blinking ▼, the tap-to-explain row, status lines (`data-testid` `pending` / `error`, `data-entry="notice"`), and the one-line disclaimer (`data-testid="disclaimer"`). It computes `rowsFit` for the menu from the box's room, and if the box still overflows it takes one row off the menu page and re-measures (the 150% fix). Children are a render function `(rowsFit) => <Dock …/>`. The section carries `data-current`, `data-kind`, `data-message-id` and `data-page`.
- **`src/chat/Dock.tsx`** is now the input area inside the box. It keeps `data-testid="dock"`, `data-mode` and every old `data-action`/`data-chip`.
  - New **`Menu`**: rows with a ▶ cursor on the active row; arrow keys, Home and End; every row is still a Tab stop. Paging: `pageSize` counts rows (two columns = two choices a row), plus a `More ▶ (n/m)` row (`data-action="menu-more"`) and `◀ Back` (`menu-back`).
  - Goals use two columns only when `innerWidth >= 600` and not at 150%.
  - With choices on screen, typing is a menu row "Type or say my own" (`data-action="type-own"`) that opens the pixel field `#reply-box` with the mic, Send and "◀ Back" (`type-back`). Sliders is a menu row after the chips (`whatif-sheet`).
- **`src/game/DataWindow.tsx`**: the item window floats above the box (absolute, right, ≤60% width, `data-testid="data-window"`).
  - Content per kind: reason (key fact like "79% of your £1,200 limit used", a 10-block health bar, and the word Good / Watch / Problem; `RAG_WORD` changed to these in `src/ui/Health.tsx`), step (date and title), projection (tiny pixel bar chart and range), ladder (card name), decline (lender and top reason, or the fix / reapply), what-if (before → after), paper ("Read it", `open-paper`).
  - Buttons: "Details" (`data-action="details"`, opens the panel's plan tab at that item) and, on reasons, "Why?" (`data-action="why"`).
- **`src/game/SidePanel.tsx`**: the notebook (`data-testid="side-panel"`), always mounted (inert and aria-hidden when closed).
  - Tabs: Chat (`tab-chat`, every entry through `HistoryEntry`) and Your plan (`tab-plan`, each card once, the latest per ref, `data-item={msgId}`).
  - Desktop: 40% on the right, and the scene stage shrinks to 60%. Phone: a full-height sheet.
  - Closes with the X (`panel-close`), Esc or a swipe right/down. Also exports `GearIcon` and `NotebookIcon`.
- **`src/App.tsx`**: the full-screen `.game` layout (root class is now `.game`, not `.app`).
  - Top corners: settings gear (`data-action="settings"`) and the letter button (left); the notebook (`data-action="panel"`, right).
  - The HUD (`.game__hud`, bottom, max-width 46rem) holds the DataWindow and the GameBox.
  - Scale rule: `scale = min(floor(stageW/NATIVE_W), floor((vp.h - minBox)/NATIVE_H))` with `minBox` = 40% of the height (48% at 125%, 60% at 150%, 36% on wide screens); `boxMax = vp.h - NATIVE_H*scale - 4`. Lines per page: 3 (4 when height ≥ 820; 2–3 at 150%).
  - The `NpcScene` is still placed by hand in `.game__base` (centred, bottom at `vp.h - boxMax`): **replace with `ExtendedScene` (below)**.
- **CSS** (`src/index.css`, the "116: the game screen" block at the end): `.game*`, `.gicon`, `.gbtn`, `.gbox*`, `.gmenu`/`.mrow`, `.gfield`, `.gwin*`, `.panel*`, reduced-motion rules, bigger text at ≥64rem.
- **Scripts**: `scripts/walk.mjs` and `scripts/checks.mjs` updated for the new UI.
  - Root `.game`; notices via `.gbox [data-entry="notice"]`.
  - `menuPick()` pages with More; the mic check uses `type-own`.
  - walk.mjs opens Why? from the reason's data window, then the notebook's two tabs at the end.
  - **Not yet re-run after these fixes** (the last run failed only on the old `.app`/notice selectors, now fixed).

### Done by a subagent: the full-screen scene (`ExtendedScene`), not yet wired into App
- **One kit:** both kit copies are identical (`diff -r app/npc-concept/src/npc app/frontend/src/npc` empty). The 115 kit (Portrait, slide-card, Cap wording) is now also in npc-concept. npc-concept passes `tsc -b` and `vite build`; frontend typecheck exits 0. NpcScene is unchanged and the base frame is pixel-identical.
- **New files (in both copies):** `npc/ExtendedScene.tsx` and `npc/extend.ts`.
  - `scene.ts` gains exports only (`MULLIONS`, `FROSTED`, `LIGHTS`, `LIGHT_W`, `WINDOW_BAND`, `buildings`, `shineMap`, `frostMap`, `drawTallPlant`).
  - `npc.css` gains `.npc-ext*`; `index.ts` exports `ExtendedScene`, `ExtendedSceneLayout`, `ExtendedSceneProps` and `extendedLayout`.
  - `app/npc-concept/ART-GUIDE.md` has a new section, "Extended scene (116)".
- **API:** `<ExtendedScene ref={npc} reserveBottom={px} reserveTop={px?} onLayout={({scale, base}) => …} …NpcSceneProps except scale />`.
  - It renders an absolute, inset-0 `div.npc-ext`, so its parent must be positioned.
  - Same `NpcHandle` ref; `setPalette` and `setBackground` also repaint the extension. `cardRect()` and the hotspots still come from the real NpcScene.
  - `extendedLayout(W, H, reserveTop, reserveBottom, dpr)` is pure, so App can compute the same scale.
- **Scale (device-pixel exact):** `k = max(1, min(floor(W*dpr/128), floor((H - reserveTop - reserveBottom)*dpr/96)))`, `scale = k/dpr`.
  - Horizontal: centred.
  - Vertical: a quarter of the leftover height (at most 6 native rows) goes below the base and the rest above, so the desk, monitor, tray and Cap end just above `reserveBottom`.
  - Measured: iPhone 15 with reserveBottom 230 gives scale 3 (base at y 123); 1440×900 with 260 gives scale 6.
- **Drawn:** a transom, a ceiling with lights, and a head rail above; the glass wall, office, counter and desks continuing sideways; a desk-front edge and a dark floor below. All in palette indices (day/evening work).
  - Seam test: every native block in 16 WebKit shots is one flat colour.
  - Shots: `/private/tmp/claude-501/-Users-mihaelantoniomarinovic-Desktop-WHACK-whack26-event-nosync/1b2d95c7-944e-4042-b90f-b22e9b1314db/scratchpad/scene116/shots/`.
- **Gap it reported:** the kit has no high-contrast palette. The app's colour modes are CSS only, so the scene ignores `data-colour`. Optional: add a contrast palette and call `npc.setPalette(...)` from App when `settings.colour === 'contrast'`.
- **To integrate (step 1 below):** in `App.tsx`, replace the `.game__base` / `NpcScene` block with `<ExtendedScene … reserveBottom={boxMax + 4} reserveTop={0} />` inside `.game__scene`. Drop `sceneLeft`/`sceneTop`, and make App's `scale`/`boxMax` use the same rule (use `extendedLayout` with `devicePixelRatio`, or `onLayout`). Then check that the business card still grows from `npc.cardRect()` and that the paper/tray hotspots work.

### Still to do (in order)
1. Integrate ExtendedScene (see above). Look at it on iPhone 15 (393×659) and desktop 1440×900, panel closed and open, 100% and 150%, standard and contrast.
2. Start servers:
   - `pnpm dev` from the repo root (backend :8000 + live frontend :5173 with `--host`).
   - A mock frontend: `cd app/frontend && pnpm exec vite --port 5176 --strictPort --host 127.0.0.1`.
3. Walks (all should end with 0 PROBLEM lines):
   - `node scripts/walk.mjs --base http://127.0.0.1:5176 --branch declined --cardshots --out <tmp>` on the mock;
   - `--base http://127.0.0.1:5173 --live` on the real backend;
   - `--desktop`, `--keyboard --reduced`, and `--text 150`.
   - Add a Readable font run (walk.mjs has no flag; add one, or set `readable: true` in its init settings).
   - The other three branches with `--branch`.
4. `node scripts/checks.mjs --base http://127.0.0.1:5176 --live-base http://127.0.0.1:5173`: all must pass (19 before 116). `node scripts/contrast.mjs` if colours changed.
5. Screens into `app/frontend/screens/116-*`: the dialogue box, a menu, a data window, the open panel on both tabs (iPhone and desktop), the 150% goals question paging, Readable font, and the extended scene. Look at each.
6. `app/DISCLOSURES.md`: VT323 and Pixelify Sans (OFL-1.1, @fontsource 5.3.0, 116 game font) and the font-options comparison.
7. Re-walk the demo script on the live stack and update `deliverables/pitch/demo-script.md`:
   - **Long lines now page:** each extra page is one more ▼/Next tap.
   - **Typing:** the typed what-if needs "Type or say my own" first.
   - **Why?:** now on the reason's item window.
   - **Menus:** may page ("More ▶"). The demo's chips ("I've been declined already", "The Balance Transfer card", "What if I pay £400 a month?") should be on page 1, so confirm.
   - The old driver `.../scratchpad/demo115.mjs` (absolute path above, parent folder) shows the flow; it needs the type-own tap and the new Why? location.
   - Recount every tap and timing from a real run.
8. `pnpm --filter backend test` (no backend change is expected; still 101), `pnpm typecheck`.
9. Run the `reviewer` agent on the 116 diff, fix what it finds, fill in the RESULT below, set status `done` here and in `handoffs/INDEX.md`, commit, push `main`, print the phone URL.

### Watch out for
- The AI cache (`app/backend/data/ai-cache.json`, 213 entries) covers every declined path; 116 changes no backend text, so no re-caching is needed.
- Don't edit `context/`. No backend or engine changes in this handoff.
- If a Playwright selector finds two elements: the closed notebook keeps the history in the DOM.

## RESULT (filled in by Claude Code)
- Status:
- Time taken:
- Font chosen and why:
- What was built:
- Files changed:
- Verification run and output:
- Open issues / follow-ups:
