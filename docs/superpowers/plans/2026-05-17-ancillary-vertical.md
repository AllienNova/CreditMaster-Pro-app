# Ancillary Vertical Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development — ONE task per subagent, hard stop, two-stage review between tasks. Never batch. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Bring the Ancillary workflows (Tax, Student loans / federal, Gamification) to launch quality — close the IDOR bugs the audit never reached, neutralize a faked federal-compliance verdict, and produce honest before/after evidence — without dropping any sub-feature.

**Architecture:** Verification + IDOR-fix vertical. The 2026-05-03 audit assigned **no findings** to Tax / Student-loans / Gamification — but "no findings" means "not audited", not "clean". The adversarial plan review verified the gamification services contain **numerous live IDORs** (resource-keyed and passed-`userId` queries with no caller binding, on a service-role client) — so this is a **bug-fix** vertical, not a light audit. Work: (a) verify-pass + schema reconciliation; (b) IDOR sweep + fixes; (c) neutralize a false federal-compliance verdict.

**Tech Stack:** Next.js 15 App Router, TypeScript 5.7 strict, Supabase (Postgres + RLS), Jest + ts-jest.

---

## Pre-state (verified against HEAD `b819e0e` — `remediation/wave-7-foundation`)

- Branch: `remediation/wave-7-foundation` (Foundation + Payments + Investments + Financial + Credit + Mobile verticals merged & pushed). AUTH-03 wrapped all 294 API routes — but ANC-1 **independently re-verifies** the guard on every ancillary route (do not inherit "all wrapped" — FND-041..053 proved that assumption wrong before).
- `test:idor` exists (`jest -t idor`).
- **No FND-* is assigned to the Ancillary domain** — verified against the full 71-finding `gap_analysis.md`. All IDOR/honesty work below is *discovered*.
- **Surface:** 16 web routes — `api/gamification/{achievements,badges,challenges,events,leaderboard,progress,quests}`, `api/student-loans/{route,analyze,strategy}`, `api/tax/{analyze,documents,documents/upload}` + `api/financial/tax/retirement`, plus `api/credit-builder/loans` and `api/disputes/generate-student-loan` (see Scope note). Services: `src/lib/tax/**` (~18), `src/lib/gamification/**` (11), `src/lib/student-loan-agent/**` + `student-loan-service.ts` + `student-loan-ai-engine.ts`.

### Verified facts the plan is built on (from the adversarial review)

1. **The 9 gamification services run as service-role.** `commitment-device`, `anonymous-leaderboard`, `community-challenges`, `shared-goals`, `financial-journey`, `accountability-partners` use `SUPABASE_SERVICE_ROLE_KEY` unconditionally; `gamification-engine`, `points-rewards`, `achievement-service` use `SERVICE_ROLE_KEY || ANON_KEY` (service-role in production). **The service-role key bypasses RLS** → for the ENTIRE gamification scope, a `Y-via-RLS` classification is FORBIDDEN; explicit `.eq("user_id", …)` is the only defense. This is a fact, not a per-service discovery.
2. **The gamification services have live IDORs** (verified examples): `commitment-device-service.getContract/cancelContract/recordCheckIn/evaluateContract/getCheckIns` (keyed by `contractId`/`id`, no `user_id`); `points-rewards-service.transferPoints/redeemPoints/expirePoints` (passed `userId`/`fromUserId`, no caller binding); `community-challenges-service.updateProgress` (keyed by `participantId`); `shared-goals-service.recordContribution/postUpdate/getUpdates/inviteMember` (keyed by `goalId`, no membership check); `achievement-service.updateProgress/awardAchievement` and `gamification-engine.awardXp/completeQuest` (passed `userId`); `anonymous-leaderboard-service.submitScore/updateParticipation/optOut/regenerateAnonymousName` (passed `userId` write paths). ANC-2a/2b WILL fix bugs.
3. **Most gamification tables have NO migration in the repo.** Only `20260120000000_gamification_ai_personalization.sql` exists (covers `user_progress`, `xp_transactions`, `user_badges`, `badge_progress`, `daily_quests`, `user_quest_progress`, `community_challenges`, `user_challenge_participation`, `leaderboard_snapshots`). Tables queried by the services with NO migration: `commitment_contracts`/`_check_ins`/`_donations`, `points_balances`/`_transactions`/`_redemptions`, `leaderboard_scores`/`_participation`, `challenge_participants`, `shared_goals`/`_members`/`_contributions`/`_invitations`/`_updates`, `achievement_definitions`, `user_achievements`, `financial_journeys`, `partner_invitations`, `partnerships`, `partner_nudges`. The repo's migration set is known-incomplete (the Financial vertical established the live DB has tables absent from migrations). ANC-1 reconciles this explicitly — the `.eq("user_id")` IDOR fix is correct regardless of whether a table is migrated.
4. `FederalRegulationEngine.checkCompliance` (`:89`) and `validateStrategy` (`:140`) return `isCompliant: true` / `isValid: true` **unconditionally** — an affirmative *false* statement about federal regulatory compliance. ANC-3 neutralizes this (see ANC-3 Step 5).
5. `student-loan-service.ts` and the tax services use the **anon-key** client (`@/lib/supabase/client`) — RLS *can* apply there IF the client carries the user's JWT; ANC-3 must check whether it does (the anon client may be constructed sessionless).

## Scope

**In scope:** verify-pass + schema reconciliation; IDOR sweep + fixes of the gamification, student-loan, and tax services; neutralizing the `FederalRegulationEngine` false-compliance verdict.

**Out of scope (tracked, not fixed):** implementing *real* federal-regulation validation and *real* commitment-device payment processing — major features; ANC-1 files tracked follow-ups. **`api/credit-builder/loans` and `api/disputes/generate-student-loan`** — enumerated for inventory completeness ONLY; their service layers (`creditBuilderService`, `advancedDisputeEngine`) were already IDOR-swept by the Credit vertical (`CreditBuilderLoanService.idor.test.ts`, `dispute-service-db.idor.test.ts` exist). ANC-1 cites those existing tests as evidence and does NOT re-sweep — if ANC-1 finds a method of those services genuinely uncovered, it appends a fix task. Mobile gamification; the trading/PCTT engine.

---

## File Structure

| File / area | Responsibility | Task |
|---|---|---|
| `docs/blueprint/ancillary-subfeature-inventory.md` | CREATE — checklist + verify-pass + table-reconciliation | ANC-1 |
| `src/lib/gamification/{commitment-device,anonymous-leaderboard,community-challenges,shared-goals}-service.ts` | IDOR sweep — fix | ANC-2a |
| `src/lib/gamification/{gamification-engine,points-rewards-service,achievement-service,accountability-partners-service,financial-journey-service}.ts` | IDOR sweep — fix | ANC-2b |
| `src/lib/student-loan-service.ts`, `student-loan-agent/**`, `student-loan-ai-engine.ts`, `src/lib/tax/**` | IDOR sweep + neutralize FederalRegulationEngine false-compliance | ANC-3 |
| co-located `__tests__/*.idor.test.ts` | new cross-user tests per swept service | ANC-2a, ANC-2b, ANC-3 |

---

### Task ANC-1: Ancillary inventory + verify-pass + schema reconciliation

**Files:** Create `docs/blueprint/ancillary-subfeature-inventory.md`

- [ ] **Step 1: Enumerate + verify auth.** All 16 ancillary routes — path, methods, AND the auth guard wrapping each (open each file). **Any route with no `withAuth`/`withRole`/`withPermission` guard → STOP and report** (not an inventory row). All `src/lib/{tax,gamification}/**` + `student-loan*` services with their exported entry points.
- [ ] **Step 2: Schema reconciliation.** For every Supabase table the gamification/tax/student-loan services query (`grep .from(`), record whether it exists in (a) `supabase/migrations/` and (b) `src/lib/supabase/types.ts`. A table in NEITHER → mark its sub-feature `BLOCKED — table not in repo schema` and list it as a first-class finding (the repo migrations are known-incomplete; the table may exist in the live DB, but the plan must surface the uncertainty rather than green-wash it).
- [ ] **Step 3: Verify-pass.** Group into sub-features. Status each `WORKING` (real DB query / real computation) / `DEGRADED — <reason>` / `MOCK` / `BLOCKED — <missing table>`. Known non-`WORKING` rows: the `FederalRegulationEngine` false-compliance methods (`DEGRADED — faked verdict`, neutralized by ANC-3); the `commitment-device` payment stub (`DEGRADED — payment deferred`); any missing-migration tables (Step 2). Spot-check ≥10.
- [ ] **Step 4: Cite the pre-covered routes.** For `api/credit-builder/loans` and `api/disputes/generate-student-loan`: confirm `creditBuilderService` / `advancedDisputeEngine` have existing `*.idor.test.ts` coverage (from the Credit vertical) for the methods these routes call (`getCreditBuilderLoans`, `generateStudentLoanDispute`). Cite the test files. If a called method is genuinely uncovered, report it so a fix task can be appended.
- [ ] **Step 5: Commit** — `docs: TASK-ANC-1 ancillary inventory + verify-pass + schema reconciliation`.
- [ ] **Step 6: Report** every `DEGRADED`/`MOCK`/`BLOCKED` row. File tracked follow-ups for: real federal-regulation validation, real commitment-device payment processing, and any `BLOCKED — table not in repo schema` finding.

---

### Task ANC-2a: IDOR sweep — commitment / leaderboard / challenges / shared-goals

**Files:** `src/lib/gamification/{commitment-device-service,anonymous-leaderboard-service,community-challenges-service,shared-goals-service}.ts`; co-located `*.idor.test.ts` (new).

- [ ] **Step 1: Audit every `.from()` chain.** These services run as **service-role** — `Y-via-RLS` is FORBIDDEN; every resource-keyed read/update/delete needs explicit `.eq("user_id", …)`, every insert must write `user_id`. Audit table in the commit body: service · method · table · scoped? (Y / N-FIXED / N/A-public-read).
   **`anonymous-leaderboard-service` special case:** a leaderboard *read* (`getLeaderboard`) is intentionally cross-user — that is `N/A-public-read`, fine. But the WRITE/identity paths are NOT — `submitScore`, `updateParticipation`, `optOut`, `regenerateAnonymousName` take a passed `userId`; each MUST be bound to the caller's id and is an IDOR until fixed. Confirm `getLeaderboard` leaks no private field.
- [ ] **Step 2: Fix every unscoped query.** Resource-keyed methods get a required `userId` (threaded from the route's `AuthedUser`) + `.eq("user_id", userId)`. **Passed-`userId` methods** (`commitment-device` contract methods, `shared-goals` member methods, `submitScore` etc.): the route MUST pass `AuthedUser.id` and NEVER a body/query-sourced `userId` — audit each calling route and fix any that sources `userId` from the request. For `shared-goals` membership operations, scope by a membership check (the caller must be a member of the goal), not just `user_id` equality.
- [ ] **Step 3: Cross-user `*.idor.test.ts`** for every resource-id / passed-`userId` method — `idor`-named; user A's resource under user B → empty/throw.
- [ ] **Step 4: Run** — `npm run test:idor` green; full suite (`npx jest --watchman=false`) 0 failures; `npx tsc --noEmit` 0 errors.
- [ ] **Step 5: Commit** — `fix: TASK-ANC-2a IDOR sweep — commitment/leaderboard/challenges/shared-goals`.

---

### Task ANC-2b: IDOR sweep — gamification-engine / points / achievement / partners / journey

**Files:** `src/lib/gamification/{gamification-engine,points-rewards-service,achievement-service,accountability-partners-service,financial-journey-service}.ts`; co-located `*.idor.test.ts` (new).

- [ ] **Step 1: Audit every `.from()` chain** — same rules as ANC-2a (service-role, no RLS escape hatch). **`points-rewards-service` is the highest-risk:** `transferPoints(fromUserId, toUserId, …)`, `redeemPoints`, `expirePoints` operate on passed user ids with zero caller binding — a route passing a body-sourced id lets a user drain/spend another user's points (and `redeemPoints` redeems real perks — free premium months). `achievement-service.awardAchievement`/`updateProgress` and `gamification-engine.awardXp`/`completeQuest` are the same passed-`userId` pattern (economic exploit — XP gates perks). Audit table in the commit body.
- [ ] **Step 2: Fix.** Every passed-`userId` method must be bound to `AuthedUser.id` at the route; for `transferPoints`, `fromUserId` MUST equal the caller (only `toUserId` is a free parameter). Audit every calling route for body-sourced ids. Resource-keyed methods get `.eq("user_id", userId)`.
- [ ] **Step 3: Cross-user `*.idor.test.ts`** for every method — including a test that `transferPoints` rejects a `fromUserId` ≠ caller.
- [ ] **Step 4: Run** — `npm run test:idor` green; full suite 0 failures; `npx tsc --noEmit` 0 errors.
- [ ] **Step 5: Commit** — `fix: TASK-ANC-2b IDOR sweep — gamification-engine/points/achievement/partners/journey`.

---

### Task ANC-3: IDOR sweep (tax & student-loan) + neutralize the false federal-compliance verdict

**Files:** `src/lib/student-loan-service.ts`, `student-loan-agent/**` (incl. `FederalRegulationEngine.ts`), `student-loan-ai-engine.ts`, `src/lib/tax/documents/TaxDocumentProcessor.ts`, `src/lib/tax/services/**`; co-located tests.

- [ ] **Step 1: Audit the tax + student-loan `.from()` chains.** These use the **anon-key** client — RLS applies ONLY if the client carries the user's JWT. Verify how `student-loan-service.ts` and `TaxDocumentProcessor` construct their Supabase client: if it is the bare sessionless anon client, RLS sees an anonymous role and the queries are NOT user-protected — treat as unscoped and add explicit `.eq("user_id", …)`. `getStudentLoan`/`updateStudentLoan`/`deleteStudentLoan` (keyed by `id`) and the `tax_documents` queries are the focus. Audit table in the commit body.
- [ ] **Step 2: Fix** every unscoped tax/student-loan query — explicit `.eq("user_id", userId)`, `userId` threaded from the route's `AuthedUser`.
- [ ] **Step 3: Cross-user `*.idor.test.ts`** for every tax/student-loan resource-id method.
- [ ] **Step 4: Run** — `npm run test:idor` green; full suite 0 failures; `npx tsc --noEmit` 0 errors.
- [ ] **Step 5: Neutralize the false federal-compliance verdict (FND-honesty).** `FederalRegulationEngine.checkCompliance` (`:89`) and `validateStrategy` (`:140`) currently return `isCompliant: true` / `isValid: true` unconditionally — an affirmative false claim that a federal-regulation check passed. Real validation is a deferred feature, but shipping a *faked pass* is a trust/liability problem. Change both to return an HONEST result: `isCompliant: false` (or an `unknown`/`unverified` status if the type allows) with a clear message — e.g. `"Automated compliance validation is not yet available — manual review required."` Update the calling code/UI so it does NOT present a green "compliance passed" verdict. Add a test asserting these methods never return an unconditional `true`. (Real validation stays a tracked follow-up; this step only removes the false claim.)
- [ ] **Step 6: Commit** — `fix: TASK-ANC-3 IDOR sweep (tax/student-loan) + neutralize faked federal-compliance verdict`.

---

## Vertical gate (Ancillary "done" criteria)

- `npm run test:idor` — passes; a cross-user test for every gamification/tax/student-loan service method that takes a resource id or a `userId`; count rises, does not regress.
- The ANC-2a/2b/3 audit tables account for every `.from()` chain in the swept services — each scoped / fixed / `N/A-public-read`-with-rationale.
- Every IDOR found is closed with a cross-user regression test. No gamification route sources `userId` from the request body/query.
- `FederalRegulationEngine.checkCompliance`/`validateStrategy` no longer return an unconditional pass; no UI surfaces a faked compliance verdict.
- Full suite 0 failures; `npm run type-check` + project-wide `tsc` 0 errors.
- `BASE_REF=<vertical base> npm run test:coverage:changed` — ≥85% on every changed file's changed lines.
- ANC-1 inventory: every sub-feature `WORKING` except the explicitly-deferred items (real federal-compliance validation, commitment-device payment) and any `BLOCKED — table not in repo schema` finding — all filed as tracked follow-ups, documented as known deferrals, not regressions.
- No sub-feature removed.

---

## Notes for the executor

- This is a **bug-fix** vertical — the gamification IDORs are real and verified. An "audit-only, no gaps" outcome for the gamification scope is NOT expected; if a subagent claims it, distrust and re-verify.
- The gamification services are service-role — `Y-via-RLS` is forbidden there; explicit `.eq("user_id")` is mandatory. RLS *may* apply to the anon-key tax/student-loan services, but only if the client carries the user JWT — verify, don't assume.
- The single highest-value audit: every gamification route must pass `AuthedUser.id` into the service, NEVER a `userId` from the request body/query. A correctly-`.eq`-scoped service is still exploitable if the route hands it an attacker-controlled id.
- Missing-migration tables (ANC-1 Step 2) are a real finding — surface them; the `.eq("user_id")` fix is still correct on an un-migrated table.
- Every IDOR fix needs a cross-user test — the only evidence the gate accepts.
- Reviewers are advisory; challenge a review CRITICAL that would force a regression.
