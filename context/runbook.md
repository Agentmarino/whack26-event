# Day-of runbook (two people)

M = Mihael, P = partner. Draft, finalised by Fri 6 Nov.

## Sat 7 Nov
- 09:00 arrive, power, wifi, both laptops: `claude` starts, `gh auth status` ok, `.env` keys work
- 10:00 opening: capture every brief word for word (both of you, then compare)
- 10:15 to 10:45 triage with `context/triage.md`. Decide by 10:45. No revisiting after 13:00
- 10:45 M runs `/event-switch <concept>` (or `generic`) at the keyboard: the event repo is created with handoffs 101+ already in it. P accepts the invite, clones, copies `.env` and `CLAUDE.local.md`
- 10:50 Cowork edits 101 and 102 for the brief wording, M pushes. 101 (skeleton, owner M) and 102 (data in, owner P) state the interface between them
- 11:00 build starts
- 13:00 to 16:00 one of us attends our sponsor's talk and asks what they would love to see
- Merge every 2 to 3 hours: M merges and runs `/demo-check`
- 15:00 checkpoint: core loop works end to end, or cut scope
- 19:00 checkpoint: MVP feature complete
- 19:30 dinner. 21:00 CTF / 22:30 1 Hour Hackathon only if on track
- Sleep in shifts: one of us is always awake and on the build

## Sun 8 Nov
- 07:00 feature freeze. Fixes and polish only, each checked with `/demo-check`
- 08:00 screenshots, recorded demo backup, Devpost draft (`/devpost`)
- 09:30 pitch rehearsal x3, timed, `pitch-critic`
- 10:30 submit. Do not wait for 11:00
- 12:30 pitch: 5 min, demo first, story second
