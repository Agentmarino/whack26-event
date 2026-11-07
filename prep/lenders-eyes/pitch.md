# Lender's Eyes: 5-minute pitch outline

Written 2026-11-06, follows `context/pitch-formula.md`. Demo before slides. Name the team clearly at the start. Every real figure below was retrieved on 2026-11-06 with its URL. Jordan and the lenders are SYNTHETIC.

## 1. Problem in one line (20 s)
"In two years, 3.2 million UK adults were turned down for credit, and almost half of them could not get what they needed at all. Lender's Eyes shows them which entries caused the no, and the date the answer changes."
- Source: FCA Financial Lives 2024 survey, "Credit & loans" selected findings (May 2025), https://www.fca.org.uk/publication/financial-lives/fls-2024-credit-loans.pdf: "Of the 15.3m adults who applied for a regulated credit agreement in the 2 years to May 2024, 22% (3.2m) were declined"; "45% of the 3.2m adults who were declined ... said they were unable to get the product or service they needed at all"
- Spare figure, same source: "10% of adults (5.5m) avoided applying", "64% did so because they thought they would be rejected or considered not eligible"
- If a judge asks what people are told today: Citizens Advice says that if a lender refuses you after checking your file, "they must tell you why credit has been refused and give you the details of the credit reference agency they used" (https://www.citizensadvice.org.uk/debt-and-money/borrowing-money/how-lenders-decide-whether-to-give-you-credit/). Experian says "there’s no universal ‘pass mark’ for credit scoring, so you should ask the lender why you were refused" (https://www.experian.co.uk/consumer/guides/refused-credit.html). Our point (our inference, not measured): you can learn that your file was the reason and which agency holds it, but not which entries, what to change, or when. Do not claim people are told nothing

## 2. Live demo (2 min)
`demo-script.md`, 90 seconds plus 30 seconds of slack. One flow: declined, three reasons from Jordan's own transactions, a dated plan, the after file flips to likely approved.

## 3. How it works (45 s), one diagram
Diagram, left to right, five boxes:
1. **Your data**: bank transactions (89 rows, 4 months) and your credit file
2. **Rules (code)**: 9 illustrative lender rules with stated lines, each quoting Experian, Equifax or Capital One's public guidance. Code decides: decline or likely approve, and the evidence for each reason
3. **Plan (code)**: the smallest payment, the day to pay it, and when the file shows it (statement date, search ageing, electoral roll timing). One "likely approved from" date
4. **Words (Claude)**: Claude writes each reason in plain English and picks the evidence to cite. A checker rejects any £ figure, percentage or date that is not in the data or the plan; failures fall back to plain templates
5. **After (code)**: the same rules re-run on the file as it should look on that date. The decision flips
Under the boxes: "Claude never decides and never invents a number."

## 4. Why it matters to Capital One (45 s)
- Their applicants: near-prime and credit-builder customers (vault sponsor notes, sourced 2026-10-08, not re-checked today). QuickCheck already gives them "a straight yes or no in 60 seconds" (https://www.capitalone.co.uk/creditcards/credit-card-eligibility-checker). Lender's Eyes is what happens after a "no": why, what to do, and the date it becomes a yes, then back to QuickCheck before they apply
- Not CreditWise: CreditWise shows a TransUnion-powered score, "what's holding back your credit score" and a Score Simulator (https://www.capitalone.co.uk/free-credit-score). We show no score. We show a decision, reasons tied to your own transactions, and a dated plan
- Business case (our reasoning, not measured): every failed application is a hard search that makes the next one worse; a plan turns today's decline into a later, lower-risk approval, and keeps the customer instead of sending them to high-cost credit (FCA: 45% of the declined could not get what they needed at all)
- The policy is swappable: Capital One could load its own decline reasons into the same rule shape. The evidence links and the date engine are the product
- Responsible AI, their own concern: Capital One UK's blog warns that AI "can produce responses that sound authoritative even when they're wrong" (https://www.capitalone.co.uk/blog/ai-help-with-finances). Our checker is the answer: code owns the numbers

## 5. What is next (20 s)
- Live data: their hackathon API for transactions (unreachable on 2026-11-06; adapter shape in `spec.md`), Open Banking with consent
- "Do" step from our original concept: with consent, schedule the pre-statement payment and the electoral roll reminder, then re-run weekly
- Check the AI's advice (built if time allowed): paste a chatbot's money advice and get each claim checked against your own file. Their survey: 13% used AI for money advice last year, 49% got something wrong or are not sure (https://www.capitalone.co.uk/blog/ai-matches-parents-personal-finance-advice)

## Hardest judge questions
1. **"Is this a real lender's model? How can you say these are the reasons?"**
   No, and we say so on every screen. The rules are illustrative, each line anchored on public guidance we cite (Experian's 25% rule of thumb and "one every three months", six years for late payments, the electoral roll timing; Equifax keeps search footprints one year). Experian itself says there is no universal pass mark. The value is the machinery: evidence tied to each reason and a date engine. Plug in a real lender's reason codes and the same screens work.
2. **"What stops Claude from making up a number or a date?"**
   Claude never computes anything. Code builds a facts block per rule; Claude may only use numbers and dates from it, written as YYYY-MM-DD. A checker compares every number in Claude's text with the facts, retries once, and falls back to fixed wording if it still fails. Each reason is tagged "Explained by Claude, checked against your data" or "Standard wording". The demo also runs offline from a cache.
3. **"How is this different from CreditWise or QuickCheck, and is this regulated advice?"**
   QuickCheck answers yes or no; CreditWise shows a score, what is holding it back and a simulator for new credit. Neither ties a reason to your own bank transactions or gives an amount and a date for when the answer changes. On regulation: on screen it is illustrative information, not advice or a lending decision. Whether a stand-alone product would need FCA permissions is an open question we have not checked (our notes flag credit information and debt advice permissions); inside Capital One it would sit within their permissions.
- Spare: **"Why would a card company want people to pay their balance down?"** A customer at 94.5% on one card who keeps applying gets declined and drifts to higher-cost credit. A customer who follows a dated plan comes back as a lower-risk approval. That is the "low and grow" story they won an inclusion award for (vault sponsor notes, 2026-10-08, not re-checked today), made visible to the customer.
