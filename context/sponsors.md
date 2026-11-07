# Sponsors (short form)

Condensed from Mihael's sponsor dossiers, 2026-11-03. All guesses about briefs are UNCONFIRMED. Do not edit here.
Common thread across sponsors: trust and reliability (is it true, how confident, who is reliable, no hallucinated advice).

## Capital One UK (gold)
- UK card provider, HQ Nottingham. Near-prime and credit-builder customers. Values: simplicity, plain language, "customer dignity and digital excellence"
- Past briefs: "Make Credit Simple" (WHACK 2025), managing finances (2024), financial literacy (HackNotts). Winners and most entries were games and literacy apps: avoid quiz/game unless it changes behaviour
- Likely brief family: understanding credit (our estimate ~40%), fraud and scams, financial inclusion
- Already built, avoid copying: eligibility checker, CreditWise UK, app alerts, card lock, arrears and repayment plans, repayment calculator, trusted person. No UK chatbot (a gap)
- Judges like: real customer pain they measure (errors, arrears, persistent debt, collections, fraud, financial abuse), Consumer Duty story, dignity in the UX, responsible AI
- Data: Capital One UK hackathon API (accounts, transactions, fake fraud), docs at hackathon.capitalone.co.uk/docs (check access)

## Brevan Howard (gold)
- Global macro hedge fund. Rates, FX, central banks, geopolitics, positions held weeks to months
- 2025 brief (verbatim): "Accurate Information is really important for making decisions. Create something that helps understand information accuracy, for example, social media posts, news headlines, economic predictions, AI responses, etc." Winner: a suite of four features (LLM consensus, fact vs opinion, two-sided story, sentiment vs returns)
- Likely: information accuracy again, AI trust in finance, macro text into signals, analyst copilot
- Avoid: generic summarisers, calendars, "chat with macro data", plain sentiment (vendors already do it)
- Judges like: sits on a real desk workflow (data release, central bank event, trade break), turns multi-source data into a call not a summary, auditable, fails loudly on missing data, live on public data
- Data: FRED, BoE database, ECB, GDELT, EDGAR (User-Agent with team name and email), yfinance, CoinGecko, Polymarket/Kalshi

## incident.io (gold)
- London incident-management company: on-call, response in Slack, status pages, AI SRE "Investigations". Go, TypeScript, Postgres, GCP. Culture: ship fast
- 2025 brief: an agent that rapidly adapts (broad). Winner was not an incident tool (live-updating character profiles for authors)
- Likely: adaptive agent that stays current, "when things go wrong", AI you can trust with evidence and confidence
- Avoid (they ship it or it is on their roadmap): anything like Investigations, AI SRE, self-driving runbooks, alert deflection, risky-change detection
- Their hard problems: evals for multi-agent systems, showing reasoning and uncertainty, post-mortem actions that die, AI-caused incidents, flaky dependencies
- Judges like: small scope that works live end to end, honest confidence, human-AI collaboration, product polish, use of their API, webhooks, MCP or Slack app
- Data: Status Page Widget API (no auth, live incidents), public REST API (account needed), public post-mortem collections

## Marshall Wace (gold, first time at WHACK)
- London long/short equity fund. TOPS: scores many analysts' trade ideas by track record and builds portfolios from them
- Briefs are open themes they reuse: "Chain of Events" (IC Hack 25, DurHack 2024), "Emergent Behaviour" (IC Hack 26), "Bridging Worlds" (DurHack X)
- Winners were playful and creative, not deep finance
- Judges like: hits the theme literally AND has a real fund use underneath (scoring noisy sources by track record, signal decay, data trust, agents doing research), good agent engineering, personality
- Data: EDGAR, Companies House, GDELT, Wikidata, OpenAlex, market data

## Silver
- Bloomberg, Netcraft: probably no brief. Netcraft angle: phishing in the AI era
