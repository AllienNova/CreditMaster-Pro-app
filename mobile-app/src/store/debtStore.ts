/**
 * Fynvita Debt Store
 * Manages debt overview and payoff strategies
 * Split from financialStore for better modularity
 */

import { create } from "zustand";
import { toArray } from "./toArray";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { debtApi } from "../services/api";

interface DebtItem {
  id: string;
  name: string;
  type: string;
  balance: number;
  interestRate: number;
  minimumPayment: number;
}

interface DebtOverview {
  totalDebt: number;
  debts: DebtItem[];
  monthlyPayments: number;
  projectedPayoffDate: string;
}

interface PayoffTimeline {
  month: string;
  totalPaid: number;
  remainingDebt: number;
}

interface PayoffCalculation {
  timeline: PayoffTimeline[];
  payoffDate: string;
  interestSaved: number;
  totalInterestPaid: number;
  strategy: "snowball" | "avalanche";
}

interface DebtState {
  // State
  overview: DebtOverview | null;
  payoffCalculation: PayoffCalculation | null;

  // Loading states
  isLoadingOverview: boolean;
  isCalculatingPayoff: boolean;

  // Error
  error: string | null;

  // Actions
  fetchOverview: () => Promise<void>;
  calculatePayoff: (
    strategy: "snowball" | "avalanche",
    extraPayment?: number,
  ) => Promise<PayoffCalculation | null>;
  refreshOverview: () => Promise<void>;

  // Utility
  clearError: () => void;
  resetStore: () => void;
}

const initialState = {
  overview: null as DebtOverview | null,
  payoffCalculation: null as PayoffCalculation | null,
  isLoadingOverview: false,
  isCalculatingPayoff: false,
  error: null as string | null,
};

export const useDebtStore = create<DebtState>()(
  persist(
    (set, get) => ({
      ...initialState,

      fetchOverview: async () => {
        set({ isLoadingOverview: true, error: null });
        try {
          const response = await debtApi.getOverview();
          if (response.success && response.data) {
            set({
              overview: {
                totalDebt: response.data.totalDebt,
                debts: toArray(response.data.debts),
                monthlyPayments: response.data.monthlyPayments,
                projectedPayoffDate: response.data.projectedPayoffDate,
              },
              isLoadingOverview: false,
            });
          } else {
            set({
              error: response.error?.message || "Failed to fetch debt overview",
              isLoadingOverview: false,
            });
          }
        } catch (error) {
          set({
            error:
              error instanceof Error
                ? error.message
                : "Failed to fetch debt overview",
            isLoadingOverview: false,
          });
        }
      },

      calculatePayoff: async (strategy, extraPayment = 0) => {
        set({ isCalculatingPayoff: true, error: null });
        try {
          const response = await debtApi.calculatePayoff(
            strategy,
            extraPayment,
          );
          if (response.success && response.data) {
            const calculation: PayoffCalculation = {
              ...response.data,
              strategy,
            };
            set({
              payoffCalculation: calculation,
              isCalculatingPayoff: false,
            });
            return calculation;
          }
          set({
            error: response.error?.message || "Failed to calculate payoff",
            isCalculatingPayoff: false,
          });
          return null;
        } catch (error) {
          set({
            error:
              error instanceof Error
                ? error.message
                : "Failed to calculate payoff",
            isCalculatingPayoff: false,
          });
          return null;
        }
      },

      refreshOverview: async () => {
        await get().fetchOverview();
      },

      clearError: () => set({ error: null }),

      resetStore: () => set(initialState),
    }),
    {
      name: "cpfi-debt-store",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        overview: state.overview,
        payoffCalculation: state.payoffCalculation,
      }),
    },
  ),
);

// Selectors
export const selectDebtOverview = (state: DebtState) => state.overview;
export const selectTotalDebt = (state: DebtState) =>
  state.overview?.totalDebt || 0;
export const selectDebts = (state: DebtState) => state.overview?.debts || [];
export const selectMonthlyPayments = (state: DebtState) =>
  state.overview?.monthlyPayments || 0;
export const selectPayoffCalculation = (state: DebtState) =>
  state.payoffCalculation;
export const selectDebtsByType = (type: string) => (state: DebtState) =>
  state.overview?.debts.filter((d) => d.type === type) || [];
export const selectHighestInterestDebt = (state: DebtState) => {
  const debts = state.overview?.debts || [];
  if (debts.length === 0) return null;
  return debts.reduce((highest, debt) =>
    debt.interestRate > highest.interestRate ? debt : highest,
  );
};
export const selectSmallestDebt = (state: DebtState) => {
  const debts = state.overview?.debts || [];
  if (debts.length === 0) return null;
  return debts.reduce((smallest, debt) =>
    debt.balance < smallest.balance ? debt : smallest,
  );
};
export const selectDebtFreeDate = (state: DebtState) =>
  state.overview?.projectedPayoffDate || null;
export const selectInterestSavings = (state: DebtState) =>
  state.payoffCalculation?.interestSaved || 0;
export const selectIsLoading = (state: DebtState) =>
  state.isLoadingOverview || state.isCalculatingPayoff;
