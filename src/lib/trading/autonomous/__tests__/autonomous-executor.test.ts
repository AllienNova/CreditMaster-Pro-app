jest.mock("@/lib/supabase/server", () => ({
  supabaseAdmin: {
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    gte: jest.fn().mockReturnThis(),
    lt: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data: null, error: null }),
    insert: jest.fn().mockResolvedValue({ data: null, error: null }),
    update: jest.fn().mockReturnValue({
      eq: jest.fn().mockResolvedValue({ data: null, error: null }),
    }),
  },
}));

jest.mock("@/lib/trading/modes/operating-mode-manager", () => ({
  createOperatingModeManager: jest.fn(),
}));

jest.mock("../signal-scanner", () => ({
  fetchCandles: jest.fn().mockResolvedValue([
    { timestamp: 1, open: 100, high: 105, low: 95, close: 102, volume: 1000000 },
  ]),
}));

import {
  executeAutonomousTrade,
  checkPortfolioHealth,
  checkGraduation,
} from "../autonomous-executor";
import { createOperatingModeManager } from "@/lib/trading/modes/operating-mode-manager";
import type { PCTTTradingService } from "@/lib/trading/pctt/pctt-trading-service";
import type { ScanResult } from "../autonomous-types";

const mockModeManager = {
  getModeStatus: jest.fn(),
  getGraduationProgress: jest.fn(),
  graduate: jest.fn(),
};

(createOperatingModeManager as jest.Mock).mockReturnValue(mockModeManager);

function makeScanResult(overrides: Partial<ScanResult> = {}): ScanResult {
  return {
    symbol: "AAPL",
    hasSignal: true,
    qScore: 0.8,
    side: "buy",
    entryPrice: 150,
    stopLoss: 145,
    takeProfit: 160,
    scannedAt: Date.now(),
    ...overrides,
  };
}

function makeMockService(overrides: Record<string, unknown> = {}): PCTTTradingService {
  return {
    analyzeForTrade: jest.fn().mockResolvedValue({
      isValid: true,
      signal: { qScore: 0.8, direction: "bullish", confidence: 0.85 },
      entryPrice: 150,
      stopLossPrice: 145,
      takeProfitTargets: [160],
      structure: { regime: "uptrend" },
      validationErrors: [],
    }),
    executeTrade: jest.fn().mockResolvedValue({
      success: true,
      tradeId: "trade_1",
      orderId: "order_1",
      symbol: "AAPL",
      side: "buy",
      quantity: 10,
      entryPrice: 150,
      stopLoss: 145,
      takeProfit: 160,
    }),
    getTradingStats: jest.fn().mockResolvedValue({
      dailyPL: -100,
      totalExposure: 50000,
      openPositionCount: 5,
      canTrade: true,
    }),
    ...overrides,
  } as unknown as PCTTTradingService;
}

describe("autonomous-executor", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (createOperatingModeManager as jest.Mock).mockReturnValue(mockModeManager);
    mockModeManager.getModeStatus.mockResolvedValue({
      success: true,
      data: { currentMode: "autonomous" },
    });
  });

  // ========================================================================
  // executeAutonomousTrade
  // ========================================================================
  describe("executeAutonomousTrade", () => {
    it("returns error when mode status retrieval fails", async () => {
      mockModeManager.getModeStatus.mockResolvedValue({
        success: false,
        error: "DB error",
      });

      const result = await executeAutonomousTrade(
        "user_1",
        makeScanResult(),
        makeMockService(),
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("Failed to retrieve operating mode");
    });

    it("returns error when not in AUTONOMOUS mode", async () => {
      mockModeManager.getModeStatus.mockResolvedValue({
        success: true,
        data: { currentMode: "guided" },
      });

      const result = await executeAutonomousTrade(
        "user_1",
        makeScanResult(),
        makeMockService(),
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("guided mode");
      expect(result.error).toContain("requires autonomous");
    });

    it("returns error when trade setup is invalid", async () => {
      const service = makeMockService({
        analyzeForTrade: jest.fn().mockResolvedValue({
          isValid: false,
          validationErrors: ["insufficient data"],
          signal: { qScore: 0.4 },
        }),
      });

      const result = await executeAutonomousTrade(
        "user_1",
        makeScanResult(),
        service,
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("Trade setup invalid");
    });

    it("returns error when analyzeForTrade returns null", async () => {
      const service = makeMockService({
        analyzeForTrade: jest.fn().mockResolvedValue(null),
      });

      const result = await executeAutonomousTrade(
        "user_1",
        makeScanResult(),
        service,
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("no signal");
    });

    it("executes trade successfully when all validations pass", async () => {
      const result = await executeAutonomousTrade(
        "user_1",
        makeScanResult(),
        makeMockService(),
      );

      expect(result.success).toBe(true);
      expect(result.tradeId).toBe("trade_1");
      expect(result.orderId).toBe("order_1");
      expect(result.symbol).toBe("AAPL");
      expect(result.side).toBe("buy");
      expect(result.quantity).toBe(10);
      expect(result.latencyMs).toBeGreaterThanOrEqual(0);
    });

    it("handles execution errors gracefully", async () => {
      const service = makeMockService({
        analyzeForTrade: jest.fn().mockRejectedValue(new Error("broker down")),
      });

      const result = await executeAutonomousTrade(
        "user_1",
        makeScanResult(),
        service,
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("broker down");
    });

    it("defaults side to buy when scan result has no side", async () => {
      mockModeManager.getModeStatus.mockResolvedValue({
        success: true,
        data: { currentMode: "watch" },
      });

      const result = await executeAutonomousTrade(
        "user_1",
        makeScanResult({ side: undefined }),
        makeMockService(),
      );

      expect(result.side).toBe("buy");
    });

    it("includes latencyMs in result", async () => {
      const result = await executeAutonomousTrade(
        "user_1",
        makeScanResult(),
        makeMockService(),
      );

      expect(typeof result.latencyMs).toBe("number");
      expect(result.latencyMs).toBeGreaterThanOrEqual(0);
    });
  });

  // ========================================================================
  // checkPortfolioHealth
  // ========================================================================
  describe("checkPortfolioHealth", () => {
    it("returns healthy when no critical alerts", async () => {
      const service = makeMockService({
        getTradingStats: jest.fn().mockResolvedValue({
          dailyPL: 500,
          totalExposure: 50000,
          openPositionCount: 3,
          canTrade: true,
        }),
      });

      const result = await checkPortfolioHealth("user_1", service);

      expect(result.healthy).toBe(true);
      expect(result.killSwitchTriggered).toBe(false);
      expect(result.alerts.length).toBe(0);
    });

    it("detects daily loss exceeding threshold", async () => {
      const service = makeMockService({
        getTradingStats: jest.fn().mockResolvedValue({
          dailyPL: -2000,
          totalExposure: 50000,
          openPositionCount: 3,
          canTrade: true,
        }),
      });

      const result = await checkPortfolioHealth("user_1", service);

      expect(result.healthy).toBe(false);
      const drawdownAlert = result.alerts.find((a) => a.type === "drawdown");
      expect(drawdownAlert).toBeDefined();
      expect(drawdownAlert!.severity).toBe("critical");
    });

    it("detects excessive open positions", async () => {
      const service = makeMockService({
        getTradingStats: jest.fn().mockResolvedValue({
          dailyPL: 100,
          totalExposure: 50000,
          openPositionCount: 15,
          canTrade: true,
        }),
      });

      const result = await checkPortfolioHealth("user_1", service);

      const positionAlert = result.alerts.find((a) => a.type === "exposure_limit");
      expect(positionAlert).toBeDefined();
      expect(positionAlert!.severity).toBe("warning");
    });

    it("detects trading restrictions", async () => {
      const service = makeMockService({
        getTradingStats: jest.fn().mockResolvedValue({
          dailyPL: 0,
          totalExposure: 50000,
          openPositionCount: 5,
          canTrade: false,
          reason: "Max daily loss reached",
        }),
      });

      const result = await checkPortfolioHealth("user_1", service);

      const restrictionAlert = result.alerts.find((a) =>
        a.message.includes("Max daily loss reached") ||
        a.message.includes("restricted"),
      );
      expect(restrictionAlert).toBeDefined();
    });

    it("handles errors gracefully and returns unhealthy", async () => {
      const service = makeMockService({
        getTradingStats: jest.fn().mockRejectedValue(new Error("DB timeout")),
      });

      const result = await checkPortfolioHealth("user_1", service);

      expect(result.healthy).toBe(false);
      expect(result.alerts.length).toBe(1);
      expect(result.alerts[0].severity).toBe("critical");
      expect(result.alerts[0].message).toContain("DB timeout");
    });

    it("returns zero exposure when totalExposure is 0", async () => {
      const service = makeMockService({
        getTradingStats: jest.fn().mockResolvedValue({
          dailyPL: 0,
          totalExposure: 0,
          openPositionCount: 0,
          canTrade: true,
        }),
      });

      const result = await checkPortfolioHealth("user_1", service);

      expect(result.dailyPLPercent).toBe(0);
      expect(result.healthy).toBe(true);
    });
  });

  // ========================================================================
  // checkGraduation
  // ========================================================================
  describe("checkGraduation", () => {
    it("returns not graduated when progress check fails", async () => {
      mockModeManager.getGraduationProgress.mockResolvedValue({
        success: false,
        error: "DB error",
      });

      const result = await checkGraduation("user_1");

      expect(result.graduated).toBe(false);
      expect(result.reason).toContain("Failed to check graduation");
    });

    it("returns not graduated when criteria not met", async () => {
      mockModeManager.getGraduationProgress.mockResolvedValue({
        success: true,
        data: {
          currentMode: "watch",
          allCriteriaMet: false,
          criteria: {
            "10 paper trades": { current: 10, required: 10, met: true },
            "Win rate > 50%": { current: 0.4, required: 0.5, met: false },
            "30 days active": { current: 15, required: 30, met: false },
          },
        },
      });

      const result = await checkGraduation("user_1");

      expect(result.graduated).toBe(false);
      expect(result.fromMode).toBe("watch");
      expect(result.reason).toContain("Win rate");
      expect(result.reason).toContain("30 days");
    });

    it("graduates when all criteria met", async () => {
      mockModeManager.getGraduationProgress.mockResolvedValue({
        success: true,
        data: {
          currentMode: "guided",
          allCriteriaMet: true,
          criteria: {
            "50 guided trades": { current: 50, required: 50, met: true },
            "Win rate > 55%": { current: 0.6, required: 0.55, met: true },
          },
        },
      });
      mockModeManager.graduate.mockResolvedValue({
        success: true,
        data: { toMode: "autonomous" },
      });

      const result = await checkGraduation("user_1");

      expect(result.graduated).toBe(true);
      expect(result.fromMode).toBe("guided");
      expect(result.toMode).toBe("autonomous");
      expect(result.reason).toContain("Graduated");
    });

    it("handles graduation failure after criteria met", async () => {
      mockModeManager.getGraduationProgress.mockResolvedValue({
        success: true,
        data: {
          currentMode: "watch",
          allCriteriaMet: true,
          criteria: {
            "Criteria 1": { current: true, required: true, met: true },
          },
        },
      });
      mockModeManager.graduate.mockResolvedValue({
        success: false,
        error: "Graduation rate limited",
      });

      const result = await checkGraduation("user_1");

      expect(result.graduated).toBe(false);
      expect(result.reason).toContain("Graduation failed");
    });
  });
});
