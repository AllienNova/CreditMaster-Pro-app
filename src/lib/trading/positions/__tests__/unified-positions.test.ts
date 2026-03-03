/**
 * UnifiedPositionService - Comprehensive Test Suite
 *
 * Tests position unification across brokers, weighted average calculations,
 * P&L aggregation, portfolio allocation, and edge cases.
 */

import { UnifiedPositionService } from "../unified-positions";
import type { BrokerRouter } from "../../brokers/broker-router";
import type { SupportedBroker, Position } from "../../brokers/broker-interface";

// ============================================================================
// MOCK SETUP
// ============================================================================

function makePosition(
  symbol: string,
  quantity: number,
  entryPrice: number,
  currentPrice: number,
): Position {
  const costBasis = quantity * entryPrice;
  const marketValue = quantity * currentPrice;
  const unrealizedPL = marketValue - costBasis;
  const unrealizedPLPercent = costBasis > 0 ? (unrealizedPL / costBasis) * 100 : 0;

  return {
    symbol,
    quantity,
    side: "long" as const,
    entryPrice,
    currentPrice,
    marketValue,
    costBasis,
    unrealizedPL,
    unrealizedPLPercent,
    realizedPL: 0,
    assetClass: "stock" as const,
  };
}

function createMockRouter(
  positionsByBroker: Map<SupportedBroker, Position[]>,
): BrokerRouter {
  return {
    getAllPositions: jest.fn().mockResolvedValue(positionsByBroker),
  } as unknown as BrokerRouter;
}

// ============================================================================
// TESTS
// ============================================================================

describe("UnifiedPositionService", () => {
  // ==========================================================================
  // getUnifiedPositions
  // ==========================================================================

  describe("getUnifiedPositions", () => {
    it("should unify positions from multiple brokers", async () => {
      const posMap = new Map<SupportedBroker, Position[]>();
      posMap.set("alpaca", [makePosition("AAPL", 10, 150, 155)]);
      posMap.set("drivewealth", [makePosition("AAPL", 20, 145, 155)]);

      const service = new UnifiedPositionService(createMockRouter(posMap));
      const unified = await service.getUnifiedPositions();

      expect(unified).toHaveLength(1);
      expect(unified[0].symbol).toBe("AAPL");
      expect(unified[0].totalQuantity).toBe(30);
    });

    it("should calculate weighted average entry price", async () => {
      const posMap = new Map<SupportedBroker, Position[]>();
      posMap.set("alpaca", [makePosition("AAPL", 10, 150, 155)]);
      posMap.set("drivewealth", [makePosition("AAPL", 20, 140, 155)]);

      const service = new UnifiedPositionService(createMockRouter(posMap));
      const unified = await service.getUnifiedPositions();

      // Weighted avg: (10*150 + 20*140) / 30 = (1500 + 2800) / 30 = 143.33
      const expectedAvg = (10 * 150 + 20 * 140) / 30;
      expect(unified[0].averageEntryPrice).toBeCloseTo(expectedAvg, 2);
    });

    it("should sum total market value", async () => {
      const posMap = new Map<SupportedBroker, Position[]>();
      posMap.set("alpaca", [makePosition("AAPL", 10, 150, 155)]);
      posMap.set("drivewealth", [makePosition("AAPL", 20, 140, 155)]);

      const service = new UnifiedPositionService(createMockRouter(posMap));
      const unified = await service.getUnifiedPositions();

      expect(unified[0].totalMarketValue).toBe(10 * 155 + 20 * 155);
    });

    it("should sum total cost basis", async () => {
      const posMap = new Map<SupportedBroker, Position[]>();
      posMap.set("alpaca", [makePosition("AAPL", 10, 150, 155)]);
      posMap.set("drivewealth", [makePosition("AAPL", 20, 140, 155)]);

      const service = new UnifiedPositionService(createMockRouter(posMap));
      const unified = await service.getUnifiedPositions();

      expect(unified[0].totalCostBasis).toBe(10 * 150 + 20 * 140);
    });

    it("should sum total unrealized P&L", async () => {
      const posMap = new Map<SupportedBroker, Position[]>();
      posMap.set("alpaca", [makePosition("AAPL", 10, 150, 155)]);
      posMap.set("drivewealth", [makePosition("AAPL", 20, 140, 155)]);

      const service = new UnifiedPositionService(createMockRouter(posMap));
      const unified = await service.getUnifiedPositions();

      const expectedPL = 10 * (155 - 150) + 20 * (155 - 140);
      expect(unified[0].totalUnrealizedPL).toBe(expectedPL);
    });

    it("should calculate unrealized P&L percent from cost basis", async () => {
      const posMap = new Map<SupportedBroker, Position[]>();
      posMap.set("alpaca", [makePosition("AAPL", 10, 100, 110)]);

      const service = new UnifiedPositionService(createMockRouter(posMap));
      const unified = await service.getUnifiedPositions();

      // PL% = (100 / 1000) * 100 = 10%
      expect(unified[0].totalUnrealizedPLPercent).toBeCloseTo(10, 2);
    });

    it("should keep separate entries for different symbols", async () => {
      const posMap = new Map<SupportedBroker, Position[]>();
      posMap.set("alpaca", [
        makePosition("AAPL", 10, 150, 155),
        makePosition("GOOGL", 5, 2800, 2850),
      ]);
      posMap.set("drivewealth", [makePosition("MSFT", 15, 400, 410)]);

      const service = new UnifiedPositionService(createMockRouter(posMap));
      const unified = await service.getUnifiedPositions();

      expect(unified).toHaveLength(3);
      const symbols = unified.map((u) => u.symbol);
      expect(symbols).toContain("AAPL");
      expect(symbols).toContain("GOOGL");
      expect(symbols).toContain("MSFT");
    });

    it("should sort by total market value descending", async () => {
      const posMap = new Map<SupportedBroker, Position[]>();
      posMap.set("alpaca", [
        makePosition("AAPL", 10, 150, 155), // MV: 1550
        makePosition("GOOGL", 5, 2800, 2850), // MV: 14250
      ]);

      const service = new UnifiedPositionService(createMockRouter(posMap));
      const unified = await service.getUnifiedPositions();

      expect(unified[0].symbol).toBe("GOOGL");
      expect(unified[1].symbol).toBe("AAPL");
    });

    it("should include broker breakdown", async () => {
      const posMap = new Map<SupportedBroker, Position[]>();
      posMap.set("alpaca", [makePosition("AAPL", 10, 150, 155)]);
      posMap.set("drivewealth", [makePosition("AAPL", 20, 140, 155)]);

      const service = new UnifiedPositionService(createMockRouter(posMap));
      const unified = await service.getUnifiedPositions();

      expect(unified[0].brokerBreakdown.size).toBe(2);
      expect(unified[0].brokerBreakdown.has("alpaca")).toBe(true);
      expect(unified[0].brokerBreakdown.has("drivewealth")).toBe(true);
    });

    it("should handle single broker", async () => {
      const posMap = new Map<SupportedBroker, Position[]>();
      posMap.set("alpaca", [makePosition("AAPL", 10, 150, 155)]);

      const service = new UnifiedPositionService(createMockRouter(posMap));
      const unified = await service.getUnifiedPositions();

      expect(unified).toHaveLength(1);
      expect(unified[0].totalQuantity).toBe(10);
      expect(unified[0].brokerBreakdown.size).toBe(1);
    });

    it("should return empty array when no positions", async () => {
      const posMap = new Map<SupportedBroker, Position[]>();
      posMap.set("alpaca", []);

      const service = new UnifiedPositionService(createMockRouter(posMap));
      const unified = await service.getUnifiedPositions();

      expect(unified).toHaveLength(0);
    });

    it("should return empty array when no brokers connected", async () => {
      const posMap = new Map<SupportedBroker, Position[]>();

      const service = new UnifiedPositionService(createMockRouter(posMap));
      const unified = await service.getUnifiedPositions();

      expect(unified).toHaveLength(0);
    });
  });

  // ==========================================================================
  // getUnifiedPosition
  // ==========================================================================

  describe("getUnifiedPosition", () => {
    it("should return unified position for a specific symbol", async () => {
      const posMap = new Map<SupportedBroker, Position[]>();
      posMap.set("alpaca", [
        makePosition("AAPL", 10, 150, 155),
        makePosition("GOOGL", 5, 2800, 2850),
      ]);

      const service = new UnifiedPositionService(createMockRouter(posMap));
      const position = await service.getUnifiedPosition("AAPL");

      expect(position).not.toBeNull();
      expect(position?.symbol).toBe("AAPL");
      expect(position?.totalQuantity).toBe(10);
    });

    it("should return null for a symbol not held", async () => {
      const posMap = new Map<SupportedBroker, Position[]>();
      posMap.set("alpaca", [makePosition("AAPL", 10, 150, 155)]);

      const service = new UnifiedPositionService(createMockRouter(posMap));
      const position = await service.getUnifiedPosition("MSFT");

      expect(position).toBeNull();
    });

    it("should merge from multiple brokers for specific symbol", async () => {
      const posMap = new Map<SupportedBroker, Position[]>();
      posMap.set("alpaca", [makePosition("AAPL", 10, 150, 155)]);
      posMap.set("drivewealth", [makePosition("AAPL", 5, 148, 155)]);

      const service = new UnifiedPositionService(createMockRouter(posMap));
      const position = await service.getUnifiedPosition("AAPL");

      expect(position).not.toBeNull();
      expect(position?.totalQuantity).toBe(15);
      expect(position?.brokerBreakdown.size).toBe(2);
    });
  });

  // ==========================================================================
  // getTotalPortfolioValue
  // ==========================================================================

  describe("getTotalPortfolioValue", () => {
    it("should sum market values across all brokers", async () => {
      const posMap = new Map<SupportedBroker, Position[]>();
      posMap.set("alpaca", [
        makePosition("AAPL", 10, 150, 155), // MV: 1550
        makePosition("GOOGL", 5, 2800, 2850), // MV: 14250
      ]);
      posMap.set("drivewealth", [
        makePosition("MSFT", 15, 400, 410), // MV: 6150
      ]);

      const service = new UnifiedPositionService(createMockRouter(posMap));
      const total = await service.getTotalPortfolioValue();

      expect(total).toBe(1550 + 14250 + 6150);
    });

    it("should return 0 when no positions", async () => {
      const posMap = new Map<SupportedBroker, Position[]>();

      const service = new UnifiedPositionService(createMockRouter(posMap));
      const total = await service.getTotalPortfolioValue();

      expect(total).toBe(0);
    });
  });

  // ==========================================================================
  // getPortfolioAllocation
  // ==========================================================================

  describe("getPortfolioAllocation", () => {
    it("should return allocation percentages as decimals", async () => {
      const posMap = new Map<SupportedBroker, Position[]>();
      posMap.set("alpaca", [
        makePosition("AAPL", 10, 100, 100), // MV: 1000
        makePosition("GOOGL", 10, 100, 100), // MV: 1000
      ]);

      const service = new UnifiedPositionService(createMockRouter(posMap));
      const allocation = await service.getPortfolioAllocation();

      expect(allocation.get("AAPL")).toBeCloseTo(0.5, 5);
      expect(allocation.get("GOOGL")).toBeCloseTo(0.5, 5);
    });

    it("should return empty map when no positions", async () => {
      const posMap = new Map<SupportedBroker, Position[]>();

      const service = new UnifiedPositionService(createMockRouter(posMap));
      const allocation = await service.getPortfolioAllocation();

      expect(allocation.size).toBe(0);
    });

    it("should handle uneven allocations", async () => {
      const posMap = new Map<SupportedBroker, Position[]>();
      posMap.set("alpaca", [
        makePosition("AAPL", 10, 100, 100), // MV: 1000
        makePosition("GOOGL", 10, 100, 300), // MV: 3000
      ]);

      const service = new UnifiedPositionService(createMockRouter(posMap));
      const allocation = await service.getPortfolioAllocation();

      // AAPL: 1000 / 4000 = 0.25, GOOGL: 3000 / 4000 = 0.75
      expect(allocation.get("AAPL")).toBeCloseTo(0.25, 5);
      expect(allocation.get("GOOGL")).toBeCloseTo(0.75, 5);
    });

    it("should unify same symbol from different brokers in allocation", async () => {
      const posMap = new Map<SupportedBroker, Position[]>();
      posMap.set("alpaca", [makePosition("AAPL", 10, 100, 100)]); // MV: 1000
      posMap.set("drivewealth", [makePosition("AAPL", 10, 100, 100)]); // MV: 1000

      const service = new UnifiedPositionService(createMockRouter(posMap));
      const allocation = await service.getPortfolioAllocation();

      // All AAPL => 100% allocation
      expect(allocation.get("AAPL")).toBeCloseTo(1.0, 5);
      expect(allocation.size).toBe(1);
    });
  });

  // ==========================================================================
  // EDGE CASES
  // ==========================================================================

  describe("edge cases", () => {
    it("should handle zero quantity position", async () => {
      const posMap = new Map<SupportedBroker, Position[]>();
      posMap.set("alpaca", [makePosition("AAPL", 0, 150, 155)]);

      const service = new UnifiedPositionService(createMockRouter(posMap));
      const unified = await service.getUnifiedPositions();

      expect(unified).toHaveLength(1);
      expect(unified[0].totalQuantity).toBe(0);
      expect(unified[0].averageEntryPrice).toBe(0); // 0 / 0 guard
    });

    it("should handle zero cost basis when computing P&L percent", async () => {
      const posMap = new Map<SupportedBroker, Position[]>();
      const zeroPos = makePosition("AAPL", 0, 0, 155);
      posMap.set("alpaca", [zeroPos]);

      const service = new UnifiedPositionService(createMockRouter(posMap));
      const unified = await service.getUnifiedPositions();

      expect(unified[0].totalUnrealizedPLPercent).toBe(0);
    });
  });
});
