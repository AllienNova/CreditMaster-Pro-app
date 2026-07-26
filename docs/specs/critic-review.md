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

## Round 2 — 2026-07-26

**Verdict: APPROVE WITH CONDITIONS** (0 P0 · 0 P1 · 1 P2 · 4 P3). Plan `039295f`. The critic re-derived every round-1 fix against committed source (not the change-summary) and confirmed all 2 P0 + 6 P1 genuinely resolved. **Plan is finalized** — build may proceed on M0-independent work + M0 authoring.

Residual findings (this round) — all cleared in the finalize commit:

| ID | Sev | Finding | Resolution |
|---|---|---|---|
| F-014 | P2 | M3-1 (journey) carried a stale `Dep: M0-7` from the renumber (M0-7 is now financial_goals, not erasure); contradicted "startable immediately" | M3-1 dep → `—` (M0-independent); journey self-registers erasure per ADR-0004 |
| F-015 | P3 | M0-10 "register all M0 + M3 tables" runs before M3 creates them → erasure test false-greens | M0-10 scoped to M0-created tables; M3 tasks self-register + test their own |
| F-016 | P3 | M0-0 introspection as a hard gate blocks all M0 on a reachable DB | Softened: introspect if reachable, else derive from code facts (additive-safe); introspection = verification, not precondition; critical-path + R-9 reworded |
| F-017 | P3 | `audit-logger.ts` writes `target_type` not `resource_type` → NOT NULL still bites after additive cols | ADR-0010 impl note: map `target_type`→`resource_type` in that writer specifically |
| F-018 | P3 | product-spec Problem paragraph still named 3-4 twins | Synced to 17-twin reality + the audit-logger silent-failure bug |

**Conditions (per Finalization Gate):**
1. F-014 — **fixed** (M3-1 dep).
2. **R-9 (operator, OPEN):** confirm a reachable scratch/staging DB for M0-12 dry-run + optional M0-0 introspection. Migration *authoring* proceeds from code facts meanwhile; the dry-run is a deferred staging step, surfaced not guessed-green.
3. F-015..F-018 — **fixed** in this commit.

**Green to build now** (critic-confirmed, M0-independent): DEFAB-1/2/3, M1, M2-1..3, M3-1, M4-1, M5-3, + M0 migration authoring. The 5 owner ADRs (0005-0009) remain parked for sign-off (target 2026-08-09; M6 only, off critical path).
