# Investments Vertical Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Drive the Investments workflow to launch quality — close 3 CRITICAL + 3 HIGH audit findings (portfolio IDOR, analytics div-by-zero, fabricated benchmark figures, holdings DELETE TOCTOU, unvalidated request body, broken volatility math) without dropping any existing investment sub-feature.

**Architecture:** Bug-fix vertical over the existing `src/lib/investments/**` services and `src/app/api/investments/**` routes (28 routes, ~26 service files, 15 pages, 47 test files). No new subsystems — every change is a surgical correctness/security fix on shipped code. Two patterns recur: (a) explicit `user_id` scoping on Supabase query chains for IDOR closure, (b) the "honest unavailable" pattern — a service that cannot compute a real value returns `null` with a typed `dataAvailable: false` rather than a fabricated constant, and the UI shows a "data unavailable" state.

**Tech Stack:** Next.js 15 App Router, TypeScript 5.7 strict, Supabase (Postgres + RLS), Jest + ts-jest, Zod for boundary validation.

---

## Pre-state (verified — `remediation/wave-7-foundation`)

- Branch: `remediation/wave-7-foundation` (Foundation block + Payments vertical already merged; pushed).
- All API routes are auth-wrapped (AUTH-03 done) — the investments routes already resolve an `AuthedUser`. This plan threads that `user.id` into the service layer; it does NOT add auth wrappers.
- Full suite green at 15,532 passing / 0 failures (post-Payments).
- Findings sourced from `docs/ssot/gap_analysis.md` rows FND-030..035.

## Scope

**In scope — 3 CRITICAL + 3 HIGH:**

| Finding | Sev | Site | Task |
|---|---|---|---|
| FND-030 | CRITICAL | `portfolio-service.ts` `getPortfolio`/`getHoldings` omit `user_id` filter — full IDOR on holdings/P&L/risk | INV-2 |
| FND-031 | CRITICAL | `portfolio-analytics.ts` — unguarded division → `Infinity`/`NaN` in Sharpe/Sortino/Calmar/Information ratios | INV-4 |
| FND-032 | CRITICAL | `PerformanceCalculator.ts:286-300` — hardcoded `beta=1.0`, `correlation=0.85`, S&P `10%` served as real | INV-5 |
| FND-033 | HIGH | `api/investments/portfolio/analyze/route.ts` — holdings array from request body, no schema validation | INV-7 |
| FND-034 | HIGH | `api/investments/holdings/[id]/route.ts` DELETE — ownership check then delete, non-atomic (TOCTOU) | INV-3 |
| FND-035 | HIGH | `PerformanceCalculator.ts` `calculateVolatility` — `dayChange% × sqrt(period)` is not annualized stddev | INV-6 |

**Scope note on FND-033:** `gap_analysis.md` assigns FND-033 to `TASK-INV-03`, which has no card in `MASTER-IMPLEMENTATION-PLAN.md`, and the roadmap spec's Investments row does not list it. It is nonetheless a HIGH on an investments route with no other owning vertical. Per the standing "do not drop findings" instruction it is **included here** as task INV-7. Flagged explicitly so the decision is visible.

**Out of scope:** mobile investment screens (Vertical 5 — Mobile); the trading/PCTT engine (separate); any investments finding not listed above.

---

## File Structure

| File | Responsibility | Touched by |
|---|---|---|
| `docs/blueprint/investments-subfeature-inventory.md` | CREATE — the vertical's mandatory sub-feature checklist | INV-1 |
| `src/lib/investments/portfolio-service.ts` | `PortfolioServiceFacade` — add `userId` param + `.eq("user_id", …)` | INV-2 |
| `src/lib/investments/portfolio-analytics.ts` | analytics engine — guard division sites | INV-4 |
| `src/lib/investments/services/PerformanceCalculator.ts` | benchmark + volatility — replace fabricated constants; honest volatility | INV-5, INV-6 |
| `src/app/api/investments/holdings/[id]/route.ts` | holdings DELETE — atomic delete | INV-3 |
| `src/app/api/investments/portfolio/analyze/route.ts` | analyze route — Zod body validation | INV-7 |
| analytics routes that call the facade (`analytics/{performance,risk,correlation,diversification,rebalance}`, `portfolio-analysis`, `comprehensive-analysis`) | thread `user.id` into service calls | INV-2 |
| co-located `__tests__/` | new/extended tests per task | all |

Each task produces self-contained changes that pass on their own.

---

### Task INV-1: Investments sub-feature inventory

**Files:**
- Create: `docs/blueprint/investments-subfeature-inventory.md`

The roadmap mandates that the first task of every vertical enumerates the workflow's complete sub-feature checklist from the codebase, so the gate can prove nothing was dropped.

- [ ] **Step 1: Enumerate.** Grep/list every investments artifact: all 28 `src/app/api/investments/**/route.ts` routes (path + methods + which auth guard wraps each), all `src/lib/investments/**` services (file + exported entry points), all 15 `src/app/**investments**` pages, all `src/components/investments/**` + `InvestmentPortfolio.tsx` components.

- [ ] **Step 2: Write the inventory** as a markdown table — one row per sub-feature: name, files, status (`WORKING` / `DEGRADED — <finding>` / `MOCK`). Mark the rows touched by FND-030..035 as `DEGRADED`. Every other row asserts `WORKING` (spot-check the route returns real data, not a stub).

- [ ] **Step 3: Commit** — `docs: TASK-INV-1 investments sub-feature inventory`.

---

### Task INV-2: Close the portfolio IDOR (FND-030)

**Files:**
- Modify: `src/lib/investments/portfolio-service.ts` (`PortfolioServiceFacade.getPortfolio`, `.getHoldings`, and any other facade method running an unscoped query)
- Modify: each route/service that calls the facade — confirmed callers include `portfolio-analytics.ts`, `services/PerformanceCalculator.ts`, and the analytics routes under `api/investments/analytics/*`, `api/investments/portfolio-analysis`, `api/investments/comprehensive-analysis`
- Test: `src/lib/investments/__tests__/portfolio-service.idor.test.ts` (new), plus extend affected route tests

`PortfolioServiceFacade.getPortfolio(portfolioId)` runs `from("investment_portfolios").select("*").eq("id", portfolioId)` with **no `user_id` filter** — its own comment says it "rel[ies] on the database not filtering by user." `getHoldings(portfolioId)` filters only `portfolio_id`. Any authenticated user can read any user's portfolio, holdings, P&L and risk by guessing/iterating a `portfolioId`.

- [ ] **Step 1: Write the failing IDOR test** — `portfolio-service.idor.test.ts`: seed (mock) portfolio P owned by user A; call `getPortfolio(P.id, userB.id)` → expect `null` (or throw); call `getHoldings(P.id, userB.id)` → expect `[]`. Name the describe block `idor` so `npm run test:idor` picks it up.

- [ ] **Step 2: Run — expect FAIL** (current signature takes no `userId`).

- [ ] **Step 3: Change the facade.** `getPortfolio(portfolioId: string, userId: string)` → query adds `.eq("user_id", userId)`. `getHoldings(portfolioId: string, userId: string)` → add `.eq("user_id", userId)` (the `investment_holdings` table has a `user_id` column — confirmed via `transformHolding` in `holdings/[id]/route.ts`). Delete the comment block that rationalized the bypass. `userId` is a required param — no default.

- [ ] **Step 4: Thread `userId` through every caller.** `portfolio-analytics.ts` and `PerformanceCalculator.ts` call `this.portfolioService.getPortfolio(portfolioId)` — they must accept and forward a `userId`. The analytics routes (`analytics/performance`, `analytics/risk`, `analytics/correlation`, `analytics/diversification`, `analytics/rebalance`, `portfolio-analysis`, `comprehensive-analysis`) already have an `AuthedUser` from the route guard — pass `user.id` down. Read each caller before editing; do not guess the call graph — grep `getPortfolio(` and `getHoldings(` and fix every hit.

- [ ] **Step 5: Run — expect PASS.** Full suite 0 failures, `npx tsc --noEmit` 0 errors.

- [ ] **Step 6: Commit** — `fix: TASK-IDR-02 portfolio-service user-scoped — close holdings/P&L IDOR (FND-030)`.

---

### Task INV-3: Holdings DELETE atomicity (FND-034)

**Files:**
- Modify: `src/app/api/investments/holdings/[id]/route.ts` (the `DELETE` handler)
- Test: extend `src/app/api/investments/holdings/[id]/__tests__/route.test.ts`

The DELETE handler checks ownership and then deletes in two separate statements — a TOCTOU window.

- [ ] **Step 1: Write the failing test** — assert DELETE of a holding owned by another user returns 404 and removes nothing; assert DELETE of own holding returns success. If the current test asserts the two-step flow, it will need rewriting (note in commit).

- [ ] **Step 2: Run — expect FAIL** (or pass trivially — confirm the test genuinely exercises the cross-user path).

- [ ] **Step 3: Fix** — replace the check-then-delete with a single atomic statement: `from("investment_holdings").delete().eq("id", id).eq("user_id", user.id).select()`. Inspect the returned rows — empty array ⇒ the holding either does not exist or is not the caller's ⇒ return 404. Non-empty ⇒ success. One round-trip, no window.

- [ ] **Step 4: Run — expect PASS.** Full suite 0 failures, tsc 0 errors.

- [ ] **Step 5: Commit** — `fix: TASK-IDR-02 atomic holdings DELETE — close TOCTOU (FND-034)`.

---

### Task INV-4: Guard analytics division-by-zero (FND-031)

**Files:**
- Modify: `src/lib/investments/portfolio-analytics.ts`
- Test: `src/lib/investments/__tests__/portfolio-analytics.test.ts` (new or extend)

Four division sites can produce `Infinity`/`NaN` that are then served as real metrics: Sharpe `(annualizedReturn - riskFreeRate) / annualizedVolatility` (~line 114), Sortino `… / (downsideDeviation * sqrt(252))` (~line 116), Calmar `annualizedReturn / Math.abs(maxDrawdown)` (~line 121), Information ratio `alpha / trackingError` (~line 135).

- [ ] **Step 1: Write the failing tests** — for each of the four ratios, a boundary case where the denominator is `0` (zero volatility, zero downside deviation, zero max drawdown, zero tracking error). Assert the result is a finite number or `null` — never `Infinity`/`NaN`. (`Number.isFinite` is the assertion.)

- [ ] **Step 2: Run — expect FAIL.**

- [ ] **Step 3: Fix.** For each site: when the denominator is `0` (or non-finite), the ratio is undefined — return `null` (and make the metric field `number | null` in the result type) rather than `0`. `0` is a wrong, plausible-looking value; `null` is honest and the UI can render "n/a". Do NOT silently coerce to `0`. Apply the same guard consistently to all four. Verify no other division in the metrics block is unguarded — grep `/` in the computation section.

- [ ] **Step 4: Run — expect PASS.** Full suite 0 failures, tsc 0 errors (the result type changed — fix any consumer that assumed non-null).

- [ ] **Step 5: Commit** — `fix: TASK-INV-W7-01 guard analytics division-by-zero (FND-031)`.

---

### Task INV-5: Replace fabricated benchmark constants (FND-032)

**Files:**
- Modify: `src/lib/investments/services/PerformanceCalculator.ts` (`benchmarkAgainstSP500`, ~lines 270-315)
- Test: extend `PerformanceCalculator` test

`benchmarkAgainstSP500` returns `benchmarkReturnPercent = 10` (hardcoded "assume 10%"), `beta = 1.0`, `correlation = 0.85`, `trackingError = |alpha|/10` — all fabricated, all served to the user as if computed.

- [ ] **Step 1: Decide the honest output.** Real beta/correlation/benchmark return need historical S&P 500 series + covariance — not available in this codebase. Therefore the honest fix is the **"data unavailable" pattern**: `BenchmarkComparison` gains `dataAvailable: boolean`; when the real inputs are absent, `beta`/`correlation`/`benchmark_return*`/`alpha`/`tracking_error`/`information_ratio` are `null` and `dataAvailable` is `false`. The portfolio's own return (which IS computed from real data) stays populated. Confirm whether any real market-data service (`market-data-service.ts` / `MarketDataService.ts`) can supply an S&P series; if yes, compute for real instead — but do NOT invent. State which path you took in the commit body.

- [ ] **Step 2: Write the failing test** — assert `benchmarkAgainstSP500` never returns `beta === 1.0 && correlation === 0.85` as computed output; with no benchmark data, `dataAvailable === false` and the benchmark fields are `null`.

- [ ] **Step 3: Run — expect FAIL.**

- [ ] **Step 4: Implement** the chosen path. Update the `BenchmarkComparison` type. Update consumers (`analytics/performance` route, `PortfolioAnalyticsDashboard.tsx` and any other consumer) to handle `dataAvailable: false` — render "benchmark data unavailable", not `null` as a number.

- [ ] **Step 5: Run — expect PASS.** Full suite 0 failures, tsc 0 errors.

- [ ] **Step 6: Commit** — `fix: TASK-INV-W7-02 remove fabricated benchmark constants (FND-032)`.

---

### Task INV-6: Honest volatility (FND-035)

**Files:**
- Modify: `src/lib/investments/services/PerformanceCalculator.ts` (`calculateVolatility`, ~lines 133-153)
- Test: extend `PerformanceCalculator` test

`calculateVolatility` returns `Math.abs(portfolio.day_change_percent || 0) * Math.sqrt(period)` — a single day's percent change scaled by `sqrt(period)`. That is not a standard deviation of returns and is not annualized volatility; it is a fabricated number with a real-looking unit.

- [ ] **Step 1: Write the failing test** — assert `calculateVolatility` does not return `dayChangePercent × sqrt(period)`; with no historical return series available it returns the honest "unavailable" signal (see Step 2).

- [ ] **Step 2: Run — expect FAIL.**

- [ ] **Step 3: Fix** — apply the same "data unavailable" pattern as INV-5. Real volatility = annualized standard deviation of the portfolio's daily returns. If a historical daily-value/return series is genuinely available (check `portfolio-analytics.ts` `getPortfolioReturns` / market-data services — `portfolio-analytics.ts` already computes `portfolioReturns`), compute the real stddev and return it. If no series is reachable from this method, change the return type to `number | null` and return `null` with a logged warning rather than the fabricated proxy. Pick the real computation if the data is reachable — prefer truth over `null`. State the choice in the commit body.

- [ ] **Step 4: Run — expect PASS.** Full suite 0 failures, tsc 0 errors (fix consumers of the changed return type).

- [ ] **Step 5: Commit** — `fix: TASK-INV-04 honest volatility calculation (FND-035)`.

---

### Task INV-7: Validate the analyze route body (FND-033)

**Files:**
- Modify: `src/app/api/investments/portfolio/analyze/route.ts`
- Test: extend `src/app/api/investments/portfolio/analyze/__tests__/route.test.ts`

The route accepts a `holdings` array straight from the request body with no schema validation — malformed/oversized/typed-wrong input flows into the analytics engine.

- [ ] **Step 1: Write the failing tests** — a body with a non-array `holdings` → 400; a holding missing a required field (symbol/shares/cost) → 400; a holding with a negative or non-numeric `shares` → 400; a valid body → 200. Match the project's existing Zod-validation pattern (grep other routes for `z.object` / `safeParse`).

- [ ] **Step 2: Run — expect FAIL.**

- [ ] **Step 3: Fix** — define a Zod schema for the holding shape and the request body; `safeParse` at the top of the handler; on failure return 400 with a generic validation message (do not echo raw Zod internals). Cap the array length (reject absurdly large arrays — pick a sane bound, e.g. 500). Only the validated value reaches the engine.

- [ ] **Step 4: Run — expect PASS.** Full suite 0 failures, tsc 0 errors.

- [ ] **Step 5: Commit** — `fix: TASK-INV-03 schema-validate analyze route body (FND-033)`.

---

## Vertical gate (Investments "done" criteria)

- `npm run test:idor` — the two new IDOR tests (portfolio-service `getPortfolio`/`getHoldings`) pass; overall `test:idor` count does not regress.
- Every investments analytics metric is finite or explicitly `null` — no `Infinity`/`NaN`/fabricated constant reachable. Grep `PerformanceCalculator.ts` + `portfolio-analytics.ts`: no `= 1.0`/`0.85`/`= 10`-style magic returns from an analytics method.
- `git grep -nE 'beta = 1\.0|correlation = 0\.85' src/lib/investments` — clean.
- Full suite 0 failures; `npm run type-check` + project-wide `tsc` 0 errors.
- `BASE_REF=<vertical base> npm run test:coverage:changed` — ≥85% on every changed file's changed lines.
- All 6 findings (FND-030/031/032/033/034/035) closed and evidenced; the IDOR ones verified by a cross-user test.
- INV-1 inventory shows every investments sub-feature `WORKING` (no row left `DEGRADED`).
- No investment sub-feature removed — the INV-1 inventory is the before/after proof.

---

## Notes for the executor

- This is a bug-fix vertical: surgical changes only. Do not refactor adjacent code, do not restructure the service layer.
- The recurring "data unavailable" pattern (INV-5, INV-6) must be honest: a `null` + typed `dataAvailable: false`, surfaced in the UI — never a fabricated stand-in. This is the FND-032 anti-pattern; do not reintroduce it.
- `null` over `0` for an undefined ratio (INV-4): `0` is a plausible wrong answer a user would trust; `null` renders as "n/a".
- Every IDOR fix needs a cross-user test (user A's resource id presented as user B) — that is the only evidence the gate accepts.
- Reviewers are advisory; a review CRITICAL that would force a regression (e.g. throwing on a permanent condition) should be challenged with reasoning, not obeyed blindly.
