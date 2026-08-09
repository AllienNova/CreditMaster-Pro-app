# ADR-0011 — Multi-provider payments surface (TrueLayer + Stripe) is M1 scope

- **Status:** Accepted
- **Date:** 2026-08-01
- **Deciders:** owner (product + licensing), wave-7-foundation (architecture)
- **Confidence:** medium — the engineering path is clear; the scope rests on licensing confirmations that are not yet in hand.

## Context

`src/lib/commerce/payments/payment-router.ts` routes payments across `stripe |
truelayer` for `one_time | subscription | payout | transfer`, with
`open_banking` / `sepa` / `ach` methods. `src/lib/commerce/payouts/payout-service.ts`
pays partners, using TrueLayer for EU/UK. `src/lib/connectors/banking/`
aggregates bank accounts across providers. The TrueLayer connector is 947 lines
with no TODOs.

None of it is reachable. An audit on 2026-08-01 established:

| Surface | Built | Table | Route | Credentials | In plan |
|---|---|---|---|---|---|
| `payment-router` | yes | name collides | none | none | no |
| `payouts/payout-service` | yes | 7 tables migrated | none | none | no |
| `connectors/banking` | yes | no persistence at all | none | none | no |

`MASTER-IMPLEMENTATION-PLAN.md` mentions TrueLayer, SEPA, and open banking zero
times. The seven `TRUELAYER_*` env vars the code reads — including
`TRUELAYER_PRIVATE_KEY` and `TRUELAYER_SIGNING_KEY_ID` (JWS request signing) —
appear in no `.env.example`. `src/lib/compliance/` covers FCRA, GDPR/CCPA and
PII; there is no payment-services compliance surface.

The immediate trigger was narrower: `payments` is a table-name collision.
`20260731000020_payments_revenue_ledger.sql` created a Stripe **invoice**
ledger (`amount_cents`, `stripe_invoice_id`, `stripe_subscription_id`,
`paid_at`), while the router writes a multi-provider payment **attempt**
(`provider`, `provider_payment_id`, `amount`, `type`, `method`, `metadata`).
`scripts/audit-phantom-columns.js` reports 11 hits from that mismatch alone.
Resolving it required first answering whether the surface is real.

## Decision

1. **The multi-provider surface is M1 scope.** All three flows — EU/UK pay-in,
   partner pay-out, bank aggregation — are live commitments for the closed beta.
2. **Fynvita operates under its providers' licences**: as an agent/distributor
   under TrueLayer's PIS authorisation for payment initiation, and via Stripe
   Connect for partner payouts. Written confirmation from both is a gating
   precondition, and their contractual conditions become build requirements.
3. **`payments` belongs to the router.** The existing ledger is renamed
   `subscription_invoices`, which is what it actually holds. The
   provider-agnostic concept takes the general name.
4. **One provider-tagged bank model.** `plaid_items` generalises into
   `bank_connections` (`provider` discriminator, per-provider credential);
   `financial_accounts` gains `provider` and `connection_id`.
5. **Bank credentials are encrypted at rest** with pgcrypto, on top of the
   existing RLS-default-deny + service_role-only posture.
6. **"Live" means provider sandbox integration tests in CI**, plus a
   reconciliation check that the ledger matches the provider.
7. **Schema and correctness first; a hard stop before wiring.** Nothing reaches
   a live money trigger until the operator gates clear.

## Rationale

**Why the general name goes to the general concept (3).** Naming a
Stripe-invoice ledger `payments` is what produced the collision. Two concepts
cannot share one name; the more general one should hold it. The rename touches
exactly two call sites (`stripe-service.ts:717` write,
`admin/metrics/route.ts:53` read), while the router's five existing
`.from("payments")` queries become correct for free.

**Why one account model (4).** This codebase has been repeatedly damaged by
parallel paths for one concept — two payout rails (FND-026), two Supabase
clients, two SQL schema parsers, each of which drifted until the drift became a
defect. Provider-tagging one table means every existing reader keeps working; a
parallel `truelayer_accounts` would oblige every consumer to union and dedupe
forever.

**Why encryption, stated honestly (5).** It does *not* defend against a full
server compromise: an attacker holding the app environment holds both the
service-role key and the encryption key. What it buys is protection against
DB-only exposure — a leaked backup, a read replica, or an injection path that
yields rows but not environment. For live bank credentials that is worth the
key-rotation cost; it is not the stronger guarantee the word "encrypted"
suggests.

**Why sandbox tests are the bar (6).** Mocked-SDK unit tests cannot catch a
wrong signing key, a wrong amount unit, or a webhook that never arrives. Those
are precisely the defects that reached this codebase before: FND-024 sent
dollars where Stripe expected cents (1% of the intended payout), and B1 had
`calculateFees` net a $50 payout to $0. Both passed a green suite.

## Alternatives considered

| Alternative | Why rejected |
|---|---|
| Delete the surface, Stripe-only | Owner confirms EU/UK is a product commitment; the payout stack was already authorised and built. |
| Park it: make it correct but never wire | Rejected by the owner — it is M1, not deferred. |
| `provider_payments`, leave the ledger named `payments` | Zero rename risk, but permanently entrenches the misleading name that caused this, and the two collide again the next time someone reaches for the obvious word. |
| One unified payments table | Conflates a settled invoice with an in-flight attempt; every Stripe-specific column is null for TrueLayer rows. |
| Parallel per-provider account tables | Every reader unions and dedupes forever; the two drift. See FND-026. |
| External KMS for credentials | Strongest against server compromise, but adds a hard runtime dependency and per-sync latency. Revisit if Fynvita becomes itself authorised. |
| Unit tests as the bar for "live" | The exact standard that let FND-024 and B1 through. |

## Consequences

### Positive
- The `payments` collision resolves, clearing all 11 remaining phantom-column hits.
- One account model instead of a second aggregator silo.
- Bank credentials gain a layer beyond access control.
- The surface finally appears in the implementation plan.

### Negative
- Materially larger M1 scope: three regulated integrations, none currently reachable or credentialed.
- Introduces encryption-key management and rotation.
- A second bank aggregator brings its own consent and compliance surface alongside Plaid.

### Neutral / follow-on
- Pay-in has **no idempotency today** — the only `idempotencyKey` usages in
  `src/lib/commerce` are the two in `payout-service`. Router idempotency and
  webhook-driven state are prerequisites for wiring, tracked in Phase 2.
- `financial_accounts` has no `provider` column and `banking-aggregator`
  persists nothing (zero `.from()` calls), so aggregation is unbuilt at the
  storage layer, not merely unwired.
- No live users, so no data backfill and no re-encryption of existing tokens.

## Preconditions the operator must clear (engineering cannot)

1. Written confirmation from **TrueLayer** (agent under their PIS authorisation)
   and **Stripe** (Connect for partner payouts).
2. Seven `TRUELAYER_*` secrets into Doppler, plus sandbox accounts.
3. `.env.example` entries — currently none.

Until all three land, Phases 3–4 do not start and no money-moving path is
reachable.

## Related

- ADR-0002 — atomic money mutations via RPC (the idempotency/atomicity pattern).
- ADR-0004 — erasure-cascade coverage; `payments` and `bank_connections` must
  register, and the coverage guard fails CI if they do not.
- FND-026 — dual payout rails. Reads as resolved in code:
  `commission-calculator.ts:1-11` states execution lives exclusively in
  `payout-service`, and it has no `affiliate_payouts` writes or provider calls.
  `LAUNCH_CHECKLIST.md` Gate C is stale on this item.
