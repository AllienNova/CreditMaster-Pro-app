# Delivery Plan — Backend Parity

> Milestones sequenced by dependency. Grounded in `research-notes.md`; requirements from `product-spec.md`. Each task: authed + user_id-scoped route, additive migration, co-located tests (auth-negative + IDOR), `tsc` 0, changed-line coverage ≥85% web / screen test mobile, no fabricated data. The build produces migration **files**; an operator applies them (launch condition).

## Milestones

### M0 — Schema reconciliation (PREREQ; unblocks M2/M4/M5) — RE-SPECCED (critic round 1)
**17 tables are twinned** (`grep CREATE TABLE … | uniq -d`): audit_logs, subscriptions, credit_reports, profiles, budgets, financial_goals, financial_health_scores, financial_insights, disputes, recurring_bills, investment_holdings/portfolios/transactions, financial_chat_sessions/messages, trading_signals, document_share_links. Reconcile via **NEW forward `ALTER … ADD COLUMN IF NOT EXISTS` migrations (never edit applied files)** per ADR-0001; RLS + erasure cascade (ADR-0004) on every table.

| Task | FR | Action |
|---|---|---|
| **M0-0** | 001 | **Ground the deltas.** *If* a scratch/staging DB is reachable: build it from `supabase/migrations/*`, introspect the live schema, diff vs each route's reader/writer usage. *If not:* derive the column deltas from the code reader/writer facts already in research-notes — additive `ADD COLUMN IF NOT EXISTS` is safe either way (F-016). Introspection is verification, not a hard precondition; never infer the live shape from filename sort (F-001). Classify all 17 twins; output the deltas driving M0-1..9. |
| M0-1 | 004 | `audit_logs` **redesign** (ADR-0010): forward `ALTER ADD COLUMN IF NOT EXISTS details/type/category/actor_email/target_type/success/error_message`; split AI-event shape to `system_event_logs` iff a live writer exists; fix 3 writers to canonical shape; **unswallow `audit-logger.ts:84`**; admin POST supplies `resource_type`. **Fixes live silent audit-write failure.** |
| M0-2 | 005 | `profiles` (twinned): forward `ALTER ADD phone/address/city/state/zip/date_of_birth`; **also fix `profile/route.ts:20` `subscriptions!inner` → left join** (F-009, drops sub-less users). |
| M0-3 | 002 | `subscriptions`: reconcile twin + write-time `tier` column. |
| M0-4 | 003 | `credit_reports`: **decide the model first** — `20250107` (wins) uses a separate `credit_inquiries` table vs `20250204` inline `inquiries JSONB` (F-012). Reconcile to the chosen model so FR-206 POST writes the right shape. |
| M0-5 | 001 | `transactions` (never migrated): create grounded in Plaid writer + analyzer reader; resolve `category` (string[] vs string) + `pending`/`is_pending` conflict. |
| M0-6 | 006 | Alert sources: create `spending_alerts`/`spending_limits`/`budget_alerts`; reconcile `budgets` + `recurring_bills` twins for any columns the alert signals read. |
| M0-7 | 002/302 | `financial_goals` reconcile: forward `ALTER ADD milestones/ai_recommendations` — **fixes FR-302 goal-milestone alert** (winning twin lacks them). |
| M0-8 | 304/301 | `financial_health_scores` (FR-304 vitality) + `financial_insights` (FR-301) reconcile per M0-0 deltas. |
| M0-9 | 204 | `disputes` reconcile (FR-204 disputable-items) per M0-0 deltas. |
| M0-10 | 007 | Erasure cascade for **M0-created tables** (M3 tables self-register in their own task, ADR-0004 — F-015); **verify the sweep reaches child tables** (holdings/valuations/contributions — F-008); erasure test scoped to M0 tables. |
| M0-11 | — | **Regenerate `src/lib/supabase/types.ts`** after all reconciles; `tsc` 0 (F-008). |
| M0-12 | — | **Dry-run apply** the full migration set to the scratch DB, assert exit 0, before any dependent route builds (owns R-1; F-011). |

**Out of M0 (honest scope):** the 7 twins no new route touches (investment_holdings/portfolios/transactions, financial_chat_sessions/messages, trading_signals, document_share_links) are known latent drift — logged for a future hygiene pass, not reconciled here.

**Exit:** scratch DB applies clean (M0-12 exit 0); introspection (M0-0) confirms every route-touched column exists; `tsc` 0 after type-regen; admin-audit POST + profile GET green against the reconciled schema.

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
| M3-1 | 101 | journey | CLEAN-WIRE; `financial_journeys` (1 new table); de-risks the pattern; self-registers erasure (ADR-0004). | — (M0-independent, F-014) |
| M3-2 | 102 | crypto | Fix IDOR in 6 by-id methods; 3 tables. | M3-1 |
| M3-3 | 103 | real-estate | Fix IDOR in 7 by-id methods; 3 tables; amortization unit test. | M3-2 |
| M3-4 | 104 | shared-goals | 5 tables + membership RLS; add `getGoal` membership check; **atomic contribution RPC (ADR-0002)**. | M3-3 |

### M4 — Aggregation engines
| Task | FR | Action | Dep |
|---|---|---|---|
| M4-1 | 303 | `GET /api/admin/health` probing 6 services; missing-env → degraded (never green); wire admin health web+mobile. | — |
| M4-2 | 302 | `GET /api/alerts` union over 4 real signals (budget/goal/savings/bills); wire both alerts screens. | M0-6 (budgets/recurring_bills/alert tables) + **M0-7** (financial_goals.milestones) |
| M4-3 | 301 | `GET /api/financial/insights/weekly-summary`; aggregate real sources, avoid placeholder scoring; wire both screens. | M0-5 (transactions) + **M0-6** (budgets) + **M0-7** (financial_goals) |
| M4-4 | 304 | Confirm concept (ADR-0003); wire mobile `dashboard/vitality.tsx` to real endpoint (existing v2 history or new vitality-history table+route). | ADR-0003 + **M0-8** (financial_health_scores) |

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
| DEFAB-1 | 0005 | Delete synthetic-candle fabrication in `src/lib/investments/services/MarketDataService.ts`; chart shows real data or empty-state (+honesty test). **⚠ Interim regression (F-006): until the canonical feed lands at gated M6-1, the OHLC chart is EMPTY for all users. Accepted interim — honest empty > fabricated candles — and disclosed in the chart empty-state copy. Revisit if M6-1 slips.** |
| DEFAB-2 | 0009 | Flag/gate the 4 fabricated simulators (`mobile score-simulator.tsx`,`simulator.tsx`; `web credit/simulator`,`credit-builder/score-simulator`) so hardcoded point tables don't ship (feature-flag off or honest "estimate unavailable" state). |
| DEFAB-3 | 0008 | Marketplace hardening pass (proceed-now only): verify the 6 public routes return non-PII/non-per-user payloads, reject non-GET, add rate-limit. **The `products` base-GET vs `search` inconsistency is NOT here — resolving its direction IS the gated ADR-0008 decision → moved to M6-4 (F-005).** |

### M6 — Owner-gated (BLOCKED until ADRs signed)
Cannot start until the owner decides. Do NOT build against a guess. Recommendation in each ADR.

| Task | FR | ADR recommendation (hypothesis) | Gated decision |
|---|---|---|---|
| M6-1 | 601 | Alpaca canonical (free IEX) + Polygon Advanced $199 upgrade | ratify vendor; then consolidate watchlist/OHLC (PARITY-P4) |
| M6-2 | 602 | Array (credit+identity monitoring) pending pricing + DPA | approve vendor + DPA before any monitoring/alerts build |
| M6-3 | 603 | Cards = MoneyLion affiliate catalog; optimizer separate | confirm direction → wire `recommendations/credit-cards.tsx` to `credit-card-matcher` |
| M6-4 | 604 | Ratify public catalog (proceed-now hardening in M-DEFAB); **+ resolve the `products` base-GET vs `search` inconsistency in the ratified direction** (open base-GET if ratify, or guard search/[id] if guard-all — F-005) | ratify vs guard-all |
| M6-5 | 605 | Array sim (if M6-2=Array) or deterministic directional model | pick rebuild path (fabrication already removed in DEFAB-2) |

## Critical path

`M0-0 (ground deltas) → M0-1..9 (forward reconcile migrations) → M0-11 (type-regen) → M0-12 (dry-run apply, exit 0) → the M0-dependent routes (M2-4, M4-2, M4-3, M4-4, M5-1, M5-2)`. Migration **authoring** proceeds from code facts (research-notes) without a DB; only the M0-12 **dry-run verification** needs one. Genuinely M0-independent and startable immediately: DEFAB-1/2/3 (proceed-now), M1, M2-1..3, M3-1, M4-1, M5-3. M3 is internally serial (ascending complexity). M6 is off the critical path (owner-gated). **Operator dependency (R-9):** M0-12 dry-run + optional M0-0 introspection need a reachable scratch/staging DB; if none, migrations are authored from code facts and the dry-run is surfaced as a deferred staging step, not guessed-green.

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
| R-6 | A reconcile that edits an applied migration silently no-ops (critic F-001) | Forward migrations only (ADR-0001); M0-0 introspects real schema; M0-12 dry-run asserts exit 0. |
| R-7 | `audit_logs` PK-type conflict can't be ALTERed (critic F-003) | Split, don't merge (ADR-0010): additive on the UUID table + separate AI-event table. |
| R-8 | DEFAB-1 leaves the OHLC chart empty until M6-1 (critic F-006) | Accepted interim (honest empty > fabricated), disclosed in empty-state copy; revisit if M6-1 slips. |
| R-9 | Introspection needs a scratch/staging DB the build can reach | If no DB is reachable, M0 blocks → surface as an operator dependency, don't guess the schema. |

## Open questions (owner) — with decision deadlines (F-010)

- **ADR-0003** vitality vs health-score concept — architect-resolvable; confirm during M4-4 (no owner block). Deadline: start of M4.
- **ADR-0005 / 0007 / 0008 / 0009** (market-data ratify, cards direction, marketplace ratify, simulator rebuild path) — **decision target: 2026-08-09** (before M6; M0–M5 proceed meanwhile). If undecided by then, M6-1/3/4/5 stay parked and are reported, not guessed.
- **ADR-0006** (Array vendor) — gated on written pricing + signed DPA (external, operator-owned); no internal deadline, tracked as a dependency.
- **Operator dependency (R-9):** a reachable scratch/staging DB for M0-0 introspection + M0-12 dry-run. Needed before M0 can start.

## Revision history

- 2026-07-26 — initial plan (M0–M6) from 4-persona recon.
