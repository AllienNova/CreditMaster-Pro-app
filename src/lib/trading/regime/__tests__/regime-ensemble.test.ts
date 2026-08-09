/**
 * Regime Ensemble Tests
 *
 * Tests each of the 7 methods, weighted voting, and consensus strength.
 */

import { classifyRegimeEnsemble } from "../regime-ensemble";
import type { EnsembleConfig, EnsembleResult } from "../regime-ensemble";

// ============================================================================
// HELPERS
// ============================================================================

/** Generate a strongly trending price series */
function trendingPrices(bars: number, step: number = 1): number[] {
  return Array.from({ length: bars }, (_, i) => 100 + i * step);
}

/** Generate a ranging (oscillating) price series */
function rangingPrices(bars: number): number[] {
  return Array.from({ length: bars }, (_, i) => 100 + Math.sin(i * 0.5) * 2);
}

/** Generate volatile shock-like prices */
function shockPrices(bars: number): number[] {
  const prices: number[] = [100];
  for (let i = 1; i < bars; i++) {
    // Alternating large jumps
    const jump = i > bars * 0.7 ? (i % 2 === 0 ? 8 : -7) : 0.5;
    prices.push(prices[i - 1] + jump);
  }
  return prices;
}

/** Generate flat volumes */
function flatVolumes(bars: number, vol: number = 1_000_000): number[] {
  return Array.from({ length: bars }, () => vol);
}

/** Generate increasing volumes (volume expansion) */
function expandingVolumes(bars: number): number[] {
  return Array.from({ length: bars }, (_, i) =>
    i < bars * 0.5 ? 1_000_000 : 3_000_000,
  );
}

// Minimum bars for the default ensemble config
const MIN_BARS = 80;

// ============================================================================
// BASIC BEHAVIOR
// ============================================================================

describe("classifyRegimeEnsemble", () => {
  test("returns transition with low confidence for insufficient data", () => {
    const result = classifyRegimeEnsemble([100, 101, 102]);
    expect(result.regime).toBe("transition");
    expect(result.confidence).toBe(0);
    expect(result.votes).toHaveLength(0);
    expect(result.consensusStrength).toBe(0);
  });

  test("classifies a strong uptrend as trending", () => {
    const prices = trendingPrices(MIN_BARS, 2);
    const volumes = flatVolumes(MIN_BARS);
    const result = classifyRegimeEnsemble(prices, volumes);

    expect(result.regime).toBe("trending");
    expect(result.confidence).toBeGreaterThan(0);
    expect(result.consensusStrength).toBeGreaterThan(0.3);
  });

  test("classifies a ranging market as ranging or transition", () => {
    const prices = rangingPrices(MIN_BARS);
    const volumes = flatVolumes(MIN_BARS);
    const result = classifyRegimeEnsemble(prices, volumes);

    expect(["ranging", "transition"]).toContain(result.regime);
  });

  test("returns 7 votes for adequate data", () => {
    const prices = trendingPrices(MIN_BARS);
    const volumes = flatVolumes(MIN_BARS);
    const result = classifyRegimeEnsemble(prices, volumes);

    expect(result.votes).toHaveLength(7);
    const methods = result.votes.map((v) => v.method);
    expect(methods).toContain("ker");
    expect(methods).toContain("adx");
    expect(methods).toContain("bbWidth");
    expect(methods).toContain("atrRatio");
    expect(methods).toContain("volumeTrend");
    expect(methods).toContain("priceMA");
    expect(methods).toContain("kurtosis");
  });

  test("consensus strength is between 0 and 1", () => {
    const prices = trendingPrices(MIN_BARS);
    const volumes = flatVolumes(MIN_BARS);
    const result = classifyRegimeEnsemble(prices, volumes);

    expect(result.consensusStrength).toBeGreaterThanOrEqual(0);
    expect(result.consensusStrength).toBeLessThanOrEqual(1);
  });

  test("confidence is between 0 and 1", () => {
    const prices = trendingPrices(MIN_BARS);
    const volumes = flatVolumes(MIN_BARS);
    const result = classifyRegimeEnsemble(prices, volumes);

    expect(result.confidence).toBeGreaterThanOrEqual(0);
    expect(result.confidence).toBeLessThanOrEqual(1);
  });
});

// ============================================================================
// INDIVIDUAL METHODS
// ============================================================================

describe("ensemble method votes", () => {
  test("KER method votes trending for trending data", () => {
    const prices = trendingPrices(MIN_BARS, 2);
    const result = classifyRegimeEnsemble(prices);
    const kerVote = result.votes.find((v) => v.method === "ker");

    expect(kerVote).toBeDefined();
    expect(kerVote!.regime).toBe("trending");
    expect(kerVote!.confidence).toBeGreaterThan(0.5);
  });

  test("price-MA method votes trending when price is far from MA", () => {
    const prices = trendingPrices(MIN_BARS, 3);
    const result = classifyRegimeEnsemble(prices);
    const maVote = result.votes.find((v) => v.method === "priceMA");

    expect(maVote).toBeDefined();
    expect(maVote!.regime).toBe("trending");
  });

  test("volume trend method handles missing volumes gracefully", () => {
    const prices = trendingPrices(MIN_BARS);
    const result = classifyRegimeEnsemble(prices); // no volumes passed

    const volVote = result.votes.find((v) => v.method === "volumeTrend");
    expect(volVote).toBeDefined();
    expect(volVote!.regime).toBe("transition"); // default when no volume data
  });
});

// ============================================================================
// WEIGHTED VOTING
// ============================================================================

describe("weighted voting", () => {
  test("higher weighted method influences the outcome more", () => {
    const prices = trendingPrices(MIN_BARS, 2);
    const volumes = flatVolumes(MIN_BARS);

    // Run with default weights
    const result = classifyRegimeEnsemble(prices, volumes);

    // KER and ADX have the highest default weights (1.5 and 1.3)
    const kerVote = result.votes.find((v) => v.method === "ker");
    const kurtVote = result.votes.find((v) => v.method === "kurtosis");

    expect(kerVote!.weight).toBeGreaterThan(kurtVote!.weight);
  });

  test("custom weights are respected", () => {
    const prices = trendingPrices(MIN_BARS);
    const volumes = flatVolumes(MIN_BARS);

    const result = classifyRegimeEnsemble(prices, volumes, {
      weights: {
        ker: 10,
        adx: 0.1,
        bbWidth: 0.1,
        atrRatio: 0.1,
        volumeTrend: 0.1,
        priceMA: 0.1,
        kurtosis: 0.1,
      },
    });

    const kerVote = result.votes.find((v) => v.method === "ker");
    expect(kerVote!.weight).toBe(10);
  });
});
