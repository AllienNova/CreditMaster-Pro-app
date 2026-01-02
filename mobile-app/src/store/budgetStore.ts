/**
 * CPFI Budget Store
 * Manages budgets, spending limits, and alerts
 * Split from financialStore for better modularity
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { budgetApi } from '../services/api';
import type { Budget } from '../services/api/types';

interface BudgetAlert {
  category: string;
  percentUsed: number;
  remaining: number;
  isOverBudget: boolean;
}

interface BudgetState {
  // State
  budgets: Budget[];
  alerts: BudgetAlert[];

  // Loading states
  isLoadingBudgets: boolean;
  isLoadingAlerts: boolean;
  isCreating: boolean;
  isUpdating: boolean;
  isDeleting: boolean;

  // Error
  error: string | null;

  // Actions
  fetchBudgets: () => Promise<void>;
  fetchAlerts: () => Promise<void>;
  createBudget: (budget: {
    category: string;
    limit: number;
    period: Budget['period'];
  }) => Promise<boolean>;
  updateBudget: (
    category: string,
    updates: { limit?: number; period?: Budget['period'] }
  ) => Promise<boolean>;
  deleteBudget: (category: string) => Promise<boolean>;
  refreshAll: () => Promise<void>;

  // Utility
  clearError: () => void;
  resetStore: () => void;
}

const initialState = {
  budgets: [] as Budget[],
  alerts: [] as BudgetAlert[],
  isLoadingBudgets: false,
  isLoadingAlerts: false,
  isCreating: false,
  isUpdating: false,
  isDeleting: false,
  error: null as string | null,
};

export const useBudgetStore = create<BudgetState>()(
  persist(
    (set, get) => ({
      ...initialState,

      fetchBudgets: async () => {
        set({ isLoadingBudgets: true, error: null });
        try {
          const response = await budgetApi.getAll();
          if (response.success && response.data) {
            set({
              budgets: response.data.budgets,
              isLoadingBudgets: false
            });
          } else {
            set({
              error: response.error?.message || 'Failed to fetch budgets',
              isLoadingBudgets: false
            });
          }
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to fetch budgets',
            isLoadingBudgets: false
          });
        }
      },

      fetchAlerts: async () => {
        set({ isLoadingAlerts: true, error: null });
        try {
          const response = await budgetApi.getAlerts();
          if (response.success && response.data) {
            // Map API response to BudgetAlert type
            const mappedAlerts: BudgetAlert[] = response.data.alerts.map(alert => ({
              ...alert,
              isOverBudget: alert.percentUsed >= 100
            }));
            set({
              alerts: mappedAlerts,
              isLoadingAlerts: false
            });
          } else {
            set({
              error: response.error?.message || 'Failed to fetch alerts',
              isLoadingAlerts: false
            });
          }
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to fetch alerts',
            isLoadingAlerts: false
          });
        }
      },

      createBudget: async (budget) => {
        set({ isCreating: true, error: null });
        try {
          const response = await budgetApi.upsert(budget);
          if (response.success && response.data) {
            set({
              budgets: [...get().budgets, response.data],
              isCreating: false
            });
            // Refresh alerts after creating budget
            await get().fetchAlerts();
            return true;
          }
          set({
            error: response.error?.message || 'Failed to create budget',
            isCreating: false
          });
          return false;
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to create budget',
            isCreating: false
          });
          return false;
        }
      },

      updateBudget: async (category, updates) => {
        set({ isUpdating: true, error: null });
        try {
          const existingBudget = get().budgets.find(b => b.category === category);
          if (!existingBudget) {
            set({ error: 'Budget not found', isUpdating: false });
            return false;
          }
          const response = await budgetApi.upsert({
            category,
            limit: updates.limit ?? existingBudget.limit,
            period: updates.period ?? existingBudget.period
          });
          if (response.success) {
            set({
              budgets: get().budgets.map(b =>
                b.category === category ? { ...b, ...updates } : b
              ),
              isUpdating: false
            });
            // Refresh alerts after updating budget
            await get().fetchAlerts();
            return true;
          }
          set({
            error: response.error?.message || 'Failed to update budget',
            isUpdating: false
          });
          return false;
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to update budget',
            isUpdating: false
          });
          return false;
        }
      },

      deleteBudget: async (category) => {
        set({ isDeleting: true, error: null });
        try {
          const response = await budgetApi.delete(category);
          if (response.success) {
            set({
              budgets: get().budgets.filter(b => b.category !== category),
              isDeleting: false
            });
            // Refresh alerts after deleting budget
            await get().fetchAlerts();
            return true;
          }
          set({
            error: response.error?.message || 'Failed to delete budget',
            isDeleting: false
          });
          return false;
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to delete budget',
            isDeleting: false
          });
          return false;
        }
      },

      refreshAll: async () => {
        await Promise.all([
          get().fetchBudgets(),
          get().fetchAlerts(),
        ]);
      },

      clearError: () => set({ error: null }),

      resetStore: () => set(initialState),
    }),
    {
      name: 'cpfi-budget-store',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        budgets: state.budgets,
        alerts: state.alerts,
      }),
    }
  )
);

// Selectors
export const selectBudgets = (state: BudgetState) => state.budgets;
export const selectAlerts = (state: BudgetState) => state.alerts;
export const selectBudgetByCategory = (category: string) => (state: BudgetState) =>
  state.budgets.find(b => b.category === category);
export const selectOverBudgetAlerts = (state: BudgetState) =>
  state.alerts.filter(a => a.isOverBudget);
export const selectWarningAlerts = (state: BudgetState) =>
  state.alerts.filter(a => !a.isOverBudget && a.percentUsed >= 80);
export const selectBudgetProgress = (state: BudgetState) =>
  state.budgets.map(b => {
    const alert = state.alerts.find(a => a.category === b.category);
    return {
      category: b.category,
      limit: b.limit,
      spent: alert ? b.limit - alert.remaining : 0,
      percentUsed: alert?.percentUsed || 0,
      period: b.period,
    };
  });
export const selectIsLoading = (state: BudgetState) =>
  state.isLoadingBudgets || state.isLoadingAlerts || state.isCreating || state.isUpdating || state.isDeleting;
