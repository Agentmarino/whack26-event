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
| Impeccable (pbakaus/impeccable, Apache 2.0) | Claude Code design skill: UI design, critique, polish | partner |
| Playwright MCP (@playwright/mcp) | Lets Claude Code open and screenshot the app to check the UI | partner, mihael (108 visual and accessibility checks) |
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

## APIs and data
| API / dataset | Used for | Terms checked |
|---|---|---|

## Products and assets
| Item | Used for | Source / licence |
|---|---|---|
| Press Start 2P font by CodeMan38 | 108 dialogue box and page heading | https://fonts.google.com/specimen/Press+Start+2P via https://fontsource.org/fonts/press-start-2p, SIL Open Font License 1.1 |
| Pixel art: credit agent, stand, hall, props, pixel font for the wordmark | 108 NPC concept | Drawn by us in code during the event (`app/npc-concept/src/npc/`). No outside art assets |
| "Capital One" name and navy/red colours | 108 stand placeholder wordmark and palette | Capital One branding allowed by the team (handoff 108). The wordmark is plain pixel text, not their logo; swap for the official asset. Hex values are approximations |
