---
name: devpost
description: Draft the Devpost submission and pitch notes from the current build, for submission on day 2.
disable-model-invocation: true
---

1. Read `app/`, `app/DEMO.md` and the git log to understand what was built.
2. Draft Devpost sections into `deliverables/devpost/submission.md`: Inspiration, What it does, How we built it, Challenges, Accomplishments, What we learned, What's next, Built with.
3. Plain, specific writing. No hype words. Name the sponsor brief the project answers.
4. Add a "Disclosures" section from `app/DISCLOSURES.md`: every library, API, product, and all generative AI use (Claude Code for code, any AI assets or content). Missing a disclosure means disqualification, so check imports and package files against it.
5. List the screenshots needed into `deliverables/devpost/screenshots-needed.md`.
6. Draft pitch notes using `context/pitch-formula.md` into `deliverables/pitch/pitch-notes.md`.
