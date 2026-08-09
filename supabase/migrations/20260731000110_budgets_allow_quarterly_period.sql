-- budgets: allow the 'quarterly' period the application has always offered.
--
-- THE BUG, proven live against the pre-migration DB with a control:
--
--   INSERT INTO budgets (..., period, start_date, end_date)
--   VALUES (..., 'quarterly', now(), now() + interval '90 days');
--   -> ERROR: new row for relation "budgets" violates check constraint
--            "budgets_period_check"
--
--   the identical insert with 'monthly' -> INSERT 0 1
--
-- So creating a quarterly budget is a hard 500, every time, for every user.
--
-- The whole application stack accepts it:
--   budget.types.ts:12    BudgetPeriod includes "quarterly"
--   budgets/route.ts:107  validPeriods includes "quarterly" (so app-level
--                         validation PASSES and the request reaches the DB)
--   budget-service.ts:201 calculatePeriodDates has a real 'quarterly' branch
-- Only the CHECK constraint disagrees:
--   CHECK (period = ANY (ARRAY['weekly','biweekly','monthly','yearly']))
--
-- This is NOT drift. The constraint has been wrong since the table was first
-- created — the app-side list and the DB-side list were never the same list.
-- That is why nothing caught it: every layer that could validate agreed with
-- itself, and the only disagreeing party was the database, which is not
-- consulted until runtime.
--
-- NOTE ON HOW THIS WAS PROVEN. The first reproduction attempt failed on
-- start_date's NOT NULL rather than on the CHECK, because Postgres enforces
-- NOT NULL during tuple construction, BEFORE CHECK constraints. Supplying the
-- date columns was required to reach the constraint at all. Worth recording:
-- a partial insert can fail for a shallower reason and hide the constraint you
-- are actually trying to demonstrate.
--
-- Widening rather than narrowing is the safe direction: no existing row can
-- violate the new constraint, since the new set is a strict superset of the old.
-- Dropping 'quarterly' from the app instead was rejected — calculatePeriodDates
-- already implements it, the UI offers it, and removing a user-facing budgeting
-- period to match a constraint nobody intended is a product regression to fix a
-- typo.

ALTER TABLE public.budgets
  DROP CONSTRAINT IF EXISTS budgets_period_check;

ALTER TABLE public.budgets
  ADD CONSTRAINT budgets_period_check
  CHECK (period = ANY (ARRAY['weekly', 'biweekly', 'monthly', 'quarterly', 'yearly']));

COMMENT ON CONSTRAINT budgets_period_check ON public.budgets IS
  'Must stay in sync with BudgetPeriod in src/lib/financial/types/budget.types.ts. budget-period-constraint-sync.test.ts enforces this mechanically.';
