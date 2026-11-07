---
id: 117
title: Cap closer, framing options, speech bubble fallback, demo-mode auto-advance
status: ready
owner: mihael
concept: lenders-eyes
created: 2026-11-07
time-budget: 90m
---

# 117: Cap closer, framing options, speech bubble fallback, demo-mode auto-advance

## Goal
Cap fills the screen on iPhone and desktop instead of the desk. Show the user framing options, apply the default, keep the game dialogue box at the bottom where it fits and fall back to a pixel speech bubble where it does not. Also make Demo mode auto-advance so the live demo needs few taps.

## Context
- User, 2026-11-07 23:12, after seeing 116 on his iPhone and desktop: "I'd rather Cap was much closer, especially on iOS. In both desktop and iOS the desk is like 90% of the real estate. The messages can be in a speech bubble if there is not enough space at the bottom, but there still should be [a dialogue box at the bottom where there is space]"
- 116 extended the scene to fill the viewport (more ceiling above, desk front and floor below). That extension is what made the desk dominate
- Read first: 116's RESULT and session notes, `app/frontend/` scene and dialogue box code, `app/npc-concept/src/npc/` (ExtendedScene), `ART-GUIDE.md`
- The user decides design by seeing it: produce options as screenshots, then apply the recommended default

## Requirements
### Framing
- [ ] A camera/framing layer on top of the kit: choose a crop window of the native scene and a whole-number scale so that **Cap's head-to-desk-top region fills at least 55% of the visible height** on iPhone 15 portrait and at least 50% on desktop 1440x900. Crop the sides and the floor before shrinking Cap. Whole-number scaling only, no blur
- [ ] The desk stays visible as a thin strip with his hands, keyboard and the tray; the desk front panel and floor mostly out of frame (only what the dialogue box does not cover)
- [ ] Keep the Capital One logo visible: if the crop cuts the desk monitor, move the monitor into frame for that layout (a kit layout variant, both kit copies identical, ART-GUIDE updated), or let it sit partly behind Cap's shoulder. Say which in RESULT
- [ ] Produce `app/frontend/screens/117-framing-options.png` with three framings side by side on iPhone 15 and below them on desktop: (A) head and shoulders plus desk strip, (B) waist up with the desk strip and monitor, (C) the tightest that still shows his hands on the keyboard. Default to B unless A or C is clearly better; switchable in the debug panel so the user can pick after
- [ ] Gestures that reach the desk (receive document, slide paper, slide card) still read in the chosen framing; the card and paper still end where the user can tap them

### Dialogue box and speech bubble
- [ ] The game dialogue box stays at the bottom whenever at least 3 lines of Press Start 2P plus the name plate fit below Cap's chin line. Otherwise (short landscape screens, large text sizes, keyboard open) the line shows as a pixel speech bubble beside or above Cap's head, with the tail pointing at his mouth, same font and paging rules
- [ ] Choices and the text field stay pinned at the bottom in both modes and never cover Cap's face

### Demo mode auto-advance
- [ ] In Demo mode each page advances by itself after a reading pause (about 250 ms per word, minimum 1.2 s; 2.5 s on pages with an item window) and stops only at choices, the paper, the business card and the "Why?" moment. A tap still skips ahead. Outside Demo mode nothing changes
- [ ] Re-walk the declined branch for Priya on the live stack and rewrite `deliverables/pitch/demo-script.md`: target at most 20 taps and about 2:00

### Keep
- [ ] Every 114/116 accessibility check still passes (live region, keyboard, reduced motion, 150% text, readable font, colour modes)
- [ ] Commit the uncommitted ai-cache.json entry

## Verification
1. `117-framing-options.png` exists and you looked at it; the default applied
2. Playwright WebKit iPhone 15 portrait, iPhone landscape, desktop 1440x900 and a short desktop window (1280x720): screenshots of a long line, a choice, an item window and the paper, into `app/frontend/screens/117-*`; at least one shows the speech bubble fallback
3. Measured share of visible height for Cap's head-to-desk-top region in each, written in RESULT
4. Demo mode walk: tap count and duration in RESULT; all accessibility checks pass; real backend, no console errors
5. Push `main`; print the phone URL for the hotspot (`ipconfig getifaddr en0`, currently 172.20.10.6)

---

## RESULT (filled in by Claude Code)
- Status:
- Time taken:
- Framing chosen and measurements:
- Logo placement:
- Demo mode: taps and duration:
- Files changed:
- Verification run and output:
- Open issues / follow-ups:
