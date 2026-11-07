# Disclosures

Required by the WHACK Code of Conduct. Missing a disclosure means disqualification. Add a line the moment something is used.

## Prepared before the event
- Ideas, research, specs, handoffs, prompts, data and plain-English Claude Code instructions (CLAUDE.md, skills, agents) were prepared before 11:00 Sat 7 Nov
- No code in this project was written before the start. Practice builds before the event were thrown away and nothing from them was copied

## Generative AI
| Tool | Used for | Who |
|---|---|---|
| Claude Code | Writing code from our handoffs | both |
| Claude | Planning, handoffs, copy | |
| Claude API (Anthropic) incl. web search tool | AI calls in the backend | mihael |
| Impeccable (pbakaus/impeccable, Apache 2.0) | Claude Code design skill: UI design, critique, polish | partner; mihael (114: `audit` with its `impeccable detect` checker on the source and the running page, then a polish pass) |
| Playwright MCP (@playwright/mcp) | Lets Claude Code open and screenshot the app to check the UI | partner, mihael (108 visual and accessibility checks) |
| Playwright library 1.56.1 (Apache-2.0) with WebKit 26 (`iPhone 15` profile) and Chromium headless shell | 109: screenshots of every state, emote and gesture, contact sheets and the iPhone/desktop checks. Run from a script outside the repo; not part of the app | mihael |
| Pillow 12.1.1 (Python, MIT-CMU) | 109: builds the contact sheets and the pixel test (every scaled block one flat colour). Outside the repo | mihael |
| Playwright library and Pillow (same versions as above) | 110: art-direction rounds (`screens/compare-roundN.png`, local only, not committed because they show the reference images), contact sheets, `options.png`, `backgrounds.png`, iPhone/desktop checks. Run from scripts outside the repo | mihael |
| Sprite design script (Python + Pillow, written by Claude Code during the event, kept outside the repo) | 110: builds the agent's sprite rows from simple shapes (fills, outside outline, mirrored collar) and writes `app/npc-concept/src/npc/sprites/art.ts`; the TS file is the source of truth | mihael |
| Sprite design script, Playwright library and Pillow (same as above) | 111: the head parts redrawn with longer proportions (a second design script reusing the 110 one, outside the repo), contact sheets, `default.png`, `options.png`, `backgrounds.png`, iPhone/desktop checks; `screens/compare-face.png` is local only (shows the reference image) | mihael |
| claude-pxl (crsolver/claude-pxl, MIT) and pixel-mcp (willibrandon/pixel-mcp, MIT) | 110: checked as pixel-art tools, licences read on GitHub. Not used: pxl is a second sprite format with a PNG build step (our rig composes palette-indexed layers at runtime); pixel-mcp needs Aseprite, which is not installed. The idea of authoring sprites as code with an automatic outside outline is common to pxl and our design script | mihael |
| Claude (Cowork) | Credit engine (`engine.js`, rules, cards, personas) written 2026-11-07 during the event by Jag with Claude (Cowork). Point figures from Experian via Which?, card data from capitalone.co.uk and ClearScore (Aug 2026); assumptions labelled in rules.json (correction from 112: there is no rules.json; rules, cards and assumptions are labelled inside `engine.js`). Copied unchanged into `app/backend/engine/engine.js` by handoff 112 | partner |
| Claude Code web search | 108: looked for a pixel-art Claude Code skill. Candidates found (all MIT): sprite-forge (tdimino/claude-code-minoan), pixel-art (wanshuiyin/Auto-claude-code-research-in-sleep), pixel-art-sprites (AbsolutelySkilled). None used, see handoff 108 RESULT | mihael |

## Libraries
| Library | Version | Used for |
|---|---|---|
| react, react-dom (MIT) | 19.3.1 | 108 NPC concept page (`app/npc-concept/`) |
| vite (MIT) | 8.3.6 | 108 dev server and build, scaffolded with create-vite 9.3.4 (`react-ts` template) |
| @vitejs/plugin-react (MIT) | 6.2.1 | 108 React support in Vite (scaffold default) |
| typescript (Apache-2.0) | 7.0.2 | 108 type checking (scaffold default) |
| oxlint (MIT) | 1.91.0 | 108 linting (scaffold default) |
| @types/react, @types/react-dom, @types/node (MIT) | 19.3.0, 19.3.0, 24.19.2 | 108 type definitions (scaffold defaults) |
| @fontsource/press-start-2p (package MIT, font OFL-1.1) | 5.3.0 | 108 self-hosted Press Start 2P font for the dialogue box |
| Transitive packages of the above | see `app/npc-concept/pnpm-lock.yaml` | Installed by pnpm, not used directly |
| zod (MIT) | 4.6.7 | 112 shared contract: schemas and validation used by backend and frontend (`app/shared/`, `app/backend/`) |
| fastify (MIT) | 5.12.8 | 113 backend HTTP server (`app/backend/src/app.ts`): every `/api` route |
| @fastify/cors (MIT) | 11.4.1 | 113 CORS for the Vite dev server on localhost and the phone's LAN address |
| vitest (MIT) | 5.1.0 | 113 backend tests (`app/backend/test/`), run with `pnpm --filter backend test` |
| @anthropic-ai/sdk (Apache-2.0) | 1.6.0 | 113 Claude API client (`app/backend/src/claude.ts`): what-if text to engine levers, wording, document reading |
| @fastify/multipart (MIT) | 10.1.8 | 113 `POST /api/upload`: reads the uploaded file (report, bank statement, letter) |
| pdfkit (MIT) | 0.20.2 | 113 `GET /api/paper/:sessionId.pdf`: the one- to two-page summary PDF (`app/backend/src/paper.ts`); also makes the sample PDF report for the upload test |
| @types/pdfkit (MIT) | 0.17.7 | 113 type definitions for pdfkit |
| typescript (Apache-2.0) | 7.0.2 | 112 type checking of `app/shared/` and `app/backend/` |
| tsx (MIT) | 4.23.15 | 112 runs the TypeScript scripts (`make-examples.ts`, `mock-walk.ts`); 113 dev server |
| esbuild (MIT) | 0.28.2 | 112 installed by tsx (its build script allowed in `pnpm-workspace.yaml`), not used directly |
| @types/node (MIT) | 26.6.6 | 112 Node type definitions for `app/shared/` and `app/backend/` |
| react, react-dom (MIT) | 19.3.1 | 114 frontend (`app/frontend/`) |
| vite (MIT), @vitejs/plugin-react (MIT) | 8.3.6, 6.2.1 | 114 frontend dev server, `/api` proxy and build (config written by hand, same versions as 108) |
| tailwindcss, @tailwindcss/vite (MIT) | 4.3.5 | 114 frontend styling (Tailwind v4 via the Vite plugin) |
| typescript (Apache-2.0), @types/react, @types/react-dom, @types/node (MIT) | 7.0.2, 19.3.0, 19.3.0, 26.6.6 | 114 frontend type checking |
| @fontsource/press-start-2p (package MIT, font OFL-1.1) | 5.3.0 | 114 pixel font for the name tag, buttons and headings |
| @fontsource/atkinson-hyperlegible (package MIT, font OFL-1.1) | 5.3.0 | 114 readable font for every message and card (Braille Institute's legibility font) |
| playwright (Apache-2.0) | 1.56.1 | 114 dev only: `app/frontend/scripts/walk.mjs` walks the chat in WebKit (`iPhone 15` profile) and Chromium 1440x900 and saves the screenshots in `app/frontend/screens/`. Not in the app |
| Transitive packages of the workspace | see `pnpm-lock.yaml` at the repo root | Installed by pnpm, not used directly |

## APIs and data
| API / dataset | Used for | Terms checked |
|---|---|---|

## Products and assets
| Item | Used for | Source / licence |
|---|---|---|
| Press Start 2P font by CodeMan38 | 108 dialogue box and page heading | https://fonts.google.com/specimen/Press+Start+2P via https://fontsource.org/fonts/press-start-2p, SIL Open Font License 1.1 |
| Atkinson Hyperlegible font by the Braille Institute | 114 message and card text | https://www.brailleinstitute.org/freefont/ via https://fontsource.org/fonts/atkinson-hyperlegible, SIL Open Font License 1.1 |
| Web Speech API (SpeechRecognition) and speechSynthesis, built into the browser | 114 voice in (en-GB dictation) and "read replies aloud"; nothing is sent by our code, the browser's own service handles it | Browser built-ins, no key or account |
| NPC kit (`app/npc-concept/src/npc/`) and the Capital One logo file | 114 copied unchanged into `app/frontend/src/npc/` and `app/frontend/public/brand/` | Our own code from 108 to 111; logo as in the rows above |
| Pixel art: credit agent, stand, hall, props, pixel font for the wordmark | 108 NPC concept | Drawn by us in code during the event (`app/npc-concept/src/npc/`). No outside art assets |
| Pixel art redraw: chunky businessman agent, close-up stand, counter props | 109 NPC art pass | Drawn by us in code during the event (`app/npc-concept/src/npc/`). Original character; the style brief named a generic "pixel detective" sprite look only. No outside art assets |
| Pixel art redraw: friendly businessman at a desk, glass wall office with colleagues (day and evening), desk, monitor, keyboard, mug, plant, in-tray, facial hair layer | 110 NPC art direction pass | Drawn by us in code during the event (`app/npc-concept/src/npc/`). Original character. The user's reference images (two avatar style refs, a composition frame, two detail frames) were used for style and framing only; they are gitignored in `app/npc-concept/refs/`, never shown in the app, and nothing was traced or copied from them |
| "Capital One" name | 109 stand wordmark (plain pixel text in our own font) | Capital One name used with the sponsor's permission for their challenge. No logo file added yet; add a logo row here once `app/npc-concept/public/brand/capital-one-logo.svg` or `.png` is added |
| "Capital One" name and navy/red colours | 108 stand placeholder wordmark and palette | Capital One branding allowed by the team (handoff 108). The wordmark is plain pixel text, not their logo; swap for the official asset. Hex values are approximations |
| Capital One logo (official file app/npc-concept/public/brand/capital-one-logo.png) | 109 wordmark layer, 110 desk monitor | Capital One name and logo used with the sponsor's permission for their challenge. Shown unchanged, never redrawn or traced |
