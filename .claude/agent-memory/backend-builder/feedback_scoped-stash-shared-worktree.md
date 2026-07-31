---
name: scoped-stash-shared-worktree
description: How to prove red-before-green safely when other agents have concurrent uncommitted work in the same worktree
metadata:
  type: feedback
---

To verify red-before-green against pre-fix code in a shared worktree (multiple agents editing different files concurrently, e.g. `.worktrees/wave-7-foundation`), never run a bare `git stash` — it stashes every other agent's uncommitted work too. Instead use a path-scoped stash: `git stash push -m "<label>" -- <exact file path>`, which reverts only that one file to HEAD. Run the new test (expect failure), then `git stash pop` to restore the fix, then re-run (expect pass). Confirmed working: `git diff -- <path>` is empty immediately after the scoped push, and `git stash pop` cleanly restores exactly that file with no side effects on other dirty files in the tree.

**Why:** Discovered while fixing the `tax_accounts` phantom-table bug (commit 59c82bb) — the team-lead's brief explicitly flagged another agent (`build-trading-persistence`) was actively editing `src/lib/trading/**` in the same worktree at the same time. A full `git stash` would have swept up that agent's in-progress work.

**How to apply:** Any time a task in a shared/team worktree needs genuine red-before-green proof (not just code-reading confidence) and the fix touches only a small number of files. Doesn't scale to fixes spanning many files with interdependencies (would need multiple scoped stashes in the right order) — for those, prefer reasoning from a direct source read plus a fresh isolated checkout if literal execution is required.
