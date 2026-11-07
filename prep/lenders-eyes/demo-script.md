# Lender's Eyes: 90-second demo script

Written 2026-11-06. Every number below comes from `fixtures/` (see `fixtures/answer-key.json`). Jordan Ashby and every lender are SYNTHETIC. Reason wording on stage comes from the live run (or the cache), so it may differ slightly from the lines quoted here; the numbers must not.

Before judging: backend warm-up (one live assess for `jordan-before`), browser at `http://localhost:5173` (never 127.0.0.1), window 1440px wide, zoom 110% so the back row can read the figures. Backup: `DEMO_OFFLINE=true`, then mock mode, then the video (`app/DEMO.md`).

| Time | Click or type | What the judges see | What we say |
|---|---|---|---|
| 0:00 | (screen already on Start) | "See your credit file the way a lender's rules see it, and the date the answer changes." Button "Open Jordan's file". "Synthetic profile" | "Meet Jordan. Twenty-three, first job in July, moved flat in August. Between September and October Jordan applied three times and got three noes. No reasons." |
| 0:08 | Click "Open Jordan's file" | Loading skeleton, then the red banner "Declined under this illustrative policy. 3 reasons." and the line "Illustrative rules, not a real lender's model" | "This is Jordan's file as a lender's rules see it. Our rules are illustrative, but every line is tied to public guidance from Experian and Equifax." |
| 0:15 | Point at card 1, "Card balances compared with limits" | "94.5%" against "fail above 50%, watch above 25%", Claude's reason: last reported £1,134.22 of £1,200, furniture and moving costs, only the £25 minimum since | "Reason one: the card is nearly full." |
| 0:20 | Click the chip "TX-020" | Drawer: TX-020 OAKLEAF FURNITURE COVENTRY £520.00, TX-022 CASTLEFORD HOME STORE £212.50, TX-024 VANSHARE MOVES £95.00, then TX-007, TX-030, TX-051, TX-070 LARKFIELD CARD PAYMENT DD £25.00 each, and the Experian source "keep your credit utilisation below 25%" | "Not a score factor. Jordan's own transactions: the move went on the card, and since then only the minimum has gone in. Claude wrote this sentence; code checked every number in it against the data." |
| 0:32 | Close the drawer. Point at card 2, "Recent credit applications" | "3 in 90 days": Orbitel Mobile 2026-09-03, Pennant Finance 2026-10-12, Brindlemoor Bank 2026-10-29 | "Reason two: every no made the next no more likely. Three hard searches in ninety days." |
| 0:40 | Point at card 3, "Electoral roll at your current address" | "not registered at current address"; reason: roll only at the old address, rent to Hollis Lettings since 2026-08-01 | "Reason three: Jordan moved. The rent shows it. The electoral roll does not." |
| 0:48 | Click "Show the plan" | Headline: "Pay £565 to your Larkfield Card by 2026-11-17 and register to vote at your new address by 2026-11-10. Make no credit applications before 2027-01-13. Under this illustrative policy you are likely to be approved from 2027-01-13." Timeline with three actions | "Here is the part nobody gives you: a date." |
| 0:58 | Point at action A1 | "Pay £565, by 2026-11-17, changes on 2027-01-13". Why: statement date is the 18th, statement £537.20 = 44.8%, up to 8 weeks to reach the file | "Code worked out the smallest payment that clears the line, the day to pay it, and when a lender will see it." |
| 1:05 | Point at the affordability strip | "Lowest projected balance before payday (2026-11-28): £556.24" | "And it checks Jordan can afford it from the regular bills." |
| 1:10 | Click "See my file on 2027-01-13" | Banner flips: "Likely approved under this illustrative policy. 2 things to watch." R-UTIL "Was fail, now watch" 44.8%, R-SRCH "Was fail, now pass" 1 in 90 days, R-ROLL "Was fail, now pass" | "Same rules, run on the file as it will look on 2027-01-13. The answer changes." |
| 1:20 | (stay on the After view) | The "before you apply" line: soft-search eligibility checker first | "Not a credit score. The lender's reasons, in your words, with a date when the answer changes." |
| 1:30 | End | | |

## Optional 20 seconds (only for a fraud or AI-advice brief, and only if 106 is merged)
| Time | Click or type | What the judges see | What we say |
|---|---|---|---|
| +0:00 | Click "Check advice a chatbot gave you", then "Use sample advice", then "Check" | Summary "2 supported, 4 contradicted, 1 misleading, 1 cannot check" | "Capital One's own survey: 13% asked an AI about money last year, and 49% either got something wrong or cannot be sure." |
| +0:10 | Point at C2 | "Late payments drop off your file after 12 months" marked contradicted, 95%: still on file since 2025-03-10, drops off 2031-03-10 | "The chatbot was confident. Jordan's own file says otherwise, with the date." |
| +0:20 | End | | |

## If something goes wrong on stage
- A reason shows "Standard wording": fine, keep going; say "if the AI's sentence fails our number check, we fall back to plain wording"
- Spinner over 8 seconds: say "it's calling Claude", then if needed switch tabs to the mock build (`VITE_USE_MOCK=true`, already open in a second tab)
- Backend error banner: click Retry once; then the second tab
