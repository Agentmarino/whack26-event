---
name: handoff
description: Start work on a handoff file from handoffs/ by its number, plan it, build it, verify it and write the result back.
disable-model-invocation: true
argument-hint: [handoff number, e.g. 101]
---

Work on handoff $ARGUMENTS.

1. If you are on a branch ending `/$ARGUMENTS` with changes to tracked files, commit them there first: `git commit -am WIP`. Then `git switch main && git fetch origin && git merge origin/main`. Find `handoffs/$ARGUMENTS-*.md` and read it in full. If it is missing, or its status is `done` or `blocked`, stop and say so.
2. Read `CLAUDE.local.md` for who is running this session. If the handoff's `owner` does not match, stop and say so. If `CLAUDE.local.md` is missing, ask once and offer to create it.
3. If status is `ready`, on `main`: set status to `in-progress` in the handoff file and in `handoffs/INDEX.md`. If the handoff file is uncommitted, or its INDEX row is uncommitted or missing, add them in this same commit. Commit, push. If the push is rejected, `git fetch origin && git merge origin/main`, keep the newest status in each INDEX row, commit, push again. This is the only push to `main`. Then `git switch -c <owner>/$ARGUMENTS`.
   If status is `in-progress`, this is a resume. If branch `<owner>/$ARGUMENTS` exists, locally or on origin, switch to it and read the handoff and the branch's commits. If the handoff there says `done` or `blocked`, stop and say so. Otherwise skip the status flip and continue with what is left. If the branch does not exist, stop and say so.
4. Read the files listed under Context.
5. Unless the change is trivial, write a short plan and check it against Requirements and Out of scope before building.
6. Build. Touch only the folders the handoff names. Commit after each working step and push the branch with `git push -u origin HEAD`.
7. Run the exact Verification. If it fails, fix the root cause and run it again.
8. Run the `reviewer` agent on the diff against the handoff. Fix anything that affects correctness or the requirements.
9. Fill in the RESULT section with real evidence (commands and their output), including "Follow-ups needed after the first prompt" (the prompt deltas). Set status to `done` or `blocked` in the handoff file only; leave `handoffs/INDEX.md` alone, Mihael updates it when merging. Commit and push the branch with `git push -u origin HEAD`.
10. Reply with a three line summary: done or blocked, what changed, follow-ups.
