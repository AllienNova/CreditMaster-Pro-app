/**
 * useHoldings Hook Tests
 */

import { renderHook, waitFor, act } from "@testing-library/react";
import { useHoldings } from "../useHoldings";
import type { Holding } from "@/lib/investments/types/portfolio.types";

// Mock useAuth hook
jest.mock("../useAuth", () => ({
  useAuth: jest.fn(),
}));

import { useAuth } from "../useAuth";
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Helper to create proper Response objects with clone support
const createMockResponse = (
  data: unknown,
  options: { ok?: boolean; status?: number } = {},
) => {
  const response: any = {
    ok: options.ok !== false,
    status: options.status || (options.ok !== false ? 200 : 500),
    json: jest.fn().mockResolvedValue(data),
    text: jest.fn().mockResolvedValue(JSON.stringify(data)),
    headers: new Headers({ "Content-Type": "application/json" }),
  };
  // Add clone method that returns a copy of the response
  response.clone = jest.fn(() => ({ ...response, clone: response.clone }));
  return response;
};

const mockHolding: Holding = {
  id: "holding-1",
  userId: "test-user-id",
  symbol: "AAPL",
  name: "Apple Inc.",
  assetType: "stock",
  shares: 10,
  averageCostBasis: 150,
  currentPrice: 160,
  totalValue: 1600,
  totalCost: 1500,
  gainLoss: 100,
  gainLossPercent: 6.67,
  lastUpdated: new Date(),
  createdAt: new Date(),
};

describe("useHoldings", () => {
  beforeEach(() => {
    mockFetch.mockClear();
    mockUseAuth.mockReturnValue({
      user: { id: "test-user-id", email: "test@example.com" } as any,
      loading: false,
      error: null,
      signIn: jest.fn(),
      signUp: jest.fn(),
      signOut: jest.fn(),
    });
    mockFetch.mockResolvedValue(
      createMockResponse({ success: true, data: [mockHolding] }),
    );
  });

  it("should fetch holdings on mount", async () => {
    const { result } = renderHook(() => useHoldings());

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.holdings).toEqual([mockHolding]);
    expect(result.current.error).toBeNull();
  });

  it("should add a new holding", async () => {
    mockFetch
      .mockResolvedValueOnce(
        createMockResponse({ success: true, data: [mockHolding] }),
      )
      .mockResolvedValueOnce(
        createMockResponse({ success: true, data: mockHolding }),
      );

    const { result } = renderHook(() => useHoldings());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const newHolding = {
      symbol: "GOOGL",
      name: "Alphabet Inc.",
      assetType: "stock" as const,
      shares: 5,
      averageCostBasis: 2800,
      currentPrice: 2900,
      totalValue: 14500,
      totalCost: 14000,
      gainLoss: 500,
      gainLossPercent: 3.57,
      lastUpdated: new Date(),
    };

    let success = false;
    await act(async () => {
      success = await result.current.addHolding(newHolding);
    });

    expect(success).toBe(true);
    // Check the second call (first is GET for initial fetch, second is POST for add)
    expect(mockFetch).toHaveBeenCalledTimes(2);
    const postCall = mockFetch.mock.calls[1];
    // Handle both URL string and Request object formats
    const postUrl =
      typeof postCall[0] === "string"
        ? postCall[0]
        : postCall[0]?.url || postCall[0]?.href;
    expect(postUrl).toContain("/api/investments/holdings");
    const postMethod = postCall[1]?.method || postCall[0]?.method;
    expect(postMethod).toBe("POST");
  });

  it("should update a holding with optimistic update", async () => {
    mockFetch
      .mockResolvedValueOnce(
        createMockResponse({ success: true, data: [mockHolding] }),
      )
      .mockResolvedValueOnce(createMockResponse({ success: true }));

    const { result } = renderHook(() => useHoldings());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const updates = { shares: 15 };

    let success = false;
    await act(async () => {
      success = await result.current.updateHolding("holding-1", updates);
    });

    expect(success).toBe(true);
    // Check the second call (first is GET for initial fetch, second is PATCH for update)
    expect(mockFetch).toHaveBeenCalledTimes(2);
    const patchCall = mockFetch.mock.calls[1];
    // node-fetch wraps URLs in Request objects
    const patchUrl =
      typeof patchCall[0] === "string"
        ? patchCall[0]
        : patchCall[0].url || patchCall[0].href;
    expect(patchUrl).toContain("/api/investments/holdings/holding-1");
    const patchMethod = patchCall[1]?.method || patchCall[0]?.method;
    expect(patchMethod).toBe("PATCH");
  });

  it("should rollback on update failure", async () => {
    mockFetch
      .mockResolvedValueOnce(
        createMockResponse({ success: true, data: [mockHolding] }),
      )
      .mockResolvedValueOnce(
        createMockResponse(
          { error: "Update failed" },
          { ok: false, status: 500 },
        ),
      );

    const { result } = renderHook(() => useHoldings());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const originalHoldings = result.current.holdings;

    let success = false;
    await act(async () => {
      success = await result.current.updateHolding("holding-1", { shares: 15 });
    });

    expect(success).toBe(false);
    expect(result.current.holdings).toEqual(originalHoldings);
    expect(result.current.error).toBe("Update failed");
  });

  it("should delete a holding", async () => {
    mockFetch
      .mockResolvedValueOnce(
        createMockResponse({ success: true, data: [mockHolding] }),
      )
      .mockResolvedValueOnce(createMockResponse({ success: true }));

    const { result } = renderHook(() => useHoldings());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    let success = false;
    await act(async () => {
      success = await result.current.deleteHolding("holding-1");
    });

    expect(success).toBe(true);
    // Check the second call (first is GET for initial fetch, second is DELETE)
    expect(mockFetch).toHaveBeenCalledTimes(2);
    const deleteCall = mockFetch.mock.calls[1];
    // node-fetch wraps URLs in Request objects
    const deleteUrl =
      typeof deleteCall[0] === "string"
        ? deleteCall[0]
        : deleteCall[0].url || deleteCall[0].href;
    expect(deleteUrl).toContain("/api/investments/holdings/holding-1");
    const deleteMethod = deleteCall[1]?.method || deleteCall[0]?.method;
    expect(deleteMethod).toBe("DELETE");
  });
});
