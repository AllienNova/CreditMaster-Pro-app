---
name: grep-repo-wide-for-fictional-fixtures
description: When fixing a live-schema column-name bug, grep the whole repo for the wrong column names, not just the file you were assigned — duplicate fictional fixtures hide in unrelated test files
metadata:
  type: feedback
---

When a service's DB column mapping is wrong (reads/writes column names that don't exist live), the wrong names tend to be duplicated as literal mock-fixture keys in more than one test file, not just the co-located unit test for that service. Fixing only the assigned file's tests and running `tsc --noEmit` clean is not sufficient proof the fix is safe — a second file with the same fictional fixture will pass type-checking (loose `Record<string, unknown>` + `as BudgetRow` casts don't catch it) and then fail at runtime once the real mapping changes.

**Why:** Fixing the `budgets` table column-name bug in `budget-service.ts` ([[scoped-stash-shared-worktree]], commit `89718c2`) only required touching `budget-service.ts` + its own `__tests__/budget-service.test.ts` per the assigned task. Running `npx jest src/lib/financial --no-coverage` after the fix (not just the one test file) surfaced 2 failures in a completely different file, `financial-pipeline.integration.test.ts`, whose own `createMockBudgetRow()` factory independently hardcoded `budgeted_amount`/`spent_amount`/`period_start`/`period_end`/`is_active` — the exact same fictional columns, duplicated. `tsc --noEmit` was clean the whole time; only running the broader test suite caught it.

**How to apply:** After fixing any live-schema/column-mapping bug, before calling it done: (1) `grep -rn` the old fictional column names across the whole repo (not just the assigned directory) to find every duplicate fixture, and (2) always run the broader test suite one level up from the assigned file (e.g. `src/lib/financial` not just `src/lib/financial/__tests__/budget-service.test.ts`) to catch fixture drift in sibling/integration test files before declaring the gate green.
