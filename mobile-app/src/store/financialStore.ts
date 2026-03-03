/**
 * Fynvita Financial Store
 * Manages bank accounts, transactions, budgets, goals, and debt
 */

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  financialOverviewApi,
  bankAccountApi,
  transactionApi,
  budgetApi,
  financialGoalsApi,
  debtApi,
} from "../services/api";
import type {
  BankAccount,
  Transaction,
  Budget,
  FinancialGoal,
} from "../services/api/types";
import { seedFinancialDashboard, seedBankAccounts, seedTransactions, seedBudgets, seedGoals, seedDebtOverview } from "../data/dev-seed";

interface FinancialDashboard {
  netWorth: number;
  totalAssets: number;
  totalLiabilities: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  savingsRate: number;
}

interface DebtOverview {
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
}

interface FinancialState {
  // Dashboard
  dashboard: FinancialDashboard | null;

  // Accounts
  accounts: BankAccount[];
  selectedAccountId: string | null;

  // Transactions
  transactions: Transaction[];
  transactionCategories: string[];
  totalTransactions: number;

  // Budgets
  budgets: Budget[];
  budgetAlerts: { category: string; percentUsed: number; remaining: number }[];

  // Goals
  goals: FinancialGoal[];

  // Debt
  debtOverview: DebtOverview | null;

  // Plaid Hosted Link
  plaidLinkStatus: "idle" | "loading" | "linking" | "success" | "error";
  plaidLinkError: string | null;
  linkedInstitution: string | null;

  // Loading states
  isLoading: boolean; // General loading state
  isLoadingDashboard: boolean;
  isLoadingAccounts: boolean;
  isLoadingTransactions: boolean;
  isLoadingBudgets: boolean;
  isLoadingGoals: boolean;
  isLoadingDebt: boolean;
  isConnectingAccount: boolean;

  // Errors
  error: string | null;

  // Actions - Dashboard
  fetchDashboard: () => Promise<void>;

  // Actions - Accounts
  fetchAccounts: () => Promise<void>;
  connectAccount: () => Promise<{ linkToken: string } | null>;
  exchangePlaidToken: (
    publicToken: string,
    metadata?: Record<string, unknown>,
  ) => Promise<boolean>;
  refreshAccount: (accountId: string) => Promise<void>;
  disconnectAccount: (accountId: string) => Promise<boolean>;
  selectAccount: (accountId: string | null) => void;

  // Actions - Transactions
  fetchTransactions: (params?: {
    page?: number;
    accountId?: string;
    category?: string;
    startDate?: string;
    endDate?: string;
  }) => Promise<void>;
  fetchCategories: () => Promise<void>;
  updateTransactionCategory: (
    transactionId: string,
    category: string,
  ) => Promise<boolean>;

  // Actions - Budgets
  fetchBudgets: () => Promise<void>;
  createBudget: (budget: {
    category: string;
    limit: number;
    period: Budget["period"];
  }) => Promise<boolean>;
  updateBudget: (
    category: string,
    updates: { limit?: number; period?: Budget["period"] },
  ) => Promise<boolean>;
  deleteBudget: (category: string) => Promise<boolean>;
  fetchBudgetAlerts: () => Promise<void>;

  // Actions - Goals
  fetchGoals: () => Promise<void>;
  createGoal: (
    goal: Omit<FinancialGoal, "id" | "userId" | "currentAmount" | "status">,
  ) => Promise<boolean>;
  updateGoal: (
    goalId: string,
    updates: Partial<FinancialGoal>,
  ) => Promise<boolean>;
  contributeToGoal: (goalId: string, amount: number) => Promise<boolean>;
  deleteGoal: (goalId: string) => Promise<boolean>;

  // Actions - Debt
  fetchDebtOverview: () => Promise<void>;
  calculatePayoff: (
    strategy: "snowball" | "avalanche",
    extraPayment?: number,
  ) => Promise<{
    timeline: { month: string; totalPaid: number; remainingDebt: number }[];
    payoffDate: string;
    interestSaved: number;
  } | null>;

  // Actions - Plaid Hosted Link
  startPlaidLink: () => void;
  completePlaidLink: (publicToken: string, institution: string) => void;
  resetPlaidLink: () => void;

  // Actions - Utility
  clearError: () => void;
  resetStore: () => void;
}

const initialState = {
  dashboard: null,
  accounts: [],
  selectedAccountId: null,
  transactions: [],
  transactionCategories: [],
  totalTransactions: 0,
  budgets: [],
  budgetAlerts: [],
  goals: [],
  debtOverview: null,
  plaidLinkStatus: "idle" as const,
  plaidLinkError: null,
  linkedInstitution: null,
  isLoading: false,
  isLoadingDashboard: false,
  isLoadingAccounts: false,
  isLoadingTransactions: false,
  isLoadingBudgets: false,
  isLoadingGoals: false,
  isLoadingDebt: false,
  isConnectingAccount: false,
  error: null,
};

export const useFinancialStore = create<FinancialState>()(
  persist(
    (set, get) => ({
      ...initialState,

      fetchDashboard: async () => {
        set({ isLoadingDashboard: true, error: null });
        if (__DEV__) {
          set({ dashboard: seedFinancialDashboard, isLoadingDashboard: false });
          return;
        }
        try {
          const response = await financialOverviewApi.getDashboard();
          if (response.success && response.data) {
            set({ dashboard: response.data, isLoadingDashboard: false });
          } else {
            set({ error: response.error?.message, isLoadingDashboard: false });
          }
        } catch (error) {
          set({
            error:
              error instanceof Error
                ? error.message
                : "Failed to fetch dashboard",
            isLoadingDashboard: false,
          });
        }
      },

      fetchAccounts: async () => {
        set({ isLoadingAccounts: true, error: null });
        if (__DEV__) {
          set({ accounts: seedBankAccounts, isLoadingAccounts: false });
          return;
        }
        try {
          const response = await bankAccountApi.getAccounts();
          if (response.success && response.data) {
            set({ accounts: response.data.accounts, isLoadingAccounts: false });
          } else {
            set({ error: response.error?.message, isLoadingAccounts: false });
          }
        } catch (error) {
          set({
            error:
              error instanceof Error
                ? error.message
                : "Failed to fetch accounts",
            isLoadingAccounts: false,
          });
        }
      },

      connectAccount: async () => {
        set({ isConnectingAccount: true, error: null });
        try {
          const response = await bankAccountApi.getPlaidLinkToken();
          if (response.success && response.data) {
            set({ isConnectingAccount: false });
            return { linkToken: response.data.linkToken };
          }
          set({ error: response.error?.message, isConnectingAccount: false });
          return null;
        } catch (error) {
          set({
            error:
              error instanceof Error
                ? error.message
                : "Failed to get link token",
            isConnectingAccount: false,
          });
          return null;
        }
      },

      exchangePlaidToken: async (publicToken, metadata) => {
        set({ isConnectingAccount: true });
        try {
          const response = await bankAccountApi.exchangePlaidToken(
            publicToken,
            metadata,
          );
          if (response.success) {
            await get().fetchAccounts();
            set({ isConnectingAccount: false });
            return true;
          }
          set({ isConnectingAccount: false });
          return false;
        } catch {
          set({ isConnectingAccount: false });
          return false;
        }
      },

      refreshAccount: async (accountId) => {
        try {
          const response = await bankAccountApi.refreshAccount(accountId);
          if (response.success && response.data) {
            set((state) => ({
              accounts: state.accounts.map((a) =>
                a.id === accountId ? response.data! : a,
              ),
            }));
          }
        } catch (error) {
          if (__DEV__) console.error("Failed to refresh account:", error);
        }
      },

      disconnectAccount: async (accountId) => {
        try {
          const response = await bankAccountApi.disconnectAccount(accountId);
          if (response.success) {
            set((state) => ({
              accounts: state.accounts.filter((a) => a.id !== accountId),
              selectedAccountId:
                state.selectedAccountId === accountId
                  ? null
                  : state.selectedAccountId,
            }));
            return true;
          }
          return false;
        } catch {
          return false;
        }
      },

      selectAccount: (accountId) => set({ selectedAccountId: accountId }),

      fetchTransactions: async (params) => {
        set({ isLoadingTransactions: true, error: null });
        if (__DEV__) {
          set({ transactions: seedTransactions, totalTransactions: seedTransactions.length, isLoadingTransactions: false });
          return;
        }
        try {
          const { selectedAccountId } = get();
          const response = await transactionApi.getAll({
            ...params,
            accountId: params?.accountId || selectedAccountId || undefined,
          });
          if (response.success && response.data) {
            set({
              transactions: response.data.items,
              totalTransactions: response.data.total,
              isLoadingTransactions: false,
            });
          } else {
            set({
              error: response.error?.message,
              isLoadingTransactions: false,
            });
          }
        } catch (error) {
          set({
            error:
              error instanceof Error
                ? error.message
                : "Failed to fetch transactions",
            isLoadingTransactions: false,
          });
        }
      },

      fetchCategories: async () => {
        try {
          const response = await transactionApi.getCategories();
          if (response.success && response.data) {
            set({ transactionCategories: response.data.categories });
          }
        } catch (error) {
          if (__DEV__) console.error("Failed to fetch categories:", error);
        }
      },

      updateTransactionCategory: async (transactionId, category) => {
        try {
          const response = await transactionApi.updateCategory(
            transactionId,
            category,
          );
          if (response.success && response.data) {
            set((state) => ({
              transactions: state.transactions.map((t) =>
                t.id === transactionId ? response.data! : t,
              ),
            }));
            return true;
          }
          return false;
        } catch {
          return false;
        }
      },

      fetchBudgets: async () => {
        set({ isLoadingBudgets: true, error: null });
        if (__DEV__) {
          set({ budgets: seedBudgets, isLoadingBudgets: false });
          return;
        }
        try {
          const response = await budgetApi.getAll();
          if (response.success && response.data) {
            set({ budgets: response.data.budgets, isLoadingBudgets: false });
          } else {
            set({ error: response.error?.message, isLoadingBudgets: false });
          }
        } catch (error) {
          set({
            error:
              error instanceof Error
                ? error.message
                : "Failed to fetch budgets",
            isLoadingBudgets: false,
          });
        }
      },

      createBudget: async (budget) => {
        try {
          const response = await budgetApi.upsert(budget);
          if (response.success && response.data) {
            set((state) => ({
              budgets: [
                ...state.budgets.filter((b) => b.category !== budget.category),
                response.data!,
              ],
            }));
            return true;
          }
          return false;
        } catch {
          return false;
        }
      },

      updateBudget: async (category, updates) => {
        const budget = get().budgets.find((b) => b.category === category);
        if (!budget) return false;
        return get().createBudget({ ...budget, ...updates });
      },

      deleteBudget: async (category) => {
        try {
          const response = await budgetApi.delete(category);
          if (response.success) {
            set((state) => ({
              budgets: state.budgets.filter((b) => b.category !== category),
            }));
            return true;
          }
          return false;
        } catch {
          return false;
        }
      },

      fetchBudgetAlerts: async () => {
        try {
          const response = await budgetApi.getAlerts();
          if (response.success && response.data) {
            set({ budgetAlerts: response.data.alerts });
          }
        } catch (error) {
          if (__DEV__) console.error("Failed to fetch budget alerts:", error);
        }
      },

      fetchGoals: async () => {
        set({ isLoadingGoals: true, error: null });
        if (__DEV__) {
          set({ goals: seedGoals, isLoadingGoals: false });
          return;
        }
        try {
          const response = await financialGoalsApi.getAll();
          if (response.success && response.data) {
            set({ goals: response.data.goals, isLoadingGoals: false });
          } else {
            set({ error: response.error?.message, isLoadingGoals: false });
          }
        } catch (error) {
          set({
            error:
              error instanceof Error ? error.message : "Failed to fetch goals",
            isLoadingGoals: false,
          });
        }
      },

      createGoal: async (goal) => {
        try {
          const response = await financialGoalsApi.create(goal);
          if (response.success && response.data) {
            set((state) => ({ goals: [...state.goals, response.data!] }));
            return true;
          }
          return false;
        } catch {
          return false;
        }
      },

      updateGoal: async (goalId, updates) => {
        try {
          const response = await financialGoalsApi.update(goalId, updates);
          if (response.success && response.data) {
            set((state) => ({
              goals: state.goals.map((g) =>
                g.id === goalId ? response.data! : g,
              ),
            }));
            return true;
          }
          return false;
        } catch {
          return false;
        }
      },

      contributeToGoal: async (goalId, amount) => {
        try {
          const response = await financialGoalsApi.addContribution(
            goalId,
            amount,
          );
          if (response.success && response.data) {
            set((state) => ({
              goals: state.goals.map((g) =>
                g.id === goalId ? response.data! : g,
              ),
            }));
            return true;
          }
          return false;
        } catch {
          return false;
        }
      },

      deleteGoal: async (goalId) => {
        try {
          const response = await financialGoalsApi.delete(goalId);
          if (response.success) {
            set((state) => ({
              goals: state.goals.filter((g) => g.id !== goalId),
            }));
            return true;
          }
          return false;
        } catch {
          return false;
        }
      },

      fetchDebtOverview: async () => {
        set({ isLoadingDebt: true, error: null });
        if (__DEV__) {
          set({ debtOverview: seedDebtOverview, isLoadingDebt: false });
          return;
        }
        try {
          const response = await debtApi.getOverview();
          if (response.success && response.data) {
            set({ debtOverview: response.data, isLoadingDebt: false });
          } else {
            set({ error: response.error?.message, isLoadingDebt: false });
          }
        } catch (error) {
          set({
            error:
              error instanceof Error
                ? error.message
                : "Failed to fetch debt overview",
            isLoadingDebt: false,
          });
        }
      },

      calculatePayoff: async (strategy, extraPayment) => {
        try {
          const response = await debtApi.calculatePayoff(
            strategy,
            extraPayment,
          );
          if (response.success && response.data) {
            return {
              timeline: response.data.timeline,
              payoffDate: response.data.payoffDate,
              interestSaved: response.data.interestSaved,
            };
          }
          return null;
        } catch {
          return null;
        }
      },

      startPlaidLink: () =>
        set({
          plaidLinkStatus: "linking",
          plaidLinkError: null,
          linkedInstitution: null,
        }),

      completePlaidLink: (publicToken, institution) => {
        set({
          plaidLinkStatus: "success",
          plaidLinkError: null,
          linkedInstitution: institution,
        });
        // Refresh accounts after successful link
        get().fetchAccounts();
      },

      resetPlaidLink: () =>
        set({
          plaidLinkStatus: "idle",
          plaidLinkError: null,
          linkedInstitution: null,
        }),

      clearError: () => set({ error: null }),

      resetStore: () => set(initialState),
    }),
    {
      name: "cpfi-financial-store",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        accounts: state.accounts,
        transactionCategories: state.transactionCategories,
        budgets: state.budgets,
        goals: state.goals,
      }),
    },
  ),
);

// Selectors
export const selectNetWorth = (state: FinancialState) =>
  state.dashboard?.netWorth ?? 0;
export const selectTotalAssets = (state: FinancialState) =>
  state.dashboard?.totalAssets ?? 0;
export const selectTotalLiabilities = (state: FinancialState) =>
  state.dashboard?.totalLiabilities ?? 0;
export const selectSavingsRate = (state: FinancialState) =>
  state.dashboard?.savingsRate ?? 0;
export const selectAccountsByType =
  (type: BankAccount["type"]) => (state: FinancialState) =>
    state.accounts.filter((a) => a.type === type);
export const selectTotalBalance = (state: FinancialState) =>
  state.accounts.reduce((sum, a) => sum + a.balance, 0);
export const selectBudgetProgress = (state: FinancialState) =>
  state.budgets.map((b) => ({
    category: b.category,
    limit: b.limit,
    spent: b.spent,
    percentage: b.limit > 0 ? Math.round((b.spent / b.limit) * 100) : 0,
  }));
export const selectGoalProgress = (state: FinancialState) =>
  state.goals.map((g) => ({
    ...g,
    percentage:
      g.targetAmount > 0
        ? Math.round((g.currentAmount / g.targetAmount) * 100)
        : 0,
  }));
