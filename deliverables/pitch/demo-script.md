# Demo script: about 2 minutes, 20 taps, on the iPhone

Before judging:
- `pnpm dev` from the repo root, phone on the hotspot, opened on the frontend's `Network:` URL. Backend warm (one full declined walk with Priya).
- In Settings (the gear, top left): **Demo mode ON**, **Plain English ON**, read aloud OFF, Camera **B** (the default). Then Start again.
- Ring/silent switch off and volume up, for the optional read-aloud beat (iPhone mutes the web voice in silent mode).
- Backups: `DEMO_OFFLINE=true` (every answer path of the declined branch is cached in Claude's words), then the recorded video.

**117: Cap is close now.** He fills the screen: waist up, his hands on the keyboard, the Capital One monitor beside him, his words in the box at the bottom.

**Demo mode moves on by itself**, page by page:
- Each page waits about a quarter of a second a word: at least 1.2 s, and at least 2.5 s when an item window is up.
- It stops only where you act: a choice, the paper on the desk, the business card, and the first reason's **Why?**.
- Tap **Next** (or the box) to go faster. **Skip all** jumps to the end of what he is saying.

Words in quotes are Cap's lines on this path (Priya, declined branch, Plain English on). They come from the real backend, walked on 2026-11-08 with `demo117.mjs` (WebKit, iPhone 15 profile). The plan starts on Monday 9 Nov 2026; re-check the dates and numbers at freeze.

Taps are numbered. Times are from the real run, with a robot tapping at once; leave about 15 to 20 s more for your own taps.

| Time | Do (taps) | Judges see | Say |
|---|---|---|---|
| 0:00 | Open the app (or Settings → Start again). **1** Put the card away | Cap at the Capital One desk: "Hi, nice to meet you. My name's Cap, here's my card." He slides it across the desk and it fills the screen: the logo, his portrait, **Cap**, **Credit Coach**, "Here to make your credit make sense" | "This is Cap, a credit coach at the Capital One desk. Today he's helping Priya: 23, renting, one card. Capital One just turned her down for a Balance Transfer card, and the letter doesn't say why." |
| 0:04 | **2** "Nice to meet you, Cap!" | (by itself) "Nothing we do here is a credit search, so it can't harm your score." / "I understand you're here to make your credit better. Where should we start?" with four choices | "He starts where she is: declined, with a report, getting ready, or new to credit." |
| 0:10 | **3** "I've been declined already" | "Oh, I'm sorry. That's frustrating, and the letter rarely says why. Let's work it out together." / "Have you got the letter they sent?" | |
| 0:18 | **4, 5, 6** Use a sample, once each time he asks (the letter, her report, her bank data) | He takes each one: "Thanks, that's your Capital One letter." / "Thanks, Priya. I've got your Experian report." / "Your score there is 700 out of 999." / "Got it. After rent, bills and the basics you have about £290 a month left over." | "She hands over the letter, her Experian report and three months of bank data. Real uploads work too: Upload, or drop a file anywhere on the page." |
| 0:40 | (by itself, about 27 s) | "About your Capital One letter. It didn't give a reason, so I've worked out the most likely ones from your report." with the **Why they said no** window: Capital One, most likely high credit utilisation. Then "The one fix that matters most: get your cards under 30% (£348 or less)." / "Pay £175 extra this month, then £215 a month." / "Don't apply again before Jul 2027." / "Run Capital One QuickCheck first. It's a soft search…" / her rights | "First, why she was declined: likely reasons, ranked. The one fix that matters most, and when to try again: not before July 2027, and only after a soft-search QuickCheck." |
| 1:07 | **7** "What can I do?", **8** Skip all | "Here's where to start. Three steps…" (dated steps; Skip all goes to the goals question) | "Then concrete steps, with her own dates and amounts." |
| 1:08 | **9** "The Balance Transfer card", **10** "3 months", **11** "Yes, I can", **12** "No" | "Now, what would you like to aim for?" / "And how soon? I can plan for the next 3 months or the next 6." / "Your report says you're not on the electoral roll at your current address. Can you register to vote there?" / "You pay the minimum on your Barclaycard each month. Is that set up as a Direct Debit?" | "Four questions: her goal, how soon, and two things he spotted in her data." |
| 1:17 | (by itself, about 13 s) | "Thanks! Give me a moment to build your plan towards the Balance Transfer card." Then "Two things are holding you back most right now…" / "Here's what's holding your score back, worst first." He **stops** on "You're using 79% of your £1,200 total limit (£950)." with the **Reason 1** window: Credit utilisation, **Problem**, a 10-block health bar, "79% of your £1,200 limit used", **Why?** | "Every number has a because: her own data, the rule, and where the rule comes from. That's behind Why?." |
| 1:30 | **13** Skip all, **14** "Sum it up for me" | "Here's all of that on one sheet. Tap it to read it, or take a copy with you." Cap slides the summary onto the desk and **stops** | "He hands her the summary to keep, as a PDF." |
| 1:36 | **15** Tap the sheet on the desk (or **Read it** in the window), **16** close it | The one-page summary | |
| 1:44 | **17** "Make me a plan", **18** "3 months", **19** Skip all | "Right, let's make you a plan." / "Here's your 3-month plan: 12 steps, week by week." Skip all goes to the end: the estimate and the next card, then "For example: what if I pay £300 a month?" | "A dated plan with her own numbers, 12 steps, week by week." |
| 1:46 | **20** "What if I pay £400 a month?" | "Paying £400 extra a month: by Feb 2027 your score could be 747 to 854, up from 735 to 836. An estimate. You'd get under 30% by Jan 2027." with the **What if** window | "She can ask what if. Plain English, read aloud, voice in, colour-safe modes. Credit made understandable, one conversation at a time." |
| 1:51 | End. Optional: the notebook (top right) → **Your plan** | Every card so far in Cap's notebook | |

**Taps**: 20, all listed above (from the real run: `TOTAL 20 taps, 113.2s`, 2026-11-08 after the page-break fix). The run took 1:53 with a robot tapping at once, so about 2:10 with your own taps. Every choice the script taps is on the first page of its menu on the iPhone 15.

Optional beats, if there is time:
- **Why? at 1:30** (+2 taps, about 8 s): tap **Why?** on the Reason 1 window, show the because drawer (the rule, her data, the source), close it. Demo mode then moves on by itself; tap Skip all as before.
- **Typed what-if** (+2 taps): "Type or say my own", type or say "what if I pay 300 a month?", Send.
- **Read aloud** (+3 taps, before the £400 tap): gear → Read replies aloud on → close. He reads the whole £400 answer aloud (about 10 seconds); Demo mode waits for the voice.
- **Steps in full** (no Skip all at 1:07): about 25 s more of dated steps.

If short of time: let Demo mode run and say less; the taps stay the same. If Demo mode is off, every page needs its own Next tap (116 needed 77 taps in all): turn it on.
