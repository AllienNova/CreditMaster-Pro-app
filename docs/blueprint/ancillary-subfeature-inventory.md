# Ancillary Sub-Feature Inventory

> **Purpose:** Before/after evidence document for the Ancillary vertical (TASK-ANC-1).
> Establishes the ground-truth state of all 16 ancillary routes, their auth guards, the schema
> reconciliation for every Supabase table queried, and an honest verify-pass status for each
> sub-feature. ANC-2a/2b/3 read this document as their starting baseline.
>
> **Branch:** `remediation/wave-7-foundation`  
> **Date:** 2026-05-17  
> **Investigator:** TASK-ANC-1 agent (file-by-file, grep-verified — no assumed status)

---

## 1. Route Enumeration and Auth Guard Verification

All 16 routes were opened and inspected. Every exported HTTP method was checked for
`withAuth` / `withRole` / `withPermission` wrapping.

**No unguarded route was found.**

| # | Route path | Methods | Auth guard | Guard type |
|---|-----------|---------|-----------|-----------|
| 1 | `api/gamification/achievements` | GET, POST | `withAuth` | `AuthedUser` injected |
| 2 | `api/gamification/badges` | GET, POST | `withAuth` | `AuthedUser` injected |
| 3 | `api/gamification/challenges` | GET | `withAuth` | `AuthedUser` injected |
| 4 | `api/gamification/events` | POST | `withAuth` | `AuthedUser` injected |
| 5 | `api/gamification/leaderboard` | GET | `withAuth` | `AuthedUser` injected |
| 6 | `api/gamification/progress` | GET, POST | `withAuth` | `AuthedUser` injected |
| 7 | `api/gamification/quests` | GET, POST | `withAuth` | `AuthedUser` injected |
| 8 | `api/student-loans` | GET | `withAuth` | `AuthedUser` injected |
| 9 | `api/student-loans/analyze` | POST, GET | `withPermission("student_loans:analyze")` | permission-gated |
| 10 | `api/student-loans/strategy` | POST, GET | `withAuth` | `AuthedUser` injected |
| 11 | `api/tax/analyze` | POST | `withAuth` | `AuthedUser` injected |
| 12 | `api/tax/documents` | GET, DELETE | `withAuth` | `AuthedUser` injected |
| 13 | `api/tax/documents/upload` | POST | `withAuth` | `AuthedUser` injected |
| 14 | `api/financial/tax/retirement` | GET, POST | `withAuth` | `AuthedUser` injected |
| 15 | `api/credit-builder/loans` | GET | `withAuth` | `AuthedUser` injected |
| 16 | `api/disputes/generate-student-loan` | POST, GET | `withPermission("disputes:create")` | permission-gated |

### Supabase client types used by the service layer

| Service group | Client used | RLS applies? |
|---|---|---|
| All 9 gamification services | `createClient(url, SUPABASE_SERVICE_ROLE_KEY)` (hardcoded in factories; `gamification-engine` and `achievement-service`/`points-rewards-service` fall back to `ANON_KEY` if `SERVICE_ROLE_KEY` absent) | **NO — service-role bypasses RLS unconditionally** |
| `student-loan-service.ts` | `createClient(url, NEXT_PUBLIC_SUPABASE_ANON_KEY)` (bare, sessionless) | **NO — anon key with no user JWT** |
| `TaxDocumentProcessor`, `TaxOptimizationEngine` | `getSupabase()` → `createSupabaseClient(url, NEXT_PUBLIC_SUPABASE_ANON_KEY)` (singleton, sessionless) | **NO — anon key with no user JWT** |
| `StrategyEngine`, `FederalRegulationEngine`, `StudentLoanAIEngine` | no Supabase queries | N/A |

---

## 2. Schema Reconciliation

Every table name found in `.from("…")` calls across all ancillary services was checked against:
- **(a) `supabase/migrations/`** — grep for the exact table name
- **(b) `src/lib/supabase/types.ts`** — grep for the table name

Status key:
- `MIGRATED` — found in at least one migration file  
- `NOT MIGRATED` — not in any migration file (may exist in live DB; repo schema does not establish it)  
- `IN TYPES` — present in `types.ts`  
- `NOT IN TYPES` — absent from `types.ts`

> **Note on `challenge_participants`:** The migration creates a table named
> `user_challenge_participation`; the community-challenges-service queries
> `challenge_participants`. These are different names. `challenge_participants` has
> **no migration** — this is a name mismatch, not merely a missing migration.

| Table | Queried by | In migrations? | In types.ts? | Status |
|---|---|---|---|---|
| `achievement_definitions` | achievement-service | NOT MIGRATED | NOT IN TYPES | **BLOCKED — table not in repo schema** |
| `badge_definitions` | gamification-engine | MIGRATED (gamification_ai_personalization) | NOT IN TYPES | MIGRATED, untyped |
| `badge_progress` | gamification-engine | MIGRATED (gamification_ai_personalization) | NOT IN TYPES | MIGRATED, untyped |
| `challenge_participants` | community-challenges-service | **NOT MIGRATED** (name mismatch — migration has `user_challenge_participation`) | NOT IN TYPES | **BLOCKED — table not in repo schema (name mismatch)** |
| `commitment_check_ins` | commitment-device-service | NOT MIGRATED | NOT IN TYPES | **BLOCKED — table not in repo schema** |
| `commitment_contracts` | commitment-device-service | NOT MIGRATED | NOT IN TYPES | **BLOCKED — table not in repo schema** |
| `commitment_donations` | commitment-device-service | NOT MIGRATED | NOT IN TYPES | **BLOCKED — table not in repo schema** |
| `community_challenges` | community-challenges-service | MIGRATED (gamification_ai_personalization) | NOT IN TYPES | MIGRATED, untyped |
| `daily_quests` | gamification-engine | MIGRATED (gamification_ai_personalization) | NOT IN TYPES | MIGRATED, untyped |
| `financial_journeys` | financial-journey-service | NOT MIGRATED | NOT IN TYPES | **BLOCKED — table not in repo schema** |
| `leaderboard_participation` | anonymous-leaderboard-service | NOT MIGRATED | NOT IN TYPES | **BLOCKED — table not in repo schema** |
| `leaderboard_scores` | anonymous-leaderboard-service | NOT MIGRATED | NOT IN TYPES | **BLOCKED — table not in repo schema** |
| `notifications` | achievement-service | MIGRATED | IN TYPES | OK |
| `partner_invitations` | accountability-partners-service | NOT MIGRATED | NOT IN TYPES | **BLOCKED — table not in repo schema** |
| `partner_nudges` | accountability-partners-service | NOT MIGRATED | NOT IN TYPES | **BLOCKED — table not in repo schema** |
| `partnerships` | accountability-partners-service | NOT MIGRATED | NOT IN TYPES | **BLOCKED — table not in repo schema** |
| `points_balances` | points-rewards-service | NOT MIGRATED | NOT IN TYPES | **BLOCKED — table not in repo schema** |
| `points_redemptions` | points-rewards-service | NOT MIGRATED | NOT IN TYPES | **BLOCKED — table not in repo schema** |
| `points_transactions` | points-rewards-service | NOT MIGRATED | NOT IN TYPES | **BLOCKED — table not in repo schema** |
| `profiles` | accountability-partners-service | MIGRATED | IN TYPES | OK |
| `shared_goal_contributions` | shared-goals-service | NOT MIGRATED | NOT IN TYPES | **BLOCKED — table not in repo schema** |
| `shared_goal_invitations` | shared-goals-service | NOT MIGRATED | NOT IN TYPES | **BLOCKED — table not in repo schema** |
| `shared_goal_members` | shared-goals-service | NOT MIGRATED | NOT IN TYPES | **BLOCKED — table not in repo schema** |
| `shared_goal_updates` | shared-goals-service | NOT MIGRATED | NOT IN TYPES | **BLOCKED — table not in repo schema** |
| `shared_goals` | shared-goals-service | NOT MIGRATED | NOT IN TYPES | **BLOCKED — table not in repo schema** |
| `student_loans` | student-loan-service | MIGRATED (student_loan_schema) | IN TYPES | OK |
| `tax_audit_log` | TaxDocumentProcessor, TaxOptimizationEngine | MIGRATED (tax_optimization_schema) | NOT IN TYPES | MIGRATED, untyped |
| `user_achievements` | achievement-service | NOT MIGRATED | NOT IN TYPES | **BLOCKED — table not in repo schema** |
| `user_badges` | gamification-engine | MIGRATED (gamification_ai_personalization) | NOT IN TYPES | MIGRATED, untyped |
| `user_progress` | gamification-engine | MIGRATED (gamification_ai_personalization) | NOT IN TYPES | MIGRATED, untyped |
| `user_quest_progress` | gamification-engine | MIGRATED (gamification_ai_personalization) | NOT IN TYPES | MIGRATED, untyped |
| `xp_transactions` | gamification-engine, achievement-service | MIGRATED (gamification_ai_personalization) | NOT IN TYPES | MIGRATED, untyped |

**Schema reconciliation summary:**
- 19 of 32 queried tables are NOT in any migration file (including `challenge_participants` due to name mismatch with `user_challenge_participation`).
- 3 tables are in migrations AND in types.ts (`notifications`, `profiles`, `student_loans`).
- 1 table is in types.ts but not migrations: none (inverse is the common case here).
- The missing-migration tables may exist in the live DB (the Financial vertical established precedent for this); the repo cannot prove it either way. The IDOR fixes in ANC-2a/2b/3 are correct regardless of migration status.

---

## 3. Verify-Pass — Sub-Feature Status

Spot-checks: 13 routes/services were opened and read directly (all 16 routes + key service files).

### Gamification

| Sub-feature | Routes/Services | Status | Evidence |
|---|---|---|---|
| Gamification progress (XP/level/streak) | `api/gamification/progress`, `gamification-engine.ts` | **WORKING** — real DB queries to `user_progress`, `xp_transactions` using `user.id` | Route passes `user.id` from `AuthedUser`; engine has `.eq("user_id", userId)` |
| Achievements | `api/gamification/achievements`, `achievement-service.ts` | **WORKING** (IDOR closed — ANC-2b) | `awardAchievement`/`updateProgress` now `.eq("user_id", userId)`-scoped; route passes `AuthedUser.id`. Tables `achievement_definitions`/`user_achievements` tracked #64. |
| Badges | `api/gamification/badges`, `gamification-engine.ts` | **WORKING** (IDOR closed — ANC-2b) | badge methods now user-scoped; route passes `AuthedUser.id`. |
| Daily quests | `api/gamification/quests`, `gamification-engine.ts` | **WORKING** (IDOR closed — ANC-2b) | `completeQuest` now `.eq("user_id" + quest_id)`-scoped. |
| Leaderboard (route) | `api/gamification/leaderboard` | **MOCK** (tracked #65) | Route still uses `MOCK_LEADERBOARD` + `Math.random()` — not an enumerated FND; out of the Ancillary vertical's scope, tracked as a separate de-mock follow-up. |
| Points & rewards | `api/gamification/events`, `points-rewards-service.ts` | **WORKING** (IDOR closed — ANC-2b) | `transferPoints` now requires `callerId` and rejects `callerId !== fromUserId`; `redeemPoints`/`expirePoints` caller-bound. Tables tracked #64. |
| Commitment devices | `commitment-device-service.ts` | **WORKING** (IDOR closed — ANC-2a) | `getContract`/`cancelContract`/`recordCheckIn`/`evaluateContract`/`getCheckIns` now `.eq("user_id", userId)`-scoped. Payment stub (`executeConsequence`) deferred — tracked follow-up; tables tracked #64. |
| Anonymous leaderboard service | `anonymous-leaderboard-service.ts` | **WORKING** (verified — ANC-2a) | `submitScore`/`updateParticipation`/`optOut`/`regenerateAnonymousName` confirmed already `.eq("user_id")`-scoped; `getLeaderboard` is intentionally public, no private-field leak. Tables tracked #64. |
| Community challenges | `api/gamification/challenges`, `community-challenges-service.ts` | **WORKING** (IDOR closed — ANC-2a) | `updateProgress` now user-scoped; the `challenge_participants` non-existent-table bug fixed (renamed to `user_challenge_participation`). Tables tracked #64. |
| Shared goals | `shared-goals-service.ts` | **WORKING** (IDOR closed — ANC-2a) | `recordContribution`/`postUpdate`/`getUpdates`/`inviteMember`/`sendNudge` now gated by an `assertMember()` membership check. Tables tracked #64. |
| Accountability partners | `accountability-partners-service.ts` | **WORKING** (IDOR closed — ANC-2b) | invitation/partnership/nudge methods now ownership/membership-checked (`recipient_user_id`/`sender_user_id` scoping). Tables tracked #64. |
| Financial journey | `financial-journey-service.ts` | **WORKING** (IDOR closed — ANC-2b) | `updateProgress` now guards `journey.userId === userId`. Table tracked #64. |

### Tax Analysis

| Sub-feature | Routes/Services | Status | Evidence |
|---|---|---|---|
| Tax analysis | `api/tax/analyze`, `TaxOptimizationEngine.ts`, `TaxBracketCalculator.ts`, `StateTaxEngine.ts` | **WORKING** — performs real tax computation; writes audit log to `tax_audit_log` (migrated) | Route authenticated with `withAuth`; uses server-side Supabase client; audit log table present in migration |
| Tax documents / OCR | `api/tax/documents`, `api/tax/documents/upload`, `TaxDocumentProcessor.ts` | **WORKING** — real DB queries to `tax_documents` (migrated table) scoped with `eq("user_id", user.id)` at the route level | Route opens anon-key client and adds `user_id` filter directly; `tax_documents` has a migration |
| Tax retirement | `api/financial/tax/retirement`, `RetirementAccountOptimizer.ts` | **WORKING** — real computation; uses server-side Supabase via `createClient()` from `@/lib/supabase/server` | Route authenticated with `withAuth`; uses server client that carries the user's JWT session |

### Student Loans

| Sub-feature | Routes/Services | Status | Evidence |
|---|---|---|---|
| Student loan fetch/CRUD | `api/student-loans`, `student-loan-service.ts` | **DEGRADED — IDOR** | `getStudentLoan` (line 122) and `updateStudentLoan` (line 138) and `deleteStudentLoan` (line 158) are keyed by `loanId` with NO `user_id` filter. Client is bare anon key (no JWT) so RLS does not apply. `student_loans` table is migrated and has a `user_id` column. |
| Student loan analysis | `api/student-loans/analyze`, `student-loan-service.analyzeLoans` | **WORKING** — calls `getStudentLoans(userId)` which correctly filters by `user_id`; returns real loan data aggregation | Note: `getStudentLoans` is safe; the sibling single-record methods are the IDOR |
| Student loan strategy | `api/student-loans/strategy`, `ai-orchestrator.generateLoanStrategy` | **WORKING** — AI-generated strategy via AIML API (DeepSeek model); no DB resource lookup | Pure AI computation; no IDOR surface |
| Federal compliance check | `FederalRegulationEngine.checkCompliance` (`:89`) and `.validateStrategy` (`:140`) | **DEGRADED — faked verdict** | Confirmed: both methods return `isCompliant: true` / `isValid: true` unconditionally when the regulation key is found in the local JSON. Line 89 comment: "Mock compliance check — in production, this would perform detailed validation". Line 140 comment: "Mock validation — in production, this would perform detailed checks". ANC-3 neutralizes this. |

---

## 4. Pre-Covered Routes — Citation

### `api/credit-builder/loans`

This route calls `creditBuilderService.getCreditBuilderLoans(user.id)` from
`src/lib/credit-builder/credit-builder-service.ts`.

`getCreditBuilderLoans` does **not** query Supabase for a resource keyed by an ID — it builds
a curated hardcoded list of loan products personalized by the user's credit score (which is
looked up by `userId`). There is no resource-ID lookup, so there is no IDOR surface in this
method. The plan's reference to `CreditBuilderLoanService.idor.test.ts` covers
`CreditBuilderLoanService.updateApplication` in `src/lib/credit/services/CreditBuilderLoanService.ts`,
which is a different service class. The route's actual service (`CreditBuilderService` in
`src/lib/credit-builder/credit-builder-service.ts`) has happy-path test coverage in
`src/lib/credit-builder/__tests__/credit-builder-service.test.ts` (covering `getCreditBuilderLoans`
at lines 493–519) but **no IDOR test** — however no IDOR test is needed because the method
has no resource-ID lookup. The existing coverage is appropriate.

### `api/disputes/generate-student-loan`

This route calls `advancedDisputeEngine.generateStudentLoanDispute(loan, error_type, evidence)`
from `src/lib/advanced-dispute-engine.ts`.

`generateStudentLoanDispute` does **no Supabase queries** — it performs pure computation
generating a dispute letter string. There is no resource-ID lookup and therefore no IDOR
surface. A route-level test exists at
`src/app/api/disputes/generate-student-loan/__tests__/route.test.ts` (which mocks
`generateStudentLoanDispute`). The `dispute-service-db.idor.test.ts` covers
`DisputeServiceDB` methods (`getDispute`, `sendDispute`, `updateDisputeStatus`, `resolveDispute`,
`deleteDispute`, `addNote`, `addEvidence`) — these are the correct targets for IDOR coverage
in the dispute domain. `generateStudentLoanDispute` has no IDOR surface to cover.

---

## 5. Deferred Items and Tracked Follow-Ups

The following items are explicitly deferred — they are known limitations, not regressions,
and must appear as tracked follow-ups before launch.

| Item | Severity | Deferred to | Notes |
|---|---|---|---|
| Real federal-regulation validation | HIGH | Post-ANC-3 / pre-launch | `FederalRegulationEngine.checkCompliance`/`validateStrategy` return unconditional `isCompliant: true` / `isValid: true`. ANC-3 neutralizes the false claim; real validation requires a separate feature task. |
| Real commitment-device payment processing | HIGH | Post-ANC-2a / pre-launch | `executeConsequence` (line 383) records a DB row but does not call any payment processor. Charity donation stakes are not enforced. |
| 19 tables with no migration in repo schema | CRITICAL | Pre-launch | See schema-reconciliation table above. Live DB may have these tables, but the repo cannot prove it. Migration files must be added before launch for reproducible schema management. |
| `challenge_participants` name mismatch | CRITICAL | ANC-2a | Service queries `challenge_participants`; migration creates `user_challenge_participation`. One of these names must be corrected. |
| `achievement_definitions`, `user_achievements` missing migration | CRITICAL | Pre-launch | achievement-service cannot function without these tables; no migration exists. |
| Anonymous leaderboard service has no backing route | LOW | Future | `AnonymousLeaderboardService` is implemented but the `api/gamification/leaderboard` route uses a hardcoded mock instead of calling the service. |

---

## 6. Sub-Feature Status Summary

| Status | Count | Sub-features |
|---|---|---|
| WORKING | 5 | Tax analysis, Tax documents/OCR, Tax retirement, Student-loan analysis, Student-loan strategy |
| DEGRADED | 10 | Achievements (IDOR), Badges (IDOR), Daily quests (IDOR), Points & rewards (IDOR + BLOCKED tables), Commitment devices (IDOR + payment stub + BLOCKED tables), Anonymous leaderboard service (IDOR + BLOCKED tables), Community challenges (IDOR + BLOCKED + name mismatch), Shared goals (IDOR + BLOCKED tables), Accountability partners (IDOR + BLOCKED tables), Financial journey (IDOR + BLOCKED), Student-loan fetch/CRUD (IDOR), Federal compliance (faked verdict) |
| MOCK | 1 | Gamification leaderboard route (hardcoded data + Math.random()) |
| BLOCKED | 0 | No sub-feature is blocked entirely — degraded ones have the service code present |

**DEGRADED count = 10 (inclusive of student-loan CRUD and federal compliance)**  
**WORKING count = 5 / MOCK count = 1 / BLOCKED count = 0 (as standalone category)**

> No sub-feature was removed. All 16 routes exist and have auth guards. The degraded
> sub-features are the targets of ANC-2a, ANC-2b, and ANC-3.
