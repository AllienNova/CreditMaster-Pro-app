---
name: project_credit_system
description: Credit system design decisions relevant to future reviews — atomic RPC vs non-atomic addCredits, webhook fulfillment pattern
type: project
---

Two "credit" concepts coexist: app-currency credits (balance/purchase/deduct) and FCRA consumer credit (disputes, adverse action).

**Deduction is atomic** via `deduct_credits` Postgres RPC (FOR UPDATE row lock + INSERT in one transaction). Safe under concurrency.

**addCredits is now atomic** (fixed 2026-05-01) via `add_credits` Postgres RPC (migration 20260501000000_credit_purchase_idempotency.sql). Previously was a non-atomic read-modify-write in application code.

**Stripe fulfillment (post-fix)**: purchase route now creates a Checkout Session and returns `checkoutUrl`. Credits granted in `fulfillCreditPurchase` (stripe-service.ts ~line 728) on `payment_intent.succeeded` webhook. Idempotency via UNIQUE constraint on `credit_purchases.stripe_payment_intent_id`; 23505 Postgres error is caught and suppressed (dedup). Any other DB error is thrown so Stripe retries.

**Known open issue (found 2026-05-01 review)**: `handlePaymentIntentSucceeded` catches all errors from `fulfillCreditPurchase` and logs them instead of rethrowing. This means Stripe receives HTTP 200 even on transient DB failures, and will NOT retry. Credits could be permanently lost. The `throw` in `fulfillCreditPurchase` is swallowed at the caller level (stripe-service.ts:712-719).

**Schema**: `credit_purchases` columns are `amount_paid_cents`, `stripe_payment_intent_id` (nullable TEXT, now UNIQUE). No `status` column. Column names are now correct in webhook handler.

Why: migration (20260427000002_credit_system.sql) and webhook handler were written independently without cross-checking column names (fixed in this diff).

How to apply: When reviewing any code that inserts into credit_purchases, verify against the migration DDL column names. When reviewing webhook error handling, confirm errors propagate past the outer try/catch in handlePaymentIntentSucceeded.
