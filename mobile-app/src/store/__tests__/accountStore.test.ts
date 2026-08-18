/**
 * Fynvita Account Store Unit Tests
 */

import { act } from "@testing-library/react-native";
import { useAccountStore, selectTotalBalance, selectSelectedAccount, selectIsLoading } from "../accountStore";
import type { BankAccount } from "../../services/api/types";

// flattenConnectionsToAccounts is NOT mocked: the store's job is to call it on
// the real payload, and stubbing it would hide the shape mismatch these tests
// exist to pin.
jest.mock("../../services/api", () => {
  const actual = jest.requireActual("../../services/api/financial");
  return {
    bankAccountApi: {
      getAccounts: jest.fn(),
      getPlaidLinkToken: jest.fn(),
      exchangePlaidToken: jest.fn(),
      refreshAccount: jest.fn(),
    },
    bankConnectionApi: {
      getConnections: jest.fn(),
      disconnect: jest.fn(),
    },
    flattenConnectionsToAccounts: actual.flattenConnectionsToAccounts,
  };
});

const { bankAccountApi, bankConnectionApi } = require("../../services/api");

/**
 * What GET /api/financial/connections actually answers with — one connection
 * carrying its accounts, NOT a flat `{ accounts: [...] }`. The previous
 * version of these tests mocked `{ accounts: mockAccounts }`, which is the
 * shape the store wrongly expected, so the suite stayed green while the
 * financial tab showed "0 connected" for every real user.
 */
const CONNECTIONS = [
  {
    id: "conn-1",
    provider: "plaid",
    institutionId: "ins_1",
    institutionName: "Chase",
    status: "active" as const,
    errorCode: null,
    errorMessage: null,
    consentExpiresAt: null,
    createdAt: "2026-07-01T00:00:00.000Z",
    accounts: [
      {
        id: "acc-1",
        accountName: "Checking",
        accountType: "depository",
        accountSubtype: "checking",
        mask: "0000",
        currentBalance: 5000,
        currency: "USD",
        lastSynced: "2026-07-20T12:00:00.000Z",
      },
    ],
  },
  {
    id: "conn-2",
    provider: "plaid",
    institutionId: "ins_2",
    institutionName: "Ally Bank",
    status: "active" as const,
    errorCode: null,
    errorMessage: null,
    consentExpiresAt: null,
    createdAt: "2026-07-01T00:00:00.000Z",
    accounts: [
      {
        id: "acc-2",
        accountName: "Savings",
        accountType: "depository",
        accountSubtype: "savings",
        mask: "1111",
        currentBalance: 15000,
        currency: "USD",
        lastSynced: "2026-07-20T12:00:00.000Z",
      },
    ],
  },
];

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
    it("flattens the connections payload into accounts", async () => {
      bankAccountApi.getAccounts.mockResolvedValue({
        success: true,
        data: { connections: CONNECTIONS },
      });

      await act(async () => {
        await useAccountStore.getState().fetchAccounts();
      });

      const state = useAccountStore.getState();
      expect(state.accounts.map((a) => a.id)).toEqual(["acc-1", "acc-2"]);
      expect(state.isLoadingAccounts).toBe(false);
      expect(state.error).toBeNull();
    });

    it("takes institutionName from the CONNECTION, not the account", async () => {
      // financial_accounts.institution_name held the ACCOUNT's name until the
      // sync path was fixed; the connection is the only honest source.
      bankAccountApi.getAccounts.mockResolvedValue({
        success: true,
        data: { connections: CONNECTIONS },
      });

      await act(async () => {
        await useAccountStore.getState().fetchAccounts();
      });

      expect(
        useAccountStore.getState().accounts.map((a) => a.institutionName),
      ).toEqual(["Chase", "Ally Bank"]);
    });

    it("splits depository into checking and savings by subtype", async () => {
      bankAccountApi.getAccounts.mockResolvedValue({
        success: true,
        data: { connections: CONNECTIONS },
      });

      await act(async () => {
        await useAccountStore.getState().fetchAccounts();
      });

      expect(
        useAccountStore.getState().accounts.map((a) => a.accountType),
      ).toEqual(["checking", "savings"]);
    });

    it("marks accounts of a needs_attention connection as not connected", async () => {
      bankAccountApi.getAccounts.mockResolvedValue({
        success: true,
        data: {
          connections: [
            { ...CONNECTIONS[0], status: "needs_attention" as const },
          ],
        },
      });

      await act(async () => {
        await useAccountStore.getState().fetchAccounts();
      });

      expect(useAccountStore.getState().accounts[0].isConnected).toBe(false);
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

  describe("disconnectConnection", () => {
    it("re-reads from the server rather than filtering locally", async () => {
      // One connection owns several accounts, and which ones is the server's
      // answer. The old code removed exactly one account by id — from a
      // response it never received, because the request 405'd.
      useAccountStore.setState({
        accounts: mockAccounts,
        selectedAccountId: "acc-1",
      });
      bankConnectionApi.disconnect.mockResolvedValue({ success: true });
      bankAccountApi.getAccounts.mockResolvedValue({
        success: true,
        data: { connections: [CONNECTIONS[1]] },
      });

      let result = false;
      await act(async () => {
        result = await useAccountStore
          .getState()
          .disconnectConnection("conn-1");
      });

      expect(result).toBe(true);
      expect(bankAccountApi.getAccounts).toHaveBeenCalled();
      expect(useAccountStore.getState().accounts.map((a) => a.id)).toEqual([
        "acc-2",
      ]);
      expect(useAccountStore.getState().selectedAccountId).toBeNull();
    });

    it("removes NOTHING when the provider refuses", async () => {
      // A 502 means the bank is still connected. Dropping it from the list
      // would show the user a disconnection that did not happen.
      useAccountStore.setState({ accounts: mockAccounts });
      bankConnectionApi.disconnect.mockResolvedValue({
        success: false,
        error: { message: "nothing was changed" },
      });

      let result = true;
      await act(async () => {
        result = await useAccountStore
          .getState()
          .disconnectConnection("conn-1");
      });

      expect(result).toBe(false);
      expect(useAccountStore.getState().accounts).toHaveLength(2);
      expect(bankAccountApi.getAccounts).not.toHaveBeenCalled();
    });

    it("surfaces the server's message so the user knows to retry", async () => {
      useAccountStore.setState({ accounts: mockAccounts });
      bankConnectionApi.disconnect.mockResolvedValue({
        success: false,
        error: { message: "nothing was changed" },
      });

      await act(async () => {
        await useAccountStore.getState().disconnectConnection("conn-1");
      });

      expect(useAccountStore.getState().error).toBe("nothing was changed");
    });

    it("keeps every account when the request throws", async () => {
      useAccountStore.setState({ accounts: mockAccounts });
      bankConnectionApi.disconnect.mockRejectedValue(new Error("Failed"));

      let result = true;
      await act(async () => {
        result = await useAccountStore
          .getState()
          .disconnectConnection("conn-1");
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
