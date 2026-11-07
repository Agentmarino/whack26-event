# WHACK 26 event build

Hackathon build for WHACK 26 (Warwick, 7 to 8 Nov 2026). Team of 2, each running their own Claude Code session. 24 hours, judged on a 5 minute live demo. Speed and a working demo beat elegance.

## How work arrives
- Concept: lenders-eyes. Prep pack in `prep/lenders-eyes/`.
- Work comes as handoff files in `handoffs/NNN-*.md`. Use `/handoff NNN` to start one.
- Each handoff has an `owner`. Only take handoffs owned by the person running this session. Who that is comes from `CLAUDE.local.md` (one line: `I am mihael` or `I am partner`). If that file is missing, ask once and offer to create it.
- Do only what the handoff asks. Anything out of scope goes in the RESULT as a follow-up.
- When done, fill in the RESULT section and set its status in the handoff file. Mihael updates `handoffs/INDEX.md` when merging.
- Do not edit `context/`. It is copied from Mihael's planning vault and gets overwritten.

## Working rules
- Plan first for anything touching more than one file. Skip planning for one-line changes.
- Always run the handoff's verification and paste the real output into RESULT. Never claim success without evidence.
- Before marking a handoff done, use the `reviewer` agent on the diff.
- Commit after each working step with a clear message. Small commits, so we can roll back during the event.
- Work on your own branch `<owner>/NNN` and only in the folders your handoff names. Never push to `main` except the status flip in `/handoff` step 3. The only other pushes to `main` are Mihael's merges and new handoffs.
- Secrets go in `.env` (gitignored). Never commit keys. Keep `.env.example` current.

## Layout
- `app/`: the event build lives here. All code goes in `app/`
- `handoffs/`: handoffs, `INDEX.md`, `_TEMPLATE.md`
- `context/`: event rules, sponsors, kept problems, playbooks (read-only)
- `prep/<concept>/`: plain-English prep packs. No code
- `templates/`: plain-text templates that handoff 101 copies into `app/`
- `deliverables/`: Devpost and pitch drafts

## Competition rules (disqualification if broken)
- IMPORTANT: no code may be written for the event build before 11:00 Sat 7 Nov. Only public open-source libraries can be pulled in.
- Log every library, API, product and AI use in `app/DISCLOSURES.md` as you go (what, where, why)
- Hacking stops at 11:00 Sun 8 Nov

## Stack (decided 2026-11-06, change only together)
- Backend (Mihael): Python + FastAPI in `app/backend/`, uv
- Frontend (partner): Vite + React + TypeScript + Tailwind in `app/frontend/`, pnpm. Design with Impeccable, check with Playwright MCP
- LLM: Claude API via the anthropic SDK, model name in one config line
- Contract between them: `app/CONTRACT.md` (written by handoff 101)

## Demo rule
IMPORTANT: from 07:00 on day 2, the demo path must never be broken. Only fixes and polish, each one checked with `/demo-check` before commit.
