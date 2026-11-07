---
id: 107
title: Demo path solid, polish, DEMO.md, offline rehearsal, video, screenshots
status: ready
owner: partner
concept: lenders-eyes
created: 2026-11-06
time-budget: 2h
---

# 107: Demo path solid, polish, DEMO.md, offline rehearsal, video, screenshots

## Goal
The 90-second demo runs the same way every time, online and offline. The UI is polished and audited, `app/DEMO.md` has the exact steps and fallbacks, a recorded backup video exists, and the Devpost screenshots are taken.

## Context
- Read first: `prep/lenders-eyes/demo-script.md` (the click-by-click script and lines), `prep/lenders-eyes/spec.md` sections "Fallbacks" and "Cut list", `app/DEMO.md`, `.claude/skills/demo-check/SKILL.md`
- Starts after: 104 and 105 (and 106 if it is being built; do the advice steps only if it is merged)
- Interface: `app/CONTRACT.md`, unchanged. No backend changes in this handoff; if something in `app/backend/` is wrong, tell Mihael
- Env vars: backend `DEMO_OFFLINE`; frontend `VITE_USE_MOCK`, `API_TARGET`, `VITE_SHOW_ADVICE`
- Devpost text is written later with `/devpost`, not here

## Requirements
- [ ] `/impeccable polish`, then `/impeccable audit`, across Start, Lender view, drawer, Plan, After (and Advice if built). Fix everything a judge would see: overflow, clipping, contrast, alignment, focus states, 390px layout of the main screen and the drawer
- [ ] Check the copy on every screen against the spec: "Synthetic" badge, "Illustrative rules, not a real lender's model", the footer line, no Capital One branding, no score numbers, dates as `YYYY-MM-DD`
- [ ] `app/DEMO.md`:
  - Start commands (backend, frontend) and the warm-up step from 105
  - The demo steps from `prep/lenders-eyes/demo-script.md`, as numbered clicks with what must be visible
  - Fallbacks: (1) Claude slow or down: restart the backend with `DEMO_OFFLINE=true`; (2) backend down: frontend with `VITE_USE_MOCK=true`; (3) everything down: play the backup video at `app/demo/backup.mp4` (the path is in `.gitignore`, so the file stays on the laptop and is never committed; DEMO.md says which laptop has it)
  - Laptop-to-laptop (fallback only): on the backend laptop start the backend with `cd app/backend && uv run uvicorn main:app --reload --host 0.0.0.0 --port 8000` (the normal start command binds to 127.0.0.1 and cannot be reached from another laptop); on the frontend laptop set `API_TARGET=http://<backend laptop IP>:8000` and still open `http://localhost:5173`. The normal start command stays as it is
- [ ] Offline rehearsal with Mihael: backend `DEMO_OFFLINE=true`, Wi-Fi off, frontend `VITE_USE_MOCK=false`. Run the whole script twice. Record the time per step and any stumble in RESULT
- [ ] Record the backup video (macOS screen recording, 1440px window, about 90 seconds, no audio needed) of the full path online. Save it as `app/demo/backup.mp4`, add `app/demo/backup.mp4` to the repo's `.gitignore` (never commit the video), and add the path to `app/DEMO.md`
- [ ] Devpost screenshots at 1440px, saved in `deliverables/devpost/screenshots/` (`/event-switch` creates `deliverables/devpost/`; create `screenshots/` inside it): `01-declined.png` (Lender view), `02-evidence.png` (drawer on R-UTIL), `03-plan.png`, `04-approved.png` (After view), `05-mobile.png` (Lender view at 390px), plus `06-advice.png` if the add-on is built
- [ ] Run `/demo-check` and paste its pass/fail per step into RESULT
- [ ] Commit after each working step

## Out of scope
- New features, new screens, backend changes
- Devpost text (`/devpost` later), the pitch deck

## Verification
1. `/demo-check` passes every step in `app/DEMO.md`
2. Playwright MCP, real backend online: walk the script and screenshot each step at 1440px (Start, Lender view, drawer, Plan, After) and the Lender view at 390px. What must be visible is listed per step in `demo-script.md`
3. Offline: backend with `DEMO_OFFLINE=true`, Wi-Fi off. Same walk, same numbers, reasons tagged "Explained by Claude, checked against your data" (from the cache). Screenshot the Lender view
4. Mock: frontend with `VITE_USE_MOCK=true`, backend stopped. Same walk works. Screenshot the After view
5. The video plays end to end, and `git check-ignore app/demo/backup.mp4` prints the path (it is ignored). `ls deliverables/devpost/screenshots/` lists the five (or six) files
6. Paste the `/impeccable audit` summary and the timings from the rehearsal into RESULT

---

## RESULT (filled in by Claude Code)
- Status:
- Time taken:
- What was built:
- Files changed:
- Verification run and output:
- Follow-ups needed after the first prompt (prompt deltas): what extra guidance was needed, or "none"
- Practice review (practice runs only, fill in as you go; Cowork turns it into `prep/<concept>/review.md`):
  | Component | Planned | Actual | What took the time |
  |---|---|---|---|
  | Setup (repo, env, keys) | | | |
  | Data in (API / fixtures) | | | |
  | Core logic | | | |
  | AI parts (prompts, parsing) | | | |
  | UI | | | |
  | Demo path polish | | | |
  | Devpost, screenshots, pitch | | | |
  - Files Claude read, and how many times:
  - Files read but not needed:
  - Context used at the end of the session (`/context`):
- Open issues / follow-ups:
