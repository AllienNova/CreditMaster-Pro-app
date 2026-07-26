# Delivery Plan — Backend Parity

> Milestones sequenced by dependency. Grounded in `research-notes.md`; requirements from `product-spec.md`. Each task: authed + user_id-scoped route, additive migration, co-located tests (auth-negative + IDOR), `tsc` 0, changed-line coverage ≥85% web / screen test mobile, no fabricated data. The build produces migration **files**; an operator applies them (launch condition).

## Milestones

### M0 — Schema reconciliation (PREREQ; unblocks M2/M4/M5)
Fixes live bugs + creates never-migrated tables. Additive `ALTER`/`CREATE IF NOT EXISTS` per ADR-0001; RLS + erasure cascade (ADR-0004) on every table.

| Task | FR | Action |
|---|---|---|
| M0-1 | 004 | `audit_logs`: add `details JSONB`,`type`,`category`; fix admin POST (`resource_type`); later migration → `ALTER`. **Fixes live INSERT failure.** |
| M0-2 | 005 | `profiles`: add `phone,address,city,state,zip,date_of_birth`. **Fixes live SELECT/PATCH bug.** |
| M0-3 | 002 | `subscriptions`: reconcile twin + add write-time `tier` column. |
| M0-4 | 003 | `credit_reports`: reconcile twin so `accounts/inquiries/collections/score/report_data` exist. |
| M0-5 | 001 | `transactions`: create table grounded in Plaid writer + analyzer reader; resolve `category`/`pending` conflict. |
| M0-6 | 006 | `spending_alerts`,`spending_limits`,`budget_alerts`: create from service usage. |
| M0-7 | 007 | Register all M0 + M3 tables in erasure cascade + erasure test. |

**Exit:** migrations apply cleanly to a scratch DB; `tsc` 0; admin-audit POST + profile routes green against reconciled schema.

### M1 — Trivial ROUTE-ONLY wins (no new backend)
| Task | FR | Action |
|---|---|---|
| M1-1 | 201 | Wire mobile `credit-builder/utilization.tsx` → existing `GET /api/credit-repair/cards`; remove MOCK_CARDS. |
| M1-2 | 202 | Wire mobile `reports/[id].tsx` → existing `GET /api/credit-repair/reports/[id]`; remove hardcoded report. |
| M1-3 | 501 | Verify payment-history already wired (`billing/invoices.tsx` → live Stripe); no code unless a gap is found. |

### M2 — New GET routes over existing/reconciled tables
| Task | FR | Action | Dep |
|---|---|---|---|
| M2-1 | 203 | `GET /api/credit-repair/accounts` (tradelines; age from `opened_date`); wire `credit-builder/age.tsx`. | — |
| M2-2 | 204 | `GET /api/credit-repair/disputable-items` (union `credit_inquiries` + negative `credit_accounts`); wire `dispute/create.tsx`. | — |
| M2-3 | 205 | `GET /api/activity` over `notifications` (+optional union); wire `activity/index.tsx`. | — |
| M2-4 | 206 | Populate `credit_reports` POST (accounts/inquiries); serve structured data to `reports/[id].tsx`. | M0-4 |

### M3 — Track 1 orphaned services (migration + route + un-mock web + mobile screen)
Order = ascending complexity. **Every by-id method owner-scoped before routing** (service-role bypasses RLS). Web pages + mobile are BOTH mock today.

| Task | FR | Service | Notes | Dep |
|---|---|---|---|---|
| M3-1 | 101 | journey | CLEAN-WIRE; `financial_journeys` (1 table); de-risks the pattern. | M0-7 |
| M3-2 | 102 | crypto | Fix IDOR in 6 by-id methods; 3 tables. | M3-1 |
| M3-3 | 103 | real-estate | Fix IDOR in 7 by-id methods; 3 tables; amortization unit test. | M3-2 |
| M3-4 | 104 | shared-goals | 5 tables + membership RLS; add `getGoal` membership check; **atomic contribution RPC (ADR-0002)**. | M3-3 |

### M4 — Aggregation engines
| Task | FR | Action | Dep |
|---|---|---|---|
| M4-1 | 303 | `GET /api/admin/health` probing 6 services; missing-env → degraded (never green); wire admin health web+mobile. | — |
| M4-2 | 302 | `GET /api/alerts` union over 4 real signals (budget/goal/savings/bills); wire both alerts screens. | M0-6 |
| M4-3 | 301 | `GET /api/financial/insights/weekly-summary`; aggregate real sources, avoid placeholder scoring; wire both screens. | M0-5 |
| M4-4 | 304 | Confirm concept (ADR-0003); wire mobile `dashboard/vitality.tsx` to real endpoint (existing v2 history or new vitality-history table+route). | ADR-0003 |

### M5 — Additive-column routes + new-table
| Task | FR | Action | Dep |
|---|---|---|---|
| M5-1 | 207 | Expand `GET/PATCH /api/profile` for city/state/zip/dob; wire `profile/edit.tsx`. | M0-2 |
| M5-2 | 208 | Add `analysis_result JSONB` to `documents`; wire credit-report OCR pipeline to persist; wire `document/[id].tsx`. | M0 |
| M5-3 | 209 | `support_tickets` table + `POST /api/support` (withAuth); wire `help/contact.tsx`. | — |

### M-DEFAB — Track 4 proceed-now honesty items (NO owner gate)
Removing fabrication that would otherwise ship. Independent of every owner decision below.

| Task | ADR | Action |
|---|---|---|
| DEFAB-1 | 0005 | Delete synthetic-candle fabrication in `src/lib/investments/services/MarketDataService.ts`; chart shows real data or empty-state (+honesty test). |
| DEFAB-2 | 0009 | Flag/gate the 4 fabricated simulators (`mobile score-simulator.tsx`,`simulator.tsx`; `web credit/simulator`,`credit-builder/score-simulator`) so hardcoded point tables don't ship. |
| DEFAB-3 | 0008 | Marketplace hardening pass: verify the 6 public routes return non-PII/non-per-user payloads, reject non-GET, add rate-limit, fix `products` base-GET vs `search` inconsistency. |

### M6 — Owner-gated (BLOCKED until ADRs signed)
Cannot start until the owner decides. Do NOT build against a guess. Recommendation in each ADR.

| Task | FR | ADR recommendation (hypothesis) | Gated decision |
|---|---|---|---|
| M6-1 | 601 | Alpaca canonical (free IEX) + Polygon Advanced $199 upgrade | ratify vendor; then consolidate watchlist/OHLC (PARITY-P4) |
| M6-2 | 602 | Array (credit+identity monitoring) pending pricing + DPA | approve vendor + DPA before any monitoring/alerts build |
| M6-3 | 603 | Cards = MoneyLion affiliate catalog; optimizer separate | confirm direction → wire `recommendations/credit-cards.tsx` to `credit-card-matcher` |
| M6-4 | 604 | Ratify public catalog (hardening already in M-DEFAB) | only "guard-all" alternative needs the call |
| M6-5 | 605 | Array sim (if M6-2=Array) or deterministic directional model | pick rebuild path (fabrication already removed in DEFAB-2) |

## Critical path

`M0 (schema) → M2-4/M4-2/M4-3/M5-1/M5-2 (dependents) `; M1, M2-1..3, M3-1, M4-1, M5-3 have no M0 dependency and can start immediately. M3 is internally serial (shared migration+route pattern, ascending complexity). M6 is off the critical path (owner-gated).

## Two-lane execution (per session convention)

Max ONE web + ONE mobile editing subagent at a time (separate `tsc`/jest). Route/migration work is web-lane; screen un-mock + adapter is mobile-lane. Shared-worktree index race → commit pathspec-scoped, push explicit SHA.

## Risks

| ID | Risk | Mitigation |
|---|---|---|
| R-1 | Reconciliation migration breaks a populated staging DB | Additive-only (ADR-0001); apply to scratch DB first; operator gates prod. |
| R-2 | IDOR fix misses a by-id method | Enumerated list in research-notes; IDOR test per method; security-reviewer pass on M3. |
| R-3 | Aggregation pulls a placeholder path → fabricated number | Named placeholder methods to avoid (research-notes 3.1); honesty test asserts empty-state on no data. |
| R-4 | `transactions` category/pending conflict mis-resolved | Ground in both writer+reader; migration + adapter test. |
| R-5 | Owner ADRs delay M6 | M6 is off critical path; M0–M5 deliver the bulk of parity without it. |

## Open questions (owner)

- ADR-0003 vitality vs health-score concept (confirm during M4-4; architect default = distinct).
- ADR-0005..0009 owner decisions (Track 4) — surfaced separately for sign-off.

## Revision history

- 2026-07-26 — initial plan (M0–M6) from 4-persona recon.
