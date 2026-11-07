# Practice build review (fill in after every practice build)

Purpose: judge whether the concept fits in 24 hours, and design the day-of approach that avoids time sinks.

## Run details
- Concept:
- Date, start and end time:
- Who built, how many Claude Code sessions:

## Time log (record as you go, not afterwards)
| Component | Planned | Actual | What took the time |
|---|---|---|---|
| Setup (repo, env, keys) | | | |
| Data in (API / fixtures) | | | |
| Core logic | | | |
| AI parts (prompts, parsing) | | | |
| UI | | | |
| Demo path polish | | | |
| Devpost, screenshots, pitch | | | |

## Feasibility verdict
- Total time vs the 24h budget (target: demo-ready in 16h, leaving 8h buffer for polish, sleep, pitch):
- Critical path (what blocks everything else):
- What can run in parallel (separate Claude Code sessions or people):

## Time sinks and how to avoid them on the day
| Sink | Cause | Avoidance (goes into handoffs / skills) |
|---|---|---|
| | | |

## Performance issues
- Slow LLM calls, rate limits, cost, latency in the demo:
- Fix (caching, smaller model, precomputed fixtures, streaming):

## Cut list
- Must have for the demo:
- Cut first if behind:
- Cut second:

## Fallbacks
- If the API is down / rate limited:
- If the AI output is unreliable:
- Recorded demo backup:

## Navigation (feeds the event-mode second brain)
- Files Claude read, and how many times:
- Files read but not needed:
- Info it had to search for (should have been in the handoff or CLAUDE.md):
- Context used at the end of the session (`/context`):

## Prompt deltas (aim: every day-of handoff works first shot)
Log every time Claude Code needed extra guidance after the first prompt of a handoff.
| Handoff | Follow-up prompts needed | What we had to add or correct | Fold into |
|---|---|---|---|
| | | | handoff / CLAUDE.md / skill |
- Rule: if it applies to one component, fold it into that handoff. If it recurred across handoffs, fold it into `CLAUDE.md` or a skill
- Score: follow-ups per handoff (target on the day: 0 to 1)

## Lessons to carry (then delete the code)
- Handoff changes:
- Skill changes:
- Prompt notes:
- Library notes (keep / avoid):
- Data fixtures to prepare:
