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

---

## Round 3 — 2026-08-09 — audit-mode artifact set

**Verdict: REVISE REQUIRED** (2 P0 · 8 P1 · 4 P2 · 3 P3). Branch
`fix/restore-from-pre-deletion-state`, HEAD `f8c6d09`.

Reviewed: `gap-analysis.md` · `remediation-plan.md` · `security-findings.md` ·
`orphan-module-review.md` · `smoke-test-report.md` · `deleted-feature-audit.md` ·
`docs/deployment/LAUNCH_CHECKLIST.md` · `scripts/audit-reachability.js` ·
`scripts/audit-phantom-tables.js` · `scripts/audit-service-role-idor.js` ·
`scripts/idor-baseline.json`.

Commands run for this review: `node scripts/audit-reachability.js` ·
`node scripts/audit-phantom-tables.js` · `npm run audit:idor` ·
`npm run audit:auth` · `npm audit --omit=dev` · `ls supabase/migrations/*.sql | wc -l` ·
the `deleted-feature-audit` git sweep re-run verbatim · a mutation experiment
against the IDOR ratchet (patched file restored, tree clean).

### Steelman

The measurement discipline is real and it is the best thing here. Replacing a
name-grep with a transitive import walk, then publishing both the old and the
corrected figure with the command that settled it, is the right instinct — and
the three self-corrections (36 phantom→1, 12 anon→8, G-004 withdrawn) were
verified as genuine. The out-of-scope sections in every document are specific
and honest rather than defensive. `audit-service-role-idor.js` is a
well-reasoned tool: the alias resolution, the bracket-balanced chain extent, and
the per-call-site marker instead of a file exclusion list each fix a named
false-negative class. And SF-01/R-006 is a correctly-identified, independently
confirmed live defect that no gate could have caught.

### Numbers re-derived (attack #1)

Every headline figure re-measured. Matches unless noted.

| Claim | Doc | My measurement | Result |
|---|---|---|---|
| 319 unreachable / 1507 / 606 entries / 1189 reachable / 0 unresolved | gap:21-26 | identical | PASS |
| 68 phantom / 232 referenced / 202 schema | gap:65 | identical | PASS |
| 103 migration files | gap:170 | 103 | PASS |
| 18 prod vulns, 1 critical `next-auth`, 10 high, 7 moderate | G-008 | 18 (7 moderate, 10 high, 1 critical); critical **is** `next-auth` | PASS |
| `rxjs` absent from `package.json`, 9 product modules / 11 files | G-007 | absent; 9 non-test / 11 total | PASS |
| `audit:auth` 305/305 | checklist:43 | `audit:auth PASSED - 305 API routes` | PASS |
| 51 deleted / 36 present / 15 absent | deleted-feature:20-22 | 51 / 36 / 15 | PASS |
| `standalone-server.ts` bundled, not an orphan | orphan #52 | `Dockerfile:22` `RUN npx esbuild …standalone-server.ts` | PASS |
| IDOR gate "PASS — 0 unscoped non-insert queries" | smoke:22 | **180 unscoped · 63 pk · 31 fk · 83 held in baseline** | **FAIL** |
| "55 from the restore / 264 pre-existing" | gap:13-14 | **32 / 287** | **FAIL** |

### Dimension scorecard

| # | Dimension | Result | Evidence |
|---|---|---|---|
| 1 | Requirement coverage | WARN | Goal's "review the complete app" unmet for mobile: `audit-reachability.js:29,89` walks `join(ROOT,"src")` only |
| 2 | Dependency integrity | **FAIL** | R-003 (M0, "blocking, do first") acceptance requires M1 verdicts — `remediation:35,51,98`. Circular. |
| 3 | Hidden assumptions | WARN | `db reset` exit-0 trap called out well; local≡hosted assumed throughout, flagged but never gated |
| 4 | Vague language | PASS | Unusually concrete; figures carry their command |
| 5 | Estimate sanity | WARN | Zero estimates, owners or dates in any M0–M3 task table; M2 is 38 modules × an 8-step loop, unsized |
| 6 | Critical path verification | **FAIL** | Stated path `R-003 → M1 → …` (`remediation:248`) inverts R-003's own precondition |
| 7 | Risk completeness | WARN | No risk row for the 319-module DELETE sweep, the ratchet, or autonomous execution |
| 8 | ADR rigor | WARN | Three new standing decisions (DELETE-as-verdict, baseline freeze, Gate E) carry no ADR |
| 9 | Contract completeness | N/A | `contracts/` untouched this round |
| 10 | Smoke test reality | WARN | Real commands + real output throughout — but `smoke:22` is now false with no staleness marker |
| 11 | Security baseline | **FAIL** | R-006 acceptance omits the rate limit `security-findings.md:65` demands on a 32-bit credential |
| 12 | Rollback feasibility | **FAIL** | Zero rollback plan for M0/M1/M2; `grep -i rollback remediation-plan.md` → 1 hit, unrelated |
| 13 | Operational readiness | WARN | No logging/metrics/alert/SLO requirement attached to any wired module |
| 14 | Out-of-scope discipline | PASS | Specific, itemised, in all five documents |
| 15 | Open question hygiene | **FAIL** | No deadline or owner on any open item (trading product decision, hosted schema, FND-026 sign-off) |
| 16 | Reality check vs codebase | WARN | ~20 claims spot-checked; 4 material ones failed (below) |

**Tally:** P0=2 · P1=8 · P2=4 · P3=3

### P0 — blocking

**F-101 — the IDOR ratchet launders new cross-user holes. Proven, not argued.**
- **Location:** `scripts/audit-service-role-idor.js:386-393`; claimed at `LAUNCH_CHECKLIST.md:79`.
- **What's wrong:** the checklist states the gate "**fails the build** on any NEW unscoped service-role query … Mutation-tested in both directions". It does not. The comparison is `if (n > allowed)` with **no** branch for `n < allowed`, and the baseline never auto-shrinks. Fixing any baselined finding permanently frees a slot that a *new* query with the same `file|table|op|kind` fills silently.
- **Evidence:** in `src/app/api/analytics/events/route.ts` (baselined `analytics_events|select|none` = 3) I added `.eq("user_id", …)` to one query and introduced a new, fully unscoped `.select("*")` returning every user's analytics rows. Result: `npm run audit:idor` → **exit 0**, still "83 pre-existing finding(s)". The new hole never appeared. File restored; `git status` clean.
- **Fix:** fail the run when `n < allowed` (stale baseline must be regenerated), or key the baseline on query content rather than a count per file/table/op/kind. Until then Gate B's third box is not a gate, and the sentence claiming it was mutation-tested in both directions must be withdrawn.

**F-102 — DELETE of 319 modules is an ungated autonomous verdict, and it repeats the incident under review.**
- **Location:** `remediation-plan.md:112` (`DELETE` → "delete in a standalone commit"), `:28`, `:270`.
- **What's wrong:** no owner sign-off exists anywhere on the DELETE path. The plan itself concedes at `:270` that whether the pre-existing dark modules were meant to ship "needs the owner, not the code" — then leaves the verdict ungated. The owner has **already** overruled exactly this call once: `8e5481d` is titled *"reactivate 55 services deleted as 'dead code' — they were another session's work"*. Running this plan autonomously re-enacts that deletion at 6× the scale. It also breaches the standing hard limit in `~/.claude/CLAUDE.md` (deleting files the user did not ask you to create requires an explicit in-conversation okay).
- **Evidence:** `grep -niE "owner|sign-?off|approv" docs/specs/remediation-plan.md` returns three hits, none of them a gate on DELETE.
- **Fix:** DELETE requires named owner approval per batch before any commit, recorded in `orphan-module-review.md`. Until that exists, cap the autonomous verdict set at `WIRE-NOW` / `DO-NOT-WIRE` / `JEST-INFRA`, and route DELETE to a human queue.

### P1 — high

**F-103 — the gap analysis headline split is wrong.** `gap-analysis.md:13-14` ("Only **55** … The other **264** were already dead"), repeated at `remediation-plan.md:17`. Measured: `8e5481d` touched 56 `src/` paths, 35 non-test, of which **32** appear in the unreachable set → **287** predate the restore. The "55" is the restore commit's *file* headline, not an unreachable-module count. `gap-analysis.md:5` claims "every number below is executed output"; this pair falsifies that claim. The conclusion strengthens (10%, not 17%) — the arithmetic still has to be right.

**F-104 — `user_backup_codes` → `backup_codes` REMAP is column-incompatible, and it is the same name-vs-substance error the docs claim to have learned from.** `gap-analysis.md:119` and `remediation-plan.md:94` both assert the live table "has exactly the columns `mfa-service.ts:255,292` writes". It does not. `mfa-service.ts:254-259` upserts `{user_id, codes: <JSON array of {code_hash, used, created_at}>, updated_at}` — **one row per user**. `backup_codes` (`20260516000001_atomic_backup_code_redemption.sql:18-25`) is `{id, user_id, code TEXT, used, used_at, created_at}` — **one row per code**. `codes` and `updated_at` do not exist; `code` is scalar, not an array; and the `upsert` on `user_id` has no unique constraint to conflict against. Compounding it: R-003 says REMAP (keeps `mfa-service`), R-005 says collapse and delete it — both in M0.

**F-105 — R-006 would replace a fail-CLOSED broken control with a fail-OPEN one.** Backup codes are `crypto.randomBytes(4)` — **32 bits** (`src/lib/auth/backup-codes.ts:58`) — and `grep -niE "ratelimit|throttle|attempts" src/lib/auth/backup-codes.ts` returns nothing. `security-findings.md:65` explicitly requires that "whatever replaces the broken redemption path needs a rate limit … before going live". R-006's acceptance criterion (`remediation-plan.md:54`) is only "a user who loses their TOTP device can complete recovery". Ship that as written and an unauthenticated-adjacent 32-bit credential endpoint becomes brute-forceable — a real bypass where today's defect merely locks users out. Add rate limit + lockout + ≥128-bit codes to the acceptance criteria.

**F-106 — the plan's verdict tally does not reconcile with its own source.** `remediation-plan.md:118-123` states WIRE-NOW 38 / DO-NOT-WIRE 21 / JEST-INFRA 3 / WIRE-AFTER-TABLES 1 = 63. Mechanical count of the `orphan-module-review.md` table: **38 / 18 / 3 / 0 = 59**. The source document carries a section headed "## No pure WIRE-AFTER-TABLES cases" (`:197`). The plan invents three DO-NOT-WIRE and one WIRE-AFTER-TABLES, and its total exceeds the 59 modules actually reviewed.

**F-107 — the dogfooding recipe is not executable.** `remediation-plan.md:198-222`, the step the plan calls "Not optional" and "the only step that has ever caught anything". `$SUPABASE_URL`, `$SERVICE_KEY`, `$APP`, `$TOKEN` are defined nowhere in the artifact set (`grep -rn '\$\(SUPABASE_URL\|SERVICE_KEY\|APP\|TOKEN\)' docs/specs/*.md` → only these two lines). No helper exists: `ls scripts/ | grep -iE "smoke|dogfood|seed"` → none; no matching `package.json` script. Step 1's `POST /auth/v1/admin/users` returns a user object, **not** an access token — the password-grant call that actually yields `$TOKEN` is elided as `...`. Step 4 needs a second user step 1 never creates. Step 3 gives no psql DSN, step 7 no log command, and `npm run dev` is blocking with no backgrounding. Convert it to a committed `scripts/dogfood.sh` that an engineer runs, or it will be skipped exactly as the risk table at `:259` predicts.

**F-108 — R-003 is circular against its own milestone.** M0 is declared "blocking, do first" (`:45`) and M0 blocks M1 (`:35,41`), yet R-003's acceptance is "no table created before its caller's M1 verdict is WIRE" (`:51`) and its taxonomy row for the remaining 64 defers to "the M1 verdict" (`:98`). The critical path at `:248` then leads with `R-003 → M1 triage`. Split R-003 into R-003a (classify the 4 named tables — genuinely M0) and R-003b (the other 64 — post-M1).

**F-109 — Gate E reintroduced the exact contradiction `b03edca` claims to have fixed.** `LAUNCH_CHECKLIST.md:32` "**Gates A, B, C and D are ALL M1 preconditions**" vs `:135` "**Gates A–E are all M1 launch preconditions**". This is the same defect class as the "Gates A–C" / "Gate D is M1 scope" contradiction that commit's own revision note (`:355`) records resolving. *On the scope question the lead raised:* Gate E's **content is justified** — `jwt-validation.ts` was rewritten mid-session after every authenticated request 401'd, and only the ES256 happy path has ever run — and its items are engineering-owned, so folding them into Gate C (explicitly "operator-gated") would be wrong. Keep the gate; fix line 32.

**F-110 — the smoke report's IDOR row now reads as false clearance.** `smoke-test-report.md:22` — "IDOR · `npm run audit:idor` · **PASS** · 0 unscoped non-insert queries". Current: 34 unscoped non-insert plus 49 uncleared PK-scoped, 83 held in a baseline. The row was true at `61a4460` before the ratchet landed, but it sits in a results table with no staleness marker and is the only IDOR evidence in the document.

### P2 — medium

- **F-111 — `portfolios` is not test-only.** `gap-analysis.md:87` puts it in Class A. It has 9 sites, **5 non-test**, in `src/lib/investments/services/PortfolioRebalanceService.ts`. Correct split: Class A = 2, Class B = 65. (`plaid_items`, `tax_document_access_log` verified genuinely test-only.) The "at most one reachable" conclusion is unaffected.
- **F-112 — `holdings` REMAP is the wrong verdict class.** Its only non-test caller is `weekly-summary-service.ts:476`, whose orphan verdict is DO-NOT-WIRE (`orphan-module-review.md` #26). By R-003's own rule this is DELETE-CALLER, not REMAP → `investment_holdings`.
- **F-113 — "319 of 1,507 product modules" is a web-only measurement wearing a whole-app headline.** `audit-reachability.js:29,89` never walks `mobile-app/`. Disclosed at `gap-analysis.md:189` but not where the number is stated. Against the stated goal ("review the complete app"), mobile reachability is genuinely unmeasured; only the deleted-feature sweep covered mobile paths.
- **F-114 — the plan proposes building a component that already exists.** `remediation-plan.md:86-87`: "build the missing login-time 'use a backup code' step". `src/components/auth/BackupCodeRecovery.tsx` is a complete 318-line recovery UI with an `onVerify` contract; it is unreachable (in the 319) with only its own barrel importing it. The work is wiring, not building.

### P3 — low

- **F-115** — `deleted-feature-audit.md:65` attributes the 126/71/55 classification to `8e5481d`. It is `0667ffb`'s (its body: "Classified every one of the 126 backup-only files … 71 DELETED DELIBERATELY"). `8e5481d` touched 56 `src/` files; `0667ffb` touched 0.
- **F-116** — two different "55"s circulate undisambiguated: 55 services restored (`8e5481d`, `gap-analysis.md:13`) vs 55 non-`src` files salvaged (`0667ffb`, `deleted-feature-audit.md:70`).
- **F-117** — `LAUNCH_CHECKLIST.md:90` marks the live-schema box `[x]` citing "99 migrations" and "200 tables derived", while the same file's correction table (`:24`) says 202 and I measure 103 migration files. The reconciliation also compares migrations against a database built from those migrations, which is near-tautological for the hosted-schema question the box exists to answer.

### R-006 / SF-01 independently verified (attack #8) — the claim holds

| Check | Command / cite | Result |
|---|---|---|
| RLS enabled on `backup_codes` | `20260516000001…:30` | `ALTER TABLE backup_codes ENABLE ROW LEVEL SECURITY` |
| Policies on `backup_codes` | `grep -c "CREATE POLICY" …\| grep backup_codes` | **0**, across all 103 migrations |
| Table-level GRANT | `grep -niE "grant .* on .*backup_codes"` | none |
| RPC grant | `…:67-68` | `REVOKE … FROM PUBLIC` + `GRANT … TO service_role` only |
| Caller's role | `src/lib/auth/backup-codes.ts:11` | browser `createClient()` → `authenticated` |
| Reachable? | `src/app/settings/security/page.tsx:6,106` | renders `BackupCodesManagement`; absent from the unreachable list |

Confirmed: a live settings screen offers a recovery mechanism that fails closed
in every path. The design decision to move generation and redemption server-side
rather than adding `authenticated` policies is correct and should stand — with
F-105's rate limit and entropy added to the acceptance criteria.

### Not addressed but should be

- Rate limiting and lockout on the *new* backup-code redemption path (F-105).
- Audit trail / revert procedure for the DELETE sweep — which commits, how to restore, who approves.
- GDPR erasure cascade impact of up to 64 new tables. The erasure function is already known to carry four vestigial entries (`LAUNCH_CHECKLIST.md:90`); nothing in R-003 requires a new table to register with it.
- Key rotation and data retention for anything the wired modules persist.
- Hosted-schema reconciliation has no owner and no date, in three documents.

### Required next actions (in order)

1. Fix F-101 (`n < allowed` must fail) and withdraw the "mutation-tested in both directions" claim at `LAUNCH_CHECKLIST.md:79` until it is true again.
2. Gate DELETE on named owner approval; cap autonomous verdicts to WIRE-NOW / DO-NOT-WIRE / JEST-INFRA (F-102).
3. Correct 55/264 → 32/287 (F-103) and the verdict tally 21/1 → 18/0 (F-106).
4. Withdraw the `user_backup_codes` REMAP; resolve R-003 vs R-005 (F-104).
5. Add rate limit + lockout + ≥128-bit entropy to R-006's acceptance (F-105).
6. Commit `scripts/dogfood.sh`; delete the prose recipe (F-107).
7. Split R-003 (F-108); fix `LAUNCH_CHECKLIST.md:32` to A–E (F-109); stale-mark `smoke-test-report.md:22` (F-110).
8. Re-submit for a Round-4 gate.

### Risks accepted (3-round cap)

- **Hosted schema.** Raised in every document, unresolved in every document. No owner, no date. Accepted as a standing operator dependency, not re-litigated here.
- **Mobile.** Honestly disclosed in three places as out of scope. Accepted, with the caveat that the stated goal ("review the complete app") is therefore only partly met — that gap belongs to the owner to scope, not to this plan to hide.
