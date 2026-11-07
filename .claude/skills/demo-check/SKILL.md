---
name: demo-check
description: Check the demo path still works end to end before a commit during the event, or whenever asked to check the demo.
---

1. Read `app/DEMO.md` for the demo path (if it does not exist, ask for the demo steps and write them there).
2. Start the app with the command in `app/DEMO.md`.
3. Walk every step of the demo path. For UI steps take a screenshot.
4. Report pass or fail per step. On a fail, show the error and do not commit.
