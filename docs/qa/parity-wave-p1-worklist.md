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
## ⏸ SESSION-LIMIT CHECKPOINT (2026-07-25) — resets 8am ET; NEW SUBAGENTS BLOCKED until then
Both in-flight lanes (bills, journal) hit the session limit during their FINAL verification step; both were complete + green, so the main session verified (tsc 0 + tests) and salvage-committed them pathspec-scoped (`58d8ea0`, `9085b88`). Tree clean. **Resume after 8am ET.**

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
