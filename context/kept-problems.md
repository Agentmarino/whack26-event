# Kept problems

The 11 problems Mihael kept after research (2026-10-15). These are problems, not solutions. Concepts get built on them next and appear in `prep/` once chosen.
Score = opportunity score from our discovery research (out of 5). Brief = which predicted brief it fits, with our estimated odds. All odds are guesses.

## incident.io
- **C-524 AI SRE agents changing live production** (opening, 3.34, brief IP2 19%): no single per-incident timeline of every agent action (proposed, approved, allowed, what changed, undo). Risk: overlaps their roadmap
- **C-058 Assistants deleting files or acting without approval** (3.45, IP2 19%): no layer across a user's assistants that snapshots, holds bulk deletes and sends, hard stops and restores
- **C-393 Regulatory incident reports late or poor** (3.20, IP3 9%): run a live incident through PS26/2, DORA and GDPR thresholds with a clock per regime and a checked draft report. Risk: reads as compliance
- Pair: C-524 + C-058 = agents acting without a checkpoint, at work and at home

## Brevan Howard
- **C-305 Market data values untrustworthy** (3.50, BP1 35%): one report per ticker across free sources and EDGAR, each disagreement's likely cause, trust score
- **C-304 Cannot reproduce Bloomberg values** (3.39, BP7 4%): sweep conventions (day count, interpolation, lags, fixings) to rank what closes the gap
- **C-454 Unchecked claims in AI deep-research macro reports** (opening, 3.56, BP2 23%): trace every figure in an AI research report to its cited page, flag stale or unsupported conclusions. Filings mode (C-455): dropped caveats in AI summaries of 8-K filings
- **C-441 LLM forecast backtests inflated by future info** (opening, 3.45, BP2 23%): one go/no-go leakage report for a researcher's own LLM signal
- Pairs: C-305 + C-304 = market data you cannot trust; C-441 + MW C-666 = leakage through the LLM and through the code

## Marshall Wace
- **C-395 Third-party concentration unmapped** (3.54): tag the cloud and AI provider behind each vendor, simulate one provider's outage cascading (fits "chain of events")
- **C-666 Hidden look-ahead in backtests** (3.31): re-run a pipeline on cut-off and shuffled data, catch split reuse
- **C-577 Telling AI forecasting edge from luck** (opening, 3.12): score AI forecasters on resolved prediction markets. Midterm markets resolve during the event weekend
- Pair: C-395 + incident.io C-393 = provider outage to regulatory clock

## Capital One
- **C-027 Abuse survivors liable for an abuser's debts** (3.96, CP1 40%): privately list coerced debts across lenders, BNPL and collectors, organise evidence, draft creditor and credit-file dispute letters. Sensitive: careful tone and wording, must not read as legal advice
