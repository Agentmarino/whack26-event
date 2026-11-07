# Pitch outline: Credit Coach (5 minutes)

Brief: Capital One, "Make credit accessible". Demo first, story second. Every figure the agent shows comes from the engine at freeze; check against `numbers.md` (Jag) before rehearsal. Priya is a synthetic persona.

## 1. Problem (20 s)
"In two years, 3.2 million UK adults were turned down for credit, and almost half of them couldn't get what they needed at all. Most were never told which part of their file caused it, what to do, or when it would change. Credit isn't inaccessible because the products don't exist. It's inaccessible because nobody can understand it."
- Source: FCA Financial Lives 2024, credit and loans (May 2025): 15.3m applied in 2 years to May 2024, 22% (3.2m) declined, 45% of those couldn't get the product at all. https://www.fca.org.uk/publication/financial-lives/fls-2024-credit-loans.pdf
- Spare: 10% of adults (5.5m) didn't apply at all, 64% of them because they expected to be rejected (same source)

## 2. Live demo (2 min) — see `demo-script.md`
One flow on the iPhone: Priya walks up to the desk, hands over her report and bank data, the agent explains why Capital One said no, slides her the summary, then coaches her to a dated plan and the card that fits.

## 3. How it works (45 s), one diagram
1. **Your data:** credit report, bank transactions, decline letter, five questions
2. **Engine (code, deterministic):** six factors scored and ranked, 15 rules turn into actions with your own amounts and payees, a dated 3- and 6-month plan, estimated score ranges, the Capital One card ladder, the decline decoder. Every number carries a "because": the rule, your data point, the source
3. **Claude:** reads PDFs and letters into the engine's format, writes the agent's words, turns "what if I pay £300?" into engine levers. A checker rejects any number Claude writes that isn't in the engine's output
4. **The agent:** one idea per message, at your pace, in plain English if you want, read aloud if you want
Under the boxes: "Claude never calculates. Every number has a because."

## 4. Why Capital One (45 s)
- Their customers are the people this is for: credit builders and near-prime applicants. QuickCheck gives a yes or no before applying; Credit Coach is what happens after a no: why, the one fix, and the date to check QuickCheck again
- The card ladder is their own product range: Classic as the entry card, Balance Transfer as the graduation, with the month each criterion turns green. It ends with "check QuickCheck first", never "you will be approved"
- Their own research says people already ask AI about money and often get it wrong (Capital One UK, March 2026: 13% asked an AI for money advice in the last year; 49% got something wrong or can't be sure). https://www.capitalone.co.uk/blog/ai-matches-parents-personal-finance-advice. Our answer: the AI talks, the engine counts, every figure has a source
- Accessibility is built in, not added: plain-English mode, read aloud, voice input, colour-safe modes, text size, full keyboard and screen-reader support, reduced motion

## 5. What's next (20 s)
- Live data with consent: Open Banking for transactions, a credit agency API instead of uploads
- Inside Capital One: zero input, it runs on the data they already hold at the moment of a decline
- Monthly check-ins: the agent re-runs the plan when the next statement lands

## Hardest judge questions
1. **"Is the score real?"** No, and it says "estimate" everywhere. Real scoring models are private. We use published figures where they exist (Experian via Which?) and label everything else as our assumption, tunable in one place. The value is the plan and the because-trail, not the number
2. **"What stops the AI making things up?"** Claude never computes. The engine does; Claude words it; a checker compares every £, % and date with the engine's output and falls back to fixed wording if it doesn't match. Each message is tagged with how it was written
3. **"Isn't this regulated advice?"** For a hackathon prototype we left compliance out on purpose. Inside Capital One it would sit within their permissions; as a stand-alone app it would need the right FCA permissions
4. **"Why would a card company help people pay down cards?"** A customer at 79% utilisation who keeps applying gets declined and drifts to high-cost credit. A customer who follows the plan comes back as a lower-risk approval for Classic and later graduates. That's a customer kept
