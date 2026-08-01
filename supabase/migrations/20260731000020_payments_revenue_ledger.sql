-- payments: the subscription revenue ledger.
--
-- THE BUG THIS FIXES (verified live against the pre-migration DB):
--   GET /api/admin/metrics (src/app/api/admin/metrics/route.ts:49, guarded by
--   withRole -> reachable in production) issues
--       supabase.from("payments").select("amount, created_at").gte(...)
--   against a table that exists in NO migration. PostgREST RESOLVES an
--   {error} object rather than throwing, the route reads only
--   `revenueResult.data`, and route.ts:66 collapses the null to zero:
--       const revenue = revenueResult.data?.reduce(...) || 0;
--   So the admin revenue figure is not merely wrong, it is STRUCTURALLY
--   INCAPABLE of being non-zero. An operator reading that dashboard concludes
--   the business has earned nothing.
--
--   The deeper defect is that the table's absence was not an oversight in one
--   query -- NOTHING IN THE CODEBASE EVER RECORDED A PAYMENT. Confirmed by
--   exhaustive grep: the only writer in the Stripe webhook path,
--   handleInvoicePaid (src/lib/payment/stripe-service.ts:609), touches exactly
--   one table -- `subscriptions` (line 664) -- to reset the credit allowance.
--   Every paid invoice updated the subscription row and left no financial
--   record whatsoever. The platform had no revenue ledger at all. This
--   migration plus its companion writer in the same commit creates one.
--
-- Column derivation -- every column traces to a field the writer actually has
-- from the Stripe Invoice object or the subscription lookup. No invented
-- columns, none omitted:
--   stripe_invoice_id   <- invoice.id            (idempotency key, see below)
--   stripe_event_id     <- eventId               (the webhook delivery)
--   stripe_customer_id  <- invoice.customer      (string | Customer.id)
--   stripe_subscription_id <- invoice.parent.subscription_details.subscription
--   amount_cents        <- invoice.amount_paid   (Stripe sends MINOR UNITS)
--   currency            <- invoice.currency
--   paid_at             <- invoice.status_transitions.paid_at (epoch seconds)
--   user_id             <- subscriptions.user_id, resolved via
--                          stripe_subscription_id
--
-- MONEY UNITS -- amount_cents is INTEGER MINOR UNITS, and the column name says
-- so on purpose. This codebase has already shipped two dollar/cent unit bugs
-- on live money paths (FND-024, Stripe payout sent dollars into a cents field
-- and paid 1% of the intended amount; B1, calculateFees netted a $50 payout to
-- $0). invoice.amount_paid is ALREADY in cents, so the writer stores it
-- verbatim with no arithmetic. Any reader that wants dollars divides by 100 at
-- the presentation boundary and nowhere else. Do not add a `amount` numeric
-- column alongside this one -- an ambiguous unit is how both prior bugs
-- happened.
--
-- IDEMPOTENCY -- stripe_invoice_id is UNIQUE. Stripe redelivers webhooks on
-- any non-2xx, and handleInvoicePaid rethrows on failure precisely so Stripe
-- WILL retry. Without the constraint a single retried invoice would be counted
-- as revenue twice. The writer uses ON CONFLICT DO NOTHING so a retry is a
-- no-op rather than an error, matching the "DB work FIRST, email LAST"
-- ordering already documented at stripe-service.ts:642. This reuses the
-- pattern established by commit d64e8d5 (atomic RPC + UNIQUE constraint).
--
-- user_id IS NULLABLE, AND ON DELETE SET NULL -- NOT the ON DELETE CASCADE
-- used elsewhere in this schema. This is a deliberate deviation, flagged for
-- owner review:
--   (a) A financial ledger that disappears when a user is erased destroys the
--       accounting record of money the business actually received. Revenue
--       reporting, tax records, and chargeback defence all need the row to
--       survive the person.
--   (b) GDPR Art. 17(3)(b)/(e) exempts processing required for a legal
--       obligation or the establishment/exercise/defence of legal claims;
--       financial records are the textbook case. Nulling the user link is
--       pseudonymisation -- it removes the personal association while keeping
--       the amount -- which is the standard resolution of this tension.
--   (c) Nullable also means a payment is never DROPPED when the subscription
--       lookup fails to resolve a user. Recording an unattributed payment
--       beats silently discarding it -- discarding is the exact failure mode
--       this migration exists to end.
-- CONSEQUENCE FOR ERASURE: because this is SET NULL rather than CASCADE, this
-- table intentionally does NOT belong in delete_user_data_cascade's table
-- list. If the owner decides financial records must instead be hard-deleted on
-- erasure, that is a policy change requiring both this FK and the cascade
-- function to change together.

CREATE TABLE IF NOT EXISTS public.payments (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  stripe_invoice_id      TEXT NOT NULL,
  stripe_event_id        TEXT,
  stripe_customer_id     TEXT NOT NULL,
  stripe_subscription_id TEXT,
  amount_cents           INTEGER NOT NULL CHECK (amount_cents >= 0),
  currency               TEXT NOT NULL DEFAULT 'usd',
  status                 TEXT NOT NULL DEFAULT 'paid',
  paid_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Idempotency key. Named explicitly rather than relying on an inline UNIQUE so
-- the writer's ON CONFLICT target is unambiguous.
CREATE UNIQUE INDEX IF NOT EXISTS payments_stripe_invoice_id_key
  ON public.payments (stripe_invoice_id);

-- Serves the admin metrics range scan: .gte("paid_at", startDate).
CREATE INDEX IF NOT EXISTS payments_paid_at_idx
  ON public.payments (paid_at DESC);

-- Serves per-user payment history.
CREATE INDEX IF NOT EXISTS payments_user_id_paid_at_idx
  ON public.payments (user_id, paid_at DESC);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- A user may read their own payments and nothing else. There is deliberately
-- NO user-facing INSERT/UPDATE/DELETE policy: this ledger is written only by
-- the Stripe webhook running under the service role, which bypasses RLS.
-- A client that could insert here could invent revenue.
DROP POLICY IF EXISTS "Users can view own payments" ON public.payments;
CREATE POLICY "Users can view own payments"
  ON public.payments
  FOR SELECT
  USING (auth.uid() = user_id);

COMMENT ON TABLE public.payments IS
  'Subscription revenue ledger. Written only by the Stripe invoice.paid webhook under the service role. amount_cents is integer MINOR UNITS, stored verbatim from invoice.amount_paid.';
COMMENT ON COLUMN public.payments.amount_cents IS
  'Integer minor units (cents), verbatim from Stripe invoice.amount_paid. Divide by 100 only at a presentation boundary.';
COMMENT ON COLUMN public.payments.user_id IS
  'ON DELETE SET NULL, not CASCADE: the financial record outlives the user (GDPR Art. 17(3)(b)/(e)). Deliberately excluded from delete_user_data_cascade.';
