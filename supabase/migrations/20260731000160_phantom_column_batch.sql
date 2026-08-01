-- Phantom-column batch: columns live code writes that the schema never had.
--
-- All found by scripts/audit-phantom-columns.js. Each is ADDITIVE — a column
-- the code's intent clearly requires, with no existing equivalent to repoint
-- onto. Where an equivalent DID exist, the code was moved instead (see
-- vitality_score_history below, and strategy_lifecycle in 20260731000070);
-- adding a synonym alongside a real column is the twin-column defect this wave
-- exists to remove, not a fix for it.
--
-- ── profiles.monthly_income ───────────────────────────────────────────────
-- Read at savings-optimizer.ts:618 and wellness-gate.ts:233. Two separate
-- agents investigated this independently and both concluded the column has
-- NEVER existed anywhere in the schema — and that the comment in the old code
-- claiming "monthly_income exists in DB but not in TS types" was simply false.
-- Both call sites already degrade to a transaction-derived income estimate, so
-- nothing crashes today; the effect is that a user's SELF-REPORTED income is
-- collected nowhere and every downstream calculation silently uses an estimate.
-- Adding the column makes the existing read path meaningful. It is nullable:
-- NULL means "user has not told us", which is exactly the case the fallback
-- already handles.
--
-- ── financial_insights: dismissed_at / action_taken / action_taken_at ─────
-- smart-insights-engine.ts dismissInsight() (:214) sets dismissed + dismissed_at;
-- recordAction() (:232) sets action_taken + action_taken_at. The table has
-- `dismissed` and `acted_upon` booleans but no timestamps and no record of WHAT
-- action was taken. Naming a nonexistent column fails the whole UPDATE, and both
-- methods end in `return !error` — so dismissing an insight or recording an
-- action returned false and silently did nothing.
-- These are NOT synonyms for acted_upon: a boolean cannot answer "when" or
-- "which action", which is the entire point of the two methods.
--
-- ── disputes.last_followup_at ─────────────────────────────────────────────
-- dispute-followups.ts:195 updateLastFollowup() writes it, and the write is
-- fire-and-forget (no { error } destructured). So the follow-up timestamp was
-- never recorded and the cron had no way to tell an already-followed-up dispute
-- from a fresh one. No existing column tracks this; sent_at is when the dispute
-- went to the bureau, which is a different event.
--
-- ── addon_subscriptions.stripe_price_id ──────────────────────────────────
-- /api/addons/subscribe:90 inserts it. The table has stripe_subscription_id,
-- which is a different identifier — the subscription instance, not the priced
-- product. Both are needed to reconcile an add-on against Stripe.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS monthly_income NUMERIC(14,2);

ALTER TABLE public.financial_insights
  ADD COLUMN IF NOT EXISTS dismissed_at    TIMESTAMPTZ;
ALTER TABLE public.financial_insights
  ADD COLUMN IF NOT EXISTS action_taken    TEXT;
ALTER TABLE public.financial_insights
  ADD COLUMN IF NOT EXISTS action_taken_at TIMESTAMPTZ;

ALTER TABLE public.disputes
  ADD COLUMN IF NOT EXISTS last_followup_at TIMESTAMPTZ;

ALTER TABLE public.addon_subscriptions
  ADD COLUMN IF NOT EXISTS stripe_price_id TEXT;

-- ── vitality_score_history: the UNIQUE constraint its upsert already assumes ──
--
-- vitality-score-service.ts:1124 upserts with `onConflict: "user_id,date"`.
-- Neither the `date` column nor that unique constraint existed, so the write
-- failed outright and vitality-score history was never recorded for anyone.
--
-- The companion code change repoints it onto the CANONICAL columns this table
-- already has — period_start (a date) plus period_type — rather than adding a
-- `date` synonym beside period_start. This constraint is what makes the
-- daily-idempotent upsert the code intends actually work.
CREATE UNIQUE INDEX IF NOT EXISTS vitality_score_history_user_period_key
  ON public.vitality_score_history (user_id, period_type, period_start);

-- The component scores must accept NULL, because "unavailable" is a real and
-- meaningful state that this service deliberately preserves.
--
-- saveScoreToHistory takes `credit | spending | savings | debt | investments`
-- as `number | null`, and a prior review established — with tests still
-- guarding it ("unavailable debt persisted as null, never a fabricated 0") —
-- that a component we could not compute must NOT be written as 0. A 0 is a
-- terrible score; NULL is "we don't know". Coercing one into the other is
-- exactly the fabrication class this wave has been removing everywhere else.
--
-- The five component columns were NOT NULL, so any user with a single
-- unavailable component would have failed the write outright and lost their
-- whole history row. overall_score stays NOT NULL: it is typed `number`,
-- always computed, and never null.
ALTER TABLE public.vitality_score_history ALTER COLUMN credit_score      DROP NOT NULL;
ALTER TABLE public.vitality_score_history ALTER COLUMN spending_score    DROP NOT NULL;
ALTER TABLE public.vitality_score_history ALTER COLUMN savings_score     DROP NOT NULL;
ALTER TABLE public.vitality_score_history ALTER COLUMN debt_score        DROP NOT NULL;
ALTER TABLE public.vitality_score_history ALTER COLUMN investments_score DROP NOT NULL;

COMMENT ON COLUMN public.profiles.monthly_income IS
  'User-reported monthly income. NULL means not supplied — callers fall back to a transaction-derived estimate.';
COMMENT ON COLUMN public.financial_insights.action_taken IS
  'Which action the user took on this insight. Distinct from acted_upon, which only records that one was.';
COMMENT ON COLUMN public.disputes.last_followup_at IS
  'When a follow-up was last sent. Distinct from sent_at, which is when the dispute went to the bureau.';
