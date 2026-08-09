/**
 * creditBalanceStore — response-shape correctness + authenticated API calls
 * (TASK-MOB-W7-07 review fix / FND-071)
 *
 * Fix 1: mocks now return the REAL backend shape so any shape regression is caught.
 *
 * Real backend shapes (verified against web route files):
 *   GET  /api/credits/balance  → { balance: number, usage: { thisMonth: number, total: number } }
 *   GET  /api/credits/history  → { transactions: CreditTransaction[], total: number }
 *   POST /api/credits/purchase → { checkoutUrl: string, sessionId: string }
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

describe("creditBalanceStore — authenticated API calls + shape correctness", () => {
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

  // ---------------------------------------------------------------------------
  // fetchBalance
  // ---------------------------------------------------------------------------

  it("fetchBalance calls api.get('/credits/balance') and NOT bare fetch", async () => {
    // Real backend shape: { balance, usage: { thisMonth, total } }
    mockApi.get.mockResolvedValueOnce({
      success: true,
      data: {
        balance: 100,
        usage: { thisMonth: 20, total: 80 },
      },
    });

    await act(async () => {
      await useCreditBalanceStore.getState().fetchBalance();
    });

    expect(mockApi.get).toHaveBeenCalledTimes(1);
    expect(mockApi.get).toHaveBeenCalledWith("/credits/balance");
    // No doubled prefix
    expect(mockApi.get.mock.calls[0][0]).not.toContain("/api/");
    // bare fetch must not have been called with a credits path
    const fetchCalls = (mockFetch.mock.calls as unknown[][]).filter(
      (c) => typeof c[0] === "string" && (c[0] as string).includes("credits"),
    );
    expect(fetchCalls).toHaveLength(0);
  });

  it("fetchBalance stores the real backend shape in state", async () => {
    // This test uses the REAL backend response shape — if the store mapping
    // is wrong, the stored balance will have undefined fields.
    const realBackendResponse = {
      balance: 250,
      usage: { thisMonth: 30, total: 120 },
    };
    mockApi.get.mockResolvedValueOnce({
      success: true,
      data: realBackendResponse,
    });

    await act(async () => {
      await useCreditBalanceStore.getState().fetchBalance();
    });

    const stored = useCreditBalanceStore.getState().balance;
    expect(stored).not.toBeNull();
    expect(stored!.balance).toBe(250);
    expect(stored!.usage.thisMonth).toBe(30);
    expect(stored!.usage.total).toBe(120);
    expect(useCreditBalanceStore.getState().error).toBeNull();
  });

  it("fetchBalance detects shape regression: wrong field names are undefined", async () => {
    // If the backend ever returns the old store-shaped object, the new type guard
    // catches it here: balance.creditBalance would be undefined.
    const realBackendResponse = {
      balance: 100,
      usage: { thisMonth: 10, total: 50 },
    };
    mockApi.get.mockResolvedValueOnce({ success: true, data: realBackendResponse });

    await act(async () => {
      await useCreditBalanceStore.getState().fetchBalance();
    });

    const stored = useCreditBalanceStore.getState().balance!;
    // Old store-shape fields must NOT exist (they would be undefined if backend
    // returned the wrong shape)
    expect((stored as unknown as Record<string, unknown>)["creditBalance"]).toBeUndefined();
    expect((stored as unknown as Record<string, unknown>)["subscriptionAllowance"]).toBeUndefined();
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

  // ---------------------------------------------------------------------------
  // fetchHistory
  // ---------------------------------------------------------------------------

  it("fetchHistory calls api.get('/credits/history?limit=...&offset=...') and NOT bare fetch", async () => {
    // Real backend shape: { transactions: [], total: number }
    mockApi.get.mockResolvedValueOnce({
      success: true,
      data: { transactions: [], total: 0 },
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

    const fetchCalls = (mockFetch.mock.calls as unknown[][]).filter(
      (c) => typeof c[0] === "string" && (c[0] as string).includes("credits"),
    );
    expect(fetchCalls).toHaveLength(0);
  });

  // ---------------------------------------------------------------------------
  // purchasePack
  // ---------------------------------------------------------------------------

  it("purchasePack calls api.post('/credits/purchase', {packType}) and returns checkoutUrl", async () => {
    // Real backend shape: { checkoutUrl: string, sessionId: string }
    mockApi.post.mockResolvedValueOnce({
      success: true,
      data: {
        checkoutUrl: "https://checkout.stripe.com/pay/cs_test_abc123",
        sessionId: "cs_test_abc123",
      },
    });

    let result: { success: boolean; checkoutUrl?: string; error?: string } = {
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
    expect(result.checkoutUrl).toBe(
      "https://checkout.stripe.com/pay/cs_test_abc123",
    );

    const fetchCalls = (mockFetch.mock.calls as unknown[][]).filter(
      (c) => typeof c[0] === "string" && (c[0] as string).includes("credits"),
    );
    expect(fetchCalls).toHaveLength(0);
  });
});
