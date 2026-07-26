# ADR-0007 — Mobile "Cards" product direction

- **Status:** Proposed
- **Date:** 2026-07-26
- **Deciders:** owner (product)
- **Confidence:** medium (owner call)

## Context

Mobile cards screens exist and are **catalog-shaped**: `mobile-app/app/recommendations/credit-cards.tsx` (offers, "Apply Now", approval likelihood, `cashback/travel/balance_transfer/secured`) and `mobile-app/app/credit-repair/cards.tsx` ("Personalized recommendations") — both on MOCK data. The affiliate lib has `src/lib/affiliate/credit-card-matcher.ts` (MoneyLion, `SpendingProfile` → ranked recommendations). A utilization optimizer would instead need per-card balances+limits (Plaid liabilities `src/lib/financial/plaid-liabilities-service.ts`; Track 2 item 6).

## Decision

The mobile **cards screen is a MoneyLion affiliate CATALOG** (recommend + "Apply Now" → revenue), wired to the existing `credit-card-matcher`. The **utilization optimizer is a separate feature** in the credit/utilization flow (fed by Plaid liabilities, item 6), cross-linked from the catalog. The two are **not merged**.

## Rationale

The screens are already catalog-shaped and the matcher exists, so the catalog ships fast on the existing affiliate rail and monetizes directly. Merging owned-data (your cards) with sponsored offers is a clarity/compliance risk — sponsored content must be labeled and kept distinct.

## Alternatives considered

| Alternative | Pros | Cons | Why rejected |
|---|---|---|---|
| Utilization optimizer as the cards screen | retention/value | no revenue; needs Plaid liabilities; higher effort | keep as a separate feature, not the cards screen |
| One merged screen (offers + your cards) | single entry point | conflates sponsored vs owned; compliance/clarity risk | rejected on clarity + compliance |

## Consequences

### Positive
- Cards ships fast + monetizes; clean owned-vs-sponsored separation.
### Negative
- Two surfaces to maintain (catalog + optimizer).
### Neutral / follow-ups
- Optimizer tracked under Track 2 liabilities (item 6).

## Implementation notes

- Proceed-if-catalog: wire `recommendations/credit-cards.tsx` → `credit-card-matcher` (FR-603, M6). Utilization optimizer waits on Plaid-liabilities ingest regardless.

## Revisit triggers

- Poor MoneyLion catalog quality; users conflate the two surfaces; regulatory guidance on affiliate card promotion.

## Owner must decide

Confirm the mobile cards screen is a MoneyLion affiliate catalog (revenue), with utilization optimization built separately off Plaid liabilities — not one merged screen?

## References

- `src/lib/affiliate/credit-card-matcher.ts`; `mobile-app/app/recommendations/credit-cards.tsx`. Track 2 item 6 (per-card limits).
