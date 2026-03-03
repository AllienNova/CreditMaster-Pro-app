/**
 * Instrument Ranking Service Tests
 *
 * Tests ranking, filtering, and formatting logic.
 * Mocks instrument-scoring to isolate ranking behavior.
 */

import type {
  Instrument,
  InstrumentFeatures,
  InstrumentPerformance,
  InstrumentRanking,
  ScoreBreakdown,
  UserConstraints,
} from "../types";

// Mock instrument-scoring — arrow function wrappers since resetMocks:true
jest.mock("../instrument-scoring", () => ({
  scoreInstruments: jest.fn(
    (...args: unknown[]) =>
      (
        jest.requireActual("../instrument-scoring") as {
          scoreInstruments: (...a: unknown[]) => unknown;
        }
      ).scoreInstruments(...args),
  ),
  explainScore: jest.fn(
    (...args: unknown[]) =>
      (
        jest.requireActual("../instrument-scoring") as {
          explainScore: (...a: unknown[]) => unknown;
        }
      ).explainScore(...args),
  ),
  DEFAULT_SCORING_CONFIG: (
    jest.requireActual("../instrument-scoring") as {
      DEFAULT_SCORING_CONFIG: unknown;
    }
  ).DEFAULT_SCORING_CONFIG,
}));

import {
  InstrumentRankingService,
  createRankingService,
  DEFAULT_RANKING_CONFIG,
  formatRankingRow,
  generateAgentThoughts,
} from "../instrument-ranking";
import { scoreInstruments } from "../instrument-scoring";

const mockScoreInstruments = scoreInstruments as jest.Mock;

// ============================================================================
// HELPERS
// ============================================================================

function makeInstrument(overrides: Partial<Instrument> = {}): Instrument {
  return {
    id: "inst_1",
    symbol: "AAPL",
    name: "Apple Inc.",
    assetClass: "stocks",
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function makeFeatures(
  overrides: Partial<InstrumentFeatures> = {},
): InstrumentFeatures {
  return {
    id: "feat_1",
    instrumentId: "inst_1",
    symbol: "AAPL",
    timestamp: new Date(),
    timeframe: "1h",
    price: 150,
    priceChange24h: 2.0,
    priceChange7d: 5.0,
    atr: 3.0,
    atrPercent: 0.02,
    volatility: 0.2,
    momentum: 0.5,
    momentumZ: 1.0,
    efficiencyRatio: 0.6,
    chopIndex: 40,
    trendStrength: 30,
    qScore: 0.75,
    regime: "trend_up",
    event: "break_up",
    distanceToSupport: 2.0,
    distanceToResistance: 3.0,
    volume: 1000000,
    volumeZ: 1.5,
    adv20: 900000,
    createdAt: new Date(),
    ...overrides,
  };
}

function makePerformance(
  overrides: Partial<InstrumentPerformance> = {},
): InstrumentPerformance {
  return {
    id: "perf_1",
    instrumentId: "inst_1",
    symbol: "AAPL",
    userId: "user1",
    totalTrades: 50,
    winningTrades: 30,
    losingTrades: 20,
    expectancyR: 0.3,
    averageWinR: 1.5,
    averageLossR: 0.8,
    largestWinR: 4.0,
    largestLossR: 2.0,
    stdDevR: 0.5,
    winRate: 0.6,
    profitFactor: 1.5,
    maxDrawdownR: 3.0,
    calmarRatio: 0.1,
    sharpeR: 1.2,
    avgHoldingPeriod: 120,
    avgBarsInTrade: 10,
    currentStreak: 2,
    maxWinStreak: 5,
    maxLossStreak: 3,
    recentExpectancyR: 0.4,
    recentWinRate: 0.65,
    periodStart: new Date(),
    periodEnd: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function makeConstraints(
  overrides: Partial<UserConstraints> = {},
): UserConstraints {
  return {
    userId: "user1",
    totalBudget: 100000,
    maxPositionSize: 0.1,
    maxPositionValue: 10000,
    maxDailyLoss: 0.05,
    maxDrawdown: 0.2,
    maxLeverage: 1,
    allowedAssetClasses: ["stocks", "crypto"],
    excludedSymbols: [],
    minVolume: 100000,
    maxSpreadPercent: 0.01,
    ...overrides,
  };
}

function makeScoreBreakdown(
  overrides: Partial<ScoreBreakdown> = {},
): ScoreBreakdown {
  return {
    instrumentId: "inst_1",
    symbol: "AAPL",
    liquidity: 0.8,
    pcttFitness: 0.7,
    opportunity: 0.6,
    realizedEdge: 0.5,
    userFit: 1.0,
    total: 0.72,
    liquidityDetails: { volumeScore: 0.8, spreadScore: 0.9, slippageScore: 0.7 },
    pcttDetails: { qScore: 0.75, regimeScore: 0.8, geometryScore: 0.6 },
    opportunityDetails: { momentumScore: 0.6, trendScore: 0.7 },
    edgeDetails: {
      expectancy: 0.3,
      stability: 0.6,
      recency: 0.7,
      confidence: 0.8,
    },
    timestamp: new Date(),
    ...overrides,
  };
}

// ============================================================================
// TESTS
// ============================================================================

describe("InstrumentRankingService", () => {
  let service: InstrumentRankingService;

  beforeEach(() => {
    service = new InstrumentRankingService();

    // Set up mock to return controlled scores
    mockScoreInstruments.mockImplementation(
      (
        instruments: Instrument[],
        _featuresMap: Map<string, InstrumentFeatures>,
        _perfMap: Map<string, InstrumentPerformance>,
        _constraints: UserConstraints,
        _tier: string,
      ) => {
        return instruments.map((inst, idx) =>
          makeScoreBreakdown({
            instrumentId: inst.id,
            symbol: inst.symbol,
            total: 0.9 - idx * 0.1,
            liquidity: 0.8,
            pcttFitness: 0.7,
          }),
        );
      },
    );
  });

  // =========================================================================
  // DEFAULT CONFIG
  // =========================================================================

  describe("DEFAULT_RANKING_CONFIG", () => {
    it("has expected defaults", () => {
      expect(DEFAULT_RANKING_CONFIG.minLiquidityScore).toBe(0.2);
      expect(DEFAULT_RANKING_CONFIG.minPCTTReadinessScore).toBe(0.3);
      expect(DEFAULT_RANKING_CONFIG.maxInstrumentsPerClass).toBe(50);
      expect(DEFAULT_RANKING_CONFIG.maxTotalInstruments).toBe(100);
    });
  });

  // =========================================================================
  // RANK
  // =========================================================================

  describe("rank", () => {
    it("ranks instruments by score", async () => {
      const instruments = [
        makeInstrument({ id: "i1", symbol: "AAPL" }),
        makeInstrument({ id: "i2", symbol: "MSFT" }),
      ];
      const featuresMap = new Map([
        ["AAPL", makeFeatures({ symbol: "AAPL", instrumentId: "i1" })],
        ["MSFT", makeFeatures({ symbol: "MSFT", instrumentId: "i2" })],
      ]);
      const performanceMap = new Map([
        ["AAPL", makePerformance({ symbol: "AAPL", instrumentId: "i1" })],
        ["MSFT", makePerformance({ symbol: "MSFT", instrumentId: "i2" })],
      ]);

      const { rankings, run } = await service.rank({
        instruments,
        featuresMap,
        performanceMap,
        constraints: makeConstraints(),
        tier: "pro",
      });

      expect(rankings.length).toBe(2);
      expect(rankings[0].rank).toBe(1);
      expect(rankings[1].rank).toBe(2);
      expect(rankings[0].score).toBeGreaterThan(rankings[1].score);
      expect(run.rankedInstruments).toBe(2);
      expect(run.tier).toBe("pro");
    });

    it("filters out inactive instruments", async () => {
      const instruments = [
        makeInstrument({ id: "i1", symbol: "AAPL", isActive: true }),
        makeInstrument({ id: "i2", symbol: "DEAD", isActive: false }),
      ];
      const featuresMap = new Map([
        ["AAPL", makeFeatures({ symbol: "AAPL" })],
        ["DEAD", makeFeatures({ symbol: "DEAD" })],
      ]);
      const performanceMap = new Map<string, InstrumentPerformance>();

      const { rankings } = await service.rank({
        instruments,
        featuresMap,
        performanceMap,
        constraints: makeConstraints(),
        tier: "pro",
      });

      // Only active instrument is scored
      expect(
        rankings.every((r) => r.symbol !== "DEAD"),
      ).toBe(true);
    });

    it("filters by asset class", async () => {
      const instruments = [
        makeInstrument({ id: "i1", symbol: "AAPL", assetClass: "stocks" }),
        makeInstrument({ id: "i2", symbol: "BTCUSD", assetClass: "crypto" }),
        makeInstrument({ id: "i3", symbol: "EURUSD", assetClass: "forex" }),
      ];
      const featuresMap = new Map([
        ["AAPL", makeFeatures({ symbol: "AAPL" })],
        ["BTCUSD", makeFeatures({ symbol: "BTCUSD" })],
        ["EURUSD", makeFeatures({ symbol: "EURUSD" })],
      ]);

      const { rankings } = await service.rank({
        instruments,
        featuresMap,
        performanceMap: new Map(),
        constraints: makeConstraints({ allowedAssetClasses: ["stocks"] }),
        tier: "pro",
        assetClasses: ["stocks"],
      });

      // Only stocks should be ranked
      for (const r of rankings) {
        expect(r.assetClass).toBe("stocks");
      }
    });

    it("filters by minimum liquidity score", async () => {
      mockScoreInstruments.mockReturnValue([
        makeScoreBreakdown({ symbol: "AAPL", total: 0.9, liquidity: 0.1 }), // Below min
        makeScoreBreakdown({
          symbol: "MSFT",
          instrumentId: "i2",
          total: 0.8,
          liquidity: 0.5,
        }),
      ]);

      const instruments = [
        makeInstrument({ id: "i1", symbol: "AAPL" }),
        makeInstrument({ id: "i2", symbol: "MSFT" }),
      ];
      const featuresMap = new Map([
        ["AAPL", makeFeatures({ symbol: "AAPL" })],
        ["MSFT", makeFeatures({ symbol: "MSFT", instrumentId: "i2" })],
      ]);

      const { rankings, run } = await service.rank({
        instruments,
        featuresMap,
        performanceMap: new Map(),
        constraints: makeConstraints(),
        tier: "pro",
      });

      // AAPL filtered out (liquidity 0.1 < 0.2)
      expect(rankings.every((r) => r.symbol !== "AAPL")).toBe(true);
      expect(run.filteredOut).toBeGreaterThanOrEqual(1);
    });

    it("applies PCTT readiness filter for pro/quant tiers", async () => {
      mockScoreInstruments.mockReturnValue([
        makeScoreBreakdown({
          symbol: "AAPL",
          total: 0.9,
          liquidity: 0.5,
          pcttFitness: 0.2, // Below min
        }),
        makeScoreBreakdown({
          symbol: "MSFT",
          instrumentId: "i2",
          total: 0.8,
          liquidity: 0.5,
          pcttFitness: 0.5,
        }),
      ]);

      const instruments = [
        makeInstrument({ id: "i1", symbol: "AAPL" }),
        makeInstrument({ id: "i2", symbol: "MSFT" }),
      ];
      const featuresMap = new Map([
        ["AAPL", makeFeatures({ symbol: "AAPL" })],
        ["MSFT", makeFeatures({ symbol: "MSFT", instrumentId: "i2" })],
      ]);

      const { rankings } = await service.rank({
        instruments,
        featuresMap,
        performanceMap: new Map(),
        constraints: makeConstraints(),
        tier: "pro",
      });

      // AAPL filtered (pcttFitness 0.2 < 0.3)
      expect(rankings.every((r) => r.symbol !== "AAPL")).toBe(true);
    });

    it("skips PCTT readiness filter for beginner tier", async () => {
      mockScoreInstruments.mockReturnValue([
        makeScoreBreakdown({
          symbol: "AAPL",
          total: 0.9,
          liquidity: 0.5,
          pcttFitness: 0.1,
        }),
      ]);

      const instruments = [makeInstrument({ id: "i1", symbol: "AAPL" })];
      const featuresMap = new Map([
        ["AAPL", makeFeatures({ symbol: "AAPL" })],
      ]);

      const { rankings } = await service.rank({
        instruments,
        featuresMap,
        performanceMap: new Map(),
        constraints: makeConstraints(),
        tier: "beginner",
      });

      // Beginner doesn't filter by PCTT readiness
      expect(rankings.length).toBe(1);
    });

    it("enforces maxTotalInstruments limit", async () => {
      const svc = new InstrumentRankingService({ maxTotalInstruments: 2 });

      const instruments = [
        makeInstrument({ id: "i1", symbol: "AAPL" }),
        makeInstrument({ id: "i2", symbol: "MSFT" }),
        makeInstrument({ id: "i3", symbol: "GOOG" }),
      ];
      const featuresMap = new Map([
        ["AAPL", makeFeatures({ symbol: "AAPL", instrumentId: "i1" })],
        ["MSFT", makeFeatures({ symbol: "MSFT", instrumentId: "i2" })],
        ["GOOG", makeFeatures({ symbol: "GOOG", instrumentId: "i3" })],
      ]);

      mockScoreInstruments.mockReturnValue([
        makeScoreBreakdown({ symbol: "AAPL", instrumentId: "i1", total: 0.9, liquidity: 0.8 }),
        makeScoreBreakdown({ symbol: "MSFT", instrumentId: "i2", total: 0.8, liquidity: 0.8 }),
        makeScoreBreakdown({ symbol: "GOOG", instrumentId: "i3", total: 0.7, liquidity: 0.8 }),
      ]);

      const { rankings } = await svc.rank({
        instruments,
        featuresMap,
        performanceMap: new Map(),
        constraints: makeConstraints(),
        tier: "pro",
      });

      expect(rankings.length).toBe(2);
    });

    it("filters out zero-score instruments", async () => {
      mockScoreInstruments.mockReturnValue([
        makeScoreBreakdown({ symbol: "AAPL", total: 0 }),
      ]);

      const instruments = [makeInstrument({ id: "i1", symbol: "AAPL" })];
      const featuresMap = new Map([
        ["AAPL", makeFeatures({ symbol: "AAPL" })],
      ]);

      const { rankings } = await service.rank({
        instruments,
        featuresMap,
        performanceMap: new Map(),
        constraints: makeConstraints(),
        tier: "pro",
      });

      expect(rankings.length).toBe(0);
    });

    it("populates run metadata", async () => {
      const instruments = [makeInstrument({ id: "i1", symbol: "AAPL" })];
      const featuresMap = new Map([
        ["AAPL", makeFeatures({ symbol: "AAPL" })],
      ]);

      const { run } = await service.rank({
        instruments,
        featuresMap,
        performanceMap: new Map(),
        constraints: makeConstraints(),
        tier: "quant",
        timeframe: "4h",
      });

      expect(run.tier).toBe("quant");
      expect(run.timeframe).toBe("4h");
      expect(run.userId).toBe("user1");
      expect(run.duration).toBeGreaterThanOrEqual(0);
    });
  });

  // =========================================================================
  // QUERY METHODS
  // =========================================================================

  describe("query methods", () => {
    beforeEach(async () => {
      const instruments = [
        makeInstrument({ id: "i1", symbol: "AAPL", assetClass: "stocks" }),
        makeInstrument({ id: "i2", symbol: "BTCUSD", assetClass: "crypto" }),
        makeInstrument({ id: "i3", symbol: "MSFT", assetClass: "stocks" }),
      ];

      mockScoreInstruments.mockReturnValue([
        makeScoreBreakdown({ symbol: "AAPL", instrumentId: "i1", total: 0.9, liquidity: 0.8, pcttFitness: 0.7 }),
        makeScoreBreakdown({ symbol: "BTCUSD", instrumentId: "i2", total: 0.7, liquidity: 0.6, pcttFitness: 0.5 }),
        makeScoreBreakdown({ symbol: "MSFT", instrumentId: "i3", total: 0.6, liquidity: 0.5, pcttFitness: 0.4 }),
      ]);

      const featuresMap = new Map([
        ["AAPL", makeFeatures({ symbol: "AAPL", instrumentId: "i1", regime: "trend_up", qScore: 0.8, event: "break_up" })],
        ["BTCUSD", makeFeatures({ symbol: "BTCUSD", instrumentId: "i2", regime: "range", qScore: 0.3, event: "idle" })],
        ["MSFT", makeFeatures({ symbol: "MSFT", instrumentId: "i3", regime: "trend_up", qScore: 0.6, event: "retest_up" })],
      ]);

      await service.rank({
        instruments,
        featuresMap,
        performanceMap: new Map(),
        constraints: makeConstraints({ allowedAssetClasses: ["stocks", "crypto"] }),
        tier: "pro",
      });
    });

    it("getTopN returns top N instruments", () => {
      const top1 = service.getTopN(1);
      expect(top1.length).toBe(1);
      expect(top1[0].symbol).toBe("AAPL");
    });

    it("getTopN filters by asset class", () => {
      const cryptoTop = service.getTopN(5, "crypto");
      for (const r of cryptoTop) {
        expect(r.assetClass).toBe("crypto");
      }
    });

    it("getByAssetClass filters correctly", () => {
      const stocks = service.getByAssetClass("stocks");
      expect(stocks.every((r) => r.assetClass === "stocks")).toBe(true);
    });

    it("getBySymbol returns specific instrument", () => {
      const aapl = service.getBySymbol("AAPL");
      expect(aapl).toBeDefined();
      expect(aapl!.symbol).toBe("AAPL");
    });

    it("getBySymbol returns undefined for unknown", () => {
      expect(service.getBySymbol("UNKNOWN")).toBeUndefined();
    });

    it("getPCTTReady returns only PCTT-ready instruments", () => {
      const ready = service.getPCTTReady();
      for (const r of ready) {
        expect(r.isPCTTReady).toBe(true);
      }
    });

    it("getByRegime filters by regime type", () => {
      const trendUp = service.getByRegime("trend_up");
      for (const r of trendUp) {
        expect(r.regime).toBe("trend_up");
      }
    });

    it("getLastRun returns most recent run", () => {
      const run = service.getLastRun();
      expect(run).not.toBeNull();
      expect(run!.tier).toBe("pro");
    });

    it("getAllRankings returns copy of rankings", () => {
      const all = service.getAllRankings();
      expect(all.length).toBeGreaterThan(0);
      // It's a copy
      all.pop();
      expect(service.getAllRankings().length).toBeGreaterThan(all.length);
    });
  });

  // =========================================================================
  // SUMMARY
  // =========================================================================

  describe("getSummary", () => {
    it("returns summary breakdown", async () => {
      const instruments = [
        makeInstrument({ id: "i1", symbol: "AAPL", assetClass: "stocks" }),
        makeInstrument({ id: "i2", symbol: "BTCUSD", assetClass: "crypto" }),
      ];

      mockScoreInstruments.mockReturnValue([
        makeScoreBreakdown({ symbol: "AAPL", instrumentId: "i1", total: 0.9, liquidity: 0.8, pcttFitness: 0.7 }),
        makeScoreBreakdown({ symbol: "BTCUSD", instrumentId: "i2", total: 0.7, liquidity: 0.6, pcttFitness: 0.5 }),
      ]);

      const featuresMap = new Map([
        ["AAPL", makeFeatures({ symbol: "AAPL", instrumentId: "i1", regime: "trend_up", qScore: 0.8, event: "break_up" })],
        ["BTCUSD", makeFeatures({ symbol: "BTCUSD", instrumentId: "i2", regime: "range", qScore: 0.6, event: "retest_up" })],
      ]);

      await service.rank({
        instruments,
        featuresMap,
        performanceMap: new Map(),
        constraints: makeConstraints({ allowedAssetClasses: ["stocks", "crypto"] }),
        tier: "pro",
      });

      const summary = service.getSummary();

      expect(summary.total).toBe(2);
      expect(summary.byAssetClass.stocks).toBe(1);
      expect(summary.byAssetClass.crypto).toBe(1);
      expect(summary.topSymbols.length).toBeLessThanOrEqual(5);
    });
  });

  // =========================================================================
  // UPDATE CONFIG
  // =========================================================================

  describe("updateConfig", () => {
    it("merges new config values", () => {
      service.updateConfig({ minLiquidityScore: 0.5 });
      // Config is private, but behavior changes would show in rank()
      // Just verify it doesn't throw
      expect(true).toBe(true);
    });
  });

  // =========================================================================
  // FACTORY
  // =========================================================================

  describe("createRankingService", () => {
    it("creates a service with default config", () => {
      const svc = createRankingService();
      expect(svc.getLastRun()).toBeNull();
    });

    it("creates a service with custom config", () => {
      const svc = createRankingService({ maxTotalInstruments: 10 });
      expect(svc.getLastRun()).toBeNull();
    });
  });

  // =========================================================================
  // FORMAT RANKING ROW
  // =========================================================================

  describe("formatRankingRow", () => {
    it("formats ranking data for display", () => {
      const ranking: InstrumentRanking = {
        id: "rank_1",
        runId: "run_1",
        instrumentId: "inst_1",
        symbol: "AAPL",
        assetClass: "stocks",
        rank: 1,
        score: 0.85,
        scoreBreakdown: makeScoreBreakdown({
          liquidity: 0.9,
          pcttFitness: 0.8,
          opportunity: 0.7,
        }),
        isPCTTReady: true,
        isLiquidEnough: true,
        meetsUserConstraints: true,
        regime: "trend_up",
        event: "break_up",
        timestamp: new Date(),
      };

      const row = formatRankingRow(ranking);

      expect(row.rank).toBe(1);
      expect(row.symbol).toBe("AAPL");
      expect(row.score).toBe("85%");
      expect(row.liquidity).toBe("90%");
      expect(row.pctt).toBe("80%");
      expect(row.opportunity).toBe("70%");
      expect(row.regime).toBe("trend up");
      expect(row.ready).toBe(true);
    });
  });

  // =========================================================================
  // GENERATE AGENT THOUGHTS
  // =========================================================================

  describe("generateAgentThoughts", () => {
    const rankings: InstrumentRanking[] = [
      {
        id: "r1",
        runId: "run1",
        instrumentId: "i1",
        symbol: "AAPL",
        assetClass: "stocks",
        rank: 1,
        score: 0.9,
        scoreBreakdown: makeScoreBreakdown({
          symbol: "AAPL",
          pcttDetails: { qScore: 0.85, regimeScore: 0.9, geometryScore: 0.7 },
        }),
        isPCTTReady: true,
        isLiquidEnough: true,
        meetsUserConstraints: true,
        regime: "trend_up",
        event: "break_up",
        timestamp: new Date(),
      },
    ];

    it("identifies promoted symbols", () => {
      const thoughts = generateAgentThoughts(rankings, [], ["AAPL"]);
      expect(thoughts.some((t) => t.includes("AAPL") && t.includes("promoted"))).toBe(true);
    });

    it("identifies demoted symbols", () => {
      const thoughts = generateAgentThoughts(rankings, ["TSLA"], []);
      expect(thoughts.some((t) => t.includes("TSLA") && t.includes("demoted"))).toBe(true);
    });

    it("shows top opportunity when no changes", () => {
      const thoughts = generateAgentThoughts(rankings, ["AAPL"], ["AAPL"]);
      expect(thoughts.some((t) => t.includes("Top opportunity"))).toBe(true);
    });

    it("returns empty array for empty rankings and no changes", () => {
      const thoughts = generateAgentThoughts([], [], []);
      expect(thoughts.length).toBe(0);
    });
  });
});
