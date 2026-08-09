-- TASK-PAY-01 — rename the Stripe invoice ledger to what it actually holds.
--
-- WHY. `payments` is a table-name collision between two different entities:
--
--   this table            a Stripe subscription INVOICE that settled
--                         (stripe_invoice_id, stripe_subscription_id,
--                          amount_cents, paid_at)
--
--   payment-router.ts     a multi-provider payment ATTEMPT
--                         (provider, provider_payment_id, amount, type,
--                          method, metadata)
--
-- The router's five `.from("payments")` queries have therefore never been able
-- to work; createPaymentRecord throws the moment anything routes to it, and
-- scripts/audit-phantom-columns.js reports all 11 of its remaining hits from
-- this one mismatch. Naming an invoice ledger `payments` was the original
-- error: the general word belongs to the general concept. See ADR-0011.
--
-- This migration only frees the name. 20260801000010 creates the new,
-- provider-agnostic `payments` table for the router.
--
-- BLAST RADIUS is two call sites, both repointed in the same commit:
--   src/lib/payment/stripe-service.ts:717      upsert on invoice.paid
--   src/app/api/admin/metrics/route.ts:53      revenue read (amount_cents, paid_at)
--
-- NO DATA RISK: there are no live users (CLAUDE.md status banner), so this is
-- a rename of an empty table, not a data migration.
--
-- DRIFT TOLERANCE: LAUNCH_CHECKLIST Gate C records that the live schema has
-- drifted from supabase/migrations (payout/affiliate tables present live but
-- absent from files). Every statement here is therefore guarded so this
-- applies cleanly against a database in any of these states: never migrated,
-- fully migrated, or already carrying a hand-applied `subscription_invoices`.
--
-- ERASURE POSTURE IS UNCHANGED. The FK stays ON DELETE SET NULL and the table
-- stays OUT of delete_user_data_cascade, for the reasons set out at length in
-- 20260731000020: a financial record must survive the person (GDPR Art.
-- 17(3)(b)/(e)), pseudonymised by nulling the user link. Renaming it does not
-- reopen that decision. The erasure-coverage guard
-- (erasure-cascade-array-integrity.test.ts) lists it under
-- DELIBERATE_EXCLUSIONS, which is updated to the new name in this commit.

DO $$
BEGIN
  -- Only rename when the old name exists and the new one does not. Running
  -- this twice, or against a database where someone already applied the
  -- rename by hand, must be a no-op rather than an error.
  IF to_regclass('public.payments') IS NOT NULL
     AND to_regclass('public.subscription_invoices') IS NULL THEN

    ALTER TABLE public.payments RENAME TO subscription_invoices;

    -- Postgres carries indexes and policies across a table rename but keeps
    -- their original NAMES. Left alone they would still read `payments_*`,
    -- which is exactly the confusion this migration exists to remove — and
    -- worse, they would collide in `\di` output with the new `payments`
    -- table's own indexes created by the next migration.
    ALTER INDEX IF EXISTS payments_stripe_invoice_id_key
      RENAME TO subscription_invoices_stripe_invoice_id_key;
    ALTER INDEX IF EXISTS payments_paid_at_idx
      RENAME TO subscription_invoices_paid_at_idx;
    ALTER INDEX IF EXISTS payments_user_id_paid_at_idx
      RENAME TO subscription_invoices_user_id_paid_at_idx;

    -- ALTER POLICY has no IF EXISTS form, so an absent policy would raise and
    -- abort this whole block — precisely the drift case this migration
    -- promises to survive. Guarded against pg_policies instead.
    IF EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename  = 'subscription_invoices'
        AND policyname = 'Users can view own payments'
    ) THEN
      ALTER POLICY "Users can view own payments"
        ON public.subscription_invoices
        RENAME TO "Users can view own subscription invoices";
    END IF;

  END IF;
END
$$;

-- Comments are re-stated rather than assumed to survive, and re-stated
-- unconditionally so a hand-applied rename still ends up documented.
DO $$
BEGIN
  IF to_regclass('public.subscription_invoices') IS NOT NULL THEN
    COMMENT ON TABLE public.subscription_invoices IS
      'Stripe subscription INVOICE ledger. Written only by the invoice.paid webhook under the service role. amount_cents is integer MINOR UNITS, verbatim from invoice.amount_paid. Renamed from `payments` in 20260801000000 (ADR-0011) so the general name could go to the provider-agnostic payment table the router owns. NOT in delete_user_data_cascade by design — see 20260731000020.';

    COMMENT ON COLUMN public.subscription_invoices.amount_cents IS
      'Integer minor units (cents), verbatim from Stripe invoice.amount_paid. Divide by 100 only at a presentation boundary.';

    COMMENT ON COLUMN public.subscription_invoices.user_id IS
      'Nullable, ON DELETE SET NULL. A settled invoice outlives the person: erasure pseudonymises the row rather than destroying the accounting record (GDPR Art. 17(3)(b)/(e)).';
  END IF;
END
$$;
