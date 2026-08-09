# Fynvita — Comprehensive Pre-Beta Review Roadmap & Checklist

> **Prepared by:** Manus AI (Senior SWE & Technical Co-Founder)
> **Date:** April 27, 2026
> **Audience:** Claude Code (Autonomous Execution Agent)
> **Canonical Reference:** `docs/ssot/SSOT.md` | `docs/PRODUCTION-READINESS-TASKLIST.md` | `CLAUDE.md`
> **Scope:** Website (marketing), Web Application (dashboard), Mobile App (Expo/React Native), Backend API, Trading Engine, Security, Design & Polish
> **Goal:** Identify every bug, missing feature, mock-data leak, integration gap, and security vulnerability before staging deployment and beta testing. Produce a definitive, evidence-backed fix list with code-level patches.

---

## How to Use This Document

This document is structured as an ordered sequence of review phases. Claude Code must execute each phase in order, completing all checklist items before advancing. Each item includes:

- **What to check** — the specific file(s), logic, or behaviour to audit
- **Evidence** — the source document and line reference that defines the expected behaviour
- **Verification method** — how to confirm the item passes or fails
- **Fix required** — the concrete action to take if the item fails

At the end of each phase, Claude Code must produce a **Phase Summary Report** listing all findings, their severity (P0/P1/P2/P3), and the fix status (Fixed / Deferred / Not Applicable).

---

## Pre-Review Setup

Before beginning any phase, Claude Code must complete the following setup steps.

```bash
# 1. Confirm working directory
cd /Users/kimalhonourdjam/Documents/Projects/Github\ Projects/Fynvita

# 2. Check git state
git status
git log --oneline -10

# 3. Run the quality gate baseline (record current state)
npx tsc --noEmit 2>&1 | tail -5
npm test -- --no-coverage 2>&1 | tail -10
npm run build 2>&1 | tail -5
npm audit 2>&1 | tail -5

# 4. Record baseline metrics in a file called REVIEW_BASELINE.md
```

The baseline metrics serve as the "before" snapshot. Every fix must maintain or improve these numbers.

---

## Phase 1: Environment & Configuration Readiness

**Objective:** Verify that the application is correctly configured to run in a staging environment with graceful degradation for any missing API keys.

**Evidence:** `docs/CREDENTIALS_COOKBOOK.md`, `CLAUDE.md §7`, `docs/ssot/SSOT.md §12`

### 1.1 Environment Variable Completeness

| Check | File | Expected | Verification |
|-------|------|----------|-------------|
| All required env vars are documented | `.env.local.example` / `.env.production.example` | Every variable in `SSOT.md §12` is present | Diff the example files against the SSOT env var table |
| No secrets committed to git | `.gitignore` | `.env.local`, `.env`, `.env.production` are all gitignored | `git ls-files | grep env` must return empty |
| `NEXT_PUBLIC_` vars are client-safe | All `NEXT_PUBLIC_*` usages | No server-only secrets (service role key, Stripe secret, etc.) are prefixed `NEXT_PUBLIC_` | `grep -r "NEXT_PUBLIC_SUPABASE_SERVICE" src/` must return empty |
| Mobile env vars use `EXPO_PUBLIC_` prefix | `mobile-app/.env` | Supabase URL and anon key use `EXPO_PUBLIC_` prefix | Inspect `mobile-app/src/lib/supabase.ts` |

### 1.2 Graceful Degradation (No API Keys)

For each external service, verify that the application does not crash when the corresponding API key is absent.

- [ ] **AIML API (`AIML_API_KEY`):** When missing, all AI endpoints must return a structured error (`{ error: "AI service unavailable", code: "AI_UNAVAILABLE" }`) with HTTP 503, not a 500 crash. Verify in `src/lib/aiml-service.ts`.
- [ ] **Stripe (`STRIPE_SECRET_KEY`):** When missing, the checkout flow must display a user-facing error ("Payment service temporarily unavailable") rather than crashing. Verify in `src/lib/payment/` and `/api/payment/` routes.
- [ ] **AWS S3 (`AWS_ACCESS_KEY_ID`):** When missing, document upload must return a graceful error. Verify in `src/lib/documents/` and `/api/documents/` routes.
- [ ] **Plaid (`PLAID_CLIENT_ID`):** When missing, bank linking must show "Bank linking is not available in your region or plan" rather than a crash. Verify in `src/lib/financial/plaid-service.ts`.
- [ ] **Alpaca (`ALPACA_API_KEY`):** When missing, trading features must fall back to paper trading mode only, with a clear UI indicator. Verify in `src/lib/trading/brokers/alpaca-broker.ts`.
- [ ] **Resend (`RESEND_API_KEY`):** When missing, email sending must fail silently (log the error) and not block the user action that triggered it. Verify in `src/lib/email/`.

### 1.3 Staging Environment Configuration

- [ ] Verify `vercel.json` is correctly configured for staging deployment.
- [ ] Confirm `next.config.js` environment variable validation does not throw at build time when optional keys are missing.
- [ ] Check that `NODE_ENV=production` does not expose development-only routes or debug endpoints.

---

## Phase 2: Database & Schema Integrity

**Objective:** Ensure the Supabase database schema is complete, all migrations are valid, and Row-Level Security (RLS) policies are correctly applied to every table.

**Evidence:** `docs/ssot/system_blueprint.md §6`, `supabase/migrations/`, `docs/PRODUCTION-READINESS-TASKLIST.md T3-03`

### 2.1 Migration Completeness

- [ ] Count migration files: `ls supabase/migrations/ | wc -l`. The SSOT references 30 migrations. Confirm all are present.
- [ ] Verify the following critical tables exist in the migration files (grep for `CREATE TABLE`):
  - `users`, `profiles`, `credit_reports`, `disputes`
  - `trading_strategies`, `trading_signals`, `trading_orders`, `trading_positions`
  - `trading_journal`, `paper_trading_accounts`, `autonomous_trading_settings`
  - `autonomous_trading_log`, `trading_alerts`, `trading_watchlists`
  - `ai_provider_health`, `ai_audit_log`, `market_regimes`
  - `savings_goals`, `financial_chat`, `gamification`
  - `subscriptions`, `marketplace_orders`, `vitality_scores`
  - `webauthn_credentials`, `web_push_subscriptions`, `onboarding_progress`
  - `strategy_lifecycle` (referenced in T3-03 — verify it exists or create the migration)
- [ ] **Sprint 2/5/10 Tables:** Verify that tables referenced by the Strativion trading package (e.g., `kill_switch_events`, `dual_control_approvals`) are present in migrations.

### 2.2 Row-Level Security (RLS)

- [ ] For every table listed above, verify that RLS is enabled (`ALTER TABLE ... ENABLE ROW LEVEL SECURITY`) in the migration files.
- [ ] Verify that user-owned tables (e.g., `disputes`, `savings_goals`, `trading_orders`) have a policy restricting access to `auth.uid() = user_id`.
- [ ] Verify that admin-only tables have policies requiring `role = 'admin'` or `role = 'super_admin'`.
- [ ] Verify that `trading_signals` and `autonomous_trading_log` have read-only policies for regular users (no direct write access).

### 2.3 Indexes & Performance

- [ ] Verify that foreign key columns (`user_id`, `strategy_id`, `order_id`) have indexes in the migration files.
- [ ] Verify that frequently queried columns (e.g., `disputes.status`, `trading_orders.status`, `notifications.read`) have indexes.

---

## Phase 3: Backend API Audit (284 Routes Across 42 Domains)

**Objective:** Verify that every API route correctly implements the standard pattern: Authenticate → Authorize (RBAC) → Validate Input → Business Logic → Audit Log → Response.

**Evidence:** `docs/ssot/system_blueprint.md §4`, `CLAUDE.md §5`, `src/app/api/`

### 3.1 Authentication Enforcement

Run the following audit across all API routes:

- [ ] **No Unauthenticated Access to Protected Routes:** Every route under `src/app/api/` (except `/api/auth/*`, `/api/health`, and `/api/csrf`) must call the auth middleware. Use grep to find routes that do not import or call `withAuth` or equivalent:
  ```bash
  grep -rL "withAuth\|getServerSession\|createClient\|auth-middleware" src/app/api/ --include="route.ts"
  ```
  Any file returned by this command is a potential unauthenticated endpoint and must be audited manually.

- [ ] **Admin Routes:** All routes under `src/app/api/admin/` must enforce `admin` or `super_admin` role. Verify via:
  ```bash
  grep -rL "admin\|super_admin\|RBAC\|requireRole" src/app/api/admin/ --include="route.ts"
  ```

### 3.2 Input Validation

- [ ] **Zod Schemas:** Verify that POST/PUT/PATCH routes validate request bodies with Zod schemas. Use grep to find routes that parse `request.json()` without subsequent Zod validation:
  ```bash
  grep -rn "request.json()" src/app/api/ --include="route.ts" | grep -v "safeParse\|parse\|validate"
  ```
- [ ] **Prompt Injection Defence:** Verify that all AI-facing routes (`/api/ai/*`, `/api/chat/*`) call `input-validation.ts` prompt injection detection before passing user content to the AIML service.

### 3.3 Rate Limiting

- [ ] Verify that `rate-limiter.ts` or `rate-limiting.ts` is applied to all AI endpoints and high-frequency endpoints (trading signals, market data).
- [ ] Verify the rate limits per tier match the specification in `system_blueprint.md §4.4` (Free: 30 req/min, Premium: 120 req/min).

### 3.4 Critical Domain Audits

For each of the following domains, perform a targeted audit:

**Trading (`/api/trading/*`):**
- [ ] `/api/trading/orders` — Verify order creation validates symbol, quantity, side, and order type. Confirm it checks the user's trading mode (WATCH/GUIDED/AUTONOMOUS) before executing.
- [ ] `/api/trading/signals` — Verify signals are only returned to `premium` or higher roles.
- [ ] `/api/trading/paper` — Verify paper trading accounts are isolated per user and cannot affect live accounts.
- [ ] `/api/trading/strategies` — Verify custom strategy creation validates the JSONB rules schema.

**Financial (`/api/financial/*`):**
- [ ] `/api/financial/goals` — Verify CRUD operations are RLS-protected and return only the authenticated user's goals.
- [ ] `/api/financial/plaid/*` — Verify Plaid webhook signature verification (HMAC-SHA256) is implemented.
- [ ] `/api/financial/budgets/*` — Verify budget calculations are server-side and not manipulable via client input.

**Payment (`/api/payment/*`):**
- [ ] `/api/payment/webhook` — Verify Stripe webhook signature verification (`stripe.webhooks.constructEvent`) is the first operation, before any database writes.
- [ ] `/api/payment/checkout` — Verify the checkout session creates a Stripe customer and links it to the Supabase user record.
- [ ] Verify that subscription tier changes are processed via webhook, not via direct API calls from the client.

**AI (`/api/ai/*`):**
- [ ] `/api/ai/chat` — Verify output validation (PII filtering, content moderation) is applied to AI responses before returning to the client.
- [ ] `/api/ai/dispute-generator` — Verify the generated dispute letter is sanitised and does not contain hallucinated legal citations.

**Admin (`/api/admin/*`):**
- [ ] `/api/admin/users` — Verify this route supports pagination (`page`, `limit` query params) and does not return all users in a single unbounded query.
- [ ] `/api/admin/analytics` — Verify analytics data is aggregated and does not expose individual user PII.

### 3.5 Missing API Endpoints

Verify that the following endpoints, referenced in the codebase but potentially missing, are implemented:

- [ ] `/api/investments/dividends` — Dividend tracking endpoint (referenced in `T3-02`).
- [ ] `/api/gamification/leaderboard` — Leaderboard endpoint (referenced in `T3-01`).
- [ ] `/api/financial/goals/optimizations` — Referenced in older test files.
- [ ] `/api/financial/spending/ai-insights` — Referenced in older test files.

---

## Phase 4: Frontend Web Application Audit (199 Pages, 309 Components)

**Objective:** Verify that every web page renders correctly, uses real data from the API layer, and meets design and accessibility standards.

**Evidence:** `docs/ssot/system_blueprint.md §3`, `docs/ssot/ui_design.md`, `src/app/`, `src/components/`

### 4.1 Landing Page & Marketing Site

- [ ] **Landing Page (`src/app/page.tsx`):** Verify it renders without errors, loads within 3 seconds, and correctly links to `/login`, `/register`, `/pricing`, and `/features`.
- [ ] **Pricing Page (`src/app/pricing/page.tsx`):** Verify all 6 tiers are displayed with correct prices ($0, $29.99, $99.99, $159.99, $199.99, $399.99). Verify the "Get Started" CTA routes to the correct Stripe checkout flow.
- [ ] **Features Page (`src/app/features/page.tsx`):** Verify all major feature categories are represented (Credit Repair, Financial Intelligence, Trading, Marketplace).
- [ ] **About, Privacy Policy, Terms of Service:** Verify these pages exist and are accessible without authentication.
- [ ] **Branding Consistency:** Run a grep for legacy brand names and replace them:
  ```bash
  grep -rn "CreditMaster\|CPFI\|Credit Pro\|CreditMaster Pro" src/app/ src/components/ --include="*.tsx" --include="*.ts"
  ```
  All occurrences must be replaced with "Fynvita".

### 4.2 Authentication Flow

- [ ] **Login (`src/app/login/page.tsx` or `src/app/auth/login/`):** Verify email/password login, OAuth (if configured), and MFA challenge flow.
- [ ] **Registration:** Verify the registration form validates email format, password strength, and terms acceptance.
- [ ] **Password Reset:** Verify the forgot-password flow sends a Resend email and the reset link correctly updates the password in Supabase.
- [ ] **Session Persistence:** Verify that refreshing the page does not log the user out (SSR cookie-based sessions via `@supabase/ssr`).
- [ ] **Protected Route Redirect:** Verify that unauthenticated access to `/dashboard`, `/investments`, `/trading`, and other protected routes redirects to `/login`.

### 4.3 Dashboard & Core Financial Features

- [ ] **Dashboard (`src/app/dashboard/page.tsx`):** Verify the financial health score, recent transactions, budget summary, and goal progress widgets all render with real data.
- [ ] **Credit Score (`src/app/credit/`):** Verify the credit score display, score history chart, and factor breakdown are wired to the credit service.
- [ ] **Budgeting (`src/app/budgeting/`):** Verify budget creation, editing, and the AI budget optimizer function end-to-end.
- [ ] **Disputes (`src/app/disputes/`):** Verify the 6-step wizard (bureau select → dispute type → item selection → message customization → review → complete) is fully functional.
- [ ] **Goals (`src/app/goals/`):** Verify goal creation, progress tracking, and contribution flow.
- [ ] **Investments (`src/app/investments/`):** Verify holdings display, stock research, portfolio analytics, and rebalancing recommendations.
- [ ] **Trading (`src/app/trading/`):** Verify the trading dashboard, paper trading mode, strategy library, and order management.

### 4.4 Challenges & Gamification (Web)

- [ ] **Challenges Page (`src/app/challenges/page.tsx`):** Verify this page fetches from `/api/gamification/quests?type=challenge` instead of using the `MOCK_CHALLENGES` array (referenced in `T2-03`).
- [ ] **Leaderboard (`src/app/leaderboard/page.tsx`):** Verify this page exists and fetches from `/api/gamification/leaderboard` (referenced in `T3-01`).
- [ ] **Rewards/Badges:** Verify the rewards page displays real user XP, level, and earned badges.

### 4.5 Admin Panel

- [ ] **Users Page (`src/app/admin/users/page.tsx`):** Verify this page fetches from `/api/admin/users` with pagination, search, and filter support — not from a `mockUsers` array (referenced in `T2-01`).
- [ ] **Analytics Dashboard:** Verify the admin analytics page displays real aggregated metrics.
- [ ] **System Configuration:** Verify admin settings are persisted to the database, not held in memory.

### 4.6 Design & Polish

- [ ] **Responsive Design:** Verify all pages render correctly at breakpoints: 375px (mobile), 768px (tablet), 1280px (desktop), 1920px (wide).
- [ ] **Dark Mode:** Verify dark mode toggle works and all components respect the theme.
- [ ] **Loading States:** Every page that fetches data must have a `loading.tsx` file or skeleton component. Verify the 33 `loading.tsx` files in `src/app/` cover all data-heavy pages.
- [ ] **Error States:** Every page must have an `error.tsx` boundary. Verify the 33 `error.tsx` files cover all critical pages.
- [ ] **Empty States:** Pages with lists (transactions, disputes, goals, positions) must show a meaningful empty state message when no data exists.
- [ ] **Accessibility (WCAG 2.1 AA):** Run an axe accessibility audit on the 5 most critical pages (dashboard, credit, disputes, investments, trading). All interactive elements must have ARIA labels.

---

## Phase 5: Mobile Application Audit (257 Routes, 37 Route Groups)

**Objective:** Verify the mobile app achieves feature parity with the web application for all core flows, uses real API data, and provides a polished, production-ready experience.

**Evidence:** `docs/PRODUCTION-READINESS-TASKLIST.md T1-01 through T2-05`, `docs/ssot/SSOT.md §14.5`

### 5.1 Authentication & Onboarding

- [ ] **Auth Flow (`mobile-app/app/(auth)/`):** Verify login, registration, and password reset work via Supabase Auth.
- [ ] **Onboarding (`mobile-app/app/onboarding/`):** Verify the onboarding flow saves progress and can be resumed.
- [ ] **Session Management:** Verify that the Zustand `authStore` correctly persists the session token and refreshes it before expiry.

### 5.2 Marketplace Screens (12 Screens — P0 Critical)

All 12 screens in `mobile-app/app/marketplace/` currently use hardcoded arrays. Each must be fixed:

- [ ] **`index.tsx`** — Fetch categories from `/api/marketplace/products` via `marketplaceStore`.
- [ ] **`secured-cards.tsx`** — Wire to credit-card-matcher API with eligibility check based on user credit score.
- [ ] **`consolidation.tsx`** — Wire to `/api/marketplace/products?category=loans`, replace Google search link with real offer links.
- [ ] **`tradelines.tsx`** — Wire to tradeline-service API, replace mock purchase flow.
- [ ] **`attorneys.tsx`** — Wire to provider-service API with verified attorney listings.
- [ ] **`coaching.tsx`** — Wire to provider-service API for coach listings, add real booking flow.
- [ ] **`monitoring-services.tsx`** — Wire to offer-service for monitoring plan comparison.
- [ ] **`analysis.tsx`** — Wire to offer-service for analysis packages.
- [ ] **`services.tsx`** — Wire to marketplace-service for credit repair services.
- [ ] **`education.tsx`** — Wire to marketplace-service for course catalog.
- [ ] **`community.tsx`** — Wire to real forum/community API or mark as "Coming Soon" with waitlist.
- [ ] **`calculators.tsx`** — Verify calculators use real financial data or are clearly labelled as illustrative tools.
- [ ] **All 12 screens** must have loading skeletons, error states, and empty states.
- [ ] **Compliance Disclosures:** Verify APR, terms, and affiliate disclosures are displayed where required.

### 5.3 Investment & Trading Screens (P0 Critical)

- [ ] **`investments/research.tsx`** — Symbol search + analysis tabs (technical, fundamental, sentiment). Wire to `investmentsApi.analyzeStock()`.
- [ ] **`investments/rebalance.tsx`** — Allocation drift display, target vs current, trade recommendations. Wire to `investmentStore.analyzePortfolio()`.
- [ ] **`investments/performance.tsx`** — Period returns (1D/1W/1M/3M/1Y/ALL), Sharpe, max drawdown, benchmark comparison.
- [ ] **`investments/dividends.tsx`** — Dividend income tracker. Wire to `/api/investments/dividends`.
- [ ] **`trading/backtest.tsx`** — Backtest results listing with equity curves. Wire to `/api/trading/backtest`.
- [ ] **`trading/strategies/index.tsx`** — Strategy library grid with search/filter. Wire to `/api/trading/strategies`.
- [ ] **`trading/strategies/[id].tsx`** — Strategy detail with rules, performance, backtest results.
- [ ] **`tradingStore.fetchTradeHistory()`** — Remove mock data fallback (lines 489-556). Use real API.
- [ ] **`tradingStore.fetchTradeStats()`** — Remove mock fallback (lines 570-573). Use real API.

### 5.4 Goals Flow (P0 Critical)

- [ ] **`financial/goals.tsx`** — Replace `MOCK_GOALS` array with `useGoalStore().fetchGoals()`. Add pull-to-refresh, loading skeleton, empty state.
- [ ] **`financial/goals/create.tsx`** — Goal creation form wired to `goalStore.createGoal()`.
- [ ] **`coach/goals.tsx`** — Wire to goalStore instead of mock data.
- [ ] **`coach/goal-detail.tsx`** — Wire to goalStore for individual goal. Add contribution button.
- [ ] **Dashboard Home Tab** — Add goal progress widget showing top 3 goals with progress bars.

### 5.5 AI Chat (P1 High)

- [ ] **`chat/index.tsx`** — Replace hardcoded `responses` map with real API call to `/api/ai/chat`. Implement streaming response, typing indicator, retry on error, and conversation persistence.

### 5.6 Gamification (P1 High)

- [ ] **`rewards/quests.tsx`** — Fix quest type transformation (line 68-71) to correctly map daily/weekly/challenge types. Wire `completeQuest()` to real API.
- [ ] **`gamificationStore.ts`** — Ensure production path (non-`__DEV__`) fetches from real API, not seed data.

### 5.7 Dispute Wizard (P1 High)

- [ ] **`dispute/create.tsx`** — Add item selection step (fetch user's report items from credit API).
- [ ] Add message customization step with AI-generated letter and user edits.
- [ ] Add review/confirmation step before submission.
- [ ] **`dispute/wizard.tsx`** — Replace 12-line redirect with proper wizard navigation or remove and route directly to enhanced create screen.

### 5.8 Notification Preferences (P1 High)

- [ ] **`settings/notification-preferences.tsx`** — Create this screen with 6 notification types (Credit Alerts, Dispute Updates, Bill Reminders, Goal Milestones, Trading Signals, Security Alerts), Email/Push/SMS toggles, and quiet hours.
- [ ] Wire to `/api/notifications/preferences`.
- [ ] Add navigation link from `notifications/index.tsx` to preferences screen.

### 5.9 Admin Panel (P1 High)

- [ ] **`admin/users.tsx`** — Replace `mockUsers` array with fetch from `/api/admin/users`. Add pagination, search, and filter.

### 5.10 Mobile Design & Polish

- [ ] **Consistent Spacing & Typography:** Verify all screens use the design token system (spacing, font sizes, colours) defined in `docs/ssot/ui_design.md`.
- [ ] **Loading States:** Every screen that fetches data must show a skeleton or spinner while loading.
- [ ] **Error Handling:** Every API call must have a `catch` block that displays a user-friendly error message (not a raw error object).
- [ ] **Empty States:** Lists (transactions, disputes, goals, positions) must show meaningful empty state messages.
- [ ] **Navigation Consistency:** Verify that the back button, tab bar, and deep links all function correctly across all 37 route groups.
- [ ] **Dark Mode:** Verify dark mode is implemented consistently across all mobile screens.

---

## Phase 6: Trading Engine & Risk Management (Mission Critical)

**Objective:** Validate the correctness, completeness, and safety of the Strativion PCTT trading engine. This is the highest-risk component of the platform.

**Evidence:** `docs/strativion-autonomous-trading-package/`, `docs/FYNVITA-PCTT-TRADING-SYSTEM.md`, `src/lib/trading/`, `docs/PRODUCTION-READINESS-TASKLIST.md T3-04, T3-05`

### 6.1 PCTT Pipeline Integrity (7 Stages)

- [ ] **FP-01 Regime Detection:** Verify `regime-detector.ts` correctly classifies market regimes (trending/ranging/volatile/breakout) using ADX, ATR, and Bollinger width. Verify the output includes a confidence score (0-100).
- [ ] **FP-02 Pivot Identification:** Verify fractal analysis with volume confirmation correctly identifies swing highs and lows. Verify pivots are confirmed with lag (non-repainting).
- [ ] **FP-03 Trendline Construction (CRITICAL):**
  - Verify RANSAC-style consensus validation is implemented (minimum inlier consensus of 3 pivots).
  - Verify boundary hysteresis is implemented (only accept new best line if score exceeds current by `HYSTERESIS_DELTA`).
  - Verify minimum line life (line must persist M bars before being tradable).
- [ ] **FP-04 Signal Generation:** Verify breakout/bounce/compression detection logic. Verify non-PCTT strategies (Mean Reversion, Wyckoff, etc.) correctly inject signals at this stage.
- [ ] **FP-05 Confluence Scoring:** Verify the confluence score (0-100) aggregates volume, momentum, structure, and AI agent inputs correctly. Verify the `ConsensusArbiterAgent` resolves disagreements between agents.
- [ ] **FP-06 Risk Assessment (3-Gate + 5 Circuit Breakers):**
  - **Gate 1 (Pre-Trade Compliance):** Verify the 30-Law compliance engine scores every signal and blocks signals below the threshold (default 60).
  - **Gate 2 (Risk Limits):** Verify Kelly Criterion position sizing, exposure caps, and correlation checks are applied.
  - **Gate 3 (Execution Gate):** Verify liquidity check, slippage estimate, and market hours validation.
  - **Circuit Breaker — Daily Loss (2%):** Verify the breaker triggers correctly and resets at the next trading day.
  - **Circuit Breaker — Weekly Loss (5%):** Verify the breaker triggers and resets on Monday open.
  - **Circuit Breaker — Monthly Loss (10%):** Verify the breaker triggers and resets on the 1st of the month.
  - **Circuit Breaker — Consecutive Losses (5 trades):** Verify the breaker requires manual review and reset.
  - **Circuit Breaker — Single Position (3%):** Verify the breaker auto-closes the position.
- [ ] **FP-07 Trade Recommendation:** Verify the output format includes entry price, exit target, stop-loss, and position size. Verify routing to the correct mode handler (WATCH/GUIDED/AUTONOMOUS).

### 6.2 Operating Mode Graduation

- [ ] **WATCH → GUIDED Graduation:** Verify graduation requires 30 paper trades, positive expectancy, and 30 days minimum. Verify the graduation check is server-side and cannot be bypassed by the client.
- [ ] **GUIDED → AUTONOMOUS Graduation:** Verify graduation requires 30 live trades, positive expectancy, and compliance score ≥ 60. Verify the graduation check is server-side.
- [ ] **Mode Downgrade:** Verify that triggering a circuit breaker in AUTONOMOUS mode automatically downgrades to GUIDED mode and notifies the user.

### 6.3 AI Trading Agents (7 Agents)

- [ ] **SentimentAgent:** Verify it correctly processes social media and news sentiment and returns a score.
- [ ] **RegimeConfirmationAgent:** Verify it validates regime detection output with AI reasoning.
- [ ] **NewsImpactAgent:** Verify it assesses breaking news impact and can block signals during high-impact events.
- [ ] **SignalExplainerAgent:** Verify it generates human-readable trade explanations for every signal.
- [ ] **RiskNarrativeAgent:** Verify it generates a risk factor narrative for the user before GUIDED mode confirmation.
- [ ] **EarningsAnalysisAgent:** Verify it adjusts signals around earnings dates.
- [ ] **ConsensusArbiterAgent:** Verify it resolves disagreements between agents and produces a final consensus score.
- [ ] **Multi-Provider Fallback:** Verify the fallback chain (AIML API → Anthropic → OpenAI → xAI) is correctly implemented with circuit breakers per provider.

### 6.4 Strativion Module Integration

The following modules from the Strativion package must be verified as wired into the live trading pipeline:

- [ ] **`gate-runner.ts`** — Must be called in pre-trade admission (before risk gateway) in signal/order API routes.
- [ ] **`regime-detector.ts`** — Must be called in signal pipeline; signals mismatched to regime must be rejected.
- [ ] **`portfolio-heat.ts`** — Must be called in risk gateway; trades exceeding heat budget must be rejected.
- [ ] **`pre-market-checklist.ts`** — Must run on trading service startup.
- [ ] **`htf-alignment.ts`** — Must filter signals that do not align with the higher timeframe trend.

### 6.5 Canonical Policy & Audit Trail

- [ ] Verify `validateCurrentPolicy()` is called on application startup (in trading service initialization).
- [ ] Verify the canonical policy hash is passed to `audit-trail.ts` on every trade decision.
- [ ] Verify the audit trail entries include: timestamp, user ID, signal ID, canonical policy hash, gate scores, and final decision (approved/rejected).

### 6.6 Paper Trading Isolation

- [ ] Verify paper trading accounts (`paper_trading_accounts` table) are completely isolated from live trading accounts.
- [ ] Verify paper trades do not trigger real broker API calls.
- [ ] Verify slippage modelling in `slippage-model.ts` produces realistic fill prices for paper trades.

### 6.7 30-Law Compliance Engine

- [ ] Verify all 30 laws are implemented and scored for each signal.
- [ ] Verify the compliance threshold is configurable per user (default 60).
- [ ] Verify that signals below the threshold are blocked and the reason is logged.
- [ ] Verify Pattern Day Trader (PDT) rule is enforced for accounts under $25,000.

---

## Phase 7: Security Architecture Audit

**Objective:** Validate the 5-layer security architecture is correctly implemented and that no security vulnerabilities exist in the production code paths.

**Evidence:** `docs/ssot/system_blueprint.md §5`, `src/lib/security/`, `docs/ssot/SSOT.md §15`

### 7.1 Layer 1 — Middleware (Security Headers)

- [ ] Verify `next.config.js` sets the following security headers on all responses:
  - `Content-Security-Policy` (CSP)
  - `Strict-Transport-Security` (HSTS)
  - `X-Frame-Options: DENY`
  - `X-Content-Type-Options: nosniff`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `Permissions-Policy`
- [ ] Verify CORS is configured to allow only the production domain and localhost in development.

### 7.2 Layer 2 — Input Validation

- [ ] Verify `src/lib/security/input-validation.ts` is imported and called in all AI-facing routes.
- [ ] Verify prompt injection detection patterns cover common injection techniques (e.g., "Ignore previous instructions", role-playing attacks, base64-encoded payloads).
- [ ] Verify XSS sanitisation is applied to all user-provided text that is stored in the database and rendered in the UI.
- [ ] Verify payload size limits are enforced (reject requests exceeding the defined limit).

### 7.3 Layer 3 — Auth & RBAC

- [ ] Verify the 4-role system is correctly enforced across all 42 API domains.
- [ ] Verify that `premium` features (trading, investments, bill negotiation) are blocked for `user` (free tier) accounts.
- [ ] Verify that `admin` routes are blocked for `premium` and `user` accounts.
- [ ] Verify JWT token expiry is handled gracefully (redirect to login, not a crash).
- [ ] Verify MFA (Multi-Factor Authentication) is supported and enforced for admin accounts.

### 7.4 Layer 4 — Output Validation

- [ ] Verify `src/lib/security/output-validation.ts` is applied to all AI-generated responses.
- [ ] Verify PII detection patterns cover: SSN, credit card numbers, bank account numbers, phone numbers, email addresses, and dates of birth.
- [ ] Verify that PII is masked in API responses (e.g., `***-**-1234` for SSN) and only the full value is accessible via explicitly authorised endpoints.

### 7.5 Layer 5 — Audit Logging

- [ ] Verify `src/lib/security/audit-logging.ts` is called after every significant action (login, logout, data access, trade execution, admin action).
- [ ] Verify audit logs are persisted to Supabase (not just in-memory) with the hybrid persistence pattern.
- [ ] Verify audit logs include: timestamp, user ID, action type, resource ID, IP address, and outcome.

### 7.6 Known Security Issues (from `system_blueprint.md §5.4`)

These open security findings must be addressed before beta:

- [ ] **SEC-01 (Medium) — Rate Limiting:** Verify the hybrid persistence pattern (in-memory + Supabase batch writes) is implemented in `rate-limiting.ts` to survive server restarts. If Redis is available, migrate to `redis-rate-limiting.ts`.
- [ ] **SEC-02 (Low) — Audit Logs:** Verify audit logs are persisted to Supabase (not just in-memory).
- [ ] **SEC-03 (Medium) — JWT Secret Rotation:** Verify a process exists for rotating JWT secrets without invalidating all active sessions.
- [ ] **SEC-05 (Medium) — No IP Blocking:** Verify that the rate limiter can block IPs exceeding abuse thresholds.
- [ ] **SEC-06 (Low) — Email Verification:** Verify that email verification is enforced before users can access premium features.
- [ ] **SEC-07 (Medium) — WebSocket Rate Limiting:** Verify that WebSocket connections (market data, order status) are rate-limited.

### 7.7 GDPR/CCPA Compliance

- [ ] Verify the data export endpoint (`/api/user/export` or equivalent) correctly exports all user data in a portable format.
- [ ] Verify the account deletion endpoint correctly purges all user data from Supabase (including trading history, disputes, and financial data).
- [ ] Verify consent management is implemented and consent records are stored.

---

## Phase 8: Integration Wiring Verification

**Objective:** Verify that all external service integrations are correctly wired, even in the absence of live API keys. The service layer must exist, be properly structured, and handle missing keys gracefully.

**Evidence:** `docs/CREDENTIALS_COOKBOOK.md`, `CLAUDE.md §7`, `docs/ssot/SSOT.md §11`

### 8.1 Supabase (Critical — App-Breaking if Missing)

- [ ] Verify `@supabase/supabase-js` client is initialised correctly (no deprecated `src/lib/supabase.ts` wrapper — this was deleted per CLAUDE.md).
- [ ] Verify `@supabase/ssr` is used for server-side session management.
- [ ] Verify real-time subscriptions (`useRealtimeUpdates`) are correctly set up for dashboard live updates.

### 8.2 Stripe (Payment Processing)

- [ ] Verify the checkout flow creates a Stripe Checkout Session with the correct price ID for the selected tier.
- [ ] Verify the webhook handler (`/api/payment/webhook`) processes `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_succeeded`, and `invoice.payment_failed`.
- [ ] Verify subscription status is correctly reflected in the user's Supabase profile after a webhook event.

### 8.3 Plaid (Bank Linking)

- [ ] Verify `plaid-service.ts` uses the official Plaid Node.js SDK (not direct HTTP calls).
- [ ] Verify the Plaid Link flow is implemented for web (using Plaid Link JS) and mobile (using Expo WebView + OAuth redirect).
- [ ] Verify webhook signature verification (HMAC-SHA256) is implemented in the Plaid webhook handler.
- [ ] Verify transaction sync correctly maps Plaid transaction categories to Fynvita's internal categories.

### 8.4 Alpaca (Trading Broker)

- [ ] Verify `alpaca-broker.ts` correctly implements the `BrokerInterface` contract.
- [ ] Verify paper trading mode uses Alpaca's paper trading environment (not live).
- [ ] Verify order status updates are received via WebSocket and reflected in the UI in real time.

### 8.5 DriveWealth (Fractional Trading)

- [ ] Verify `DriveWealthBrokerAdapter` is implemented and correctly implements `BrokerInterface`.
- [ ] Verify the `BrokerRouter` correctly selects DriveWealth for fractional/notional orders and Alpaca for standard orders.
- [ ] Verify the KYC/account opening flow is implemented for DriveWealth accounts.

### 8.6 AIML API (AI Engine)

- [ ] Verify the 3-layer AI architecture (`AIMLService` → `ModelRouter` → `AIOrchestrator`) is correctly wired.
- [ ] Verify the `ModelRouter` correctly selects models by task type (reasoning, fast, image, voice).
- [ ] Verify the multi-provider fallback chain (AIML → Anthropic → OpenAI → xAI) is implemented with circuit breakers.

### 8.7 AWS S3 (Document Storage)

- [ ] Verify presigned URL generation for document uploads uses 7-day expiration.
- [ ] Verify document metadata is stored in Supabase after a successful S3 upload.
- [ ] Verify document access is restricted to the owning user via RLS.

### 8.8 Resend (Email)

- [ ] Verify all transactional email templates exist and are correctly formatted:
  - Welcome email
  - Password reset
  - Dispute status update
  - Payment receipt
  - Bill negotiation result
  - Trading alert (GUIDED mode)
- [ ] Verify email sending fails silently (no user-blocking error) when Resend is unavailable.

---

## Phase 9: Testing Infrastructure & Coverage

**Objective:** Ensure the test suite is comprehensive, all tests pass, and coverage meets the defined thresholds.

**Evidence:** `CLAUDE.md §8`, `docs/ssot/SSOT.md §13`, `.claude/KNOWN_ISSUES.md`

### 9.1 Web Test Suite (Jest)

- [ ] Run `npm test -- --coverage` and verify:
  - 0 test failures
  - Overall coverage ≥ 80% (statements, branches, functions, lines)
  - Trading domain coverage ≥ 80%
  - Security/Auth domain coverage ≥ 80%
  - Financial services domain coverage ≥ 80%
- [ ] Verify the 19 skipped tests are all environment-dependent (live API keys) and not flaky.

### 9.2 Mobile Test Suite (Jest)

- [ ] Run `cd mobile-app && npx jest --no-coverage` and verify 0 failures.
- [ ] Verify mobile test coverage is ≥ 50% (current state is ~14% — this is a known issue requiring new tests).
- [ ] Add store tests for all Zustand stores that currently lack tests (target: all 19 stores have tests).
- [ ] Add screen render tests for critical flows: auth, credit, disputes, financial intelligence.
- [ ] Update `mobile-app/jest.config.js` coverage thresholds from 14% to 50% (minimum for beta).

### 9.3 CI/CD Pipeline

- [ ] Verify `.github/workflows/ci.yml` runs: lint → type-check → unit tests → build → E2E tests → security audit.
- [ ] **Add mobile test job** to CI pipeline (currently missing — flagged in `.claude/KNOWN_ISSUES.md`).
- [ ] Verify Playwright E2E job does not have `continue-on-error: true` (or if it does, document the reason).
- [ ] Verify the CI pipeline blocks merges on test failures.

### 9.4 E2E Tests

- [ ] Run Cypress: `npx cypress run` — verify all 21 specs pass.
- [ ] Run Playwright: `npx playwright test` — verify all 16 specs pass.
- [ ] Verify the following critical path tests exist and pass:
  - CP-01: Auth flow (login → session → protected route)
  - CP-02: Payment checkout (Stripe checkout, webhook handling)
  - CP-03: Credit repair API (auth enforcement on all endpoints)
  - CP-04: Dispute lifecycle (create → send → review → resolve)
  - CP-05: AI chat (requires auth)
  - CP-06: Protected routes redirect to /login
  - CP-07: Public pages return 200
  - CP-08: Input validation (prompt injection, PII detection)
  - CP-09: Rate limiting (per-IP and per-user throttling)
  - CP-10: Document upload (S3 upload, validation, presigned URL)

---

## Phase 10: Performance & Build Optimisation

**Objective:** Verify the application meets performance standards for a production financial services platform.

**Evidence:** `docs/ssot/SSOT.md §14`, `next.config.js`, `CLAUDE.md §9`

### 10.1 Build Health

- [ ] Run `npm run build` and verify it completes with 0 errors.
- [ ] Verify the first load JS bundle is ≤ 539 kB (the baseline from CLAUDE.md).
- [ ] Verify no critical webpack warnings (circular dependencies, missing modules).

### 10.2 Type Safety

- [ ] Run `npx tsc --noEmit` and verify 0 type errors.
- [ ] Verify no `@ts-ignore` or `@ts-expect-error` comments exist in production code (only in test files where justified).

### 10.3 Lint

- [ ] Run `npm run lint` and verify 0 blocking errors (the 7 non-blocking ESLint errors are acceptable).
- [ ] Verify the 841 ESLint warnings are tracked and not growing (new code must not introduce new warnings).

### 10.4 Core Web Vitals

- [ ] Verify the landing page achieves a Lighthouse score ≥ 90 for Performance, Accessibility, and Best Practices.
- [ ] Verify the dashboard page achieves a Lighthouse score ≥ 80 for Performance.

### 10.5 Caching

- [ ] Verify market data responses include appropriate HTTP cache headers (`Cache-Control: public, max-age=60`).
- [ ] Verify financial context calculations are cached (Redis or Supabase) to avoid redundant computation.

---

## Phase 11: Documentation & Branding Consistency

**Objective:** Ensure all documentation is accurate, branding is consistent, and the codebase is ready for handoff to a beta testing team.

**Evidence:** `docs/gap-analysis.md TD-05, TD-06`, `CLAUDE.md §14`

### 11.1 Branding

- [ ] Run a comprehensive grep for legacy brand names across the entire codebase:
  ```bash
  grep -rn "CreditMaster\|CPFI\|Credit Pro\|CreditMaster Pro" . --include="*.tsx" --include="*.ts" --include="*.md" --exclude-dir=".git" --exclude-dir="node_modules"
  ```
  Replace all occurrences with "Fynvita" (except in archive documents and git history).

### 11.2 CLAUDE.md Accuracy

- [ ] Verify `CLAUDE.md` metrics match the current codebase state (file counts, test counts, API route counts).
- [ ] Update `CLAUDE.md` with any new known issues discovered during this review.

### 11.3 README

- [ ] Verify `README.md` contains accurate setup instructions, including the 4-service minimum viable dev setup.
- [ ] Verify the README references `docs/CREDENTIALS_COOKBOOK.md` for API key setup.

---

## Phase 12: Final Validation & Staging Readiness Gate

**Objective:** Execute the complete quality gate sequence and confirm the application is ready for staging deployment.

### 12.1 Quality Gate Sequence

Execute in order and record results:

```bash
# Gate 1: Lint
npm run lint
# Expected: 0 blocking errors

# Gate 2: Type Check
npx tsc --noEmit
# Expected: 0 errors

# Gate 3: Unit Tests
npm test -- --coverage
# Expected: 0 failures, ≥80% coverage

# Gate 4: Build
npm run build
# Expected: SUCCESS, ≤539 kB first load JS

# Gate 5: Security Audit
npm audit
# Expected: 0 production vulnerabilities

# Gate 6: E2E Tests (Web)
npx cypress run
npx playwright test
# Expected: All specs pass

# Gate 7: Mobile Type Check
cd mobile-app && npx tsc --noEmit
# Expected: 0 errors

# Gate 8: Mobile Tests
cd mobile-app && npx jest --no-coverage
# Expected: 0 failures
```

### 12.2 Staging Readiness Checklist

Before deploying to staging, confirm:

- [ ] All Phase 1–11 checklist items are completed or explicitly deferred with justification.
- [ ] All P0 (Critical) issues are resolved.
- [ ] All P1 (High) issues are resolved or have an approved workaround.
- [ ] P2 and P3 issues are documented in a backlog for post-beta resolution.
- [ ] The `REVIEW_BASELINE.md` file is updated with the final metrics.
- [ ] All environment variables for staging are configured in Vercel (or the staging deployment platform).
- [ ] Database migrations have been applied to the staging Supabase project.
- [ ] Stripe webhook endpoint is configured for the staging URL.
- [ ] A smoke test plan exists for the first 30 minutes after staging deployment.

---

## Deliverables Required from Claude Code

Upon completing all phases, Claude Code must produce the following artefacts:

| Deliverable | Description | Location |
|-------------|-------------|----------|
| `REVIEW_BASELINE.md` | Before/after quality metrics snapshot | Project root |
| `BETA_READINESS_REPORT.md` | Phase-by-phase findings, severity, and fix status | `docs/` |
| `DEFINITIVE_FIX_LIST.md` | Prioritised backlog of all remaining issues with file/line references | `docs/` |
| Code patches | Direct implementation of all P0 and P1 fixes | In-place code changes |
| Updated `CLAUDE.md` | Accurate metrics and known issues for the post-review state | Project root |

---

## Severity Definitions

| Severity | Label | Definition | Must Fix Before Beta? |
|----------|-------|------------|----------------------|
| P0 | Critical | App crash, data loss, security breach, or core feature completely non-functional | Yes |
| P1 | High | Major feature broken, mock data in production path, significant UX degradation | Yes |
| P2 | Medium | Minor feature gap, non-critical UI issue, missing enhancement | Recommended |
| P3 | Low | Cosmetic issue, documentation gap, non-blocking warning | No |

---

## Known Issues Acknowledged at Review Start

The following issues are already documented and must be addressed during this review:

| Issue | Severity | Source | Status |
|-------|----------|--------|--------|
| Mobile marketplace screens use hardcoded arrays | P0 | `PRODUCTION-READINESS-TASKLIST.md T1-01` | Must Fix |
| Missing mobile investment screens (research, rebalance, performance) | P0 | `PRODUCTION-READINESS-TASKLIST.md T1-02` | Must Fix |
| Mobile goals use `MOCK_GOALS` instead of goalStore | P0 | `PRODUCTION-READINESS-TASKLIST.md T1-03` | Must Fix |
| Admin users page uses `mockUsers` array | P1 | `PRODUCTION-READINESS-TASKLIST.md T2-01` | Must Fix |
| Mobile chat uses hardcoded responses | P1 | `PRODUCTION-READINESS-TASKLIST.md T2-02` | Must Fix |
| Gamification quests type mapping bug | P1 | `PRODUCTION-READINESS-TASKLIST.md T2-03` | Must Fix |
| Mobile dispute wizard is a 12-line redirect | P1 | `PRODUCTION-READINESS-TASKLIST.md T2-04` | Must Fix |
| No mobile notification preferences screen | P1 | `PRODUCTION-READINESS-TASKLIST.md T2-05` | Must Fix |
| Strativion modules not wired into live pipeline | P1 | `PRODUCTION-READINESS-TASKLIST.md T3-05` | Must Fix |
| Mobile test coverage at 14% (target 80%) | P1 | `.claude/KNOWN_ISSUES.md` | Partial Fix (50% minimum) |
| Mobile not in CI/CD pipeline | P1 | `.claude/KNOWN_ISSUES.md` | Must Fix |
| 841 ESLint warnings (legacy code) | P3 | `CLAUDE.md §12` | Track Only |
| Legacy brand names (CreditMaster, CPFI) | P2 | `docs/gap-analysis.md TD-05` | Must Fix |
| PCTT RANSAC consensus not implemented | P1 | `src/lib/trading/pctt/PCTT_AUDIT_REPORT.md` | Must Fix |
| PCTT boundary hysteresis not implemented | P1 | `src/lib/trading/pctt/PCTT_AUDIT_REPORT.md` | Must Fix |
| SEC-01: Rate limiting in-memory only | P1 | `system_blueprint.md §5.4` | Must Fix |
| SEC-03: JWT secret rotation not automated | P2 | `system_blueprint.md §5.4` | Document Process |
| SEC-07: WebSocket connections not rate-limited | P1 | `system_blueprint.md §5.4` | Must Fix |
| Dividends tracking endpoint missing | P2 | `PRODUCTION-READINESS-TASKLIST.md T3-02` | Must Fix |
| Web leaderboard page missing | P2 | `PRODUCTION-READINESS-TASKLIST.md T3-01` | Must Fix |

---

*End of Fynvita Pre-Beta Review Roadmap & Checklist*
*Prepared by Manus AI | April 27, 2026*
