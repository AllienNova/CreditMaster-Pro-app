/**
 * Fynvita Account Store Unit Tests
 */

import { act } from "@testing-library/react-native";
import { useAccountStore, selectTotalBalance, selectSelectedAccount, selectIsLoading } from "../accountStore";
import type { BankAccount } from "../../services/api/types";

jest.mock("../../services/api", () => ({
  bankAccountApi: {
    getAccounts: jest.fn(),
    getPlaidLinkToken: jest.fn(),
    exchangePlaidToken: jest.fn(),
    refreshAccount: jest.fn(),
    disconnectAccount: jest.fn(),
  },
}));

const { bankAccountApi } = require("../../services/api");

const mockAccounts: BankAccount[] = [
  {
    id: "acc-1",
    userId: "user-1",
    institutionName: "Chase",
    accountType: "checking",
    type: "checking",
    accountName: "Checking",
    name: "Checking",
    balance: 5000,
    availableBalance: 5000,
    lastSynced: "2026-07-20T12:00:00.000Z",
    isConnected: true,
  },
  {
    id: "acc-2",
    userId: "user-1",
    institutionName: "Ally Bank",
    accountType: "savings",
    type: "savings",
    accountName: "Savings",
    name: "Savings",
    balance: 15000,
    availableBalance: 15000,
    lastSynced: "2026-07-20T12:00:00.000Z",
    isConnected: true,
  },
];

describe("Account Store", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAccountStore.setState({
      accounts: [],
      selectedAccountId: null,
      isLoadingAccounts: false,
      isConnectingAccount: false,
      isRefreshing: false,
      error: null,
    });
  });

  describe("Initial State", () => {
    it("should have correct initial state", () => {
      const state = useAccountStore.getState();
      expect(state.accounts).toEqual([]);
      expect(state.selectedAccountId).toBeNull();
      expect(state.isLoadingAccounts).toBe(false);
      expect(state.error).toBeNull();
    });
  });

  describe("fetchAccounts", () => {
    it("should fetch accounts successfully", async () => {
      bankAccountApi.getAccounts.mockResolvedValue({
        success: true,
        data: { accounts: mockAccounts },
      });

      await act(async () => {
        await useAccountStore.getState().fetchAccounts();
      });

      const state = useAccountStore.getState();
      expect(state.accounts).toEqual(mockAccounts);
      expect(state.isLoadingAccounts).toBe(false);
      expect(state.error).toBeNull();
    });

    it("should handle API error response", async () => {
      bankAccountApi.getAccounts.mockResolvedValue({
        success: false,
        error: { message: "Unauthorized" },
      });

      await act(async () => {
        await useAccountStore.getState().fetchAccounts();
      });

      expect(useAccountStore.getState().error).toBe("Unauthorized");
      expect(useAccountStore.getState().isLoadingAccounts).toBe(false);
    });

    it("should handle thrown exception", async () => {
      bankAccountApi.getAccounts.mockRejectedValue(new Error("Network error"));

      await act(async () => {
        await useAccountStore.getState().fetchAccounts();
      });

      expect(useAccountStore.getState().error).toBe("Network error");
    });
  });

  describe("connectAccount", () => {
    it("should return link token on success", async () => {
      bankAccountApi.getPlaidLinkToken.mockResolvedValue({
        success: true,
        data: { linkToken: "link-sandbox-token-123" },
      });

      let result: { linkToken: string } | null = null;
      await act(async () => {
        result = await useAccountStore.getState().connectAccount();
      });

      expect(result).toEqual({ linkToken: "link-sandbox-token-123" });
      expect(useAccountStore.getState().isConnectingAccount).toBe(false);
    });

    it("should return null on failure", async () => {
      bankAccountApi.getPlaidLinkToken.mockResolvedValue({
        success: false,
        error: { message: "Plaid unavailable" },
      });

      let result: { linkToken: string } | null = null;
      await act(async () => {
        result = await useAccountStore.getState().connectAccount();
      });

      expect(result).toBeNull();
      expect(useAccountStore.getState().error).toBe("Plaid unavailable");
    });
  });

  describe("disconnectAccount", () => {
    it("should remove account from state on success", async () => {
      useAccountStore.setState({
        accounts: mockAccounts,
        selectedAccountId: "acc-1",
      });

      bankAccountApi.disconnectAccount.mockResolvedValue({ success: true });

      let result = false;
      await act(async () => {
        result = await useAccountStore.getState().disconnectAccount("acc-1");
      });

      expect(result).toBe(true);
      expect(useAccountStore.getState().accounts).toHaveLength(1);
      expect(useAccountStore.getState().selectedAccountId).toBeNull();
    });

    it("should handle disconnect failure", async () => {
      useAccountStore.setState({ accounts: mockAccounts });
      bankAccountApi.disconnectAccount.mockRejectedValue(new Error("Failed"));

      let result = true;
      await act(async () => {
        result = await useAccountStore.getState().disconnectAccount("acc-1");
      });

      expect(result).toBe(false);
      expect(useAccountStore.getState().accounts).toHaveLength(2);
    });
  });

  describe("selectAccount", () => {
    it("should set selectedAccountId", () => {
      useAccountStore.getState().selectAccount("acc-1");
      expect(useAccountStore.getState().selectedAccountId).toBe("acc-1");
    });
  });

  describe("Selectors", () => {
    it("selectTotalBalance sums account balances", () => {
      useAccountStore.setState({ accounts: mockAccounts });
      expect(selectTotalBalance(useAccountStore.getState())).toBe(20000);
    });

    it("selectSelectedAccount returns matching account", () => {
      useAccountStore.setState({ accounts: mockAccounts, selectedAccountId: "acc-2" });
      expect(selectSelectedAccount(useAccountStore.getState())?.name).toBe("Savings");
    });

    it("selectIsLoading returns true when any loading flag is true", () => {
      useAccountStore.setState({ isLoadingAccounts: true });
      expect(selectIsLoading(useAccountStore.getState())).toBe(true);
    });
  });

  describe("resetStore", () => {
    it("should reset to initial state", () => {
      useAccountStore.setState({ accounts: mockAccounts, error: "err" });
      useAccountStore.getState().resetStore();
      expect(useAccountStore.getState().accounts).toEqual([]);
      expect(useAccountStore.getState().error).toBeNull();
    });
  });
});
