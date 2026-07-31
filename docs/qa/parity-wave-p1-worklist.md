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
- **Mobile lane — ✅ P1 COMPLETE (6/6 screens)**: Documents `c336d63`, Notifications `138fb59`, Savings `c0165cd`, Dashboard `502b94e`, Insights `fb17146`, Admin-analytics `9c67dfd` — all wired to real data + verified (mobile tsc 0, tests). Adapters added per screen (mapWebGoal/mapWebDashboard/mapWebNotification/mapWebInsight); honest omissions (never fabricated): Dashboard payday, Insights health-score + quick-stats, Savings per-account APY. → **P2 Credit Repair scope+wire in flight.**
- **Web lane — ✅ P1 COMPLETE**: Bills `4e4344e`, Subscriptions `228aed0`, Auto-save `56f939f`, Zero-based `0914b88` (real `smartBudgetEngine`-backed guarded route), Dashboard `1b7848b` (6 widgets real via `Promise.allSettled`, 9 tests, full web suite 16,245/0).
- **⚠ CRITICAL de-fabrication (in flight `ae6b7e8e`)**: web Dashboard discovered `vitalityScoreService` is ENTIRELY mock-backed (each component calculator computes from hardcoded `mockDetails`; `calculatePercentile` commented "Mock"). This means **the earlier ai-insights fix `e2071a3` launders mock** via `healthScore = calculateVitalityScore().overall` (Dashboard + Insights correctly empty-stated their vitality widgets instead). The SOLID fix — de-mock the engine's component calculators to real per-user data, renormalize over real components, rewire ai-insights (or empty-state if a component has no source). **P1 SCREEN WIRING is done; this is the one remaining P1-class honesty defect.**

  **✅ FULLY SCOUTED (ready to implement — `ae6b7e8e` confirmed all real sources before hitting the account limit):**
  - Credit → `creditMonitoringService.getMonitoringDashboard` (`averageScore`, `scoreChange30Days`)
  - Spending / Savings / Debt → `financialService.getFinancialDashboard` (`savingsRate`, `monthlyExpenses`, `accounts`, `monthlyTrend`, `spendingByCategory`) + `getFinancialGoals` + `getBudgets`
  - Investments → `portfolioService.getUserPortfolios` (holdings, `totalValue`, gain/loss, sectors)
  - **Blast radius isolated**: `vitality-score-service.ts` + `ai-insights/route.ts` + their tests. The other `ComponentScore` types belong to a *separate* health-score system (leave alone). The vitality *page* uses its own local mock — **separate finding, out of scope** for this fix.

✅ **DONE `533f6e4`** (verified: web tsc 0, 47 tests pass, full web suite 16,258/0, changed-cov 92.1%). Per-component honest handling: Credit FICO-normalized (sub-factors absent→null/dropped); Spending/Savings from `getFinancialDashboard`+`getBudgets`+`getFinancialGoals` (each optional factor→null+renormalize); **Debt EXCLUDED+renormalized** (needs APRs/minimums schema lacks — refused to fabricate, `totalDebt` informational only); Investments from `getUserPortfolios` (return% + HHI); `percentile` always null; **`overall` null when no component has real data**. ai-insights was already sourcing `vitality.overall` → honest end-to-end automatically; route test locks `null overall → healthScore:null` (fixes the `e2071a3` laundering). **Vitality follow-ups**: (a) the vitality *page* `src/app/dashboard/vitality/page.tsx` has its OWN local mock — separate finding, untouched; (b) 3 quick-win guards (lower-utilization/pay-high-interest/increase-contributions) key off now-always-null factors so never fire today — kept as null-guarded forward-compat scaffolding (disclosed, not hidden dead code); (c) Codex second-review env-BLOCKED (out-of-date CLI) on both lanes → substitute a fresh-context critic.

## ✅ P1 COMPLETE (2026-07-25)
All screen wiring done both platforms **+** the last shared-mock honesty defect (vitality engine) fully closed: de-mock `533f6e4` → adversarial review (Codex substitute, found 1 HIGH + 3 MEDIUM residual coerce-to-0 laundering paths) → all 4 fixed `0de7078` (history-write best-effort so a persist failure can't force `healthScore:0`; investments/savingsRate missing→`null`+renormalize; history persists `null` not `0`). Independently verified: web tsc 0 / mobile tsc 0 / vitality+ai-insights 54 tests pass / full web suite **16,265 pass 0 fail**. My original `e2071a3` ai-insights mock-laundering is dead at the root.
**Follow-up finding (DB, out of src/-scope):** the committed `20260110_vitality_scores.sql` history table uses `credit_score`/`period_*` columns but the code reads/writes `credit`/`date` → the operative persistence schema doesn't exist in migrations (fully mocked in tests). A real history schema must use **nullable component columns** (to persist the honest `null`-per-unavailable-component model). Queue a migration fix.

⚠ **COORDINATION FINDING — shared-worktree index race.** BOTH P1-close agents' first commit swept in the *other* lane's concurrently-staged files (one shared git index across parallel agents). Both recovered by soft-reset (unpushed) + **atomic pathspec commit** (`git commit -- <paths>`) + pushing the explicit SHA (not `HEAD`). **All future parallel-lane dispatches must commit with `git commit -- <explicit paths>` and push the SHA, never a bare `git commit` + `git push HEAD`.**

## P2 — Mobile Credit Repair stack (`mobile-app/app/credit-repair/`) — full map (from `ab09213` recon)

All 8 screens shared a fake `setTimeout(600)` load + a module-level hardcoded array. No mobile `creditRepairApi` existed; the web exposes a `withAuth`-guarded `/api/credit-repair/*` family (`{success,data}`). Dispatch order = highest real-source value first.

| Screen | Mock | Real source to wire | Status |
|---|---|---|---|
| **disputes** | `DISPUTES` array | `useDisputeStore` → `GET /api/disputes` (+ `mapWebDispute` adapter) | ✅ `ab09213` |
| **index** | hardcoded "12 Active Disputes" / "+45 Points" / "85% Success" | `useDisputeStore` (active=not-closed, mirrors disputes list) + `useCreditStore.currentScore` (em-dash when null); nav tiles static | ✅ DONE `958656a` (3 mock stats→real; "Points Gained"/"Success Rate" replaced w/ real Resolved+Score for no honest source; 6 tests) |
| **inquiries** | `INQUIRIES` array | ⛔ **BLOCKED — no honest web source** (`ae5827c0`, zero changes). Verified all candidates: `/api/credit/analyze` returns metadata not `inquiries[]` (scout hint wrong); `/credit-repair/reports` `inquiries` JSONB is `DEFAULT '[]'`, **never written**; `/credit-bureau/report` falls back to `MockCreditBureauAdapter` pre-launch; only `/credit-bureau/test-import` reads the real `credit_inquiries` table but is a **test scaffold** ("remove in production"). **Root cause: twin-schema drift** — `20250107` (real data in `credit_inquiries`) vs `20250204` (`inquiries` JSONB never written). **CLEAR FIX (full-stack, autonomous — queued for web lane):** add real `GET /api/credit-repair/inquiries` (`withAuth`, `SELECT credit_inquiries WHERE user_id`, join `bureau` from parent report), then wire mobile (`getInquiries()` + `mapWebInquiry`; `removable = isHard && ageMonths>=24` per FCRA §605(a)(3)). | ✅ DONE — web route `c376b36` (100% cov, bureau JOINED, IDOR-safe) + mobile wiring `cc85a25` (`mapWebInquiry`: `removable` DERIVED via FCRA 24mo rule, NOT `isDisputed`; deleted fabricated "Score Impact" stat + fake "Dispute filed" alert; 23 tests). |
| **cards** | `CARDS` array (recommendations) | ⛔ **BLOCKED — product fork** (`a6dd50b8`, zero changes). Mobile = card-RECOMMENDATIONS catalog (issuer/apr/annualFee/approval), but `/api/credit-repair/cards` returns the user's OWN tracked cards (utilization tracker) — different concept; web `/credit-repair/cards` is a **Utilization Optimizer**. Affiliate `getCreditCardProducts()` is an empty stub (`credit-card-matcher.ts:489`); `credit-builder/secured-cards` is secured-only + no `approval`. **Options:** (1) rebuild mobile as Utilization Optimizer mirroring web [true parity, full rebuild, needs product sign-off]; (2) keep static catalog + document [honest interim]; (3) redirect secured-cards wiring to sibling `credit-builder/secured-card.tsx`. Do NOT wire to `/api/credit-repair/cards` as-is. | ⛔ BLOCKED (product decision) |
| **goodwill** | `LETTERS` array | `GET /api/credit-repair/goodwill` (exists, withAuth) → `{success,data:{letters,stats,pagination}}`; each letter `creditorName` + status `draft\|sent\|response_received\|approved\|denied` + `createdAt`. Mobile `Letter` diverges (`creditor`, status `draft\|sent\|responded\|success`) → `mapWebGoodwillLetter` adapter | ✅ DONE `018595b` (`denied→responded` honest floor; caught+fixed a `__proto__` pollution bug; 15 tests; new shared `creditRepair.ts` client for cards/inquiries/negotiate) |
| **negotiate** | `DEBTS` array | ✅ DONE `9020c87` — confirmed `GET /api/credit-repair/negotiate` (real pay-for-delete records); **rejected `useDebtStore`** (concept mismatch → would fabricate); `mapWebNegotiation` (creditor←collectionAgency, honest status compression, `lastContact`←`updatedAt` "Updated"); 17 tests |
| **payments** | `PAYMENTS` array + on-time% | ✅ DONE `0917c1b` — `GET /api/financial/bills` (upcoming bills, NOT history); **omitted on-time%/paid-late statuses** (no history HTTP route — only service methods) + **removed fabricated calendar card**; `mapWebBill`; 13 tests |

**Discovered mock-debt:**
- ✅ DONE `58d8ea0` — `mobile-app/app/financial/bills.tsx` `MOCK_BILLS` silent-fallback removed; wired to real `getBills`/`mapWebBill`; honest error+retry; removed fake per-bill "paid" status + hardcoded calendar dots (7 tests).

---
## ▶ SESSION-LIMIT CHECKPOINT (2026-07-25) — RESUMED (subagents freed before 1pm, like the 8am cycle)
Recurring session-limit pattern: subagent commits its work then dies before push; the main session verifies + salvage-pushes; quota then frees early. Salvaged: **`af62dd9` billing/index** (removed the fabricated "Visa •••• 4242" card = mobile face of FND-016; 20 tests). Then subagents freed → **DRIVE RESUMED**: **`a610588` billing/subscription** (real Stripe `/api/payment/billing`; removed a fabricated plan catalog with nonexistent "Basic"/"Enterprise" tiers; 38 tests). **billing/invoices in flight** (last billing screen → completes P2 billing). If the limit recurs: salvage-push local commits + resume on quota-free.

### Landed since the earlier 8am checkpoint (all verified green, pushed):
P4 journal (`9085b88`) · **financial mobile domain COMPLETE** (cash-flow `d0afa8e`, net-worth `d7f890e`, debt `015af6f`, spending `c50f241`) · web goodwill-letters (`ac0c73f`) · web dashboard/spending (`632a85d`) · building de-fabrication (`0b8aeec`) · billing/index (`af62dd9`). Web client-wiring now EXHAUSTED (remaining web = backend, decision #4). Real bugs caught: net-worth Plaid classification, debt `$NaN` reports, `/financial/insights/*` mis-path, `__proto__` pollution, budget fabrication, FND-016 mobile card.

### Remaining (needs subagent quota — resume 1pm ET or fresh account):
- **✅ P2 COMPLETE** — Credit Repair 8/8 + **Billing 3/3** (`af62dd9` index, `a610588` subscription, `4c5d247` invoices — all real Stripe `/api/payment/billing`, no card fabrication, honest status remaps).
- **Mobile tail** (client-wiring, real APIs exist — the productive lane): credit-builder (6, in flight `afa42eba`); insights (5); dashboard (~8); admin (~9); misc (activity/search/profile/reports/documents/…). ⚠ Not all are clean wires — some are **concept-mismatch** needing careful source-verify (like cards/inquiries): e.g. `dashboard/progress.tsx` is fully-fabricated milestones/achievements (fake dates/points) that DON'T map to `gamificationStore` (XP/badges/quests) — needs triage before wiring or an honest empty-state.
- **Web backend** (decision #4): 4 orphaned-service migrations+routes, aggregation engines, market-data, integrations, 2 simulator de-fabrications.

### ⚠ HONEST PARITY RE-ASSESSMENT (2026-07-25 main-session scan) — parity is NOT near ≥98%
A `grep` of `mobile-app/app` found **~29 screens still holding `MOCK_` arrays** + **~34 with fake `setTimeout` loading**. The drive has genuinely closed P1 + Credit Repair (8/8) + paper/journal + bills, but a LARGE mock-debt tail remains. Candidate mock-debt inventory (needs per-screen triage — some `MOCK_` refs may be dead fallbacks, like the cards/inquiries lesson; verify source-concept before wiring each):

| Domain | Screens with `MOCK_`/fake-load (candidates) |
|---|---|
| **credit-builder** | age, debt-strategy, pay-for-delete, payments, utilization, reports/upload |
| **financial** | cash-flow, debt, net-worth, spending (bills ✅ done) |
| **insights** | alerts, index, nudges, spending, weekly-summary |
| **dashboard** | analytics, disputes, documents, monitoring, notifications, reports, progress, settings |
| **admin** | analytics, audit, config, disputes, features, health, logs, settings, subscriptions |
| **billing (P2)** | index, invoices, subscription |
| **trading** | agents, chart |
| **budgeting (mobile)** | auto-save, bills, subscriptions, zero-based (web versions done in P1; mobile likely not) |
| **misc** | activity, analytics/reports, dispute/new+create, document(s)/[id], reports/[id], search, profile/edit, help/contact, handoff, financial-intelligence/* |

**WEB also carries mock-debt** (scan of `src/app` + `src/components`): **~16 pages with `MOCK_` arrays** + genuine `Math.random` fabrications (excluding legit animation uses — Confetti/Toast/ToastNotification):

| Domain | Web screens with `MOCK_`/`Math.random` fabrication |
|---|---|
| **credit** | credit-builder/goals, credit-builder/pay-for-delete, credit-builder/simulator, credit/simulator, credit/goodwill-letters, credit/secured-cards |
| **financial (P3 web-only)** | financial/crypto, financial/real-estate, goals/shared, dashboard/spending, financial-intelligence |
| **investments** | investments/performance, investments/watchlist (P4 backend-blocked), investments/rebalance, StockAnalysisView, NetWorthTracker |
| **trading (P4)** | TradingChartContainer (OHLC, backend-blocked), OpportunityRadar |
| **misc** | experts, identity, insights/alerts, insights/weekly-summary, journey, onboarding/complete |

**Implication:** ≥98% parity requires triaging + wiring this whole tail on BOTH platforms (~29 mobile + ~16 web candidate screens, minus dead fallbacks + legit-random) — many more two-lane dispatch rounds. This is the honest remaining scope, not "almost done." Each screen: verify real source exists (many will, some will STOP like cards/inquiries, a few need new web routes or a market-data backend).

## Financial domain map (from `a7344db0` scout)

⚠ **SYSTEMIC FINDING**: mobile `financialOverviewApi` methods call `/financial/insights/*` routes **that don't exist** → 404 → silent `MOCK_` render. The real routes are `/financial/spending/*`. **This mis-path→silent-mock pattern likely affects other mobile screens — check the route path exists when wiring any financial/insights screen.**

| Screen | Real source | Status |
|---|---|---|
| `financial/cash-flow.tsx` | `GET /api/financial/spending/cashflow` (real Plaid txns) — was mis-pathed `/financial/insights/cashflow` (404) | ✅ DONE `d0afa8e` (`mapWebCashFlow`; real `recommendations`; 16 tests) |
| `financial/net-worth.tsx` | assets/liabilities ← `GET /api/financial/accounts`; history omitted | ✅ DONE `d7f890e` — real accounts; **fixed a correctness bug** (old balance-sign rule miscounted Plaid credit/loan as assets → now type-based like web dashboard); history empty-stated; 17 tests |
| `financial/debt.tsx` | `GET /api/financial/debt` (`data.overview` shape) + real payoff comparison | ✅ DONE `015af6f` — real overview/debts + killed fabricated `STRATEGIES` (real comparison); 21 tests |
| `financial/spending.tsx` | trends ← cashflow route; byCategory ← `dashboard.spendingByCategory` (real % share) | ✅ DONE `c50f241` — reused `mapWebCashFlow`/`mapWebDashboard`; **dropped fabricated `amount*1.2` budget** (budgets.tsx owns budgets); deleted 2 dead mis-pathed methods; 8 tests |

**✅ FINANCIAL MOBILE DOMAIN COMPLETE** — cash-flow, net-worth, debt, spending, bills all wired to real data. Caught real bugs: net-worth Plaid classification, debt `$NaN` reports, the `/financial/insights/*` mis-path (now cleaned).

## Web-credit map (from `a13748ca` scout) — mostly NOT clean wiring
| Screen | Verdict |
|---|---|
| `credit/goodwill-letters` | ✅ DONE `ac0c73f` (`/api/credit-repair/goodwill`; 23 tests, 100% cov, full suite 16,351/0) |
| `credit/secured-cards` | ⛔ STOP — screen renders matchScore/approvalLikelihood/projectedScoreImpact that DON'T exist in `SecuredCard` service; catalog-vs-scored mismatch (would fabricate) |
| `credit-builder/goals` | ⛔ STOP — no `/api/credit-builder/goals` route/table; `goalTrackerService` client-only. Needs new backend |
| `credit-builder/pay-for-delete` | dead-fallback — fetches `/api/credit-builder/debts` (404); re-point at `/api/credit-repair/negotiate` (separate task) |
| `credit/simulator` | legit projection math; only `confidence: 85+Math.random()*10` is fabricated → make deterministic (low pri) |
| `credit-builder/simulator` | fabrication-in-calc — random score DELTAS as projections → deterministic math fix (not data-wiring) |

## Web insights/dashboard/investments map (from `a768eebe` scout)
| Screen | Verdict |
|---|---|
| `dashboard/spending` | ✅ DONE `632a85d` (`/api/financial/dashboard` + `/spending`, Promise.allSettled partial-resilient, honest empty-states; 10 tests, full suite 16,361/0) |
| `insights/alerts` | ⛔ NO-SOURCE — "smart alerts" is cross-domain; siloed routes exist but no unified `Alert` engine. Needs aggregation backend |
| `insights/weekly-summary` | ⛔ NO-SOURCE — aggregates 8 domains + healthScore, no engine (like vitality). Needs backend |
| `investments/performance` | ⛔ PRODUCT-FORK — fetches nonexistent `/api/investments/portfolio/performance` → silent `Math.random`; real route needs `portfolioId` + returns no daily `points[]` |
| `investments/rebalance` | ⛔ PRODUCT-FORK — `/api/investments/analytics/rebalance` needs `portfolioId` + divergent shape |

**Web tail is largely exhausted of clean wiring**: goodwill-letters + dashboard/spending wired; the rest need aggregation engines (alerts, weekly-summary), portfolio selection + daily-series (investments), or are product-forks/math-fixes. Most remaining WEB parity = backend work, not wiring.

## Web P3/misc map (from `af995e64` scout) — ALL 6 STOP (backend work, not wiring)
None of the 6 pages fetch anything today (all render `MOCK_*` constants). Verdicts:
| Screen | Real logic exists? | Blocker |
|---|---|---|
| `financial/crypto` | ✅ `crypto-wallet-service` (concept-exact) | ⛔ **orphaned service** — no `crypto_wallets`/`crypto_holdings` table in any migration; no route. Needs migration + route (outside `src/`) |
| `financial/real-estate` | ✅ `real-estate-tracking-service` | ⛔ orphaned service — no `properties`/`mortgages` table; no route |
| `goals/shared` | ✅ `shared-goals-service` | ⛔ orphaned service — no `shared_goals*` table; no route |
| `journey` | ✅ `financial-journey-service` (IDOR-tested) | ⛔ orphaned service — no `financial_journeys` table; no route (+ nothing calls `createJourney`) |
| `experts` | ❌ none | ⛔ no service/table/route — full advisor-marketplace build |
| `identity` | partial (credit-monitoring alerts ≠ identity-theft concept) | ⛔ product-fork — protection score + dark-web scan unsourced; needs identity-monitoring provider |

## ⚠ WEB CLIENT-WIRING EXHAUSTED — remaining web parity is BACKEND work (owner decision #4)
Web `src/`-only-wireable screens are DONE (paper, journal, goodwill-letters, dashboard/spending). Everything else on web needs backend that's outside a client-wire task: **(a) 4 orphaned services** (crypto/real-estate/shared-goals/journey — service logic written, need a **migration + authed route** each, then the wire is trivial); **(b) aggregation engines** (insights/alerts, weekly-summary); **(c) market-data provider** (watchlist quotes, chart OHLC); **(d) portfolioId + daily-series** (investments perf/rebalance); **(e) full builds** (experts marketplace, identity-monitoring integration); **(f) deterministic-math de-fabrication** (2 credit simulators). **Highest-leverage = the 4 orphaned services** (small coordinated migration+route+wire each). MOBILE still has a large wireable tail (client wiring, real APIs exist) → that's the productive lane.

## Mobile credit-builder map (from `afa42eba` scout) — mostly backend-blocked
| Screen | Verdict |
|---|---|
| `debt-strategy` | ✅ DONE `c5bf0c3` (reused `debtApi.getDebtPlan`; killed fabricated avalanche/snowball constants; 7 tests) |
| `pay-for-delete` | partial — `creditRepairApi.getNegotiations` exists but lacks `originalCreditor`/`dateOpened`; wireable via adapter omitting those (overlaps negotiate). Follow-up |
| `age` | ⛔ NO-SOURCE — no route returns per-account open-dates/age (needs credit-report tradeline source) |
| `payments` | ⛔ NO-SOURCE — payment-history (on-time%/late) only via `billDetectionService.getPaymentHistory`, NO HTTP route |
| `utilization` | ⛔ NO-SOURCE — no route exposes per-card credit limits (+ dead `useCreditStore` imports to drop) |
| `reports/upload` | different-pattern — upload action, needs a multipart upload/ingest route |

⚠ **EMERGING PATTERN**: many mobile-tail screens (like the web orphaned services) need **new backend routes** (tradelines, payment-history, card-limits, upload, etc.), not just client wiring. The truly-client-wireable tail is smaller than the raw screen count. Backend-route work overlaps decision #4.

## Mobile insights map (from `ae691f7e` scout)
| Screen | Verdict |
|---|---|
| `insights/index` | ✅ already-wired (P1, `/api/ai/insights`); still uses `useNudges`/`useCoaching` (mock-on-error fallbacks) |
| `insights/spending` | ✅ DONE `b1490f2` (was 100% fabricated; real deterministic `/api/financial/spending/analyze`; trends from real `comparison.categoryChanges`; 18 tests) |
| `insights/nudges` | ✅ DONE `89e08d5` — removed `MOCK_NUDGES` array + both mock-on-error fallbacks (honest error now); deleted fabricated stats card + history mock; empty-stated history tab; net −180 lines; 10 tests. **Follow-up bug**: hook posts `/ai/nudges/respond` but route is `POST /api/ai/nudges` (`{nudgeId,action}` vs `{nudgeId,response}`) — path/field mismatch. |
| `insights/weekly-summary` | ⛔ NEEDS-AGGREGATION-ENGINE — healthScore + 7 domains in one weekly payload; no endpoint, no health-score service (same as vitality) |
| `insights/alerts` | ⛔ CONCEPT-MISMATCH — `/api/notifications` carries `{type/title/message}`, not the alerts priority-triage engine (priority/actionRoute/rich data); would fabricate |

## Mobile dashboard map (from `aa07be6a` scout)
| Screen | Verdict |
|---|---|
| `dashboard/disputes` | ✅ DONE `18fa7f3` (`useDisputeStore`, reused `mapWebDispute`; 7 tests) |
| `dashboard/analytics` | ✅ DONE `58ffbf2` (`/api/user/analytics` — all 4 shapes real; 9 tests) |
| `dashboard/documents` | ✅ already-wired (13-line re-export of `app/documents`) |
| `dashboard/notifications` | ✅ DONE `f0b0663` — RE-EXPORTED the real store-backed screen (dashboard variant's UI was dead code over fabricated `actionUrl`/`document_processed` fields); −416 lines; 4 tests |
| `dashboard/monitoring` | ✅ DONE `400d912` — scores/alerts/history via `monitoringDashboardAdapter`; **fabricated "Key Factors" (Util 32%/Age 7yr) empty-stated** (no source at `/credit/factors`); 9 tests |
| `dashboard/settings` | ✅ DONE `7788a98` — profile via `getProfile` (removed "John Doe"); billing via real `subscriptionApi` (removed $79 hardcode); Save via real `updateProfile` (removed fake setTimeout); notif-prefs empty-stated; 10 tests. (Salvaged after session-limit; fixed 1 ambiguous test assertion.) |

**✅ DASHBOARD DOMAIN COMPLETE** — disputes/analytics/notifications/monitoring/settings wired + documents already-wired (7/8); reports + progress not-wireable (need reports-list route / gamification concept). Session limit resets **6pm ET** (recurring pattern: subagents free early, as 8am+1pm did). Remaining mobile domains: **admin (~9), misc (activity/search/profile/reports/documents/…)**. Then web-backend decision #4.
| `dashboard/monitoring` | partial — scores/alerts → `useCreditStore`; inline "Key Factors" + SCORE_HISTORY NO source (fabrication risk — remove/empty-state) |
| `dashboard/reports` | needs-verify — fabricates `size`/`generatedAt`; confirm `/api/analytics/reports` or `/credit-repair/reports` shape |
| `dashboard/settings` | partial — profile/notif-prefs real; billing tab hardcoded ($79/mo — fabrication risk) |
| `dashboard/progress` | ⛔ concept-mismatch — fabricated milestones/achievements ≠ `gamificationStore` (XP/badges/quests); empty-state only |

## Mobile admin map (from `ae848ce5` scout) — mostly blocked (all routes admin-guarded)
| Screen | Verdict |
|---|---|
| `admin/analytics` | ✅ already-wired (`adminAnalyticsApi` → `/api/admin/analytics`) |
| `admin/disputes` | ✅ DONE `19eae07` (`/api/admin/disputes` real table+user_email; `mapAdminDispute`; real status enum; 16 tests) |
| `admin/audit` | ⛔ FABRICATION-RISK (deeper look overrode "partial") — `audit_logs` SCHEMA DRIFT (002 UUID/resource_type/old_values vs 20260217 TEXT/event_type/metadata, both IF NOT EXISTS; route POST inserts a `details` col in NEITHER); screen's `type` + `details` have NO source column; profiles FK unreliable → would fabricate. Unblocker: reconcile schema + add `type`/`category` column |
| `admin/logs` | ⛔ dead-source — `/api/admin/logs` is honest-empty always (`dataAvailable:false`, no `system_logs` table); wireable but permanently empty |
| `admin/subscriptions` | ⛔ concept-mismatch/high-fab — schema drift (Stripe shape vs cancellation-tracking); `plan`/`amount`/`nextBilling` unsourced (broken FND-018 path); web admin subs itself 100% mock |
| `admin/health` | ⛔ concept-mismatch — `/api/monitoring/health` returns runtime uptime/mem/cpu, not the per-service up/down list the screen models (would fabricate services) |
| `admin/settings` | ⛔ partial/non-persistent — in-memory 7-field object (not DB); feature-flag list unsourced |
| `admin/config` | ⛔ no-source — screen wants categorized config-item list the settings object lacks |
| `admin/features` | ⛔ no-source — no feature-flags route (settings has 2 booleans) |

**Admin: 2 done + audit next; the other 5 need backend (feature-flags/system-logs/per-service-health routes + subscriptions schema fix) — overlaps decision #4.**

## Mobile misc map (from `afa2dbba` scout)
| Screen | Verdict |
|---|---|
| `financial-intelligence/smart-budget-enhanced` | ✅ DONE `2d94245` (`/api/financial/budgets/summary`; alerts from real overspent categories; 13 tests) |
| `financial-intelligence/action-plan`, `chat`; `search/index` | ✅ already-wired (financial-coach, chat, investmentsApi+transactionStore) |
| `activity/index` | ⛔ no-source (no feed route) |
| `analytics/reports`, `help/contact`, `handoff`, `dispute/new` | action-not-fetch / honest-static (report-gen, support-submit, nav, scripted wizard — not data screens) |
| `dispute/create` | ⛔ no-source for the disputable-items list (submit already uses real disputeStore) |
| `document/[id]`, `documents/[id]` | ⛔ concept-mismatch (route returns no analysis/metadata fields the screens render) |
| `reports/[id]` | ⛔ no-source (`/api/credit/reports/[id]` is a 404) |
| `profile/edit` | ⛔ partial/schema-drift (`/api/profile` omits dob/city/state/zip; `profiles` table lacks phone/address/avatar) |

# 🚧 BACKEND BUILD PROGRESS (2026-07-26) — plan `dfb3cfe`, critic APPROVE WITH CONDITIONS

Two-lane autonomous build off the finalized `docs/specs/` plan. Each slice: subagent → main-session verify (tsc + tests + honesty + clean pathspec) → recorded.

| Slice | SHA | Lane | What | Verified |
|---|---|---|---|---|
| M1-1 | `493e90a` | mobile | utilization → real cards API | tsc0, 18t |
| DEFAB-3 | `317420c` | web | rate-limit + 405-guard 8 public marketplace routes | tsc0, 142t |
| M1-2 | `6755622` | mobile | report detail → real API (honest empty sections) | tsc0, 19t |
| P0 fix | `7963ded` | web | strip reviewer user_id from public projection | tsc0, 19t |
| DEFAB-2 | `6ea00ca` | mobile | de-fab both credit simulators (−438 lines) | tsc0, 8t |
| M4-1 web | `abbb358` | web | real /api/admin/health probes (unconfigured≠green) — SALVAGED from session-limit death | tsc0, 33t |
| M4-1 mobile | `c87ca77` | mobile | wire admin health screen (resolved a shared-worktree collision) | tsc0, 30t |
| M2-3 web | `4724ded` | web | /api/activity over notifications (real withAuth guard tested) | tsc0, 6t |
| M2-3 mobile | `d67698c` | mobile | activity feed wired (types 1:1, dropped unbacked badges) | tsc0, 18t |
| M2-1 web | `b36a0b2` | web | /api/credit-repair/accounts (tradelines; SALVAGED, session-limit push death) | tsc0, 23t |
| M2-1 mobile | `94c6ecb` | mobile | age/tradelines screen (SALVAGED) | tsc0, 47t |
| M2-2 web | `09eeac4` | web | /api/credit-repair/disputable-items (negative accts + undisputed inquiries) | tsc0, 7t |
| M2-2 mobile | `ebec1fe` | mobile | dispute/create item list (submit-via-disputeStore intact) | tsc0, 55t |
| DEFAB-2 web | `96c5639` | web | de-fab 2 web credit simulators + delete fabricated score-simulator-service.ts | tsc0, 68t |

**Findings surfaced:** P0 review-leak (fixed `7963ded`); task #90 authed-review enumeration (FND-041-family, follow-up); task #111 `test:coverage:changed` crashes (maxBuffer — needs owner-approved bump); R-9 = start Docker daemon → local `supabase start` scratch DB unblocks M0 dry-run.
**Session-limit deaths salvaged:** M4-1 web (`abbb358`), M2-1 web+mobile (`b36a0b2`/`94c6ecb`) — committed-but-unpushed, main-session verified + salvage-pushed.

## 🔴 DEFAB-1 (`facae51`) — fabricated market data was driving LIVE trade signals
Owner approved DEFAB-1 + ADR-0005 (Alpaca). Removing the fabrication uncovered **three** sites returning `Math.random()` random-walk OHLC as real market history — worse than the single site originally scoped:
1. **`/api/trading/signals` (authed, LIVE)** — fell back to `makeSyntheticCandles` whenever `ALPACA_*` creds were absent or the call failed, feeding invented prices into the PCTT/RSI/regime/HTF engines and emitting **entry / stop / target / confidence** to users. Its real Alpaca path already exists (ADR-0005 is half-implemented) and is untouched.
2. **`trading/autonomous/signal-scanner.fetchCandles`** — returned a random walk labelled "realistic synthetic data" to the **autonomous executor's** scan decisions.
3. **`investments/services/MarketDataService.getHistoricalData`** — caught ANY provider error and substituted synthetic candles.

All three generators deleted; unavailable data → empty set (all callers guard on length) or propagated error. **The fabrication was also masking two test defects it made green:** signal-generator's mock never implemented the real `getHistory` (the swallowed `TypeError` was replaced by synthetic bars) and its 2-bar fixture could never meet the ≥200-candle technical-analysis floor — so 12 tests asserted analysis of `Math.random()` data. Mock fixed to the real `{data:bars}` contract + deterministic 220-bar fixture. Verified: tsc 0, **65 suites / 977 tests green**.

**Also landed:** coverage gate un-crashed (`1ae84ed`, owner-approved maxBuffer fix) → it now runs and reports **220 files <85% changed-line coverage branch-wide** — pre-existing debt that was invisible while the gate crashed. Surfaced for triage, not introduced here.

**5 owner ADRs (0005-0009) marked Accepted** (sign-off 2026-07-26).

## 🔴 M0 VERIFIED: the database CANNOT be provisioned from this repo (2026-07-26)
Docker up → `supabase init` (config.toml was missing — the gap that made ordering unverifiable) → local ephemeral stack → **every migration applied individually against a clean DB**. This is measured, not inferred.

**Result: 46 of 53 apply clean; 7 FAIL.** A plain `supabase start` aborts on the first one, so a fresh environment cannot be built at all.

| # | Migration | Error | Class |
|---|---|---|---|
| 1 | `20250204000000_credit_repair_schema` :416 | policy "Users can view their own credit reports" already exists | twin collision (RLS policies aren't `IF NOT EXISTS`) |
| 2 | `20250207000000_financial_intelligence_schema` :44 | **syntax error at or near `::`** | genuinely broken SQL |
| 3 | `20250211000000_billing_profiles` :33 | function `trigger_set_timestamp()` does not exist | missing dependency |
| 4 | `20260105_performance_optimizations` :14 | relation `chat_sessions` does not exist | **ordering bug** — indexes a table created 10 days later (`20260115_create_financial_chat_tables`) |
| 5 | `20260110_subscriptions` :44 | column `next_billing_date` does not exist | **subscriptions twin confirmed** |
| 6 | `20260217000000_infrastructure_persistence` :61 | column `event_type` does not exist | **audit_logs twin confirmed** |
| 7 | `sample_data.sql` :27 | invalid uuid `"YOUR_TEST_USER_ID"` | placeholder seed file shipped in `migrations/` |

Already fixed this session (chain now advances past them): `credit_reports` twin (`score`/`report_data`/`accounts`/`inquiries`/… added via idempotent ALTERs) and `disputes` twin (`strategy`/`creditor_name`/`inaccuracy_type`/… ). Both additive + idempotent per ADR-0001 — no-ops where the file's own CREATE ran, healing path where the earlier twin's did.

**This supersedes the critic's F-002 estimate:** drift isn't just column-level, it's a broken provisioning chain including a hard syntax error and an ordering bug.

## ⏸ NATURAL PAUSE APPROACHING (after DEFAB-2 web)
The ungated, no-DB queue drains to empty after DEFAB-2 web. **Everything remaining needs an unblock:**
- **Docker (R-9)** → M0 reconcile migrations (audit_logs silent-failure + profile drift live bugs) + M3 orphaned-service new-table migrations + all M0-dependent routes (M2-4, M4-2/3/4, M5). Start Docker → I run local `supabase start` (ephemeral, zero prod risk) → dry-run-verify + land them.
- **Owner ADRs (M6)** → market-data/identity vendors (cost), cards/marketplace/simulator-rebuild (target 2026-08-09).
- **Owner OK** → task #111 coverage-script maxBuffer fix.

# 🏁 CLIENT-WIRING DRIVE COMPLETE (2026-07-25)
Every mobile + web screen with a real, honest, concept-matched source is now wired. **~30 screens/fixes landed this session** (P1 vitality de-mock, P2 Credit Repair 8/8 + Billing 3/3, financial mobile domain 5, insights 3, credit-builder 1, dashboard 5, admin 2, misc 1, web paper/journal/goodwill/dashboard-spending), all verified green on PR #3, with **~12 real bugs caught** (net-worth Plaid classification, debt `$NaN` reports, `/financial/insights/*` mis-path, `__proto__` pollution, budget fabrication, FND-016 card, fabricated plan catalog, fabricated milestones, mock-on-error fallbacks, …). Every un-wired screen was honestly triaged and mapped — none fabricated.

## ⛔ Remaining parity = BACKEND work (OWNER DECISION #4) — client-wiring can't close it
Reaching ≥98% requires building backend that doesn't exist. Consolidated, by leverage:
1. **Orphaned services → migration + route** (logic already written): crypto, real-estate, shared-goals, journey.
2. **Aggregation engines**: insights/weekly-summary + alerts, admin/health (per-service probes), a vitality/health-score service.
3. **Schema reconciliations**: `audit_logs` (+ `type`/`category` col), `subscriptions` (billing-tier read model, fixes FND-018), `credit_reports` twin-schema, vitality history table (nullable component cols).
4. **New routes/tables**: `system_logs`, admin feature-flags, DB-backed admin settings/config, payment-history, per-card credit-limits, credit tradelines, disputable-items list, credit-report `[id]`, activity feed, support tickets, doc-analysis payload, a full user-profile route (dob/address/phone/avatar).
5. **External integrations**: market-data/quotes provider (web watchlist + chart OHLC), identity-monitoring provider.
6. **Product forks**: cards screen (utilization-optimizer vs catalog); marketplace unguarded routes; the 2 credit simulators (deterministic-math de-fab).

### Remaining parity work (all doable, need subagent quota)
- **P2 Billing / IAP** (mobile) — not started.
- **P3 web-only → mobile ports** — Real Estate, Crypto holdings, shared Goals, marketplace sub-cats (not started).
- **P4 watchlist quotes + chart OHLC** — BLOCKED-on-backend (net-new market-data/quotes API required — a real infra gap, not a wiring task).
- **building.tsx** — honest-static cosmetic `setTimeout` cleanup (optional, low priority).

### Owner decisions batched for the user
1. **Cards screen product fork** — Utilization-Optimizer rebuild vs static catalog vs redirect to `credit-builder`.
2. **Marketplace unguarded routes** — public browse allowed, or auth-gate?
3. **Backend gaps to greenlight** — market-data/quotes API (unblocks watchlist + charts); vitality-score history-table migration (nullable component columns).
| **building** | `STRATEGIES` array = **honest static educational content** (like Savings tips) | NOT mock-debt — content is legitimately static; only the cosmetic `setTimeout` is fake. LOW priority cleanup, no parity/honesty impact. | ⏸ optional (honest-static) |

**Credit Repair: 6/8 data screens wired to real APIs** (disputes, goodwill, index, negotiate, payments, inquiries); cards ⛔ product fork; building honest-static. Effectively COMPLETE.

## P4 — Web Trading/Watchlist laggards (full map from `afe668ea` scout)

| Surface | Real source | Status |
|---|---|---|
| `trading/paper/page.tsx` | `PaperTradingEngine` + 5 authed routes | ✅ DONE `23d5bef` (mapAccount/Position/Order/Performance/Trade; omitted no-source fields; profitFactor ∞→null→em-dash; 25 tests; full suite 16,316/0) |
| `trading/journal/page.tsx` | `/api/trading/journal` GET/POST + stats + `[id]`/close | ✅ DONE `9085b88` — real fetch + adapter; "Quick Insights" replaced w/ real `bestStrategy`/`expectancy`/`avgHoldingTime` + "Not enough data yet" empty-state; 12 tests |
| `investments/watchlist/page.tsx` | ⛔ **NONE** — no quote route; mock `Math.random()` prices | BLOCKED-on-backend (needs a quotes/market-data API) |
| `components/trading/charts/TradingChartContainer.tsx` | ⛔ **NONE** — mock OHLC `generateMockData` | BLOCKED-on-backend (needs market-data OHLC API) |
| trading main / strategies / backtest / OpportunityRadar | already real | ✅ no action |
| `components/trading/watchlist/Watchlist.tsx` | prop-driven orphan (no page imports) | n/a |

No product forks. After journal, the only remaining P4 mock-debt is **backend-blocked** (watchlist quotes + chart OHLC both need a market-data/quotes provider — a net-new backend, larger than a wiring task). **Codex gate env-blocked on paper-trading** → substituted self-review (all calls authed, server-side ownership check prevents IDOR).

`cards`/`goodwill`/`inquiries`/`payments` each need a new `mobile-app/src/services/api/creditRepair.ts` getter + a per-screen `mapWebX` adapter (type divergence recurs every screen).
- **Follow-ups flagged by subagents** (roll up at P1 close): the new `budgets/generate/zero-based` route wants a Codex/`vcrit-auth` pass (blocked on out-of-date Codex CLI); mobile `useNudges`/`useCoaching` shared hooks still have mock-on-error fallbacks (separate item); zero-based "Save plan" button inert (needs a bulk-create budgets endpoint).
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
