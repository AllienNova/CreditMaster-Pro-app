/**
 * Fynvita Dashboard Store
 * Manages financial dashboard overview and aggregated metrics
 * Refactored from financialStore - now focuses only on dashboard data
 */

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  financialOverviewApi,
  type DashboardCategorySpending,
  type DashboardMonthlyTrend,
} from "../services/api";

interface FinancialDashboard {
  netWorth: number;
  totalAssets: number;
  totalLiabilities: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  savingsRate: number;
  // Real per-category month spend + 6-month income/expense/savings trend, surfaced
  // from the web aggregate via mapWebDashboard. Optional because older persisted
  // state may predate them; a live fetch always supplies arrays (possibly empty).
  spendingByCategory?: DashboardCategorySpending[];
  monthlyTrend?: DashboardMonthlyTrend[];
  lastUpdated: string;
}

interface DashboardState {
  // State
  dashboard: FinancialDashboard | null;

  // Loading states
  isLoadingDashboard: boolean;
  isRefreshing: boolean;

  // Error
  error: string | null;

  // Actions
  fetchDashboard: () => Promise<void>;
  refreshDashboard: () => Promise<void>;

  // Utility
  clearError: () => void;
  resetStore: () => void;
}

const initialState = {
  dashboard: null as FinancialDashboard | null,
  isLoadingDashboard: false,
  isRefreshing: false,
  error: null as string | null,
};

export const useDashboardStore = create<DashboardState>()(
  persist(
    (set, get) => ({
      ...initialState,

      fetchDashboard: async () => {
        set({ isLoadingDashboard: true, error: null });
        try {
          const response = await financialOverviewApi.getDashboard();
          if (response.success && response.data) {
            set({
              dashboard: {
                ...response.data,
                lastUpdated: new Date().toISOString(),
              },
              isLoadingDashboard: false,
            });
          } else {
            set({
              error: response.error?.message || "Failed to fetch dashboard",
              isLoadingDashboard: false,
            });
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

      refreshDashboard: async () => {
        set({ isRefreshing: true });
        await get().fetchDashboard();
        set({ isRefreshing: false });
      },

      clearError: () => set({ error: null }),

      resetStore: () => set(initialState),
    }),
    {
      name: "cpfi-dashboard-store",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        dashboard: state.dashboard,
      }),
    },
  ),
);

// Selectors
export const selectDashboard = (state: DashboardState) => state.dashboard;
export const selectNetWorth = (state: DashboardState) =>
  state.dashboard?.netWorth || 0;
export const selectTotalAssets = (state: DashboardState) =>
  state.dashboard?.totalAssets || 0;
export const selectTotalLiabilities = (state: DashboardState) =>
  state.dashboard?.totalLiabilities || 0;
export const selectSavingsRate = (state: DashboardState) =>
  state.dashboard?.savingsRate || 0;
export const selectMonthlyIncome = (state: DashboardState) =>
  state.dashboard?.monthlyIncome || 0;
export const selectMonthlyExpenses = (state: DashboardState) =>
  state.dashboard?.monthlyExpenses || 0;
export const selectCashFlow = (state: DashboardState) => {
  const dashboard = state.dashboard;
  if (!dashboard) return 0;
  return dashboard.monthlyIncome - dashboard.monthlyExpenses;
};
export const selectIsLoading = (state: DashboardState) =>
  state.isLoadingDashboard || state.isRefreshing;
