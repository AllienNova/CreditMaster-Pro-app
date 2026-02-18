# Test Catalog — Fynvita Platform

> **Complete inventory of every test file, organized by framework and domain, with TestIDs for traceability.**
> Last Updated: 2026-02-16

---

## 1. Summary

| Framework                         | Files   | Approx. Test Cases | Coverage Focus                                              |
| --------------------------------- | ------- | ------------------ | ----------------------------------------------------------- |
| Jest (Web — `src/`)               | 149     | ~1,100+            | Unit + Integration: services, API routes, components, pages |
| Jest (Mobile — `mobile-app/src/`) | 12      | ~180               | Mobile components, stores, API clients, navigation          |
| Cypress (`cypress/e2e/`)          | 21      | ~240               | E2E: route protection, API auth enforcement, page workflows |
| Playwright (`e2e/`)               | 16      | ~167               | E2E: browser journeys, accessibility, investment flows      |
| **Total**                         | **198** | **~1,690+**        |                                                             |

---

## 2. TestID Convention

```
TST-{DOMAIN}-{SEQ}    (e.g., TST-AUTH-01, TST-CREP-14)
```

| Domain Code | Domain                                                                                                                                                | Files |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ----- |
| AUTH        | Authentication & Authorization                                                                                                                        | 1     |
| CREP        | Credit Repair (disputes, cards, negotiate, goodwill, reports, score, quick-wins, impact, integration, performance, letter generator, dispute service) | 19    |
| CMON        | Credit Monitoring & Builder                                                                                                                           | 3     |
| FINS        | Financial Suite (budgets, spending, goals, bills, AI insights, debt strategy, health score, recommendations, savings, transactions)                   | 23    |
| INVS        | Investment Platform (portfolio, allocation, analysis, comprehensive, services, hooks, integration, security)                                          | 23    |
| AIML        | AI/ML Services (chat, orchestrator, model router, consensus, financial coach, behavioral coach, score simulator, ML predictions)                      | 9     |
| MKTL        | Marketplace (providers, products, tradelines, reviews)                                                                                                | 5     |
| PAY         | Payment & Subscriptions (checkout, pricing, subscription service, billing profile)                                                                    | 5     |
| SLOAN       | Student Loans & Federal Programs (agent, federal integration, programs)                                                                               | 5     |
| TRAD        | Trading (PCTT core, PCTT validator, realtime, order execution, ML strategy)                                                                           | 5     |
| NOTF        | Notifications (API route, notification service)                                                                                                       | 2     |
| DOC         | Documents (document service)                                                                                                                          | 1     |
| ADMIN       | Admin                                                                                                                                                 | 2     |
| ONBRD       | Onboarding                                                                                                                                            | 1     |
| TAX         | Tax (bracket calculator, document generation)                                                                                                         | 2     |
| SEC         | Security & Validation (encryption, rate limiter, data validation)                                                                                     | 3     |
| PAGE        | Page Rendering                                                                                                                                        | 10    |
| COMP        | Shared UI Components                                                                                                                                  | 25    |
| MOB         | Mobile App                                                                                                                                            | 12    |
| CYP         | Cypress E2E                                                                                                                                           | 21    |
| PW          | Playwright E2E                                                                                                                                        | 16    |
| MISC        | Cross-Cutting & Miscellaneous (offline queue, connectivity, integration tests)                                                                        | 5     |

---

## 3. Jest — API Route Tests

### 3.1 Credit Repair Domain (CREP)

| TestID      | File                                                               | Describes                                                         | Cases | Scope                                                                                                                                                 |
| ----------- | ------------------------------------------------------------------ | ----------------------------------------------------------------- | ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| TST-CREP-01 | `src/app/api/credit-repair/disputes/__tests__/route.test.ts`       | GET /api/credit-repair/disputes, POST /api/credit-repair/disputes | ~12   | List disputes, filter by status, create dispute, validate creditorName/amount, 400, 401                                                               |
| TST-CREP-02 | `src/app/api/credit-repair/disputes/[id]/__tests__/route.test.ts`  | GET/PUT/DELETE /api/credit-repair/disputes/[id]                   | 11    | GET: 200/404/401; PUT: 200/optimistic-locking/409-conflict/400-invalid-strategy/401; DELETE: 200/404/401                                              |
| TST-CREP-03 | `src/app/api/credit-repair/cards/__tests__/route.test.ts`          | GET /api/credit-repair/cards, POST                                | ~10   | List cards, create card, validate limit/balance, 400, 401                                                                                             |
| TST-CREP-04 | `src/app/api/credit-repair/cards/[id]/__tests__/route.test.ts`     | GET/PUT/DELETE /api/credit-repair/cards/[id]                      | 15    | GET: 200+utilization/404/401/500; PUT: 200+auto-utilization/400-creditLimit/400-negBalance/400-closingDay/400-dueDay/401/500; DELETE: 200/404/401/500 |
| TST-CREP-05 | `src/app/api/credit-repair/goodwill/__tests__/route.test.ts`       | GET /api/credit-repair/goodwill, POST                             | ~8    | List goodwill letters, create letter, validate input, 401                                                                                             |
| TST-CREP-06 | `src/app/api/credit-repair/goodwill/[id]/__tests__/route.test.ts`  | GET/PUT/DELETE /api/credit-repair/goodwill/[id]                   | 10    | GET: 200/404/401; PUT: 200+status-sent/400-invalid-status/401/500; DELETE: 200/404/401                                                                |
| TST-CREP-07 | `src/app/api/credit-repair/negotiate/__tests__/route.test.ts`      | GET /api/credit-repair/negotiate, POST                            | ~8    | List negotiations, create negotiation, validate input, 401                                                                                            |
| TST-CREP-08 | `src/app/api/credit-repair/negotiate/[id]/__tests__/route.test.ts` | GET/PUT/DELETE /api/credit-repair/negotiate/[id]                  | 11    | GET: 200/404/401; PUT: 200/400-invalid-status/401/500; DELETE: 200/404/401/500                                                                        |
| TST-CREP-09 | `src/app/api/credit-repair/reports/__tests__/route.test.ts`        | GET /api/credit-repair/reports, POST                              | ~8    | List reports, upload report, validate file type, 400, 401                                                                                             |
| TST-CREP-10 | `src/app/api/credit-repair/reports/[id]/__tests__/route.test.ts`   | GET/DELETE /api/credit-repair/reports/[id]                        | 8     | GET: 200/404/401/500; DELETE: 200/404/401/500 (no PUT — reports immutable)                                                                            |
| TST-CREP-11 | `src/app/api/credit-repair/score/__tests__/route.test.ts`          | GET/POST /api/credit-repair/score                                 | ~10   | Fetch score history, log new score, validate range 300-850, 400, 401                                                                                  |
| TST-CREP-12 | `src/app/api/credit-repair/quick-wins/__tests__/route.test.ts`     | GET /api/credit-repair/quick-wins                                 | ~8    | Return recommendations, auth required, 401                                                                                                            |
| TST-CREP-13 | `src/app/api/credit-repair/impact/__tests__/route.test.ts`         | POST /api/credit-repair/impact                                    | ~8    | Analyze action impact, validate action type, 400, 401                                                                                                 |
| TST-CREP-14 | `src/app/api/credit-repair/__tests__/integration.test.ts`          | POST /api/credit-repair/integration                               | ~10   | Pull bureau report, validate bureau name, API key validation, 400, 401                                                                                |
| TST-CREP-15 | `src/app/api/credit-repair/__tests__/performance.test.ts`          | GET /api/credit-repair/performance                                | ~10   | Return metrics, timing assertions (performance.now), 401                                                                                              |
| TST-CREP-17 | `src/app/api/credit-repair/__tests__/integration-real.test.ts`     | Credit repair real integration                                    | ~8    | End-to-end API flow with real service calls, bureau integration validation                                                                            |

**Mocking pattern:** `jest.mock('@/lib/security/jwt-validation')`, `jest.mock('@/lib/db')`, `jest.mock('@/lib/security/audit-logging')`
**Notable patterns:** Optimistic locking (TST-CREP-02), auto-calculated utilization (TST-CREP-04), immutable resources (TST-CREP-10)

### 3.2 Credit Report & Builder Domain (CMON)

| TestID      | File                                                 | Describes                    | Cases | Scope                                                   |
| ----------- | ---------------------------------------------------- | ---------------------------- | ----- | ------------------------------------------------------- |
| TST-CMON-01 | `src/app/api/credit-report/__tests__/route.test.ts`  | GET/POST /api/credit-report  | ~10   | Fetch report, analyze report, validate bureau, 400, 401 |
| TST-CMON-02 | `src/app/api/credit-builder/__tests__/route.test.ts` | GET/POST /api/credit-builder | ~12   | Fetch plan, create plan, validate input, 400, 401       |

### 3.3 Disputes Domain (Standalone)

| TestID      | File                                           | Describes              | Cases | Scope                                                                                                                                                    |
| ----------- | ---------------------------------------------- | ---------------------- | ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| TST-CREP-16 | `src/app/api/disputes/__tests__/route.test.ts` | GET/POST /api/disputes | ~12   | List disputes, filter by status/bureau, create dispute with AI letter generation, validate bureau, 400, 401. Note: requires `import 'openai/shims/node'` |

### 3.4 Authentication Domain (AUTH)

| TestID      | File                                       | Describes                                            | Cases | Scope               |
| ----------- | ------------------------------------------ | ---------------------------------------------------- | ----- | ------------------- |
| TST-AUTH-01 | `src/app/api/auth/__tests__/route.test.ts` | Sign In, Sign Out, Session Refresh, Token Validation | ~10   | Full auth lifecycle |

### 3.5 Financial Suite Domain (FINS)

| TestID      | File                                                         | Describes                                                                                                                                                                                                                                | Cases | Scope                                                                          |
| ----------- | ------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- | ------------------------------------------------------------------------------ |
| TST-FINS-01 | `src/app/api/financial/__tests__/ai-endpoints.test.ts`       | POST /api/financial/ai-insights, budget/ai-optimize, goals/ai-optimize, spending/ai-insights, bills/ai-optimize, credit/ai-insights, disputes/ai-strategy, investments/ai-insights, credit-builder/ai-roadmap, credit-repair/ai-strategy | 17    | MSW mock server, 200 success + 401 for each endpoint                           |
| TST-FINS-02 | `src/app/api/financial/budgets/__tests__/route.test.ts`      | GET/POST /api/financial/budgets                                                                                                                                                                                                          | ~14   | List budgets, create budget, validate name/amount/category, 400/401/403 (RBAC) |
| TST-FINS-03 | `src/app/api/financial/budgets/[id]/__tests__/route.test.ts` | GET/PUT/DELETE /api/financial/budgets/[id]                                                                                                                                                                                               | ~14   | Detail, update, delete with 200/400/401/403/404 (RBAC layer)                   |

**Notable:** RBAC tests distinguish 401 (unauthenticated) from 403 (insufficient role). MSW pattern for AI endpoints.

### 3.6 AI Financial Coach (AIML)

| TestID      | File                                                                   | Describes                                  | Cases | Scope                                                                                            |
| ----------- | ---------------------------------------------------------------------- | ------------------------------------------ | ----- | ------------------------------------------------------------------------------------------------ |
| TST-AIML-01 | `src/app/api/ai/financial-coach/debt-strategy/__tests__/route.test.ts` | POST /api/ai/financial-coach/debt-strategy | ~10   | Return strategy for debts array, validate input, 400 empty debts, 401, AI service error handling |

### 3.7 Investment API Domain (INVS)

| TestID      | File                                                                     | Describes                                        | Cases | Scope                                                                                                                                                |
| ----------- | ------------------------------------------------------------------------ | ------------------------------------------------ | ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| TST-INVS-01 | `src/app/api/investments/allocation-analysis/__tests__/route.test.ts`    | POST/GET /api/investments/allocation-analysis    | 8     | POST: analyze holdings/400-invalid/optional-constraints; GET: all 5 models/specific model; Edge: empty portfolio, extreme risk, malformed            |
| TST-INVS-02 | `src/app/api/investments/comprehensive-analysis/__tests__/route.test.ts` | GET/POST /api/investments/comprehensive-analysis | 9     | GET: API docs (6 services); POST: 200+processingTime/custom-weights/user-prefs/401/400-empty/400-invalid-timeframe/500-market-error/500-engine-error |
| TST-INVS-03 | `src/app/api/investments/portfolio-analysis/__tests__/route.test.ts`     | GET/POST /api/investments/portfolio-analysis     | 9     | GET: API docs; POST: 200+getQuote/default-portfolioId/auto-fetch-prices/401/400-empty/400-negative-shares/graceful-market-error/500-engine-error     |

### 3.8 Marketplace Domain (MKTL)

| TestID      | File                                                   | Describes                                                                                                                         | Cases | Scope                                                                    |
| ----------- | ------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------- | ----- | ------------------------------------------------------------------------ |
| TST-MKTL-01 | `src/app/api/marketplace/__tests__/tradelines.test.ts` | GET/POST /api/marketplace/tradelines                                                                                              | ~10   | List, filter by age/limit/price, sort, add tradeline, validate, 400, 401 |
| TST-MKTL-02 | `src/app/api/marketplace/__tests__/disputes.test.ts`   | Review Filtering, Creation Validation, Helpful Count, Average Rating, Date Filtering, Verified Purchase, Data Validation, Sorting | 21    | Pure logic tests (`@jest-environment node`), in-memory data              |
| TST-MKTL-03 | `src/app/api/marketplace/__tests__/products.test.ts`   | Product Listing, Filtering, Sorting, Featured, Category Validation, Price Validation, Rating Validation                           | 15    | Pure logic tests, no external deps                                       |
| TST-MKTL-04 | `src/app/api/marketplace/__tests__/providers.test.ts`  | Provider Listing, Filtering, Sorting, Category, Verification, Data Validation, Search, Top Providers                              | 23    | Pure logic tests, case-insensitive search                                |
| TST-MKTL-05 | `src/app/api/marketplace/__tests__/reviews.test.ts`    | GET/POST reviews, Helpful, Date Handling, Verified Purchase, Data Validation, Average Rating                                      | 20    | Pure logic tests, rating 1-5, max 1000 chars                             |

### 3.9 Payment Domain (PAY)

| TestID     | File                                             | Describes                  | Cases | Scope                                                                   |
| ---------- | ------------------------------------------------ | -------------------------- | ----- | ----------------------------------------------------------------------- |
| TST-PAY-01 | `src/app/api/payment/__tests__/checkout.test.ts` | POST /api/payment/checkout | ~10   | Create Stripe session, validate priceId, 400/401, Stripe error handling |

### 3.10 Student Loans & Federal Programs (SLOAN)

| TestID       | File                                                    | Describes                                                                       | Cases | Scope                                                                                 |
| ------------ | ------------------------------------------------------- | ------------------------------------------------------------------------------- | ----- | ------------------------------------------------------------------------------------- |
| TST-SLOAN-01 | `src/app/api/federal-programs/federal-programs.test.ts` | POST (fresh-start, rehabilitation, consolidation), GET (trackApplicationStatus) | 6     | Uses `node-mocks-http`, validates program type, 400 invalid type, applicationId param |
| TST-SLOAN-02 | `src/app/api/student-loans/student-loans.test.ts`       | GET student loans                                                               | 2     | Uses `node-mocks-http`, retrieveNSLDSData with userId, 400 no userId                  |
| TST-SLOAN-03 | `src/app/api/student-loans/__tests__/programs.test.ts`  | GET /api/student-loans/programs                                                 | ~6    | Federal program listing, eligibility criteria, program detail lookup                  |

### 3.11 Notifications Domain (NOTF)

| TestID      | File                                                | Describes                         | Cases | Scope                                                                            |
| ----------- | --------------------------------------------------- | --------------------------------- | ----- | -------------------------------------------------------------------------------- |
| TST-NOTF-01 | `src/app/api/notifications/__tests__/route.test.ts` | GET/POST/PATCH /api/notifications | ~10   | List notifications, filter unread, create, validate type, mark as read, 400, 401 |

### 3.12 Admin Domain (ADMIN)

| TestID       | File                                            | Describes                   | Cases | Scope                                                                   |
| ------------ | ----------------------------------------------- | --------------------------- | ----- | ----------------------------------------------------------------------- |
| TST-ADMIN-01 | `src/app/api/admin/__tests__/users.test.ts`     | GET/DELETE /api/admin/users | ~10   | List users, admin auth required, pagination, delete user, 403 non-admin |
| TST-ADMIN-02 | `src/app/api/analytics/__tests__/route.test.ts` | GET /api/analytics          | ~8    | Auth required, return metrics, date range filtering, 401                |

### 3.13 Onboarding Domain (ONBRD)

| TestID       | File                                                      | Describes                         | Cases | Scope                                                                                                          |
| ------------ | --------------------------------------------------------- | --------------------------------- | ----- | -------------------------------------------------------------------------------------------------------------- |
| TST-ONBRD-01 | `src/app/api/onboarding/progress/__tests__/route.test.ts` | GET/POST /api/onboarding/progress | 5     | GET: 401/200-default-progress/200-saved; POST: 401/400-invalid-step (range 1-5). Mocks `@/lib/supabase/server` |

---

## 4. Jest — Library / Service Tests

### 4.1 Investment Services (INVS)

| TestID      | File                                                                        | Describes                                                                      | Cases | Scope                                   |
| ----------- | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------ | ----- | --------------------------------------- |
| TST-INVS-04 | `src/lib/investments/services/__tests__/AssetAllocationService.test.ts`     | Asset Allocation Models, Rebalancing Logic, Risk Tolerance Mapping, Edge Cases | ~18   | Portfolio allocation models             |
| TST-INVS-05 | `src/lib/investments/services/__tests__/InvestmentAnalysisEngine.test.ts`   | Portfolio Analysis, Risk Metrics, Performance Calculations, Scoring            | ~20   | Comprehensive portfolio analysis engine |
| TST-INVS-06 | `src/lib/investments/services/__tests__/SentimentAnalysisService.test.ts`   | Sentiment Scoring, Aggregation, Edge Cases                                     | ~12   | News/social sentiment scoring           |
| TST-INVS-07 | `src/lib/investments/services/__tests__/TechnicalAnalysisService.test.ts`   | Moving Averages, RSI, MACD, Bollinger Bands                                    | ~16   | Technical chart indicators              |
| TST-INVS-08 | `src/lib/investments/services/__tests__/AllocationAnalyzer.test.ts`         | Allocation Analysis, Target vs Actual, Rebalancing Suggestions                 | ~12   | Portfolio allocation optimization       |
| TST-INVS-09 | `src/lib/investments/services/__tests__/FundamentalAnalysisService.test.ts` | Financial Ratios, Valuation Metrics, Peer Comparison                           | ~14   | Fundamental stock analysis              |
| TST-INVS-10 | `src/lib/investments/services/__tests__/PerformanceCalculator.test.ts`      | Return Calculations, Benchmarking, Time-Weighted Returns                       | ~12   | Portfolio performance metrics           |
| TST-INVS-11 | `src/lib/investments/services/__tests__/PortfolioService.test.ts`           | Portfolio CRUD, Holdings Aggregation, Value Calculation                        | ~14   | Core portfolio data management          |
| TST-INVS-12 | `src/lib/investments/services/__tests__/TaxLossHarvestingService.test.ts`   | Loss Harvesting Opportunities, Wash Sale Rules, Tax Savings                    | ~12   | Tax-loss harvesting engine              |
| TST-INVS-13 | `src/lib/investments/__tests__/ai-stock-analyst.test.ts`                    | AI Stock Analysis, Recommendation Generation, Confidence Scoring               | ~10   | AI-powered stock analysis               |
| TST-INVS-14 | `src/lib/investments/__tests__/crypto-analyst.test.ts`                      | Crypto Analysis, On-Chain Metrics, Price Prediction                            | ~10   | Cryptocurrency analysis engine          |
| TST-INVS-15 | `src/lib/investments/__tests__/market-data-service.test.ts`                 | Quote Fetching, Historical Data, Error Handling, Cache Behavior                | ~15   | Market data fetching and caching        |
| TST-INVS-16 | `src/lib/investments/__tests__/signal-generator.test.ts`                    | Signal Generation, Technical Triggers, Threshold Alerts                        | ~10   | Trading signal generation               |

### 4.2 Trading Services (TRAD)

| TestID      | File                                                                  | Describes                                                                                                                                                                          | Cases | Scope                                                                                 |
| ----------- | --------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- | ------------------------------------------------------------------------------------- |
| TST-TRAD-01 | `src/lib/trading/pctt/__tests__/pctt-validator.test.ts`               | Monte Carlo Significance (5), Bootstrap Confidence Intervals (5), Q-Score Calibration (3), Performance Metrics (5), Walk-Forward Analysis (3), Configuration (4)                   | 25    | PCTT statistical validation: p-values, CI, Brier scores, Sharpe ratio, max drawdown   |
| TST-TRAD-02 | `src/lib/trading/realtime/__tests__/realtime-trading-service.test.ts` | Configuration (3), Connection Management (4), Subscription Management (5), Quote Streaming (2), Order Updates (3), Error Handling (1), Status Reporting (3), Factory Functions (1) | 22    | WebSocket connection, subscription management, RxJS observables                       |
| TST-TRAD-03 | `src/lib/trading/realtime/__tests__/order-execution-engine.test.ts`   | DEFAULT_EXECUTION_CONFIG (8), ExecutionConfig type structure (4)                                                                                                                   | 12    | Config defaults (paper mode, iex feed, price validation, risk checks)                 |
| TST-TRAD-04 | `src/lib/trading/pctt/__tests__/pctt-core.test.ts`                    | PCTT Core Engine, Trendline Detection, Pivot Points                                                                                                                                | ~15   | Core PCTT algorithm, pivot identification, trendline fitting, breakout detection      |
| TST-TRAD-05 | `src/lib/strategies/__tests__/ml-strategy-integration.test.ts`        | ML Strategy Integration, Model Pipeline                                                                                                                                            | ~10   | ML model integration with trading strategies, feature extraction, prediction pipeline |

### 4.3 Tax Services (TAX)

| TestID     | File                                                 | Describes                                | Cases | Scope                                                                                                                                         |
| ---------- | ---------------------------------------------------- | ---------------------------------------- | ----- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| TST-TAX-01 | `src/lib/tax/__tests__/TaxBracketCalculator.test.ts` | calculateTaxes                           | 9     | Single filer, 401k deduction, FICA, Additional Medicare Tax, zero state tax, monthly take-home, zero income, high earners, capital gains, HSA |
| TST-TAX-02 | `src/lib/tax/__tests__/tax-documents.e2e.test.ts`    | Tax Document Generation, Form Validation | ~8    | E2E tax document generation, form 1099/W-2 parsing, filing workflow                                                                           |

### 4.4 Financial Services (FINS)

| TestID      | File                                                                       | Describes                                                       | Cases | Scope                                                              |
| ----------- | -------------------------------------------------------------------------- | --------------------------------------------------------------- | ----- | ------------------------------------------------------------------ |
| TST-FINS-04 | `src/lib/financial/__tests__/bill-detection-service.test.ts`               | Bill Detection, Pattern Matching, Recurring Bill Identification | ~10   | Detect bills from transactions, recurring pattern analysis         |
| TST-FINS-05 | `src/lib/financial/__tests__/bill-negotiator.test.ts`                      | Bill Negotiation Strategy, Savings Estimation                   | ~8    | Negotiation script generation, potential savings calculation       |
| TST-FINS-06 | `src/lib/financial/__tests__/budget-optimizer.test.ts`                     | Budget Optimization, Category Allocation                        | ~10   | Optimize budget across categories, surplus/deficit handling        |
| TST-FINS-07 | `src/lib/financial/__tests__/budget-service.test.ts`                       | Budget CRUD, Period Management                                  | ~12   | Create/read/update budgets, period tracking, rollover logic        |
| TST-FINS-08 | `src/lib/financial/__tests__/debt-strategy-engine.test.ts`                 | Debt Payoff Strategies, Avalanche vs Snowball                   | ~12   | Debt ordering strategies, payoff timeline, interest savings        |
| TST-FINS-09 | `src/lib/financial/__tests__/debt-strategy-optimizer.test.ts`              | Optimal Debt Strategy Selection                                 | ~8    | Compare strategies, recommend optimal approach, edge cases         |
| TST-FINS-10 | `src/lib/financial/__tests__/financial-aggregation-service.test.ts`        | Account Aggregation, Balance Reconciliation                     | ~10   | Multi-account aggregation, net worth calculation                   |
| TST-FINS-11 | `src/lib/financial/__tests__/financial-context-engine.test.ts`             | Financial Context Assembly, User Profile                        | ~12   | Build financial context from accounts/goals/debts, context scoring |
| TST-FINS-12 | `src/lib/financial/__tests__/financial-context-engine.integration.test.ts` | Financial Context Integration                                   | ~8    | End-to-end context assembly with real service interactions         |
| TST-FINS-13 | `src/lib/financial/__tests__/goal-planner.test.ts`                         | Goal Planning, Milestone Generation                             | ~10   | Goal creation, milestone scheduling, progress projection           |
| TST-FINS-14 | `src/lib/financial/__tests__/goal-tracker.test.ts`                         | Goal Progress Tracking, Achievement Detection                   | ~10   | Track contributions, milestone completion, streak tracking         |
| TST-FINS-15 | `src/lib/financial/__tests__/health-score-calculator.test.ts`              | Financial Health Score V1                                       | ~12   | Multi-factor health scoring, category weights, score ranges        |
| TST-FINS-16 | `src/lib/financial/__tests__/health-score-calculator-v2.test.ts`           | Financial Health Score V2                                       | ~14   | Enhanced scoring with additional factors, trend analysis           |
| TST-FINS-17 | `src/lib/financial/__tests__/recommendation-engine.test.ts`                | Personalized Financial Recommendations                          | ~12   | Context-aware recommendations, priority ranking, action items      |
| TST-FINS-18 | `src/lib/financial/__tests__/savings-optimizer.test.ts`                    | Savings Optimization, Emergency Fund Planning                   | ~10   | Optimal savings allocation, emergency fund targets                 |
| TST-FINS-19 | `src/lib/financial/__tests__/smart-budget-engine.test.ts`                  | Smart Budget Generation, AI-Powered Allocation                  | ~12   | Auto-generate budgets from spending history, adaptive allocation   |
| TST-FINS-20 | `src/lib/financial/__tests__/smart-insights-engine.test.ts`                | AI Financial Insights, Pattern Detection                        | ~10   | Spending pattern insights, anomaly detection, trend identification |
| TST-FINS-21 | `src/lib/financial/__tests__/spending-analysis-service.test.ts`            | Spending Analysis, Category Breakdown                           | ~10   | Category-level spending analysis, period comparison, trends        |
| TST-FINS-22 | `src/lib/financial/__tests__/spending-analyzer.test.ts`                    | Spending Pattern Analyzer                                       | ~10   | Pattern recognition, merchant grouping, frequency analysis         |
| TST-FINS-23 | `src/lib/financial/__tests__/transaction-categorizer.test.ts`              | Transaction Categorization, Merchant Mapping                    | ~12   | Auto-categorize transactions, merchant name normalization          |

### 4.5 AI/ML Services (AIML)

| TestID      | File                                                            | Describes                                        | Cases | Scope                                                                        |
| ----------- | --------------------------------------------------------------- | ------------------------------------------------ | ----- | ---------------------------------------------------------------------------- |
| TST-AIML-02 | `src/lib/__tests__/ai-orchestrator.test.ts`                     | AI Orchestrator, Multi-Model Workflows           | ~15   | Workflow orchestration, model selection, consensus, fallback handling        |
| TST-AIML-03 | `src/lib/ai/__tests__/chat-db-service.test.ts`                  | Chat Database Service, Session Persistence       | ~10   | Chat session CRUD, message history, context window management                |
| TST-AIML-04 | `src/lib/ai/__tests__/financial-chat-engine.test.ts`            | Financial Chat Engine, Domain-Specific Responses | ~12   | Financial Q&A, context-aware responses, intent routing                       |
| TST-AIML-05 | `src/lib/ai/__tests__/financial-coach.test.ts`                  | AI Financial Coach, Personalized Guidance        | ~10   | Coaching prompts, action plan generation, progress tracking                  |
| TST-AIML-06 | `src/lib/ai-personalization/__tests__/behavioral-coach.test.ts` | Behavioral Coach, Habit Tracking                 | ~8    | Behavioral nudges, habit formation, spending pattern coaching                |
| TST-AIML-07 | `src/lib/__tests__/ml-prediction-models.test.ts`                | ML Prediction Models, Score Forecasting          | ~10   | Credit score prediction, timeline estimation, feature importance             |
| TST-AIML-08 | `src/lib/__tests__/score-simulator.test.ts`                     | Score Simulator, What-If Analysis                | ~10   | Simulate credit actions, score impact prediction, scenario comparison        |
| TST-AIML-09 | `src/lib/__tests__/student-loan-ai-engine.test.ts`              | Student Loan AI Engine, Repayment Optimization   | ~10   | AI-powered loan strategy, forgiveness eligibility, repayment plan comparison |

### 4.6 Credit Repair Library Services (CREP)

| TestID      | File                                                 | Describes                                     | Cases | Scope                                                                     |
| ----------- | ---------------------------------------------------- | --------------------------------------------- | ----- | ------------------------------------------------------------------------- |
| TST-CREP-18 | `src/lib/__tests__/dispute-letter-generator.test.ts` | Dispute Letter Generation, Template Rendering | ~10   | Letter template selection, variable injection, bureau-specific formatting |
| TST-CREP-19 | `src/lib/__tests__/dispute-service.test.ts`          | Dispute Service, Lifecycle Management         | ~12   | Dispute CRUD, status transitions, timeline events, outcome tracking       |

### 4.7 Credit Monitoring Library Services (CMON)

| TestID      | File                                               | Describes                               | Cases | Scope                                                              |
| ----------- | -------------------------------------------------- | --------------------------------------- | ----- | ------------------------------------------------------------------ |
| TST-CMON-03 | `src/lib/__tests__/credit-builder-service.test.ts` | Credit Builder Service, Plan Management | ~10   | Builder plan creation, milestone tracking, score impact estimation |

### 4.8 Payment & Subscription Services (PAY)

| TestID     | File                                                      | Describes                               | Cases | Scope                                                             |
| ---------- | --------------------------------------------------------- | --------------------------------------- | ----- | ----------------------------------------------------------------- |
| TST-PAY-02 | `src/lib/__tests__/payment-service.test.ts`               | Payment Service, Transaction Processing | ~12   | Payment intent creation, refund handling, receipt generation      |
| TST-PAY-03 | `src/lib/__tests__/pricing.test.ts`                       | Pricing Logic, Tier Validation          | ~8    | Tier lookup, feature gating, price calculation, promo codes       |
| TST-PAY-04 | `src/lib/__tests__/subscription-service.test.ts`          | Subscription Service, Lifecycle Events  | ~10   | Subscribe, upgrade, downgrade, cancel, renewal, grace period      |
| TST-PAY-05 | `src/lib/payment/__tests__/billing-profile-store.test.ts` | Billing Profile Store, Payment Methods  | ~8    | Profile CRUD, default method selection, payment method validation |

### 4.9 Student Loan Library Services (SLOAN)

| TestID       | File                                                    | Describes                                   | Cases | Scope                                                                |
| ------------ | ------------------------------------------------------- | ------------------------------------------- | ----- | -------------------------------------------------------------------- |
| TST-SLOAN-04 | `src/lib/__tests__/student-loan-agent.test.ts`          | Student Loan Agent, Strategy Recommendation | ~10   | Loan analysis, repayment strategy selection, forgiveness eligibility |
| TST-SLOAN-05 | `src/lib/__tests__/federal-integration-service.test.ts` | Federal Integration Service, Program Data   | ~8    | Federal program lookup, eligibility validation, application status   |

### 4.10 Notification Library Services (NOTF)

| TestID      | File                                             | Describes                                    | Cases | Scope                                                                   |
| ----------- | ------------------------------------------------ | -------------------------------------------- | ----- | ----------------------------------------------------------------------- |
| TST-NOTF-02 | `src/lib/__tests__/notification-service.test.ts` | Notification Service, Multi-Channel Delivery | ~10   | Email + in-app notification creation, template rendering, read tracking |

### 4.11 Document Library Services (DOC)

| TestID     | File                                                   | Describes                    | Cases | Scope                                                                 |
| ---------- | ------------------------------------------------------ | ---------------------------- | ----- | --------------------------------------------------------------------- |
| TST-DOC-01 | `src/lib/documents/__tests__/document-service.test.ts` | Document Service, S3 Storage | ~12   | Upload, download, presigned URL generation, file validation, metadata |

### 4.12 Security & Validation (SEC)

| TestID     | File                                        | Describes                           | Cases | Scope                                                            |
| ---------- | ------------------------------------------- | ----------------------------------- | ----- | ---------------------------------------------------------------- |
| TST-SEC-01 | `src/lib/__tests__/encryption.test.ts`      | Encryption Service, Data Protection | ~8    | AES encryption/decryption, key rotation, PII field encryption    |
| TST-SEC-02 | `src/lib/__tests__/rate-limiter.test.ts`    | Rate Limiter, Throttling Logic      | ~10   | Per-IP limits, per-user limits, sliding window, burst protection |
| TST-SEC-03 | `src/lib/__tests__/data-validation.test.ts` | Data Validation, Schema Enforcement | ~10   | Input sanitization, schema validation, injection prevention      |

### 4.13 Investment Hooks (INVS)

| TestID      | File                                           | Describes                                   | Cases | Scope                                                          |
| ----------- | ---------------------------------------------- | ------------------------------------------- | ----- | -------------------------------------------------------------- |
| TST-INVS-17 | `src/hooks/__tests__/useHoldings.test.ts`      | useHoldings Hook, Holdings State Management | ~8    | Fetch holdings, add/remove holding, refresh, error states      |
| TST-INVS-18 | `src/hooks/__tests__/useMarketData.test.ts`    | useMarketData Hook, Market Data Fetching    | ~8    | Quote fetch, historical data, polling interval, cache behavior |
| TST-INVS-19 | `src/hooks/__tests__/usePortfolio.test.ts`     | usePortfolio Hook, Portfolio State          | ~8    | Portfolio loading, value calculation, allocation updates       |
| TST-INVS-20 | `src/hooks/__tests__/useRealTimePrice.test.ts` | useRealTimePrice Hook, Live Price Streaming | ~6    | WebSocket connection, price updates, reconnect logic           |
| TST-INVS-21 | `src/hooks/__tests__/useStockAnalysis.test.ts` | useStockAnalysis Hook, Analysis State       | ~6    | Trigger analysis, loading state, result caching                |

### 4.14 Investment Integration & Security (INVS)

| TestID      | File                                                  | Describes                      | Cases | Scope                                                           |
| ----------- | ----------------------------------------------------- | ------------------------------ | ----- | --------------------------------------------------------------- |
| TST-INVS-22 | `src/__tests__/integration/investments-api.test.ts`   | Investment API Integration     | ~10   | End-to-end API flow: portfolio → analysis → allocation pipeline |
| TST-INVS-23 | `src/__tests__/security/investments-security.test.ts` | Investment Security Validation | ~8    | Auth enforcement, input sanitization, data access controls      |

### 4.15 Cross-Cutting & Miscellaneous

| TestID      | File                                                    | Describes                              | Cases | Scope                                                           |
| ----------- | ------------------------------------------------------- | -------------------------------------- | ----- | --------------------------------------------------------------- |
| TST-MISC-01 | `src/lib/__tests__/add.test.ts`                         | Basic Utility / Smoke Test             | ~2    | Simple addition utility, test infrastructure verification       |
| TST-MISC-02 | `src/lib/__tests__/api-integration.test.ts`             | API Integration Patterns               | ~8    | Cross-service API calls, error propagation, retry logic         |
| TST-MISC-03 | `src/__tests__/integration/service-integration.test.ts` | Service Integration                    | ~10   | Multi-service orchestration, dependency injection, lifecycle    |
| TST-MISC-04 | `src/lib/offline/__tests__/OfflineQueue.test.ts`        | Offline Queue, Action Persistence      | ~8    | Queue actions offline, replay on reconnect, conflict resolution |
| TST-MISC-05 | `src/hooks/__tests__/useOnline.test.ts`                 | useOnline Hook, Connectivity Detection | ~4    | Online/offline state, event listeners, reconnect detection      |

---

## 5. Jest — Page Rendering Tests

| TestID      | File                                                     | Describes                                                  | Cases | Scope                                                                                               |
| ----------- | -------------------------------------------------------- | ---------------------------------------------------------- | ----- | --------------------------------------------------------------------------------------------------- |
| TST-PAGE-01 | `src/app/__tests__/page.test.tsx`                        | HomePage                                                   | 5     | Renders without crash, hero heading, financial life text, heading hierarchy, CTA buttons            |
| TST-PAGE-02 | `src/app/__tests__/layout.test.tsx`                      | RootLayout                                                 | 5     | Metadata title, description, type, properties, metadataBase                                         |
| TST-PAGE-03 | `src/app/dashboard/__tests__/page.test.tsx`              | DashboardPage                                              | ~3    | Loading state, authenticated content, financial health description. Mocks Supabase, next/navigation |
| TST-PAGE-04 | `src/app/login/__tests__/page.test.tsx`                  | LoginPage (Redirect)                                       | 2     | Redirects to /auth/login, redirect called exactly once                                              |
| TST-PAGE-05 | `src/app/pricing/__tests__/page.test.tsx`                | PricingPage                                                | 6     | Renders, Free/Standard/Pro tiers, prices $29/$99, Most Popular badge, features list, CTA links      |
| TST-PAGE-06 | `src/app/student-loan-agent/__tests__/page.test.tsx`     | StudentLoanAgentPage                                       | 3     | Renders, Federal Integration text, AI agent description                                             |
| TST-PAGE-07 | `src/app/admin/__tests__/admin-pages.test.tsx`           | Admin Dashboard Page, Admin Users Page                     | ~3    | Renders admin dashboard, loading state, metrics fetch. Mocks Supabase, auth                         |
| TST-PAGE-08 | `src/app/credit/factors/__tests__/page.test.tsx`         | CreditFactorsPage                                          | ~2    | Loading state, renders factors after fetch. Mocks fetch                                             |
| TST-PAGE-09 | `src/app/onboarding/__tests__/onboarding-pages.test.tsx` | Onboarding Welcome/Profile/Goals Pages                     | ~6    | Each page renders, forms present, continue buttons functional                                       |
| TST-PAGE-10 | `src/app/settings/__tests__/settings-pages.test.tsx`     | Settings pages (profile, notifications, security, billing) | ~4    | Pages render, key settings elements present. Mocks ThemeProvider, Supabase                          |

---

## 6. Jest — Component Tests

### 6.1 Shared UI Components (COMP)

| TestID      | File                                                    | Describes                                                                                                     | Cases | Scope                                                                                                            |
| ----------- | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- | ----- | ---------------------------------------------------------------------------------------------------------------- |
| TST-COMP-01 | `src/components/__tests__/Layout.test.tsx`              | Layout                                                                                                        | 2     | Renders header+children, hides nav when showNavigation=false                                                     |
| TST-COMP-02 | `src/components/__tests__/CreditScoreGauge.test.tsx`    | CreditScoreGauge > Score Display, Score Ratings, Bureau Colors, Score Boundaries                              | 13    | Score value, Poor/Fair/Good/Very Good/Excellent labels, bureau colors, boundaries 300/850                        |
| TST-COMP-03 | `src/components/__tests__/DisputeWizard.test.tsx`       | DisputeWizard > Step Navigation, Bureau Selection, Form Submission                                            | 8     | Step advance/regress, bureau select, form submit, validation, error display, success state                       |
| TST-COMP-04 | `src/components/__tests__/UIComponents.test.tsx`        | Spinner, Skeleton, SkeletonText, SkeletonCard, LoadingOverlay, LoadingPage, LoadingButton, ProgressBar, Toast | ~15   | Each component renders, state variants, progress values, toast messages                                          |
| TST-COMP-05 | `src/components/__tests__/ModelSelector.test.tsx`       | ModelSelector                                                                                                 | ~5    | Renders model list, search filters, category filter, pricing displayed, onSelect callback                        |
| TST-COMP-06 | `src/components/__tests__/ModelMonitoring.test.tsx`     | ModelMonitoring                                                                                               | ~5    | Time range selector, summary cards, usage chart, sort columns                                                    |
| TST-COMP-07 | `src/components/__tests__/SemanticSearch.test.tsx`      | SemanticSearch                                                                                                | ~4    | Search input, index selector, loading state, results with similarity scores                                      |
| TST-COMP-08 | `src/components/__tests__/ImageGenerator.test.tsx`      | ImageGenerator                                                                                                | ~8    | Prompt input, size/style selects, generate button, loading, image preview, download, sample prompts, error state |
| TST-COMP-09 | `src/components/__tests__/VoiceAssistant.test.tsx`      | VoiceAssistant                                                                                                | ~4    | Placeholder text, microphone button, onTranscript callback, idle state                                           |
| TST-COMP-10 | `src/components/ui/__tests__/OfflineIndicator.test.tsx` | OfflineIndicator                                                                                              | ~3    | Not rendered when online, offline banner, reconnected banner. Mocks navigator.onLine                             |

### 6.2 Credit Bureau Components

| TestID      | File                                                                 | Describes                                                   | Cases | Scope                                                                                                                                                                   |
| ----------- | -------------------------------------------------------------------- | ----------------------------------------------------------- | ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| TST-COMP-11 | `src/components/credit-bureau/__tests__/CreditScoreCard.test.tsx`    | CreditScoreCard                                             | 11    | Score value, bureau name, previousScore, change indicator, positive/negative change, factor list, empty factors, multiple bureaus, score color, missing props, snapshot |
| TST-COMP-12 | `src/components/credit-bureau/__tests__/CreditReportImport.test.tsx` | CreditReportImport                                          | 5     | Wizard step 1, bureau selection options, no error on mount, onComplete, onCancel                                                                                        |
| TST-COMP-13 | `src/components/credit/__tests__/ScoreGauge.test.tsx`                | ScoreGauge > Score Display, Score Ratings, Score Boundaries | ~13   | Score value, aria-label, SVG arc, Poor/Fair/Good/VeryGood/Excellent, boundaries 300/850, percent calculation                                                            |

### 6.3 AI-Powered Feature Components

| TestID      | File                                                                     | Describes                                    | Cases | Scope                                                                                                        |
| ----------- | ------------------------------------------------------------------------ | -------------------------------------------- | ----- | ------------------------------------------------------------------------------------------------------------ |
| TST-COMP-14 | `src/components/bills/__tests__/AIBillsOptimizer.test.tsx`               | AIBillsOptimizer > Component Rendering       | ~5    | Loading skeleton, title, optimization score=88, savings $145, category breakdown. Uses `renderWithProviders` |
| TST-COMP-15 | `src/components/budget/__tests__/AIBudgetOptimizer.test.tsx`             | AIBudgetOptimizer > Component Rendering      | ~4    | Loading state, title, score=80, savings $350                                                                 |
| TST-COMP-16 | `src/components/credit-builder/__tests__/AICreditRoadmap.test.tsx`       | AICreditRoadmap > Component Rendering        | ~5    | Loading, title, score=85, milestones list, completion status                                                 |
| TST-COMP-17 | `src/components/credit-monitoring/__tests__/AICreditInsights.test.tsx`   | AICreditInsights > Component Rendering       | ~5    | Loading, title, score=78, predictions, alerts                                                                |
| TST-COMP-18 | `src/components/credit-repair/__tests__/AICreditRepairStrategy.test.tsx` | AICreditRepairStrategy > Component Rendering | ~4    | Loading, title, success rate 82%/+100pts, score=88                                                           |
| TST-COMP-19 | `src/components/disputes/__tests__/AIDisputeStrategy.test.tsx`           | AIDisputeStrategy > Component Rendering      | ~3    | Loading, title, success score=85%                                                                            |
| TST-COMP-20 | `src/components/financial/__tests__/AIInsightsPanel.test.tsx`            | AIInsightsPanel > Component Rendering        | ~3    | Loading, title, score=78                                                                                     |
| TST-COMP-21 | `src/components/goals/__tests__/AIGoalsOptimizer.test.tsx`               | AIGoalsOptimizer > Component Rendering       | ~3    | Loading, title, score                                                                                        |
| TST-COMP-22 | `src/components/spending/__tests__/AISpendingInsights.test.tsx`          | AISpendingInsights > Component Rendering     | ~3    | Loading, title, score=72                                                                                     |

### 6.4 Investment Components

| TestID      | File                                                                                | Describes                                                           | Cases | Scope                                                                                          |
| ----------- | ----------------------------------------------------------------------------------- | ------------------------------------------------------------------- | ----- | ---------------------------------------------------------------------------------------------- |
| TST-COMP-23 | `src/components/investments/__tests__/AIInvestmentInsights.test.tsx`                | AIInvestmentInsights > Component Rendering                          | ~4    | Loading, title, score=78, AAPL buy 85% confidence                                              |
| TST-COMP-24 | `src/components/investments/allocation/__tests__/AssetAllocationPanel.test.tsx`     | AssetAllocationPanel                                                | ~5    | ThemeProvider, risk selector, analyze button, allocation chart, offline state                  |
| TST-COMP-25 | `src/components/investments/analysis/__tests__/ComprehensiveAnalysisPanel.test.tsx` | ComprehensiveAnalysisPanel > Component Rendering, User Interactions | ~5    | Panel renders, symbol input, auto-uppercase, timeframe selector, analyze button enable/disable |

---

## 7. Jest — Mobile App Tests

| TestID     | File                                                          | Describes                                                                                                                                                                                                                                      | Cases | Scope                                                                                                                                             |
| ---------- | ------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| TST-MOB-01 | `mobile-app/src/components/__tests__/components.test.tsx`     | Button (4), Card (1), Input (3), ProgressRing (2), EmptyState (2), AlertCard (1), CreditFactorCard (1), TimelineItem (1), SearchInput (1), Skeleton Components (4), ScoreGauge (4), BottomSheet (2), LineChart (2), BarChart (2), PieChart (2) | 32    | Full mobile UI component library using @testing-library/react-native                                                                              |
| TST-MOB-02 | `mobile-app/src/components/__tests__/LastUpdated.test.tsx`    | LastUpdated Component                                                                                                                                                                                                                          | 13    | Null→"Never", <60s→"Just now", minutes, hours, yesterday, days, >=7d→date, custom label, showIcon, sizes (medium/small), interval update, cleanup |
| TST-MOB-03 | `mobile-app/src/__tests__/integration/navigation.test.tsx`    | Navigation Integration > Authentication Flow (2), Tab Navigation (3), Deep Linking (3), Back Navigation (1), Protected Routes (3), State Persistence (1)                                                                                       | 13    | Auth guards, tab navigation, deep linking, RBAC admin routes, state restore                                                                       |
| TST-MOB-04 | `mobile-app/src/__tests__/integration/dataSync.test.ts`       | Data Sync Integration, Offline/Online Sync                                                                                                                                                                                                     | ~8    | Background sync, conflict resolution, queue replay, retry logic                                                                                   |
| TST-MOB-05 | `mobile-app/src/services/api/__tests__/client.test.ts`        | API Client, HTTP Layer                                                                                                                                                                                                                         | ~10   | Base URL config, auth header injection, error handling, retry, timeout                                                                            |
| TST-MOB-06 | `mobile-app/src/services/api/__tests__/credit.test.ts`        | Credit API Service                                                                                                                                                                                                                             | ~6    | Fetch credit score, report history, bureau data, error states                                                                                     |
| TST-MOB-07 | `mobile-app/src/services/api/__tests__/disputes.test.ts`      | Disputes API Service                                                                                                                                                                                                                           | ~6    | List/create/update disputes, status transitions, error handling                                                                                   |
| TST-MOB-08 | `mobile-app/src/store/__tests__/authStore.test.ts`            | Auth Store (Zustand), Session Management                                                                                                                                                                                                       | ~10   | Login/logout, token refresh, session persistence, error states                                                                                    |
| TST-MOB-09 | `mobile-app/src/store/__tests__/creditStore.test.ts`          | Credit Store (Zustand), Credit Data State                                                                                                                                                                                                      | ~8    | Score loading, history tracking, bureau selection, cache                                                                                          |
| TST-MOB-10 | `mobile-app/src/store/__tests__/creditStore.realtime.test.ts` | Credit Store Realtime, Live Updates                                                                                                                                                                                                            | ~6    | WebSocket subscription, score update events, reconnection                                                                                         |
| TST-MOB-11 | `mobile-app/src/store/__tests__/disputeStore.test.ts`         | Dispute Store (Zustand), Dispute State                                                                                                                                                                                                         | ~8    | Dispute list, filter, create, status update, optimistic updates                                                                                   |
| TST-MOB-12 | `mobile-app/src/store/__tests__/financialStore.test.ts`       | Financial Store (Zustand), Financial Data State                                                                                                                                                                                                | ~8    | Account balances, transaction loading, budget tracking                                                                                            |

---

## 8. Cypress E2E Tests

| TestID     | File                                     | Describes                                                                                            | Cases | Focus                                                                                         |
| ---------- | ---------------------------------------- | ---------------------------------------------------------------------------------------------------- | ----- | --------------------------------------------------------------------------------------------- |
| TST-CYP-01 | `cypress/e2e/user-workflow.cy.ts`        | User Workflow — Landing, Public Pages (4), Protected Routes (9), Login, Pricing, API                 | 23    | Core user journey: landing → public → protected redirect → login → pricing → API availability |
| TST-CYP-02 | `cypress/e2e/landing-page.cy.ts`         | Landing Page > Layout & Content (5), Navigation (1), Responsive (4), Performance (1)                 | 11    | Landing page layout, navigation, mobile/tablet/desktop viewports, load time                   |
| TST-CYP-03 | `cypress/e2e/pricing-page.cy.ts`         | Pricing Page > Plan Display (4), Responsive (2)                                                      | 6     | Plan display and responsive design                                                            |
| TST-CYP-04 | `cypress/e2e/credit-factors-page.cy.ts`  | Credit Factors > Content & Layout (4), Responsive (3), Accessibility (2)                             | 9     | /credit/factors public page, viewports, img alt text, html lang                               |
| TST-CYP-05 | `cypress/e2e/page-routes.cy.ts`          | Public Pages (3), Auth-Protected (19), Login (1), 404 (2)                                            | 25    | Comprehensive route verification: 19 protected routes → 307, 3 public → 200, 404 handling     |
| TST-CYP-06 | `cypress/e2e/authentication.cy.ts`       | Authentication > Login Page (2), Protected Routes (6), Public Pages (3)                              | ~11   | Auth enforcement, login rendering, redirect enforcement                                       |
| TST-CYP-07 | `cypress/e2e/protected-redirects.cy.ts`  | Protected Pages (19), Public Pages (3), Login Accessibility (1)                                      | 23    | Full middleware-level auth for 19 routes → 307, 3 public → 200                                |
| TST-CYP-08 | `cypress/e2e/credit-repair.cy.ts`        | Auth Enforcement (5), POST Endpoints Auth (2), Response Format (1)                                   | 8     | Credit repair API → 401, POST → 401/405, response format validation                           |
| TST-CYP-09 | `cypress/e2e/credit-repair-api.cy.ts`    | Auth Protection (7), Method Enforcement (2), Dynamic Routes (5), Response Format (1)                 | 15    | Exhaustive credit repair API coverage: all 7 endpoints, [id] routes, error format             |
| TST-CYP-10 | `cypress/e2e/credit-reports.cy.ts`       | Page Access (5), API Auth (2)                                                                        | 7     | Credit pages redirect, score/disputes API → 401                                               |
| TST-CYP-11 | `cypress/e2e/disputes.cy.ts`             | Page Access (2), API Auth (4), POST (3), Response Format (2), AI Tools (1), Dispute Generation (2)   | 14    | Dispute pages, API auth, POST enforcement, response format, dispute generation                |
| TST-CYP-12 | `cypress/e2e/api-endpoints.cy.ts`        | Credit Repair API E2E > Disputes API                                                                 | ~3    | Disputes CRUD (POST → 201/401, GET all, PUT update)                                           |
| TST-CYP-13 | `cypress/e2e/api-health-check.cy.ts`     | API Health Check > Credit Repair API, Investment API                                                 | 14+   | Comprehensive health check across all endpoints                                               |
| TST-CYP-14 | `cypress/e2e/payment-subscription.cy.ts` | Pricing Page Public (6), Protected Routes (2), API Auth (2), Responsive (3)                          | 13    | Pricing page display, payment API auth, responsive pricing                                    |
| TST-CYP-15 | `cypress/e2e/payment-api.cy.ts`          | Payment API (3), Notifications API (2), Admin API (2)                                                | 7     | Checkout → 405/401/error, notifications → 400/401, admin → 401/405                            |
| TST-CYP-16 | `cypress/e2e/ai-api.cy.ts`               | Auth Protection (3), Request Validation (2), GET Returns (2)                                         | 7     | AI chat/consensus/financial-coach → 401, empty body → 400, GET → 200/401                      |
| TST-CYP-17 | `cypress/e2e/investment-api.cy.ts`       | Portfolio Analysis (3), Allocation (2), Comprehensive (1), Response Headers (1)                      | 7     | Investment API CRUD, content-type validation                                                  |
| TST-CYP-18 | `cypress/e2e/financial-api.cy.ts`        | Auth Required (6), Analytics (1), Onboarding (1)                                                     | 8     | Budgets/spending/bills/goals/savings → 401, analytics → 401, onboarding → 401                 |
| TST-CYP-19 | `cypress/e2e/marketplace-api.cy.ts`      | Providers (2), Products (1), Tradelines (1), Reviews (2), Error Handling (1)                         | 7     | Public marketplace endpoints, query param filtering, 404                                      |
| TST-CYP-20 | `cypress/e2e/student-loans-api.cy.ts`    | Student Loans (2), Strategy (2), Federal Programs (1)                                                | 5     | GET with/without userId, POST strategy, federal programs                                      |
| TST-CYP-21 | `cypress/e2e/security-headers.cy.ts`     | Content-Type Headers (2), Error Response Format (3), Method Restrictions (1), Response Structure (2) | 8     | application/json, error shapes, method 405, marketplace {success,data,meta} pattern           |

---

## 9. Playwright E2E Tests

| TestID    | File                                             | Describes                                                                                                                                                    | Cases       | Focus                                                                                                                                                                                                |
| --------- | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| TST-PW-01 | `e2e/home.spec.ts`                               | Home Page (5), SEO and Accessibility (3)                                                                                                                     | 8           | Hero section, navigation, pricing link, mobile 375px, load time <5s, meta tags, heading hierarchy, alt text                                                                                          |
| TST-PW-02 | `e2e/pricing.spec.ts`                            | Pricing Page (8), Pricing Page Navigation (2)                                                                                                                | 10          | Three tiers, plan names, prices, CTAs, billing toggle, recommended plan, feature lists, accessibility, signup routing, FAQ                                                                           |
| TST-PW-03 | `e2e/auth.spec.ts`                               | Authentication > Login Page (5), Registration (1), Protected Routes (2), Password Visibility (1)                                                             | 9           | Form display, empty validation, invalid credentials, forgot password, sign up link, protected redirect, password toggle                                                                              |
| TST-PW-04 | `e2e/dashboard.spec.ts`                          | Dashboard Unauthenticated (1), Layout Elements (3 skipped), Navigation Structure (1), Mobile (1), API Routes (3), Performance (1)                            | 10 (3 skip) | Redirect to login, route existence <500, mobile redirect, API reachability, response <3s                                                                                                             |
| TST-PW-05 | `e2e/chat-suite.spec.ts`                         | Chat Flows E2E Tests                                                                                                                                         | 10          | Session management, message flow (mocked AI), intent detection, auth validation, state persistence, network error, invalid input, auth error, mobile 375px, XSS protection                           |
| TST-PW-06 | `e2e/financial-suite.spec.ts`                    | Financial Flows E2E Tests                                                                                                                                    | 4           | Smart Budget page, Goal Creation modal, Debt Payoff Calculator, mobile viewport                                                                                                                      |
| TST-PW-07 | `e2e/investment-suite.spec.ts`                   | Investment Flows E2E Tests                                                                                                                                   | 4           | Portfolio Overview, Holdings Management modal, Stock Analysis AAPL, mobile 375px                                                                                                                     |
| TST-PW-08 | `e2e/investments/accessibility.spec.ts`          | Investment Accessibility > Portfolio Dashboard (7), Stock Analysis (3), Holdings Management (3), Mobile (1)                                                  | 14          | WCAG 2.1 AA via AxeBuilder, heading hierarchy, ARIA labels, keyboard nav, color contrast, form labels, touch targets >=44px                                                                          |
| TST-PW-09 | `e2e/investments/asset-allocation.spec.ts`       | Asset Allocation Demo                                                                                                                                        | 7 (6 skip)  | Auth requirement (1 active), demo page load, risk selector, analyze, 5 risk levels, rebalancing, mobile (6 skipped)                                                                                  |
| TST-PW-10 | `e2e/investments/comprehensive-analysis.spec.ts` | Comprehensive Investment Analysis                                                                                                                            | 9           | Page loads, analyze disabled/enabled, AAPL/MSFT results, export buttons, CSV export, timeframe change                                                                                                |
| TST-PW-11 | `e2e/investments/holdings-management.spec.ts`    | Holdings Management                                                                                                                                          | 9           | Page loads, existing holdings, add button, add dialog, fill+submit form, filter by type, sort columns, edit holding, delete+confirm, mobile                                                          |
| TST-PW-12 | `e2e/investments/portfolio-management.spec.ts`   | Portfolio Management                                                                                                                                         | 8           | Dashboard loads, summary cards, time period tabs, allocation chart, holdings list, navigate to holdings, empty state, mobile                                                                         |
| TST-PW-13 | `e2e/investments/stock-analysis.spec.ts`         | Stock Analysis                                                                                                                                               | 11          | AAPL page, stock header+price, AI recommendation, confidence %, target price, technical tab (RSI/MACD), fundamental tab (P/E), sentiment tab, AI insights tab, price chart, add to watchlist, mobile |
| TST-PW-14 | `e2e/student-loans.spec.ts`                      | Student Loan Agent (5), Calculations (1), Programs (3), Navigation (2)                                                                                       | 11          | Tools/features, calculator, repayment programs, SAVE/PSLF/Fresh Start, back nav, related links                                                                                                       |
| TST-PW-15 | `e2e/marketplace.spec.ts`                        | Marketplace Pages (2), Tradelines (3), Secured Cards (2), Education (1), Search (1), Mobile (2)                                                              | 11          | Routes accessible, product categories, tradeline listings/filter/pricing, card offerings/benefits, content, search, responsive                                                                       |
| TST-PW-16 | `e2e/api.spec.ts`                                | API Health (1), Auth (2), Disputes (3), Credit Builder (2), Credit Report (2), Notifications (2), Payment (2), Admin (2), Student Loans (2), Marketplace (1) | 19          | Broad API coverage: existence + auth checks across all domains                                                                                                                                       |

---

## 10. Cross-Cutting Test Patterns

### 10.1 Mocking Strategies

| Pattern                                      | Used By                         | Description                                               |
| -------------------------------------------- | ------------------------------- | --------------------------------------------------------- |
| `jest.mock('@/lib/security/jwt-validation')` | All credit-repair API tests     | Mocks JWT token extraction and validation                 |
| `jest.mock('@/lib/db')`                      | Credit-repair route tests       | Mocks database access layer                               |
| `jest.mock('@/lib/security/audit-logging')`  | Most API tests                  | Mocks audit logging (logAIInteraction, logSecurityEvent)  |
| `jest.mock('@/lib/supabase/server')`         | Onboarding, auth tests          | Mocks Supabase server client with chainable API           |
| `renderWithProviders`                        | AI component tests              | Wraps Redux/context providers for component rendering     |
| MSW (`import { server }`)                    | Financial AI endpoints          | Mock Service Worker for fetch-level API interception      |
| `node-mocks-http`                            | Federal programs, student loans | Creates mock HTTP request/response objects                |
| `page.route()`                               | Playwright chat suite           | Playwright API route interception for mocked AI responses |
| `@jest-environment node`                     | Marketplace pure logic tests    | Runs tests in Node.js environment without jsdom           |

### 10.2 Test Utility Files

| File                            | Purpose                                                          |
| ------------------------------- | ---------------------------------------------------------------- |
| `src/__tests__/mocks/server.ts` | MSW mock server setup                                            |
| `src/__tests__/test-utils.tsx`  | `renderWithProviders` helper wrapping Redux/context              |
| `cypress/support/commands.ts`   | Custom Cypress commands                                          |
| `cypress/support/e2e.ts`        | Cypress E2E setup                                                |
| `e2e/helpers/auth.ts`           | Playwright auth helpers (AUTH_STORAGE_STATE, restoreAuthSession) |

### 10.3 Critical Auth Verification Pattern

Most API route tests follow this sequence:

1. **401 Unauthorized** — No auth token
2. **403 Forbidden** — Valid token but insufficient role (RBAC routes only)
3. **400 Bad Request** — Valid auth but invalid input
4. **200 Success** — Valid auth and valid input
5. **404 Not Found** — Valid auth but resource doesn't exist
6. **500 Server Error** — Database/service failure

---

## 11. Coverage Gap Analysis

### 11.1 Domains With Strong Coverage

| Domain          | API Tests                 | Lib/Service Tests             | Component Tests               | E2E Tests                            | Assessment |
| --------------- | ------------------------- | ----------------------------- | ----------------------------- | ------------------------------------ | ---------- |
| Credit Repair   | 16 API files (~130 cases) | 2 lib files (~22 cases)       | 3 files (~29 cases)           | 4 Cypress (~45 cases)                | Excellent  |
| Investments     | 3 API files (~26 cases)   | 13 service files (~133 cases) | 3 component files (~14 cases) | 8 Playwright (~72 cases)             | Excellent  |
| Financial Suite | 3 API files (~45 cases)   | 20 lib files (~210 cases)     | —                             | 1 Cypress (~8 cases)                 | Excellent  |
| AI/ML Services  | 1 API file (~10 cases)    | 8 lib files (~85 cases)       | —                             | 1 Cypress (~7 cases)                 | Good       |
| Marketplace     | 5 API files (~89 cases)   | —                             | —                             | 2 E2E files (~18 cases)              | Good       |
| Payment         | 1 API file (~10 cases)    | 4 lib files (~38 cases)       | —                             | 2 Cypress (~20 cases)                | Good       |
| Authentication  | 1 API file (~10 cases)    | —                             | —                             | 3 Cypress + 1 Playwright (~43 cases) | Good       |

### 11.2 Domains With Weak Coverage

| Domain        | Existing Tests                                                         | Gap                                                   | Priority |
| ------------- | ---------------------------------------------------------------------- | ----------------------------------------------------- | -------- |
| Trading       | 5 lib tests (~84 cases) — validators, config, core engine, ML strategy | No API route tests, no component tests, no E2E        | HIGH     |
| Admin         | 1 API test + 1 page test (~13 cases)                                   | 16 admin API routes, only 1 tested                    | HIGH     |
| Notifications | 1 API test + 1 lib test (~20 cases)                                    | No component tests, minimal E2E (1 Cypress check)     | MEDIUM   |
| Documents     | 1 lib test (~12 cases)                                                 | No API route tests, no component tests, no E2E        | MEDIUM   |
| Tax           | 2 lib tests (~17 cases)                                                | No API route tests, no component tests                | MEDIUM   |
| Onboarding    | 1 API test + 1 page test (~11 cases)                                   | Limited coverage of multi-step flow                   | MEDIUM   |
| Security      | 3 lib tests (~28 cases)                                                | No integration tests for security middleware pipeline | LOW      |

### 11.3 Skipped Tests

| TestID    | File                                       | Skipped Count | Reason                                                          |
| --------- | ------------------------------------------ | ------------- | --------------------------------------------------------------- |
| TST-PW-04 | `e2e/dashboard.spec.ts`                    | 3             | Pending authentication fixture (sidebar, header, credit widget) |
| TST-PW-09 | `e2e/investments/asset-allocation.spec.ts` | 6             | Pending public demo page access                                 |

---

## 12. Test Execution Quick Reference

```bash
# === Jest (Unit + Integration) ===
npm test                                          # All Jest tests
npm test -- --watch                               # Watch mode
npm test -- --coverage                            # With coverage report
npm test -- src/lib/trading/pctt                  # Single directory
npm test -- --testPathPattern="credit-repair"     # Pattern match

# === Cypress (E2E — API & Route Validation) ===
npm run cypress:open                              # Interactive mode
npm run cypress:run                               # Headless CI mode
npx cypress run --spec "cypress/e2e/disputes.cy.ts"   # Single spec

# === Playwright (E2E — Browser Journeys) ===
npx playwright test                               # All specs
npx playwright test e2e/auth.spec.ts              # Single spec
npx playwright test --ui                          # Interactive UI mode
npx playwright test --grep "accessibility"        # Pattern match

# === Full Pipeline (CI order) ===
npm run lint && npm run type-check && npm test -- --coverage && npm run build
```

---

_Document generated from codebase analysis on 2026-02-16._
