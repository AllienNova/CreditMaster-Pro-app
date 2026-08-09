# Investments Vertical Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Drive the Investments workflow to launch quality — close 2 CRITICAL + 2 HIGH still-open audit findings (portfolio IDOR, analytics div-by-zero, fabricated benchmark figures, broken volatility math, unvalidated request body) without dropping any existing investment sub-feature.

**Architecture:** Bug-fix vertical over the existing `src/lib/investments/**` services and `src/app/api/investments/**` routes (28 routes, ~26 service files, 15 pages, 47 test files). No new subsystems — every change is a surgical correctness/security fix on shipped code. Two patterns recur: (a) explicit `user_id` scoping on Supabase query chains for IDOR closure, threaded from the route's `AuthedUser`; (b) the "honest unavailable" pattern — a service that cannot compute a real value returns `null` with a typed `dataAvailable: false` rather than a fabricated constant, surfaced as a "data unavailable" UI state.

**Tech Stack:** Next.js 15 App Router, TypeScript 5.7 strict, Supabase (Postgres + RLS), Jest + ts-jest, Zod for boundary validation.

---

## Pre-state (verified against HEAD `cff3aaa` — `remediation/wave-7-foundation`)

- Branch: `remediation/wave-7-foundation` (Foundation block + Payments vertical merged & pushed). AUTH-03 completed here, so the investments routes are already auth-wrapped — verified: `withAuth` wraps `holdings/[id]/route.ts`, `portfolio/analyze/route.ts`, and the `analytics/*` routes. This plan threads the route's `user.id` into the service layer; it does **not** add auth wrappers.
- Full suite green at 15,532 passing / 0 failures (post-Payments).
- **The audit (`gap_analysis.md`, 2026-05-03) is stale relative to this branch — findings re-verified against HEAD on 2026-05-17:**

| Finding | Sev | gap_analysis claim | Verified state at HEAD | Disposition |
|---|---|---|---|---|
| FND-030 | CRITICAL | `portfolio-service.ts` `getPortfolio`/`getHoldings` omit `user_id` | **OPEN** — facade `PortfolioServiceFacade` runs unscoped queries; its own comment admits "rely on the database not filtering by user" | INV-2 |
| FND-031 | CRITICAL | `portfolio-analytics.ts` unguarded division → `Infinity`/`NaN` | **OPEN** — Sharpe/Sortino/Calmar/Information divisions unguarded | INV-3 |
| FND-032 | CRITICAL | `PerformanceCalculator.ts` hardcoded `beta=1.0`/`correlation=0.85`/S&P `10%` | **OPEN** — `benchmarkAgainstSP500` returns fabricated constants | INV-4 |
| FND-033 | HIGH | `portfolio/analyze/route.ts` holdings array, no validation | **PARTIALLY OPEN** — route is `withAuth`-wrapped and already rejects non-array / empty `holdings` (400); **per-element schema validation + array-length cap still missing** | INV-6 (rescoped) |
| FND-034 | HIGH | `holdings/[id]/route.ts` DELETE TOCTOU | **ALREADY CLOSED** — the DELETE handler is a single atomic `.delete().eq("id",id).eq("user_id",user.id).select("id")`; comment: "The WHERE clause IS the authz check." | No fix task; regression test folded into INV-2 |
| FND-035 | HIGH | `PerformanceCalculator.ts` `calculateVolatility` math wrong | **OPEN** — returns `|dayChangePercent| × sqrt(period)`, not a stddev | INV-5 |

## Scope

**In scope — 2 CRITICAL + 2 HIGH to fix + 1 CRITICAL + 1 HIGH to verify-and-test:** FND-030, 031, 032, 033, 035 (fix) and FND-034 (verify-closed + regression test).

**Scope notes (flagged for visibility, matching the plan's own standard):**
- **FND-033** is assigned in `gap_analysis.md` to `TASK-INV-03`, which has no card in `MASTER-IMPLEMENTATION-PLAN.md`, and the roadmap's Investments row omits it. It is a HIGH on an investments route with no other owning vertical — **included here** (INV-6) per the standing "do not drop findings" instruction.
- **FND-031** — `gap_analysis.md` scopes it to "Calmar/Information ratio" (counts three sites); this plan additionally guards the Sharpe and Sortino divisions in the same metrics block because they share the identical zero-denominator failure mode. Deliberate, visible scope expansion.
- **FND-034** is already remediated at HEAD. Rather than a no-op "fix" task, INV-2 adds a cross-user DELETE regression test so the closure is evidenced and protected.

**Out of scope:** mobile investment screens (Vertical 5 — Mobile); the trading/PCTT engine; `PerformanceCalculator.ts` / `AllocationAnalyzer.ts` / `PortfolioRebalanceService.ts` are **not** part of the FND-030 IDOR fix — verified: they consume the canonical `src/lib/investments/services/PortfolioService.ts`, which is already user-scoped (`constructor(userId)`, every query `.eq("user_id", this.userId)`). Do not modify them for FND-030.

---

## Verified call graph (FND-030)

```
5 analytics routes  ──new PortfolioAnalytics()──▶  PortfolioAnalytics (portfolio-analytics.ts)
  analytics/risk                                        │
  analytics/correlation                                 │ calls (unscoped)
  analytics/diversification                             ▼
  analytics/rebalance                            portfolioService  (PortfolioServiceFacade,
  analytics/performance                          singleton in portfolio-service.ts)
                                                        │
                                                        ▼  unscoped Supabase queries → IDOR
                                          investment_portfolios / investment_holdings
```

`portfolio-service.ts` (the facade) is imported by **exactly one** file: `portfolio-analytics.ts:29`. `PortfolioAnalytics` currently has **no constructor** and no `userId`. The fix adds `userId` at the `PortfolioAnalytics` constructor, forwards it to every facade call, scopes the facade queries, and passes `user.id` from the 5 routes.

## File Structure

| File | Responsibility | Touched by |
|---|---|---|
| `docs/blueprint/investments-subfeature-inventory.md` | CREATE — the vertical's mandatory sub-feature checklist | INV-1 |
| `package.json` | add `test:idor` script | INV-1 |
| `src/lib/investments/portfolio-service.ts` | `PortfolioServiceFacade` — `userId` param + `.eq("user_id", …)` on all unscoped read AND write methods | INV-2 |
| `src/lib/investments/portfolio-analytics.ts` | `PortfolioAnalytics` — `constructor(userId)`, forward to facade; guard division sites | INV-2, INV-3 |
| `src/app/api/investments/analytics/{risk,correlation,diversification,rebalance,performance}/route.ts` | `new PortfolioAnalytics(user.id)` | INV-2 |
| `src/app/api/investments/holdings/[id]/route.ts` | (no fix) cross-user DELETE regression test only | INV-2 |
| `src/lib/investments/services/PerformanceCalculator.ts` | benchmark constants + volatility — honest values | INV-4, INV-5 |
| `src/app/api/investments/portfolio/analyze/route.ts` | per-element Zod validation + length cap | INV-6 |
| co-located `__tests__/` | new/extended tests per task | all |

---

### Task INV-1: Inventory + `test:idor` script

**Files:**
- Create: `docs/blueprint/investments-subfeature-inventory.md`
- Modify: `package.json`

The roadmap mandates the first task of every vertical enumerate the workflow's complete sub-feature checklist so the gate can prove nothing was dropped. This task also creates the `test:idor` runner the gate depends on (a lightweight stand-in for the full `TASK-IDR-01` audit infrastructure, which is not built in this vertical).

- [ ] **Step 1: Add the `test:idor` npm script.** In `package.json` `scripts`, add `"test:idor": "jest -t idor"` (mirrors the existing `test:webhook-idempotency` = `jest -t 'wbh-phase2'` pattern). Verify it runs (`npm run test:idor` — exits 0 even with no matching tests yet).

- [ ] **Step 2: Enumerate.** List every investments artifact: all 28 `src/app/api/investments/**/route.ts` routes (path + methods + which auth guard wraps each), all `src/lib/investments/**` services (file + exported entry points), all 15 investments pages, all `src/components/investments/**` components.

- [ ] **Step 3: Write the inventory** — `docs/blueprint/investments-subfeature-inventory.md`, a markdown table: one row per sub-feature — name, files, status (`WORKING` / `DEGRADED — <finding>` / `MOCK`). Mark rows touched by FND-030/031/032/033/035 as `DEGRADED`; FND-034 as `WORKING (verified closed)`. Every other row asserts `WORKING` (spot-check the route/service returns real data, not a stub).

- [ ] **Step 4: Commit** — `chore: TASK-INV-1 investments inventory + test:idor script`.

---

### Task INV-2: Close the portfolio IDOR (FND-030) + FND-034 regression test

**Files:**
- Modify: `src/lib/investments/portfolio-service.ts` — `PortfolioServiceFacade`
- Modify: `src/lib/investments/portfolio-analytics.ts` — add `constructor(userId)`, forward `userId` to every facade call
- Modify: `src/app/api/investments/analytics/{risk,correlation,diversification,rebalance,performance}/route.ts` — `new PortfolioAnalytics(user.id)`
- Test: `src/lib/investments/__tests__/portfolio-service.idor.test.ts` (new); extend `src/app/api/investments/holdings/[id]/__tests__/route.test.ts`

`PortfolioServiceFacade.getPortfolio(portfolioId)` runs `from("investment_portfolios").select("*").eq("id", portfolioId)` with **no `user_id` filter** — its own comment admits it "rel[ies] on the database not filtering by user." `getHoldings`/`getPortfolioHoldings` filter only `portfolio_id`. The write methods `updatePortfolio`, `deletePortfolio`, `updateHoldingPrices` are likewise unscoped (a latent IDOR *write* — verified only the analytics path imports the facade today, so they are not currently reachable, but they are a loaded gun in the same file). `investment_holdings` has a `user_id` column (verified: `20251217000001_cpfi_financial_suite_schema.sql` — `user_id UUID REFERENCES profiles(id)`).

- [ ] **Step 1: Write the failing IDOR test** — `portfolio-service.idor.test.ts`, describe block named `idor`: mock a portfolio P owned by user A; `getPortfolio(P.id, userB.id)` → `null`; `getHoldings(P.id, userB.id)` → `[]`.

- [ ] **Step 2: Run — expect FAIL** (`getPortfolio` currently takes no `userId`).

- [ ] **Step 3: Scope the facade.** Add a required `userId: string` param to every unscoped facade method — reads `getPortfolio`, `getHoldings`, `getPortfolioHoldings` and writes `updatePortfolio`, `deletePortfolio`, `updateHoldingPrices` — and add `.eq("user_id", userId)` to each query (the holdings queries also gain `.eq("user_id", userId)`). Delete the comment block rationalizing the bypass. No default values. (`getUserPortfolios`/`getDefaultPortfolio`/`createPortfolio` already take `userId` — confirm they scope correctly; fix if not.)

- [ ] **Step 4: Thread `userId` through `PortfolioAnalytics`.** Add `constructor(private readonly userId: string)` to the `PortfolioAnalytics` class. Every method that calls `portfolioService.getPortfolio(...)` / `getHoldings(...)` / `getPortfolioHoldings(...)` forwards `this.userId`. Grep `portfolioService.` within `portfolio-analytics.ts` and fix every call site.

- [ ] **Step 5: Pass `user.id` from the 5 routes.** In `analytics/risk`, `analytics/correlation`, `analytics/diversification`, `analytics/rebalance`, `analytics/performance` — these currently do `const portfolioAnalytics = new PortfolioAnalytics()` at module scope. Move the instantiation **inside** the handler (it now needs the request's `user.id`) and call `new PortfolioAnalytics(user.id)`. Confirm each route's handler has an `AuthedUser`.

- [ ] **Step 6: FND-034 regression test.** In the holdings `[id]` route test, add an `idor`-named test: user B issues `DELETE` for user A's holding id → 404, row not deleted; user A deletes own holding → success. (The handler is already atomic — this test evidences and protects the closure.)

- [ ] **Step 7: Run — expect PASS.** `npm run test:idor` includes the new tests. Full suite 0 failures; `npx tsc --noEmit` 0 errors.

- [ ] **Step 8: Commit** — `fix: TASK-IDR-02 portfolio IDOR — user-scope facade + PortfolioAnalytics (FND-030); FND-034 regression test`.

---

### Task INV-3: Guard analytics division-by-zero (FND-031)

**Files:**
- Modify: `src/lib/investments/portfolio-analytics.ts`
- Modify: `src/lib/investments/types/advanced-analytics.types.ts` (the metrics result type — fields become nullable)
- Test: `src/lib/investments/__tests__/portfolio-analytics.test.ts` (new or extend)

Four division sites in the risk-metrics block can produce `Infinity`/`NaN` served as real metrics: Sharpe `(annualizedReturn - riskFreeRate) / annualizedVolatility` (~L114), Sortino `… / (downsideDeviation * sqrt(252))` (~L116), Calmar `annualizedReturn / Math.abs(maxDrawdown)` (~L121), Information ratio `alpha / trackingError` (~L135).

- [ ] **Step 1: Identify the consumer fan-out.** Grep every consumer of the risk-metrics result type (the type returned by `calculateRiskMetrics`, defined in `advanced-analytics.types.ts`): the `analytics/risk` route response, dashboard components (`PortfolioAnalyticsDashboard.tsx`), any test asserting `.sharpeRatio`/`.sortinoRatio`/`.calmarRatio`/`.informationRatio` is a number. List them in the task before editing.

- [ ] **Step 2: Write the failing tests** — for each of the four ratios, a boundary case with a zero denominator (zero volatility, zero downside deviation, zero max drawdown, zero tracking error). Assert the result is `null` — never `Infinity`/`NaN` (`Number.isFinite` or `=== null`).

- [ ] **Step 3: Run — expect FAIL.**

- [ ] **Step 4: Fix.** For each site: when the denominator is `0` or non-finite, the ratio is undefined — return `null`, not `0` (`0` is a plausible wrong value a user would trust). Make the four metric fields `number | null` in `advanced-analytics.types.ts`. Update every consumer from Step 1 to render `null` as "n/a" (not as a number). Grep the computation block for any other unguarded `/`.

- [ ] **Step 5: Run — expect PASS.** Full suite 0 failures; `npx tsc --noEmit` 0 errors.

- [ ] **Step 6: Commit** — `fix: TASK-INV-W7-01 guard analytics division-by-zero (FND-031)`.

---

### Task INV-4: Replace fabricated benchmark constants (FND-032)

**Files:**
- Modify: `src/lib/investments/services/PerformanceCalculator.ts` (`benchmarkAgainstSP500`, ~L270-315)
- Modify: the `BenchmarkComparison` type (locate it — likely `types/advanced-analytics.types.ts` or `types/portfolio.types.ts`)
- Test: extend the `PerformanceCalculator` test

`benchmarkAgainstSP500` returns `benchmarkReturnPercent = 10` (hardcoded "assume 10%"), `beta = 1.0`, `correlation = 0.85`, `trackingError = |alpha|/10` — all fabricated, served as computed.

- [ ] **Step 1: Decide the honest output.** Real beta/correlation/benchmark return need a historical S&P 500 series + covariance. Check whether `market-data-service.ts` / `services/MarketDataService.ts` can supply an S&P series. If yes — compute for real. If no — apply the **"data unavailable" pattern**: `BenchmarkComparison` gains `dataAvailable: boolean`; when real inputs are absent, `beta`/`correlation`/`benchmark_return*`/`alpha`/`tracking_error`/`information_ratio` are `null` and `dataAvailable` is `false`; the portfolio's own return (computed from real data) stays populated. State which path you took in the commit body. Do NOT invent constants.

- [ ] **Step 2: Identify the consumer fan-out.** Grep every consumer of `BenchmarkComparison` (`analytics/performance` route, `PortfolioAnalyticsDashboard.tsx`, tests). List them.

- [ ] **Step 3: Write the failing test** — assert `benchmarkAgainstSP500` never returns `beta === 1.0 && correlation === 0.85` as computed output; with no benchmark data, `dataAvailable === false` and the benchmark fields are `null`.

- [ ] **Step 4: Run — expect FAIL.**

- [ ] **Step 5: Implement** the chosen path; update the type and every consumer from Step 2 to handle `dataAvailable: false` (render "benchmark data unavailable", never a `null` as a number).

- [ ] **Step 6: Run — expect PASS.** Full suite 0 failures; `npx tsc --noEmit` 0 errors.

- [ ] **Step 7: Commit** — `fix: TASK-INV-W7-02 remove fabricated benchmark constants (FND-032)`.

---

### Task INV-5: Honest volatility (FND-035)

**Files:**
- Modify: `src/lib/investments/services/PerformanceCalculator.ts` (`calculateVolatility` ~L133-153, **and** `calculateSharpeRatio` ~L161+ — its consumer)
- Test: extend the `PerformanceCalculator` test

`calculateVolatility` returns `Math.abs(portfolio.day_change_percent || 0) * Math.sqrt(period)` — one day's percent change scaled by `sqrt(period)`, not a standard deviation, not annualized volatility.

- [ ] **Step 1: Map the consumers.** `calculateVolatility` is called by `calculateSharpeRatio` in the same file (`const volatility = await this.calculateVolatility(portfolioId, 252)` then `volatility / 100`). Grep for any other caller. **Changing `calculateVolatility`'s return to `number | null` will break `calculateSharpeRatio`** — `null / 100` and `volatility === 0` both mis-behave, producing a `NaN` Sharpe ratio (re-creating the FND-031 class of bug). This consumer MUST be fixed in the same task.

- [ ] **Step 2: Decide the honest output.** Real volatility = annualized standard deviation of the portfolio's daily returns. `PerformanceCalculator` has no reachable historical daily-return series (the private return-series helpers live on the separate `PortfolioAnalytics` class — not accessible here). Therefore the honest fix is the "data unavailable" pattern: `calculateVolatility` returns `number | null`, returning `null` (with a logged warning) when no real series is available. If you can genuinely reach a real daily-return series for the portfolio from this class, compute the real stddev instead — but verify reachability; do not assume.

- [ ] **Step 3: Write the failing tests** — `calculateVolatility` does not return `dayChangePercent × sqrt(period)`; with no series it returns `null`. AND: `calculateSharpeRatio` returns `null` (not `0`, not `NaN`) when volatility is `null`.

- [ ] **Step 4: Run — expect FAIL.**

- [ ] **Step 5: Fix** `calculateVolatility` (return `number | null`) AND `calculateSharpeRatio` (when volatility is `null`, Sharpe is `null`/unavailable — propagate, do not coerce to `0` or compute against `null`). Update the Sharpe return type and any consumer.

- [ ] **Step 6: Run — expect PASS.** Full suite 0 failures; `npx tsc --noEmit` 0 errors.

- [ ] **Step 7: Commit** — `fix: TASK-INV-04 honest volatility + propagate to Sharpe (FND-035)`.

---

### Task INV-6: Per-element validation on the analyze route (FND-033)

**Files:**
- Modify: `src/app/api/investments/portfolio/analyze/route.ts`
- Test: extend `src/app/api/investments/portfolio/analyze/__tests__/route.test.ts`

The route is already `withAuth`-wrapped and already rejects a missing / non-array / empty `holdings` with 400. **Missing:** per-element schema validation (each holding's fields and types) and an array-length cap. A holding with a missing `symbol`, a negative `shares`, or a non-numeric cost currently flows straight into the analytics engine.

- [ ] **Step 1: Write the failing tests** — a `holdings` array containing an element missing a required field (symbol/shares/cost) → 400; an element with negative or non-numeric `shares` → 400; an array longer than the cap → 400; a fully valid body → 200. (Do **not** add a "non-array → 400" test as the failing case — that already passes; the failing cases must be malformed *elements* and the over-length array.)

- [ ] **Step 2: Run — expect FAIL** (per-element bad data currently reaches the engine).

- [ ] **Step 3: Fix** — define a Zod schema for the holding shape and the request body; `safeParse` after the existing array check; on failure return 400 with a generic validation message (do not echo raw Zod internals). Cap the array length (reject absurdly large arrays — pick a sane bound, e.g. 500). Only the validated value reaches `analyzePortfolio`. Match the project's existing Zod pattern (grep other routes for `z.object` / `safeParse`).

- [ ] **Step 4: Run — expect PASS.** Full suite 0 failures; `npx tsc --noEmit` 0 errors.

- [ ] **Step 5: Commit** — `fix: TASK-INV-03 per-element validation on analyze route (FND-033)`.

---

## Vertical gate (Investments "done" criteria)

- `npm run test:idor` — passes; includes the portfolio-service `getPortfolio`/`getHoldings` cross-user tests and the holdings DELETE cross-user test.
- Every investments analytics metric is finite or explicitly `null` — no `Infinity`/`NaN`/fabricated constant reachable.
- `git grep -nE 'beta = 1\.0|correlation = 0\.85|benchmarkReturnPercent = 10' src/lib/investments` — clean.
- No `PortfolioAnalytics` facade call lacks a forwarded `userId`; the 5 `analytics/*` routes pass `user.id`.
- Full suite 0 failures; `npm run type-check` + project-wide `tsc` 0 errors.
- `BASE_REF=<vertical base> npm run test:coverage:changed` — ≥85% on every changed file's changed lines (note the nullable-type consumer edits in INV-3/4/5 must carry tests).
- FND-030/031/032/033/035 closed and evidenced; FND-034 evidenced by the cross-user regression test. IDOR closures verified by a cross-user test (user A's resource id presented as user B).
- INV-1 inventory shows every investments sub-feature `WORKING` — no row left `DEGRADED`; no sub-feature removed.

---

## Notes for the executor

- Bug-fix vertical: surgical changes only. Do not refactor adjacent code or restructure the service layer. `PerformanceCalculator`/`AllocationAnalyzer`/`PortfolioRebalanceService` are out of the FND-030 fix — they already use the scoped `PortfolioService`; do not touch them for the IDOR.
- The "data unavailable" pattern (INV-4, INV-5) must be honest: `null` + typed `dataAvailable: false`, surfaced in the UI — never a fabricated stand-in.
- `null` over `0` for an undefined ratio (INV-3): `0` is a plausible wrong answer a user trusts; `null` renders "n/a".
- A nullable return-type change ripples: INV-3/4/5 each include an explicit consumer-fan-out step — do it before editing, not reactively.
- INV-5 must fix `calculateSharpeRatio` in the same commit — a `null` volatility left unhandled there silently re-creates the FND-031 NaN-metric bug.
- Every IDOR fix needs a cross-user test (user A's resource id presented as user B) — the only evidence the gate accepts.
- Reviewers are advisory; a review CRITICAL that would force a regression (e.g. throwing on a permanent condition) should be challenged with reasoning, not obeyed blindly.
