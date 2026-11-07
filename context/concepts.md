# Concept cheat sheet (for triage at 10:15)

Prepared 2026-11-06 from `kept-problems.md`, `sponsors.md` and our brief forecast. Ideas only, no code. Brief odds are our guesses.
Every concept below fits the fallback contract in handoffs 101/102 (`answer`, `confidence`, `evidence`, `steps`), so `/event-switch generic` plus Cowork's edits to 101/102 gets us building by 11:00.

## Verdicts (Mihael, 2026-11-06)
- Capital One: C1 Clean Slate LEAD, C2 Lender's Eyes LEAD (pick by brief wording)
- Brevan Howard: B1 Receipts LEAD, B2 Ground Truth backup
- incident.io: I1 Flight Recorder LEAD, I2 Replay Arena backup
- Marshall Wace: M1 Blast Map LEAD, M2 Edge or Luck LEAD (pick by theme word)

## Triage shortcut
| If the brief says something like... | Go with |
|---|---|
| Capital One: make credit simple, understand or improve credit | C1 Clean Slate (if the room can handle the topic) or C2 Lender's Eyes |
| Capital One: financial literacy, everyday money, fair access | C2 Lender's Eyes |
| Capital One: fraud, scams, AI money advice | C2 with the "check the AI's advice" add-on |
| Brevan Howard: information accuracy, trust AI outputs | B1 Receipts |
| Brevan Howard: data to decisions, predictions, data integrity | B2 Ground Truth |
| incident.io: adaptive agent, agent you can trust | I1 Flight Recorder |
| incident.io: when things go wrong, investigate, learn from the past | I2 Replay Arena |
| Marshall Wace: any systems word (chain, ripple, emergent, bridging, networks) | M1 Blast Map |
| Marshall Wace: crowds, prediction, signal from noise, time | M2 Edge or Luck |
| Marshall Wace: best use of data / data viz | M1 or M2, whichever has the better chart |

## Capital One
**C1 Clean Slate** (problem C-027, CP1 credit 40%)
- For people left with debts an abuser ran up in their name. Lists coerced debts across lenders, BNPL and collectors from their own statements, organises the evidence, drafts creditor and credit-file dispute letters
- Demo moment: upload a mock statement set, three debts get flagged as likely coerced with the evidence for each, one click drafts the letter to the lender
- Pitch line: "Capital One already supports customers facing financial abuse. Clean Slate is what that support looks like when the debt is spread across ten lenders."
- Data: our own fixture data first. The Capital One hackathon API (hackathon.capitalone.co.uk) was unreachable on 6 Nov; if their brief asks for it, get access from their engineers at 10:00 and swap it in later
- Risk: sensitive topic; tone must be calm and private. It prepares, it does not give legal advice. Say so on screen
- Prep pack: `prep/clean-slate/` (full; `/event-switch clean-slate`)

**C2 Lender's Eyes** (earlier lead concept; CP1, CP4)
- Shows your credit file as a lender sees it, explains each reason a lender would say no from your actual transactions, and gives dated actions: "pay £X by date Y and you are likely to be approved by Z"
- Demo moment: a declined profile, three reasons tied to real transactions, a plan, then the "after" profile that flips to approved
- Pitch line: "Not a credit score. The lender's reasons, in your words, with a date when the answer changes."
- Add-on for an AI-advice or fraud brief: paste advice a chatbot gave you, and it checks it against your own data with evidence and confidence
- Avoid: quizzes and games (judges have seen dozens)
- Prep pack: `prep/lenders-eyes/` (full; `/event-switch lenders-eyes`)

## Brevan Howard
**B1 Receipts** (C-454 + C-455; BP1 35%, BP2 23%)
- Paste an AI deep-research macro report or an AI summary of a filing. Every figure and claim gets traced to its source (BoE, FRED, EDGAR), and stale, unsupported or wrong ones are flagged, plus any caveat the summary dropped
- Demo moment: an AI write-up of Thursday's BoE decision, eleven claims, three flagged red with the real number beside each
- Pitch line: "Your analysts already use AI research. Receipts tells them which sentences they can put in front of a PM."
- Data: BoE database, FRED, EDGAR (User-Agent with team name and email), the 5 Nov MPC release and 6 Nov jobs report, cached tonight
- Edge over the 2025 winner: it checks numbers against primary data, not one LLM against another
- Prep pack: `prep/receipts/` (full; `/event-switch receipts`)

**B2 Ground Truth** (C-305 + C-304; BP3, BP7)
- One report per ticker or macro series across free sources: where the sources disagree, the likely cause (day count, revision, lag, fixing), and a trust score
- Demo moment: the same series from three free sources, a 0.4% gap, the cause found automatically
- Pitch line: "Before a model trusts a number, it should know which source to believe."
- Prep pack: `prep/ground-truth/` (lean: spec, 101, 102; `/event-switch ground-truth`)

## incident.io
**I1 Flight Recorder** (C-524 + C-058; IP1 37%, IP2 19%)
- A checkpoint layer for AI agents. Every action an agent takes is recorded (proposed, approved, done, what changed, how to undo). Risky actions (bulk delete, send, production change) are held for a human. When something goes wrong, it declares an incident with the full timeline already written
- Demo moment: a judge gives the agent a task, it tries a bulk delete, Flight Recorder holds it, the judge approves one and undoes another, and the incident timeline appears
- Pitch line: "Agents are your newest on-call risk. Flight Recorder is the black box and the brake."
- Built on incident.io: declare incidents through their API, post to Slack
- Avoid: anything that looks like their AI SRE (finding root causes). We govern agents, we do not investigate outages
- Prep pack: `prep/flight-recorder/` (full; `/event-switch flight-recorder`)

**I2 Replay Arena** (earlier lead; IP3, IP6, IP8)
- Replays real public post-mortems step by step. An agent and a human investigate side by side, both state confidence, and both get graded when the real cause is revealed. Over time the agent earns the right to act alone on incident types it gets right
- Demo moment: a real outage replayed, the agent is confidently wrong, the human is right, and the autonomy ladder drops
- Pitch line: "Calibration you can see: when to trust the agent, and when to wake a human."
- Data: public post-mortem collections
- Prep pack: `prep/replay-arena/` (lean: spec, 101, 102; `/event-switch replay-arena`)

Also on the table: C-393 Clock, a live incident run against regulatory reporting deadlines (PS26/2, DORA, GDPR), for a "when things go wrong" brief

## Marshall Wace (the theme word is unknown; pick the engine and reframe it in 30 minutes)
**M1 Blast Map** (C-395; cascade, network, bridging)
- Map which cloud and AI providers sit behind each supplier, then simulate one provider going down and watch it cascade through the companies that depend on it
- Demo moment: switch off one cloud region, and the map lights up with the companies and processes that break, in order
- Pitch line: "Concentration risk you cannot see until it happens. Now you can watch it happen first."
- Also works for incident.io (provider outage leading to regulatory clock)
- Prep pack: `prep/blast-map/` (full, with `reframe.md`; `/event-switch blast-map`)

**M2 Edge or Luck** (C-577; crowds, prediction, signal from noise)
- Score many AI forecasters on resolved prediction-market questions, like TOPS in miniature: track record per forecaster, confidence intervals, how correlated they are (herding), and how many more questions you would need to know it is skill
- Demo moment: US midterm markets resolving this weekend, live, with the leaderboard reshuffling
- Pitch line: "Marshall Wace scores human analysts by track record. We did it for AI."
- Data: Polymarket and Kalshi public APIs (24/7, live during judging)
- Prep pack: `prep/edge-or-luck/` (full, with `reframe.md`; `/event-switch edge-or-luck`)

Leakage auditor (C-666 + C-441) is the backup for a "signal from noise" or "best use of data" word: it shows how much of a backtest's edge is future information leaking in
