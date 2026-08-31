/**
 * Fynvita Account Store
 * Manages bank account connections and Plaid integration
 * Split from financialStore for better modularity
 */

import { create } from "zustand";
import { toArray } from "./toArray";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  bankAccountApi,
  bankConnectionApi,
  flattenConnectionsToAccounts,
} from "../services/api";
import type { BankAccount } from "../services/api/types";

interface AccountState {
  // State
  accounts: BankAccount[];
  selectedAccountId: string | null;

  // Loading states
  isLoadingAccounts: boolean;
  isConnectingAccount: boolean;
  isRefreshing: boolean;

  // Error
  error: string | null;

  // Actions - Accounts
  fetchAccounts: () => Promise<void>;
  connectAccount: () => Promise<{ linkToken: string } | null>;
  exchangePlaidToken: (
    publicToken: string,
    metadata?: Record<string, unknown>,
  ) => Promise<boolean>;
  refreshAccount: (accountId: string) => Promise<void>;
  /**
   * Revoke a bank CONNECTION, not an account: Plaid's /item/remove ends the
   * whole Item, so there is no such thing as disconnecting one account and
   * keeping its sibling. Was disconnectAccount(accountId), which sent DELETE
   * to /financial/accounts/[id] — a route that exports only GET, so every call
   * answered 405 while the caller removed the account from local state anyway.
   */
  disconnectConnection: (connectionId: string) => Promise<boolean>;
  selectAccount: (accountId: string | null) => void;

  // Utility
  clearError: () => void;
  resetStore: () => void;
}

const initialState = {
  accounts: [] as BankAccount[],
  selectedAccountId: null as string | null,
  isLoadingAccounts: false,
  isConnectingAccount: false,
  isRefreshing: false,
  error: null as string | null,
};

export const useAccountStore = create<AccountState>()(
  persist(
    (set, get) => ({
      ...initialState,

      fetchAccounts: async () => {
        set({ isLoadingAccounts: true, error: null });
        try {
          const response = await bankAccountApi.getAccounts();
          if (response.success && response.data) {
            // `connections`, not `accounts`. The old read was
            // response.data.accounts against a route that answers with a bare
            // array, so it was undefined on every call and toArray turned it
            // into [] — the financial tab said "0 connected" no matter how
            // many banks the user had linked.
            set({
              accounts: flattenConnectionsToAccounts(
                toArray(response.data.connections),
              ),
              isLoadingAccounts: false,
            });
          } else {
            set({
              error: response.error?.message || "Failed to fetch accounts",
              isLoadingAccounts: false,
            });
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
          set({
            error: response.error?.message || "Failed to get link token",
            isConnectingAccount: false,
          });
          return null;
        } catch (error) {
          set({
            error:
              error instanceof Error
                ? error.message
                : "Failed to connect account",
            isConnectingAccount: false,
          });
          return null;
        }
      },

      exchangePlaidToken: async (
        publicToken: string,
        metadata?: Record<string, unknown>,
      ) => {
        set({ isConnectingAccount: true, error: null });
        try {
          const response = await bankAccountApi.exchangePlaidToken(
            publicToken,
            metadata,
          );
          if (response.success) {
            // Refresh accounts after successful connection
            await get().fetchAccounts();
            set({ isConnectingAccount: false });
            return true;
          }
          set({
            error: response.error?.message || "Failed to exchange token",
            isConnectingAccount: false,
          });
          return false;
        } catch (error) {
          set({
            error:
              error instanceof Error
                ? error.message
                : "Failed to exchange token",
            isConnectingAccount: false,
          });
          return false;
        }
      },

      refreshAccount: async (accountId: string) => {
        set({ isRefreshing: true, error: null });
        try {
          const response = await bankAccountApi.refreshAccount(accountId);
          if (response.success) {
            // Refresh all accounts to get updated data
            await get().fetchAccounts();
          } else {
            set({
              error: response.error?.message || "Failed to refresh account",
            });
          }
        } catch (error) {
          set({
            error:
              error instanceof Error
                ? error.message
                : "Failed to refresh account",
          });
        } finally {
          set({ isRefreshing: false });
        }
      },

      disconnectConnection: async (connectionId: string) => {
        set({ isLoadingAccounts: true, error: null });
        try {
          const response = await bankConnectionApi.disconnect(connectionId);
          if (response.success) {
            // Re-read rather than filtering locally. One connection owns
            // several accounts, and which ones is the server's answer, not a
            // guess this store can make from an id. The previous code removed
            // exactly one account from local state on a response it had not
            // actually received (the request 405'd), which is how a screen
            // ends up showing a disconnection that never happened.
            await get().fetchAccounts();
            set({ selectedAccountId: null, isLoadingAccounts: false });
            return true;
          }
          set({
            // The route answers 502 with "nothing was changed" when the
            // provider refuses. Surfacing that verbatim matters: the bank is
            // still connected and retrying is the right next step.
            error: response.error?.message || "Failed to disconnect",
            isLoadingAccounts: false,
          });
          return false;
        } catch (error) {
          set({
            error:
              error instanceof Error ? error.message : "Failed to disconnect",
            isLoadingAccounts: false,
          });
          return false;
        }
      },

      selectAccount: (accountId: string | null) => {
        set({ selectedAccountId: accountId });
      },

      clearError: () => set({ error: null }),

      resetStore: () => set(initialState),
    }),
    {
      name: "cpfi-account-store",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        accounts: state.accounts,
        selectedAccountId: state.selectedAccountId,
      }),
    },
  ),
);

// Selectors
export const selectAccounts = (state: AccountState) => state.accounts;
export const selectSelectedAccount = (state: AccountState) =>
  state.accounts.find((a) => a.id === state.selectedAccountId) || null;
export const selectAccountsByType = (type: string) => (state: AccountState) =>
  state.accounts.filter((a) => a.type === type);
export const selectTotalBalance = (state: AccountState) =>
  state.accounts.reduce((sum, account) => sum + (account.balance || 0), 0);
export const selectIsLoading = (state: AccountState) =>
  state.isLoadingAccounts || state.isConnectingAccount || state.isRefreshing;
