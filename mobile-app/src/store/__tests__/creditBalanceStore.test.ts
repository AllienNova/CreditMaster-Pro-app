/**
 * creditBalanceStore — authenticated API calls (TASK-MOB-W7-07 / FND-071)
 *
 * Verifies all three API calls go through the authed api client,
 * not bare fetch(), and that endpoints have no doubled /api/ prefix.
 */

import { act } from "@testing-library/react-native";

// ── mock the authed client — functions defined INSIDE factory to survive hoisting ──
jest.mock("../../services/api/client", () => ({
  api: {
    get: jest.fn(),
    post: jest.fn(),
  },
  default: {
    get: jest.fn(),
    post: jest.fn(),
  },
}));

// Guard against any residual bare fetch usage
const mockFetch = jest.fn();
global.fetch = mockFetch;

import { useCreditBalanceStore } from "../creditBalanceStore";

// Grab mock handles via require() — safe after hoisting completes
const { api: mockApi } = require("../../services/api/client");

describe("creditBalanceStore — authenticated API calls", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockReset();
    // Reset store state
    useCreditBalanceStore.setState({
      balance: null,
      transactions: [],
      loading: false,
      error: null,
    });
  });

  it("fetchBalance calls api.get('/credits/balance') and NOT bare fetch", async () => {
    mockApi.get.mockResolvedValueOnce({
      success: true,
      data: {
        creditBalance: 100,
        subscriptionAllowance: 50,
        purchasedCredits: 50,
        usedThisPeriod: 0,
        periodStart: "2026-05-01",
        periodEnd: "2026-05-31",
      },
    });

    await act(async () => {
      await useCreditBalanceStore.getState().fetchBalance();
    });

    expect(mockApi.get).toHaveBeenCalledTimes(1);
    expect(mockApi.get).toHaveBeenCalledWith("/credits/balance");
    // No doubled prefix
    expect(mockApi.get.mock.calls[0][0]).not.toContain("/api/");
    // bare fetch must not have been called with a Fynvita path
    const fetchCalls = mockFetch.mock.calls.filter(
      (c: unknown[]) =>
        typeof c[0] === "string" && (c[0] as string).includes("credits"),
    );
    expect(fetchCalls).toHaveLength(0);
  });

  it("fetchBalance populates balance state on success", async () => {
    const fakeBalance = {
      creditBalance: 200,
      subscriptionAllowance: 100,
      purchasedCredits: 100,
      usedThisPeriod: 5,
      periodStart: "2026-05-01",
      periodEnd: "2026-05-31",
    };
    mockApi.get.mockResolvedValueOnce({ success: true, data: fakeBalance });

    await act(async () => {
      await useCreditBalanceStore.getState().fetchBalance();
    });

    expect(useCreditBalanceStore.getState().balance).toEqual(fakeBalance);
    expect(useCreditBalanceStore.getState().error).toBeNull();
  });

  it("fetchHistory calls api.get('/credits/history?limit=...&offset=...') and NOT bare fetch", async () => {
    mockApi.get.mockResolvedValueOnce({
      success: true,
      data: { transactions: [] },
    });

    await act(async () => {
      await useCreditBalanceStore.getState().fetchHistory(10, 0);
    });

    expect(mockApi.get).toHaveBeenCalledTimes(1);
    const calledPath = mockApi.get.mock.calls[0][0] as string;
    expect(calledPath).toMatch(/^\/credits\/history/);
    expect(calledPath).toContain("limit=10");
    expect(calledPath).toContain("offset=0");
    expect(calledPath).not.toContain("/api/");

    const fetchCalls = mockFetch.mock.calls.filter(
      (c: unknown[]) =>
        typeof c[0] === "string" && (c[0] as string).includes("credits"),
    );
    expect(fetchCalls).toHaveLength(0);
  });

  it("purchasePack calls api.post('/credits/purchase', {packType}) and NOT bare fetch", async () => {
    mockApi.post.mockResolvedValueOnce({
      success: true,
      data: { newBalance: 150 },
    });

    let result: { success: boolean; newBalance?: number; error?: string } = {
      success: false,
    };
    await act(async () => {
      result = await useCreditBalanceStore.getState().purchasePack("starter");
    });

    expect(mockApi.post).toHaveBeenCalledTimes(1);
    expect(mockApi.post.mock.calls[0][0]).toBe("/credits/purchase");
    expect(mockApi.post.mock.calls[0][1]).toEqual({ packType: "starter" });
    expect(mockApi.post.mock.calls[0][0]).not.toContain("/api/");
    expect(result.success).toBe(true);
    expect(result.newBalance).toBe(150);

    const fetchCalls = mockFetch.mock.calls.filter(
      (c: unknown[]) =>
        typeof c[0] === "string" && (c[0] as string).includes("credits"),
    );
    expect(fetchCalls).toHaveLength(0);
  });

  it("fetchBalance sets error state on api failure", async () => {
    mockApi.get.mockResolvedValueOnce({
      success: false,
      error: { code: "HTTP_500", message: "Server error", retryable: true },
      message: "Server error",
    });

    await act(async () => {
      await useCreditBalanceStore.getState().fetchBalance();
    });

    expect(useCreditBalanceStore.getState().balance).toBeNull();
    expect(useCreditBalanceStore.getState().error).toBeTruthy();
  });
});
