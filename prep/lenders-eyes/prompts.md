# Lender's Eyes: Claude prompts

**Status: untested. Written 2026-11-06, not yet run.** Nothing in this file has been sent to Claude. Log what fails on the day in the handoff RESULT ("prompt deltas") and fix it here afterwards.

Settings for both prompts: model from env `LLM_MODEL` (default `claude-sonnet-5-5`), no `thinking` parameter (sending `thinking: disabled` returns HTTP 400 on `claude-sonnet-5-5`, checked 2026-11-06), `max_tokens` 1500, temperature left at the default, no tools. Our own data is the only evidence; never web search, never memory.

Reading every reply (both prompts): join all `text` blocks and ignore `thinking` blocks. With no `thinking` parameter, `claude-opus-5-5` and `claude-haiku-5-5` return a `thinking` block before the `text` block (checked live by the main session on 2026-11-06; Sonnet can too). Taking only the first content block breaks the JSON parse.

---

## Prompt 1: explain the reasons (handoff 105, inside `POST /api/assess`)

### System prompt (send exactly)
You explain an illustrative lender policy's result to the person it is about. Code has already decided everything: the decision, each rule's result, the numbers, the evidence and the plan. Your only job is to say, in plain words, why each listed rule came out the way it did.

Rules for every reason:
- Write to the person as "you". British spelling. Short sentences. Two or three sentences, at most 60 words.
- Say what the rule saw, why that matters to a lender, and, if a plan action is given, what changes and when.
- Use only numbers and dates that appear in that rule's facts. Copy them exactly as they appear there. Write dates only as YYYY-MM-DD. Never write a month name next to a number. Never round, add up or work out a new number.
- Name things the way the labels do (for example "Larkfield Card", "Hollis Lettings"). Do not put evidence ids in the text.
- Say "this policy", never "the lender" as if it were a real lender's decision. Never promise approval. Never mention a credit score number. Do not use the words "guarantee" or "definitely".
- Do not give advice beyond the plan action in the facts.
- For each reason, choose 1 to 5 evidence ids from that rule's evidence list that best show why, and put them in cited_ids.

Reply with JSON only, no prose before or after, in this shape:
{"reasons": [{"rule_id": "<rule id from the facts>", "plain_reason": "<text>", "cited_ids": ["<evidence id>", "..."]}]}
Give exactly one item per rule in the facts, in the same order.

### User message template
Profile: {profile_id}, as of {as_of}. Policy: {policy.name}. {policy.note}

Facts, one block per rule to explain:
{facts_json}

`facts_json` is a JSON list built by code, one object per rule with result `fail` or `watch`, in contract order:
`{"rule_id", "name", "result", "measured", "threshold", "clears_on", "evidence": [{"id", "kind", "date", "label", "amount_gbp"}], "plan_action": {"do", "amount_gbp", "by_date", "clears_on"} or null, "source_quote": "<first basis quote from lender-rules.json>"}`

### Example (one rule; for the prompt designer, not sent)
Facts:
`[{"rule_id":"R-ROLL","name":"Electoral roll at your current address","result":"fail","measured":"not registered at current address","threshold":"must be registered at current address","clears_on":"2026-12-01","evidence":[{"id":"ADDR-CUR","kind":"file","date":"2026-08-01","label":"Current address on file: Flat 4, 27 Wrenfield Road, Coventry (synthetic)","amount_gbp":null},{"id":"ER-01","kind":"file","date":"2023-12-01","label":"Electoral roll: registered at your previous address only","amount_gbp":null},{"id":"TX-023","kind":"transaction","date":"2026-08-01","label":"HOLLIS LETTINGS RENT AUG (current account)","amount_gbp":-720.0}],"plan_action":{"do":"Register to vote at Flat 4, 27 Wrenfield Road","amount_gbp":null,"by_date":"2026-11-10","clears_on":"2026-12-01"},"source_quote":"The lender couldn’t confirm your identity and address. This sometimes happens if you haven’t registered on the electoral roll, or if you’ve changed your name or address recently and didn’t make the lender aware"}]`

Good reply:
`{"reasons":[{"rule_id":"R-ROLL","plain_reason":"Your file shows you on the electoral roll only at your previous address, but your rent has gone to Hollis Lettings since 2026-08-01. Lenders use the roll to confirm who you are and where you live. If you register by 2026-11-10, it should show from 2026-12-01.","cited_ids":["ER-01","ADDR-CUR","TX-023"]}]}`

Bad reply (fails the checker): "You moved on 1 August, so register soon and your score will go up by 50 points." (month-name date, a number not in the facts, a score claim.)

More good examples, which pass the checker against the facts in `fixtures/contract-examples.json`: the four `explained_by: "claude"` reasons in `POST /api/assess` there.

### Checker (code, after every reply)
1. Read the reply by joining all `text` blocks; ignore `thinking` blocks (with no `thinking` parameter, `claude-opus-5-5` and `claude-haiku-5-5` return a `thinking` block before the `text` block, and Sonnet can too; checked live by the main session on 2026-11-06). Parse that text as JSON. It must have `reasons` with exactly the rule ids sent, in order
2. `cited_ids`: 1 to 5 items, each an id from that rule's evidence
3. `plain_reason`: at most 60 words; none of "credit score will", "guarantee", "will be approved", "definitely" (case-insensitive)
4. Numbers: collect every number and date that appears anywhere in that rule's facts block (fields and labels). Then in the text: every `YYYY-MM-DD` must be in that set; a month name (January to December) next to a digit is a failure; every other number (strip £, commas, % and a leading minus) must equal a number in the set to 2 decimal places
5. On any failure: send one retry with the same system prompt and the user message plus "Your previous reply had these problems: {list}. Reply again with JSON only." If the retry fails too, use the template for each failing rule (`explained_by: "template"`) and keep any items that passed
6. If the reply is empty, a refusal, or times out after 20 seconds: treat as a failure. With `AI_FALLBACK=template` (default) every rule gets its template; with `AI_FALLBACK=error` return HTTP 502 `{"error": "Could not explain the reasons right now."}`
7. Log each failure reason to the console (one line per problem) so the RESULT can record prompt deltas

### Templates (used for passing rules, and as the fallback)
- R-UTIL fail: "Your cards were last reported at {pct}% of their limits. This policy declines above 50%." Watch: "Your cards were last reported at {pct}% of their limits. That is under this policy's 50% line but above Experian's 25% rule of thumb." Pass: "Your cards were last reported at {pct}% of their limits, under Experian's 25% rule of thumb." No cards: "No credit or store cards on your file."
- R-SRCH fail: "{n} hard searches in the last 90 days. This policy declines more than 1." Pass: "{n} hard search(es) in the last 90 days. This policy allows 1." (write "1 hard search", "0 hard searches")
- R-ROLL fail: "You are not on the electoral roll at your current address." Pass: "You are on the electoral roll at your current address."
- R-LATE fail: "A late payment was recorded on {date}, inside the last 12 months." Watch: "A late payment was recorded on {date}. It is older than 12 months, so it is not a decline reason here. It stays on your file until {drop_off}." Pass: "No late or missed payments on your file."
- R-PUBLIC fail: "A {default or court judgment} dated {date} is on your file. It stays until {date + 6 years}." Pass: "No defaults or court judgments on your file."
- R-DTI: "Your credit repayments are {pct}% of your monthly income of £{income}." plus "Under 30% is good." (pass), "Between 30% and 50%." (watch), "This policy declines above 50%." (fail). No income: "No regular income found in your transactions."
- R-HCSTC pass: "No payday or other high-cost short-term loans in your transactions." Watch: "{n} high-cost short-term loan payment(s) in your transactions."
- R-OD pass: "You used your arranged overdraft on {n} day(s) and never went beyond the £{limit} limit." Fail: "Your account went beyond the £{limit} arranged limit on {n} day(s)."
- R-HIST pass: "Your oldest account was opened on {date}, {months} months ago." Watch: "Your oldest account was opened on {date}, only {months} months ago."

---

## Prompt 2: split pasted advice into claims (handoff 106, inside `POST /api/check-advice`)

### System prompt (send exactly)
You read money advice that someone pasted, usually from a chatbot, and split it into separate claims so that code can check each one against the person's own credit file and transactions. You do not judge whether any claim is true.

Rules:
- One claim per piece of advice or factual statement. Ignore greetings, sign-offs and filler.
- quote: copy the claim's sentence or sentences from the text exactly, character for character. Do not fix spelling, do not shorten, do not join text that is not next to each other. Leave out list numbers such as "1." at the start.
- claim_type: pick exactly one id from this list (descriptions say what each covers): {claim_type_list}
- If none fits, use AC-OTHER.
- At most 12 claims.

Reply with JSON only, no prose before or after:
{"claims": [{"quote": "<exact text>", "claim_type": "<id from the list>"}]}

`{claim_type_list}` is built by code from `fixtures/advice-checks.json`, one line per type: `AC-MULTI-APPLY: Advice to make several credit applications, apply to more lenders, or apply again soon.` and so on.

### User message template
Advice to split:
<<<
{advice}
>>>

### Example (for the prompt designer, not sent)
Advice: "Register to vote at your new address. Lenders use the electoral roll to confirm where you live. Also, rates are falling, so wait."
Good reply:
`{"claims":[{"quote":"Register to vote at your new address. Lenders use the electoral roll to confirm where you live.","claim_type":"AC-ROLL"},{"quote":"Also, rates are falling, so wait.","claim_type":"AC-OTHER"}]}`

Expected result for the full sample: `fixtures/chatbot-advice-key.json` (8 claims; types AC-MULTI-APPLY, AC-LATE-EXPIRY, AC-ROLL, AC-PAY-BEFORE-STATEMENT, AC-STUDENT-LOAN, AC-ADDRESS-LINK, AC-PAYDAY, AC-OTHER).

### Checker (code)
1. Read the reply by joining all `text` blocks; ignore `thinking` blocks. Parse JSON with `claims`, 0 to 12 items. 0 is a valid answer (for example a greeting only): return `claims: []` and an all-zero summary, with no retry
2. `claim_type` must be in the closed list, else set it to AC-OTHER
3. `quote` must be a substring of the pasted text after collapsing runs of whitespace in both. If not, drop the claim and log it
4. Code, not Claude, sets the verdict, confidence, explanation and evidence from `advice-checks.json`
5. Bad JSON (or more than 12 claims): one retry with "Your previous reply was not valid JSON in the required shape. Reply again with JSON only." Then HTTP 502 `{"error": "Could not read the advice. Try a shorter paste."}`. Zero claims from Claude, or none left after step 3: return `claims: []` and an all-zero summary (the UI shows "No checkable claims found"). This is not an error
6. Cache good replies by a hash of the advice text in `ai-cache.json`; `DEMO_OFFLINE=true` reads only the cache (the sample advice is cached in rehearsal)
