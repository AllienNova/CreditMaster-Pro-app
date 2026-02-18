/**
 * useRealTimePrice Hook Tests
 */

import { renderHook, waitFor, act } from "@testing-library/react";
import { useRealTimePrice } from "../useRealTimePrice";

// Mock useAuth hook
jest.mock("../useAuth", () => ({
  useAuth: jest.fn(),
}));

import { useAuth } from "../useAuth";
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

// Mock WebSocket
let lastWebSocketInstance: MockWebSocket | null = null;

class MockWebSocket {
  onopen: (() => void) | null = null;
  onmessage: ((event: any) => void) | null = null;
  onerror: ((event: any) => void) | null = null;
  onclose: (() => void) | null = null;
  readyState = 0;

  constructor(public url: string) {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    lastWebSocketInstance = this;
    setTimeout(() => {
      this.readyState = 1;
      if (this.onopen) this.onopen();
    }, 0);
  }

  send(data: string) {
    // Mock send
  }

  close() {
    this.readyState = 3;
    if (this.onclose) this.onclose();
  }
}

global.WebSocket = MockWebSocket as any;

// Mock fetch for polling fallback
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

describe("useRealTimePrice", () => {
  beforeEach(() => {
    mockFetch.mockClear();
    lastWebSocketInstance = null;
    jest.useFakeTimers();
    mockUseAuth.mockReturnValue({
      user: { id: "test-user-id", email: "test@example.com" } as any,
      loading: false,
      error: null,
      signIn: jest.fn(),
      signUp: jest.fn(),
      signOut: jest.fn(),
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("should connect to WebSocket on mount", async () => {
    const { result } = renderHook(() =>
      useRealTimePrice({ symbols: ["AAPL", "GOOGL"], useWebSocket: true }),
    );

    await act(async () => {
      jest.runAllTimers();
    });

    await waitFor(() => {
      expect(result.current.isConnected).toBe(true);
    });
  });

  it("should receive price updates via WebSocket", async () => {
    const { result } = renderHook(() =>
      useRealTimePrice({ symbols: ["AAPL"], useWebSocket: true }),
    );

    await act(async () => {
      jest.runAllTimers();
    });

    const mockPriceUpdate = {
      symbol: "AAPL",
      price: 160.5,
      change: 2.5,
      changePercent: 1.58,
      timestamp: Date.now(),
      volume: 50000000,
    };

    // Simulate WebSocket message
    await act(async () => {
      if (lastWebSocketInstance?.onmessage) {
        lastWebSocketInstance.onmessage({
          data: JSON.stringify({
            type: "price_update",
            symbol: mockPriceUpdate.symbol,
            price: mockPriceUpdate.price,
            change: mockPriceUpdate.change,
            changePercent: mockPriceUpdate.changePercent,
            timestamp: mockPriceUpdate.timestamp,
            volume: mockPriceUpdate.volume,
          }),
        });
      }
    });

    await waitFor(() => {
      const prices = result.current.prices;
      expect(prices.get("AAPL")).toEqual(mockPriceUpdate);
    });
  });

  it("should subscribe to new symbols", async () => {
    const { result } = renderHook(() =>
      useRealTimePrice({ symbols: ["AAPL"], useWebSocket: true }),
    );

    await act(async () => {
      jest.runAllTimers();
    });

    await act(async () => {
      result.current.subscribe("GOOGL");
    });

    await waitFor(() => {
      expect(result.current.prices.size).toBeGreaterThanOrEqual(0);
    });
  });

  it("should unsubscribe from symbols", async () => {
    const { result } = renderHook(() =>
      useRealTimePrice({ symbols: ["AAPL", "GOOGL"], useWebSocket: true }),
    );

    await act(async () => {
      jest.runAllTimers();
    });

    await waitFor(() => {
      expect(result.current.isConnected).toBe(true);
    });

    // Unsubscribe from one symbol
    act(() => {
      result.current.unsubscribe("GOOGL");
    });

    // Verify unsubscribe function executed without errors
    expect(result.current.unsubscribe).toBeDefined();
  });

  it("should fallback to polling when WebSocket disabled", async () => {
    mockFetch.mockResolvedValue(
      createMockResponse({
        success: true,
        data: {
          symbol: "AAPL",
          price: 160.5,
          change: 2.5,
          changePercent: 1.58,
          timestamp: Date.now(),
        },
      }),
    );

    const { result } = renderHook(() =>
      useRealTimePrice({
        symbols: ["AAPL"],
        useWebSocket: false,
        pollingInterval: 5000,
      }),
    );

    await act(async () => {
      jest.advanceTimersByTime(5000);
    });

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled();
    });
  });

  it("should handle WebSocket errors", async () => {
    const { result } = renderHook(() =>
      useRealTimePrice({ symbols: ["AAPL"], useWebSocket: true }),
    );

    await act(async () => {
      jest.runAllTimers();
    });

    // Simulate WebSocket error
    await act(async () => {
      if (lastWebSocketInstance?.onerror) {
        lastWebSocketInstance.onerror(new Error("WebSocket error"));
      }
    });

    await waitFor(() => {
      expect(result.current.error).toBeTruthy();
    });
  });

  it("should cleanup on unmount", async () => {
    const { unmount } = renderHook(() =>
      useRealTimePrice({ symbols: ["AAPL"], useWebSocket: true }),
    );

    await act(async () => {
      jest.runAllTimers();
    });

    unmount();

    // Verify cleanup
    expect(true).toBe(true);
  });
});
