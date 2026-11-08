# Numbers the demo shows (Priya)

From the engine as merged on main (engine.js, run 2026-11-08 01:45, plan start Mon 9 Nov 2026). Priya is a synthetic persona. Re-run before the pitch if the engine changes: `node -e "require('./app/backend/engine/engine.js'); ..."` (see bottom).

## Priya's data (synthetic, our persona)
| Figure | Value |
|---|---|
| Age, income | 23, £24k gross, about £1,680 net a month |
| Card | Barclaycard, £950 of £1,200 (79%), 29.9% APR, minimum only, no Direct Debit, open 2 years |
| Late payment | Barclaycard, 4 months ago (July 2026) |
| Hard searches | 3 in the last 3 months |
| Electoral roll | Not registered at current address |
| Starting score | 700 on the 0-999 Experian reference scale |
| Decline | Capital One Balance Transfer, agency Experian, no reason given |

## What the engine works out (code, deterministic)
| Figure shown | Value | Where it comes from |
|---|---|---|
| Utilisation | 79% (health 15, red) | Her data. Bands ≤30 / 30-50 / 50-75 / >75: our assumption, anchored on Experian's "under 30%" guidance (experian.co.uk/consumer/guides/improve-credit-score.html) |
| Payment history | health 75, amber | Rule "−25 per late in 12 months": our assumption |
| Affordability | £290 a month left (health 60, amber) | £1,680 − rent £650 − bills £221 − minimums £29 − everyday £450 − BNPL £40. £450 everyday is her data; FOS DRN-5943753 is the source for lenders running this sum |
| Recent applications | 3 in 3 months (health 10, red) | Her data; rule −30 per search in 3 months: our assumption |
| Factor weights | 30/25/15/10/10/10 | Our assumption, loosely based on FICO weights (myfico.com). Say "our weighting" if asked |
| Decline, most likely | high utilisation; a recent late payment | Engine decoder, scored against her data |
| The one fix | Cards under 30% (£348 or less): pay £175 extra this month, then £215 a month | Her surplus × 60% plus the £40 freed from BNPL |
| Reapply | Jul 2027, QuickCheck first | Month the last criterion turns green (no late in 12 months) |
| Paydown path | ~£770 (64%) Dec, ~£549 (46%) Jan, ~£323 Feb (under 30%) | Engine schedule, interest included |
| Stop applying until | 9 Jan 2027 | 3 months after the last search |
| Projection 3 months | 735-836 (estimate) | Sum of action effects with a 6-week ramp and diminishing returns; point effects from Experian via Which? where published, else our assumption |
| Projection 6 months | 772-891 (estimate) | Same method |
| Risk line | one missed payment = −130 | Experian figure via Which? |
| Card ladder | Capital One Classic, QuickCheck from 9 Jan 2027; put Netflix £10.99 + Spotify £11.99 on it (£22.98, 11% of an assumed £200 limit), full-balance Direct Debit | Card data capitalone.co.uk (Aug 2026); limit £200 is the low end of Classic's published £200-£4,000 |
| Graduation (Balance Transfer) | utilisation under 30% Feb 2027; no hard search in 3 months Apr 2027; no late in 12 months Jul 2027 | Capital One published criteria, evaluated per month |
| What-if, £400 extra a month | per the cached demo answer | Engine whatIf (re-check the exact figure in the app before the pitch) |

## Pitch figures (external)
| Figure | Source |
|---|---|
| 15.3m applied for credit in 2 years to May 2024, 22% (3.2m) declined, 45% of those couldn't get the product at all | FCA Financial Lives 2024, credit and loans (May 2025) https://www.fca.org.uk/publication/financial-lives/fls-2024-credit-loans.pdf |
| 10% (5.5m) didn't apply; 64% of them expected rejection | Same |
| 13% asked an AI for money advice in the last year; 49% got something wrong (28%) or can't be sure (21%) | Capital One UK blog, OnePoll 2,000 adults, March 2026 https://www.capitalone.co.uk/blog/ai-matches-parents-personal-finance-advice |

## Watch out on stage (engine wording)
- Changed 2026-11-08 (handoff 119, a Cowork-approved wording change to Jag's engine; scores, dates and every figure above unchanged). Priya has had a card for 2 years, so the engine no longer calls her file thin:
  - The decoder reason is now "Only one credit account": "You have one card, so lenders have little to compare. A second account, used well, helps." It used to be "Very little UK credit history"
  - The plan step "Avoid the thin-file traps" is now "One application at a time"
  - The Capital One Classic step no longer says Capital One is less likely to accept people with no UK credit history. That sentence stays only for someone new to the UK (or with less than a year of history)
  - The rule: someone whose oldest account is 1 year or older gets the new wording. Sam (no history) and Mei (new to the UK) keep the thin-file wording
  - Claude's wording for the declined path was re-cached with the new text, in both Plain English modes. The offline demo needs no network
- The headline says "identity & stability"; the cached Claude wording smooths it, the template does not
