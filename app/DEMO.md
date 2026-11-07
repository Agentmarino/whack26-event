# Demo path

Read by `/demo-check`. Keep this current from the first working screen.

## Start command
`<command that starts the app>`

## Steps (the 2 minute live demo)
1. 
2. 
3. 

## Fallbacks
- If the live API is down: 
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
