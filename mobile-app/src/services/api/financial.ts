/**
 * Fynvita Mobile Financial API Service
 * Handles banking, budgets, transactions, goals, and debt management
 */

import { api } from "./client";
import type {
  BankAccount,
  Transaction,
  Budget,
  FinancialGoal,
  GoalType,
  ApiResponse,
  PaginatedResponse,
} from "./types";

// Bank Account Types
export interface PlaidLinkToken {
  linkToken: string;
  expiration: string;
}

export interface PlaidExchangeResult {
  success: boolean;
  accountsConnected: number;
}

// ---------------------------------------------------------------------------
// Financial dashboard — web -> mobile adapter (PARITY-P1)
// ---------------------------------------------------------------------------
// The real web route (GET /api/financial/dashboard) returns the full aggregate
// from financialService.getFinancialDashboard. Alongside the headline numbers it
// carries `spendingByCategory` (per-category month spend) and `monthlyTrend`
// (6-month income/expense/savings history). The mobile client previously declared
// a narrower shape that DROPPED both, so the dashboard tab had no real source for
// its spending breakdown or its month-over-month delta and fell back to hardcoded
// values. Surface the real fields; ignore web-only extras (accounts,
// recentTransactions, cashFlow).
export interface DashboardCategorySpending {
  category: string;
  amount: number;
  percentage: number;
  transactionCount: number;
}

export interface DashboardMonthlyTrend {
  month: string;
  income: number;
  expenses: number;
  savings: number;
}

export interface FinancialDashboardData {
  netWorth: number;
  totalAssets: number;
  totalLiabilities: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  savingsRate: number;
  spendingByCategory: DashboardCategorySpending[];
  monthlyTrend: DashboardMonthlyTrend[];
}

interface WebFinancialDashboard {
  netWorth: number;
  totalAssets: number;
  totalLiabilities: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  savingsRate: number;
  spendingByCategory?: {
    category: string;
    amount: number;
    percentage: number;
    transactionCount?: number;
  }[];
  monthlyTrend?: {
    month: string;
    income: number;
    expenses: number;
    savings: number;
  }[];
}

export function mapWebDashboard(
  d: WebFinancialDashboard,
): FinancialDashboardData {
  return {
    netWorth: d.netWorth,
    totalAssets: d.totalAssets,
    totalLiabilities: d.totalLiabilities,
    monthlyIncome: d.monthlyIncome,
    monthlyExpenses: d.monthlyExpenses,
    savingsRate: d.savingsRate,
    spendingByCategory: Array.isArray(d.spendingByCategory)
      ? d.spendingByCategory.map((c) => ({
          category: c.category,
          amount: c.amount,
          percentage: c.percentage,
          transactionCount: c.transactionCount ?? 0,
        }))
      : [],
    monthlyTrend: Array.isArray(d.monthlyTrend)
      ? d.monthlyTrend.map((m) => ({
          month: m.month,
          income: m.income,
          expenses: m.expenses,
          savings: m.savings,
        }))
      : [],
  };
}

// ---------------------------------------------------------------------------
// AI insights — web -> mobile adapter (PARITY-P1)
// ---------------------------------------------------------------------------
// The real web route (GET /api/ai/insights, withAuth) is what the web /insights
// page renders. It returns an InsightsResponse whose `insights` array is
// CoachingInsight[] = { type, title, description, data? } — a NARROW 4-value type
// union (observation|suggestion|warning|celebration) with NO id, priority, amount,
// or action fields. The mobile screen previously rendered a fabricated 6-type
// Insight carrying invented priority/amount/action data; adapt the real, narrower
// shape at the boundary instead of faking those fields. The source carries no id,
// so derive a stable one from list position.
export type InsightType =
  | "observation"
  | "suggestion"
  | "warning"
  | "celebration";

export interface Insight {
  id: string;
  type: InsightType;
  title: string;
  description: string;
}

interface WebCoachingInsight {
  type?: string;
  title?: string;
  description?: string;
  data?: Record<string, unknown>;
}

// The /api/ai/insights payload also carries `coaching` and `personality`; the
// mobile screen renders only the insights list, so the rest is ignored here.
interface WebInsightsResponse {
  insights?: WebCoachingInsight[];
}

const INSIGHT_TYPES: readonly InsightType[] = [
  "observation",
  "suggestion",
  "warning",
  "celebration",
];

export function mapWebInsight(raw: WebCoachingInsight, index: number): Insight {
  const type =
    raw.type && (INSIGHT_TYPES as readonly string[]).includes(raw.type)
      ? (raw.type as InsightType)
      : "observation";
  return {
    id: `insight-${index}`,
    type,
    title: raw.title ?? "",
    description: raw.description ?? "",
  };
}

// ---------------------------------------------------------------------------
// Cash flow — web -> mobile adapter (PARITY-P2)
// ---------------------------------------------------------------------------
// The mobile Cash Flow screen (app/financial/cash-flow.tsx) renders 6 months of
// income vs expenses plus cash-flow recommendations. Its honest source is
// GET /api/financial/spending/cashflow (withAuth) ->
// spendingAnalysisService.getCashFlowAnalysis, which derives each month's income
// and expenses from the user's real Plaid transactions and returns a
// CashFlowAnalysis: { monthlyData: [{ month, monthLabel, income, expenses,
// netFlow, savingsRate }], summary, trends, health, recommendations }.
//
// The pre-existing getCashFlow method (still consumed by spending.tsx) points at
// /financial/insights/cashflow — a route that DOES NOT EXIST (the real one lives
// under /financial/spending/cashflow) — and declares a shape the route never
// returns ({ income, expenses, net, forecast }). Every call 404s and the screen
// silently fell back to a hardcoded MOCK_DATA array, so real users saw invented
// cash-flow figures. This adapter carries only the fields the endpoint truly
// provides; nothing is fabricated (an absent income/expenses becomes 0, an absent
// month becomes an empty label, absent recommendations become []).
export interface CashFlowMonthPoint {
  month: string; // short label, e.g. "Jan" (from monthLabel); "" when the source omits it
  income: number;
  expenses: number;
}

export interface CashFlowAnalysisData {
  months: CashFlowMonthPoint[];
  recommendations: string[];
}

interface WebCashFlowAnalysis {
  monthlyData?: {
    month?: string;
    monthLabel?: string;
    income?: number;
    expenses?: number;
  }[];
  recommendations?: string[];
}

// monthLabel is "Jan 2026"; the chart shows a compact month, so take the first
// token. Fall back to the ISO `month` ("2026-01") when the label is absent. This
// only reformats the real value — it never invents one.
function shortMonthLabel(monthLabel?: string, month?: string): string {
  const source = monthLabel ?? month ?? "";
  return source.split(" ")[0];
}

export function mapWebCashFlow(raw: WebCashFlowAnalysis): CashFlowAnalysisData {
  const months = Array.isArray(raw.monthlyData)
    ? raw.monthlyData.map((m) => ({
        month: shortMonthLabel(m.monthLabel, m.month),
        income: m.income ?? 0,
        expenses: m.expenses ?? 0,
      }))
    : [];
  return {
    months,
    recommendations: Array.isArray(raw.recommendations)
      ? raw.recommendations
      : [],
  };
}

// ---------------------------------------------------------------------------
// Net worth — web -> mobile adapter (PARITY)
// ---------------------------------------------------------------------------
// The mobile Net Worth screen (app/financial/net-worth.tsx) renders the user's
// assets, liabilities, and net worth. Its honest source is GET
// /api/financial/accounts (withPermission "financial:read") ->
// plaidService.getAccounts, which returns PlaidAccount[] straight through as the
// response `data` (a bare array, NOT { accounts: [...] }). Each PlaidAccount carries
// accountType ("depository" | "credit" | "loan" | "investment"), accountSubtype,
// accountName, and currentBalance (Date columns serialize to ISO strings over HTTP;
// the net-worth view reads none of them).
//
// The screen previously classified accounts by balance SIGN (balance > 0 = asset,
// balance < 0 = liability) and, on any gap, silently fell back to hardcoded
// MOCK_ASSETS / MOCK_LIABILITIES / MOCK_HISTORY. That sign rule is wrong for Plaid:
// credit and loan balances are POSITIVE (the amount owed), so every debt was
// miscounted as an asset. This adapter instead classifies by accountType exactly as
// the web dashboard does (src/lib/financial/financial-service.ts:127): depository +
// investment are assets (summed at currentBalance); credit + loan are liabilities
// (summed at |currentBalance|); any other or absent type is excluded from net worth,
// matching web. Nothing is fabricated — an absent balance becomes 0 and an absent
// name an empty string. There is NO honest month-over-month net-worth series (the
// dashboard's monthlyTrend is income/expense/savings, not net worth), so the screen
// omits the history chart rather than invent one.
export type NetWorthAccountType =
  | "depository"
  | "credit"
  | "loan"
  | "investment";

export interface NetWorthAccount {
  id: string;
  name: string; // from accountName
  value: number; // assets: currentBalance; liabilities: |currentBalance|
  accountType: NetWorthAccountType;
  subtype: string; // from accountSubtype
}

export interface NetWorthData {
  assets: NetWorthAccount[];
  liabilities: NetWorthAccount[];
  totalAssets: number;
  totalLiabilities: number;
  netWorth: number;
}

// Raw account as returned by GET /api/financial/accounts (PlaidAccount, defined in
// src/lib/financial/plaid-service.ts). Only the fields the net-worth view reads are
// declared; each is optional and tolerant so a partial payload never throws.
interface WebAccount {
  id?: string;
  accountId?: string;
  accountName?: string;
  accountType?: string;
  accountSubtype?: string;
  currentBalance?: number;
}

const ASSET_ACCOUNT_TYPES = ["depository", "investment"] as const;
const LIABILITY_ACCOUNT_TYPES = ["credit", "loan"] as const;

function isAssetType(t: string): t is "depository" | "investment" {
  return (ASSET_ACCOUNT_TYPES as readonly string[]).includes(t);
}

function isLiabilityType(t: string): t is "credit" | "loan" {
  return (LIABILITY_ACCOUNT_TYPES as readonly string[]).includes(t);
}

export function mapWebAccountsToNetWorth(raw: WebAccount[]): NetWorthData {
  const assets: NetWorthAccount[] = [];
  const liabilities: NetWorthAccount[] = [];

  for (const a of raw) {
    const type = a.accountType ?? "";
    const balance = a.currentBalance ?? 0;
    const base = {
      id: a.id ?? a.accountId ?? "",
      name: a.accountName ?? "",
      subtype: a.accountSubtype ?? "",
    };
    if (isAssetType(type)) {
      assets.push({ ...base, accountType: type, value: balance });
    } else if (isLiabilityType(type)) {
      liabilities.push({ ...base, accountType: type, value: Math.abs(balance) });
    }
    // Any other or absent accountType is excluded from net worth, matching the
    // web dashboard's classification — never guessed into a bucket.
  }

  const totalAssets = assets.reduce((sum, a) => sum + a.value, 0);
  const totalLiabilities = liabilities.reduce((sum, l) => sum + l.value, 0);

  return {
    assets,
    liabilities,
    totalAssets,
    totalLiabilities,
    netWorth: totalAssets - totalLiabilities,
  };
}

// Financial Overview
export const financialOverviewApi = {
  /**
   * Get financial dashboard overview. The web route returns the full aggregate
   * (headline numbers + spendingByCategory + monthlyTrend); adapt web -> mobile
   * so the store/screens see one shape. Never fabricate on failure — pass the
   * error through.
   */
  getDashboard: async (): Promise<ApiResponse<FinancialDashboardData>> => {
    const res = await api.get<WebFinancialDashboard>("/financial/dashboard");
    if (res.success && res.data) {
      return { success: true, data: mapWebDashboard(res.data) };
    }
    return { success: false, error: res.error };
  },

  /**
   * Get personalized AI insights. Hits the same real route the web /insights page
   * uses (GET /api/ai/insights, withAuth); extract the `insights` list and adapt
   * each web CoachingInsight to the mobile Insight shape. Never fabricate on
   * failure — pass the error through.
   */
  getInsights: async (): Promise<ApiResponse<{ insights: Insight[] }>> => {
    const res = await api.get<WebInsightsResponse>("/ai/insights");
    if (res.success && res.data) {
      const raw = Array.isArray(res.data.insights) ? res.data.insights : [];
      return { success: true, data: { insights: raw.map(mapWebInsight) } };
    }
    return { success: false, error: res.error };
  },

  /**
   * Get spending insights
   */
  getSpendingInsights: (period?: "week" | "month" | "year") =>
    api.get<{
      totalSpent: number;
      byCategory: { category: string; amount: number; percentage: number }[];
      comparedToLastPeriod: number;
      unusualSpending: { category: string; amount: number; average: number }[];
      recommendations: string[];
    }>(`/financial/insights/spending${period ? `?period=${period}` : ""}`),

  /**
   * Get cash flow analysis
   */
  getCashFlow: (months?: number) =>
    api.get<{
      income: { month: string; amount: number }[];
      expenses: { month: string; amount: number }[];
      net: { month: string; amount: number }[];
      forecast: { month: string; projected: number }[];
    }>(`/financial/insights/cashflow${months ? `?months=${months}` : ""}`),

  /**
   * Get cash flow analysis. Hits the real route GET /api/financial/spending/cashflow
   * (withAuth) and adapts the CashFlowAnalysis payload web -> mobile via
   * mapWebCashFlow. Each month's income/expenses are derived from the user's real
   * Plaid transactions server-side; a failed request passes straight through without
   * fabricating data. Consumed by app/financial/cash-flow.tsx.
   */
  getCashFlowAnalysis: async (
    months?: number,
  ): Promise<ApiResponse<CashFlowAnalysisData>> => {
    const res = await api.get<WebCashFlowAnalysis>(
      `/financial/spending/cashflow${months ? `?months=${months}` : ""}`,
    );
    if (res.success && res.data) {
      return { success: true, data: mapWebCashFlow(res.data) };
    }
    return { success: false, error: res.error };
  },

  /**
   * Get the user's net worth. Hits the real route GET /api/financial/accounts
   * (withPermission "financial:read"), which returns PlaidAccount[] as the response
   * data, and splits those accounts into assets vs liabilities via
   * mapWebAccountsToNetWorth — classifying by accountType exactly as the web
   * dashboard does. A failed request passes straight through without fabricating
   * data. Consumed by app/financial/net-worth.tsx.
   */
  getNetWorth: async (): Promise<ApiResponse<NetWorthData>> => {
    const res = await api.get<WebAccount[]>("/financial/accounts");
    if (res.success && res.data) {
      const raw = Array.isArray(res.data) ? res.data : [];
      return { success: true, data: mapWebAccountsToNetWorth(raw) };
    }
    return { success: false, error: res.error };
  },
};

// Bank Account Endpoints
export const bankAccountApi = {
  /**
   * Get all connected bank accounts
   */
  getAccounts: () =>
    api.get<{ accounts: BankAccount[] }>("/financial/accounts"),

  /**
   * Get single account details
   */
  getAccount: (accountId: string) =>
    api.get<BankAccount>(`/financial/accounts/${accountId}`),

  /**
   * Get Plaid link token for connecting new accounts
   */
  getPlaidLinkToken: () =>
    api.post<PlaidLinkToken>("/financial/plaid/link-token"),

  /**
   * Exchange Plaid public token for access
   */
  exchangePlaidToken: (
    publicToken: string,
    metadata?: Record<string, unknown>,
  ) =>
    api.post<PlaidExchangeResult>("/financial/plaid/exchange", {
      publicToken,
      metadata,
    }),

  /**
   * Refresh account data
   */
  refreshAccount: (accountId: string) =>
    api.post<BankAccount>(`/financial/accounts/${accountId}/refresh`),

  /**
   * Disconnect bank account
   */
  disconnectAccount: (accountId: string) =>
    api.delete<{ success: boolean }>(`/financial/accounts/${accountId}`),
};

// Transaction Endpoints
export const transactionApi = {
  /**
   * Get all transactions
   */
  getAll: (params?: {
    page?: number;
    limit?: number;
    accountId?: string;
    category?: string;
    startDate?: string;
    endDate?: string;
    type?: "income" | "expense" | "transfer";
  }) => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append("page", params.page.toString());
    if (params?.limit) queryParams.append("limit", params.limit.toString());
    if (params?.accountId) queryParams.append("accountId", params.accountId);
    if (params?.category) queryParams.append("category", params.category);
    if (params?.startDate) queryParams.append("startDate", params.startDate);
    if (params?.endDate) queryParams.append("endDate", params.endDate);
    if (params?.type) queryParams.append("type", params.type);
    const query = queryParams.toString();
    return api.get<PaginatedResponse<Transaction>>(
      `/financial/transactions${query ? `?${query}` : ""}`,
    );
  },

  /**
   * Get transaction categories
   */
  getCategories: () =>
    api.get<{ categories: string[] }>("/financial/transactions/categories", {
      enableCache: true,
    }),

  /**
   * Update transaction category
   */
  updateCategory: (transactionId: string, category: string) =>
    api.patch<Transaction>(`/financial/transactions/${transactionId}`, {
      category,
    }),

  /**
   * Search transactions
   */
  search: (query: string) =>
    api.get<{ transactions: Transaction[] }>(
      `/financial/transactions/search?q=${encodeURIComponent(query)}`,
    ),
};

// Budget Endpoints
export const budgetApi = {
  /**
   * Get all budgets
   */
  getAll: () => api.get<{ budgets: Budget[] }>("/financial/budgets"),

  /**
   * Get budget by category
   */
  getByCategory: (category: string) =>
    api.get<Budget>(`/financial/budgets/${encodeURIComponent(category)}`),

  /**
   * Create or update budget
   */
  upsert: (budget: {
    category: string;
    limit: number;
    period: Budget["period"];
  }) => api.post<Budget>("/financial/budgets", budget),

  /**
   * Delete budget
   */
  delete: (category: string) =>
    api.delete<{ success: boolean }>(
      `/financial/budgets/${encodeURIComponent(category)}`,
    ),

  /**
   * Get budget alerts
   */
  getAlerts: () =>
    api.get<{
      alerts: { category: string; percentUsed: number; remaining: number }[];
    }>("/financial/budgets/alerts"),
};

// The real web route (GET /api/financial/goals) returns the goals array directly
// as `data` (not `{ goals: [...] }`), each enriched goal carrying `targetDate`
// (no `deadline`), no `userId`, and a wider GoalStatus enum
// (not_started|in_progress|on_track|behind|ahead|completed|paused) than the mobile
// FinancialGoal.status union. Adapt web -> mobile at the boundary so the
// store/screen see one shape. Getting this wrong leaves goals invisible
// (goalStore reads response.data.goals) or mis-filtered (status !== "active").
interface WebFinancialGoal {
  id: string;
  userId?: string;
  type?: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetDate?: string;
  deadline?: string;
  monthlyContribution?: number;
  status?: string;
}

const WEB_TO_MOBILE_GOAL_STATUS: Record<string, FinancialGoal["status"]> = {
  completed: "completed",
  paused: "paused",
  not_started: "active",
  in_progress: "active",
  on_track: "active",
  behind: "active",
  ahead: "active",
  active: "active",
};

const WEB_TO_MOBILE_GOAL_TYPE: Record<string, GoalType> = {
  emergency_fund: "emergency_fund",
  debt_payoff: "debt_payoff",
  savings: "savings",
  investment: "investment",
  retirement: "retirement",
  education: "education",
  vacation: "vacation",
  home: "home",
  home_down_payment: "home",
  major_purchase: "other",
  custom: "other",
  other: "other",
};

export function mapWebGoal(g: WebFinancialGoal): FinancialGoal {
  const targetDate = g.targetDate ?? g.deadline;
  return {
    id: g.id,
    userId: g.userId ?? "",
    name: g.name,
    type: g.type ? (WEB_TO_MOBILE_GOAL_TYPE[g.type] ?? "other") : undefined,
    targetAmount: g.targetAmount,
    currentAmount: g.currentAmount,
    deadline: targetDate,
    targetDate,
    monthlyContribution: g.monthlyContribution,
    status: g.status ? (WEB_TO_MOBILE_GOAL_STATUS[g.status] ?? "active") : "active",
  };
}

// Financial Goals Endpoints
export const financialGoalsApi = {
  /**
   * Get all financial goals. The web route returns a bare array; adapt each web
   * goal to the mobile FinancialGoal shape and re-wrap as { goals } so the
   * goalStore contract (response.data.goals) holds.
   */
  getAll: async (): Promise<ApiResponse<{ goals: FinancialGoal[] }>> => {
    const res = await api.get<WebFinancialGoal[]>("/financial/goals");
    if (res.success && res.data) {
      const raw = Array.isArray(res.data) ? res.data : [];
      return { success: true, data: { goals: raw.map(mapWebGoal) } };
    }
    return { success: false, error: res.error };
  },

  /**
   * Get single goal
   */
  getById: (goalId: string) =>
    api.get<FinancialGoal>(`/financial/goals/${goalId}`),

  /**
   * Create new goal
   */
  create: (
    goal: Omit<FinancialGoal, "id" | "userId" | "currentAmount" | "status">,
  ) => api.post<FinancialGoal>("/financial/goals", goal),

  /**
   * Update goal
   */
  update: (goalId: string, updates: Partial<FinancialGoal>) =>
    api.patch<FinancialGoal>(`/financial/goals/${goalId}`, updates),

  /**
   * Add contribution to goal
   */
  addContribution: (goalId: string, amount: number) =>
    api.post<FinancialGoal>(`/financial/goals/${goalId}/contribute`, {
      amount,
    }),

  /**
   * Delete goal
   */
  delete: (goalId: string) =>
    api.delete<{ success: boolean }>(`/financial/goals/${goalId}`),
};

// ---------------------------------------------------------------------------
// Debt — web -> mobile adapter (PARITY)
// ---------------------------------------------------------------------------
// The mobile Debt screen (app/financial/debt.tsx) renders the user's real debts, a
// debt summary, and an avalanche-vs-snowball payoff comparison. Its honest source is
// GET /api/financial/debt (withAuth) -> debtService.listDebts + debtPayoffService,
// which returns data: { overview, debts, currentPlan, comparison, milestones,
// insights } (src/app/api/financial/debt/route.ts). With ?compare=true the route also
// computes `comparison` (a StrategyComparison of real avalanche/snowball/hybrid
// PayoffPlans). Over HTTP each PayoffPlan's `payoffDate` Date serializes to an ISO
// string via NextResponse.json.
//
// The mobile client previously declared this route as a FLAT
// { totalDebt, debts, monthlyPayments, projectedPayoffDate } shape — but those
// headline fields actually live under data.overview (totalDebt, totalMinimumPayments)
// and data.currentPlan (payoffDate), so the store read `undefined` for all of them
// (the debt screen additionally hardcoded a MOCK_DEBTS array and a fabricated
// STRATEGIES object with invented interest/months). These adapters map the REAL nested
// payload: getOverview flattens overview+currentPlan for the store/reports; getDebtPlan
// carries the overview, real debts, and the real comparison for the screen. Nothing is
// fabricated — an absent number becomes 0, an absent name an empty string, and an
// unknown debt type falls back to "other".
export type DebtAccountType =
  | "credit_card"
  | "student_loan"
  | "auto_loan"
  | "mortgage"
  | "personal_loan"
  | "medical"
  | "other";

export interface DebtAccount {
  id: string;
  name: string;
  type: DebtAccountType;
  balance: number;
  interestRate: number; // APR as a percentage, e.g. 18.5
  minimumPayment: number;
}

export interface DebtOverviewSummary {
  totalDebt: number;
  totalMinimumPayments: number;
  averageInterestRate: number;
  highestInterestRate: number;
  debtCount: number;
  projectedPayoffDate: string; // from currentPlan.payoffDate (ISO); "" when absent
}

export interface DebtStrategyMetrics {
  totalInterestPaid: number;
  totalMonths: number;
  interestSaved: number; // vs minimum payments only, for the requested extra payment
  monthsSaved: number;
}

export interface DebtStrategyComparison {
  avalanche: DebtStrategyMetrics;
  snowball: DebtStrategyMetrics;
  recommendation: string; // real PayoffStrategy from the route
  recommendationReason: string;
}

export interface DebtPlanData {
  overview: DebtOverviewSummary;
  debts: DebtAccount[];
  comparison: DebtStrategyComparison | null;
}

// Raw shapes as returned by GET /api/financial/debt (after the api client unwraps the
// { success, data } envelope). Only the fields the mobile debt views read are declared;
// each is optional and tolerant so a partial payload never throws.
interface WebDebt {
  id: string;
  name?: string;
  type?: string;
  balance?: number;
  interestRate?: number;
  minimumPayment?: number;
}

interface WebDebtOverview {
  totalDebt?: number;
  totalMinimumPayments?: number;
  averageInterestRate?: number;
  highestInterestRate?: number;
  debtCount?: number;
}

interface WebPayoffPlan {
  totalInterestPaid?: number;
  totalMonths?: number;
  interestSaved?: number;
  monthsSaved?: number;
  payoffDate?: string;
}

interface WebStrategyComparison {
  avalanche?: WebPayoffPlan;
  snowball?: WebPayoffPlan;
  recommendation?: string;
  recommendationReason?: string;
}

interface WebDebtResponse {
  overview?: WebDebtOverview;
  debts?: WebDebt[];
  currentPlan?: WebPayoffPlan;
  comparison?: WebStrategyComparison;
}

const DEBT_ACCOUNT_TYPES: readonly DebtAccountType[] = [
  "credit_card",
  "student_loan",
  "auto_loan",
  "mortgage",
  "personal_loan",
  "medical",
  "other",
];

function toDebtAccountType(type?: string): DebtAccountType {
  return type && (DEBT_ACCOUNT_TYPES as readonly string[]).includes(type)
    ? (type as DebtAccountType)
    : "other";
}

export function mapWebDebt(raw: WebDebt): DebtAccount {
  return {
    id: raw.id,
    name: raw.name ?? "",
    type: toDebtAccountType(raw.type),
    balance: raw.balance ?? 0,
    interestRate: raw.interestRate ?? 0,
    minimumPayment: raw.minimumPayment ?? 0,
  };
}

function mapStrategyMetrics(plan?: WebPayoffPlan): DebtStrategyMetrics {
  return {
    totalInterestPaid: plan?.totalInterestPaid ?? 0,
    totalMonths: plan?.totalMonths ?? 0,
    interestSaved: plan?.interestSaved ?? 0,
    monthsSaved: plan?.monthsSaved ?? 0,
  };
}

export function mapWebDebtPlan(raw: WebDebtResponse): DebtPlanData {
  const o = raw.overview ?? {};
  const overview: DebtOverviewSummary = {
    totalDebt: o.totalDebt ?? 0,
    totalMinimumPayments: o.totalMinimumPayments ?? 0,
    averageInterestRate: o.averageInterestRate ?? 0,
    highestInterestRate: o.highestInterestRate ?? 0,
    debtCount: o.debtCount ?? 0,
    projectedPayoffDate: raw.currentPlan?.payoffDate ?? "",
  };
  const debts = Array.isArray(raw.debts) ? raw.debts.map(mapWebDebt) : [];
  const comparison: DebtStrategyComparison | null = raw.comparison
    ? {
        avalanche: mapStrategyMetrics(raw.comparison.avalanche),
        snowball: mapStrategyMetrics(raw.comparison.snowball),
        recommendation: raw.comparison.recommendation ?? "avalanche",
        recommendationReason: raw.comparison.recommendationReason ?? "",
      }
    : null;
  return { overview, debts, comparison };
}

// Debt Management Endpoints
export const debtApi = {
  /**
   * Get the flat debt overview the debtStore / reports screen read. Hits the real route
   * GET /api/financial/debt and adapts its nested { overview, debts, currentPlan }
   * payload into the store's flat shape (totalDebt/monthlyPayments/projectedPayoffDate
   * come from overview + currentPlan, NOT the top level). Never fabricate on failure —
   * pass the error through.
   */
  getOverview: async (): Promise<
    ApiResponse<{
      totalDebt: number;
      debts: DebtAccount[];
      monthlyPayments: number;
      projectedPayoffDate: string;
    }>
  > => {
    const res = await api.get<WebDebtResponse>("/financial/debt");
    if (res.success && res.data) {
      const plan = mapWebDebtPlan(res.data);
      return {
        success: true,
        data: {
          totalDebt: plan.overview.totalDebt,
          debts: plan.debts,
          monthlyPayments: plan.overview.totalMinimumPayments,
          projectedPayoffDate: plan.overview.projectedPayoffDate,
        },
      };
    }
    return { success: false, error: res.error };
  },

  /**
   * Get the full debt payoff plan for the debt screen: the real overview, the real
   * debts, and the real avalanche/snowball comparison (compare=true). extraPayment is
   * forwarded so the comparison's interest/months/savings reflect the user's chosen
   * extra monthly payment — the numbers are computed server-side by debtPayoffService,
   * never fabricated on the client. Consumed by app/financial/debt.tsx.
   */
  getDebtPlan: async (
    extraPayment = 0,
  ): Promise<ApiResponse<DebtPlanData>> => {
    const params = new URLSearchParams({
      compare: "true",
      extraPayment: String(extraPayment),
    });
    const res = await api.get<WebDebtResponse>(
      `/financial/debt?${params.toString()}`,
    );
    if (res.success && res.data) {
      return { success: true, data: mapWebDebtPlan(res.data) };
    }
    return { success: false, error: res.error };
  },

  /**
   * Calculate payoff strategy
   */
  calculatePayoff: (
    strategy: "snowball" | "avalanche",
    extraPayment?: number,
  ) =>
    api.post<{
      strategy: string;
      timeline: { month: string; totalPaid: number; remainingDebt: number }[];
      totalInterestPaid: number;
      payoffDate: string;
      monthsSaved: number;
      interestSaved: number;
    }>("/financial/debt/calculate", { strategy, extraPayment }),

  /**
   * Add debt
   */
  addDebt: (debt: {
    name: string;
    type: string;
    balance: number;
    interestRate: number;
    minimumPayment: number;
  }) => api.post<{ id: string }>("/financial/debt", debt),

  /**
   * Update debt
   */
  updateDebt: (
    debtId: string,
    updates: Partial<{
      balance: number;
      interestRate: number;
      minimumPayment: number;
    }>,
  ) => api.patch<{ success: boolean }>(`/financial/debt/${debtId}`, updates),

  /**
   * Delete debt
   */
  deleteDebt: (debtId: string) =>
    api.delete<{ success: boolean }>(`/financial/debt/${debtId}`),
};

// ---------------------------------------------------------------------------
// Bills — web -> mobile adapter (PARITY-P2)
// ---------------------------------------------------------------------------
// The mobile Payments screen (credit-repair/payments.tsx) renders the user's
// recurring bills: a merchant, an amount, and a due date. Its honest source is
// GET /api/financial/bills (withPermission "financial:read"), which returns
// { bills: Bill[] } from billDetectionService.getBillsByUser — the recurring-bill
// records defined in src/lib/financial/types/bill.types.ts. Over HTTP the record's
// Date columns (nextDueDate, ...) serialize to ISO strings via NextResponse.json.
//
// The screen previously also rendered a hardcoded on-time %, paid/late/missed
// per-bill statuses, and a "late" count. Those describe PAYMENT HISTORY
// (BillPayment.isLate in bill.types.ts), which the service exposes only through
// billDetectionService.getPaymentHistory — with NO HTTP route. Because no honest
// source reaches the client, this adapter carries only the fields the bills
// endpoint truly provides (merchant, amount, due date, category, autopay); the
// screen omits the on-time %/late metrics rather than fabricate them.
//
// getBills is the single honest getter for the bills endpoint. It replaced the old
// billsApi.getUpcoming, which was mis-typed against a payload the route never returns
// (name/dueDate/autopay/totalDue): its consumer app/financial/bills.tsx read undefined
// fields, produced Invalid Dates, and silently fell back to a hardcoded MOCK_BILLS
// array. Both screens (credit-repair/payments.tsx and financial/bills.tsx) now consume
// getBills; getUpcoming was deleted.

export interface BillItem {
  id: string;
  merchant: string; // from Bill.merchantName
  amount: number;
  dueDate: string; // ISO 8601 over HTTP (Bill.nextDueDate)
  category: string;
  isAutoPay: boolean;
}

/**
 * Raw bill as returned by GET /api/financial/bills
 * (src/lib/financial/types/bill.types.ts `Bill`, mapped by
 * bill-detection-service.mapBillFromDb). Date columns serialize to ISO strings
 * over HTTP. Fields the mobile screen does not render are declared for
 * documentation but left optional and tolerant, so a partial payload never throws.
 */
export interface WebBill {
  id: string;
  userId?: string;
  merchantName?: string;
  category?: string;
  amount?: number;
  frequency?: string;
  nextDueDate?: string;
  lastPaidDate?: string;
  lastPaidAmount?: number;
  status?: string;
  isAutoPay?: boolean;
  accountId?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Map a web bill onto the mobile BillItem shape. Web uses `merchantName` and
 * `nextDueDate`; mobile uses `merchant` and `dueDate`. Nothing is fabricated: an
 * absent merchant becomes an empty string rather than a made-up name, an absent
 * amount becomes 0 rather than an invented figure, an absent due date becomes an
 * empty string, and autopay defaults to false.
 */
export function mapWebBill(raw: WebBill): BillItem {
  return {
    id: raw.id,
    merchant: raw.merchantName ?? "",
    amount: raw.amount ?? 0,
    dueDate: raw.nextDueDate ?? "",
    category: raw.category ?? "",
    isAutoPay: raw.isAutoPay ?? false,
  };
}

// Bills & Payments Endpoints
export const billsApi = {
  /**
   * Get the current user's recurring bills. Hits the real route GET
   * /api/financial/bills with activeOnly=true (paused/cancelled bills are not
   * upcoming, so they are excluded) and adapts each web Bill onto the mobile BillItem
   * shape. A failed request passes straight through without fabricating data. Consumed
   * by both credit-repair/payments.tsx and financial/bills.tsx.
   */
  getBills: async (): Promise<ApiResponse<{ bills: BillItem[] }>> => {
    const res = await api.get<{ bills?: WebBill[] }>(
      "/financial/bills?activeOnly=true",
    );
    if (res.success && res.data) {
      const bills = Array.isArray(res.data.bills)
        ? res.data.bills.map(mapWebBill)
        : [];
      return { success: true, data: { bills } };
    }
    return { success: false, error: res.error };
  },

  /**
   * Add bill reminder
   */
  addReminder: (bill: {
    name: string;
    amount: number;
    dueDate: string;
    frequency: "weekly" | "monthly" | "yearly";
    autopay: boolean;
  }) => api.post<{ id: string }>("/financial/bills", bill),

  /**
   * Update bill
   */
  updateBill: (
    billId: string,
    updates: Partial<{
      amount: number;
      dueDate: string;
      autopay: boolean;
    }>,
  ) => api.patch<{ success: boolean }>(`/financial/bills/${billId}`, updates),

  /**
   * Delete bill
   */
  deleteBill: (billId: string) =>
    api.delete<{ success: boolean }>(`/financial/bills/${billId}`),
};

export default {
  overview: financialOverviewApi,
  accounts: bankAccountApi,
  transactions: transactionApi,
  budgets: budgetApi,
  goals: financialGoalsApi,
  debt: debtApi,
  bills: billsApi,
};
