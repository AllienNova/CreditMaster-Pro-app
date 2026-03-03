/**
 * Tests for Instrument Scoring Service
 *
 * Pure-logic tests -- no mocks needed. All scoring functions are deterministic.
 */

import type {
  Instrument,
  InstrumentFeatures,
  InstrumentPerformance,
  UserConstraints,
  UserTier,
} from "../types";
import { TIER_WEIGHTS } from "../types";
import {
  scoreLiquidity,
  scorePCTTFitness,
  scoreOpportunity,
  scoreRealizedEdge,
  scoreUserFit,
  scoreInstrument,
  scoreInstruments,
  explainScore,
  DEFAULT_SCORING_CONFIG,
} from "../instrument-scoring";

// ============================================================================
// TEST FIXTURES
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
    priceChange24h: 0.02,
    priceChange7d: 0.05,
    atr: 2.5,
    atrPercent: 0.017,
    volatility: 0.25,
    momentum: 0.6,
    momentumZ: 1.5,
    efficiencyRatio: 0.7,
    chopIndex: 40,
    trendStrength: 30,
    qScore: 0.75,
    regime: "trend_up",
    event: "entry_long",
    distanceToSupport: 2.0,
    distanceToResistance: 1.5,
    volume: 5_000_000,
    volumeZ: 1.0,
    adv20: 3_000_000,
    spreadEstimate: 0.0005,
    spreadAtr: 0.05,
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
    userId: "user_1",
    totalTrades: 50,
    winningTrades: 30,
    losingTrades: 20,
    expectancyR: 0.45,
    averageWinR: 1.5,
    averageLossR: 0.8,
    largestWinR: 5.0,
    largestLossR: 2.0,
    stdDevR: 0.6,
    winRate: 0.6,
    profitFactor: 1.8,
    maxDrawdownR: 3.0,
    calmarRatio: 0.15,
    sharpeR: 0.75,
    avgHoldingPeriod: 240,
    avgBarsInTrade: 8,
    currentStreak: 2,
    maxWinStreak: 6,
    maxLossStreak: 4,
    recentExpectancyR: 0.5,
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
    userId: "user_1",
    totalBudget: 100_000,
    maxPositionSize: 5,
    maxPositionValue: 10_000,
    maxDailyLoss: 2,
    maxDrawdown: 10,
    maxLeverage: 2,
    allowedAssetClasses: ["stocks", "crypto", "forex", "futures", "options"],
    excludedSymbols: [],
    minVolume: 100_000,
    maxSpreadPercent: 0.01,
    ...overrides,
  };
}

// ============================================================================
// scoreLiquidity
// ============================================================================

describe("scoreLiquidity", () => {
  it("returns a score between 0 and 1", () => {
    const result = scoreLiquidity(
      makeFeatures(),
      makeInstrument(),
      DEFAULT_SCORING_CONFIG,
    );
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(1);
  });

  it("returns higher score for higher volume", () => {
    const lowVolume = scoreLiquidity(
      makeFeatures({ adv20: 10_000 }),
      makeInstrument(),
    );
    const highVolume = scoreLiquidity(
      makeFeatures({ adv20: 5_000_000 }),
      makeInstrument(),
    );
    expect(highVolume.score).toBeGreaterThan(lowVolume.score);
  });

  it("returns higher score for tighter spread", () => {
    const wideSpread = scoreLiquidity(
      makeFeatures({ spreadEstimate: 0.005 }),
      makeInstrument(),
    );
    const tightSpread = scoreLiquidity(
      makeFeatures({ spreadEstimate: 0.0001 }),
      makeInstrument(),
    );
    expect(tightSpread.score).toBeGreaterThan(wideSpread.score);
  });

  it("includes volume, spread, and slippage details", () => {
    const result = scoreLiquidity(makeFeatures(), makeInstrument());
    expect(result.details).toHaveProperty("volumeScore");
    expect(result.details).toHaveProperty("spreadScore");
    expect(result.details).toHaveProperty("slippageScore");
    expect(result.details.volumeScore).toBeGreaterThanOrEqual(0);
    expect(result.details.spreadScore).toBeGreaterThanOrEqual(0);
    expect(result.details.slippageScore).toBeGreaterThanOrEqual(0);
  });

  it("applies crypto asset multiplier when volume is low", () => {
    const cryptoLow = scoreLiquidity(
      makeFeatures({ adv20: 50_000 }),
      makeInstrument({ assetClass: "crypto" }),
    );
    const stocksLow = scoreLiquidity(
      makeFeatures({ adv20: 50_000 }),
      makeInstrument({ assetClass: "stocks" }),
    );
    // Crypto gets 0.8 multiplier when volume score <= 0.7
    expect(cryptoLow.score).toBeLessThanOrEqual(stocksLow.score);
  });

  it("applies options asset multiplier when volume is low", () => {
    const optionsLow = scoreLiquidity(
      makeFeatures({ adv20: 10_000 }),
      makeInstrument({ assetClass: "options" }),
    );
    const stocksLow = scoreLiquidity(
      makeFeatures({ adv20: 10_000 }),
      makeInstrument({ assetClass: "stocks" }),
    );
    expect(optionsLow.score).toBeLessThanOrEqual(stocksLow.score);
  });

  it("does not penalize crypto with high volume", () => {
    const cryptoHigh = scoreLiquidity(
      makeFeatures({ adv20: 5_000_000 }),
      makeInstrument({ assetClass: "crypto" }),
    );
    const stocksHigh = scoreLiquidity(
      makeFeatures({ adv20: 5_000_000 }),
      makeInstrument({ assetClass: "stocks" }),
    );
    // With high volume, crypto multiplier is 1.0, same as stocks
    expect(Math.abs(cryptoHigh.score - stocksHigh.score)).toBeLessThan(0.01);
  });

  it("handles zero volume", () => {
    const result = scoreLiquidity(
      makeFeatures({ adv20: 0 }),
      makeInstrument(),
    );
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(1);
  });
});

// ============================================================================
// scorePCTTFitness
// ============================================================================

describe("scorePCTTFitness", () => {
  it("returns a score between 0 and 1", () => {
    const result = scorePCTTFitness(makeFeatures());
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(1);
  });

  it("returns higher score for higher Q-score", () => {
    const lowQ = scorePCTTFitness(makeFeatures({ qScore: 0.2 }));
    const highQ = scorePCTTFitness(makeFeatures({ qScore: 0.9 }));
    expect(highQ.score).toBeGreaterThan(lowQ.score);
  });

  it("returns higher score for trending regime than transition", () => {
    const trending = scorePCTTFitness(makeFeatures({ regime: "trend_up" }));
    const transition = scorePCTTFitness(
      makeFeatures({ regime: "transition" }),
    );
    expect(trending.score).toBeGreaterThan(transition.score);
  });

  it("gives trend_down same regime score as trend_up", () => {
    const up = scorePCTTFitness(
      makeFeatures({ regime: "trend_up", qScore: 0.8, efficiencyRatio: 0.7 }),
    );
    const down = scorePCTTFitness(
      makeFeatures({
        regime: "trend_down",
        qScore: 0.8,
        efficiencyRatio: 0.7,
      }),
    );
    // Same inputs except regime direction => same score (both map to 0.9)
    expect(Math.abs(up.score - down.score)).toBeLessThan(0.01);
  });

  it("penalizes high chop index", () => {
    const lowChop = scorePCTTFitness(
      makeFeatures({ chopIndex: 30, efficiencyRatio: 0.7 }),
    );
    const highChop = scorePCTTFitness(
      makeFeatures({ chopIndex: 80, efficiencyRatio: 0.7 }),
    );
    expect(lowChop.score).toBeGreaterThan(highChop.score);
  });

  it("gives entry event bonus", () => {
    const entry = scorePCTTFitness(makeFeatures({ event: "entry_long" }));
    const idle = scorePCTTFitness(makeFeatures({ event: "idle" }));
    expect(entry.score).toBeGreaterThan(idle.score);
  });

  it("gives retest event bonus", () => {
    const retest = scorePCTTFitness(makeFeatures({ event: "retest_up" }));
    const idle = scorePCTTFitness(makeFeatures({ event: "idle" }));
    expect(retest.score).toBeGreaterThan(idle.score);
  });

  it("gives freeze event bonus", () => {
    const freeze = scorePCTTFitness(makeFeatures({ event: "freeze_up" }));
    const idle = scorePCTTFitness(makeFeatures({ event: "idle" }));
    expect(freeze.score).toBeGreaterThan(idle.score);
  });

  it("includes qScore, regimeScore, geometryScore details", () => {
    const result = scorePCTTFitness(makeFeatures());
    expect(result.details.qScore).toBeDefined();
    expect(result.details.regimeScore).toBeDefined();
    expect(result.details.geometryScore).toBeDefined();
  });
});

// ============================================================================
// scoreOpportunity
// ============================================================================

describe("scoreOpportunity", () => {
  it("returns a score between 0 and 1", () => {
    const result = scoreOpportunity(makeFeatures());
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(1);
  });

  it("returns higher score for positive momentum", () => {
    const negative = scoreOpportunity(makeFeatures({ momentumZ: -2 }));
    const positive = scoreOpportunity(makeFeatures({ momentumZ: 2 }));
    expect(positive.score).toBeGreaterThan(negative.score);
  });

  it("returns higher score for stronger trend", () => {
    const weak = scoreOpportunity(makeFeatures({ trendStrength: 10 }));
    const strong = scoreOpportunity(makeFeatures({ trendStrength: 35 }));
    expect(strong.score).toBeGreaterThan(weak.score);
  });

  it("clips extreme momentum values", () => {
    const extreme = scoreOpportunity(makeFeatures({ momentumZ: 100 }));
    const clipped = scoreOpportunity(
      makeFeatures({ momentumZ: DEFAULT_SCORING_CONFIG.momentumClipZ }),
    );
    // Both should give the same score since extreme is clipped to momentumClipZ
    expect(Math.abs(extreme.score - clipped.score)).toBeLessThan(0.01);
  });

  it("adds volume confirmation bonus", () => {
    const noVol = scoreOpportunity(makeFeatures({ volumeZ: 0 }));
    const highVol = scoreOpportunity(makeFeatures({ volumeZ: 2 }));
    expect(highVol.score).toBeGreaterThanOrEqual(noVol.score);
  });

  it("includes momentumScore and trendScore details", () => {
    const result = scoreOpportunity(makeFeatures());
    expect(result.details.momentumScore).toBeDefined();
    expect(result.details.trendScore).toBeDefined();
  });
});

// ============================================================================
// scoreRealizedEdge
// ============================================================================

describe("scoreRealizedEdge", () => {
  it("returns cold start score for null performance", () => {
    const result = scoreRealizedEdge(null);
    expect(result.score).toBe(DEFAULT_SCORING_CONFIG.coldStartScore);
    expect(result.details.confidence).toBe(0);
  });

  it("returns cold start score for fewer than 5 trades", () => {
    const result = scoreRealizedEdge(makePerformance({ totalTrades: 3 }));
    expect(result.score).toBe(DEFAULT_SCORING_CONFIG.coldStartScore);
  });

  it("returns a score between 0 and 1 for valid performance", () => {
    const result = scoreRealizedEdge(makePerformance());
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(1);
  });

  it("returns higher score for higher expectancy", () => {
    const lowExp = scoreRealizedEdge(
      makePerformance({ expectancyR: 0.1, recentExpectancyR: 0.1 }),
    );
    const highExp = scoreRealizedEdge(
      makePerformance({ expectancyR: 1.0, recentExpectancyR: 1.0 }),
    );
    expect(highExp.score).toBeGreaterThan(lowExp.score);
  });

  it("penalizes large drawdowns", () => {
    const lowDD = scoreRealizedEdge(makePerformance({ maxDrawdownR: 1 }));
    const highDD = scoreRealizedEdge(makePerformance({ maxDrawdownR: 4 }));
    expect(lowDD.score).toBeGreaterThan(highDD.score);
  });

  it("boosts winning streaks", () => {
    const noStreak = scoreRealizedEdge(makePerformance({ currentStreak: 0 }));
    const winStreak = scoreRealizedEdge(
      makePerformance({ currentStreak: 5 }),
    );
    expect(winStreak.score).toBeGreaterThanOrEqual(noStreak.score);
  });

  it("penalizes losing streaks", () => {
    const noStreak = scoreRealizedEdge(makePerformance({ currentStreak: 0 }));
    const lossStreak = scoreRealizedEdge(
      makePerformance({ currentStreak: -5 }),
    );
    expect(lossStreak.score).toBeLessThanOrEqual(noStreak.score);
  });

  it("includes expectancy, stability, recency, confidence details", () => {
    const result = scoreRealizedEdge(makePerformance());
    expect(result.details.expectancy).toBeDefined();
    expect(result.details.stability).toBeDefined();
    expect(result.details.recency).toBeDefined();
    expect(result.details.confidence).toBeDefined();
  });

  it("increases confidence with more trades", () => {
    const few = scoreRealizedEdge(makePerformance({ totalTrades: 10 }));
    const many = scoreRealizedEdge(makePerformance({ totalTrades: 100 }));
    expect(many.details.confidence).toBeGreaterThan(few.details.confidence);
  });
});

// ============================================================================
// scoreUserFit
// ============================================================================

describe("scoreUserFit", () => {
  it("returns 0 for excluded asset class", () => {
    const result = scoreUserFit(
      makeInstrument({ assetClass: "crypto" }),
      makeFeatures(),
      makeConstraints({ allowedAssetClasses: ["stocks"] }),
    );
    expect(result.score).toBe(0);
  });

  it("returns 0 for excluded symbol", () => {
    const result = scoreUserFit(
      makeInstrument({ symbol: "AAPL" }),
      makeFeatures(),
      makeConstraints({ excludedSymbols: ["AAPL"] }),
    );
    expect(result.score).toBe(0);
  });

  it("returns 0 for excluded sector", () => {
    const result = scoreUserFit(
      makeInstrument({ sector: "Technology" }),
      makeFeatures(),
      makeConstraints({ excludedSectors: ["Technology"] }),
    );
    expect(result.score).toBe(0);
  });

  it("returns 0 when minNotional exceeds maxPositionValue", () => {
    const result = scoreUserFit(
      makeInstrument({ minNotional: 50_000 }),
      makeFeatures(),
      makeConstraints({ maxPositionValue: 10_000 }),
    );
    expect(result.score).toBe(0);
  });

  it("returns positive score for allowed instrument", () => {
    const result = scoreUserFit(
      makeInstrument(),
      makeFeatures(),
      makeConstraints(),
    );
    expect(result.score).toBeGreaterThan(0);
    expect(result.score).toBeLessThanOrEqual(1);
  });

  it("penalizes low volume", () => {
    const highVol = scoreUserFit(
      makeInstrument(),
      makeFeatures({ adv20: 5_000_000 }),
      makeConstraints({ minVolume: 100_000 }),
    );
    const lowVol = scoreUserFit(
      makeInstrument(),
      makeFeatures({ adv20: 50_000 }),
      makeConstraints({ minVolume: 100_000 }),
    );
    expect(highVol.score).toBeGreaterThan(lowVol.score);
  });

  it("penalizes wide spread", () => {
    const tightSpread = scoreUserFit(
      makeInstrument(),
      makeFeatures({ spreadEstimate: 0.001 }),
      makeConstraints({ maxSpreadPercent: 0.005 }),
    );
    const wideSpread = scoreUserFit(
      makeInstrument(),
      makeFeatures({ spreadEstimate: 0.01 }),
      makeConstraints({ maxSpreadPercent: 0.005 }),
    );
    expect(tightSpread.score).toBeGreaterThan(wideSpread.score);
  });

  it("penalizes excessive leverage", () => {
    const lowLev = scoreUserFit(
      makeInstrument({ maxLeverage: 1 }),
      makeFeatures(),
      makeConstraints({ maxLeverage: 2 }),
    );
    const highLev = scoreUserFit(
      makeInstrument({ maxLeverage: 10 }),
      makeFeatures(),
      makeConstraints({ maxLeverage: 2 }),
    );
    expect(lowLev.score).toBeGreaterThan(highLev.score);
  });
});

// ============================================================================
// scoreInstrument
// ============================================================================

describe("scoreInstrument", () => {
  it("returns a full ScoreBreakdown", () => {
    const result = scoreInstrument(
      makeInstrument(),
      makeFeatures(),
      makePerformance(),
      makeConstraints(),
      "pro",
    );
    expect(result.instrumentId).toBe("inst_1");
    expect(result.symbol).toBe("AAPL");
    expect(result.liquidity).toBeGreaterThanOrEqual(0);
    expect(result.pcttFitness).toBeGreaterThanOrEqual(0);
    expect(result.opportunity).toBeGreaterThanOrEqual(0);
    expect(result.realizedEdge).toBeGreaterThanOrEqual(0);
    expect(result.userFit).toBeGreaterThanOrEqual(0);
    expect(result.total).toBeGreaterThanOrEqual(0);
    expect(result.total).toBeLessThanOrEqual(1);
  });

  it("returns total=0 when userFit=0", () => {
    const result = scoreInstrument(
      makeInstrument({ assetClass: "crypto" }),
      makeFeatures(),
      makePerformance(),
      makeConstraints({ allowedAssetClasses: ["stocks"] }),
      "pro",
    );
    expect(result.total).toBe(0);
    expect(result.userFit).toBe(0);
  });

  it("uses tier-specific weights", () => {
    const beginner = scoreInstrument(
      makeInstrument(),
      makeFeatures(),
      makePerformance(),
      makeConstraints(),
      "beginner",
    );
    const quant = scoreInstrument(
      makeInstrument(),
      makeFeatures(),
      makePerformance(),
      makeConstraints(),
      "quant",
    );
    // Different tiers produce different totals
    expect(beginner.total).not.toBe(quant.total);
  });

  it("uses cold start for null performance", () => {
    const result = scoreInstrument(
      makeInstrument(),
      makeFeatures(),
      null,
      makeConstraints(),
      "pro",
    );
    expect(result.realizedEdge).toBe(DEFAULT_SCORING_CONFIG.coldStartScore);
  });

  it("includes all detail sub-objects", () => {
    const result = scoreInstrument(
      makeInstrument(),
      makeFeatures(),
      makePerformance(),
      makeConstraints(),
      "pro",
    );
    expect(result.liquidityDetails).toBeDefined();
    expect(result.pcttDetails).toBeDefined();
    expect(result.opportunityDetails).toBeDefined();
    expect(result.edgeDetails).toBeDefined();
    expect(result.timestamp).toBeInstanceOf(Date);
  });
});

// ============================================================================
// scoreInstruments (batch)
// ============================================================================

describe("scoreInstruments", () => {
  it("returns sorted scores descending by total", () => {
    const instruments = [
      makeInstrument({ id: "i1", symbol: "LOW" }),
      makeInstrument({ id: "i2", symbol: "HIGH" }),
    ];
    const featuresMap = new Map([
      ["LOW", makeFeatures({ symbol: "LOW", qScore: 0.2, momentumZ: -1 })],
      ["HIGH", makeFeatures({ symbol: "HIGH", qScore: 0.9, momentumZ: 2 })],
    ]);
    const perfMap = new Map<string, InstrumentPerformance>();

    const result = scoreInstruments(
      instruments,
      featuresMap,
      perfMap,
      makeConstraints(),
      "pro",
    );

    expect(result.length).toBe(2);
    expect(result[0].total).toBeGreaterThanOrEqual(result[1].total);
  });

  it("skips instruments without features", () => {
    const instruments = [
      makeInstrument({ id: "i1", symbol: "AAPL" }),
      makeInstrument({ id: "i2", symbol: "MSFT" }),
    ];
    const featuresMap = new Map([
      ["AAPL", makeFeatures({ symbol: "AAPL" })],
      // MSFT has no features
    ]);

    const result = scoreInstruments(
      instruments,
      featuresMap,
      new Map(),
      makeConstraints(),
      "pro",
    );

    expect(result.length).toBe(1);
    expect(result[0].symbol).toBe("AAPL");
  });

  it("returns empty array for empty instruments", () => {
    const result = scoreInstruments(
      [],
      new Map(),
      new Map(),
      makeConstraints(),
      "pro",
    );
    expect(result).toEqual([]);
  });

  it("uses performance data when available", () => {
    const instruments = [makeInstrument()];
    const featuresMap = new Map([["AAPL", makeFeatures()]]);
    const perfMap = new Map([["AAPL", makePerformance()]]);

    const withPerf = scoreInstruments(
      instruments,
      featuresMap,
      perfMap,
      makeConstraints(),
      "quant",
    );

    const noPerf = scoreInstruments(
      instruments,
      featuresMap,
      new Map(),
      makeConstraints(),
      "quant",
    );

    // Quant tier weighs realized edge heavily (0.3)
    // Different edge scores should produce different totals
    expect(withPerf[0].total).not.toEqual(noPerf[0].total);
  });
});

// ============================================================================
// explainScore
// ============================================================================

describe("explainScore", () => {
  it("returns a non-empty string", () => {
    const score = scoreInstrument(
      makeInstrument(),
      makeFeatures(),
      makePerformance(),
      makeConstraints(),
      "pro",
    );
    const explanation = explainScore(score, "pro");
    expect(explanation.length).toBeGreaterThan(0);
  });

  it("includes the symbol name", () => {
    const score = scoreInstrument(
      makeInstrument({ symbol: "TSLA" }),
      makeFeatures({ symbol: "TSLA" }),
      makePerformance(),
      makeConstraints(),
      "pro",
    );
    const explanation = explainScore(score, "pro");
    expect(explanation).toContain("TSLA");
  });

  it("includes score percentage", () => {
    const score = scoreInstrument(
      makeInstrument(),
      makeFeatures(),
      makePerformance(),
      makeConstraints(),
      "pro",
    );
    const explanation = explainScore(score, "pro");
    expect(explanation).toMatch(/\d+%/);
  });

  it("mentions top factor", () => {
    const score = scoreInstrument(
      makeInstrument(),
      makeFeatures(),
      makePerformance(),
      makeConstraints(),
      "pro",
    );
    const explanation = explainScore(score, "pro");
    expect(explanation).toContain("Top factor:");
  });

  it("mentions strong Q-score when high", () => {
    const score = scoreInstrument(
      makeInstrument(),
      makeFeatures({ qScore: 0.85 }),
      makePerformance(),
      makeConstraints(),
      "pro",
    );
    const explanation = explainScore(score, "pro");
    expect(explanation).toContain("Strong Q-score");
  });

  it("warns about low liquidity", () => {
    const score = scoreInstrument(
      makeInstrument(),
      makeFeatures({ adv20: 100, spreadEstimate: 0.01, spreadAtr: 0.5 }),
      makePerformance(),
      makeConstraints(),
      "pro",
    );
    if (score.liquidity < 0.4) {
      const explanation = explainScore(score, "pro");
      expect(explanation).toContain("Low liquidity");
    }
  });
});

// ============================================================================
// TIER_WEIGHTS validation
// ============================================================================

describe("TIER_WEIGHTS", () => {
  it("has weights for all tiers", () => {
    expect(TIER_WEIGHTS.beginner).toBeDefined();
    expect(TIER_WEIGHTS.pro).toBeDefined();
    expect(TIER_WEIGHTS.quant).toBeDefined();
  });

  it("weights sum to approximately 1.0 for each tier", () => {
    for (const tier of ["beginner", "pro", "quant"] as UserTier[]) {
      const w = TIER_WEIGHTS[tier];
      const sum =
        w.liquidity +
        w.pcttFitness +
        w.opportunity +
        w.realizedEdge +
        w.userFit;
      expect(sum).toBeCloseTo(1.0, 5);
    }
  });

  it("beginner weights liquidity highest", () => {
    const w = TIER_WEIGHTS.beginner;
    expect(w.liquidity).toBeGreaterThan(w.pcttFitness);
    expect(w.liquidity).toBeGreaterThan(w.opportunity);
    expect(w.liquidity).toBeGreaterThan(w.realizedEdge);
    expect(w.liquidity).toBeGreaterThan(w.userFit);
  });

  it("quant weights realizedEdge highest", () => {
    const w = TIER_WEIGHTS.quant;
    expect(w.realizedEdge).toBeGreaterThan(w.liquidity);
    expect(w.realizedEdge).toBeGreaterThan(w.opportunity);
    expect(w.realizedEdge).toBeGreaterThan(w.userFit);
  });
});
