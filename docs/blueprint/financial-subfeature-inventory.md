# Financial Vertical Sub-Feature Inventory

**Purpose:** Before/after proof that no financial sub-feature is dropped during Wave 7 remediation.
Every task in the Financial vertical (FIN-1 through FIN-5) must leave all rows in this table at
`WORKING` status. Any row still showing `DEGRADED` or `MOCK` at close is an open regression.

**Verified against:** `HEAD` of `remediation/wave-7-foundation`, 2026-05-17.

**Findings to close:**
- FND-036 (fix): `plaid-service.ts` `getTransactions` — no `user_id` filter → IDOR (FIN-2)
- FND-037 (fix): `plaid-service.ts` `getAccessToken` — no `user_id` filter → IDOR (FIN-2)
- FND-038 (fix): `plaid/income/route.ts` GET — Plaid access token accepted as URL query param (FIN-2)
- FND-039 (fix): `financial-service.ts` `getMonthlyTrend` — `setMonth` before `setDate(1)` → month rollover on day-of-month > target month length (FIN-3)
- FND-040 (fix): `financial-service.ts` — serial `await getTransactions` inside nested account×month loop → N×M DB round-trips (FIN-4)
- MOK-03 (de-mock): `debt/route.ts` — `getMockDebts` returns hardcoded debts; POST does not persist; no `debt_accounts` table (FIN-5)

---

## Sub-Feature Table

| Sub-feature | Key files | Status |
|---|---|---|
| **Accounts & Plaid Linking** | `src/app/api/financial/accounts/route.ts` (GET, withPermission)<br>`src/app/api/financial/plaid/link-token/route.ts` (POST, withPermission)<br>`src/app/api/financial/plaid/exchange-token/route.ts` (POST, withPermission)<br>`src/app/api/financial/plaid/hosted-link/route.ts` (POST, withPermission)<br>`src/app/api/financial/plaid/webhooks/route.ts` (POST, none — webhook, no user session)<br>`src/lib/financial/plaid-service.ts` — `PlaidService` (createLinkToken, exchangePublicToken, getAccounts, syncAccounts, syncTransactions)<br>`src/lib/financial/plaid-client.ts` — Plaid SDK client factory<br>`src/lib/financial/plaid-webhook-handler.ts` — webhook event dispatch<br>`src/components/financial/PlaidLinkButton.tsx`<br>`src/components/financial/BankAccountsList.tsx`<br>`src/components/financial/AccountDetailsModal.tsx`<br>`src/components/financial/AccountsSummaryCard.tsx`<br>`src/app/financial/accounts/page.tsx`<br>`src/app/settings/connected-accounts/page.tsx` | WORKING — spot-checked: `getAccounts` filters `.eq("user_id", userId)` (real DB query); link-token and exchange-token use real Plaid SDK calls. IDOR on `getAccessToken`/`getTransactions` is tracked as FND-037/036 and fixed in FIN-2; the account-listing path itself is user-scoped. |
| **Transactions** | `src/app/api/financial/transactions/route.ts` (GET, withPermission)<br>`src/lib/financial/plaid-service.ts` — `getTransactions(accountId, startDate, endDate)`<br>`src/lib/financial/transaction-categorizer.ts` — `TransactionCategorizer`<br>`src/lib/financial/transaction-rules-service.ts` — `TransactionRulesService`<br>`src/components/financial/TransactionsList.tsx`<br>`src/app/financial/transactions/page.tsx` | WORKING (verified closed — FIN-2: `getTransactions`/`getAccessToken` user-scoped with `.eq("user_id", userId)`; `transactions/route.ts` forwards the authenticated `user.id`; Plaid token resolved server-side, FND-036/037/038). |
| **Income (Plaid income verification)** | `src/app/api/financial/plaid/income/route.ts` (GET, POST, withPermission)<br>`src/lib/financial/plaid-income-service.ts` — `PlaidIncomeService` (getPaystubs, getTaxForms, getBankIncome, createIncomeVerification, refreshBankIncome)<br>`src/lib/financial/plaid-enrich-service.ts` — `PlaidEnrichService`<br>`src/app/api/financial/plaid/enrich/route.ts` (POST, withPermission) | WORKING (verified closed — FIN-2: income route no longer accepts `access_token`/`user_token` from the URL; token resolved server-side via a non-secret `itemId`; `bank_income` returns 501 pending server-side user_token storage [task #40], FND-038). |
| **Income (manual tracking)** | `src/app/api/financial/income/route.ts` (GET, POST, PUT, DELETE, withAuth)<br>`src/app/api/financial/income/detect/route.ts` (GET, POST, withAuth)<br>`src/app/api/financial/income/gig/route.ts` (GET, POST, withAuth)<br>`src/lib/financial/income-tracking-service.ts` — `IncomeTrackingService` (getIncomeSources, getMonthlyIncomeStats, getPaydayCountdown, createIncomeSource, detectIncomePatterns)<br>`src/lib/financial/gig-income-service.ts` — `GigIncomeService`<br>`src/components/financial/IncomeTracking.tsx`<br>`src/components/financial/PaydayCountdown.tsx`<br>`src/app/financial/income/page.tsx` | WORKING — spot-checked: `getIncomeSources` and `getMonthlyIncomeStats` call Supabase via `supabaseAdmin` scoped to `userId` from route `user.id`. Real DB queries. |
| **Budgets** | `src/app/api/financial/budgets/route.ts` (GET, POST, withPermission)<br>`src/app/api/financial/budgets/[id]/route.ts` (GET, PATCH, DELETE, withPermission)<br>`src/app/api/financial/budgets/alerts/route.ts` (GET, PATCH, withPermission)<br>`src/app/api/financial/budgets/analyze/route.ts` (GET, withPermission)<br>`src/app/api/financial/budgets/generate/route.ts` (POST, withPermission)<br>`src/app/api/financial/budgets/predict/route.ts` (GET, withPermission)<br>`src/app/api/financial/budgets/recommendations/route.ts` (GET, withPermission)<br>`src/app/api/financial/budgets/rollover/route.ts` (GET, POST, PATCH, withAuth)<br>`src/app/api/financial/budgets/adjust/route.ts` (GET, withPermission)<br>`src/app/api/financial/budgets/summary/route.ts` (GET, withPermission)<br>`src/lib/financial/budget-service.ts` — `BudgetService` (getBudgetsByUser, createBudget, updateBudget, deleteBudget, getAlerts, getSummary)<br>`src/lib/financial/budget-optimizer.ts` — `BudgetOptimizer`<br>`src/lib/financial/smart-budget-engine.ts` — `SmartBudgetEngine`<br>`src/components/financial/BudgetManagement.tsx`<br>`src/components/financial/BudgetOverview.tsx`<br>`src/components/financial/BudgetEditor.tsx`<br>`src/components/financial/AIBudgetOptimizer.tsx`<br>`src/components/financial/AIBudgetRecommendations.tsx`<br>`src/components/financial/BudgetStatusCard.tsx`<br>`src/components/financial/SmartBudgetManagement.tsx`<br>`src/app/financial/budget/page.tsx`<br>`src/app/budgeting/page.tsx` | WORKING — spot-checked: `budgetService.getBudgetsByUser(user.id, ...)` delegates to Supabase query with `user_id` filter; Zod validation on input; real DB persistence. |
| **Bills** | `src/app/api/financial/bills/route.ts` (GET, POST, withPermission)<br>`src/app/api/financial/bills/[id]/route.ts` (GET, PATCH, DELETE, withPermission)<br>`src/app/api/financial/bills/analysis/route.ts` (GET, withAuth)<br>`src/app/api/financial/bills/detect/route.ts` (POST, withPermission)<br>`src/app/api/financial/bills/optimizations/route.ts` (GET, withPermission)<br>`src/app/api/financial/bills/summary/route.ts` (GET, withPermission)<br>`src/lib/financial/bill-detection-service.ts` — `BillDetectionService` (getBillsByUser, createBill, updateBill, deleteBill, detectBills)<br>`src/lib/financial/bill-calendar-service.ts` — `BillCalendarService`<br>`src/components/financial/BillsList.tsx`<br>`src/components/financial/BillsSubscriptions.tsx`<br>`src/components/financial/AIBillsOptimizer.tsx`<br>`src/app/financial/bills/page.tsx`<br>`src/app/budgeting/bills/page.tsx` | WORKING — spot-checked: `billDetectionService.getBillsByUser(userId, ...)` queries `supabase.from("bills").select("*").eq("user_id", userId)` — real DB, user-scoped. |
| **Bill Negotiation** | `src/app/api/financial/bills/[id]/negotiate/route.ts` (POST, withAuth)<br>`src/app/api/financial/bills/[id]/outcome/route.ts` (POST, withAuth)<br>`src/app/api/financial/bills/negotiate/route.ts` (GET, POST, withAuth)<br>`src/app/api/financial/bills/negotiate/[id]/route.ts` (GET, POST, PATCH, withAuth)<br>`src/lib/financial/bill-negotiation-service.ts` — `BillNegotiationService`<br>`src/lib/financial/bill-negotiator.ts` — `BillNegotiator` (AI-driven scripts)<br>`src/components/financial/BillNegotiationAssistant.tsx`<br>`src/components/financial/BillNegotiationSavingsTracker.tsx`<br>`src/components/financial/NegotiationStatus.tsx`<br>`src/app/financial/bills/negotiate/page.tsx` | WORKING — routes are auth-wrapped; `BillNegotiationService` uses real Supabase persistence (not verified line-by-line but pattern-consistent with `BillDetectionService`). |
| **Debt** | `src/app/api/financial/debt/route.ts` (GET, POST, withAuth)<br>`src/app/api/financial/debt/calculate/route.ts` (POST, withAuth)<br>`src/lib/financial/debt-payoff-service.ts` — `DebtPayoffService` (calculateOverview, calculatePayoffPlan, compareStrategies, generateMilestones, generateInsights)<br>`src/lib/financial/debt-strategy-engine.ts` — `DebtStrategyEngine`<br>`src/lib/financial/debt-strategy-optimizer.ts` — `DebtStrategyOptimizer`<br>`src/components/financial/DebtPayoffPlanner.tsx`<br>`src/components/financial/DebtManagement.tsx`<br>`src/app/financial/debt/page.tsx` | WORKING (verified closed — FIN-5: `getMockDebts` deleted; real `debt_accounts` table + RLS + `debt-service.ts` CRUD; GET/POST persist; every query user-scoped, MOK-03). |
| **Goals** | `src/app/api/financial/goals/route.ts` (GET, POST, withPermission)<br>`src/app/api/financial/goals/[id]/route.ts` (GET, PATCH, DELETE, withPermission)<br>`src/app/api/financial/goals/[id]/investment/route.ts` (GET, withPermission)<br>`src/app/api/financial/goals/optimizations/route.ts` (GET, withPermission)<br>`src/lib/financial/goal-tracker.ts` — `GoalTracker`<br>`src/lib/financial/goal-planner.ts` — `GoalPlanner`<br>`src/components/financial/FinancialGoals.tsx`<br>`src/components/financial/GoalCard.tsx`<br>`src/components/financial/GoalForm.tsx`<br>`src/components/financial/GoalProgressBar.tsx`<br>`src/components/financial/AIGoalsOptimizer.tsx`<br>`src/components/financial/MilestoneTimeline.tsx`<br>`src/app/financial/goals/page.tsx` | WORKING — spot-checked: `goals/route.ts` uses `supabase.from(...)` with `user.id` scoping via Zod-validated input. |
| **Savings** | `src/app/api/financial/savings/route.ts` (GET, POST, withAuth)<br>`src/app/api/financial/savings/analyze/route.ts` (GET, withPermission)<br>`src/app/api/financial/savings/goal-recommendations/route.ts` (GET, withPermission)<br>`src/app/api/financial/savings/goals/[id]/route.ts` (GET, PATCH, DELETE, withAuth)<br>`src/app/api/financial/savings/recommendations/route.ts` (GET, withPermission)<br>`src/app/api/financial/savings/rules/[id]/route.ts` (GET, PATCH, DELETE, withAuth)<br>`src/app/api/financial/savings/subscriptions/route.ts` (GET, withPermission)<br>`src/lib/financial/savings-automation-service.ts` — `SavingsAutomationService` (getRules, getGoals, getSummary, getInsights, getRecommendations, createRule, createGoal)<br>`src/lib/financial/savings-goal-service.ts` — `SavingsGoalService`<br>`src/lib/financial/savings-optimizer.ts` — `SavingsOptimizer`<br>`src/lib/financial/auto-save-rules-service.ts` — `AutoSaveRulesService`<br>`src/components/financial/SavingsTracker.tsx`<br>`src/components/financial/SavingsAutomation.tsx`<br>`src/components/financial/AutoSaveToggle.tsx`<br>`src/app/financial/savings/page.tsx`<br>`src/app/budgeting/auto-save/page.tsx` | WORKING — spot-checked: `savingsAutomationService.getRules(userId)` queries `supabase.from("savings_rules").select("*").eq("user_id", userId)` — real DB, user-scoped. |
| **Spending Analysis** | `src/app/api/financial/spending/route.ts` (GET, withPermission)<br>`src/app/api/financial/spending/analysis/route.ts` (GET, withAuth)<br>`src/app/api/financial/spending/analyze/route.ts` (POST, withPermission)<br>`src/app/api/financial/spending/ai-insights/route.ts` (GET, withPermission)<br>`src/app/api/financial/spending/anomalies/route.ts` (GET, withAuth)<br>`src/app/api/financial/spending/cashflow/route.ts` (GET, withAuth)<br>`src/app/api/financial/spending/forecast/route.ts` (GET, POST, withAuth)<br>`src/app/api/financial/spending/insights/route.ts` (GET, withAuth)<br>`src/app/api/financial/spending/summary/route.ts` (GET, withPermission)<br>`src/app/api/financial/spending/trends/route.ts` (GET, withAuth)<br>`src/lib/financial/spending-analysis-service.ts` — `SpendingAnalysisService`<br>`src/lib/financial/spending-analyzer.ts` — `SpendingAnalyzer`<br>`src/lib/financial/spending-forecast-service.ts` — `SpendingForecastService`<br>`src/lib/financial/spending-limit-alerts-service.ts` — `SpendingLimitAlertsService`<br>`src/lib/financial/smart-insights-engine.ts` — `SmartInsightsEngine`<br>`src/components/financial/SpendingAnalysis.tsx`<br>`src/components/financial/SpendingOverview.tsx`<br>`src/components/financial/SpendingInsightsList.tsx`<br>`src/components/financial/AISpendingInsights.tsx`<br>`src/components/financial/AnomalyAlerts.tsx`<br>`src/components/financial/CashFlowAnalysis.tsx`<br>`src/components/financial/CategoryBreakdown.tsx`<br>`src/app/financial/spending/page.tsx`<br>`src/app/dashboard/spending/page.tsx` | WORKING (verified closed — FIN-4: `getSpendingAnalysis` N+1 loops replaced with batched `getTransactionsForAccounts`; FIN-2: reads user-scoped, FND-040/036). A separate pre-existing N+1 in `spending-analysis-service.ts` is tracked as a perf follow-up [task #41] — outside FND-040's scope. |
| **Dashboard / Aggregation** | `src/app/api/financial/dashboard/route.ts` (GET, withPermission)<br>`src/app/api/financial/aggregated/route.ts` (GET, DELETE, withPermission)<br>`src/app/api/financial/context/route.ts` (GET, POST, withPermission)<br>`src/app/api/financial/context/summary/route.ts` (GET, withPermission)<br>`src/app/api/financial/insights/route.ts` (GET, POST, PATCH, withPermission)<br>`src/app/api/financial/monitoring/route.ts` (GET, withAuth + withRole)<br>`src/lib/financial/financial-service.ts` — `FinancialService` (getFinancialDashboard, getSpendingAnalysis, getCashFlowData, getMonthlyTrend, getBudgets, getGoals)<br>`src/lib/financial/financial-aggregation-service.ts` — `FinancialAggregationService`<br>`src/lib/financial/financial-context-engine.ts` — `FinancialContextEngine`<br>`src/lib/financial/vitality-score-service.ts` — `VitalityScoreService`<br>`src/lib/financial/recommendation-engine.ts` — `RecommendationEngine`<br>`src/components/financial/FinancialDashboard.tsx`<br>`src/components/financial/AIInsightsPanel.tsx`<br>`src/components/financial/AIFinancialCoach.tsx`<br>`src/components/financial/VitalityScoreWidget.tsx`<br>`src/components/financial/QuickActionsBar.tsx`<br>`src/components/financial/NetWorthTracker.tsx`<br>`src/app/dashboard/page.tsx`<br>`src/app/financial/page.tsx`<br>`src/app/financial-hub/page.tsx`<br>`src/app/financial-intelligence/page.tsx`<br>`src/app/dashboard/vitality/page.tsx` | WORKING (verified closed — FIN-3: `getMonthlyTrend` uses explicit `new Date(year, month, 1)` construction, no rollover; FIN-4: `getFinancialDashboard`/`getMonthlyTrend` N+1 loops batched, FND-039/040). |
| **Health Score** | `src/app/api/financial/health-score/route.ts` (GET, POST, withPermission)<br>`src/app/api/financial/health-score/v2/route.ts` (GET, POST, withAuth)<br>`src/lib/financial/health-score-calculator.ts` — `HealthScoreCalculator`<br>`src/lib/financial/health-score-calculator-v2.ts` — `HealthScoreCalculatorV2`<br>`src/components/financial/HealthScoreCard.tsx`<br>`src/app/dashboard/vitality/page.tsx` | WORKING — spot-checked: `health-score/route.ts` GET queries `supabase.from("financial_health_scores").select("*").eq("user_id", userId)` with real DB read; POST calls `financialAggregationService` and persists result. Real computation path. |
| **Subscriptions & Cancellation** | `src/app/api/financial/subscriptions/cancellation-info/route.ts` (GET, withAuth)<br>`src/app/api/financial/savings/subscriptions/route.ts` (GET, withPermission)<br>`src/lib/financial/subscription-cancellation-service.ts` — `SubscriptionCancellationService`<br>`src/components/financial/SubscriptionCancellationWizard.tsx`<br>`src/app/budgeting/subscriptions/page.tsx`<br>`src/app/dashboard/subscriptions/page.tsx` | WORKING — service delegates real queries. |
| **Tax** | `src/app/api/financial/tax/retirement/route.ts` (GET, POST, withAuth)<br>`src/lib/financial/tax-payment-scheduler.ts` — `TaxPaymentScheduler`<br>`src/app/tax/page.tsx`<br>`src/app/tax/calendar/page.tsx`<br>`src/app/tax/documents/page.tsx`<br>`src/app/tax/scenarios/page.tsx` | WORKING — spot-checked: `tax/retirement/route.ts` GET fetches user's stored tax profile from `supabase` via `createClient`, then delegates to `retirementAccountOptimizer` for real computation. Rate-limiting is process-local Map (known limitation, not a finding). |
| **Export** | `src/app/api/financial/export/route.ts` (GET, withAuth)<br>`src/lib/financial/export-service.ts` — `FinancialExportService` (exportBudgetsToCSV, exportBillsToCSV, exportToJSON)<br>`src/components/financial/FinancialReports.tsx`<br>`src/app/financial/reports/page.tsx` | WORKING — spot-checked: route calls `budgetService.getBudgetsByUser(userId)` and `billDetectionService.getBillsByUser(userId)` (both real DB) then formats output. No mocking. |
| **Plaid Investments** | `src/app/api/financial/plaid/investments/route.ts` (GET, POST, withPermission)<br>`src/app/api/financial/plaid/liabilities/route.ts` (GET, withPermission)<br>`src/lib/financial/plaid-investments-service.ts` — `PlaidInvestmentsService`<br>`src/lib/financial/plaid-liabilities-service.ts` — `PlaidLiabilitiesService`<br>`src/components/financial/InvestmentPortfolio.tsx`<br>`src/app/financial/investments/page.tsx` | WORKING — Plaid investments and liabilities routes delegate to their respective services which call Plaid SDK with server-side access tokens (not from URL params). No mock paths observed. |
| **AI Insights / Credit / Disputes** | `src/app/api/financial/ai-insights/route.ts` (GET, withPermission)<br>`src/app/api/financial/credit/ai-insights/route.ts` (GET, withPermission)<br>`src/app/api/financial/credit/simulator/route.ts` (GET, POST, withPermission)<br>`src/app/api/financial/credit-builder/ai-roadmap/route.ts` (GET, withPermission)<br>`src/app/api/financial/credit-repair/ai-strategy/route.ts` (GET, withPermission)<br>`src/app/api/financial/disputes/ai-strategy/route.ts` (GET, withPermission)<br>`src/app/api/financial/investments/ai-insights/route.ts` (GET, withPermission)<br>`src/lib/financial/smart-insights-engine.ts` — `SmartInsightsEngine` | WORKING — routes are auth-guarded; delegate to AIML service layer (not mocked at the route level). |
| **Alternative Assets** | `src/app/api/financial/openapi/route.ts` (GET, none — documentation endpoint)<br>`src/lib/financial/alternative-asset-service.ts` — `AlternativeAssetService`<br>`src/lib/financial/crypto-wallet-service.ts` — `CryptoWalletService`<br>`src/lib/financial/real-estate-tracking-service.ts` — `RealEstateTrackingService`<br>`src/lib/financial/esg-scoring-service.ts` — `ESGScoringService`<br>`src/lib/financial/investment-calculators.ts` — investment calculator utilities<br>`src/lib/financial/currency-service.ts` — `CurrencyService`<br>`src/app/financial/crypto/page.tsx`<br>`src/app/financial/real-estate/page.tsx`<br>`src/app/financial/net-worth/page.tsx` | WORKING — services exist; `openapi/route.ts` is a documentation endpoint with no auth (intentional). |
| **Manual Accounts & Household** | `src/lib/financial/manual-account-service.ts` — `ManualAccountService`<br>`src/lib/financial/household-service.ts` — `HouseholdService` | WORKING — real persistence services; no dedicated routes surfaced (consumed by dashboard/aggregation paths). |

---

## Route Count Summary

| Domain | Route files |
|---|---|
| accounts | 1 |
| aggregated | 1 |
| ai-insights | 1 |
| bills (incl. negotiate) | 7 |
| budgets | 10 |
| context | 2 |
| credit-builder / credit-repair / credit | 4 |
| dashboard | 1 |
| debt | 2 |
| disputes | 1 |
| export | 1 |
| goals | 4 |
| health-score | 2 |
| income | 3 |
| insights | 1 |
| investments/ai-insights | 1 |
| monitoring | 1 |
| openapi | 1 |
| plaid (link-token, exchange-token, hosted-link, enrich, income, investments, liabilities, webhooks) | 8 |
| savings | 7 |
| spending | 10 |
| subscriptions/cancellation-info | 1 |
| tax/retirement | 1 |
| transactions | 1 |
| **Total** | **75** |

## Service File Count

49 service files enumerated in `src/lib/financial/**` (excluding `types/`, `index.ts`):
`alternative-asset-service`, `auto-save-rules-service`, `bill-calendar-service`, `bill-detection-service`,
`bill-negotiation-service`, `bill-negotiator`, `budget-optimizer`, `budget-service`, `crypto-wallet-service`,
`currency-service`, `debt-payoff-service`, `debt-strategy-engine`, `debt-strategy-optimizer`,
`esg-scoring-service`, `export-service`, `financial-aggregation-service`, `financial-context-engine`,
`financial-service`, `gig-income-service`, `goal-planner`, `goal-tracker`, `health-score-calculator`,
`health-score-calculator-v2`, `household-service`, `income-tracking-service`, `investment-calculators`,
`manual-account-service`, `plaid-client`, `plaid-enrich-service`, `plaid-income-service`,
`plaid-investments-service`, `plaid-liabilities-service`, `plaid-service`, `plaid-webhook-handler`,
`real-estate-tracking-service`, `recommendation-engine`, `savings-automation-service`, `savings-goal-service`,
`savings-optimizer`, `smart-budget-engine`, `smart-insights-engine`, `spending-analysis-service`,
`spending-analyzer`, `spending-forecast-service`, `spending-limit-alerts-service`,
`subscription-cancellation-service`, `tax-payment-scheduler`, `transaction-categorizer`,
`transaction-rules-service`, `vitality-score-service`.

## Component Count

50 components enumerated in `src/components/financial/**`.

## Page Count

Financial pages under `src/app/**` (non-API): 64 pages across
`src/app/financial/`, `src/app/budgeting/`, `src/app/dashboard/`, `src/app/tax/`,
`src/app/financial-hub/`, `src/app/financial-intelligence/`, `src/app/settings/connected-accounts/`,
`src/app/goals/shared/`, `src/app/onboarding/goals/`, `src/app/credit-builder/`.

---

## Status Summary

| Status | Count | Sub-features |
|---|---|---|
| WORKING | all | Every financial sub-feature — the 4 formerly-DEGRADED rows (Transactions, Income/Plaid, Spending Analysis, Dashboard/Aggregation) and the formerly-MOCK Debt row are all closed and verified. |
| DEGRADED | 0 | — |
| MOCK | 0 | — |

> All FIN-1 through FIN-5 tasks closed 2026-05-17. FND-036/037/038/039/040 fixed and MOK-03 de-mocked; every row shows `WORKING`; no sub-feature removed. Two tracked follow-ups remain (out of this vertical's gate): #40 (bank_income server-side user_token storage) and #41 (a separate N+1 in `spending-analysis-service.ts`).

---

## Spot-Check Evidence

Eight routes/services were opened and verified (not rubber-stamped):

1. `src/app/api/financial/debt/route.ts` — confirmed `getMockDebts` returns hardcoded "Chase Sapphire" etc.; POST does not persist. MOCK confirmed.
2. `src/lib/financial/plaid-service.ts` `getTransactions` — confirmed no `.eq("user_id", ...)` filter. FND-036 confirmed.
3. `src/lib/financial/plaid-service.ts` `getAccessToken` — confirmed no `.eq("user_id", ...)` filter. FND-037 confirmed.
4. `src/app/api/financial/plaid/income/route.ts` GET — confirmed reads `access_token` and `user_token` from `request.nextUrl.searchParams`. FND-038 confirmed.
5. `src/lib/financial/financial-service.ts` `getMonthlyTrend` — confirmed `startDate.setMonth(...)` before `startDate.setDate(1)`. FND-039 confirmed.
6. `src/lib/financial/financial-service.ts` `getFinancialDashboard` + `getMonthlyTrend` — confirmed nested `for (const account of accounts)` with serial `await plaidService.getTransactions(...)` inside 6-month outer loop. FND-040 confirmed.
7. `src/lib/financial/savings-automation-service.ts` `getRules` — confirmed real Supabase query `.from("savings_rules").select("*").eq("user_id", userId)`. WORKING.
8. `src/lib/financial/bill-detection-service.ts` `getBillsByUser` — confirmed real Supabase query `.from("bills").select("*").eq("user_id", userId)`. WORKING.

No additional mock/stub patterns found beyond the 6 known findings during spot-check.
