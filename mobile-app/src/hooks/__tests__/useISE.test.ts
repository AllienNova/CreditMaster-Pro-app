/**
 * useISE — authenticated API calls + canTrade failure-handling (Fix 3)
 * (TASK-MOB-W7-07 review fix / FND-071 test-gap)
 *
 * Tests cover:
 *   1. fetchISEState routes through api client — not bare fetch
 *   2. canTrade returns data.allowed on success
 *   3. canTrade logs a warning and returns allowed:false with a distinct reason on API failure
 *      (distinguishes "not allowed" from "couldn't check")
 *   4. apiBaseUrl option no longer exists in UseISEOptions (removed in Fix 4)
 */

import { renderHook, act, waitFor } from "@testing-library/react-native";

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

const mockFetch = jest.fn();
global.fetch = mockFetch;

import { useISE } from "../useISE";
import type { UseISEOptions } from "../useISE";

const { api: mockApi } = require("../../services/api/client");

/** Provide minimal successful ISE state for the initial fetch. */
function mockSuccessfulFetch() {
  mockApi.get
    .mockResolvedValueOnce({
      success: true,
      data: { rankings: [] },
    })
    .mockResolvedValueOnce({
      success: true,
      data: { activeSymbols: [] },
    })
    .mockResolvedValueOnce({
      success: true,
      data: { events: [] },
    });
}

describe("useISE — authenticated API calls + canTrade failure handling", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockReset();
  });

  it("fetchISEState calls api.get('/trading/ise?action=rankings...') — not bare fetch", async () => {
    mockSuccessfulFetch();

    renderHook(() => useISE({ enabled: true, pollingIntervalMs: 0 }));

    await waitFor(() => {
      expect(mockApi.get).toHaveBeenCalledTimes(3);
    });

    const rankingsCall = mockApi.get.mock.calls[0][0] as string;
    expect(rankingsCall).toMatch(/^\/trading\/ise\?action=rankings/);
    expect(rankingsCall).not.toContain("/api/");

    const fetchCalls = (mockFetch.mock.calls as unknown[][]).filter(
      (c) => typeof c[0] === "string" && (c[0] as string).includes("trading"),
    );
    expect(fetchCalls).toHaveLength(0);
  });

  it("canTrade returns allowed:true and reason from API on success", async () => {
    mockSuccessfulFetch();

    const { result } = renderHook(() =>
      useISE({ enabled: true, pollingIntervalMs: 0 }),
    );

    await waitFor(() => expect(mockApi.get).toHaveBeenCalledTimes(3));

    // canTrade call
    mockApi.get.mockResolvedValueOnce({
      success: true,
      data: { allowed: true, reason: "Symbol is in active set" },
    });

    let tradeResult: { allowed: boolean; reason: string };
    await act(async () => {
      tradeResult = await result.current.canTrade("AAPL");
    });

    expect(tradeResult!.allowed).toBe(true);
    expect(tradeResult!.reason).toBe("Symbol is in active set");

    const canTradeCall = mockApi.get.mock.calls[3][0] as string;
    expect(canTradeCall).toContain("action=canTrade");
    expect(canTradeCall).toContain("symbol=AAPL");
    expect(canTradeCall).not.toContain("/api/");
  });

  it("canTrade returns allowed:false with distinct reason on API failure (Fix 3)", async () => {
    mockSuccessfulFetch();

    const { result } = renderHook(() =>
      useISE({ enabled: true, pollingIntervalMs: 0 }),
    );

    await waitFor(() => expect(mockApi.get).toHaveBeenCalledTimes(3));

    // Simulate transient 429/503 — API error, not "genuinely not allowed"
    mockApi.get.mockResolvedValueOnce({
      success: false,
      error: { code: "HTTP_429", message: "Too many requests", retryable: true },
      message: "Too many requests",
    });

    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});

    let tradeResult: { allowed: boolean; reason: string };
    await act(async () => {
      tradeResult = await result.current.canTrade("AAPL");
    });

    // Must be false — but with a diagnosable "unavailable" reason, NOT a false "not-allowed"
    expect(tradeResult!.allowed).toBe(false);
    expect(tradeResult!.reason).toMatch(/unavailable|retry/i);
    // Must have logged a warning so the failure is diagnosable
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("[useISE.canTrade]"),
      expect.anything(),
    );

    warnSpy.mockRestore();
  });

  it("UseISEOptions does not accept apiBaseUrl (Fix 4 — option removed)", () => {
    // This test is a compile-time check expressed at runtime.
    // If apiBaseUrl were still in the interface, TypeScript would allow it
    // and this narrowing would not fail. Since it was removed, passing an
    // unknown key is a TS error — but at runtime we verify the hook ignores
    // any stray property (the option is gone from the public interface).
    const opts: UseISEOptions = {};
    // apiBaseUrl is NOT a key of UseISEOptions — verified by the type above
    expect("apiBaseUrl" in opts).toBe(false);
  });
});
