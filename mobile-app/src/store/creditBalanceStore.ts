/**
 * Fynvita Credit Balance Store
 *
 * Zustand store for credit balance, purchase, and transaction history.
 * Separate from creditStore which handles credit scores/monitoring.
 */

import { create } from "zustand";
import { api } from "../services/api/client";

// ============================================================================
// TYPES
// ============================================================================

/**
 * Shape returned by GET /api/credits/balance.
 * Backend source: src/app/api/credits/balance/route.ts
 * Returns: { balance: number, usage: { thisMonth: number, total: number } }
 */
interface CreditBalanceData {
  balance: number;
  usage: {
    thisMonth: number;
    total: number;
  };
}

interface CreditTransaction {
  id: string;
  actionType: string;
  creditsConsumed: number;
  creditsAdded: number;
  balanceAfter: number;
  createdAt: string;
  metadata: Record<string, unknown>;
}

type CreditPackType = "starter" | "value" | "power";

interface CreditBalanceState {
  balance: CreditBalanceData | null;
  transactions: CreditTransaction[];
  loading: boolean;
  error: string | null;
}

interface CreditBalanceActions {
  fetchBalance: () => Promise<void>;
  fetchHistory: (limit?: number, offset?: number) => Promise<void>;
  purchasePack: (
    packType: CreditPackType,
  ) => Promise<{ success: boolean; checkoutUrl?: string; error?: string }>;
  clearError: () => void;
  resetStore: () => void;
}

// ============================================================================
// INITIAL STATE
// ============================================================================

const initialState: CreditBalanceState = {
  balance: null,
  transactions: [],
  loading: false,
  error: null,
};

// ============================================================================
// STORE
// ============================================================================

export const useCreditBalanceStore = create<
  CreditBalanceState & CreditBalanceActions
>((set) => ({
  ...initialState,

  fetchBalance: async () => {
    set({ loading: true, error: null });
    try {
      const res = await api.get<CreditBalanceData>("/credits/balance");
      if (!res.success) {
        throw new Error(res.message ?? "Failed to fetch credit balance");
      }
      set({ balance: res.data });
    } catch (error) {
      set({
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch credit balance",
      });
    } finally {
      set({ loading: false });
    }
  },

  fetchHistory: async (limit = 50, offset = 0) => {
    set({ loading: true, error: null });
    try {
      const res = await api.get<{ transactions: CreditTransaction[] }>(
        `/credits/history?limit=${limit}&offset=${offset}`,
      );
      if (!res.success) {
        throw new Error(res.message ?? "Failed to fetch credit history");
      }
      const items: CreditTransaction[] = res.data?.transactions ?? [];

      if (offset === 0) {
        set({ transactions: items });
      } else {
        set((state) => ({
          transactions: [...state.transactions, ...items],
        }));
      }
    } catch (error) {
      set({
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch credit history",
      });
    } finally {
      set({ loading: false });
    }
  },

  purchasePack: async (packType) => {
    set({ loading: true, error: null });
    try {
      // POST /api/credits/purchase returns { checkoutUrl, sessionId }
      const res = await api.post<{ checkoutUrl: string; sessionId: string }>(
        "/credits/purchase",
        { packType },
      );

      if (!res.success) {
        throw new Error(res.message ?? "Purchase failed");
      }

      return { success: true, checkoutUrl: res.data?.checkoutUrl };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Purchase failed";
      set({ error: message });
      return { success: false, error: message };
    } finally {
      set({ loading: false });
    }
  },

  clearError: () => set({ error: null }),

  resetStore: () => set(initialState),
}));

// ============================================================================
// SELECTORS
// ============================================================================

export const selectBalance = (state: CreditBalanceState) => state.balance;
export const selectTransactions = (state: CreditBalanceState) =>
  state.transactions;
export const selectCreditLoading = (state: CreditBalanceState) => state.loading;
export const selectCreditError = (state: CreditBalanceState) => state.error;

/**
 * Returns true when remaining balance is below 20% of total usage this period.
 * Uses usage.total as denominator (all-time consumed credits as a proxy for allowance).
 */
export const selectIsLow = (state: CreditBalanceState): boolean => {
  if (!state.balance) return false;
  const total = state.balance.usage.total;
  if (total === 0) return false;
  return state.balance.balance / total < 0.2;
};

export default useCreditBalanceStore;
