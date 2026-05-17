# Payments Vertical (Wave 7 Phase 2) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
> Revised 2026-05-17 after adversarial plan review — see Revision Note at end.

**Goal:** Make the Stripe payments path correct and trustworthy — webhooks idempotent and fail-loud, subscription tiers actually provisioned, billing data sourced from Stripe (not a mock), and checkout inputs server-authoritative.

**Architecture:** Phase 2 of Wave 7, Vertical 1, on top of the Foundation block (auth rebuild). Webhook idempotency uses a `processed_webhook_events` UNIQUE table with **claim-after-success** semantics (check → run handler → mark on success → rethrow without marking on failure, so Stripe retries). The broken `getTierFromPriceId` is rebuilt off `SUBSCRIPTION_PLANS`; this changes the tier vocabulary from a legacy 4-value set to the canonical 6-tier set, which **requires a DB CHECK-constraint migration and a `supabase/types.ts` regeneration**. The fully-mock `billing-profile-store` is deleted and its routes re-sourced from the Stripe API.

**Tech Stack:** Next.js 15 App Router, TypeScript 5.7 strict, Stripe (`apiVersion 2025-09-30.clover`), Supabase (Postgres + RPC), Jest + ts-jest (`@jest-environment node`).

**Scope:** Payments vertical only — Phase 2 (`TASK-WBH-01..07` + `TASK-MOK-02`). The Phase 3 Money Correctness track (`TASK-MNY-*`) is a separate plan.

**Closes — CRITICAL (4):** FND-014, FND-015 (`invoice.paid` / `invoice.payment_failed` swallow errors → no Stripe retry), FND-016 (fabricated billing data — fake Visa 4242 **and** fake paid-invoice history), FND-017 (`updatePlan` activates a plan with no Stripe call). **HIGH (5):** FND-018 (`getTierFromPriceId` → every paid sub lands on `free`), FND-019/020/021 (client-controlled `successUrl`/`cancelUrl`/`priceId`/`trialDays`), FND-022 + FND-023 (webhook replay / idempotency — confirm FND-023's exact scope in `gap_analysis.md`, see WBH-05).

> Severity note: FND-018 is HIGH per the `TASK-PRE-01` reconciliation (2026-05-16), not CRITICAL as the roadmap-spec Appendix B listed.

---

## Pre-state (verified — `remediation/wave-7-foundation`)

- `src/lib/payment/stripe-service.ts` — `handleWebhookEvent` switch (~508-546) routes 7 event types; `checkout.session.completed` is **not** in the switch (falls through `default`). `handleInvoicePaid` (~577-649) and `handleInvoicePaymentFailed` (~651-689) swallow all errors (`catch { void error; }`). `handlePaymentIntentFailed` (~791-816) logs only (no real side-effect). `handlePaymentIntentSucceeded` (~691-723) is the one correct handler — rethrows (:721). `fulfillCreditPurchase` (~732-789) is the idempotency reference.
- `SUBSCRIPTION_PLANS` — `stripe-service.ts:71-170` — 6 plans: `free`, `standard`, `pro`, `family-duo`, `family`, `family-plus`. `SubscriptionPlan` shape: `{id,name,priceId,price,interval,features}` — **no trial field**.
- `getTierFromPriceId` — `src/lib/subscriptions/subscription-service.ts:462-471` — references nonexistent env vars `STRIPE_BASIC/PREMIUM/ENTERPRISE_PRICE_ID`; real ones per `SUBSCRIPTION_PLANS` are `STRIPE_STANDARD/PRO/FAMILY_DUO/FAMILY/FAMILY_PLUS_PRICE_ID`. Defaults to `"free"`. Called at :134, :369, :538.
- **`SubscriptionTier` is a stale 4-value type** (`subscription-service.ts:35`: `"free"|"basic"|"premium"|"enterprise"`). `updateProfileSubscriptionTier` (:420-437) writes `profiles.subscription_tier` (write at :431 goes through `(query as any)`).
- **DB CHECK constraint** — `profiles.subscription_tier` is `CHECK (subscription_tier IN ('free','basic','premium','enterprise'))` per `supabase/migrations/001_initial_schema.sql:14` and `20251217000001_cpfi_financial_suite_schema.sql:16`. `src/lib/supabase/types.ts:22,31,40` hard-codes the 4-value union. Index `idx_profiles_subscription_tier` exists.
- `billing-profile-store.ts` — **not** purely in-memory: an in-memory `Map` cache in front of a real Supabase table `billing_profiles` (migration `supabase/migrations/20250211000000_billing_profiles.sql`, with RLS + a gin index). `createSeedProfile` fabricates a Visa 4242 card **and a fake paid invoice**; `updatePlan` flips status to `active`, unshifts more fake paid invoices, and never calls Stripe. `billing_profiles` is in the GDPR cascade-delete list (`20260401000000_gdpr_erasure_rpc.sql:51`). Importers: `payment/billing/route.ts`, `payment/billing/plan/route.ts`.
- `subscription-service.ts` **already has** `getUserSubscription(userId)`, `changeSubscriptionPlan(userId, newPriceId)` (:334-377 — does the Stripe update + DB write), `cancelSubscription(userId)` (real Stripe cancel). The billing rework must reuse these, not reinvent them.
- `payment/webhook/route.ts` — route-level handling fine (signature verified; thrown handler error → 400 → Stripe retries). No `processed_webhook_events` table exists.
- `payment/checkout/route.ts` — `withAuth`-wrapped; `priceId`/`successUrl`/`cancelUrl`/`trialDays` all client-controlled, unvalidated. `createCheckoutSession` (`stripe-service.ts:301-328`) takes `trialDays?` as its 5th param.
- Idempotency template: `supabase/migrations/20260501000000_credit_purchase_idempotency.sql` (`add_credits` RPC). NOTE: `add_credits` is atomic because the sentinel insert and the balance mutation are *the same Postgres transaction* — a generic webhook dispatcher (multiple network/HTTP side-effects) **cannot** replicate that; see WBH-01/01b for the correct claim-after-success design.
- `.claude/rules/01-verification.md` mandates **100% branch coverage on Stripe webhook handlers**.

---

## File Structure

| File | Responsibility | Action |
|------|----------------|--------|
| `supabase/migrations/*_processed_webhook_events.sql` | **New.** `processed_webhook_events` UNIQUE table + `is_webhook_event_processed` (check) + `mark_webhook_event_processed` (mark) RPCs — two functions, for claim-after-success. | Create |
| `supabase/migrations/*_subscription_tier_6tier.sql` | **New.** Drop the 4-value `subscription_tier` CHECK constraint; add the 6-tier one; backfill legacy `basic`/`premium`/`enterprise` rows. | Create |
| `supabase/migrations/*_drop_billing_profiles.sql` | **New.** Drop the `billing_profiles` table (mock-only). | Create |
| `supabase/migrations/20260401000000_gdpr_erasure_rpc.sql` | Remove `billing_profiles` from the cascade-delete list (the table is being dropped). | Modify |
| `src/lib/supabase/types.ts` | Regenerate / edit `profiles.subscription_tier` to the 6-tier union (lines ~22,31,40). | Modify |
| `src/lib/payment/webhook-idempotency.ts` | **New.** `isWebhookEventProcessed(provider,id)` + `markWebhookEventProcessed(provider,id)`. | Create |
| `src/lib/payment/tier-mapping.ts` | **New.** `tierFromPriceId(priceId)` — canonical, throws on unknown; exports the 6-tier `SubscriptionTier`. | Create |
| `src/lib/subscriptions/subscription-service.ts` | Delete the broken private `getTierFromPriceId`; use `tier-mapping.ts`; adopt the 6-tier type. | Modify |
| `src/lib/payment/stripe-service.ts` | Webhook handlers: claim-after-success idempotency gate + rethrow on error + `checkout.session.completed` handler + structured logging. | Modify |
| `src/lib/payment/billing-profile-store.ts` | **Delete.** Mock store. | Delete |
| `src/lib/payment/billing-data.ts` | **New.** `getBillingData(userId)` — real Stripe Customer + `paymentMethods.list` + `subscriptions.list` + `invoices.list`. | Create |
| `src/app/api/payment/billing/route.ts` | Re-source from `billing-data.ts`. | Modify |
| `src/app/api/payment/billing/plan/route.ts` | Reuse `subscriptionService.getUserSubscription/changeSubscriptionPlan/cancelSubscription`; new response contract. | Modify |
| `src/app/api/payment/checkout/route.ts` | Server-authoritative `priceId`/URLs; drop client `trialDays`. | Modify |
| `scripts/audit-tier-map.ts` | **New.** `npm run audit:tier-map` — every env-listed price ID resolves. | Create |

**Test convention:** `@jest-environment node`; `jest.mock` before import. Webhook-handler tests need **100% branch coverage**. New test files for `stripe-service` handlers, `tier-mapping`, `webhook-idempotency`, `billing-data` — none exist today.

---

# Tasks (dependency order)

### Task WBH-01: `processed_webhook_events` table + claim-after-success helper

**Files:** Create `supabase/migrations/20260517000000_processed_webhook_events.sql`, `src/lib/payment/webhook-idempotency.ts`, `src/lib/payment/__tests__/webhook-idempotency.test.ts`. Modify `package.json` (add `test:webhook-idempotency`).

> **Idempotency semantics — decided: claim-AFTER-success.** A webhook handler does multiple network/HTTP side-effects; it cannot be wrapped in one Postgres transaction with the sentinel insert (unlike `add_credits`). So: *check* the sentinel before dispatch; run the handler; *mark* the sentinel only after the handler succeeds; on handler failure, do NOT mark — rethrow so the route 400s and Stripe retries. Consequence: this is **at-least-once**, not exactly-once — a handler that throws after a partial side-effect will replay that side-effect. Therefore each webhook handler's side-effects must themselves be idempotent (enforced in WBH-01b/WBH-04). This requires TWO RPCs (a check and a mark), not one check-and-insert.

- [ ] **Step 1: Write the migration** `20260517000000_processed_webhook_events.sql`:
```sql
create table if not exists public.processed_webhook_events (
  provider     text not null,
  event_id     text not null,
  processed_at timestamptz not null default now(),
  primary key (provider, event_id)
);
alter table public.processed_webhook_events enable row level security;
revoke all on public.processed_webhook_events from public, anon, authenticated;
grant select, insert on public.processed_webhook_events to service_role;

create or replace function public.is_webhook_event_processed(p_provider text, p_event_id text)
returns boolean language sql security definer set search_path = public as $$
  select exists (select 1 from public.processed_webhook_events
                 where provider = p_provider and event_id = p_event_id);
$$;

create or replace function public.mark_webhook_event_processed(p_provider text, p_event_id text)
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into public.processed_webhook_events (provider, event_id)
  values (p_provider, p_event_id)
  on conflict (provider, event_id) do nothing;
end; $$;

revoke execute on function public.is_webhook_event_processed(text,text) from public, anon, authenticated;
revoke execute on function public.mark_webhook_event_processed(text,text) from public, anon, authenticated;
grant execute on function public.is_webhook_event_processed(text,text) to service_role;
grant execute on function public.mark_webhook_event_processed(text,text) to service_role;
```

- [ ] **Step 2: Write the failing test** `webhook-idempotency.test.ts` (`@jest-environment node`, mock `@supabase/supabase-js` so `.rpc(...)` is controllable): `isWebhookEventProcessed` returns the RPC boolean; `markWebhookEventProcessed` calls the mark RPC; an RPC error from either → **throws** (never swallowed — a check/mark failure must fail loud so the route 400s and Stripe retries).

- [ ] **Step 3: Run — expect FAIL.**

- [ ] **Step 4: Implement `webhook-idempotency.ts`** — module-level lazy service-role Supabase client; `isWebhookEventProcessed(provider,eventId)` and `markWebhookEventProcessed(provider,eventId)`; throw on RPC error.

- [ ] **Step 5:** Add `"test:webhook-idempotency": "jest --testPathPatterns='payment/__tests__/.*\\.test\\.ts$' -t 'webhook-idempotency'"` to `package.json` (the Phase 2 gate references it; tag the relevant tests with a `describe("webhook-idempotency")` block). Run — expect PASS; `npm run type-check` 0 errors.

- [ ] **Step 6: Commit** — `feat: TASK-WBH-01 processed_webhook_events table + check/mark helpers (FND-022)`.

### Task WBH-02: Rebuild tier mapping + migrate the subscription_tier vocabulary

**Files:** Create `src/lib/payment/tier-mapping.ts`, `tier-mapping.test.ts`, `supabase/migrations/20260517000001_subscription_tier_6tier.sql`, `scripts/audit-tier-map.ts`; Modify `src/lib/subscriptions/subscription-service.ts`, `src/lib/supabase/types.ts`.

- [ ] **Step 1: Write the CHECK-constraint migration** `20260517000001_subscription_tier_6tier.sql` — **this is C1, do not skip it:**
```sql
-- Backfill legacy 4-tier values to the canonical 6-tier model before swapping the constraint.
update public.profiles set subscription_tier = 'standard' where subscription_tier = 'basic';
update public.profiles set subscription_tier = 'pro'      where subscription_tier in ('premium','enterprise');

alter table public.profiles drop constraint if exists profiles_subscription_tier_check;
alter table public.profiles add  constraint profiles_subscription_tier_check
  check (subscription_tier in ('free','standard','pro','family-duo','family','family-plus'));
```
(Confirm the actual constraint name with `\d profiles` / the source migrations — `001_initial_schema.sql:14` and `20251217000001_*:16`; use the real name in `drop constraint`.)

- [ ] **Step 2: Write the failing test** `tier-mapping.test.ts`: each of the 6 `SUBSCRIPTION_PLANS` price IDs → its plan `id`; unknown price ID → **throws** (`TierMappingError`, names the offending id); `"price_free"` → `"free"`.

- [ ] **Step 3: Run — expect FAIL.**

- [ ] **Step 4: Implement `tier-mapping.ts`** — `tierFromPriceId(priceId): SubscriptionTier`, lookup built from `SUBSCRIPTION_PLANS`, throws on unknown. Export `type SubscriptionTier = "free"|"standard"|"pro"|"family-duo"|"family"|"family-plus"`.

- [ ] **Step 5: Run — expect PASS.**

- [ ] **Step 6: Migrate `subscription-service.ts` + `supabase/types.ts`** — delete the broken private `getTierFromPriceId` (:462-471); replace its 3 call sites (:134,:369,:538) with `tierFromPriceId`; replace the 4-value `SubscriptionTier` (:35) with the import from `tier-mapping.ts`. In `src/lib/supabase/types.ts` change `profiles.subscription_tier` (Row/Insert/Update, ~lines 22/31/40) to the 6-tier union. `npm run type-check`; fix every error (the `as any` write casts no longer hide the mismatch — that's intended; type it properly). DEFER-COMPILE: `npx tsc --noEmit` whole project.

- [ ] **Step 7: Write `scripts/audit-tier-map.ts`** + wire `npm run audit:tier-map` — asserts every `STRIPE_*_PRICE_ID` in `SUBSCRIPTION_PLANS` resolves via `tierFromPriceId` without throwing.

- [ ] **Step 8: Run — full suite 0 failures; `audit:tier-map` exit 0. Commit** — `fix: TASK-WBH-02 tier mapping from SUBSCRIPTION_PLANS + 6-tier subscription_tier migration (FND-018)`.

### Task WBH-04: Rethrow swallowed webhook errors + structured logging

**Files:** Modify `src/lib/payment/stripe-service.ts` (`handleInvoicePaid`, `handleInvoicePaymentFailed`, `handlePaymentIntentFailed`, the subscription handlers); Test `src/lib/payment/__tests__/stripe-webhook-handlers.test.ts` (new).

- [ ] **Step 1: Write failing tests** — for each handler, a forced downstream error must cause the handler to **throw** (route 400 → Stripe retries), not swallow. Cover the success path. **Target 100% branch coverage** per handler.

- [ ] **Step 2: Run — expect FAIL.**

- [ ] **Step 3: Fix the handlers** — replace every error-swallowing `catch` with: `logger.error(...)` (project logger; include `event.id`, type, cause) **then `throw`**. The subscription handlers' silent early-returns on insert error (`subscription-service.ts` ~532-535) must throw too. **Per-handler idempotency (required by WBH-01's at-least-once model):** `handleInvoicePaid` does an email send THEN a credit reset — if the credit reset throws, the retry must NOT re-send the email. Make each side-effect idempotent or ordered so a retry is safe (e.g. guard the email with a sent-marker, or do the retryable DB work first and the email last). Document the ordering choice in a comment.

- [ ] **Step 4: Run — expect PASS;** full suite 0 failures.

- [ ] **Step 5: Commit** — `fix: TASK-WBH-04 webhook handlers rethrow + idempotent side-effects (FND-014, FND-015)`.

### Task WBH-01b: Wire claim-after-success idempotency into webhook dispatch

**Files:** Modify `src/lib/payment/stripe-service.ts` `handleWebhookEvent` (~508-546).

- [ ] **Step 1: Write failing tests** (in `stripe-webhook-handlers.test.ts`, `describe("webhook-idempotency")`):
  - **Replay:** same `event.id` ×100, handler succeeds → side-effect runs **exactly once** (`isWebhookEventProcessed` true after the first → 99 no-ops).
  - **Lost-event guard (the H1 regression test):** delivery 1 → handler **throws** → sentinel NOT marked → delivery 2 → `isWebhookEventProcessed` false → handler runs and succeeds. (This test FAILS against a claim-before-dispatch design — it is the proof the semantics are right.)
  - `checkout.session.completed` now has a real handler.

- [ ] **Step 2: Run — expect FAIL.**

- [ ] **Step 3: Implement** — rewrite `handleWebhookEvent` to:
  1. `if (await isWebhookEventProcessed("stripe", event.id)) return;` — already processed → no-op (route 200).
  2. run the `switch` dispatch (add the `checkout.session.completed` case → a real handler).
  3. on success → `await markWebhookEventProcessed("stripe", event.id)`.
  4. if any handler throws → do NOT mark; let it propagate (route → 400 → Stripe retries).

- [ ] **Step 4: Run — expect PASS** (replay = 1 side-effect; lost-event test green).

- [ ] **Step 5: Commit** — `feat: TASK-WBH-01b claim-after-success webhook idempotency + checkout.session.completed (FND-022)`.

### Task WBH-03 + MOK-02: Delete `billing-profile-store`; real Stripe billing data

**Files:** Delete `src/lib/payment/billing-profile-store.ts` + its test; Create `src/lib/payment/billing-data.ts` + test, `supabase/migrations/20260517000002_drop_billing_profiles.sql`; Modify `supabase/migrations/20260401000000_gdpr_erasure_rpc.sql`, `src/app/api/payment/billing/route.ts`, `src/app/api/payment/billing/plan/route.ts`.

- [ ] **Step 1: Write the failing test** `billing-data.test.ts` — mock the `stripe` client: `getBillingData(userId)` resolves the user's Stripe customer, calls `paymentMethods.list`, `subscriptions.list`, AND `invoices.list` — returning REAL cards, plan/status, and invoice history. No fabricated card, no fabricated invoice. A user with no Stripe customer → empty payment methods, `free` plan, empty invoices.

- [ ] **Step 2: Run — expect FAIL.**

- [ ] **Step 3: Implement `billing-data.ts`** — `getBillingData(userId)`: resolve `stripe_customer_id` (from `subscriptions`/`profiles`); Stripe `paymentMethods.list({customer,type:"card"})`, `subscriptions.list({customer})`, `invoices.list({customer})`; map to the billing shape from real data only.

- [ ] **Step 4: Rework `billing/plan/route.ts` — concrete sub-steps (do NOT reinvent existing service methods):**
  - Validate `planId` is one of `SUBSCRIPTION_PLANS` ids → else 400.
  - Resolve `planId` → `priceId`: `SUBSCRIPTION_PLANS.find(p => p.id === planId).priceId`.
  - `cancelSubscription === true` OR `planId === "free"` → call `subscriptionService.cancelSubscription(user.id)` (real Stripe cancel; free has no Stripe price).
  - Else: `const existing = await subscriptionService.getUserSubscription(user.id);`
    - `existing` present → `await subscriptionService.changeSubscriptionPlan(user.id, priceId)` (this existing method does the Stripe update + DB write).
    - `existing` null → call `stripeService.createCheckoutSession(...)` and return its URL — the user completes payment on Stripe; the `customer.subscription.*`/`invoice.paid` webhook (now trustworthy after WBH-04) writes the DB tier. The route does NOT flip status itself.
  - **New response contract:** `{ status: "redirect", checkoutUrl }` for a new subscription, or `{ status: "updated", subscription }` for a change/cancel. Document this in the route file header.
  - **Frontend follow-up:** the billing-page caller of `POST /api/payment/billing/plan` expects the OLD `{subscription,invoices}` shape — wrapping it is out of this vertical's scope; **create a tracked follow-up task** "update billing UI for the new billing/plan response contract" and note it in the report (do not silently break the page without flagging it).

- [ ] **Step 5: Rework `billing/route.ts`** — GET sources from `billing-data.ts`.

- [ ] **Step 6: Delete `billing-profile-store.ts`**; create `20260517000002_drop_billing_profiles.sql` (`drop table if exists public.billing_profiles;`); remove `'billing_profiles'` from the cascade list in `20260401000000_gdpr_erasure_rpc.sql`. `git rm billing-profile-store.ts` + `billing-profile-store.test.ts` (the latter tested the deleted mock — removal of tests for deleted code). **Rewrite — not just re-mock — the `billing/plan` route test:** the old assertions (`json.subscription.planId==="pro"`, `status==="active"` after a plan change) encoded FND-017 (synchronous activation with no Stripe call). The rewritten tests assert the NEW spec: a new subscription → `{status:"redirect",checkoutUrl}`; a change → `changeSubscriptionPlan` called; a cancel/free → `cancelSubscription` called. **Do NOT assert synchronous `active`** — that would re-introduce FND-017 in the test layer. Flag this in the report as a deliberate spec change (Test Integrity Rule: requirements changed).

- [ ] **Step 7:** `npm run type-check` + project-wide `tsc` — 0 errors. Full suite — 0 failures. `git grep "4242" src/` — clean. **Commit** — `fix: TASK-WBH-03 remove billing-profile mock, real Stripe billing data (FND-016, FND-017)` (MOK-02 subsumed).

### Task WBH-06: Server-authoritative checkout inputs

**Files:** Modify `src/app/api/payment/checkout/route.ts`; Test extends `payment/checkout/__tests__/route.test.ts`.

- [ ] **Step 1: Write failing tests** — `priceId` not in `SUBSCRIPTION_PLANS` → 400; a client `successUrl`/`cancelUrl` is **ignored** (server builds them); a client `trialDays` is **ignored**.

- [ ] **Step 2: Run — expect FAIL.**

- [ ] **Step 3: Fix the route** — validate `priceId` against `SUBSCRIPTION_PLANS` (reject unknown). **Ignore client `successUrl`/`cancelUrl` entirely** — do not accept a "relative suffix" (string-concat invites `//evil.com` / `@evil.com` / `/../` open-redirect bugs); use fixed server constants built from `NEXT_PUBLIC_APP_URL` (e.g. `${APP_URL}/payment/success`, `${APP_URL}/pricing`). **Drop client `trialDays`** — `SubscriptionPlan` has no trial field, so there is nothing to "derive"; pass no `trialDays` to `createCheckoutSession` (leave the service signature's optional 5th param, pass `undefined`). Stop leaking raw `error.message` to the client on 500.

- [ ] **Step 4: Run — expect PASS.**

- [ ] **Step 5: Commit** — `fix: TASK-WBH-06 server-authoritative checkout inputs (FND-019, FND-020, FND-021)`.

### Task WBH-05: Webhook signature-verification audit (incl. FND-023)

**Files:** Audit; test additions where gaps found. Depends on AUTH-08/09 (done).

- [ ] **Step 1:** Locate **FND-023** in `docs/ssot/gap_analysis.md` — confirm its exact scope (a webhook HIGH in the WBH range per the roadmap spec's Appendix C). Add an explicit step here that addresses it; if it turns out to be genuinely outside Phase 2, document why with the finding text.
- [ ] **Step 2:** Grep all inbound webhook routes (`payment/webhook`, `financial/plaid/webhooks`, `affiliate/webhooks`). Confirm each verifies its provider signature before processing and uses `timingSafeEqual` for any manual secret/HMAC compare (AUTH-08 added the helper + repointed affiliate/plaid). Stripe uses `constructEvent` — correct.
- [ ] **Step 3:** Fix any gap + add a test (bad signature → 400, no handler call). **SEC sign-off required** on this audit (per master plan).
- [ ] **Step 4: Commit** — `chore: TASK-WBH-05 webhook signature verification audit (FND-023)`.

### Task WBH-07: Subscription tier backfill

**Files:** Create `scripts/backfill-subscription-tiers.ts`.

- [ ] Runs AFTER the WBH-02 CHECK-constraint migration. For every `subscriptions` row with a Stripe subscription, recompute the tier via `tierFromPriceId` and correct `profiles.subscription_tier` where it drifted. Idempotent; dry-run flag; logs each correction. Test the mapping logic. **Commit** — `chore: TASK-WBH-07 subscription tier backfill script`.
- [ ] No live users yet — defensive for launch; execution is a deploy-time step, not a code gate.

---

## Phase 2 gate (vertical "done" criteria)

- `npm run test:webhook-idempotency` — ≥13 passing (replay ×100 → one side-effect; the lost-event guard test; tier-map exhaustion)
- `npm run audit:tier-map` — exit 0
- Chaos test — forced DB error in a handler → handler throws → route 400 → Stripe retries (no silent swallow); and the retry succeeds (lost-event guard)
- Stripe webhook handlers — **100% branch coverage**
- `billing-profile-store.ts` deleted; `billing_profiles` table dropped + GDPR cascade RPC updated; `git grep "4242" src/` clean
- Full suite 0 failures; type-check + project-wide `tsc` 0 errors; `test:coverage:changed` ≥85%
- SEC sign-off on TASK-WBH-05
- All 4 CRITICAL (FND-014/015/016/017) + 5 HIGH (FND-018/019/020/021/022/023) closed and evidenced
- Tracked follow-up filed: billing-UI update for the new `billing/plan` response contract

---

## Revision Note (2026-05-17)

Revised after an adversarial plan review. Fixes:
- **C1 (blocking)** — the 6-tier `SubscriptionTier` collides with the `profiles.subscription_tier` 4-value CHECK constraint and `supabase/types.ts`. WBH-02 now includes a CHECK-constraint migration + legacy backfill + types regeneration, sequenced before WBH-07.
- **H1** — idempotency semantics committed to **claim-after-success** (was an unresolved "OR"); WBH-01's single check-and-insert RPC split into `is_webhook_event_processed` + `mark_webhook_event_processed`; WBH-01b dispatch spelled out (check → run → mark-on-success → rethrow-without-marking); the "mirror `add_credits`" instruction removed (factually wrong — `add_credits` is atomic in one DB txn, a webhook dispatcher cannot be); at-least-once acknowledged → per-handler idempotency required in WBH-04; a lost-event regression test added.
- **H2** — WBH-03 Step 4 rewritten with concrete sub-steps naming the existing `getUserSubscription`/`changeSubscriptionPlan`/`cancelSubscription` methods, `planId→priceId` resolution, the `free`-tier special-case, the new response contract, and a tracked frontend follow-up.
- **H3** — WBH-03 Step 6 makes the `billing/plan` test rewrite explicit (new spec; must not assert synchronous `active` — that re-introduces FND-017).
- **H4** — `billing-profile-store` correctly characterized (real `billing_profiles` table); added the table-drop migration + GDPR cascade RPC update; FND-016 expanded to include fabricated invoice history.
- **H5** — FND-023 added to the Closes list and to WBH-05.
- **H6** — WBH-06: client `trialDays` dropped (no plan trial field to derive from); client URLs ignored entirely (no "relative suffix" — open-redirect risk).
