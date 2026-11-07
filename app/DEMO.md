# Demo path

Read by `/demo-check`. Keep this current from the first working screen.

## Start command
From the repo root (`pnpm install` once): `pnpm dev`. It starts the backend (port 8000, see "Backend (handoff 113)" below) and the frontend on the real backend (port 5173, `--host`; the phone opens the frontend's `Network:` URL). Ctrl+C stops both.

Separately, two terminals: `pnpm --filter backend dev`, and `cd app/frontend && VITE_USE_MOCK=false pnpm dev`.

No backend? `cd app/frontend && pnpm dev` runs the whole chat on the mock conversation (Priya), which is the default.

## Steps (the live demo, 115: declined branch with Priya; the full script with every line is `deliverables/pitch/demo-script.md`)
1. Phone, portrait, `http://<Mac LAN IP>:5173/`. Cap slides his business card across the desk and it fills the screen: tap it to put it away. Settings (top right) → **Plain English** on
2. **Nice to meet you, Cap!** → **I've been declined already**
3. **Use a sample** three times: Priya's letter, her report, her bank data (demo mode picks Priya)
4. The decline first: likely reasons ranked, the one fix, when to reapply, your rights. **What can I do?** → three first steps
5. Four questions: **The Balance Transfer card**, **3 months**, **Yes, I can**, **No**. He thinks, then the diagnosis: tap **Why?** on a reason
6. **Sum it up for me**: the summary slides across the desk (tap it for the PDF)
7. **Make me a plan** → **3 months** (**Skip to end**): the projection chart, the card ladder
8. What-if: type or say "what if I pay 300 a month?", or **Sliders**
9. Read aloud on its own: Settings → **Read replies aloud** (he says "I'll read my replies aloud."), then tap **What if I pay £400 a month?** and let him read it
Other branches from the opening: **I've got a credit report I want help with** (Priya), **I want to get ready before I apply** (pick a card first), **I'm new to credit or new to the UK** (Mei Lin)

## Fallbacks
- If the live API is down: the app says so and offers **Use the offline demo** (the mock conversation, no backend). Or open `http://<Mac LAN IP>:5173/?mock=on`
- Backend without network: `DEMO_OFFLINE=true` (see below)
- Recorded backup: 

## NPC concept on the iPhone (handoff 109)
- Start on the Mac: `cd app/npc-concept && pnpm install && pnpm dev --host`
- Open on the phone (same wifi as the Mac): `http://<Mac LAN IP>:5173/`. Vite prints it as the `Network:` line. Get it with `ipconfig getifaddr en0`
- On 2026-11-07 at the venue that was **http://172.25.96.208:5173/** (en0). It changes with the network, so check it again before the demo
- If the phone cannot reach it, the venue wifi probably blocks device-to-device traffic: put the Mac and phone on the phone's hotspot and use the new `Network:` URL
- Portrait. Tap **Debug** (top right) for the debug panel, or tap the chip "Start the sample conversation". Tap the tray on the counter to pick a file

## Backend (handoff 113)
- Install once from the repo root: `pnpm install`
- Start: `pnpm --filter backend dev` (port 8000 on every interface; prints the LAN address). `pnpm --filter backend start` runs it without the file watcher
- No network (the offline rehearsal): `DEMO_OFFLINE=true pnpm --filter backend start`. Claude is never called: cached outputs from `app/backend/data/ai-cache.json`, then templates
- Settings come from the repo-root `.env`: `ANTHROPIC_API_KEY`, `LLM_MODEL` (default `claude-sonnet-5-5`), `DEMO_OFFLINE` (default `false`)
- Check it: `curl localhost:8000/api/health`, then `bash app/backend/scripts/curl-walk.sh` walks Priya from greet to coach
- Tests: `pnpm --filter backend test`
- Files for a live upload (all made up, in `app/backend/data/samples/`): `sample-credit-report.pdf` (Alex's report as a PDF; Claude reads it, about 8 s live, instant from the cache), `priya-bank.csv` (3 months, matches Priya's bank data), `capital-one-letter.txt` (Priya's decline letter). `app/backend/data/personas/mock-credit-report.json` uploads as a JSON report
- Before going offline, walk the demo path once with Claude on (and once with Plain English on) so `data/ai-cache.json` holds the wording; commit the cache

## Frontend (handoff 114)
- Start: `cd app/frontend && pnpm dev --host` (mock, the default) or `VITE_USE_MOCK=false pnpm dev --host` (the backend on `API_TARGET`, default `http://localhost:8000`, through the Vite proxy). Settings in `app/frontend/.env` (see `.env.example`)
- URL switches for the phone (no restart): `?mock=off` real backend, `?mock=on` mock, `?mock=error` the error state, `?mock=uploadfail` a failed upload, `?demo=1` demo mode (instant text, Priya picked for you, the agent moves on by himself)
- Port 5173 must be free: on 2026-11-07 the old `app/npc-concept` dev server from the main checkout was still on it. Stop it (Ctrl+C in its terminal) before starting the frontend
- Checks: `node scripts/walk.mjs` (whole flow, WebKit iPhone 15, screenshots in `app/frontend/screens/`; flags `--keyboard`, `--reduced`, `--text 150`, `--colour okabe|contrast`, `--desktop`, `--live`, `--base <url>`), `node scripts/checks.mjs` (live region, error and upload-failure states, letter at any step, read aloud, mic, settings), `node scripts/contrast.mjs` (WCAG AA for every colour pair in each colour mode)
- On the phone: the text box pins above the keyboard; the mic uses the browser's speech recognition where it exists, else it points at the keyboard's dictation key
