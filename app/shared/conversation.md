# The conversation

How the credit agent at the Capital One desk talks a person through the check, then coaches them. The types are in `contract.ts`; the real messages for Priya are in `examples/turns/` (made from the engine by `scripts/make-examples.ts`, which checks every example against the schemas, every `ref` resolves, at most 40 words, and a few American spellings; "you", "estimate" and the numbers are by hand).

## Rules for every message
- **At most 40 words**, one idea per message. Talk to "you". British spelling. Calm, warm, plain words.
- **Numbers come from the engine.** The text may repeat a number only if it is in the engine data for that item (113's checker). Cards (`reason`, `decline`, `step`, `projection`, `ladder`, `whatif`, `paper`) draw their data from `ref`, never from the text.
- Every score range says **estimate**. Never promise a score or a lending decision.
- Each message carries an `emote` and a `gesture` for the agent (mapping at the bottom).
- One turn = one request, one response. A response can hold several messages; the person taps through them.

## Step order
`greet` → `ask_report` → `ask_bank` → `ask_letter` → `questions` (several turns) → `assessing` → `diagnosis` → `decline` (only with a letter or a decline on file) → `paper` → `coach` (several turns)

| Step | The agent says (Priya example) | Gesture, emote | Expects | Next |
|---|---|---|---|---|
| `greet` | "Hello, welcome to the Capital One desk. I'll look at your credit the way a lender would, then help you fix what's holding you back." Then: nothing here is a credit search | `wave`, warm | choice: "Let's start" | `ask_report` |
| `ask_report` | "First, your credit report. Upload it from Experian, Equifax or TransUnion, or use one of our samples." | `asking` | file `credit_report`, optional | `ask_bank` |
| `ask_bank` | Ack ("Thanks, Priya. I've got your Experian report. Your score there is 700 out of 999."), then asks for 3 months of bank statement (CSV or PDF) | `receive-document`, then `asking` | file `bank`, optional | `ask_letter` |
| `ask_letter` | Ack with one number from the bank data (money left each month), then "Have you been turned down for credit lately? If you've got the letter, hand it over..." | `reading`, then `asking` | file `letter`, optional | `questions` |
| `questions` | One question per turn (below) | `asking` | choice or text with chips | next question, then `assessing` |
| `assessing` | "Thanks, that's everything I need. Give me a moment to go through it all." `analyse()` runs here; `result` is on this response and every one after | `thinking` | none | `diagnosis` |
| `diagnosis` | Headline, then the top 3 factors, then spending flags (below) | `explaining` | choice: "Tell me about the letter" (with a decline) or "What can I do?" | `decline` or `paper` |
| `decline` | Why they likely said no, the one fix, when to reapply, your rights (below) | `explaining`, concerned then warm | choice: "Got it" | `paper` |
| `paper` | "Here's all of that on one sheet. Tap it to read it, or take a copy with you." `paperUrl` is set from here on | `slide-paper`, pleased | choice: "Make me a plan" | `coach` |
| `coach` | Choose the plan, then the plan, then what-ifs (below) | `coach`, then `explaining` | choice, then text | `coach` |

Skipping is allowed at every upload step. With no report the questions ask everything; with nothing at all the engine still runs on defaults.

**`expects.kind: 'none'`**: no input. The frontend sends `{type: 'skip'}` once the person has read the messages (tap, or automatically in demo mode).

**Chips**: the frontend sends `{type: 'choice', value: <the chip text exactly>}`. With `kind: 'text'`, chips are quick replies next to the text box, and the backend must accept the same words as `choice` or `text`.

## Samples
"Use a sample" sends `{type: 'sample', fileKind, personaId}`. The first sample (the report) names the persona; later samples use the same one. `GET /api/personas` lists them (`app/backend/data/personas/index.json`):
- **Priya** (main demo): an engine `Profile`. The samples split it so each upload adds a piece: report = everything except `bank` and `decline`; bank = `bank`; letter = `decline` (Capital One, a month ago).
- **Mei Lin** and **Alex Morgan**: `credit-coach-report/v1` files that already hold bank data and a decline letter. The agent says so at the bank and letter steps ("Your sample already has that").

## A letter at any step
A `letter` (file or sample) is accepted at **any** step, not just `ask_letter`. The backend runs the decline decoder and answers with **one acknowledgement** ("Thanks, that's a letter from Capital One. I'll go through it after your results."); `step` and `expects` stay as they were (`examples/turns/letter-ack.json`). The `decline` step then runs after the diagnosis.

## Questions
Each question is its own turn with step `questions`. Ask the form fields the data has not answered, in this order. **Goal and horizon are always asked** (they shape the plan); the rest only when missing:

| Field | Question | Expects | Onto the `Profile` |
|---|---|---|---|
| age | "How old are you?" | text | `age` |
| income | "Roughly what do you earn a year, before tax?" | text | `grossIncome` |
| housing | "Do you rent, own, or live with family?" | choice: Rent, Own, With family | `housing` (`rent`, `own`, `family`) |
| goal | "What are you hoping to get? Pick one, or tell me in your own words." | text + chips: A credit card, Car finance, A mortgage, Just build my credit | `goal`: card, build (car finance has no engine goal yet; use `build`), mortgage, build. Own words: Claude picks one of the three, else `build` |
| horizon | "And how soon? I can plan for the next 3 months or the next 6." | choice: 3 months, 6 months | not in the engine (it always makes both plans); picks the plan the coach offers first |
| bureau | "Which agency is your report from?" | choice: Experian, Equifax, TransUnion, Not sure | `bureau` (Not sure = `experian`) |

Then **up to 2 data questions** built from the profile, only where the answer changes the plan. Priya gets:
1. Not on the roll (`electoralRoll: false`): "Your report says you're not on the electoral roll at your current address. Can you register to vote there?" (Yes, I can / No, I can't / Not sure) → `canRegisterToVote`
2. Minimum-only card without a Direct Debit (`minOnly && !hasDD`): "You pay the minimum on your Barclaycard each month. Is that set up as a Direct Debit?" (Yes / No / Not sure) → `cards[i].hasDD`

Other good ones: a new address in the last 3 years and not on the roll; a BNPL or gambling payee in the bank data ("Is that one plan or a few?"); a student or new to the UK (`student`, `newToUK`, `ukMonths`).

## Diagnosis
In order, one message each:
1. The engine `headline` (kind `text`, ref `{on: 'headline'}`, warm)
2. "Here's what's holding your score back, worst first." (no count: Claude's headline may already say "two things")
3. One message per top-3 factor of `diagnosis.ranked`: kind `reason`, ref `{on: 'factor', factorId}`, text = the factor's `reason`. Emote `concerned` for red, `warm` for amber, `pleased` for green. The card shows the health pill (word + symbol), the reason and the because-trail
4. Spending flags, if any (kind `text`, ref `{on: 'flags'}`, concerned): "Two things in your spending stand out: £40/month on buy now, pay later and minimum-only payments on your Barclaycard."

## Decline
Only when `result.decline` is not null. Four messages, all ref `{on: 'decline', part}`:
1. kind `decline`, part `reasons`: "About your Capital One letter. It didn't give a reason, so I've worked out the most likely ones from your report." (or quotes the stated reason). The card ranks them Most likely / Likely / Possible
2. part `fix`: "The one fix that matters most: get your cards under 30% (£348 or less). Pay £175 extra this month, then £215 a month..."
3. part `reapply`: "Don't apply again before Jul 2027. Run Capital One QuickCheck first..."
4. part `rights`: the lender must name the agency; you can see and correct your report for free

## Paper
One kind `paper` message, ref `{on: 'paper'}`, gesture `slide-paper`. `paperUrl` = `/api/paper/<sessionId>.pdf` (404 with `{error}` until it is ready).

## Coach
1. **Choose the plan**: "Right, let's make you a plan. You said 3 months. Shall we stick with that, or go for 6?" Chips: 3 months, 6 months
2. **The plan** (one response): an intro ("Here's your 3-month plan: 12 steps, week by week..."), then **one kind `step` message per step** (ref `{on: 'step', plan, stepIndex}`, text "9 Nov 2026: Register to vote at your current address."; the card shows the instruction, why and how you'll know), then **projection** (kind `projection`, ref `{on: 'projection', plan}`: "If you stick to it, your Experian score could be 735 to 836 by Feb 2027. That's an estimate, not a promise."), then the **card ladder** (kind `ladder`, ref `{on: 'ladder'}`: entry card and month, "check with QuickCheck first"; with no entry card, the ladder's `reason`), then the what-if prompt
3. **What-ifs**: `expects` text with chips "What if I pay £300 a month?", "What if I pay £400 a month?", "What if I stop buy now, pay later?". Free text goes to `POST /api/turn` as `{type: 'text'}`, a chip as `{type: 'choice'}` with the same words: **in `coach` and at the goal question, the backend treats `choice` and `text` the same**; 113 turns it into `changes[]` (only the `Change` levers), runs `whatIf`, and answers with kind `whatif`, ref `{on: 'whatif', whatIfId}`, the run in `TurnResponse.whatIf`. The sliders sheet calls `POST /api/whatif` instead (same message shape, `WhatIfResponse`). Step stays `coach`

**What-ifs compare against the plan, not against doing nothing.** The baseline plan already stops BNPL and registers you to vote, so those levers move Priya's estimate by 0 (BNPL) or even lower it (electoral roll, `clearCard`); only the paydown amount moves it up. On the 6-month plan, extra paydown reaches the same end range (it only gets you under 30% sooner). Quote the plan the person chose (`m3` or `m6`). When that estimate does not go up, say "your estimate by Feb 2027 stays at X to Y. Your plan already gets you there." rather than showing a lower number. (Engine behaviour, reported in 112 RESULT.)

## Gesture → NPC kit
The contract's `gesture` names are partly the kit's **states**. 114 maps them like this (`src/npc/`, see `app/npc-concept/ART-GUIDE.md`); call `gesture()` after `setState()`:

| Message `gesture` | Kit call |
|---|---|
| `none` | `setState('talking')` while the text types, then `idle` |
| `wave` | `setState('greeting')` (the wave is built in) |
| `asking` | `setState('asking')` |
| `receive-document` | `setState('receive-document')`, then `setState('reading')` when it settles |
| `reading` | `setState('reading')` |
| `thinking` | `setState('thinking')` (also while waiting for the backend) |
| `explaining` | `setState('explaining')` (points at the desk where the card lands) |
| `slide-paper` | `setState('slide-paper')` |
| `coach` | `setState('coach')` (glasses go on and stay on) |

The kit's own gestures (`point-down`, `point-side`, `chin`, `tap-calc`, `open-palm`) are free for 114 to add, for example `tap-calc` on a projection. Emotes map one to one (`neutral`, `warm`, `concerned`, `pleased`).

## What the backend adds (113)
How `app/backend` behaves beyond the table above. No schema change; every message is still an `AgentMessage`.
- **Wrong input at an upload step** (text or a chip while `expects.kind` is `file`): one nudge ("Tap Upload to hand me your credit report, or Use a sample. You can skip this too."), step unchanged
- **A report or bank statement out of order** (for example a bank file at `ask_report`): stored, one acknowledgement, step unchanged. After `assessing` it is not used ("start again to use it")
- **A letter after `assessing`** (at diagnosis, paper or coach): one acknowledgement, and the result is re-run so `result.decline` and the paper include it. The `decline` step only runs if it arrives before the diagnosis is answered
- **An answer the backend can't read** (age "old enough", income "lots"): a re-ask with id `q-age-again`/`q-income-again`, step and expects unchanged. `skip` on a question takes the engine default
- **Mei and Alex** (report files with bank data and a letter inside): `ask_bank` says "Your sample already has three months of bank data in it..." and `ask_letter` says "Your sample already has the letter from <lender> in it...". Skip or a sample both move on. Their data questions differ from Priya's (Alex: roll and Barclaycard Direct Debit; Mei: none, she can't register to vote)
- **No report at all**: age, income, housing, goal, horizon, bureau are asked in that order (7 question turns with no data questions is the most)
- **Coach**: after the plan, sending exactly "3 months" or "6 months" (chip or text) shows that plan again; anything else is a what-if. What-if chips are built from the data (paydown only with a card balance, BNPL or gambling only when they are in the bank data)
- **`writtenBy`**: `claude` on the headline, reason and step messages Claude worded and the checker passed; `template` on everything else. Numbers in the text are the engine's either way
- **Message ids** are unique per session: a repeated message gets `-2`, `-3`... on its id
