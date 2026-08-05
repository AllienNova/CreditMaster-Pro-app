---
name: implement-task
description: "End-to-end implementation using PIDVA: PRE-INVESTIGATE → PLAN → DO → VERIFY → ADAPT. Use for any non-trivial coding task."
allowed-tools: Read Write Edit Grep Glob Bash
---

# Implement Task

Do not skip steps.

**P — Pre-Investigate.** Run `pre-investigation` skill. BUILD / EXTEND / SKIP. If SKIP, stop with reference.

**P — Plan.** Read every file you'll touch in full. Map callers/callees. Design the smallest correct change. List tests to write first. If requirements ambiguous: state your interpretation, do NOT guess silently.

**D — Do.** Tests first when testable in isolation (red). Smallest code to pass (green). Match existing style. No new abstractions for single-use logic. No defensive checks for impossible conditions. One logical change per commit.

**V — Verify.** Lint changed files. Type check. Full test suite (show counts). Build (zero warnings). UI → screenshot. API → hit endpoint, confirm response.

**A — Adapt.** Failure → root cause → fix → re-verify from step 1. 3 retries on same approach → stop, document blocker, escalate.

## Refuse
- "Works on my machine" without runtime evidence
- Disabling failing tests
- `any` / `# type: ignore` / `unwrap()` to silence type errors
- Implementing without reading existing code
- Touching files outside stated scope

## Output
```
TASK — [one sentence]
Pre-investigation: BUILD | EXTEND | SKIP — [ref]
Files: [paths + change summary]
Tests: [paths + counts]
Verify: lint PASS | types PASS | tests X/X | build PASS | runtime PASS
```
