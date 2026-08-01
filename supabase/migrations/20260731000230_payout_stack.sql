-- Payout stack: the seven tables the orphaned payout rail has always queried.
--
-- Owner authorised BUILD (over quarantine or delete) for the FND-026 disposition.
--
-- SCOPE OF THIS MIGRATION, STATED PRECISELY. It creates schema. It does NOT
-- move money and does NOT switch on a provider rail. The service remains
-- unreachable — no route imports the payouts barrel — so nothing here can
-- execute against a live provider. Choosing WHICH rail (Stripe Connect vs bank
-- transfer vs PayPal) and enabling it in production are separate operational
-- decisions, and deployment is a separate gated action.
--
-- Columns are taken from the code's own declared interfaces and insert
-- payloads, not invented:
--   Payout          payout-service.ts:113-135  + createPayoutRecord's insert
--   PayoutBatch     payout-service.ts:137-148  + createPayoutBatch's insert
--   PayoutSchedule  payout-service.ts:149-160
--   Conversion      affiliate/types.ts:173-188
--
-- ── THE `payments` NAME COLLISION, RESOLVED ─────────────────────────────
-- docs/qa/orphaned-payout-stack.md flagged that `payments` is now the
-- subscription revenue ledger (20260731000020) while
-- commerce/payments/payment-router.ts expects a completely different shape on
-- the same name. This migration does NOT create a second `payments` table and
-- does NOT alter the ledger. The collision is real and stays unresolved by
-- design: payment-router is a separate orphaned module from the payout rail,
-- and silently reshaping a live revenue ledger to suit unreachable code would
-- be exactly the wrong trade. It needs its own decision — recorded here so the
-- build does not read as having settled it.
--
-- MONEY UNITS. `amount`, `fee`, `net_amount`, `total_amount`, `minimum_amount`
-- and `commission_earned` are DOLLARS (numeric), matching the arithmetic in
-- payout-service.ts and commission-calculator.ts. manual_payout_queue.amount is
-- the exception and is INTEGER CENTS — its insert already calls
-- toStripeAmount(fromDollars(...)) and says so at the call site (FND-024). The
-- column name and comment carry the unit so the next reader does not have to
-- infer it; two dollar/cent bugs have already shipped on this rail.

CREATE TABLE IF NOT EXISTS public.payouts (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id      TEXT NOT NULL,
  recipient_type    TEXT NOT NULL CHECK (recipient_type IN ('partner', 'user')),
  type              TEXT NOT NULL,
  status            TEXT NOT NULL DEFAULT 'pending',
  method            TEXT NOT NULL,
  amount            NUMERIC(18,2) NOT NULL,
  fee               NUMERIC(18,2) NOT NULL DEFAULT 0,
  net_amount        NUMERIC(18,2) NOT NULL,
  currency          TEXT NOT NULL DEFAULT 'USD',
  description       TEXT,
  reference         TEXT NOT NULL UNIQUE,
  provider_payout_id TEXT,
  source_ids        TEXT[],
  metadata          JSONB,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at      TIMESTAMPTZ,
  paid_at           TIMESTAMPTZ,
  failed_at         TIMESTAMPTZ,
  failure_reason    TEXT
);
CREATE INDEX IF NOT EXISTS payouts_recipient_created_idx
  ON public.payouts (recipient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS payouts_status_idx ON public.payouts (status);

CREATE TABLE IF NOT EXISTS public.payout_batches (
  id            TEXT PRIMARY KEY,
  status        TEXT NOT NULL DEFAULT 'pending',
  total_amount  NUMERIC(18,2) NOT NULL DEFAULT 0,
  currency      TEXT NOT NULL DEFAULT 'USD',
  payout_count  INTEGER NOT NULL DEFAULT 0,
  success_count INTEGER NOT NULL DEFAULT 0,
  failure_count INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at  TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.payout_schedules (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id      TEXT NOT NULL,
  frequency         TEXT NOT NULL CHECK (frequency IN ('weekly', 'biweekly', 'monthly')),
  day_of_week       SMALLINT CHECK (day_of_week BETWEEN 0 AND 6),
  day_of_month      SMALLINT CHECK (day_of_month BETWEEN 1 AND 31),
  minimum_amount    NUMERIC(18,2) NOT NULL DEFAULT 0,
  currency          TEXT NOT NULL DEFAULT 'USD',
  is_active         BOOLEAN NOT NULL DEFAULT true,
  last_payout_date  TIMESTAMPTZ,
  next_payout_date  TIMESTAMPTZ NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- processScheduledPayouts filters on both, every run.
CREATE INDEX IF NOT EXISTS payout_schedules_due_idx
  ON public.payout_schedules (is_active, next_payout_date);

CREATE TABLE IF NOT EXISTS public.manual_payout_queue (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payout_id       UUID REFERENCES public.payouts(id) ON DELETE CASCADE,
  reference       TEXT NOT NULL,
  recipient_name  TEXT,
  recipient_email TEXT,
  method          TEXT,
  -- INTEGER CENTS, not dollars — see the header. The writer converts.
  amount          INTEGER NOT NULL,
  currency        TEXT NOT NULL DEFAULT 'USD',
  bank_details    JSONB,
  paypal_email    TEXT,
  resolved_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.affiliate_conversions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  click_id          TEXT,
  user_id           UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  partner_id        UUID NOT NULL REFERENCES public.affiliate_partners(id) ON DELETE CASCADE,
  offer_id          TEXT,
  type              TEXT NOT NULL,
  status            TEXT NOT NULL DEFAULT 'pending',
  value             NUMERIC(18,2) NOT NULL DEFAULT 0,
  commission_earned NUMERIC(18,2) NOT NULL DEFAULT 0,
  partner_reference TEXT,
  rejection_reason  TEXT,
  metadata          JSONB,
  converted_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  confirmed_at      TIMESTAMPTZ,
  paid_at           TIMESTAMPTZ
);
-- getPendingPayout / getPartnerCommissions filter partner + status + date range.
CREATE INDEX IF NOT EXISTS affiliate_conversions_partner_status_idx
  ON public.affiliate_conversions (partner_id, status);
CREATE INDEX IF NOT EXISTS affiliate_conversions_partner_converted_idx
  ON public.affiliate_conversions (partner_id, converted_at DESC);

CREATE TABLE IF NOT EXISTS public.affiliate_payouts (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES public.affiliate_partners(id) ON DELETE CASCADE,
  payout_id  UUID REFERENCES public.payouts(id) ON DELETE SET NULL,
  amount     NUMERIC(18,2) NOT NULL,
  currency   TEXT NOT NULL DEFAULT 'USD',
  status     TEXT NOT NULL DEFAULT 'pending',
  period_start DATE,
  period_end   DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  paid_at    TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS affiliate_payouts_partner_created_idx
  ON public.affiliate_payouts (partner_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.commission_tiers (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES public.affiliate_partners(id) ON DELETE CASCADE,
  -- min_volume is DOLLARS of monthly volume; multiplier scales the base rate
  -- (1.0 = no change). getCommissionTiers orders by min_volume ascending.
  min_volume NUMERIC(18,2) NOT NULL,
  multiplier NUMERIC(6,4) NOT NULL DEFAULT 1.0 CHECK (multiplier > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (partner_id, min_volume)
);

-- RLS. These are operator/partner financial surfaces written only by the
-- service role. affiliate_conversions is the one table carrying a user_id (the
-- converting user) — SELECT-own only, and no client write policy: a client that
-- could insert here could invent a commission.
ALTER TABLE public.payouts               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payout_batches        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payout_schedules      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.manual_payout_queue   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_conversions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_payouts     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commission_tiers      ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service role manages payouts" ON public.payouts;
CREATE POLICY "service role manages payouts"
  ON public.payouts FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service role manages payout batches" ON public.payout_batches;
CREATE POLICY "service role manages payout batches"
  ON public.payout_batches FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service role manages payout schedules" ON public.payout_schedules;
CREATE POLICY "service role manages payout schedules"
  ON public.payout_schedules FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service role manages manual payout queue" ON public.manual_payout_queue;
CREATE POLICY "service role manages manual payout queue"
  ON public.manual_payout_queue FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service role manages affiliate conversions" ON public.affiliate_conversions;
CREATE POLICY "service role manages affiliate conversions"
  ON public.affiliate_conversions FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Users can view own conversions" ON public.affiliate_conversions;
CREATE POLICY "Users can view own conversions"
  ON public.affiliate_conversions FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "service role manages affiliate payouts" ON public.affiliate_payouts;
CREATE POLICY "service role manages affiliate payouts"
  ON public.affiliate_payouts FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service role manages commission tiers" ON public.commission_tiers;
CREATE POLICY "service role manages commission tiers"
  ON public.commission_tiers FOR ALL TO service_role USING (true) WITH CHECK (true);

-- service_role needs explicit table GRANTs on this instance; rolbypassrls does
-- not substitute for one. Established by 20260731000005/000006.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payouts               TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payout_batches        TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payout_schedules      TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.manual_payout_queue   TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.affiliate_conversions TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.affiliate_payouts     TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.commission_tiers      TO service_role;

COMMENT ON COLUMN public.manual_payout_queue.amount IS
  'INTEGER MINOR UNITS (cents), unlike every other money column in this stack which is dollars. The writer converts via toStripeAmount(fromDollars(...)). FND-024 was a dollar/cent bug on this exact rail.';
COMMENT ON TABLE public.payouts IS
  'Outbound payout records. Schema built per the owner FND-026 decision; the rail itself is not wired and no provider is selected.';
