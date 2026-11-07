---
paths:
  - "**/*.{ts,tsx,js,jsx,css,html}"
---

- Every screen in the demo path needs a loading state and an error state
- No placeholder lorem ipsum in anything a judge will see
- Check UI changes with a screenshot before committing
- Design with Impeccable: run `/impeccable init` once in the event repo (writes PRODUCT.md), shape screens with `/impeccable shape`, finish with `/impeccable polish` and `/impeccable audit`
- After every UI change, use Playwright MCP to open the running app, take a screenshot and check it against the demo path before committing
- Avoid the generic AI look (purple gradients, glass cards, emoji headers). One accent colour, real content, no lorem ipsum
- `/impeccable init` asks questions: answer them yourself from the handoff's Context (concept, user, sponsor, tone). Do not wait for a human. Skip the `shape` interview when the handoff already specifies the screen
- Never stop at a verification step that needs the backend. If the backend is not up yet, do the mock-mode checks, then `/impeccable polish` and `audit`, then the real-backend check last. Finish the whole handoff in one run
- Playwright MCP screenshots can lag one action behind: wait a second and take the screenshot twice before judging it
- Add every package to `app/DISCLOSURES.md` as soon as you install it (scaffold defaults included, e.g. oxlint)
