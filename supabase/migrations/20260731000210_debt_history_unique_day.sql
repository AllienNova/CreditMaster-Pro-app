-- debt_history: the per-day uniqueness its siblings already have.
--
-- net_worth_history, savings_history, investment_history and monthly_summaries
-- each carry a UNIQUE (user_id, <period>) constraint, which is what makes a
-- daily snapshot idempotent — re-running the job updates the day's row instead
-- of appending a duplicate. debt_history was created without one.
--
-- Without this, the snapshot producer added in this same commit would insert a
-- new debt_history row on every run, and a cron that retries (or a manual
-- re-run) would silently corrupt the series with duplicate points for one day.
-- An upsert needs a constraint to conflict on; there was none.

CREATE UNIQUE INDEX IF NOT EXISTS debt_history_user_id_date_key
  ON public.debt_history (user_id, date);
