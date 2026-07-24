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

// Debt Management Endpoints
export const debtApi = {
  /**
   * Get debt overview
   */
  getOverview: () =>
    api.get<{
      totalDebt: number;
      debts: {
        id: string;
        name: string;
        type: string;
        balance: number;
        interestRate: number;
        minimumPayment: number;
      }[];
      monthlyPayments: number;
      projectedPayoffDate: string;
    }>("/financial/debt"),

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

// Bills & Payments Endpoints
export const billsApi = {
  /**
   * Get upcoming bills
   */
  getUpcoming: () =>
    api.get<{
      bills: {
        id: string;
        name: string;
        amount: number;
        dueDate: string;
        autopay: boolean;
        category: string;
      }[];
      totalDue: number;
      nextDueDate: string;
    }>("/financial/bills"),

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
