/**
 * usePortfolio Hook Tests
 */

import { renderHook, waitFor } from "@testing-library/react";
import { usePortfolio } from "../usePortfolio";
import type { Portfolio } from "@/lib/investments/types/portfolio.types";

// Mock useAuth hook
jest.mock("../useAuth", () => ({
  useAuth: jest.fn(),
}));

import { useAuth } from "../useAuth";
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

// Mock fetch
const mockFetch = global.fetch as jest.Mock;

// Helper to create proper Response objects with clone() method
const createMockResponse = (
  data: any,
  options: { ok?: boolean; status?: number } = {},
) => {
  const responseBody = JSON.stringify(data);
  return new Response(responseBody, {
    status: options.status || (options.ok !== false ? 200 : 500),
    headers: { "Content-Type": "application/json" },
  });
};

const mockPortfolio: Portfolio = {
  userId: "test-user-id",
  totalValue: 100000,
  totalCost: 90000,
  totalGainLoss: 10000,
  totalGainLossPercent: 11.11,
  dayChange: 500,
  dayChangePercent: 0.5,
  holdings: [],
  allocation: [],
  performanceHistory: [],
  lastUpdated: new Date(),
};

describe("usePortfolio", () => {
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
      createMockResponse({ success: true, data: mockPortfolio }),
    );
  });

  afterEach(() => {
    jest.clearAllTimers();
  });

  it("should fetch portfolio data on mount", async () => {
    const { result } = renderHook(() => usePortfolio());

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Dates are serialized to strings through JSON, so compare key fields
    expect(result.current.portfolio?.totalValue).toBe(mockPortfolio.totalValue);
    expect(result.current.portfolio?.totalCost).toBe(mockPortfolio.totalCost);
    expect(result.current.portfolio?.totalGainLoss).toBe(
      mockPortfolio.totalGainLoss,
    );
    expect(result.current.error).toBeNull();
    expect(mockFetch).toHaveBeenCalled();
    const fetchCall = mockFetch.mock.calls[0];
    // node-fetch wraps the URL in a Request object
    const requestUrl =
      typeof fetchCall[0] === "string" ? fetchCall[0] : fetchCall[0].url;
    expect(requestUrl).toBe("/api/investments/portfolio?period=1M");
  });

  it("should handle different time periods", async () => {
    const { result } = renderHook(() => usePortfolio({ period: "1Y" }));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(mockFetch).toHaveBeenCalled();
    const fetchCall = mockFetch.mock.calls[0];
    // node-fetch wraps the URL in a Request object
    const requestUrl =
      typeof fetchCall[0] === "string" ? fetchCall[0] : fetchCall[0].url;
    expect(requestUrl).toBe("/api/investments/portfolio?period=1Y");
  });

  it("should handle fetch errors", async () => {
    mockFetch.mockResolvedValueOnce(
      createMockResponse(
        { error: "Failed to fetch portfolio" },
        { ok: false, status: 500 },
      ),
    );

    const { result } = renderHook(() => usePortfolio());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.portfolio).toBeNull();
    expect(result.current.error).toBe("Failed to fetch portfolio");
  });

  it("should handle network errors", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Network error"));

    const { result } = renderHook(() => usePortfolio());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe("Network error");
  });

  it("should refresh portfolio data", async () => {
    const { result } = renderHook(() => usePortfolio());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(mockFetch).toHaveBeenCalledTimes(1);

    // Trigger refresh
    await result.current.refresh();

    await waitFor(() => {
      expect(result.current.isRefreshing).toBe(false);
    });

    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it("should not fetch when disabled", async () => {
    const { result } = renderHook(() => usePortfolio({ enabled: false }));

    // Wait a bit to ensure no fetch is triggered
    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(mockFetch).not.toHaveBeenCalled();
    expect(result.current.portfolio).toBeNull();
    // Note: loading may still be true since the hook doesn't call fetchPortfolio when disabled
    // This is expected behavior - the hook is waiting for enabled to become true
  });

  it("should not fetch when user is not authenticated", async () => {
    mockUseAuth.mockReturnValue({
      user: null,
      loading: false,
      error: null,
      signIn: jest.fn(),
      signUp: jest.fn(),
      signOut: jest.fn(),
    });

    const { result } = renderHook(() => usePortfolio());

    // Wait for the effect to run
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("should cancel pending requests on unmount", async () => {
    const abortSpy = jest.spyOn(AbortController.prototype, "abort");

    const { unmount } = renderHook(() => usePortfolio());

    unmount();

    expect(abortSpy).toHaveBeenCalled();
  });
});
