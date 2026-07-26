# ADR-0006 — Identity / credit-monitoring vendor

- **Status:** Proposed
- **Date:** 2026-07-26
- **Deciders:** owner (product + compliance)
- **Confidence:** low (owner call)

## Context

The monitoring + alerts feature has no real backend. Plaid is integrated with `Products.Identity` (`src/lib/financial/plaid-service.ts:115`), but that is **account-ownership verification, not credit/identity monitoring**. Fynvita already shows 3-bureau scores and has a dispute tool + (fabricated) simulators (ADR-0009).

## Decision

We will adopt **Array (array.com)** as the embedded credit+identity-monitoring vendor — 3-bureau scores/trackers/factors, alerts, a compliant score simulator, a dispute tool, plus identity protection (up to $1M ID-theft insurance, dark-web/SSN/change-of-address monitoring) — gated on written usage-based pricing + a signed DPA. Plaid stays for verification/AML only. Array also settles ADR-0009 (its simulator replaces the fabricated ones).

## Rationale

Array is the only option delivering consumer credit *and* identity monitoring, alerts, and dark-web monitoring in one embeddable integration, all-3-bureau — and it also supplies a compliant simulator + dispute components, consolidating the credit surface and letting us delete fabricated code. Bureau-direct (Experian) is higher lift and single-bureau-biased; Plaid/SentiLink are the wrong tools for consumer monitoring.

## Alternatives considered

| Alternative | Pros | Cons | Why rejected |
|---|---|---|---|
| Experian Partner Solutions / Precise ID | source-of-truth, brand trust | enterprise contracts, single-bureau bias, high lift | too heavy; verify pricing |
| Plaid Identity + Monitor (integrated) | already wired | Identity = ownership match; Monitor = AML/PEP — **not** credit-file/dark-web | wrong tool |
| SentiLink | strong synthetic-fraud scoring | B2B lender-origination, not consumer monitoring | wrong use case |

## Consequences

### Positive
- One vendor covers monitoring + alerts + simulator + disputes; deletes fabricated simulators.
### Negative
- New PII sub-processor: privacy policy + GDPR/CCPA sub-processor list + DPA + breach-notification wiring (FND-056); opaque pricing **(verify)**.
### Neutral / follow-ups
- Keep Plaid for verification/AML only.

## Implementation notes

- FR-602 (M6), fully gated: no net-new build until vendor picked + DPA signed. Existing credit-score *display* is independent and unaffected.

## Revisit triggers

- Array pricing breaks unit economics; need bureau-direct data; coverage gaps.

## Owner must decide

Approve Array as the embedded credit+identity-monitoring vendor (pending written pricing + signed DPA), use it to also replace the fabricated simulators, and keep Plaid for verification/AML only?

## References

- array.com/products/my-credit-manager, array.com/vertical-solutions/credit-services. plaid.com/docs/identity/, plaid.com/docs/kyc-aml/. sentilink.com/product-overview. FND-056 (breach notification).
