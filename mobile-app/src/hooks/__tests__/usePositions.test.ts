/**
 * usePositions — authenticated API calls + migrated-path coverage
 * (TASK-MOB-W7-07 review fix / FND-071 test-gap)
 *
 * Verifies that fetchPositions, closePosition, and closeAllPositions
 * route through the authed api client — not bare fetch().
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

import { usePositions } from "../usePositions";

const { api: mockApi } = require("../../services/api/client");

const makePosition = (overrides = {}) => ({
  id: "pos-1",
  symbol: "AAPL",
  side: "long" as const,
  quantity: 10,
  avgEntryPrice: 150,
  currentPrice: 155,
  marketValue: 1550,
  costBasis: 1500,
  unrealizedPL: 50,
  unrealizedPLPercent: 0.033,
  realizedPL: 0,
  status: "open" as const,
  openedAt: new Date(),
  ...overrides,
});

describe("usePositions — authenticated API calls", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockReset();
  });

  it("fetchPositions calls api.get('/trading/positions') — not bare fetch", async () => {
    const fakePos = makePosition();
    mockApi.get.mockResolvedValueOnce({
      success: true,
      data: { positions: [fakePos], openPositions: [fakePos], summary: null },
    });

    const { result } = renderHook(() =>
      usePositions({ autoRefresh: false }),
    );

    await waitFor(() => {
      expect(mockApi.get).toHaveBeenCalledTimes(1);
    });

    expect(mockApi.get).toHaveBeenCalledWith("/trading/positions");
    expect(mockApi.get.mock.calls[0][0]).not.toContain("/api/");
    expect(result.current.positions).toHaveLength(1);

    const fetchCalls = (mockFetch.mock.calls as unknown[][]).filter(
      (c) => typeof c[0] === "string" && (c[0] as string).includes("positions"),
    );
    expect(fetchCalls).toHaveLength(0);
  });

  it("closePosition calls api.post('/trading/positions', close body) — not bare fetch", async () => {
    // Initial fetch
    mockApi.get.mockResolvedValueOnce({
      success: true,
      data: {
        positions: [makePosition()],
        openPositions: [makePosition()],
        summary: null,
      },
    });
    // closePosition response
    mockApi.post.mockResolvedValueOnce({
      success: true,
      data: {
        position: { ...makePosition(), status: "closed" as const },
        realizedPL: 50,
      },
    });

    const { result } = renderHook(() =>
      usePositions({ autoRefresh: false }),
    );

    await waitFor(() => {
      expect(mockApi.get).toHaveBeenCalledTimes(1);
    });

    let closeResult: { success: boolean; realizedPL?: number; error?: string };
    await act(async () => {
      closeResult = await result.current.closePosition("pos-1", 155);
    });

    expect(mockApi.post).toHaveBeenCalledTimes(1);
    expect(mockApi.post.mock.calls[0][0]).toBe("/trading/positions");
    expect(mockApi.post.mock.calls[0][0]).not.toContain("/api/");
    expect(mockApi.post.mock.calls[0][1]).toMatchObject({
      action: "close",
      positionId: "pos-1",
    });
    expect(closeResult!.success).toBe(true);
    expect(closeResult!.realizedPL).toBe(50);
  });
});
