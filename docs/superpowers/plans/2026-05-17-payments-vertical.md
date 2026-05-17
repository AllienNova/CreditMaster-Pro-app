# Payments Vertical (Wave 7 Phase 2) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Stripe payments path correct and trustworthy — webhooks idempotent and fail-loud, subscription tiers actually provisioned, billing data sourced from Stripe (not a mock), and checkout inputs server-authoritative.

**Architecture:** Phase 2 of Wave 7, Vertical 1. Built on top of the Foundation block (auth rebuild — `withAuth`/`withRole`/`withPermission` on all routes). Webhook idempotency reuses the `add_credits` RPC pattern from commit `d64e8d5` (a `UNIQUE`-constrained sentinel table). The broken `getTierFromPriceId` is rebuilt off the canonical `SUBSCRIPTION_PLANS`. The fully-mock `billing-profile-store` is deleted and its two consumer routes re-sourced from the Stripe API.

**Tech Stack:** Next.js 15 App Router, TypeScript 5.7 strict, Stripe (`apiVersion 2025-09-30.clover`), Supabase (Postgres + RPC), Jest + ts-jest (`@jest-environment node` for route/service tests).

**Scope:** Payments vertical only — Phase 2 (`TASK-WBH-01..07` + `TASK-MOK-02`). The Phase 3 Money Correctness track (payout cents, referral RPC — `TASK-MNY-*`) is a separate plan.

**Closes — CRITICAL (4):** FND-014, FND-015 (`invoice.paid` / `invoice.payment_failed` swallow errors → no Stripe retry), FND-016 (fake Visa 4242 billing data), FND-017 (`updatePlan` activates a plan with no Stripe call). **HIGH (4):** FND-018 (`getTierFromPriceId` → every paid sub lands on `free`), FND-019/020/021 (client-controlled `successUrl`/`cancelUrl`/`priceId`/`trialDays`), FND-022 (webhook replay — no idempotency).

> Severity note: the roadmap spec's Appendix B listed FND-018 as CRITICAL; the `TASK-PRE-01` reconciliation (2026-05-16) corrected it to HIGH. This plan uses the reconciled severities.

---

## Pre-state (verified — `remediation/wave-7-foundation`)

- `src/lib/payment/stripe-service.ts` — `handleWebhookEvent` switch (lines ~508-546) routes 7 event types. `checkout.session.completed` is **not handled** (falls through `default`). `handleInvoicePaid` (~577-649) and `handleInvoicePaymentFailed` (~651-689) swallow all errors (`catch { void error; }`). `handlePaymentIntentSucceeded` (~691-723) is the one correct handler — it rethrows. `fulfillCreditPurchase` (~732-789) is the idempotency reference (uses the `add_credits` RPC + `alreadyFulfilled`).
- `getTierFromPriceId` — `src/lib/subscriptions/subscription-service.ts:462-471` — references nonexistent env vars `STRIPE_BASIC/PREMIUM/ENTERPRISE_PRICE_ID`; real ones are `STRIPE_STANDARD/PRO/FAMILY_DUO/FAMILY/FAMILY_PLUS_PRICE_ID` (per `SUBSCRIPTION_PLANS`). Defaults to `"free"`.
- `SUBSCRIPTION_PLANS` — `src/lib/payment/stripe-service.ts:71-170` — 6 plans (`free`, `standard`, `pro`, `family-duo`, `family`, `family-plus`).
- `src/lib/payment/billing-profile-store.ts` — fully in-memory mock; `createSeedProfile` fabricates a Visa 4242 card; `updatePlan` activates with no Stripe call. Two importers: `payment/billing/route.ts`, `payment/billing/plan/route.ts`.
- `src/app/api/payment/webhook/route.ts` — route-level handling fine (signature verified, thrown errors → 400 → Stripe retries). No `processed_webhook_events` table exists.
- `src/app/api/payment/checkout/route.ts` — `withAuth`-wrapped; `priceId`/`successUrl`/`cancelUrl`/`trialDays` all client-controlled, unvalidated.
- Idempotency template: commit `d64e8d5`, migration `supabase/migrations/20260501000000_credit_purchase_idempotency.sql` — `add_credits` RPC, `UNIQUE` sentinel, `SELECT ... FOR UPDATE`, `REVOKE/GRANT`.
- **No test for `stripe-service.ts` itself.** `.claude/rules/01-verification.md` mandates **100% branch coverage on Stripe webhook handlers**.

---

## File Structure

| File | Responsibility | Action |
|------|----------------|--------|
| `supabase/migrations/*_processed_webhook_events.sql` | **New.** `processed_webhook_events` UNIQUE table + `claim_webhook_event` RPC. | Create |
| `src/lib/payment/webhook-idempotency.ts` | **New.** `claimWebhookEvent(provider, eventId)` — returns `{ alreadyProcessed }`. | Create |
| `src/lib/payment/tier-mapping.ts` | **New.** `tierFromPriceId(priceId)` — canonical, throws on unknown. Single source. | Create |
| `src/lib/subscriptions/subscription-service.ts` | Delete the broken private `getTierFromPriceId`; use `tier-mapping.ts`. Fix the `SubscriptionTier` type to the 6-tier model. | Modify |
| `src/lib/payment/stripe-service.ts` | Webhook handlers: idempotency gate + rethrow on error; add `checkout.session.completed`; structured logging. | Modify |
| `src/lib/payment/billing-profile-store.ts` | **Delete.** Mock store. | Delete |
| `src/lib/payment/billing-data.ts` | **New.** `getBillingData(userId)` — real Stripe Customer + `payment_methods.retrieve` + subscription. | Create |
| `src/app/api/payment/billing/route.ts` | Re-source from `billing-data.ts`. | Modify |
| `src/app/api/payment/billing/plan/route.ts` | `updatePlan` → real Stripe (Checkout Session / subscription update); webhook is the activation source of truth. | Modify |
| `src/app/api/payment/checkout/route.ts` | Server-authoritative `priceId`/URLs/`trialDays`. | Modify |
| `scripts/audit-tier-map.ts` | **New.** CI: every env-listed Stripe price ID resolves to a tier. `npm run audit:tier-map`. | Create |

**Test convention:** `@jest-environment node`; `jest.mock` before import; mock Stripe at the `stripe-service` boundary OR mock the `stripe` client. Webhook-handler tests need **100% branch coverage** (critical path). New test files for `stripe-service` handlers, `tier-mapping`, `webhook-idempotency`, `billing-data` — none exist today.

---

# Tasks (dependency order)

### Task WBH-01: `processed_webhook_events` idempotency table + helper

**Files:** Create `supabase/migrations/20260517000000_processed_webhook_events.sql`, `src/lib/payment/webhook-idempotency.ts`, `src/lib/payment/__tests__/webhook-idempotency.test.ts`.

- [ ] **Step 1: Write the migration.** Mirror the `d64e8d5` pattern:
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

-- Atomic claim: inserts the sentinel; returns false if the row already existed.
create or replace function public.claim_webhook_event(p_provider text, p_event_id text)
returns boolean
language plpgsql security definer set search_path = public as $$
begin
  insert into public.processed_webhook_events (provider, event_id)
  values (p_provider, p_event_id)
  on conflict (provider, event_id) do nothing;
  return found;  -- true = first time (claimed), false = already processed
end; $$;
revoke execute on function public.claim_webhook_event(text, text) from public, anon, authenticated;
grant execute on function public.claim_webhook_event(text, text) to service_role;
```

- [ ] **Step 2: Write the failing test** `webhook-idempotency.test.ts` — `@jest-environment node`, mock `@supabase/supabase-js` `createClient` so `.rpc("claim_webhook_event", ...)` is controllable:
  - first call for an `event_id` → `{ alreadyProcessed: false }`
  - second call (RPC returns `false`) → `{ alreadyProcessed: true }`
  - RPC error → throws (do NOT swallow — a claim failure must fail loud so Stripe retries)

- [ ] **Step 3: Run — expect FAIL** (`npm test -- webhook-idempotency`).

- [ ] **Step 4: Implement `webhook-idempotency.ts`** — module-level service-role Supabase client (lazy, like `resolve-role.ts`); `claimWebhookEvent(provider, eventId)` calls `claim_webhook_event`, returns `{ alreadyProcessed: !rpcResult }`, throws on RPC error.

- [ ] **Step 5: Run — expect PASS.** `npm run type-check` — 0 errors.

- [ ] **Step 6: Commit** — `feat: TASK-WBH-01 processed_webhook_events idempotency table + claim helper (FND-022)`.

### Task WBH-02: Rebuild `getTierFromPriceId` off `SUBSCRIPTION_PLANS`

**Files:** Create `src/lib/payment/tier-mapping.ts`, `src/lib/payment/__tests__/tier-mapping.test.ts`; Modify `src/lib/subscriptions/subscription-service.ts` (delete the private `getTierFromPriceId` at :462-471; fix `SubscriptionTier` type at :35).

- [ ] **Step 1: Write the failing test** `tier-mapping.test.ts`:
  - each of the 6 `SUBSCRIPTION_PLANS` price IDs → its plan `id`
  - an unknown price ID → **throws** (`TierMappingError` with the offending id) — never silently returns `"free"`
  - `"price_free"` → `"free"`

- [ ] **Step 2: Run — expect FAIL.**

- [ ] **Step 3: Implement `tier-mapping.ts`** — `tierFromPriceId(priceId): SubscriptionTier` builds its lookup from `SUBSCRIPTION_PLANS` (import from `stripe-service.ts`); throws on an unknown price ID. Export the canonical `SubscriptionTier` type = the 6 plan ids (`"free" | "standard" | "pro" | "family-duo" | "family" | "family-plus"`).

- [ ] **Step 4: Run — expect PASS.**

- [ ] **Step 5: Migrate `subscription-service.ts`** — delete the broken private `getTierFromPriceId` (:462-471); replace its 3 call sites (:134, :369, :538) with `tierFromPriceId` from `tier-mapping.ts`. Replace the stale 4-value `SubscriptionTier` type (:35) with the import. Run `npm run type-check`; fix fallout (the `as any` write casts and any caller of the old type). DEFER-COMPILE: `npx tsc --noEmit` whole project.

- [ ] **Step 6: Write `scripts/audit-tier-map.ts`** — asserts every `STRIPE_*_PRICE_ID` env var listed in `SUBSCRIPTION_PLANS` resolves via `tierFromPriceId` without throwing. Wire `npm run audit:tier-map` in `package.json`. (The Phase 2 gate requires this in CI.)

- [ ] **Step 7: Run — full suite 0 failures; `npm run audit:tier-map` exits 0. Commit** — `fix: TASK-WBH-02 tier mapping from SUBSCRIPTION_PLANS, throw on unknown (FND-018)`.

### Task WBH-04: Rethrow swallowed webhook errors + structured logging

> Sequenced before WBH-03 — WBH-03's billing rework depends on the webhook being the trustworthy activation source.

**Files:** Modify `src/lib/payment/stripe-service.ts` (`handleInvoicePaid` ~577-649, `handleInvoicePaymentFailed` ~651-689, `handlePaymentIntentFailed` ~791-816, the subscription handlers); Test `src/lib/payment/__tests__/stripe-webhook-handlers.test.ts` (new).

- [ ] **Step 1: Write failing tests** — for each handler, a forced downstream error (e.g. `resetCreditsForTier` rejects) must cause the handler to **throw** (so the webhook route returns 400 → Stripe retries), not be swallowed. Cover the success path too. **Target 100% branch coverage** of each handler (critical-path rule).

- [ ] **Step 2: Run — expect FAIL** (current `catch { void error; }` swallows).

- [ ] **Step 3: Fix the handlers** — replace every error-swallowing `catch` with: log via the project logger (`logger.error(...)` with `event.id`, event type, cause) **then `throw`**. Mirror the already-correct `handlePaymentIntentSucceeded` (:721). The subscription handlers' silent early-returns on insert error (`subscription-service.ts` ~532-535) must also throw.

- [ ] **Step 4: Run — expect PASS;** full suite 0 failures.

- [ ] **Step 5: Commit** — `fix: TASK-WBH-04 webhook handlers rethrow + structured logging (FND-014, FND-015)`.

### Task WBH-03 + MOK-02: Delete `billing-profile-store`; real Stripe billing data

**Files:** Delete `src/lib/payment/billing-profile-store.ts` + its test; Create `src/lib/payment/billing-data.ts` + test; Modify `src/app/api/payment/billing/route.ts`, `src/app/api/payment/billing/plan/route.ts`.

- [ ] **Step 1: Write the failing test** `billing-data.test.ts` — mock the `stripe` client: `getBillingData(userId)` resolves the user's Stripe customer, calls `paymentMethods.list`/`retrieve` for the real card(s), and `subscriptions.list` for the real plan/status. No fabricated card. A user with no Stripe customer → empty payment methods + `free` plan (not a seeded Visa).

- [ ] **Step 2: Run — expect FAIL.**

- [ ] **Step 3: Implement `billing-data.ts`** — `getBillingData(userId)`: look up the user's `stripe_customer_id` (from `profiles`/`subscriptions`), call Stripe `paymentMethods.list({ customer, type: "card" })` and `subscriptions.list({ customer })`; map to the billing-profile shape from real data. Never fabricate.

- [ ] **Step 4: Rework `billing/plan/route.ts`** — `updatePlan` must NOT flip a local status. A plan change goes through Stripe: create a Checkout Session (new subscription) or call `stripeService` to update the existing subscription; **the `customer.subscription.*` / `invoice.paid` webhook is the source of truth for activation** (the DB tier is written by the webhook handler, not the route). The route returns the Checkout URL or a pending status. `cancelSubscription` calls the real Stripe cancel. Validate `planId` against `SUBSCRIPTION_PLANS`.

- [ ] **Step 5: Rework `billing/route.ts`** — GET sources the profile from `billing-data.ts` instead of `billingProfileStore`.

- [ ] **Step 6: Delete `billing-profile-store.ts`** and its test (`git rm`). Update the two route test suites — they mocked the store; now they mock `billing-data.ts` / `stripe-service`. The `billing-profile-store.test.ts` asserted the *mock seed behavior* — it is deleted with the store (the behavior it tested no longer exists; note this is removal of tests for deleted code, not weakening).

- [ ] **Step 7:** `npm run type-check` + project-wide `tsc` — 0 errors. Full suite — 0 failures. **Commit** — `fix: TASK-WBH-03 remove billing-profile mock, real Stripe billing data (FND-016, FND-017)` (MOK-02 — the fake-card removal — is subsumed here).

### Task WBH-06: Server-authoritative checkout inputs

**Files:** Modify `src/app/api/payment/checkout/route.ts`; Test extends `src/app/api/payment/checkout/__tests__/route.test.ts`.

- [ ] **Step 1: Write failing tests** — `priceId` not in `SUBSCRIPTION_PLANS` → 400; a `successUrl`/`cancelUrl` pointing at a non-allowlisted origin → rejected/replaced; `trialDays` from the client → ignored (the trial is server-determined from the plan, not client input).

- [ ] **Step 2: Run — expect FAIL** (current route passes all four straight to Stripe).

- [ ] **Step 3: Fix the route** — validate `priceId` against `SUBSCRIPTION_PLANS` (reject unknown). Build `successUrl`/`cancelUrl` server-side from `NEXT_PUBLIC_APP_URL` (accept at most a relative path suffix, never a full client URL). Drop client `trialDays` — derive the trial from the plan definition. Stop leaking raw `error.message` to the client on 500.

- [ ] **Step 4: Run — expect PASS.**

- [ ] **Step 5: Commit** — `fix: TASK-WBH-06 server-authoritative checkout inputs (FND-019, FND-020, FND-021)`.

### Task WBH-05: Webhook signature-verification audit

**Files:** Audit only; Test additions where gaps found. (Depends on AUTH-08/09 — done.)

- [ ] **Step 1:** Grep all inbound webhook routes (`payment/webhook`, `financial/plaid/webhooks`, `affiliate/webhooks`). Confirm each verifies its provider signature before processing and uses `timingSafeEqual` for any manual secret/HMAC comparison (AUTH-08 added the helper; affiliate/plaid were repointed in AUTH-08's fix). Stripe uses `stripe.webhooks.constructEvent` (already correct).
- [ ] **Step 2:** For any route missing a signature check or still using `===`, fix it + add a test (bad signature → 400, no handler call).
- [ ] **Step 3: SEC sign-off required** on this audit (per master plan). **Commit** — `chore: TASK-WBH-05 webhook signature verification audit`.

### Task WBH-07: Subscription tier backfill

**Files:** Create `scripts/backfill-subscription-tiers.ts` + a migration or one-shot script.

- [ ] **Step 1:** Write a script that, for every row in `subscriptions` with a Stripe subscription, recomputes the tier via `tierFromPriceId` and corrects `profiles.subscription_tier` where it drifted (every paid sub currently says `free` due to FND-018). Idempotent, dry-run flag, logs each correction.
- [ ] **Step 2:** Test the mapping logic. Run dry-run; review. **Commit** — `chore: TASK-WBH-07 subscription tier backfill script`.
- [ ] **Note:** no live users yet (per user direction) — this is defensive for launch; execution is a deploy-time step, not a code gate.

### Task WBH-01b: Wire idempotency into the webhook dispatch

**Files:** Modify `src/lib/payment/stripe-service.ts` `handleWebhookEvent` (~508-546).

- [ ] **Step 1: Write the failing test** — the Phase 2 gate's replay test: the same `event.id` delivered ×100 → the handler's side-effect runs **exactly once** (99 are short-circuited as already-processed). Plus: add the missing `checkout.session.completed` case.
- [ ] **Step 2: Run — expect FAIL.**
- [ ] **Step 3:** At the top of `handleWebhookEvent`, call `claimWebhookEvent("stripe", event.id)`; if `alreadyProcessed`, return early (no-op, 200). Add the `checkout.session.completed` handler. Keep claim-before-dispatch so a thrown handler error does NOT leave the event marked processed — OR claim inside a transaction with the handler; choose claim-after-success semantics so a failed handler can be retried (document the choice; the `add_credits` sentinel is claim-at-success — mirror it).
- [ ] **Step 4: Run — expect PASS** (replay test: 1 side-effect of 100).
- [ ] **Step 5: Commit** — `feat: TASK-WBH-01b idempotent webhook dispatch + checkout.session.completed (FND-022)`.

---

## Phase 2 gate (vertical "done" criteria)

- `npm run test:webhook-idempotency` — ≥13 passing (replay ×100 → one side-effect; tier-map exhaustion over `SUBSCRIPTION_PLANS`)
- `npm run audit:tier-map` — exit 0 (every env-listed price ID resolves)
- Chaos test — forced DB error in a webhook handler → handler throws → route returns 500/400 → Stripe retries (no silent swallow)
- Stripe webhook handlers — **100% branch coverage** (`.claude/rules/01-verification.md` critical-path rule)
- `billing-profile-store.ts` deleted; no fabricated card anywhere; `git grep "4242"` in `src/` clean
- Full suite 0 failures; type-check + project-wide `tsc` 0 errors; `npm run test:coverage:changed` ≥85%
- SEC sign-off on TASK-WBH-05
- All 4 CRITICAL (FND-014/015/016/017) + 4 HIGH (FND-018/019/020/021/022) closed and evidenced

---

## Notes

- The `add_credits` idempotency RPC (`d64e8d5`) is the reference — `claim_webhook_event` is the same shape (UNIQUE sentinel, `SECURITY DEFINER`, `REVOKE/GRANT`).
- `npm run test:webhook-idempotency` is referenced by the master-plan gate but not yet an npm script — add it (a tagged jest pattern, like `test:auth-negative`) as the first step of WBH-01.
- The Money Correctness track (Phase 3, `TASK-MNY-*` — payout cents conversion, atomic referral RPC) is a **separate plan** — do not pull it in here.
