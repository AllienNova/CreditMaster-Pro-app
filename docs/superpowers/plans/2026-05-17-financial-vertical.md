# Financial Management Vertical Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Drive the Financial Management workflow to launch quality — close 5 HIGH audit findings (two Plaid IDORs, a Plaid access token leaked in URLs, a date-rollover bug, an N+1 query storm) and replace the debt-API mock with real persistence — without dropping any existing financial sub-feature.

**Architecture:** Bug-fix + de-mock vertical over `src/lib/financial/**` (66 service files) and `src/app/api/financial/**` (75 routes). Recurring patterns: (a) explicit `user_id` scoping on Supabase query chains for IDOR closure, threaded from the route's `AuthedUser`; (b) secrets never travel in URLs — a Plaid access token is resolved server-side from the authenticated user, never accepted as a request parameter; (c) the debt mock is replaced with a real `debts` table + RLS + a user-scoped persistence service, matching the `processed_webhook_events` migration pattern already used on this branch.

**Tech Stack:** Next.js 15 App Router, TypeScript 5.7 strict, Supabase (Postgres + RLS), Plaid SDK, Jest + ts-jest, Zod for boundary validation.

---

## Pre-state (verified against HEAD `42aa9ea` — `remediation/wave-7-foundation`)

- Branch: `remediation/wave-7-foundation` (Foundation + Payments + Investments verticals merged & pushed).
- All API routes auth-wrapped (AUTH-03 done) — financial routes resolve an `AuthedUser`; `debt/route.ts` and `plaid/income/route.ts` are already `withAuth`/`withPermission`-wrapped. This plan threads `user.id` into the service layer and removes secret-in-URL params; it does **not** add auth wrappers.
- `test:idor` npm script exists (created by INV-1) — `jest -t idor`. This vertical reuses it; does not recreate it.
- Full suite green at 15,590 passing / 0 failures (post-Investments).
- All 5 findings re-verified against HEAD on 2026-05-17 (the `gap_analysis.md` audit is from 2026-05-03; line numbers have drifted but every finding is confirmed OPEN):

| Finding | Sev | Site (verified at HEAD) | Task |
|---|---|---|---|
| FND-036 | HIGH | `plaid-service.ts` `getTransactions(accountId, …)` — `.from("transactions").select("*").eq("account_id", accountId)`, no `user_id` filter → IDOR on transaction history | FIN-2 |
| FND-037 | HIGH | `plaid-service.ts` private `getAccessToken(itemId)` — `.from("plaid_items").select("access_token").eq("item_id", itemId)`, no `user_id` filter → IDOR on Plaid access tokens | FIN-2 |
| FND-038 | HIGH | `app/api/financial/plaid/income/route.ts` GET — `access_token` and `user_token` read from `request.nextUrl.searchParams` → Plaid secrets logged in URLs | FIN-2 |
| FND-039 | HIGH | `financial-service.ts` `getMonthlyTrend` — `setMonth(getMonth() - i)` called before `setDate(1)` → day-overflow rolls the month forward (e.g. on the 31st, Feb target → March) | FIN-3 |
| FND-040 | HIGH | `financial-service.ts` — serial `await plaidService.getTransactions(...)` inside `for (const account of accounts)` loops (multiple sites incl. `getMonthlyTrend`'s 6-month × N-account nested loop) | FIN-4 |
| MOK-03 | mock | `app/api/financial/debt/route.ts` — `getMockDebts(userId)` returns hardcoded debts ("Chase Sapphire", etc.); GET serves the mock, POST does not persist. No `debts` table exists in `supabase/migrations/`. | FIN-5 |

## Scope

**In scope:** FND-036, 037, 038, 039, 040 (fix) + MOK-03 (de-mock). No CRITICALs in this vertical.

**Scope notes (flagged for visibility):**
- **FND-039 / FND-040** are assigned in `gap_analysis.md` to `TASK-FIN-01` / `TASK-FIN-02`, which have no cards in `MASTER-IMPLEMENTATION-PLAN.md` (the roadmap calls them "orphans"). They are real HIGHs in `financial-service.ts` — included here as FIN-3 / FIN-4.
- **MOK-03** is rated "L" (large) — it requires a new DB table + migration + RLS + a persistence service, not just a route edit.

**Out of scope:** mobile financial screens (Vertical 5 — Mobile); the bill-negotiation / savings / budgeting / spending sub-domains beyond a `WORKING` spot-check in FIN-1 (no findings assigned to them); the trading/PCTT engine.

---

## File Structure

| File | Responsibility | Touched by |
|---|---|---|
| `docs/blueprint/financial-subfeature-inventory.md` | CREATE — the vertical's mandatory sub-feature checklist | FIN-1 |
| `src/lib/financial/plaid-service.ts` | `getTransactions` + `getAccessToken` user-scoped | FIN-2 |
| `src/app/api/financial/plaid/income/route.ts` | stop accepting Plaid token as a query param — resolve server-side via `itemId` | FIN-2 |
| `src/lib/financial/plaid-income-service.ts` | accept a server-resolved token, not a client-supplied one | FIN-2 |
| `src/app/api/financial/transactions/route.ts` | forward `user.id` into `getTransactions` — closes its own IDOR | FIN-2 |
| `src/lib/financial/financial-context-engine.ts`, `src/lib/financial/spending-analysis-service.ts` | forward `userId` to `getTransactions` (caller fan-out) | FIN-2 |
| `src/lib/financial/financial-service.ts` | forward `userId` to `getTransactions`; fix the `setMonth` rollover; batch the N+1 fetches | FIN-2, FIN-3, FIN-4 |
| `supabase/migrations/20260517000003_debt_accounts_table.sql` | CREATE — `debt_accounts` table + RLS | FIN-5 |
| `src/lib/financial/debt-service.ts` | CREATE — user-scoped debt persistence (CRUD) | FIN-5 |
| `src/app/api/financial/debt/route.ts` | rewire GET/POST to real persistence | FIN-5 |
| co-located `__tests__/` | new/extended tests per task | all |

---

### Task FIN-1: Financial sub-feature inventory

**Files:**
- Create: `docs/blueprint/financial-subfeature-inventory.md`

The roadmap mandates the first task of every vertical enumerate the workflow's complete sub-feature checklist so the gate can prove nothing was dropped.

- [ ] **Step 1: Enumerate.** List every financial artifact: all 75 `src/app/api/financial/**/route.ts` routes (path + methods + which auth guard wraps each), all 66 `src/lib/financial/**` service files (file + exported entry points), financial pages under `src/app/**`, financial components under `src/components/financial/**`.

- [ ] **Step 2: Write the inventory** — a markdown table grouping routes/services/components into user-facing sub-features (Accounts/Plaid linking, Transactions, Budgets, Bills, Bill negotiation, Debt, Goals, Savings, Spending analysis, Income, Health score, Tax, Dashboard/aggregation). Columns: Sub-feature | Key files | Status (`WORKING` / `DEGRADED — <finding>` / `MOCK`). Mark the rows touched by FND-036..040 as `DEGRADED` and the debt row as `MOCK — MOK-03`. Every other row asserts `WORKING` — spot-check 6-8 representative routes/services to confirm real DB queries / real computation, not stubs. Be honest: if a spot-check finds another mock, mark it `MOCK` and note it.

- [ ] **Step 3: Commit** — `docs: TASK-FIN-1 financial sub-feature inventory`.

---

### Task FIN-2: Close the Plaid IDORs + token-in-URL (FND-036, FND-037, FND-038)

**Files:**
- Modify: `src/lib/financial/plaid-service.ts` (`getTransactions`, `getAccessToken`)
- Modify: `src/app/api/financial/plaid/income/route.ts` (GET handler)
- Modify: `src/lib/financial/plaid-income-service.ts` (token source)
- Modify: the three other production callers of `getTransactions` — `src/lib/financial/financial-service.ts` (4 call sites), `src/lib/financial/financial-context-engine.ts` (~:248), `src/lib/financial/spending-analysis-service.ts` (~:362), and `src/app/api/financial/transactions/route.ts` (~:24)
- Test: `src/lib/financial/__tests__/plaid-service.idor.test.ts` (new); extend the income route test and the `transactions/route.ts` test

**Schema ground truth (already verified — do NOT re-derive from migrations).** The `supabase/migrations/` set is incomplete and `src/lib/supabase/types.ts` is a partial generated file — neither is authoritative. The authoritative evidence is `plaid-service.ts`'s own `insert`/`upsert` statements, which name the real columns. Verified:
- `transactions` HAS `user_id` (`types.ts` Row + `plaid-service.ts` transaction insert writes `user_id`).
- `plaid_items` HAS `user_id` (`storeAccessToken` inserts `{ user_id, item_id, access_token, created_at }`).
- `financial_accounts` HAS `user_id` AND `item_id` (`getAccounts` filters `.eq("user_id", …)`; the accounts upsert writes both).
So all three IDOR fixes are a **direct `.eq("user_id", userId)`** — no owning-table join is required. (If, while implementing, a query unexpectedly errors on a missing `user_id` column, STOP and escalate — do not guess — but the insert evidence says it will not.)

- [ ] **Step 1: Write the failing IDOR tests** — `plaid-service.idor.test.ts`, describe block named `idor`: mock Supabase; user A owns account/item X; `getTransactions(X, …, userB.id)` → `[]`; `getAccessToken(itemX, userB.id)` → throws "not found". Plus a `transactions/route.ts` test: user B requesting `?accountId=<A's account>` gets no data. Plus an income-route test: a request resolves only the authenticated user's own Plaid linkage.

- [ ] **Step 2: Run — expect FAIL.**

- [ ] **Step 3: Scope `getTransactions` and `getAccessToken`.** Add a required `userId: string` parameter to each and add `.eq("user_id", userId)` to each query. No default values. `getAccessToken` is `private` — its callers within `plaid-service.ts` (`syncAccounts`, the transaction-sync method, etc.) must forward the `userId` that reached the public entry point; add `userId` params to those private callers as needed.

- [ ] **Step 4: Fix FND-038 — remove the Plaid token from the URL.** `plaid/income/route.ts` GET currently reads `access_token` and `user_token` from query params. A Plaid access token is a secret; in a URL it lands in server logs, proxy logs, browser history. The route must NOT accept the secret from the client.
  - The route's **primary contract** becomes: accept an optional **non-secret `itemId`** query param. Resolve the user's items server-side via `plaidService.getAccounts(user.id)` (each `PlaidAccount` carries `itemId`) — this is the existing user→item primitive. If `itemId` is supplied, verify it is among the user's items; if omitted and the user has exactly one linked item, use it; if omitted and the user has multiple, return 400 asking for `itemId`. Then resolve the secret access token server-side via the now-scoped `getAccessToken(itemId, user.id)`.
  - For the `bank_income` path (currently needs `user_token`): resolve the user's Plaid user-token server-side the same way (from a user-scoped lookup), not from a query param. If no server-side source for the Plaid user-token exists, STOP and escalate rather than leaving it in the URL.
  - `plaid-income-service.ts` methods take the server-resolved token. Update the route doc-comment to the new contract (no `access_token`/`user_token` params documented).
  - Note: the income route's POST handler also accepts tokens in its body — a body is not URL-logged, so POST is consciously out of scope for FND-038; do not change it.

- [ ] **Step 5: Thread `userId` through every `getTransactions` caller.** Beyond `financial-service.ts`, the production callers are `financial-context-engine.ts` (~:248) and `spending-analysis-service.ts` (~:362) — both call `getTransactions` inside per-account loops with `userId` already in scope; forward it. And `transactions/route.ts` (~:24) — this route currently accepts `accountId` straight from the query string with an unused `_user`; it is **itself an IDOR surface**. Pass `user.id` into `getTransactions` there — that closes the route's IDOR as part of this fix (covered by the Step-1 route test). Grep `getTransactions(` and `getAccessToken(` and fix every production call site; tsc backstops any miss. (Note: `plaid-investments-service.ts`, `spending-analyzer.ts`, `PortfolioService.ts` define their OWN `getTransactions` — different symbols, out of scope.)

- [ ] **Step 6: Run — expect PASS.** `npm run test:idor` includes the new tests. Full suite (`npx jest --watchman=false`) 0 failures. `npx tsc --noEmit` 0 errors.

- [ ] **Step 7: Commit** — `fix: TASK-IDR-03 Plaid IDOR + token-out-of-URL (FND-036, FND-037, FND-038)`.

---

### Task FIN-3: Fix the month-rollover bug (FND-039)

**Files:**
- Modify: `src/lib/financial/financial-service.ts` (`getMonthlyTrend`, the `startDate`/`endDate` construction)
- Test: extend `src/lib/financial/__tests__/financial-service.test.ts`

`getMonthlyTrend` builds each month's range with `startDate.setMonth(startDate.getMonth() - i)` THEN `startDate.setDate(1)`. Because `new Date()` carries today's day-of-month, `setMonth` to a shorter month overflows the day and rolls the month forward — so the computed month is wrong whenever today's date exceeds the target month's last day. `endDate` is derived from the (already-wrong) `startDate`.

- [ ] **Step 1: Write the failing tests** — mock the clock (`jest.useFakeTimers().setSystemTime(...)`) to a date like Jan 31 and to Mar 31; call `getMonthlyTrend(userId, 6)`; assert each returned month's `startDate` is the 1st of the correct month and `endDate` is the last day of that same month — no month skipped, no month doubled. (This is the boundary the bug breaks.)

- [ ] **Step 2: Run — expect FAIL.**

- [ ] **Step 3: Fix** — set the day to 1 BEFORE shifting the month, or (cleaner) construct each month explicitly from year+month integers: `new Date(year, monthIndex, 1)` for `startDate` and `new Date(year, monthIndex + 1, 0)` for the last day of the month. Use the explicit-construction approach — it has no rollover hazard. Apply consistently to `startDate` and `endDate`.

- [ ] **Step 4: Run — expect PASS.** Full suite 0 failures; `npx tsc --noEmit` 0 errors.

- [ ] **Step 5: Commit** — `fix: TASK-FIN-01 month-rollover bug in getMonthlyTrend (FND-039)`.

---

### Task FIN-4: Eliminate the N+1 Plaid query storm (FND-040)

**Files:**
- Modify: `src/lib/financial/financial-service.ts` (the `for (const account of accounts) { await getTransactions(...) }` sites)
- Possibly modify: `src/lib/financial/plaid-service.ts` (add a batched multi-account query — see Step 2)
- Test: extend `financial-service.test.ts`

`financial-service.ts` fetches transactions one account at a time in serial `await` loops; `getMonthlyTrend` nests that inside a 6-month loop — 6 × N sequential DB round-trips.

**Sequencing:** FIN-4 depends on FIN-2 — `getTransactions` gains a `userId` param in FIN-2. Do FIN-2 first.

- [ ] **Step 1: Write the failing/asserting test** — a test that, with a mocked `plaidService`, asserts the number of `getTransactions` calls (or DB round-trips) for an N-account / M-month scenario is bounded — not `N × M`. (Use a call-count spy.) This test pins the fix.

- [ ] **Step 2: Fix.** Two acceptable approaches — pick the cleaner one and state it in the commit body:
  - **(preferred) Batched query:** add `getTransactionsForAccounts(accountIds: string[], start, end, userId)` to `plaid-service.ts` — a single `.from("transactions").select("*").in("account_id", accountIds).eq("user_id", userId)…` round trip — and have `financial-service.ts` call it once per month (or once total, then partition by month in memory).
  - **(fallback) Parallelize:** replace the serial `for` loop with `Promise.all(accounts.map(a => getTransactions(a.accountId, …, userId)))`.
  The batched query is preferred (one round trip, not N). Keep the user-scoping from FIN-2 intact in either approach.

- [ ] **Step 3: Run — expect PASS** (call count bounded). Full suite 0 failures; `npx tsc --noEmit` 0 errors.

- [ ] **Step 4: Commit** — `perf: TASK-FIN-02 batch N+1 Plaid transaction fetches (FND-040)`.

---

### Task FIN-5: Real debt persistence (MOK-03)

**Files:**
- Create: `supabase/migrations/20260517000003_debt_accounts_table.sql`
- Create: `src/lib/financial/debt-service.ts`
- Modify: `src/app/api/financial/debt/route.ts`
- Test: `src/lib/financial/__tests__/debt-service.test.ts` (new); rewrite `src/app/api/financial/debt/__tests__/route.test.ts`

`debt/route.ts` serves `getMockDebts(userId)` — hardcoded "Chase Sapphire" / "Capital One" / "Discover" debts — and POST does not persist. No debt table exists in `supabase/migrations/`.

**Table name decision:** name the table **`debt_accounts`** — the GDPR erasure RPC (`supabase/migrations/20260401000000_gdpr_erasure_rpc.sql:44`) already references `debt_accounts` in its cascade-delete list. Using that name means the new table is automatically covered by GDPR erasure; inventing a `debts` name would leave it dangling outside the cascade.

- [ ] **Step 1: Create the migration** — `supabase/migrations/20260517000003_debt_accounts_table.sql` (timestamp `20260517000003` — the next free slot after the three existing `20260517*` migrations). `debt_accounts` table, columns matching the existing `Debt` type the mock returns (`id` uuid pk default `gen_random_uuid()`, `user_id` uuid not null references `profiles(id)` on delete cascade, `name` text, `type` text, `balance` numeric, `original_balance` numeric, `interest_rate` numeric, `minimum_payment` numeric, `due_date` date, `creditor_name` text, `is_active` boolean default true, `created_at` timestamptz default now(), `updated_at` timestamptz default now()). Enable RLS; policy scoping every operation to `auth.uid() = user_id`. Index on `user_id`. Follow the style of `20260517000000_processed_webhook_events.sql`.

- [ ] **Step 2: Write the failing test** — `debt-service.test.ts`: `listDebts(userId)` returns only that user's rows; `createDebt(userId, input)` persists and returns the row; `updateDebt` / `deleteDebt` are user-scoped (a cross-user id → no-op / not-found). Include an `idor`-named test (cross-user access → empty/not-found) so `npm run test:idor` covers it.

- [ ] **Step 3: Run — expect FAIL.**

- [ ] **Step 4: Implement `debt-service.ts`** — a user-scoped CRUD service over `debt_accounts`: `listDebts(userId)`, `createDebt(userId, input)`, `updateDebt(debtId, userId, patch)`, `deleteDebt(debtId, userId)`. Every query carries `.eq("user_id", userId)`. Validate inputs (Zod) at the service or route boundary. (Implement all four methods even though the routes use only list+create today — the service is the persistence layer and `update`/`delete` belong to a coherent CRUD service; they are exercised by the Step-2 tests.)

- [ ] **Step 5: Rewire `debt/route.ts`.** GET → `debtService.listDebts(user.id)`; POST → `debtService.createDebt(user.id, validatedBody)`. Delete `getMockDebts` entirely. **Do NOT create `debt/[id]/route.ts`** — the only consumer of `/api/financial/debt` is `src/components/financial/DebtPayoffPlanner.tsx`, which issues GET only (no PATCH/DELETE); the other debt component, `DebtManagement.tsx`, does not call this endpoint at all. Adding PATCH/DELETE routes would be unused surface (YAGNI). Note this decision in the commit body.

- [ ] **Step 6: Rewrite the route test** — the old `debt/route.ts` test asserted the mock's shape (`"Chase Sapphire"` etc.). That encoded the mock. Rewrite it to assert the real contract: GET returns the persistence-layer result; POST persists. Mock `debt-service.ts`, not the DB. Flag the rewrite in the commit body (requirements changed: mock → real).

- [ ] **Step 7: Run — expect PASS.** Full suite 0 failures; `npx tsc --noEmit` 0 errors. `git grep -n "getMockDebts\|Chase Sapphire" src/` — clean.

- [ ] **Step 8: Commit** — `feat: TASK-MOK-03 real debt persistence — debt_accounts table + debt-service (MOK-03)`.

---

## Vertical gate (Financial "done" criteria)

- `npm run test:idor` — passes; includes the `plaid-service` `getTransactions`/`getAccessToken` cross-user tests and the debt-service cross-user test; overall count does not regress.
- `git grep -n "getMockDebts\|Chase Sapphire" src/` — clean (the debt mock fully removed).
- No Plaid access token is read from a request URL/query param — `grep` `plaid/income/route.ts` and any sibling Plaid route for `searchParams.get("access_token")` / `"user_token"` → none remain (a non-secret `itemId` param is acceptable).
- `getTransactions` / `getAccessToken` — every call site forwards a real `userId`; no unscoped query remains in `plaid-service.ts`.
- `getMonthlyTrend` returns correct month boundaries on month-end clock dates (Jan 31, Mar 31) — proven by test.
- The N+1 is gone — transaction fetches for N accounts are bounded, not `N`-serial (or `N×M`) — proven by a call-count test.
- Full suite 0 failures; `npm run type-check` + project-wide `tsc` 0 errors.
- `BASE_REF=<vertical base> npm run test:coverage:changed` — ≥85% on every changed file's changed lines.
- FND-036/037/038/039/040 closed and evidenced; MOK-03's debt CRUD persisted and IDOR-tested.
- FIN-1 inventory shows every financial sub-feature `WORKING` (no row left `DEGRADED`/`MOCK`); no sub-feature removed.

---

## Notes for the executor

- Bug-fix + de-mock vertical: surgical changes. Do not refactor adjacent financial services.
- A Plaid access token is a secret — it never belongs in a URL, a query param, or a log line. The server resolves it from the authenticated user; the client supplies only non-secret identifiers.
- Every IDOR fix needs a cross-user test (user A's resource id presented as user B) — the only evidence the gate accepts.
- Schema ground truth: `supabase/migrations/` is incomplete and `src/lib/supabase/types.ts` is partial — neither is authoritative. The real columns are evidenced by the services' own `insert`/`upsert` statements. FIN-2 already states the verified result (`transactions`/`plaid_items`/`financial_accounts` all carry `user_id`). If a query unexpectedly errors on a missing column at runtime, STOP and escalate — do not guess a fallback.
- FIN-4 depends on FIN-2 (the `getTransactions` signature changes in FIN-2). Execute FIN-2 → FIN-3 → FIN-4 → FIN-5 (FIN-3 is independent and can slot anywhere after FIN-1).
- The debt-API test rewrite (FIN-5 Step 6) is a deliberate spec change (mock → real) — flag it; do not silently weaken.
- Reviewers are advisory; a review CRITICAL that would force a regression should be challenged with reasoning, not obeyed blindly.
