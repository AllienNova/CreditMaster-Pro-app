---
name: budgets-quarterly-check-constraint-gap
description: budgets_period_check CHECK constraint silently omits 'quarterly' even though the app type/route/UI all accept it
metadata:
  type: project
---

The live `budgets` table's `period` CHECK constraint (`budgets_period_check`, confirmed via `pg_get_constraintdef` on the local Supabase Postgres, 2026-07-31) is `CHECK (period = ANY (ARRAY['weekly', 'biweekly', 'monthly', 'yearly']))` — **it does not include `'quarterly'`**, even though `BudgetPeriod` in `src/lib/financial/types/budget.types.ts` is `"weekly" | "biweekly" | "monthly" | "quarterly" | "yearly"`, `calculatePeriodDates()` in `budget-service.ts` has a full `case "quarterly":` branch, and the POST `/api/financial/budgets` route's `validPeriods` array accepts `"quarterly"`. Any budget created with `period: "quarterly"` will pass every app-level check and then fail at the database with a constraint violation.

Traced to the table's origin: `supabase/migrations/20250207000000_financial_intelligence_schema.sql:108` (the migration that actually created the table — a later migration's `CREATE TABLE IF NOT EXISTS` with the full 5-value list is a no-op since the table already exists) defines the CHECK without `quarterly` from day one. Not a regression, not schema drift from an ALTER — the constraint was always missing this value. Confirmed zero hits for `quarterly`/`budgets_period_check` in `docs/ssot/gap_analysis.md` as of 2026-07-31, so this is untracked.

**Why:** Found while fixing the `budget-service.ts` live-column-name bug ([[scoped-stash-shared-worktree]]) — while verifying the real `budgets` schema via `\d+ budgets` and `pg_get_constraintdef`, the period CHECK's array was one value short of what the app validates. Out of scope for that task (a column-naming fix, not a constraint fix) and orthogonal to it — fixing it means altering a CHECK constraint, which is a schema change requiring the same product/db-architect coordination as the also-flagged missing `name` column, not a unilateral fix in a shared worktree.

**How to apply:** If asked to work on budget period selection, quarterly budgets, or investigate a mysterious 500 on budget creation with `period=quarterly`, check this constraint first (`pg_get_constraintdef('budgets_period_check'::regclass)` or equivalent) before assuming the bug is elsewhere. The fix is a migration adding `'quarterly'` to the CHECK array — flag it as a schema change needing sign-off, don't apply it solo in a multi-agent worktree.
