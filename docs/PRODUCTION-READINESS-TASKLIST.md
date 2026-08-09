# Fynvita Production Readiness Task List

> Generated: 2026-04-26 | Based on 4-agent deep-dive audit with code-level evidence
> Status: 14,499 tests passing | 0 type errors | 546 test suites

---

## Scoring Summary

| Platform | Current | Target | Gap |
|----------|---------|--------|-----|
| Web App | 98% | 100% | Admin UI mock data, web challenges mock |
| Mobile App | 78% | 95% | Marketplace, investments, goals wiring |
| Web-Mobile Parity | 72% | 90% | 4 HIGH + 5 MEDIUM gaps |
| Plan Completion | 98.2% | 100% | Migration verification, runtime wiring |

---

## Tier 1: Critical Path (Ship Blockers)

### T1-01: Wire mobile marketplace to real backend
**Priority:** P0 | **Effort:** Large | **Files:** 15+ modify, 4 create
**Evidence:** All 12 mobile marketplace screens use hardcoded arrays (e.g., `consolidation.tsx` line 12: `const OPTIONS: ConsolidationOption[] = [{ id: "1", name: "SoFi Personal Loan"...}]`). CTAs route to `/settings/billing` or `Linking.openURL(google.com/search?q=...)`. Zero API calls across all 12 files. Web has complete service layer: `marketplace-service.ts`, `provider-service.ts`, `offer-service.ts`, `credit-card-matcher.ts`, `auto-loan-matcher.ts`.

**Tasks:**
- [ ] T1-01a: Create `mobile-app/src/services/api/marketplace.ts` — API client wrapping `/api/marketplace/*` endpoints (products, providers, offers, matching)
- [ ] T1-01b: Create `mobile-app/src/store/marketplaceStore.ts` — Zustand store for products, providers, filters, selected category
- [ ] T1-01c: Refactor `marketplace/index.tsx` — fetch categories from API instead of hardcoded `services` array
- [ ] T1-01d: Refactor `marketplace/secured-cards.tsx` — wire to credit-card-matcher API, add eligibility check based on user credit score
- [ ] T1-01e: Refactor `marketplace/consolidation.tsx` — wire to `/api/marketplace/products?category=loans`, replace Google search link with real offer links with affiliate tracking
- [ ] T1-01f: Refactor `marketplace/tradelines.tsx` — wire to tradeline-service API, replace mock purchase flow
- [ ] T1-01g: Refactor `marketplace/attorneys.tsx` — wire to provider-service API with verified attorney listings
- [ ] T1-01h: Refactor `marketplace/coaching.tsx` — wire to provider-service API for coach listings, add real booking flow
- [ ] T1-01i: Refactor `marketplace/monitoring-services.tsx` — wire to offer-service for monitoring plan comparison
- [ ] T1-01j: Refactor `marketplace/analysis.tsx` — wire to offer-service for analysis packages
- [ ] T1-01k: Refactor `marketplace/services.tsx` — wire to marketplace-service for credit repair services
- [ ] T1-01l: Refactor `marketplace/education.tsx` — wire to marketplace-service for course catalog
- [ ] T1-01m: Refactor `marketplace/community.tsx` — wire to real forum/community API or mark as "Coming Soon" with waitlist
- [ ] T1-01n: Add loading skeletons, error states, empty states to all 12 screens
- [ ] T1-01o: Add compliance disclosures where required (APR, terms) per `disclosure-service.ts` patterns

**Acceptance:** Each screen fetches real data from API, shows loading/error states, CTAs route to real offer pages (not Google search).

---

### T1-02: Build missing mobile investment screens
**Priority:** P0 | **Effort:** Large | **Files:** 6 create, 2 modify
**Evidence:** Web has `/investments/research`, `/investments/rebalance`, `/investments/performance`, `/investments/dividends`, `/investments/backtest`, `/trading/strategies`, `/trading/strategies/[id]`. Mobile has none of these. Mobile `investmentsApi` already has `analyzeStock()`, `analyzePortfolio()` methods. Mobile `investmentStore` has `analyzePortfolio()` action but no screen calls it.

**Tasks:**
- [ ] T1-02a: Create `mobile-app/app/investments/research.tsx` — symbol search + analysis tabs (technical, fundamental, sentiment). Wire to `investmentsApi.analyzeStock()` and `/api/investments/analyze/[symbol]/*`
- [ ] T1-02b: Create `mobile-app/app/investments/rebalance.tsx` — allocation drift display, target vs current, trade recommendations. Wire to `investmentStore.analyzePortfolio()` (already exists, just needs UI)
- [ ] T1-02c: Create `mobile-app/app/investments/performance.tsx` — period returns (1D/1W/1M/3M/1Y/ALL), Sharpe, max drawdown, benchmark comparison. Wire to `/api/investments/analytics/performance`
- [ ] T1-02d: Create `mobile-app/app/trading/backtest.tsx` — backtest results listing with equity curves. Wire to `/api/trading/backtest`
- [ ] T1-02e: Create `mobile-app/app/trading/strategies/index.tsx` — strategy library grid with search/filter. Wire to `/api/trading/strategies`
- [ ] T1-02f: Create `mobile-app/app/trading/strategies/[id].tsx` — strategy detail with rules, performance, backtest results. Wire to `/api/trading/strategies/[id]`
- [ ] T1-02g: Fix `tradingStore.fetchTradeHistory()` — remove mock data fallback (lines 489-556 return `mockTrades` array). Make it call `tradingApi.getTradeHistory()` for real data, handle empty state gracefully
- [ ] T1-02h: Fix `tradingStore.fetchTradeStats()` — remove mock fallback (lines 570-573). Use real API response

**Acceptance:** All 6 new screens render real data, trade history shows actual trades not mock.

---

### T1-03: Wire mobile goals to real backend
**Priority:** P0 | **Effort:** Medium | **Files:** 4 modify, 1 create
**Evidence:** Backend is 100% complete — `savings-goal-service.ts` (1019 LOC), `goal-tracker.ts` (733 LOC), `goal-planner.ts`, plus 4 services in `src/lib/goals/services/`. Mobile `goalStore.ts` has full Zustand store with `fetchGoals`, `createGoal`, `updateGoal`, `contributeToGoal`, `deleteGoal`. But mobile screens use `MOCK_GOALS` array instead of calling the store. API routes exist at `/api/financial/goals`.

**Tasks:**
- [ ] T1-03a: Fix `mobile-app/app/financial/goals.tsx` — replace `MOCK_GOALS` array with `useGoalStore().fetchGoals()`. Add pull-to-refresh, loading skeleton, empty state ("No goals yet — create one!")
- [ ] T1-03b: Create `mobile-app/app/financial/goals/create.tsx` — goal creation form (name, target amount, deadline, category). Wire to `goalStore.createGoal()`
- [ ] T1-03c: Fix `mobile-app/app/coach/goals.tsx` — wire to goalStore instead of mock data. Show progress bars, velocity metrics from goal-tracker
- [ ] T1-03d: Fix `mobile-app/app/coach/goal-detail.tsx` — wire to goalStore for individual goal. Add contribution button calling `goalStore.contributeToGoal()`
- [ ] T1-03e: Add goal progress widget to mobile dashboard (home tab) — show top 3 goals with progress bars

**Acceptance:** Goals are created, tracked, and contributed to with real data persisted via API.

---

## Tier 2: High Priority (Core UX Quality)

### T2-01: Wire admin users page to real API
**Priority:** P1 | **Effort:** Small | **Files:** 2 modify
**Evidence:** Web `src/app/admin/users/page.tsx` lines 17-68 has `const mockUsers: User[] = [{ id: "1", name: "John Doe"...}]` — 5 hardcoded users. Real API at `src/app/api/admin/users/route.ts` queries Supabase with auth, validation, pagination, filtering. Mobile `mobile-app/app/admin/users.tsx` has identical mock pattern.

**Tasks:**
- [ ] T2-01a: Refactor `src/app/admin/users/page.tsx` — replace `mockUsers` with `fetch('/api/admin/users')`. Add pagination controls (API supports `page`, `limit`). Add search by name/email, filter by status/plan
- [ ] T2-01b: Refactor `mobile-app/app/admin/users.tsx` — same treatment: fetch from API, add pagination, search, filter

**Acceptance:** Admin users page shows real Supabase users with working search/filter/pagination.

---

### T2-02: Wire mobile chat to real AI API
**Priority:** P1 | **Effort:** Small | **Files:** 1 modify
**Evidence:** Mobile `mobile-app/app/chat/index.tsx` lines 77-101 uses hardcoded response mapping: `const responses: Record<string, string> = { "How can I improve my score?": "Great question!..." }`. Falls back to generic "I understand you're asking about credit...". Web chat at `src/app/dashboard/chat/page.tsx` calls `/api/ai/chat` endpoint — fully wired. Mobile coach (separate from chat) already uses real `coachApi` service.

**Tasks:**
- [ ] T2-02a: Refactor `mobile-app/app/chat/index.tsx` — replace hardcoded `responses` map with real API call to `/api/ai/chat`. Use streaming response for progressive rendering. Add typing indicator, retry on error, conversation persistence

**Acceptance:** Mobile chat sends user messages to AI API and displays real AI responses.

---

### T2-03: Fix gamification wiring (quests + challenges)
**Priority:** P1 | **Effort:** Medium | **Files:** 3 modify
**Evidence:** Mobile `quests.tsx` has 480+ lines of UI but quest completion handler is partially stubbed. Line 68-71: all quests map to type "daily" regardless of actual type. `gamificationStore.ts` uses `seedBadgesResponse` in `__DEV__` mode — production path not validated. Web `challenges/page.tsx` uses `MOCK_CHALLENGES` array, never fetches from API.

**Tasks:**
- [ ] T2-03a: Fix `mobile-app/app/rewards/quests.tsx` — fix quest type transformation (line 68-71) to correctly map daily/weekly/challenge types. Wire `completeQuest()` to call `gamificationStore.completeQuest()` which calls real API
- [ ] T2-03b: Fix `mobile-app/src/store/gamificationStore.ts` — ensure production path (non-`__DEV__`) fetches from real API, not seed data. Add error handling for empty badge/quest responses
- [ ] T2-03c: Refactor `src/app/challenges/page.tsx` — replace `MOCK_CHALLENGES` array with fetch from `/api/gamification/quests?type=challenge`. Add completion flow, progress tracking

**Acceptance:** Quests show correct types, completing a quest awards real XP, web challenges page shows real data.

---

### T2-04: Enhance mobile dispute wizard
**Priority:** P1 | **Effort:** Medium-Large | **Files:** 2 modify, 1 create
**Evidence:** Web wizard at `src/app/disputes/wizard/page.tsx` (233 lines) has 6 steps: bureau select → dispute type → item selection → message customization → review → complete. Mobile `mobile-app/app/dispute/wizard.tsx` is a 12-line redirect to `/dispute/create`. Mobile create screen has basic 4-step flow but lacks item selection and message customization.

**Tasks:**
- [ ] T2-04a: Enhance `mobile-app/app/dispute/create.tsx` — add item selection step (fetch user's report items from credit API, let user select items to dispute)
- [ ] T2-04b: Add message customization step — pre-fill with AI-generated letter, allow user edits
- [ ] T2-04c: Add review/confirmation step — show summary of selected bureau, type, items, message before submission
- [ ] T2-04d: Fix `mobile-app/app/dispute/wizard.tsx` — replace redirect with proper wizard navigation or remove file and route directly to enhanced create screen

**Acceptance:** Mobile dispute flow has 6 steps matching web, user can select items and customize message.

---

### T2-05: Add mobile notification preferences
**Priority:** P1 | **Effort:** Medium | **Files:** 1 create, 1 modify
**Evidence:** Web `src/app/settings/notifications/page.tsx` (214 lines) has 6 notification types with Email/Push/SMS toggles + quiet hours. Mobile `mobile-app/app/notifications/index.tsx` is display-only — shows notification list with `MOCK_NOTIFICATIONS`, no settings.

**Tasks:**
- [ ] T2-05a: Create `mobile-app/app/settings/notification-preferences.tsx` — 6 notification types (Credit Alerts, Dispute Updates, Bill Reminders, Goal Milestones, Trading Signals, Security Alerts) with Email/Push/SMS toggles per type. Add quiet hours with time pickers
- [ ] T2-05b: Wire to `/api/notifications/preferences` endpoint for save/load
- [ ] T2-05c: Add navigation link from `mobile-app/app/notifications/index.tsx` to preferences screen (gear icon in header)

**Acceptance:** User can toggle notification channels per type, set quiet hours, preferences persist via API.

---

## Tier 3: Polish & Hardening

### T3-01: Add web leaderboard page
**Priority:** P2 | **Effort:** Small | **Files:** 1 create
**Evidence:** `leaderboard-service.ts` exists with full implementation. Mobile has `rewards/leaderboard.tsx`. Web has no leaderboard page.

**Tasks:**
- [ ] T3-01a: Create `src/app/leaderboard/page.tsx` — weekly/monthly XP leaderboard, streak leaderboard, anonymized user rankings. Wire to `/api/gamification/leaderboard`

---

### T3-02: Add dividends tracking
**Priority:** P2 | **Effort:** Medium | **Files:** 2 create
**Evidence:** Web `investments/dividends/page.tsx` exists but uses hardcoded mock data. No backend endpoint at `/api/investments/dividends`. Mobile has no dividends screen.

**Tasks:**
- [ ] T3-02a: Create `/api/investments/dividends` endpoint — aggregate dividend data from holdings, calculate yield, project annual income
- [ ] T3-02b: Wire web `investments/dividends/page.tsx` to real API
- [ ] T3-02c: Create `mobile-app/app/investments/dividends.tsx` — dividend income tracker

---

### T3-03: Verify and deploy Supabase migrations
**Priority:** P2 | **Effort:** Small | **Files:** 1-2 create
**Evidence:** Sprint 2 tables (kill_switch_events, dual_control_requests, incidents, trading_audit_trail) have migration at `20260420000002_safety_controls.sql`. Strategy lifecycle table for Sprint 5 may not have explicit migration (uses JSONB in trading_accounts).

**Tasks:**
- [ ] T3-03a: Verify all Sprint 2/5/10 referenced tables exist in migrations — run `supabase db diff` to identify any missing schemas
- [ ] T3-03b: Create migration for `strategy_lifecycle` table if missing (stage, strategy_id, dwell_start, gate_scores, promoted_at)
- [ ] T3-03c: Add RLS policies for any new tables (match pattern from existing trading tables)

---

### T3-04: Verify canonical policy runtime integration
**Priority:** P2 | **Effort:** Small | **Files:** 0 create, 2-3 verify
**Evidence:** 21 YAML files exist in `docs/strativion-autonomous-trading-package/canonical/policy/`. Loader reads from this path. Hash is computed. Need to verify: (a) `getPolicy()` is called at boot, (b) canonical hash appears in audit trail entries, (c) `validateCurrentPolicy()` runs before first trade.

**Tasks:**
- [ ] T3-04a: Add boot validation call — ensure `validateCurrentPolicy()` runs on application startup (in trading service initialization)
- [ ] T3-04b: Verify canonical hash is passed to `audit-trail.ts` on every trade decision
- [ ] T3-04c: Add integration test: load policy → validate → verify hash appears in mock audit entry

---

### T3-05: Wire Strativion modules into live trading pipeline
**Priority:** P2 | **Effort:** Medium | **Files:** 3-5 modify
**Evidence:** All 10 sprints built standalone modules with tests. Need to verify they're called in the actual trading flow: signal → compliance gates → regime check → risk gateway → execution.

**Tasks:**
- [ ] T3-05a: Wire `gate-runner.ts` into pre-trade admission (before risk gateway) in signal/order API routes
- [ ] T3-05b: Wire `regime-detector.ts` into signal pipeline — reject signals mismatched to regime
- [ ] T3-05c: Wire `portfolio-heat.ts` into risk gateway — reject trades exceeding heat budget
- [ ] T3-05d: Wire `pre-market-checklist.ts` into trading service startup
- [ ] T3-05e: Wire `htf-alignment.ts` into signal generation — filter signals that don't align with HTF trend

---

### T3-06: Mobile test coverage
**Priority:** P2 | **Effort:** Large | **Files:** 20+ create
**Evidence:** Mobile has only 8 test files covering stores. Zero screen/component tests. CLAUDE.md flags this as "FAIL (0%)" for mobile coverage.

**Tasks:**
- [ ] T3-06a: Add store tests for all 19 Zustand stores (currently only 8 have tests)
- [ ] T3-06b: Add component tests for critical components (BadgeCard, QuestCard, charts)
- [ ] T3-06c: Add screen render tests for core flows (auth, credit, disputes, financial)
- [ ] T3-06d: Target 50%+ mobile coverage (up from ~0%)

---

## Tier 4: Nice-to-Have (Post-Launch)

### T4-01: Mobile search
Create global search screen with symbol search, transaction search, help article search.

### T4-02: Mobile reports
Add report generation screen with PDF export for credit reports, financial summaries.

### T4-03: Mobile dark web monitoring
Wire identity/dark-web screens to real monitoring API instead of mock data.

### T4-04: Goal investment dashboard
Wire `GoalInvestmentDashboard.tsx` component into goals flow — show investment-linked goals.

### T4-05: Web voice assistant
Expand `VoiceAssistant` component for hands-free financial queries.

---

## Execution Strategy

**Phase 1 (Week 1-2): Ship Blockers**
- T1-01 (marketplace) — largest effort, start immediately
- T1-02 (investments) — parallel with marketplace
- T1-03 (goals) — quick win, goalStore already built

**Phase 2 (Week 2-3): Core UX**
- T2-01 (admin) — small, high-visibility fix
- T2-02 (chat) — small, high-engagement impact
- T2-03 (gamification) — medium, fixes broken flows
- T2-04 (dispute wizard) — larger, core feature parity
- T2-05 (notification prefs) — medium, UX completeness

**Phase 3 (Week 3-4): Polish & Hardening**
- T3-01 through T3-06 — runtime integration, migrations, tests

**Phase 4 (Post-Launch): Nice-to-Have**
- T4-01 through T4-05 — enhancements for v1.1

---

## Quality Gates (per task)

Every task must pass before merge:
1. `npx tsc --noEmit` — 0 new type errors
2. `npx jest --no-coverage` — 0 new test failures
3. New screens have loading, error, and empty states
4. No hardcoded mock data in production paths
5. All API calls have error handling with user-facing messages
6. Mobile screens match web feature set for their domain
7. Accessibility: all interactive elements have labels
