# Ancillary Vertical Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development — ONE task per subagent, hard stop, two-stage review between tasks. Never batch. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Bring the Ancillary workflows (Tax, Student loans / federal, Gamification) to launch quality via a verify-and-polish pass and an IDOR sweep — confirm every sub-feature runs on real data, prove every resource-keyed query is user-scoped, and surface (with tracked follow-ups) the stubs the audit never reached.

**Architecture:** Verification + IDOR-sweep vertical, like the Credit vertical. The 2026-05-03 audit assigned **no findings** to Tax / Student-loans / Gamification — but "no findings" means "not audited", not "clean" (the Credit and Mobile verify-passes both proved this). Two work types: (a) a verify-pass — confirm each route+service runs on real data, no mock/stub; (b) an IDOR sweep — audit every Supabase `.from()` query chain in the gamification, tax, and student-loan services for `.eq("user_id", …)` scoping, fix unscoped queries, add cross-user `*.idor.test.ts`.

**Tech Stack:** Next.js 15 App Router, TypeScript 5.7 strict, Supabase (Postgres + RLS), Jest + ts-jest.

---

## Pre-state (verified against HEAD `b819e0e` — `remediation/wave-7-foundation`)

- Branch: `remediation/wave-7-foundation` (Foundation + Payments + Investments + Financial + Credit + Mobile verticals merged & pushed). AUTH-03 wrapped all 294 API routes — the ancillary routes resolve an `AuthedUser` (`gamification/progress`, `student-loans`, `tax/analyze` confirmed `withAuth`).
- `test:idor` npm script exists — `jest -t idor`.
- Full suite green (post-Mobile; mobile is a separate `jest-expo` runner — this vertical's web work uses the web suite).
- **No FND-* is assigned to the Ancillary domain** — verified against `gap_analysis.md`. The IDOR/mock work below is *discovered*, not from the register.
- **Surface (verified):** 16 web routes — `api/gamification/{achievements,badges,challenges,events,leaderboard,progress,quests}` (7), `api/student-loans/{route,analyze,strategy}` (3), `api/tax/{analyze,documents,documents/upload,financial/tax/retirement}` (~5), plus `api/credit-builder/loans` and `api/disputes/generate-student-loan`. Services: `src/lib/tax/**` (~18 files), `src/lib/gamification/**` (11 files), `src/lib/student-loan-agent/**` + `student-loan-service.ts` + `student-loan-ai-engine.ts`.
- **Discovery (verified — corrects the "light verify pass" billing):**
  - The gamification services carry a LARGE Supabase surface: `.from()` chains — `gamification-engine.ts` 19, `points-rewards-service.ts` 19, `achievement-service.ts` 18, `community-challenges-service.ts` 15, `shared-goals-service.ts` 14, `accountability-partners-service.ts` 14, `commitment-device-service.ts` 10, `anonymous-leaderboard-service.ts` 9 (~120 chains total). This is a real IDOR-sweep surface, not a "light" pass.
  - `src/lib/student-loan-agent/FederalRegulationEngine.ts:89,140` are explicit STUBS — `// Mock compliance check - in production, this would perform detailed validation` and `// Mock validation`. A student-loan product presenting a *faked* federal-regulation compliance result is a correctness/trust risk.
  - `src/lib/gamification/commitment-device-service.ts:383` — `// In production, this would integrate with payment processing` — a payment-integration stub (commitment devices stake real money).
  - Tax services are computation-heavy with minimal persistence (~3 `.from()` chains) — `TaxBracketCalculator` explicitly loads tables from config, not hardcoded.

## Scope

**In scope:** verify-pass of Tax / Student-loans / Gamification; IDOR sweep + fixes of the gamification, student-loan, and tax services.

**Out of scope / tracked-not-fixed:** implementing *real* federal-regulation compliance validation (`FederalRegulationEngine`) and *real* payment processing for commitment devices — these are major features, not verify-vertical work. ANC-1 flags them; the plan files tracked follow-ups (see ANC-1 Step 5). Mobile gamification (`mobile-app/`) — covered by the Mobile vertical's deferred `__DEV__` follow-up. The trading/PCTT engine.

---

## File Structure

| File / area | Responsibility | Task |
|---|---|---|
| `docs/blueprint/ancillary-subfeature-inventory.md` | CREATE — sub-feature checklist + verify-pass | ANC-1 |
| `src/lib/gamification/*.ts` (8 Supabase-backed services) | IDOR sweep — fix unscoped queries | ANC-2 |
| `src/lib/student-loan-service.ts`, `src/lib/student-loan-agent/**`, `src/lib/tax/**` (`TaxDocumentProcessor`, `TaxOptimizationEngine`, the vision providers) | IDOR sweep — fix unscoped queries | ANC-3 |
| co-located `__tests__/*.idor.test.ts` | new cross-user tests per swept service | ANC-2, ANC-3 |

---

### Task ANC-1: Ancillary inventory + verify-pass

**Files:** Create `docs/blueprint/ancillary-subfeature-inventory.md`

- [ ] **Step 1: Enumerate.** All 16 ancillary routes (path + methods + auth guard); all `src/lib/{tax,gamification}/**` and `src/lib/student-loan*` services (file + exported entry points); ancillary pages/components.
- [ ] **Step 2: Verify-pass.** Group into sub-features (Tax analysis, Tax documents/OCR, Tax retirement optimization, Student-loan analysis, Student-loan strategy, Student-loan federal compliance, Gamification progress/achievements/badges/quests/challenges/leaderboard, Points & rewards, Commitment devices, Accountability partners, Shared goals). For each: open a representative route + service and judge `WORKING` (real DB query / real computation) vs `DEGRADED — <reason>` / `MOCK` (stub, `// in production this would…`, hardcoded data). The `FederalRegulationEngine` stub methods and the `commitment-device-service` payment stub are known `DEGRADED` rows — mark them precisely. Spot-check ≥10 routes/services.
- [ ] **Step 3: Write the inventory** — `docs/blueprint/ancillary-subfeature-inventory.md`: Sub-feature | Key files | Status. Header explains it is the vertical's before/after evidence.
- [ ] **Step 4: Commit** — `docs: TASK-ANC-1 ancillary sub-feature inventory + verify-pass`.
- [ ] **Step 5: Report** every `DEGRADED`/`MOCK` row. The `FederalRegulationEngine` stubs and the `commitment-device` payment stub are expected and will be filed as tracked follow-ups (real federal-compliance validation and real payment processing are out of this verify vertical's scope). If the verify-pass finds a MOCK that IS mechanically fixable within the vertical (a route serving hardcoded data when a real service exists), STOP and report so a fix task can be appended.

---

### Task ANC-2: IDOR sweep — gamification services

**Files:**
- Audit/fix: `src/lib/gamification/{gamification-engine,points-rewards-service,achievement-service,community-challenges-service,shared-goals-service,accountability-partners-service,commitment-device-service,anonymous-leaderboard-service,financial-journey-service}.ts`
- Test: a co-located `*.idor.test.ts` per service with resource-id methods (new)

~120 Supabase `.from()` chains across these 8-9 services.

- [ ] **Step 1: Audit every `.from()` chain.** For each service, read each query. Classify: read/update/delete keyed by a resource id → MUST carry `.eq("user_id", …)` OR operate on a table with a verified RLS policy (check `supabase/migrations/`); insert → must write `user_id`; list-by-user → already scoped. **Determine how each service constructs its Supabase client** — if any uses `SUPABASE_SERVICE_ROLE_KEY` (service-role bypasses RLS), the `Y-via-RLS` classification is FORBIDDEN for it; explicit `.eq("user_id", …)` required. **Special case — `anonymous-leaderboard-service.ts`:** a leaderboard is intentionally cross-user readable; the IDOR concern there is narrower (a user must not be able to read another user's *private* rank detail or write another user's score) — judge each query on intent, do not blindly demand `user_id` on a public-leaderboard read. Produce an audit table in the commit body: service · method · table · scoped? (Y / Y-via-RLS / N-FIXED / N/A-public).
- [ ] **Step 2: Fix every unscoped query** that should be user-scoped — add a required `userId` param threaded from the route's `AuthedUser`, add `.eq("user_id", userId)`, update callers (tsc backstops).
- [ ] **Step 3: Cross-user `*.idor.test.ts`** for every service method that takes a resource id — `idor`-named describe blocks; user A's resource id under user B → empty/null/throw. Mock Supabase.
- [ ] **Step 4: Run** — `npm run test:idor` green; full suite (`npx jest --watchman=false`) 0 failures; `npx tsc --noEmit` 0 errors.
- [ ] **Step 5: Commit** — `fix: TASK-ANC-2 IDOR sweep — gamification services` (or `test:` if the audit found everything already scoped — note "audit-only, no gaps" in the body).

> If Step 1's audit shows the 8-9-service surface is too large for one clean task, STOP and report — split into ANC-2a / ANC-2b.

---

### Task ANC-3: IDOR sweep — tax & student-loan services

**Files:**
- Audit/fix: `src/lib/student-loan-service.ts`, `src/lib/student-loan-agent/**`, `src/lib/student-loan-ai-engine.ts`, `src/lib/tax/documents/TaxDocumentProcessor.ts`, `src/lib/tax/services/TaxOptimizationEngine.ts`, `src/lib/tax/documents/providers/*.ts`
- Test: co-located `*.idor.test.ts` (new)

Smaller surface — `student-loan-service.ts` ~5 `.from()` chains; tax ~3.

- [ ] **Step 1: Audit every `.from()` chain** in the tax + student-loan services — same classification as ANC-2 Step 1 (service-role caveat included). Tax document storage is user-private — `TaxDocumentProcessor` queries on a document id MUST be `user_id`-scoped. Audit table in the commit body.
- [ ] **Step 2: Fix every unscoped query** — same approach as ANC-2 Step 2.
- [ ] **Step 3: Cross-user `*.idor.test.ts`** for every tax/student-loan service method that takes a resource id.
- [ ] **Step 4: Run** — `npm run test:idor` green; full suite 0 failures; `npx tsc --noEmit` 0 errors.
- [ ] **Step 5: Commit** — `fix: TASK-ANC-3 IDOR sweep — tax & student-loan services` (or `test:` if audit-only).

---

## Vertical gate (Ancillary "done" criteria)

- `npm run test:idor` — passes; includes a cross-user test for every gamification/tax/student-loan service method that takes a resource id; count does not regress.
- The ANC-2 + ANC-3 audit tables account for every `.from()` chain in the swept services — each marked scoped / fixed / N/A-public-with-rationale.
- Any IDOR the sweep discovered is closed and has a cross-user regression test.
- Full suite 0 failures; `npm run type-check` + project-wide `tsc` 0 errors.
- `BASE_REF=<vertical base> npm run test:coverage:changed` — ≥85% on every changed file's changed lines.
- ANC-1 inventory shows every ancillary sub-feature `WORKING` EXCEPT the explicitly-deferred `FederalRegulationEngine` federal-compliance stub and the `commitment-device` payment stub — both filed as tracked follow-ups, documented in the inventory as known deferrals (not Ancillary-vertical regressions).
- No sub-feature removed.

---

## Notes for the executor

- This is a verify + sweep vertical. A task whose audit finds everything already scoped still delivers value — the cross-user tests are permanent regression evidence.
- Every IDOR fix needs a cross-user test (user A's resource id under user B) — the only evidence the gate accepts.
- Before declaring a query "RLS-scoped", confirm the RLS policy genuinely exists in `supabase/migrations/`; a service-role-key client bypasses RLS — for those, explicit `.eq("user_id")` is mandatory.
- `anonymous-leaderboard-service` is intentionally cross-user — judge its queries on intent (public read OK; cross-user *write* or private-detail read NOT OK), do not blind-demand `user_id`.
- The `FederalRegulationEngine` federal-compliance stub and the `commitment-device` payment stub are DEFERRED — flag, file follow-ups, do NOT attempt to implement real federal-regulation validation or real payment processing inside this vertical.
- Reviewers are advisory; challenge a review CRITICAL that would force a regression.
