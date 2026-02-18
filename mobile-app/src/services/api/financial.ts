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

// Financial Overview
export const financialOverviewApi = {
  /**
   * Get financial dashboard overview
   */
  getDashboard: () =>
    api.get<{
      netWorth: number;
      totalAssets: number;
      totalLiabilities: number;
      monthlyIncome: number;
      monthlyExpenses: number;
      savingsRate: number;
      budgetStatus: { onTrack: number; overBudget: number };
      recentTransactions: Transaction[];
    }>("/financial/dashboard"),

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

// Financial Goals Endpoints
export const financialGoalsApi = {
  /**
   * Get all financial goals
   */
  getAll: () => api.get<{ goals: FinancialGoal[] }>("/financial/goals"),

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
