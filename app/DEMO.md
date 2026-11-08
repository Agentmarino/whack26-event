# Demo path

Read by `/demo-check`. Keep this current from the first working screen.

## Start for judging (iPhone hotspot)
Do this in order, about 10 minutes before judging. Every command runs from the repo root.

1. **Hotspot.**
   - On the iPhone: Settings → Personal Hotspot → **Allow Others to Join** on. Leave that screen open until the Mac has joined.
   - On the Mac: Wi-Fi menu → join the iPhone's hotspot. A USB cable to the iPhone also works and is steadier.
   - Venue wifi often blocks phone-to-laptop traffic, so use the hotspot, not the venue network.
2. **Check the Mac is on the hotspot:** `ipconfig getifaddr en0` prints `172.20.10.x` on an iPhone hotspot (172.20.10.6 on 2026-11-07). Any other address means the Mac is still on another network.
3. **No mobile data (the offline run).** On the iPhone: Settings → Mobile Data → off.
   - Not tried yet: iOS may switch Personal Hotspot off with mobile data off.
   - If it does, leave data on. With `DEMO_OFFLINE=true` the app makes no outside calls: the 2026-11-08 rehearsal saw 0 requests to other hosts and 0 outbound connections from the backend.
4. **Start the app:**
   - Offline (the safe default for judging): `DEMO_OFFLINE=true pnpm dev`. The backend line must say `Claude OFF (DEMO_OFFLINE=true: cache, then templates); 214 cached outputs` (or more).
   - Live, with Claude: `pnpm dev`. The backend line says `Claude on`.
   - Both start the backend on :8000 and the frontend on :5173 with `--host`. Ctrl+C stops both.
5. **Phone URL:** `echo "http://$(ipconfig getifaddr en0):5173/"`. Open it in Safari on the iPhone; Vite also prints it as the `Network:` line for en0.
6. **Warm and check:**
   - From the Mac: `cd app/frontend && SKIP=steps,reasons,plan NOWHY=1 node scripts/demo-walk.mjs "http://$(ipconfig getifaddr en0):5173"`.
   - It must end `TOTAL 20 taps` (about 173 s at the default text speed 1x; if you will use 2x on the phone, put `SPEED=2x ` in front of the command: about 133 s) and `requests to other hosts: 0`, with no `PROBLEM` line.
   - It also warms the backend.
7. **On the iPhone:**
   - Settings (the gear, top left): **Demo mode** on, **Plain English** on, Read aloud off, Camera **B**, Text speed **1x** (or **2x** for a demo about 40 s shorter), then **Start again**.
   - Ring/silent switch off and volume up, for the optional read-aloud beat.
   - Portrait.
8. **The demo:** `deliverables/pitch/demo-script.md`, 20 taps, about 3:10 at 1x (about 2:30 at 2x). Since 118 each line types out in one go and the box scrolls; Demo mode moves on after the whole line.

## Add to Home Screen (optional: full screen, no Safari bars)
Cap is a web app (manifest `app/frontend/public/manifest.json`, icon from Cap's pixel face). On the iPhone, after step 5 above:
1. Open the phone URL in **Safari**. It must be Safari, not a browser inside another app.
2. Tap **Share** (the square with the arrow) → scroll down → **Add to Home Screen**. The name shows as **Cap**, with his face as the icon. Tap **Add**.
3. Open **Cap** from the home screen. It runs full screen. The status bar sits over the scene; the corner icons, Cap's head and the dialogue box stay clear of the Dynamic Island and the home bar.
4. Settings inside the app are separate from Safari's, so set them again: **Demo mode** on, **Plain English** on, Camera **B**, the same Text speed, **Start again**.
- The icon remembers the exact URL (the Mac's address and port). If the hotspot gives the Mac a new address, delete the icon (press and hold → Remove App → Delete from Home Screen) and add it again from the new URL.
- If the home-screen app shows "Safari cannot open the page", the Mac's server is down or on another address. Use Safari with the new URL.

## Fallback order
1. **Offline mode** (the live backend or Claude fails, or the network goes): Ctrl+C, then `DEMO_OFFLINE=true pnpm dev`, and reload the same phone URL.
   - Every line of the demo path is cached in Claude's own words; the 2026-11-08 rehearsal matched the live walk word for word.
   - If the backend itself will not start: the app offers **Use the offline demo** (the mock conversation in the browser, no backend), or open the phone URL with `?mock=on`. It is the same flow on sample data, in the mock's own wording (not Claude's).
2. **The recorded video**, if the phone or the Mac fails.
   - **There is none in the repo yet** (checked 2026-11-08). Record one after the device rehearsal: iPhone Control Centre → Screen Recording, walk `demo-script.md` with offline mode on.
   - Keep it on the Mac and the phone, not in git (too big). Write its path here: ____

## Start command (development)
From the repo root (`pnpm install` once): `pnpm dev`. It starts the backend (port 8000, see "Backend (handoff 113)" below) and the frontend on the real backend (port 5173, `--host`; the phone opens the frontend's `Network:` URL). Ctrl+C stops both.

Separately, two terminals: `pnpm --filter backend dev`, and `cd app/frontend && VITE_USE_MOCK=false pnpm dev`.

No backend? `cd app/frontend && pnpm dev` runs the whole chat on the mock conversation (Priya), which is the default.

## Steps (the live demo: the declined branch with Priya)
The full script, with every tap and line, is `deliverables/pitch/demo-script.md`. In short, with Demo mode on (it moves on by itself and stops only where you act):
1. Put the business card away. **Nice to meet you, Cap!** → **I've been declined already**
2. **Use a sample** three times: Priya's letter, her report, her bank data
3. The decline plays by itself (likely reasons, the one fix, when to reapply, her rights). **What can I do?** → **Skip all**
4. Four questions: **The Balance Transfer card**, **3 months**, **Yes, I can**, **No**. He builds the plan and stops on Reason 1 (its **Why?** is optional) → **Skip all**
5. **Sum it up for me**: the summary slides onto the desk; tap it, then close it
6. **Make me a plan** → **3 months** → **Skip all**
7. **What if I pay £400 a month?**

Other branches from the opening: **I've got a credit report I want help with** (Priya), **I want to get ready before I apply** (pick a card first), **I'm new to credit or new to the UK** (Mei Lin).

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
- URL switches for the phone (no restart): `?mock=off` real backend, `?mock=on` mock, `?mock=error` the error state, `?mock=uploadfail` a failed upload, `?demo=1` demo mode (Priya picked for you; each line types out, then Cap moves on by himself and stops where you act), `?framing=A|B|C|full` the camera (B is the default)
- Port 5173 must be free: on 2026-11-07 the old `app/npc-concept` dev server from the main checkout was still on it. Stop it (Ctrl+C in its terminal) before starting the frontend
- Checks: `node scripts/walk.mjs` (whole flow, WebKit iPhone 15, screenshots in `app/frontend/screens/`; flags `--keyboard`, `--reduced`, `--text 150`, `--readable`, `--colour okabe|contrast`, `--desktop`, `--live`, `--speed 1x`, `--base <url>`, `--out <dir>`), `node scripts/checks.mjs` (live region, error and upload-failure states, letter at any step, read aloud, mic, settings; `--desktop`), `node scripts/typing.mjs` (118: a line types out whole and the box scrolls a line at a time, tap to finish, reduced motion scrolling and its indicator, 125%/150%/Readable, the speech bubble, Demo mode's pause; `--desktop`), `node scripts/contrast.mjs` (WCAG AA for every colour pair in each colour mode)
- On the phone: the text box pins above the keyboard; the mic uses the browser's speech recognition where it exists, else it points at the keyboard's dictation key

## Rehearsals
- **2026-11-08 ~02:45, offline, on the Mac, after 118 (continuous typing)** (`app/frontend/scripts/demo-walk.mjs`):
  - **Stack:** as below: backend `PORT=8001 DEMO_OFFLINE=true ANTHROPIC_API_KEY=` ("Claude OFF (DEMO_OFFLINE=true: cache, then templates); 218 cached outputs"), frontend `VITE_USE_MOCK=false API_TARGET=http://localhost:8001 vite --port 5174 --host`, walked on the LAN URL http://172.20.10.6:5174/ (en0 on the iPhone hotspot this time).
  - **Result:** iPhone 15 at text speed 1x `TOTAL 20 taps, 173.1s`; at 2x `TOTAL 20 taps, 133.3s`; desktop 1440x900 at 1x (`DESKTOP=1`) `TOTAL 20 taps, 174.5s`. Every run exit 0, no PROBLEM line, `requests to other hosts: 0`. Demo mode said `hold` at the Why? moment and at the paper once their lines had typed, and stayed past their reading pause.
  - **Not done, needs the phone:** Safari on the iPhone itself, mobile data off.
- **2026-11-08 ~01:00, offline, on the Mac** (`app/frontend/scripts/demo-walk.mjs`, WebKit iPhone 15 profile):
  - **Stack:** a second stack beside `pnpm dev`. The backend ran with `PORT=8001 DEMO_OFFLINE=true ANTHROPIC_API_KEY=` and printed "Claude OFF (DEMO_OFFLINE=true: cache, then templates); 214 cached outputs". The frontend was `VITE_USE_MOCK=false API_TARGET=http://localhost:8001 vite --port 5174 --host`.
  - **URL walked:** the LAN address http://100.65.209.5:5174/ (en0), the way a phone reaches it.
  - **Result:** `TOTAL 20 taps, 113.3s`, exit 0, no PROBLEM line. Demo mode held at the Why? moment and at the paper; the paper PDF opened.
  - **No network:** 0 requests from the page to any other host, and 0 outbound connections from the backend process (`lsof` every second during the walk).
  - **Same words:** every page matched the live walk's word for word, so all of the demo path is in `ai-cache.json` and no line fell back to a template. Page breaks: 46, 0 mid-clause.
  - **Not done, needs the phone:** the Mac was not on the iPhone hotspot (en0 was 100.65.209.5, not 172.20.10.x), mobile data was not switched off, and the walk ran in WebKit, not Safari on the phone. Do the device run with the steps under "Start for judging".
