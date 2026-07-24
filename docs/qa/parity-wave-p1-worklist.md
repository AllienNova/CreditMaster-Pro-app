# Wave P1 — Shared Mock-Debt Work-List (file-level, from source recon 2026-07-24)

> Executable spec for Wave P1 of `parity-closure-plan.md`. Each item cites `file:line` from source.
> **Decisive finding: every workflow already has a REAL, authed, Supabase-backed web API — the P1
> gap is almost entirely CLIENT WIRING, not backend.** No new routes needed except rewriting one
> fabricating stub. Sequence: **P0 (mobile tsc green) must land before any mobile wiring.**

## Progress (2026-07-24)
- ✅ **Dashboard `/api/user/analytics`** — de-Math.random'd → real `credit_score_history`, zeroed fake dispute default, neutral (non-fabricated) factors (`484387c`, 11 tests).
- ✅ **AI Insights `/api/financial/ai-insights`** — de-fabricated (was healthScore=78 + fake predictions) → real `vitalityScoreService` + `spendingForecastService` (`e2071a3`, 9 tests).
- ✅ **Marketplace** — silent mock-fallbacks removed → honest empty/error states (`51375f4`, subagent, 11 tests).
- ✅ **Regression cleanup** — 9 stale admin tests (codified the removed mock-fallback + audit-spoof behavior, missed when co-located tests were updated) fixed to assert the secure behavior (`2fc1686`).
- **Gates after**: full suite 16,194 pass / 0 fail (778 suites), whole-project `tsc` 0, `lint` 0 errors.
- ✅ **Mobile Documents** — wired to real `documentApi` (list + real upload via picker), mock removed, `dashboard/documents` duplicate collapsed to a re-export, mobile `tsc` 0, 6 tests (`c336d63`).
- ✅ **Web Bills (Budgeting)** — wired to real `/api/financial/bills` (session guard, Bearer, API→Bill map, honest states), web `tsc` 0, 7 tests (`4e4344e`).

### Drive status (2026-07-24)
Parallel subagent drive (one mobile lane + one web lane) hit the **account session limit** (resets ~9:40am ET) — Documents landed, but the in-flight Notifications (mobile) + a second Bills attempt were terminated; the Bills page wiring + test were complete and I salvaged/verified/committed them. Notifications failed too early to leave any partial. Main-loop commits still work; only subagent *spawning* is blocked until the reset.

- ✅ **Notifications DATA LAYER** (`508541c`): fixed `notificationApi` (dead endpoints → real web contract: `PATCH /notifications {notificationId,action}`, `DELETE ?notificationId=`, `getAll` → `{notifications,unreadCount}`) + de-mocked `notificationStore` (dropped `__DEV__` seed). Mobile tsc 0, 42 store tests pass.
- ✅ **Notifications SCREEN + adapter DONE** (`138fb59`): `mapWebNotification` web→mobile adapter in `notificationApi.getAll` (message→body + enum collapse), screen wired to `useNotificationStore` (real data, honest states, store actions). 52 tests (adapter 4 / screen 6 / store 42). Flips Notifications to real-on-both.

### Reusable patterns established (apply to the remaining mobile screens)
1. **Cross-boundary adapter**: mobile store types have drifted from the real web API — expect field/enum divergence. Add a `mapWebX` adapter in the api-service getter (like `mapWebNotification` in `user.ts`), unit-test the map.
2. **jest RN gotcha**: the `EmptyState` component (imports `react-native-reanimated` + `react-native-svg` + `Button`) renders **undefined** under the mobile jest RN setup and poisons the whole render — use an **inline** empty state in screens that need a render test (see `app/notifications/index.tsx`). Screen tests live under `src/__tests__/screens/` (jest `roots` is `src`), import the screen via `../../../app/...`, do NOT locally mock `expo-router` (it's globally mocked in `jest.setup.js`), and prefix mock-referenced vars with `mock`.

### Remaining queue (mapped 2026-07-24 — dispatch order per lane)
- **Mobile lane**: Savings *(in flight)* → Dashboard `(tabs)/index.tsx` (drop `gamificationStore` `__DEV__` seed ~L167-178 + `dashboardStore` seed; wire spending/payday/gamification sections; credit/disputes already real) → Insights `insights/index.tsx` (wire the `financial.ts` spending-insights API; add an adapter if the type diverges) → Admin-analytics `admin/analytics.tsx` (`MOCK_DATA` L21 + `setTimeout` L57 → `GET /api/admin/analytics`).
- **Web lane**: Subscriptions *(in flight)* → Auto-save `budgeting/auto-save/page.tsx` (→ `/api/financial/savings/rules`) → Zero-based `budgeting/zero-based/page.tsx` (→ `/api/financial/budgets` + `/generate`) → Dashboard `dashboard/page.tsx` (entirely mock: `mockVitalityData`/`mockSpendingData`/… → real fetches; also its `/api/user/analytics` consumer is already de-Math.random'd).
- **Then**: P2 (mobile Credit Repair 8 screens + Billing/IAP), P3 (web-only → mobile ports), P4 (web Trading/Watchlist). Re-measure functional parity after each wave.
- **Remaining**: mobile screens (Notifications, Savings, Dashboard, Insights, Admin-analytics → real stores/APIs, drop `__DEV__` seeds); web Budgeting Subscriptions/Auto-save/Zero-based; web Dashboard page fetches; web Savings hardcoded-interest (needs product call); marketplace route-auth (public-browse?) product call.
- **Resume**: relaunch one mobile + one web implementer subagent from this list when capacity returns; each keeps its package's `tsc` green, adds tests, commits atomically, pushes with rebase-retry.

## Per-workflow tasks

### 1. Admin Analytics — Mobile M
- Web `src/app/admin/analytics/page.tsx` REAL (fetch `/api/admin/analytics?range=` L22). Mobile `mobile-app/app/admin/analytics.tsx` MOCK (`MOCK_DATA` L21-50, `setTimeout` L57, inert range selector L96-98).
- API `src/app/api/admin/analytics/route.ts` REAL (`withRole("admin")`, live queries). Residual: `topFeatures` `usage:0` hardcoded L161-167 (4 features).
- **Fix**: wire mobile screen to `GET /api/admin/analytics?range=`, render typed response, wire range selector to refetch. Optional: backfill 4 `usage:0` fields with real counts.

### 2. Marketplace — S (+ security)
- Web subpages REAL-first with SILENT mock fallback: `marketplace/tradelines/page.tsx` falls back to `mockTradelines` L350/L355; `marketplace/services/page.tsx` inits+falls back to `mockServices` L201/L226/L233. Mobile REAL (store-backed).
- **SECURITY (not mock)**: `src/app/api/marketplace/tradelines/route.ts` L10 + `providers/route.ts` L11 are bare `export async function GET` — NO auth guard. **Decide first: is marketplace browsing intended public?** If not, add `withAuth`/`withPermission`. Do NOT blindly guard — may be intentional pre-signup browse.
- **Fix**: remove silent mock fallbacks → real empty/error state. Resolve the auth question, then guard if private.

### 3. Insights — Mobile M
- Web `src/app/insights/page.tsx` REAL (`useAIInsights` → `/api/ai/insights`,`/nudges`,`/spending-analysis`). Mobile `mobile-app/app/insights/index.tsx` MOCK (`MOCK_INSIGHTS` L55, `HEALTH_SCORE` L97, fake Promise delay L193-194).
- API ×3 REAL + `withAuth`. Aside: separate `src/app/api/financial/ai-insights/route.ts` (dashboard panel) has hardcoded `predictions` L46-71 + `healthScore=78` L74.
- **Fix**: wire mobile to the same 3 routes the web hook uses. Optional: de-hardcode the separate ai-insights route.

### 4. Budgeting — L (biggest; least wired)
- Web 4 subpages PURE MOCK, zero fetch: `bills/page.tsx` `useState(MOCK_BILLS)` L121; `subscriptions/page.tsx` L177-179; `auto-save/page.tsx` L153-154; `zero-based/page.tsx` client-gen L106/L131. Mobile `budgeting/index.tsx` hardcoded stats L54-109; subpages mirror web mocks.
- API: complete DB-backed suite ALREADY BUILT + unused — `/api/financial/budgets` (+`/summary`,`/generate`,`/analyze`,`/adjust`,`/recommendations`,`/alerts`,`/rollover`,`/predict`), `/api/financial/bills` (+`/detect`,`/summary`,`/[id]`), `/api/financial/savings/subscriptions`, `/savings/rules/[id]`.
- **Fix**: wire mobile hub L54-109 → `/api/financial/budgets/summary`; each web+mobile subpage → its route (bills→`/bills`, subscriptions→`/savings/subscriptions`, auto-save→`/savings/rules`+`/savings`, zero-based→`/budgets`+`/generate`); route create/update through POST endpoints.

### 5. Notifications — Mobile M, Web S (+ contract-align)
- Web `notifications/page.tsx` REAL (`NotificationCenter`). Duplicate `dashboard/notifications/page.tsx` mock-fallback L29-74 + local-only mutations. Mobile `notifications/index.tsx` MOCK (`MOCK_NOTIFICATIONS` L25-84); real `notificationStore.ts:78` unused + has `__DEV__` seed L80-89.
- API `src/app/api/notifications/route.ts` REAL (`withAuth` + Supabase).
- **Fix**: mobile → `useNotificationStore`, delete `__DEV__` seed. **Contract mismatch to reconcile**: mobile `notificationApi` uses `PATCH /notifications/{id}/read` + `POST /notifications/read-all` + `DELETE /notifications/{id}` (`user.ts:226,231,261`) vs web route `PATCH /api/notifications {action}` + `DELETE ?notificationId=` — align one side. Web: collapse `/dashboard/notifications` duplicate into `NotificationCenter`.

### 6. Documents — Mobile M, Web S
- Web `documents/page.tsx` REAL (`DocumentLibrary`+`DocumentStats`). Duplicate `dashboard/documents/page.tsx` MOCK (fake S3 upload L96-109). Mobile `documents/index.tsx` MOCK (`DOCUMENTS` L31-80, upload button no-op L155-157).
- API `src/app/api/documents/route.ts` REAL (`withAuth`, IDOR-scoped) + `upload/route.ts` (S3). `documentApi.getAll/upload` (`user.ts:346,364`) unused.
- **Fix**: mobile list → `documentApi.getAll()`, upload button → `documentApi.upload`. Web: remove `/dashboard/documents` mock duplicate.

### 7. Savings — Mobile M, Web S
- Web `financial/savings/page.tsx` → `SavingsTracker` REAL-ish (fetch `/api/financial/dashboard` L45) but hardcoded 2%-APY interest L64-65 + ignores savings endpoint's goals/rules. Mobile `financial/savings.tsx` MOCK (`ACCOUNTS` L34-39, `GOALS` L41-60).
- API `src/app/api/financial/savings/route.ts` REAL (`withAuth`, `?type=summary|rules|goals|all`).
- **Fix**: mobile → real goals via `goalStore.fetchGoals` (`goalStore.ts:66`) + `/api/financial/savings?type=all`, balances via `dashboardStore`. Web: replace hardcoded interest L65 with real, surface goals/rules.

### 8. Dashboard analytics — Web L, Mobile M
- Web `src/app/dashboard/page.tsx` MOCK ENTIRELY (`mockVitalityData`/`mockSpendingData`/`mockPaydayData`/`mockSubscriptions` L23-65; hardcoded metrics credit 678 L464, disputes L493, savings 18% L522). Mobile `(tabs)/index.tsx` PARTIAL (credit/disputes REAL via stores; spending L63-79 / payday L82-89 / gamification L92-100 MOCK).
- API: `/api/financial/dashboard` REAL. **`src/app/api/user/analytics/route.ts` L40,43 fabricates with `Math.random()` despite `withAuth` — a STUB posing as real.** No real vitality-score aggregate.
- **Fix**: web → replace every `mock*` const with fetches (`/api/financial/dashboard` for spending/payday/subscriptions; credit+disputes endpoints; a real vitality source), **rewrite `/api/user/analytics` to query Supabase instead of Math.random**. Mobile → `dashboardStore.fetchDashboard` + `gamificationStore.fetchProgress`, drop `__DEV__` seeds (`dashboardStore.ts:57-58`, `gamificationStore.ts:167-178`).

### 8b. AI Insights Panel — `/api/financial/ai-insights` (backend de-fabrication)
Scouted 2026-07-24; real sources confirmed present. Feeds the `AIInsightsPanel` dashboard widget
(NOT the main /insights page). `withPermission("financial:read")`.
- **Fabrications**: `predictions` hardcoded (route L46-71, with a lying "generated from ML model"
  comment), `healthScore = 78` (L74), `healthTrend = "improving"` (L75). `insights` +
  `topRecommendation` are already REAL (`smartInsightsEngine.generateInsights`).
- **Panel consumes** (`src/components/financial/AIInsightsPanel.tsx`): `data.healthScore` (/100,
  L192/196), `data.healthTrend` compared to `"improving"`/`"declining"` else stable (L178-187),
  and per prediction `{metric, trend, predictedValue, timeframe, confidence, currentValue}`
  (L232-246). **Keep this response shape** so the panel is untouched.
- **Real sources** (both singletons, userId-only):
  - `vitalityScoreService.calculateVitalityScore(userId)` → `FinancialVitalityScore { overall, trend, grade, ... }`. Use `.overall` for healthScore. **Verify `.trend`'s value union** and map it to `"improving"|"declining"|"stable"`.
  - `spendingForecastService.generateForecast(userId, { months: 1, includeCategories: true })` →
    `SpendingForecast { predictions: MonthlyPrediction[], categoryForecasts: CategoryForecast[] }`.
    Build the "Monthly Spending" prediction: `predictedValue = predictions[0].predictedSpending`,
    `currentValue = Σ categoryForecasts[].currentMonthlyAvg`, `confidence =
    round(predictions[0].confidenceInterval.confidence * 100)`, `trend = map(predictions[0].trend)`
    (increasing→up, decreasing→down, else stable), `timeframe = predictions[0].monthLabel`.
    **Verify `generateForecast` reliably populates categoryForecasts** before summing.
- **Honest fallbacks**: keep the existing catch returning empty predictions + honest handling; on
  the SUCCESS path return real values (never 78/3200). Empty `predictions: []` if forecast has no data.
- **Tests**: mock `smartInsightsEngine`, `vitalityScoreService`, `spendingForecastService`; assert
  real healthScore/predictions render, the literals 78 / 3200 never appear, empty-data path, error
  path. Coverage ≥85% branch on changed lines.
- **Effort**: M (multi-service integration; 2 return-shape unknowns to verify first). NOT a quick fix.

## Cross-cutting (do alongside)
- **`__DEV__` mock seeds** in mobile `notificationStore`/`dashboardStore`/`gamificationStore` short-circuit real data in non-prod — remove.
- **Duplicate `/dashboard/*` mock pages** (web+mobile) shadow canonical real routes — consolidate/redirect.
- **Contract mismatches** mobile `notificationApi`/`documentApi` vs web routes — align before wiring.

## Execution order (dependency-aware)
1. **P0**: mobile tsc green (task #75) — blocks all mobile wiring.
2. Web-only, no product decision: Dashboard `/api/user/analytics` de-Math.random; remove marketplace silent fallbacks; web savings interest; web dashboard fetches; Budgeting web subpages.
3. Product decision then act: marketplace route auth (public-browse?).
4. Mobile wiring (after P0): Admin/Insights/Notifications/Documents/Savings/Budgeting/Dashboard screens → existing APIs + stores; drop `__DEV__` seeds.
5. Re-measure functional parity after each; commit per workflow.
