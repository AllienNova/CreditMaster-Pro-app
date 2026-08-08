-- TASK-PAY-02 — the provider-agnostic `payments` table that payment-router owns.
--
-- Pairs with 20260801000000, which freed the name by renaming the Stripe
-- invoice ledger to `subscription_invoices`. Between those two migrations the
-- router queries a table that does not exist; it has no callers, so nothing
-- breaks, but they belong to one change and land together. See ADR-0011.
--
-- WHAT THIS RECORDS. A payment ATTEMPT through a provider — not a settled
-- Stripe invoice. Columns are taken from what payment-router.ts actually
-- writes, verified against the file rather than invented:
--   createPaymentRecord   user_id, provider, amount, currency, type, method,
--                         status, metadata, created_at, updated_at   (:647)
--   updatePaymentRecord   provider_payment_id, status, metadata      (:675)
--   handlePaymentSuccess  status, updated_at  keyed by
--                         (provider, provider_payment_id)            (:552)
--   handlePaymentFailure  status, metadata, updated_at, same key     (:564)
--
-- MONEY IS INTEGER CENTS. The column is `amount_cents`, never `amount`.
-- payment-router's `UnifiedPaymentRequest.amount` is documented as minor units
-- at :88 but the interface at :116 is a bare `amount: number` with no unit —
-- exactly the ambiguity that produced FND-024 (dollars sent where Stripe
-- expected cents, paying 1% of the intended amount) and B1 (a $50 payout
-- netting $0). TASK-PAY-03 migrates those types to the `Cents` branded type;
-- naming the column `amount_cents` means the database refuses to be the place
-- the ambiguity hides. CHECK (>= 0) because a negative payment is a refund and
-- belongs in its own row with type='refund', not a sign flip.
--
-- IDEMPOTENCY. UNIQUE (provider, provider_payment_id) exists so a retried
-- webhook or a re-driven attempt cannot book the same provider payment twice.
-- It is a partial index: provider_payment_id is NULL between creating our row
-- and the provider returning its id, and several concurrent in-flight attempts
-- must be allowed to hold NULL simultaneously. TASK-PAY-04 adds the
-- application-side idempotency keys; the router has NONE today, which is why
-- this constraint is a prerequisite for wiring rather than a nicety.
--
-- ERASURE: DELIBERATELY EXCLUDED, pseudonymised via ON DELETE SET NULL.
-- This deviates from the note in the original task card ("register in the
-- erasure cascade") and the deviation is the point: this table is a financial
-- ledger, and the settled precedent in this schema for that class is
-- pseudonymisation, not deletion —
--   subscription_invoices  (20260731000020)  SET NULL, excluded
--   affiliate_conversions  (20260731000230)  SET NULL, excluded
-- for the reason set out at length in 20260731000020: a record of money that
-- actually moved must survive the person (GDPR Art. 17(3)(b)/(e) — legal
-- obligation and defence of legal claims), and nulling the user link removes
-- the personal association while preserving the accounting record. Hard-
-- deleting payment records on erasure would destroy chargeback defence and tax
-- records. The erasure-coverage guard added in e93ceb6 forces this to be an
-- explicit decision: `payments` must appear either in the cascade array or in
-- DELIBERATE_EXCLUSIONS, and the test fails until one of them names it.
--
-- DRIFT TOLERANCE: idempotent throughout, per LAUNCH_CHECKLIST Gate C.

CREATE TABLE IF NOT EXISTS public.payments (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Nullable + SET NULL: see the erasure note above. Nullable also means a
  -- payment is never DROPPED because a user lookup failed — recording an
  -- unattributed payment beats silently discarding one.
  user_id             UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  provider            TEXT NOT NULL
                        CHECK (provider IN ('stripe', 'truelayer')),

  -- The provider's own id. NULL until the provider responds, which is why the
  -- uniqueness index below is partial.
  provider_payment_id TEXT,

  amount_cents        INTEGER NOT NULL CHECK (amount_cents >= 0),
  currency            TEXT NOT NULL DEFAULT 'usd',

  -- Mirrors payment-router.ts:79 PaymentType.
  type                TEXT NOT NULL
                        CHECK (type IN ('one_time', 'subscription', 'payout', 'transfer')),

  -- Mirrors payment-router.ts:80-85 PaymentMethodType.
  method              TEXT NOT NULL DEFAULT 'card'
                        CHECK (method IN ('card', 'bank_transfer', 'sepa', 'ach', 'open_banking')),

  -- Mirrors UnifiedPayment["status"] as mapped by mapStripeStatus().
  status              TEXT NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending', 'processing', 'succeeded', 'failed', 'canceled')),

  metadata            JSONB,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Idempotency. Partial so that concurrent attempts may each hold a NULL
-- provider_payment_id while in flight, but a given provider id can only ever
-- appear once.
CREATE UNIQUE INDEX IF NOT EXISTS payments_provider_payment_id_key
  ON public.payments (provider, provider_payment_id)
  WHERE provider_payment_id IS NOT NULL;

-- Serves handlePaymentSuccess/handlePaymentFailure, which look a row up by
-- (provider, provider_payment_id) — covered by the unique index above — and
-- per-user history reads.
CREATE INDEX IF NOT EXISTS payments_user_id_created_at_idx
  ON public.payments (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS payments_status_idx
  ON public.payments (status)
  WHERE status IN ('pending', 'processing');

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- A user may read their own payments and nothing else. There is deliberately
-- NO user-facing INSERT/UPDATE/DELETE policy: this table is written only by
-- the server under the service role. A client able to insert here could invent
-- a succeeded payment.
DROP POLICY IF EXISTS "Users can view own payments" ON public.payments;
CREATE POLICY "Users can view own payments"
  ON public.payments
  FOR SELECT
  USING (auth.uid() = user_id);

-- Service role bypasses RLS, so the `.eq("user_id", ...)` filters in
-- application code are load-bearing rather than defensive. Enforced
-- mechanically by scripts/audit-service-role-idor.js.
REVOKE ALL ON public.payments FROM PUBLIC;
GRANT SELECT, INSERT, UPDATE ON public.payments TO service_role;

COMMENT ON TABLE public.payments IS
  'Provider-agnostic payment ATTEMPTS, owned by src/lib/commerce/payments/payment-router.ts. Distinct from subscription_invoices, which holds settled Stripe invoices. amount_cents is integer MINOR UNITS. NOT in delete_user_data_cascade by design — pseudonymised via ON DELETE SET NULL, same policy as subscription_invoices (ADR-0011).';

COMMENT ON COLUMN public.payments.amount_cents IS
  'Integer minor units. Never dollars. Divide by 100 only at a presentation boundary — FND-024 and B1 were both unit-confusion bugs on live money paths.';

COMMENT ON COLUMN public.payments.provider_payment_id IS
  'The provider''s id for this payment. NULL while the attempt is in flight, which is why the uniqueness index is partial.';

COMMENT ON COLUMN public.payments.user_id IS
  'Nullable, ON DELETE SET NULL. A payment record outlives the person: erasure pseudonymises rather than destroying the accounting record (GDPR Art. 17(3)(b)/(e)).';
