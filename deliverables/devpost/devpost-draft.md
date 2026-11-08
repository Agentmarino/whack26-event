# Cap: your credit coach

## Inspiration
In two years, 3.2 million UK adults were turned down for credit, and almost half of them couldn't get what they needed at all (FCA Financial Lives 2024). A decline letter usually says little more than which credit agency the lender used. People are left guessing which part of their file caused it, what to change and when it will be different. Capital One asked us to make credit accessible. We think the biggest barrier is that credit is hard to understand, so we built someone to explain it.

## What it does
Cap is a pixel-art credit coach at a Capital One desk. You talk to him like a character in a game.
- He introduces himself with his business card and asks where to start: you've been declined, you have a credit report, you want to get ready before applying, or you're new to credit or the UK
- You hand over your credit report, bank transactions and any decline letter (upload, or use a sample), and answer a few questions. He asks follow-ups based on what he spotted in your data
- If you were declined, he explains why the lender most likely said no, the one fix that matters most, and when to check again with QuickCheck first
- He then gives the diagnosis one idea at a time: what's holding your credit back, with your own numbers and a "Why?" behind every figure (the rule, your data point and the source)
- He slides you a printable summary across the desk
- Then he coaches you: a dated 3- or 6-month plan with your own amounts and payees, an estimated score range for each month, the Capital One card ladder (which card, which bills to put on it, and the month each criterion for the next card turns green), and "what if" questions in plain words ("what if I pay £300 more?")

## Accessibility
Making credit accessible meant the app had to be accessible too:
- Plain English mode (Cap explains at a reading age of about 9)
- Read aloud and voice input
- Text size up to 150% and a readable font option
- Colour-safe modes (red-green safe and high contrast), and no status shown by colour alone
- Full keyboard and screen-reader support, reduced motion respected
- Works as a home-screen app on iPhone

## How we built it
- **Credit engine (deterministic code):** scores six factors from the report and bank data, fires 15 rules into actions with your own amounts and payees, schedules them into dated plans, projects estimated score ranges, picks the Capital One card ladder and decodes decline letters. Every number carries a "because": the rule, your data point and the source, with our assumptions labelled as assumptions
- **Claude:** reads PDF reports, bank statements and letter photos into the engine's format, writes Cap's words, and turns free-text what-ifs into the engine's levers. Claude never calculates: a checker compares every amount, percentage and date Claude writes with the engine's output and falls back to fixed wording if anything doesn't match. All JSON calls use structured outputs
- **Conversation layer:** a Fastify backend runs the conversation as steps and sends one idea per message, each with Cap's mood and gesture
- **Front end:** React, TypeScript and a hand-built pixel-art character kit (layered sprite, state machine, 11 states, 4 moods, 6 gestures) in a glass-walled office, a classic game dialogue box in Press Start 2P, and a notebook panel for the detail
- **Offline demo:** good Claude outputs are cached, so the whole demo runs with no network
- Stack: TypeScript, Node, Fastify, zod, React, Vite, Tailwind, Claude API, Playwright for testing

## Challenges we ran into
- Keeping AI honest with money: we split the work so code computes and Claude only words, then checked Claude's numbers against the engine
- Making a game look feel calm and trustworthy for someone who has just been declined
- Pixel art that reads on a phone: we redrew Cap several times to get a face that carries the conversation at iPhone size
- Two halves built in parallel: a shared typed contract let the backend and front end be built side by side

## Accomplishments we're proud of
- Every figure on screen can answer "why?"
- A character people actually want to talk to about credit
- Accessible from the first screen, not added at the end

## What we learned
- The useful part of credit advice isn't the score, it's the dated plan with your own numbers
- Structured outputs plus a number checker make an LLM safe to put in front of financial data

## What's next
- Open Banking and credit agency data with consent instead of uploads
- Inside Capital One: zero input, run on the data they already hold at the moment of a decline
- Monthly check-ins where Cap re-runs the plan when the next statement lands

## Built with
typescript, node.js, fastify, zod, react, vite, tailwindcss, claude-api, playwright

## AI and tool disclosure
Built during WHACK 26 with Claude Code and Claude (Cowork). Full list of tools, libraries, fonts and data sources in `app/DISCLOSURES.md`. Personas are synthetic. Scores are estimates on a reference scale; point figures from Experian via Which? where published, our assumptions elsewhere (labelled in the engine). Capital One name and logo used for their challenge, shown unchanged.
