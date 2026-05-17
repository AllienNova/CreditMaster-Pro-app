# Credit Vertical Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring the Credit workflow (credit scoring/builder/repair, disputes, documents, credits ledger) to launch quality — replace the non-persistent in-memory disputes & documents stores with real DB persistence, and run an IDOR sweep that proves every credit/dispute/document service query is user-scoped, closing the unscoped queries it finds.

**Architecture:** De-mock + IDOR-sweep vertical. The 2026-05-03 audit assigned **no findings** to the Credit domain — but "no findings" means "not audited", not "clean": discovery (below) found that `api/disputes/**` and `api/documents/**` are wired to **process-local `Map`-backed** services (`dispute-service.ts`, `document-service.ts`) that lose all data on every serverless cold start — an FND-047-class persistence bug, severe for a credit-repair product where a dropped dispute is a lost FCRA record. DB-backed siblings (`dispute-service-db.ts`, `document-service-db.ts`) and real `disputes`/`documents` tables already exist; the routes were simply never re-wired. Discovery also found unscoped IDOR queries in the credit services (`CreditBuilderLoanService.updateApplication`, `RentReportingService.updateAccount`/`getPaymentHistory` — service-role client, keyed only by resource id). This vertical: (1) inventory + persistence-aware verify-pass; (2) IDOR sweep of the credit/credit-builder/credits services, fixing the unscoped queries; (3) de-mock disputes onto the DB service; (4) de-mock documents onto the DB service.

**Tech Stack:** Next.js 15 App Router, TypeScript 5.7 strict, Supabase (Postgres + RLS), Jest + ts-jest.

---

## Pre-state (verified against HEAD `50334a9` — `remediation/wave-7-foundation`)

- Branch: `remediation/wave-7-foundation` (Foundation + Payments + Investments + Financial verticals merged & pushed). AUTH-03 wrapped all 294 API routes — credit/dispute/document routes already resolve an `AuthedUser`.
- `test:idor` npm script exists — `jest -t idor`. This vertical reuses it.
- Full suite green at 15,652 passing / 0 failures (post-Financial).
- **Discovery (verified at HEAD — corrects the roadmap's "verify-pass only" billing):**
  - `api/disputes/route.ts:3`, `disputes/[id]/route.ts:10`, `disputes/[id]/send/route.ts:8`, `disputes/stats/route.ts:8` all import `disputeService` from `@/lib/disputes/dispute-service` — the **in-memory** service (`dispute-service.ts:87` `private disputes: Map`). Its DB-backed sibling `dispute-service-db.ts` (`DisputeServiceDB`) is **not wired to any route**. A third service `src/lib/credit-repair/dispute-service.ts` is used by the credit-repair disputes route — CRD-1 must map all three and CRD-3 reconciles them.
  - `api/documents/route.ts:2`, `documents/upload/route.ts:2`, `documents/share/route.ts:2` import `documentService` from `@/lib/documents/document-service` — the **in-memory** service (`document-service.ts:60` `private documents: Map`, `:374` `private shareLinks: Map`). Its DB-backed sibling `document-service-db.ts` is **not wired**.
  - `disputes` and `documents` tables exist in `src/lib/supabase/types.ts` (lines 65, 109) — the DB services have real tables to target.
  - Unscoped IDOR queries verified: `CreditBuilderLoanService.updateApplication` (`.eq("id", applicationId)` only), `RentReportingService.updateAccount` / `getPaymentHistory` (keyed on `account_id` only). These services build their Supabase client with `SUPABASE_SERVICE_ROLE_KEY` (`CreditBuilderLoanService.ts:685`, `RentReportingService.ts:635`, `GoodwillLetterService.ts:775`, `SecuredCardRecommendationService.ts:612`) — **the service-role key bypasses RLS**, so an explicit `.eq("user_id", …)` is the ONLY defense.
- **No FND-* is assigned to the Credit domain.** Verified against `gap_analysis.md`: the only credit/dispute/document findings are FND-051/054 (`admin/disputes/route.ts` — Track N), FND-058 (GDPR cascade RPC — Track C), FND-061 (ModelRouter bypass — Track C). None is this vertical's. The persistence + IDOR work below is *discovered*, not from the register.
- **Scope boundary:** `admin/disputes/route.ts` (FND-051/054 — Track N) is **out of scope**. AUTH-03 already closed FND-051's "zero auth" part (`admin/disputes` is now `withRole("admin")`-wrapped); the remaining mass-assignment is Track N / TASK-ADM-02. Do not touch `admin/disputes`.

## Scope

**In scope:** persistence-aware verify-pass of the whole Credit domain; IDOR sweep + fixes of `src/lib/credit/`, `src/lib/credit-builder/`, `src/lib/credits/`; de-mock of `api/disputes/**` and `api/documents/**` onto DB-backed persistence with an IDOR sweep of those DB services.

**Out of scope:** `admin/disputes` (Track N); FND-061 ModelRouter bypass (Track C); mobile credit/dispute screens (Vertical 5); `marketplace/tradelines` (a CRD-1 verify spot-check only — not swept, not de-mocked).

---

## File Structure

| File | Responsibility | Touched by |
|---|---|---|
| `docs/blueprint/credit-subfeature-inventory.md` | CREATE — sub-feature checklist + persistence-aware verify-pass | CRD-1 |
| `src/lib/credit/services/*.ts`, `src/lib/credit-builder/*.ts`, `src/lib/credits/*.ts` | IDOR sweep — fix unscoped queries; add `userId` scoping | CRD-2 |
| `src/lib/disputes/dispute-service-db.ts` | become canonical; gain any method the routes need; IDOR-scoped | CRD-3 |
| `src/app/api/disputes/**/route.ts` | re-wire to the DB service; async-migrate handlers | CRD-3 |
| `src/lib/disputes/dispute-service.ts` (in-memory) | retire / delete after re-wire | CRD-3 |
| `src/lib/documents/document-service-db.ts` | become canonical; share-link persistence; IDOR-scoped | CRD-4 |
| `src/app/api/documents/**/route.ts` | re-wire to the DB service; async-migrate handlers | CRD-4 |
| `src/lib/documents/document-service.ts` (in-memory) | retire / delete after re-wire | CRD-4 |
| co-located `__tests__/*.idor.test.ts` | new cross-user tests per swept/de-mocked service | CRD-2, CRD-3, CRD-4 |

---

### Task CRD-1: Credit inventory + persistence-aware verify-pass

**Files:** Create `docs/blueprint/credit-subfeature-inventory.md`

- [ ] **Step 1: Enumerate.** All ~57 `src/app/api/{credit*,credits,disputes,documents,tax/documents,marketplace/tradelines}/**/route.ts` routes (path + methods + auth guard); all services under `src/lib/{credit,credit-builder,credits,disputes,documents}/`; credit/dispute/document pages and components. **Map the three dispute services** (`disputes/dispute-service.ts`, `disputes/dispute-service-db.ts`, `credit-repair/dispute-service.ts`) and the two document services — note which routes wire which.

- [ ] **Step 2: Persistence-aware verify-pass.** Group into sub-features. For each, open a representative route + service and judge: does it run on **real persistence** (a real Supabase table) and real computation? A service backed by a process-local `Map`/array is **`DEGRADED — non-persistent`**, NOT `WORKING` — an in-memory store is a structural mock even though it contains no hardcoded literals. Spot-check ≥12 routes.

- [ ] **Step 3: Write the inventory** — `docs/blueprint/credit-subfeature-inventory.md`: Sub-feature | Key files | Status (`WORKING` / `DEGRADED — <reason>` / `MOCK`). Disputes and Documents are expected `DEGRADED — non-persistent (in-memory Map)`. Note the `admin/disputes` Track-N boundary. Header explains the doc is the vertical's before/after evidence.

- [ ] **Step 4: Commit** — `docs: TASK-CRD-1 credit inventory + persistence-aware verify-pass`.

- [ ] **Step 5: Report** every `DEGRADED`/`MOCK` row. If the verify-pass finds a degraded sub-feature beyond disputes/documents (already covered by CRD-3/CRD-4) and the credit-service IDORs (CRD-2), STOP and report so a task can be appended.

---

### Task CRD-2: IDOR sweep + fix — credit, credit-builder & credits services

**Files:**
- Audit/fix: `src/lib/credit/services/{CreditBuilderLoanService,CreditScoreSimulator,DisputeLetterGenerator,GoodwillLetterService,RentReportingService,SecuredCardRecommendationService}.ts`; `src/lib/credit-builder/{credit-builder-service,goal-tracker-service,score-simulator-service}.ts`; `src/lib/credits/*.ts` (the credits ledger — `credit-service.ts` etc., the surface behind `api/credits/{balance,history,purchase}`)
- Test: a co-located `*.idor.test.ts` per service with resource-id methods (new)

- [ ] **Step 1: Audit every `.from()` chain.** For each service, read each query and classify: read/update/delete keyed by a resource id → MUST carry `.eq("user_id", …)`; insert → must write `user_id`; list-by-user → already scoped. **Service-role caveat:** `RentReportingService`, `GoodwillLetterService`, `SecuredCardRecommendationService`, `CreditBuilderLoanService` build their client with `SUPABASE_SERVICE_ROLE_KEY` — the service-role key **bypasses RLS**. For these four, a `Y-via-RLS` classification is FORBIDDEN — every resource-keyed query needs an explicit `.eq("user_id", …)` or it is an IDOR. (For the other services, `Y-via-RLS` is allowed only if you confirm the RLS policy exists in `supabase/migrations/`.) Produce an audit table in the commit body: service · method · table · scoped? (Y / Y-via-RLS / N-FIXED).

- [ ] **Step 2: Fix the unscoped queries.** Known targets confirmed during planning — fix at minimum these: `CreditBuilderLoanService.updateApplication` (`.eq("id", applicationId)` → add `.eq("user_id", userId)`), `RentReportingService.updateAccount` and `getPaymentHistory` (keyed on `account_id`/`id` only → add `user_id` scoping). For each: add a required `userId` param threaded from the route's `AuthedUser`, add `.eq("user_id", userId)`, update callers (tsc backstops). Fix any further unscoped query the Step-1 audit surfaces.

- [ ] **Step 3: Cross-user `*.idor.test.ts`** for every service method that takes a resource id — `idor`-named describe blocks; user A's resource id under user B's `userId` → empty/null/throw. Mock Supabase.

- [ ] **Step 4: Run** — `npm run test:idor` green; full suite (`npx jest --watchman=false`) 0 failures; `npx tsc --noEmit` 0 errors.

- [ ] **Step 5: Commit** — `fix: TASK-CRD-2 IDOR sweep — credit/credit-builder/credits services (close updateApplication + rent-reporting IDORs)`.

---

### Task CRD-3: De-mock disputes onto DB persistence + IDOR sweep

**Files:**
- Modify: `src/lib/disputes/dispute-service-db.ts` (canonical), `src/app/api/disputes/{route,[id]/route,[id]/send/route,stats/route}.ts`; reconcile `src/lib/credit-repair/dispute-service.ts`
- Delete/retire: `src/lib/disputes/dispute-service.ts` (in-memory)
- Test: `dispute-service-db` test + `*.idor.test.ts`; rewrite the affected route tests

The `api/disputes/**` routes use the in-memory `dispute-service.ts` (`Map`-backed) — disputes vanish on every serverless cold start. A dispute is a legally meaningful FCRA record; this is a launch blocker.

- [ ] **Step 1: Method-parity audit.** List every `disputeService.*` method the four `api/disputes` routes call. Check `dispute-service-db.ts` (`DisputeServiceDB`) has each. Note gaps. Also determine the role of `credit-repair/dispute-service.ts` (a third service) — is it a duplicate, or a distinct credit-repair-specific store? Report which routes use it and whether it too needs de-mocking (if it is also in-memory and route-wired, fold its de-mock in; if it is DB-backed or unused, note and leave).

- [ ] **Step 2: Write failing tests** — for each `api/disputes` route, a test asserting it persists via the DB service (create a dispute, read it back through a fresh service instance — proving it survives, which an in-memory `Map` cannot). Plus `idor`-named cross-user tests on `dispute-service-db`'s resource-id methods.

- [ ] **Step 3: Run — expect FAIL.**

- [ ] **Step 4: Implement.** Fill any `dispute-service-db.ts` method gap from Step 1 (every query `user_id`-scoped — verify `disputes.user_id` in `types.ts`). Re-wire the four `api/disputes` routes to import `dispute-service-db`'s service; the DB service is async — `await` every call and make handlers async. Delete `dispute-service.ts` (the in-memory one) once no route imports it (grep to confirm). IDOR-scope every `dispute-service-db` query.

- [ ] **Step 5: Run — expect PASS.** `npm run test:idor` green; full suite 0 failures; `npx tsc --noEmit` 0 errors. `git grep -n "disputes/dispute-service\b" src/` — no production import of the in-memory service remains.

- [ ] **Step 6: Commit** — `fix: TASK-CRD-3 de-mock disputes onto DB persistence + IDOR scoping`.

---

### Task CRD-4: De-mock documents onto DB persistence + IDOR sweep

**Files:**
- Modify: `src/lib/documents/document-service-db.ts` (canonical), `src/app/api/documents/{route,upload/route,share/route}.ts`
- Delete/retire: `src/lib/documents/document-service.ts` (in-memory)
- Test: `document-service-db` test + `*.idor.test.ts`; rewrite the affected route tests

The `api/documents/**` routes use the in-memory `document-service.ts` (`Map`-backed documents AND share-links) — uploaded documents and share links vanish on cold start.

- [ ] **Step 1: Method-parity audit.** List every `documentService.*` method the three `api/documents` routes call (incl. share-link creation — `document-service.ts:379` `createShareLink`). Check `document-service-db.ts` has each; note gaps. Share links are in-memory in the current service — the DB version needs a persisted share-link path (a `document_shares` table, or share metadata on the `documents` row — verify what exists in `types.ts`/migrations; if neither, add a migration for share-link persistence).

- [ ] **Step 2: Write failing tests** — each `api/documents` route persists via the DB service (upload a document, read it back through a fresh instance); `idor`-named cross-user tests — user B cannot `get`/`update`/`delete`/`share` user A's document.

- [ ] **Step 3: Run — expect FAIL.**

- [ ] **Step 4: Implement.** Fill `document-service-db.ts` method gaps (every query `user_id`-scoped — verify `documents.user_id` in `types.ts`). If share-link persistence needs a table, add `supabase/migrations/20260517000004_document_shares.sql` (RLS scoped to owner). Re-wire the three `api/documents` routes to the DB service; async-migrate handlers. Delete `document-service.ts` (in-memory) once unimported. IDOR-scope every query.

- [ ] **Step 5: Run — expect PASS.** `npm run test:idor` green; full suite 0 failures; `npx tsc --noEmit` 0 errors. `git grep -n "documents/document-service\b" src/` — no production import of the in-memory service remains.

- [ ] **Step 6: Commit** — `fix: TASK-CRD-4 de-mock documents onto DB persistence + IDOR scoping`.

---

## Vertical gate (Credit "done" criteria)

- `npm run test:idor` — passes; includes a cross-user test for every credit/credit-builder/credits/disputes/documents service method that takes a resource id; count does not regress.
- The CRD-2 audit table accounts for every `.from()` chain in the swept services; every unscoped query found is fixed (`CreditBuilderLoanService.updateApplication` + the `RentReportingService` IDORs at minimum).
- `api/disputes/**` and `api/documents/**` persist to real DB tables — no production route imports `disputes/dispute-service.ts` or `documents/document-service.ts` (the in-memory services); both deleted. Proven by `git grep`.
- Full suite 0 failures; `npm run type-check` + project-wide `tsc` 0 errors.
- `BASE_REF=<vertical base> npm run test:coverage:changed` — ≥85% on every changed file's changed lines.
- CRD-1 inventory shows every credit sub-feature `WORKING` at close (Disputes and Documents flip `DEGRADED → WORKING` once CRD-3/CRD-4 land); no sub-feature removed.
- The `admin/disputes` FND-051/054 boundary is documented in the inventory (open under Track N — not a Credit-vertical regression).

---

## Notes for the executor

- This vertical de-mocks two persistence layers and sweeps for IDOR — it is real `fix:` work, not a verify pass. The roadmap's "already remediated" billing was wrong; "no findings" meant the domain was never audited.
- An in-memory `Map`/array behind a route is a structural mock — judge persistence, not just hardcoded literals.
- Service-role-key services (`RentReporting`, `Goodwill`, `SecuredCard`, `CreditBuilderLoan`) bypass RLS — every resource-keyed query needs an explicit `.eq("user_id", …)`; the RLS escape hatch does not apply to them.
- Every IDOR fix needs a cross-user test (user A's resource id under user B) — the only evidence the gate accepts.
- Verify a table/column exists in `types.ts` (and an RLS policy in `supabase/migrations/`) before relying on it — migrations are incomplete on this branch.
- Before deleting an in-memory service, `git grep` to confirm no production code still imports it; update/retire its tests in the same commit.
- CRD-3 → CRD-4 are independent of each other; both depend on CRD-1. CRD-2 is independent. Order: CRD-1 → CRD-2 → CRD-3 → CRD-4.
- Do not touch `admin/disputes`. Reviewers are advisory; challenge a review CRITICAL that would force a regression.
