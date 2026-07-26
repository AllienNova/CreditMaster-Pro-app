# ADR-0008 — Marketplace route-guarding policy

- **Status:** Proposed
- **Date:** 2026-07-26
- **Deciders:** owner (product) + security
- **Confidence:** medium (owner call)

## Context

Middleware already **denies `/api/*` by default** (FND-001 closed); only the `PUBLIC_API_ROUTES` allowlist in `src/lib/auth/PUBLIC_ROUTES.ts` passes unauthenticated. Catalog reads are deliberately allowlisted: `products/categories`, `products/search`, `providers`, `providers/search`, `tradelines`, + dynamic `[id]`. Those handlers carry no in-handler auth (`marketplace/providers/route.ts:10`, `.../tradelines/route.ts:10`). Mutations/admin **are** guarded (`admin/affiliate/revenue` `withRole`; `affiliate/offers` `withPermission`; `marketplace/reviews`/`products` POST guarded, and `products` base GET is not allowlisted → auth-required). So "intentionally-public-catalog + guard-only-mutations" is **already implemented**; the decision is ratify vs guard-all.

## Decision

We will **ratify the intentionally-public catalog** and run a hardening pass: (1) audit the 6 public routes to confirm generic, non-PII, non-per-user payloads; (2) confirm they reject non-GET; (3) add rate-limiting (anti-scraping); (4) resolve the inconsistency where `/api/marketplace/products` base GET is auth-required while `products/search` and `products/[id]` are public.

## Rationale

Pre-signup browse/SEO is a real funnel need for non-sensitive catalog data, and deny-by-default already handles every unknown route. With the gate settled, the residual risk on a deliberately-open route is **wrong data** (a per-user leak = IDOR) or an accepted mutation — so the hardening pass verifies *content and method*, not just the gate.

## Alternatives considered

| Alternative | Pros | Cons | Why rejected |
|---|---|---|---|
| Guard-all (session on every marketplace route) | zero public surface, simplest story | kills pre-signup browsing (SEO/conversion) for non-sensitive data | loses funnel value with no security gain over the hardening pass |

## Consequences

### Positive
- Pre-signup browse retained; public surface verified safe + rate-limited.
### Negative
- Each public route must be re-verified whenever its payload changes (Hyrum's Law).
### Neutral / follow-ups
- Add a test asserting public routes return no `user_id`-scoped fields and reject non-GET.

## Implementation notes

- **Proceed-now (no owner gate):** the hardening pass (verify payloads, reject non-GET, rate-limit, fix products base-GET vs search inconsistency) — FR-604 is only blocked on the "guard-all" alternative.

## Revisit triggers

- A public route starts returning user-specific data; scraping abuse; a new marketplace mutation ships unguarded.

## Owner must decide

Ratify the public marketplace catalog (pre-signup browse) with a hardening pass — or require auth on all marketplace routes and drop pre-signup browse?

## References

- `src/lib/auth/PUBLIC_ROUTES.ts`; `marketplace/providers/route.ts:10`; `marketplace/tradelines/route.ts:10`. FND-001 (deny-by-default).
