# Plan Savage (team-plan-critic) review record

Artifact set: `docs/specs/` backend parity plan. This file records what was challenged and how each point was resolved — the record a human reads to understand the review.

## Round 1 — 2026-07-26

**Verdict: REVISE REQUIRED** (2 P0 · 6 P1 · 5 P2). Plan committed `5bde5ac`.

Steelman (critic): architecture, security discipline, ADR structure, contract quality, and requirement→task coverage are senior-grade; ~15 code claims spot-checked and held. The failure was isolated to the M0 migration foundation.

| ID | Sev | Finding | Resolution | Where |
|---|---|---|---|---|
| F-001 | P0 | Reconcile-by-editing-applied-migrations no-ops (no `config.toml`; applied files never re-run) | Rewrote ADR-0001: NEW forward `ALTER … ADD COLUMN IF NOT EXISTS` migrations + M0-0 live-schema introspection; never edit applied files; confidence→medium | adr/0001; delivery-plan M0-0; architecture |
| F-002 | P0 | Twin inventory 3, real count **17**; `financial_goals.milestones` absent on winning twin → breaks FR-302 | Re-verified 17 twins + milestones-absent myself; M0 rescoped; M0-7 forward-ADDs milestones; route-touched twins folded in; "8 tables" metric corrected | delivery-plan M0; product-spec FR-001..010; research-notes |
| F-003 | P1 | `audit_logs` not additively reconcilable (UUID vs TEXT PK); ≥3 writers; `audit-logger.ts:84` swallows insert error (security logging silently failing today) | New ADR-0010: split (UUID security table + separate `system_event_logs`), additive columns, fix 3 writers, unswallow :84, admin POST supplies `resource_type` | adr/0010; delivery-plan M0-1 |
| F-004 | P1 | M4-2/M4-3 dep lists omit financial_goals/recurring_bills/budgets | Patched deps (M4-2 += M0-7; M4-3 += M0-6,M0-7; M4-4 += M0-8) | delivery-plan M4 |
| F-005 | P1 | DEFAB-3 "fix products base-GET vs search" is actually the gated ADR-0008 decision | Split out of proceed-now → moved to gated M6-4 | delivery-plan M-DEFAB, M6-4 |
| F-006 | P1 | DEFAB-1 deletes synthetic candles → empty chart until gated M6-1 (unacknowledged regression) | Flagged as accepted honest interim, disclosed in empty-state copy; revisit if M6-1 slips | delivery-plan DEFAB-1; R-8 |
| F-007 | P1 | Contract coverage ~12%; no PII class; crypto POST sync no idempotency | Added `contracts/_route-contract-template.md` (per-route auth/PII/idempotency matrix); crypto sync idempotency flagged; 4 money/PII routes marked full-OpenAPI-required | contracts/ |
| F-008 | P1 | No type-regen after reconcile; erasure child-tables unverified | M0-11 regenerate `supabase/types.ts`; M0-10 verify erasure sweep reaches child tables | delivery-plan M0-10/11 |
| F-009 | P2 | `profile/route.ts:20` `subscriptions!inner` drops sub-less users | Left-join fix added to M0-2/M5-1 | delivery-plan M0-2 |
| F-010 | P2 | Open ADRs lack decision deadlines | Deadline 2026-08-09 for ADR-0005/7/8/9; ADR-0003 architect-resolved; ADR-0006 external DPA-gated | delivery-plan open-questions |
| F-011 | P2 | No migration-apply verification task | M0-12 dry-run apply (exit 0) owns R-1 | delivery-plan M0-12 |
| F-012 | P2 | credit_reports reconcile model ambiguous (separate table vs inline JSONB) | M0-4 decides model first (via M0-0 introspection); FR-002 updated | delivery-plan M0-4; product-spec FR-002 |
| F-013 | P2 | ADR-0001 confidence miscalibrated | Set to medium | adr/0001 |

Independent verification by the lead before revising (radical honesty): twin count = **17** confirmed (`grep CREATE TABLE … | uniq -d`); `financial_goals` milestones absent on `20250207` (winning) twin, present only on `20251217` — confirmed; `supabase/config.toml` absent — confirmed; `audit-logger.ts:84` `if (error) { }` swallow — confirmed. Every P0/P1 was a real defect.

Revised plan committed `039295f`. Round-2 gate requested.

## Round 2 — pending

_Verdict to be appended when plan-critic returns._
