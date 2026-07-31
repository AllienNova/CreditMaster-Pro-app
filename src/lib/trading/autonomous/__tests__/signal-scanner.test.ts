jest.mock("@/lib/supabase/server", () => ({
  supabaseAdmin: {
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data: null, error: null }),
    insert: jest.fn().mockResolvedValue({ data: null, error: null }),
  },
}));

jest.mock("@/lib/trading/pctt/pctt-trading-service", () => {
  return {
    PCTTTradingService: jest.fn().mockImplementation(() => ({
      analyzeForTrade: jest.fn().mockResolvedValue(null),
    })),
  };
});

import { loadWatchlist, fetchCandles, scanSymbol, runScanCycle } from "../signal-scanner";
import { PCTTTradingService } from "@/lib/trading/pctt/pctt-trading-service";
import { supabaseAdmin } from "@/lib/supabase/server";

describe("signal-scanner", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ========================================================================
  // loadWatchlist
  // ========================================================================
  describe("loadWatchlist", () => {
    it("returns user watchlist from DB when available", async () => {
      const mockFrom = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { watchlist: ["AAPL", "TSLA", "GOOG"] },
              error: null,
            }),
          }),
        }),
      });
      (supabaseAdmin as unknown as { from: jest.Mock }).from = mockFrom;

      const result = await loadWatchlist("user_1");
      expect(result).toEqual(["AAPL", "TSLA", "GOOG"]);
    });

    it("returns default watchlist on DB error", async () => {
      const mockFrom = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { message: "not found" },
            }),
          }),
        }),
      });
      (supabaseAdmin as unknown as { from: jest.Mock }).from = mockFrom;

      const result = await loadWatchlist("user_1");
      expect(result).toContain("AAPL");
      expect(result).toContain("NVDA");
      expect(result.length).toBe(10);
    });

    it("returns default watchlist when watchlist is null", async () => {
      const mockFrom = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { watchlist: null },
              error: null,
            }),
          }),
        }),
      });
      (supabaseAdmin as unknown as { from: jest.Mock }).from = mockFrom;

      const result = await loadWatchlist("user_1");
      expect(result.length).toBe(10);
    });
  });

  // ========================================================================
  // fetchCandles
  // ========================================================================
  // These three cases previously asserted the SYNTHETIC generator's output
  // (50 bars / 200-bar default / chronological random walk). That generator was
  // deleted in DEFAB-1: it fed Math.random() prices into the autonomous
  // executor's scan decisions. The requirement changed — the scanner must yield
  // real bars or none — so these now pin the honest contract instead.
  describe("fetchCandles", () => {
    it("returns no candles rather than fabricating them", async () => {
      const candles = await fetchCandles("AAPL", 50);
      expect(candles).toEqual([]);
    });

    it("fabricates nothing regardless of the requested count", async () => {
      expect(await fetchCandles("MSFT")).toHaveLength(0);
      expect(await fetchCandles("MSFT", 200)).toHaveLength(0);
      expect(await fetchCandles("MSFT", 5)).toHaveLength(0);
    });

    it("is deterministic — never returns randomly generated prices", async () => {
      const first = await fetchCandles("TSLA", 100);
      const second = await fetchCandles("TSLA", 100);
      // The deleted generator produced a different random walk on every call.
      expect(first).toEqual(second);
      expect(first).toEqual([]);
    });
  });

  // ========================================================================
  // scanSymbol
  // ========================================================================
  describe("scanSymbol", () => {
    it("returns no signal when analyzeForTrade returns null", async () => {
      const mockService = {
        analyzeForTrade: jest.fn().mockResolvedValue(null),
      } as unknown as PCTTTradingService;

      const candles = await fetchCandles("AAPL", 50);
      const result = await scanSymbol(mockService, "AAPL", candles, 0.65);

      expect(result.symbol).toBe("AAPL");
      expect(result.hasSignal).toBe(false);
      expect(result.reason).toContain("No signal");
    });

    it("returns no signal when setup is invalid", async () => {
      const mockService = {
        analyzeForTrade: jest.fn().mockResolvedValue({
          isValid: false,
          validationErrors: ["insufficient data", "no trend"],
          signal: { qScore: 0.4 },
        }),
      } as unknown as PCTTTradingService;

      const candles = await fetchCandles("AAPL", 50);
      const result = await scanSymbol(mockService, "AAPL", candles, 0.65);

      expect(result.hasSignal).toBe(false);
      expect(result.reason).toContain("insufficient data");
    });

    it("returns no signal when qScore below threshold", async () => {
      const mockService = {
        analyzeForTrade: jest.fn().mockResolvedValue({
          isValid: true,
          signal: { qScore: 0.55, direction: "bullish", confidence: 0.55 },
          entryPrice: 150,
          stopLossPrice: 145,
          takeProfitTargets: [160],
          structure: { regime: "uptrend" },
          validationErrors: [],
        }),
      } as unknown as PCTTTradingService;

      const candles = await fetchCandles("AAPL", 50);
      const result = await scanSymbol(mockService, "AAPL", candles, 0.65);

      expect(result.hasSignal).toBe(false);
      expect(result.qScore).toBe(0.55);
      expect(result.reason).toContain("below threshold");
    });

    it("returns signal when qScore meets threshold", async () => {
      const mockService = {
        analyzeForTrade: jest.fn().mockResolvedValue({
          isValid: true,
          signal: { qScore: 0.8, type: "long", confidence: 0.85 },
          entryPrice: 150,
          stopLossPrice: 145,
          takeProfitTargets: [160, 170],
          structure: { regime: "uptrend" },
          validationErrors: [],
        }),
      } as unknown as PCTTTradingService;

      const candles = await fetchCandles("AAPL", 50);
      const result = await scanSymbol(mockService, "AAPL", candles, 0.65);

      expect(result.hasSignal).toBe(true);
      expect(result.qScore).toBe(0.8);
      expect(result.side).toBe("buy");
      expect(result.entryPrice).toBe(150);
      expect(result.stopLoss).toBe(145);
      expect(result.takeProfit).toBe(160);
      expect(result.regime).toBe("uptrend");
    });

    it("maps bearish direction to sell side", async () => {
      const mockService = {
        analyzeForTrade: jest.fn().mockResolvedValue({
          isValid: true,
          signal: { qScore: 0.75, type: "short", confidence: 0.8 },
          entryPrice: 200,
          stopLossPrice: 210,
          takeProfitTargets: [190],
          structure: { regime: "downtrend" },
          validationErrors: [],
        }),
      } as unknown as PCTTTradingService;

      const candles = await fetchCandles("TSLA", 50);
      const result = await scanSymbol(mockService, "TSLA", candles, 0.65);

      expect(result.side).toBe("sell");
    });

    it("handles analysis errors gracefully", async () => {
      const mockService = {
        analyzeForTrade: jest.fn().mockRejectedValue(new Error("analysis failed")),
      } as unknown as PCTTTradingService;

      const candles = await fetchCandles("AAPL", 50);
      const result = await scanSymbol(mockService, "AAPL", candles, 0.65);

      expect(result.hasSignal).toBe(false);
      expect(result.reason).toContain("analysis failed");
    });
  });

  // ========================================================================
  // runScanCycle
  // ========================================================================
  describe("runScanCycle", () => {
    it("scans all provided symbols", async () => {
      // Mock DB for scan log persistence
      const mockFrom = jest.fn().mockReturnValue({
        insert: jest.fn().mockResolvedValue({ data: null, error: null }),
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { message: "not found" },
            }),
          }),
        }),
      });
      (supabaseAdmin as unknown as { from: jest.Mock }).from = mockFrom;

      const result = await runScanCycle(
        "user_1",
        {},
        0.65,
        ["AAPL", "MSFT"],
      );

      expect(result.symbolsScanned).toBe(2);
      expect(result.results.length).toBe(2);
      expect(result.results[0].symbol).toBe("AAPL");
      expect(result.results[1].symbol).toBe("MSFT");
      expect(result.cycleId).toMatch(/^scan_/);
    });

    it("includes cycleId, timing, and error fields", async () => {
      const mockFrom = jest.fn().mockReturnValue({
        insert: jest.fn().mockResolvedValue({ data: null, error: null }),
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { message: "not found" },
            }),
          }),
        }),
      });
      (supabaseAdmin as unknown as { from: jest.Mock }).from = mockFrom;

      const result = await runScanCycle("user_1", {}, 0.65, ["AAPL"]);

      expect(result.cycleId).toBeDefined();
      expect(result.userId).toBe("user_1");
      expect(result.startedAt).toBeLessThanOrEqual(result.completedAt);
      expect(result.errors).toEqual([]);
    });

    it("counts signals found correctly", async () => {
      // Mock PCTTTradingService to return signals for AAPL but not MSFT
      const mockAnalyze = jest
        .fn()
        .mockResolvedValueOnce({
          isValid: true,
          signal: { qScore: 0.8, type: "long", confidence: 0.85 },
          entryPrice: 150,
          stopLossPrice: 145,
          takeProfitTargets: [160],
          structure: { regime: "uptrend" },
          validationErrors: [],
        })
        .mockResolvedValueOnce(null);

      (PCTTTradingService as jest.Mock).mockImplementation(() => ({
        analyzeForTrade: mockAnalyze,
      }));

      const mockFrom = jest.fn().mockReturnValue({
        insert: jest.fn().mockResolvedValue({ data: null, error: null }),
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { message: "not found" },
            }),
          }),
        }),
      });
      (supabaseAdmin as unknown as { from: jest.Mock }).from = mockFrom;

      const result = await runScanCycle(
        "user_1",
        {},
        0.65,
        ["AAPL", "MSFT"],
      );

      expect(result.signalsFound).toBe(1);
      expect(result.tradesQueued).toBe(1);
    });
  });
});
