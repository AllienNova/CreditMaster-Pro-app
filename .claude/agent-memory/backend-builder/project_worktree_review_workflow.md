---
name: project-worktree-review-workflow
description: Fynvita Wave 7 remediation tasks are assigned via isolated git worktrees with a no-commit, evidence-report-back workflow for money-critical changes
metadata:
  type: project
---

Fynvita Wave 7 (Security & Correctness Remediation) work is dispatched to backend-builder inside a dedicated git worktree (e.g. `.worktrees/wave-7-foundation`, branch `remediation/wave-7-foundation`), not the main working tree. Team-lead explicitly withholds commit authority as standard practice for this engagement, not just money-critical findings — confirmed on both a money-rail consolidation task (FND-026) AND an unrelated QA-residual cleanup sweep (auth-middleware dead code, fake billing card, audit-log actor spoofing, mock-fallback 503s) on 2026-07-24: implement + verify + report evidence (grep output, `tsc --noEmit`, `jest` pass counts, diff stat) back via SendMessage, then team-lead reviews the uncommitted diff before it lands. This overrides the standing "commit autonomously" default for the whole engagement, not a task-class subset.

**Why:** every task gets a review gate before merge, on top of tsc/jest, in a shared worktree with many concurrently active teammates. This is doubly important here because uncommitted work in this worktree has actually been silently wiped mid-session by whatever auto-commits other agents' landed work (see [[worktree-shared-collision-risk]]) — commits are the safe state in this worktree, not the risky one, which inverts the usual "commit early" instinct.

**How to apply:** when a team-lead task for this project says "do NOT commit — I review" (explicit or implied by the pattern above), treat that as durable for the rest of the engagement even after verification passes green — report and stop, don't commit anyway because tests pass. Re-verify ground truth (grep/git status on the exact files touched) immediately before reporting done, since a file matching HEAD with zero diff can mean "already reviewed and committed" OR "silently reset" — check which.
