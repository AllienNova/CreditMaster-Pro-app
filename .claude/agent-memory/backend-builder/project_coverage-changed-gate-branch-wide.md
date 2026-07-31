---
name: coverage-changed-gate-branch-wide
description: npm run test:coverage:changed diffs the whole branch against origin/main, not just your session's edits
metadata:
  type: project
---

`npm run test:coverage:changed` (`scripts/check-changed-coverage.js`) resolves its base ref to `origin/main` (falling back through `main`/`origin/master`/`master`) and diffs the entire working tree against that base — which on a long-lived branch like `remediation/wave-7-foundation` means the WHOLE branch's cumulative diff since it forked from main, not just the current session's uncommitted edits. As of 2026-07-31 this reported 636 files "under gate" and 220 failing, almost none of which belonged to the task at hand (a 3-file fix).

Don't read the aggregate "N file(s) below 85%" failure count as a signal about your own change. Instead grep the full log (redirect both stdout+stderr correctly: `> file 2>&1`, not `2>&1 > file` — the latter splits them across destinations and will hide the per-file PASS/FAIL lines) for your exact changed file paths; each gated file gets exactly one line, either `PASS  100.0% of N changed point(s)  <file>`, `PASS  no executable code on changed lines  <file>` (comment-only diffs), or a failure line. Confirmed this session: a 3-file diff (2 route files + 1 comment-only type file) showed 100%/100%/no-executable-code individually, while the aggregate summary showed 220 unrelated failures from other agents' concurrent work and prior branch history.

**Why:** Nearly mistook 220 pre-existing, out-of-scope failures for a blocker on a narrowly-scoped fix; would have wasted significant time investigating or (worse) been tempted to "fix" files outside the assigned task.

**How to apply:** Whenever running this gate on this branch, grep the log for your own paths specifically rather than trusting the pass/fail exit code or the aggregate count alone.
