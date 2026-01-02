/**
 * CPFI Transaction Store
 * Manages financial transactions and categories
 * Split from financialStore for better modularity
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { transactionApi } from '../services/api';
import type { Transaction } from '../services/api/types';

interface TransactionState {
  // State
  transactions: Transaction[];
  categories: string[];
  totalCount: number;
  currentPage: number;

  // Loading states
  isLoadingTransactions: boolean;
  isLoadingCategories: boolean;
  isUpdating: boolean;

  // Error
  error: string | null;

  // Actions
  fetchTransactions: (params?: {
    page?: number;
    accountId?: string;
    category?: string;
    startDate?: string;
    endDate?: string;
  }) => Promise<void>;
  fetchCategories: () => Promise<void>;
  updateTransactionCategory: (transactionId: string, category: string) => Promise<boolean>;
  refreshTransactions: () => Promise<void>;

  // Utility
  clearError: () => void;
  resetStore: () => void;
}

const initialState = {
  transactions: [] as Transaction[],
  categories: [] as string[],
  totalCount: 0,
  currentPage: 1,
  isLoadingTransactions: false,
  isLoadingCategories: false,
  isUpdating: false,
  error: null as string | null,
};

export const useTransactionStore = create<TransactionState>()(
  persist(
    (set, get) => ({
      ...initialState,

      fetchTransactions: async (params = {}) => {
        set({ isLoadingTransactions: true, error: null });
        try {
          const response = await transactionApi.getAll(params);
          if (response.success && response.data) {
            set({
              transactions: response.data.items,
              totalCount: response.data.total || response.data.items.length,
              currentPage: params.page || 1,
              isLoadingTransactions: false
            });
          } else {
            set({
              error: response.error?.message || 'Failed to fetch transactions',
              isLoadingTransactions: false
            });
          }
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to fetch transactions',
            isLoadingTransactions: false
          });
        }
      },

      fetchCategories: async () => {
        set({ isLoadingCategories: true, error: null });
        try {
          const response = await transactionApi.getCategories();
          if (response.success && response.data) {
            set({
              categories: response.data.categories,
              isLoadingCategories: false
            });
          } else {
            set({
              error: response.error?.message || 'Failed to fetch categories',
              isLoadingCategories: false
            });
          }
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to fetch categories',
            isLoadingCategories: false
          });
        }
      },

      updateTransactionCategory: async (transactionId: string, category: string) => {
        set({ isUpdating: true, error: null });
        try {
          const response = await transactionApi.updateCategory(transactionId, category);
          if (response.success) {
            // Update local transaction
            set({
              transactions: get().transactions.map(t =>
                t.id === transactionId ? { ...t, category } : t
              ),
              isUpdating: false
            });
            return true;
          }
          set({
            error: response.error?.message || 'Failed to update category',
            isUpdating: false
          });
          return false;
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to update category',
            isUpdating: false
          });
          return false;
        }
      },

      refreshTransactions: async () => {
        const currentPage = get().currentPage;
        await get().fetchTransactions({ page: currentPage });
      },

      clearError: () => set({ error: null }),

      resetStore: () => set(initialState),
    }),
    {
      name: 'cpfi-transaction-store',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        transactions: state.transactions.slice(0, 50), // Only persist recent 50
        categories: state.categories,
      }),
    }
  )
);

// Selectors
export const selectTransactions = (state: TransactionState) => state.transactions;
export const selectCategories = (state: TransactionState) => state.categories;
export const selectTransactionsByCategory = (category: string) => (state: TransactionState) =>
  state.transactions.filter(t => t.category === category);
export const selectTransactionsByAccount = (accountId: string) => (state: TransactionState) =>
  state.transactions.filter(t => t.accountId === accountId);
export const selectRecentTransactions = (limit: number = 10) => (state: TransactionState) =>
  state.transactions.slice(0, limit);
export const selectIsLoading = (state: TransactionState) =>
  state.isLoadingTransactions || state.isLoadingCategories || state.isUpdating;
