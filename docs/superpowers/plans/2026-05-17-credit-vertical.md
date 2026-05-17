# Credit Vertical Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring the Credit workflow (credit scoring, credit-builder, credit-repair, disputes, documents) to launch quality via a verify-and-polish pass and an IDOR sweep — confirm every credit sub-feature works on real data, and prove every credit/dispute/document service method that takes a resource id is user-scoped, with a cross-user regression test.

**Architecture:** Verification + IDOR-sweep vertical. The 2026-05-03 audit assigned **no findings** to the Credit domain ("already remediated" per the roadmap). This vertical does not fix a known-findings list — it *discovers and proves*. Two work types: (a) a verify-pass — open each credit/dispute/document route+service and confirm real DB/computation, no mock or stub; if a mock is found it becomes a fix; (b) an IDOR sweep — audit every Supabase `.from()` query chain in the credit/credit-builder/disputes/documents services for `.eq("user_id", …)` scoping (or a verified RLS policy), fix any unscoped query, and add a cross-user `*.idor.test.ts` for every service method that takes a resource id.

**Tech Stack:** Next.js 15 App Router, TypeScript 5.7 strict, Supabase (Postgres + RLS), Jest + ts-jest.

---

## Pre-state (verified against HEAD `50334a9` — `remediation/wave-7-foundation`)

- Branch: `remediation/wave-7-foundation` (Foundation + Payments + Investments + Financial verticals merged & pushed). AUTH-03 wrapped all 294 API routes — credit/dispute/document routes already resolve an `AuthedUser`.
- `test:idor` npm script exists (INV-1) — `jest -t idor`. This vertical reuses it; the sweep adds many `idor`-named tests.
- Full suite green at 15,652 passing / 0 failures (post-Financial).
- **Surface (verified):** ~57 credit/credit-builder/credit-repair/credit-bureau/credit-monitoring/dispute/document/tradeline API routes; ~17 service files under `src/lib/credit/`, `src/lib/credit-builder/`, `src/lib/disputes/`, `src/lib/documents/`. A mock-pattern grep over those service files found **no mocks/stubs** (the only `mock`/`placeholder` hits are a `mapToDocument` mapper and dispute-letter template placeholders — both legitimate). So the verify-pass is not expected to surface de-mock work in the service layer — but the routes still get spot-checked.
- **Scope boundary:** `src/app/api/admin/disputes/route.ts` carries FND-051 (CRITICAL) + FND-054 (HIGH) — those are assigned to **Track N / TASK-ADM-01/02**, NOT this vertical. The Credit vertical covers the *user-facing* dispute routes (`api/disputes/**`, `api/credit-repair/disputes/**`); it does **not** touch `admin/disputes`. FND-051/054 remain open under their Track-N owner — flagged here for visibility, not pulled in.

## Scope

**In scope:** verify-pass + IDOR sweep over the Credit domain — credit scoring/factors/analysis, credit-builder (loans, score, progress, recommendations, secured cards), credit-repair (cards, disputes, goodwill, negotiate, reports, impact, quick-wins), credit-bureau, credit-monitoring, the credits ledger (`api/credits/**`), user-facing disputes, and documents (incl. `tax/documents`).

**Out of scope:** `admin/disputes` (Track N); the AI/ModelRouter-bypass finding FND-061 (Track C / TASK-CMP-04); marketplace tradelines beyond a verify spot-check; mobile credit/dispute screens (Vertical 5).

**If the sweep discovers an unscoped query (a real IDOR):** fix it in the same task (add `.eq("user_id", …)` or confirm a real RLS policy), and the cross-user test becomes a genuine regression test. If everything is already scoped, the tests are confirmation evidence. Either outcome is a passing task — the deliverable is *proven* scoping.

---

## File Structure

| File | Responsibility | Touched by |
|---|---|---|
| `docs/blueprint/credit-subfeature-inventory.md` | CREATE — the vertical's mandatory sub-feature checklist + verify-pass results | CRD-1 |
| `src/lib/credit/services/*.ts`, `src/lib/credit-builder/*.ts` | IDOR sweep — confirm/fix `user_id` scoping | CRD-2 |
| `src/lib/disputes/*.ts`, `src/lib/documents/*.ts` | IDOR sweep — confirm/fix `user_id` scoping | CRD-3 |
| co-located `__tests__/*.idor.test.ts` | new cross-user tests per swept service | CRD-2, CRD-3 |
| any route/service with an unscoped query the sweep finds | fix (`.eq("user_id", …)`) | CRD-2 / CRD-3 |

---

### Task CRD-1: Credit sub-feature inventory + verify-pass

**Files:**
- Create: `docs/blueprint/credit-subfeature-inventory.md`

The roadmap mandates the first task of every vertical enumerate the workflow's complete sub-feature checklist.

- [ ] **Step 1: Enumerate.** List every credit-domain artifact: all ~57 `src/app/api/{credit*,credits,disputes,documents,tax/documents,marketplace/tradelines}/**/route.ts` routes (path + methods + auth guard), all ~17 services under `src/lib/{credit,credit-builder,disputes,documents}/`, credit/dispute/document pages and components.

- [ ] **Step 2: Verify-pass.** Group into sub-features (Credit score & factors, Credit-builder loans, Credit-builder score/progress, Secured-card recommendations, Credit-repair disputes, Goodwill letters, Creditor negotiation, Credit reports & analysis, Credit-bureau connect/import, Credit monitoring & alerts, Credits ledger, Disputes generate/send/track, Documents upload/CRUD/share, Tax documents). For EACH, open a representative route + service and confirm it returns real data (real DB query / real computation / real external call) — NOT a stub, mock, or hardcoded response. Spot-check at least 12 routes across the groups.

- [ ] **Step 3: Write the inventory** — `docs/blueprint/credit-subfeature-inventory.md`, a table: Sub-feature | Key files | Status (`WORKING` / `MOCK` / `DEGRADED — <reason>`). Be honest — if a verify-pass finds a stub/mock, mark it `MOCK` and describe it precisely; that becomes a CRD fix task (report it so the plan can be extended). Add a header explaining the doc is the vertical's before/after evidence, and note the `admin/disputes` FND-051/054 scope boundary.

- [ ] **Step 4: Commit** — `docs: TASK-CRD-1 credit sub-feature inventory + verify-pass`.

- [ ] **Step 5: Report** any `MOCK`/`DEGRADED` row found so a fix task can be appended to this plan before CRD-2.

---

### Task CRD-2: IDOR sweep — credit & credit-builder services

**Files:**
- Audit/modify: `src/lib/credit/services/CreditBuilderLoanService.ts`, `CreditScoreSimulator.ts`, `DisputeLetterGenerator.ts`, `GoodwillLetterService.ts`, `RentReportingService.ts`, `SecuredCardRecommendationService.ts`; `src/lib/credit-builder/credit-builder-service.ts`, `goal-tracker-service.ts`, `score-simulator-service.ts`
- Test: a co-located `*.idor.test.ts` per service with resource-id methods (new)

These services contain ~27 Supabase `.from()` query chains (RentReporting 6, GoodwillLetter 6, credit-builder-service 7, CreditBuilderLoan 3, SecuredCard 2, DisputeLetterGenerator 1, plus the simulator/goal-tracker services).

- [ ] **Step 1: Audit every `.from()` chain.** For each service, grep `.from(` and read each query. Classify each:
  - **Read/update/delete keyed by a resource id** (a loan id, letter id, report id, etc.) → MUST carry `.eq("user_id", …)` (the authenticated user threaded from the route) OR operate on a table with a verified RLS policy that scopes by `auth.uid()`. A query keyed only by the resource id with no `user_id` filter and no RLS = an IDOR.
  - **Insert** → must write `user_id`.
  - **List-by-user** (`.eq("user_id", userId)` already) → fine.
  Produce a short audit table in the commit body: service · method · table · scoped? (Y / Y-via-RLS / N-FIXED).

- [ ] **Step 2: Fix any unscoped query.** For each IDOR found: add the required `userId` parameter to the method (threaded from the route's `AuthedUser`) and `.eq("user_id", userId)` to the query; update callers; tsc backstops. If a query is RLS-scoped, confirm the RLS policy actually exists (check `supabase/migrations/`) — if you cannot confirm a policy, treat it as unscoped and add the explicit `.eq`.

- [ ] **Step 3: Write cross-user `*.idor.test.ts`** for every service method that takes a resource id — describe block named `idor`: present user A's resource id with user B's `userId`, assert empty/null/throw (no cross-user data). Mock Supabase. These tests are the gate's evidence whether or not Step 2 found a bug.

- [ ] **Step 4: Run** — `npm run test:idor` includes the new tests. Full suite (`npx jest --watchman=false`) 0 failures. `npx tsc --noEmit` 0 errors.

- [ ] **Step 5: Commit** — `test: TASK-CRD-2 IDOR sweep — credit & credit-builder services` (or `fix:` if Step 2 closed a real IDOR — name the finding(s) in the body).

---

### Task CRD-3: IDOR sweep — disputes & documents services

**Files:**
- Audit/modify: `src/lib/disputes/dispute-service.ts`, `dispute-service-db.ts`, `advanced-strategies.ts`; `src/lib/documents/document-service.ts`, `document-service-db.ts`, `document-categorizer.ts`, `text-extraction-service.ts`, `ocr-bridge-service.ts`
- Test: a co-located `*.idor.test.ts` per service with resource-id methods (new)

Same sweep, for the disputes and documents services. Documents are especially IDOR-sensitive — a document is user-private; `document-service-db.ts` `getDocument`/`deleteDocument`/`shareDocument` keyed only by document id would leak/destroy another user's files.

- [ ] **Step 1: Audit every `.from()` chain** in the disputes + documents services — same classification as CRD-2 Step 1. Pay special attention to `document-service-db.ts` (the `mapToDocument` path at lines ~123/170/196/363 — confirm the SELECT/DELETE/UPDATE feeding those mappers is `user_id`-scoped) and `dispute-service-db.ts`. Audit table in the commit body.

- [ ] **Step 2: Fix any unscoped query** — same approach as CRD-2 Step 2.

- [ ] **Step 3: Write cross-user `*.idor.test.ts`** for every disputes/documents service method that takes a resource id — `idor`-named describe blocks. A documents cross-user test must assert user B cannot `get`/`update`/`delete`/`share` user A's document.

- [ ] **Step 4: Run** — `npm run test:idor` green; full suite 0 failures; `npx tsc --noEmit` 0 errors.

- [ ] **Step 5: Commit** — `test: TASK-CRD-3 IDOR sweep — disputes & documents services` (or `fix:` if a real IDOR was closed).

---

## Vertical gate (Credit "done" criteria)

- `npm run test:idor` — passes; includes a cross-user test for every credit/credit-builder/disputes/documents service method that takes a resource id; overall count does not regress (and rises by the new tests).
- The CRD-2 + CRD-3 audit tables account for **every** `.from()` query chain in the swept services — each marked scoped (`.eq("user_id")` or verified RLS) or fixed.
- Any IDOR the sweep discovered is closed and has a cross-user regression test proving it.
- Full suite 0 failures; `npm run type-check` + project-wide `tsc` 0 errors.
- `BASE_REF=<vertical base> npm run test:coverage:changed` — ≥85% on every changed file's changed lines.
- CRD-1 inventory shows every credit sub-feature `WORKING` (no row left `MOCK`/`DEGRADED`); no sub-feature removed. Any mock the verify-pass found is fixed (via an appended task) before the gate passes.
- The `admin/disputes` FND-051/054 scope boundary is documented in the inventory (open under Track N — not a Credit-vertical regression).

---

## Notes for the executor

- This is a verify + sweep vertical — most tasks confirm rather than change. A task whose audit finds everything already scoped still delivers value: the cross-user tests are permanent regression evidence.
- An IDOR cross-user test must present user A's resource id under user B's identity and assert no data crosses — that is the only evidence the gate accepts.
- Before declaring a query "RLS-scoped" instead of adding an explicit `.eq("user_id")`, confirm the RLS policy genuinely exists in `supabase/migrations/` — do not assume. Migrations are known to be incomplete on this branch; if you cannot confirm a policy, add the explicit filter.
- Do not touch `admin/disputes` — it is Track N's. Do not pull FND-051/054/061 into this vertical.
- If the CRD-1 verify-pass finds a mock/stub, STOP and report it — the plan gets an appended fix task; do not silently leave a `MOCK` row or quietly fix scope creep.
- Reviewers are advisory; a review CRITICAL that would force a regression should be challenged with reasoning.
