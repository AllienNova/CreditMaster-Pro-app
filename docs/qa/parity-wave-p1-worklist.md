# Wave P1 — Shared Mock-Debt Work-List (file-level, from source recon 2026-07-24)

> Executable spec for Wave P1 of `parity-closure-plan.md`. Each item cites `file:line` from source.
> **Decisive finding: every workflow already has a REAL, authed, Supabase-backed web API — the P1
> gap is almost entirely CLIENT WIRING, not backend.** No new routes needed except rewriting one
> fabricating stub. Sequence: **P0 (mobile tsc green) must land before any mobile wiring.**

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
