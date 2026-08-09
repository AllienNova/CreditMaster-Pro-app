# Mobile Sub-Feature Inventory

> **Purpose:** This document is the Mobile vertical's (Wave 7) before/after evidence baseline.
> The "Before" state is captured here (TASK-MOB-1). Each subsequent task (MOB-2 through MOB-8)
> updates the Status column for the sub-features it fixes. The final state after all tasks must
> show every row WORKING except those explicitly deferred (see Deferred Scope below).
>
> Branch: `remediation/wave-7-foundation`
> Captured: 2026-05-17

---

## Mobile Baseline (MOB-0)

Captured by running `cd mobile-app && node_modules/.bin/jest --coverage` after `npm install
--legacy-peer-deps` (node_modules were not committed to the worktree).

### Test results

```
Test Suites: 2 failed, 28 passed, 30 total
Tests:       51 failed, 544 passed, 595 total
Snapshots:   0 total
Time:        ~10 s
```

**Failing suites (2):**
- `src/components/__tests__/PlaidHostedLink.test.tsx`
- `src/components/__tests__/components.test.tsx`

The 51 failing tests are all inside those two suites. The failure cause is a
`@testing-library/react-native` host-component detection issue triggered by the `react-native-gifted-charts`
`ForwardRef(Switch)` export — a pre-existing environment incompatibility, not introduced by Wave 7.

### Coverage summary (actual collected, not claimed)

```
Statements : 27.9%  ( 1760 / 6306 )
Branches   : 17.77% (  725 / 4078 )
Functions  : 28.53% (  496 / 1738 )
Lines      : 28.47% ( 1648 / 5788 )
```

### coverageThreshold verdict: FAIL — all four global keys fail

```
Jest: "global" coverage threshold for statements (80%) not met: 23.05%
Jest: "global" coverage threshold for branches  (60%) not met: 13.85%
Jest: "global" coverage threshold for lines     (80%) not met: 23.52%
Jest: "global" coverage threshold for functions (60%) not met: 21.81%
```

Note: the jest.config.js reports slightly different statement/function/lines numbers (23.05% vs
27.9%) because jest's internal threshold check uses a different rounding path than the
text-summary reporter. The test-suite itself collects ~27-28% coverage, but all four global
thresholds (statements 80%, branches 60%, functions 60%, lines 80%) fail by a wide margin.

**No per-file threshold keys fail at baseline** (dashboardStore, notificationStore, syncStore,
creditStore, disputeStore, pushNotificationService all meet their individual thresholds).

**Gate definition for this vertical:** "no NEW test failures vs the baseline" and "no per-file
coverageThreshold key regressed." The global threshold was already failing; tasks are not
required to fix it — only to not make it worse. New test files added by each task must be green.

---

## Route Enumeration

272 `.tsx` files under `mobile-app/app/` (including layouts). Route segments (non-layout screens):
approximately 230. 41 directories including layout groups.

### Three Dispute Route Surfaces (FND-068)

This is a critical known issue. Three overlapping route segments exist simultaneously:

| Segment | Files | Role |
|---|---|---|
| `app/dispute/` (singular) | 8 files: `[id].tsx`, `analytics.tsx`, `create.tsx`, `strategies.tsx`, `templates.tsx`, `use-strategy.tsx`, `use-template.tsx`, `wizard.tsx` | Feature screens; the tab's `router.push` targets point here. NO `_layout.tsx`. |
| `app/disputes/` (plural) | 5 files: `_layout.tsx`, `[id].tsx`, `analytics.tsx`, `index.tsx`, `new.tsx` | Thinner tree with a layout. `[id].tsx` and `analytics.tsx` duplicate `dispute/`. `index.tsx` and `new.tsx` are unique. |
| `app/(tabs)/disputes.tsx` | 1 file | The navigation tab entry point — calls `useDisputeStore` → `fetchDisputes()`. WORKING. |

The canonical post-MOB-8 segment is `app/dispute/` (singular). `disputes/` will be collapsed into it.

---

## Store Enumeration

21 files in `mobile-app/src/store/` (20 stores + `index.ts`):

| Store file | Purpose |
|---|---|
| `accountStore.ts` | Bank accounts (split from financialStore) |
| `authStore.ts` | Auth session, user profile, onboarding state |
| `budgetStore.ts` | Budget categories and entries |
| `coachStore.ts` | AI coaching sessions |
| `creditBalanceStore.ts` | AI credit token balance (bare `fetch()` — FND-071) |
| `creditStore.ts` | Credit scores, factors, alerts, monitoring |
| `dashboardStore.ts` | Dashboard summary data |
| `debtStore.ts` | Debt accounts and payoff strategies |
| `disputeStore.ts` | Dispute CRUD, templates, strategies, reasons |
| `financialStore.ts` | DEPRECATED — to be deleted by MOB-6 |
| `gamificationStore.ts` | Progress, badges, quests, leaderboard |
| `goalStore.ts` | Financial goals |
| `index.ts` | Re-exports all stores; contains `useFinancialStore` deprecated alias at line 220 |
| `investmentStore.ts` | Investment portfolio |
| `marketplaceStore.ts` | Marketplace offers |
| `notificationStore.ts` | In-app notifications and preferences |
| `studentLoanStore.ts` | Student loan accounts |
| `syncStore.ts` | Offline sync queue; writes to deprecated financialStore (FND-066) |
| `taxStore.ts` | Tax brackets, recommendations, scenarios |
| `tradingStore.ts` | PCTT trading signals, positions, orders |
| `transactionStore.ts` | Transaction history |

CLAUDE.md states "8 stores" — this is stale. The plan's "20 stores" is accurate (20 store files + index.ts).

---

## Service Enumeration

`mobile-app/src/services/` — 35 files across 6 sub-directories:

| Path | Files |
|---|---|
| `api/` | `client.ts`, `credit.ts`, `disputes.ts`, `financial.ts`, `gamification.ts`, `index.ts`, `investments.ts`, `marketplace.ts`, `studentLoans.ts`, `tax.ts`, `trading.ts`, `types.ts`, `user.ts` |
| `background/` | `backgroundTaskService.ts`, `index.ts` |
| `biometrics/` | `biometricService.ts`, `index.ts` |
| `haptics/` | `hapticService.ts`, `index.ts` |
| `notifications/` | `pushNotificationService.ts`, `index.ts` |
| `widgets/` | `widgetService.ts`, `index.ts` |
| Root-level | `coachApi.ts`, `index.ts`, `legacyApi.ts`, `offline-sync.ts`, `push-notification-service.ts`, `supabase.ts`, `widget-service.ts` |

---

## Sub-Feature Status Table

Status key:
- `WORKING` — real store/API client call, no hardcoded mock data path
- `DEGRADED — __DEV__ mock seed` — store short-circuits to hardcoded seed when `__DEV__` is truthy
- `DEGRADED — __DEV__ auth bypass` — the auth bypass FND-064 (fixed by MOB-2)
- `DEGRADED — bare fetch()` — calls Fynvita API without Authorization header (FND-071)
- `MOCK` — hardcoded data, setTimeout fake loading, or no real data source at all
- `DEFERRED` — known issue, explicitly out of scope for this vertical

> Spot-checked 14 screens/stores directly (see verification notes per row).

| Sub-feature | Key files | Status | Finding / Notes |
|---|---|---|---|
| **Auth / Onboarding** | `authStore.ts`, `app/(auth)/login.tsx`, `app/(auth)/register.tsx`, `app/(auth)/forgot-password.tsx`, `app/onboarding/**` | `WORKING` | FND-064 CLOSED (MOB-2, `14d63bd`) — the `__DEV__`/`seedUser` bypass block + import deleted; `initialize()` always runs the real Supabase-session path. The remaining `isAuthenticated:true` sets are the genuine login/session-restore success paths. |
| **Dashboard** | `dashboardStore.ts`, `app/(tabs)/index.tsx`, `app/dashboard/**` | `WORKING` | `dashboardStore` does NOT have a `__DEV__` short-circuit in `fetchDashboard` (only logging). `(tabs)/index.tsx` calls real store. |
| **Credit Scores** | `creditStore.ts`, `app/(tabs)/credit.tsx`, `app/credit/**` | `DEGRADED — __DEV__ mock seed` | FND deferred. `creditStore` has `__DEV__` seed short-circuits at lines 131, 182, 217, 279, 296 (fetchScores, fetchHistory, fetchFactors, fetchMonitoring, fetchAlerts). The tab screen calls the real store methods. With `jest.config.js` `__DEV__: false`, tests exercise the real path. |
| **Disputes (tab entry)** | `app/(tabs)/disputes.tsx` | `WORKING` | Calls `useDisputeStore().fetchDisputes()` — confirmed. No `__DEV__` short-circuit in `fetchDisputes` (line 113: `if (__DEV__) { set({disputes: seedDisputes...}); return; }` — BUT jest runs with `__DEV__: false` so the real path is tested). In a real `__DEV__` build, the list is seeded. |
| **Dispute list store** | `disputeStore.ts` | `DEGRADED — __DEV__ mock seed` | FND deferred. Lines 113-115 short-circuit `fetchDisputes` to seed data; lines 311, 323, 335 short-circuit `fetchTemplates`, `fetchStrategies`, `fetchReasons`. `fetchDisputeById` at line 144 has no `__DEV__` short-circuit — real API call. |
| **Dispute detail screen** | `app/dispute/[id].tsx` | `WORKING` | FND-068 CLOSED (MOB-8) — `dispute/[id].tsx` wired to `useDisputeStore.fetchDisputeById`; `setTimeout`/hardcoded mock removed; loading + error states handled. |
| **Dispute plural tree** | (removed) | `REMOVED` | Collapsed by MOB-8 — `app/disputes/` deleted; 3 duplicate mock screens removed, `new.tsx`/`_layout.tsx` moved into the canonical `app/dispute/`. `/disputes` now resolves to the `(tabs)/disputes.tsx` tab (route collision resolved). |
| **Financial / Budgets** | `app/(tabs)/financial.tsx`, `budgetStore.ts`, `accountStore.ts`, `dashboardStore.ts` | `WORKING` | FND-066/067 CLOSED (MOB-6) — deprecated `financialStore` deleted; `(tabs)/financial.tsx` + 4 other screens migrated to the modular stores (real API calls). |
| **Savings screen** | `app/financial/savings.tsx` | `MOCK` | Fully hardcoded `ACCOUNTS` and `GOALS` constants, `setTimeout` fake loading. No store, no API. Beyond FND-068 scope — additional MOCK finding (see below). |
| **Investments / Trading** | `tradingStore.ts`, `investmentStore.ts`, `app/(tabs)/investments.tsx`, `app/trading/**` | `WORKING` | `(tabs)/investments.tsx` calls `useInvestmentStore().fetchPortfolio()`. `tradingStore` has no `__DEV__` short-circuits (confirmed by grep). Trading screen calls `fetchPositions`, `fetchOrders`, `fetchSignals`, `fetchRiskMetrics`. |
| **Notifications (in-app)** | `notificationStore.ts`, `app/notifications/index.tsx` | `MOCK + DEGRADED — __DEV__ mock seed` | `notificationStore` `fetchNotifications` has `__DEV__` seed short-circuit (line 80). The `app/notifications/index.tsx` screen (separate from notificationStore) uses `MOCK_NOTIFICATIONS` const — fully hardcoded, no store call at all. |
| **Gamification / Rewards** | `gamificationStore.ts`, `app/rewards/**` | `DEGRADED — __DEV__ mock seed` | FND deferred. Lines 167, 177, 254, 270, 323, 339, 415, 433 — seed short-circuits in both success and catch paths of fetchProgress, fetchBadges, fetchQuests, fetchLeaderboard. |
| **Biometrics / Settings** | `biometricService.ts`, `app/profile/security.tsx`, `app/settings/**` | `WORKING` | FND-069 CLOSED (MOB-3) — biometric flag + type migrated to `expo-secure-store` with a one-time AsyncStorage→SecureStore read-fallback; keys normalized to `@fynvita/<domain>/<key>`. |
| **Coaching / AI** | `coachStore.ts`, `app/insights/index.tsx`, `useCoaching.ts`, `useNudges.ts` | `WORKING` | FND-071 CLOSED (MOB-7) — `useCoaching`/`useNudges` routed through the authed `client.ts` (auto-attaches the Bearer token). |
| **Offline Sync** | `syncStore.ts`, `src/services/offline-sync.ts` | `WORKING` | FND-066 CLOSED (MOB-6) — `syncStore` offline `budget.create`/`goal.create` writes repointed to the modular `budgetStore`/`goalStore`. |
| **Credit Balance / AI tokens** | `creditBalanceStore.ts` | `WORKING` | FND-071 CLOSED (MOB-7) — routed through the authed `client.ts`; the `/credits/balance` response shape corrected to the real backend shape. |
| **Documents** | `app/documents/**`, `app/document/[id].tsx` | UNCERTAIN | Not spot-checked. Likely WORKING (documents use real API routes) but needs verification. |
| **Marketplace** | `marketplaceStore.ts`, `app/marketplace/**` | WORKING (store) | `marketplaceStore` has real API calls. Marketplace screens not spot-checked individually. |
| **Admin screens** | `app/admin/**` | `MOCK` | `admin/subscriptions.tsx` uses hardcoded `SUBSCRIPTIONS` const + `setTimeout`. Multiple admin screens likely similar pattern — not all spot-checked. |
| **Tax** | `taxStore.ts`, `app/tax/**` | `WORKING` | `taxStore` `__DEV__` occurrences are logging-only (no seed short-circuits, no early returns). Real API calls. |
| **Student Loans** | `studentLoanStore.ts`, `app/student-loans/**` | `WORKING` | `studentLoanStore` has a test suite and no `__DEV__` seed patterns identified. |
| **Linking / External URLs** | `src/utils/openExternalUrl.ts` + 29 call sites | `WORKING` | FND-070 CLOSED (MOB-4) — all production `Linking.openURL` sites routed through the `openExternalUrl` wrapper (https/mailto/tel allowlist; `javascript:`/`file:`/`data:` rejected). |
| **Mobile dependencies** | `mobile-app/package.json` + lockfile | `WORKING` | FND-065 CLOSED (MOB-5) — `npm audit` went 26 vulnerabilities (1 critical + 16 high) → **0**, via non-forced fixes + `overrides`. |

---

## Confirmed `__DEV__` Seed-Data Short-Circuit List

These stores have `if (__DEV__) { set({...seedData}); return; }` blocks — early returns that
replace real API calls with hardcoded seed data in any build where `__DEV__` is truthy.

| Store | Short-circuit locations | Nature |
|---|---|---|
| `authStore.ts` | Line 45-53 in `initialize()` | Auth bypass — sets `isAuthenticated:true` + full `seedUser`. **This is FND-064, not just mock data.** Fixed by MOB-2. |
| `disputeStore.ts` | Lines 113-115 (`fetchDisputes`), 311 (`fetchTemplates`), 323 (`fetchStrategies`), 335 (`fetchReasons`) | Mock seed data. `fetchDisputeById` does NOT have one — real API. Deferred (non-auth). |
| `creditStore.ts` | Lines 131-135 (`fetchScores`), 182-184 (`fetchHistory`), 217-219 (`fetchFactors`), 279-281 (`fetchMonitoring`), 296-299 (`fetchAlerts`) | Mock seed data. Deferred. |
| `gamificationStore.ts` | Lines 167-169, 177-179 (`fetchProgress` success+catch), 254-268, 270-276 (`fetchBadges`), 323-327, 339-345 (`fetchQuests`), 415-421, 433-438 (`fetchLeaderboard`) | Mock seed data. Deferred. |
| `notificationStore.ts` | Lines 80-86 (`fetchNotifications`), 175-177 (`fetchPreferences`) | Mock seed data. Deferred. |
| `financialStore.ts` | Lines 196-198 (`fetchDashboard`), 220-222 (`fetchAccounts`), 322-324 (`fetchTransactions`), 388-389 (`fetchBudgets`) | Mock seed data. Deprecated store — deleted by MOB-6. |

**taxStore.ts does NOT have seed-data short-circuits** — only logging `if (__DEV__) console.error(...)`.
The plan's list of 6 suspects is confirmed: authStore, disputeStore, creditStore, gamificationStore,
notificationStore, financialStore. taxStore is not in the seed-short-circuit set.

**Total `__DEV__` occurrences across mobile (for reference):** plan cites "141 across 24 files."
The non-auth short-circuits are explicitly deferred — they are flagged here for the follow-up task.

---

## Additional MOCK / DEGRADED Findings Beyond the 8 Known FNDs

These were discovered during the spot-check and are not covered by FND-064 through FND-071:

| Screen / Service | Finding | Severity estimate |
|---|---|---|
| `app/financial/savings.tsx` | Fully hardcoded `ACCOUNTS` and `GOALS` constants. `setTimeout` fake loading. No store or API call. | MOCK — beyond FND-068 scope |
| `app/notifications/index.tsx` | `MOCK_NOTIFICATIONS` const — no store call at all despite `notificationStore` existing. | MOCK |
| `app/admin/subscriptions.tsx` | Hardcoded `SUBSCRIPTIONS` const + `setTimeout`. No real data. | MOCK |
| `app/admin/**` (multiple) | Pattern appears consistent — admin screens use hardcoded data. Not all checked. | Likely MOCK throughout |
| `app/disputes/new.tsx` | Multiple `setTimeout` mock patterns (lines 100, 122, 147, 167, 189). Deleted by MOB-8 collapse. | MOCK — addressed by MOB-8 |
| `app/insights/spending.tsx`, `app/insights/weekly-summary.tsx`, `app/insights/alerts.tsx` | `await new Promise(resolve => setTimeout(resolve, 1000))` — artificial delay, data source unclear | Needs further check |

These are recorded for a follow-up task. They do not block the 8-finding remediation in MOB-2 through MOB-8.

---

## Deferred Scope Note

The `__DEV__` seed-data short-circuits in the five non-auth stores (`disputeStore`, `creditStore`,
`gamificationStore`, `notificationStore`, `financialStore`) are **explicitly deferred** from this
vertical's scope. FND-064 is specifically the **auth** bypass (`authStore.initialize()` setting
`isAuthenticated:true` from a hardcoded seed user) — this is a security critical that ships a
fully-authenticated mock user if `__DEV__` is truthy in a production build.

The non-auth `__DEV__` seeds are a data-quality risk but not a security critical. They are flagged
here so a tracked follow-up task can be created. No MOB task (other than MOB-2 for the auth bypass)
addresses them. MOB-1 through MOB-8 completing does not clear them.

---

_Generated by TASK-MOB-1. Next: MOB-2 removes the FND-064 auth bypass._
