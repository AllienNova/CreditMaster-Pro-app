/**
 * useOrders — authenticated API calls (TASK-MOB-W7-07 / FND-071)
 *
 * All four fetch calls must route through the authed api client.
 */

import { renderHook, act, waitFor } from "@testing-library/react-native";

// ── mock the authed client — functions defined INSIDE factory to survive hoisting ──
jest.mock("../../services/api/client", () => ({
  api: {
    get: jest.fn(),
    post: jest.fn(),
    delete: jest.fn(),
  },
}));

import { useOrders } from "../useOrders";

// Grab mock handles via require() — safe after hoisting completes
const { api: mockApi } = require("../../services/api/client");

describe("useOrders — authenticated API calls", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("fetchOrders calls api.get('/trading/orders') — not bare fetch", async () => {
    mockApi.get.mockResolvedValueOnce({
      success: true,
      data: { orders: [], openOrders: [], todayOrderCount: 0, todayFillCount: 0 },
    });

    renderHook(() => useOrders({ autoRefresh: false }));

    await waitFor(() => {
      expect(mockApi.get).toHaveBeenCalledWith("/trading/orders");
    });

    expect(mockApi.get.mock.calls[0][0]).not.toContain("/api/");
  });

  it("createOrder calls api.post('/trading/orders', body) — not bare fetch", async () => {
    // Initial fetch
    mockApi.get.mockResolvedValueOnce({
      success: true,
      data: { orders: [], openOrders: [], todayOrderCount: 0, todayFillCount: 0 },
    });
    // createOrder response
    const fakeOrder = {
      id: "ord-1",
      symbol: "AAPL",
      side: "buy",
      type: "market",
      quantity: 1,
      status: "pending",
      filledQty: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    mockApi.post.mockResolvedValueOnce({
      success: true,
      data: { order: fakeOrder },
    });

    const { result } = renderHook(() => useOrders({ autoRefresh: false }));

    await waitFor(() => {
      expect(mockApi.get).toHaveBeenCalledTimes(1);
    });

    let createResult: { success: boolean; order?: unknown; error?: string };
    await act(async () => {
      createResult = await result.current.createOrder({
        symbol: "AAPL",
        side: "buy",
        type: "market",
        quantity: 1,
      });
    });

    expect(mockApi.post).toHaveBeenCalledTimes(1);
    expect(mockApi.post.mock.calls[0][0]).toBe("/trading/orders");
    expect(mockApi.post.mock.calls[0][0]).not.toContain("/api/");
    expect(createResult!.success).toBe(true);
  });

  it("cancelOrder calls api.delete('/trading/orders?id=...') — not bare fetch", async () => {
    mockApi.get.mockResolvedValueOnce({
      success: true,
      data: { orders: [], openOrders: [], todayOrderCount: 0, todayFillCount: 0 },
    });
    mockApi.delete.mockResolvedValueOnce({ success: true, data: {} });

    const { result } = renderHook(() => useOrders({ autoRefresh: false }));

    await waitFor(() => {
      expect(mockApi.get).toHaveBeenCalledTimes(1);
    });

    let cancelled: boolean;
    await act(async () => {
      cancelled = await result.current.cancelOrder("ord-abc");
    });

    expect(mockApi.delete).toHaveBeenCalledTimes(1);
    const deletePath = mockApi.delete.mock.calls[0][0] as string;
    expect(deletePath).toMatch(/^\/trading\/orders\?id=ord-abc/);
    expect(deletePath).not.toContain("/api/");
    expect(cancelled!).toBe(true);
  });

  it("createOrder surfaces validation error message from backend (Fix 2)", async () => {
    // Initial fetch
    mockApi.get.mockResolvedValueOnce({
      success: true,
      data: { orders: [], openOrders: [], todayOrderCount: 0, todayFillCount: 0 },
    });
    // Backend returns HTTP 400 with validation errors.
    // client.ts stashes raw response body in error.details.
    mockApi.post.mockResolvedValueOnce({
      success: false,
      message: "HTTP 400",
      error: {
        code: "HTTP_400",
        message: "HTTP 400",
        retryable: false,
        details: {
          success: false,
          validation: {
            isValid: false,
            errors: [
              { field: "quantity", message: "Quantity exceeds position limit", code: "LIMIT_EXCEEDED" },
            ],
            warnings: [],
          },
        },
      },
    });

    const { result } = renderHook(() => useOrders({ autoRefresh: false }));

    await waitFor(() => {
      expect(mockApi.get).toHaveBeenCalledTimes(1);
    });

    let createResult: { success: boolean; order?: unknown; error?: string };
    await act(async () => {
      createResult = await result.current.createOrder({
        symbol: "AAPL",
        side: "buy",
        type: "market",
        quantity: 99999,
      });
    });

    expect(createResult!.success).toBe(false);
    // Must show the specific validation message, not the generic "HTTP 400" or "Failed to create order"
    expect(createResult!.error).toBe("Quantity exceeds position limit");
  });

  it("cancelAllOrders calls api.delete('/trading/orders?all=true') — not bare fetch", async () => {
    mockApi.get.mockResolvedValueOnce({
      success: true,
      data: { orders: [], openOrders: [], todayOrderCount: 0, todayFillCount: 0 },
    });
    mockApi.delete.mockResolvedValueOnce({ success: true, data: { count: 0 } });

    const { result } = renderHook(() => useOrders({ autoRefresh: false }));

    await waitFor(() => {
      expect(mockApi.get).toHaveBeenCalledTimes(1);
    });

    await act(async () => {
      await result.current.cancelAllOrders();
    });

    expect(mockApi.delete).toHaveBeenCalledTimes(1);
    expect(mockApi.delete.mock.calls[0][0]).toBe("/trading/orders?all=true");
    expect(mockApi.delete.mock.calls[0][0]).not.toContain("/api/");
  });
});
