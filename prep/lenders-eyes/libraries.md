# Lender's Eyes: libraries, APIs and by-hand checks

Written 2026-11-06. Every check below was one request by hand with curl on 2026-11-06. No keys printed. Docs links returned HTTP 200 on 2026-11-06 unless marked.

## Libraries (all public open source; add each to `app/DISCLOSURES.md` when installed)
| Library | Used for | Docs | Notes |
|---|---|---|---|
| FastAPI | Backend routes, Pydantic models | https://fastapi.tiangolo.com/ | Pydantic comes with it: https://docs.pydantic.dev/latest/ |
| uvicorn | Dev server | https://uvicorn.dev/ (also https://pypi.org/project/uvicorn/) | `www.uvicorn.org` did not answer (HTTP 000) on 2026-11-06; use these two |
| anthropic (Python SDK) | Claude calls in 105 and 106 | https://pypi.org/project/anthropic/ , https://docs.anthropic.com/en/api/messages | Model from `LLM_MODEL` |
| python-dotenv | Load `.env` | https://pypi.org/project/python-dotenv/ | |
| uv | Python project and packages | https://docs.astral.sh/uv/ | `uv init --app --no-package` |
| Vite + React + TypeScript | Frontend | https://vite.dev/guide/ , https://react.dev/ | `pnpm create vite@latest <folder> --template react-ts` |
| Tailwind CSS v4 (`@tailwindcss/vite`) | Styling | https://tailwindcss.com/docs/installation/using-vite | No config file, no PostCSS |
| pnpm | Frontend packages | https://pnpm.io/ | |
| Impeccable | Design skill for Claude Code | https://github.com/pbakaus/impeccable | Already in DISCLOSURES template |
| Playwright MCP | Screenshots and UI checks | https://github.com/microsoft/playwright-mcp | Already in DISCLOSURES template |
- Not needed: no chart library (the timeline is plain CSS), no date library (Python `datetime` and `decimal` from the standard library; JavaScript only displays the strings it is given), no database

## APIs
| API | Auth | Rate limits | Check on 2026-11-06 | Result |
|---|---|---|---|---|
| Claude API (Anthropic) | `ANTHROPIC_API_KEY` in `.env` | Account limits; 1 call per assess, 1 per advice check | Checked by hand by the main session: `GET /v1/models/claude-sonnet-5-5` HTTP 200, one `POST /v1/messages` returned a normal reply. Not re-checked here | **working** |
| Capital One UK hackathon API, `https://hackathon.capitalone.co.uk` and `/docs/` | Unknown (needs access from their engineers) | Unknown | `curl https://hackathon.capitalone.co.uk` and `https://hackathon.capitalone.co.uk/docs/`: HTTP 000, curl exit 6 (could not resolve host). `dig` returns nothing; the resolver says NXDOMAIN. The parent domain `capitalone.co.uk` resolves. Same as on 2026-11-05 | **not working** (host does not exist in DNS today). If their brief needs it, ask at 10:00 Sat; adapter shape in `spec.md` |

## Public pages used as rule sources (one curl each, HTTP status)
These are not APIs; they are the basis quotes in `fixtures/lender-rules.json` and `fixtures/advice-checks.json`. Quotes were copied from the page text retrieved on 2026-11-06.
| Page | Status |
|---|---|
| https://www.experian.co.uk/consumer/guides/credit-utilisation-ratio.html | 200 |
| https://www.experian.co.uk/consumer/credit-cards/guides/credit-limits.html | 200 |
| https://www.experian.co.uk/consumer/guides/searches-and-credit-checks.html | 200 |
| https://www.experian.co.uk/consumer/guides/refused-credit.html | 200 |
| https://www.experian.co.uk/consumer/guides/electoral-roll.html | 200 |
| https://www.experian.co.uk/consumer/guides/late-payments.html | 200 |
| https://www.experian.co.uk/consumer/guides/defaults.html | 200 |
| https://www.experian.co.uk/consumer/guides/ccjs.html | 200 |
| https://www.experian.co.uk/consumer/guides/debt-to-income-ratio.html | 200 |
| https://www.experian.co.uk/consumer/loans/guides/payday-loans.html | 200 |
| https://www.experian.co.uk/consumer/guides/overdraft-credit-score.html | 200 |
| https://www.experian.co.uk/blogs/latest-thinking/automated-credit-decisions/how-account-categorisation-gives-lenders-the-true-picture/ | 200 |
| https://www.equifax.co.uk/crain/retention | 200 |
| https://www.citizensadvice.org.uk/debt-and-money/borrowing-money/how-lenders-decide-whether-to-give-you-credit/ | 200 |
| https://www.capitalone.co.uk/blog/credit-score-myths | 200 |
| https://www.capitalone.co.uk/blog/ai-matches-parents-personal-finance-advice | 200 |
| https://www.capitalone.co.uk/blog/ai-help-with-finances | 200 |
| https://www.capitalone.co.uk/creditcards/credit-card-eligibility-checker | 200 |
| https://www.capitalone.co.uk/free-credit-score | 200 |
| https://www.fca.org.uk/publication/financial-lives/fls-2024-credit-loans.pdf | 200 (PDF, text extracted with pdftotext) |
| https://www.fca.org.uk/publication/financial-lives/fls-2024-credit-information.pdf | 200 (PDF) |

Tried and not used:
| Page | Status | Why not used |
|---|---|---|
| https://www.moneyhelper.org.uk/en/everyday-money/credit/when-youve-been-refused-credit | 403 | Blocks curl and the fetch tool. UNVERIFIED |
| https://www.transunion.co.uk/consumer/credit-report-help/how-long-does-information-stay-on-my-credit-report-for | 403 | Blocks curl and the fetch tool. UNVERIFIED |
| https://www.handbook.fca.org.uk/handbook/CONC/5/2A.html | 200 | JavaScript app shell only, no rule text. UNVERIFIED |

## Day-of notes
- The rule sources are cited, not called. The backend never fetches them; their URLs live in the fixtures
- If the Capital One API appears on the day: one request to its health or accounts endpoint, record the status in the 101 RESULT, then decide with Cowork whether an adapter handoff is worth it (only if the brief requires their API)
