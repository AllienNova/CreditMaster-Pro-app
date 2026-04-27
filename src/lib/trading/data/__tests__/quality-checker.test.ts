/**
 * Tests for data/quality-checker.ts (8.4)
 */

import {
  checkQuoteHealth,
  checkGapAnomaly,
} from "../quality-checker";

// ============================================================================
// Staleness Detection
// ============================================================================

describe("checkQuoteHealth — staleness", () => {
  // Build a quote timestamp that is N seconds old relative to now
  function staleTimestamp(ageSeconds: number): Date {
    return new Date(Date.now() - ageSeconds * 1000);
  }

  describe("equities (regular session threshold: 1500 ms = 1.5 s)", () => {
    it("passes when quote is fresh (< 1500 ms)", () => {
      const health = checkQuoteHealth("AAPL", staleTimestamp(1), undefined, undefined, "equities", "regular");
      expect(health.isStale).toBe(false);
      const stalenessCheck = health.checks.find((c) => c.check === "staleness");
      expect(stalenessCheck?.passed).toBe(true);
    });

    it("fails when quote exceeds 1500 ms during regular session", () => {
      // 3 seconds old — definitely stale for equities during regular session
      const health = checkQuoteHealth("AAPL", staleTimestamp(3), undefined, undefined, "equities", "regular");
      expect(health.isStale).toBe(true);
      const stalenessCheck = health.checks.find((c) => c.check === "staleness");
      expect(stalenessCheck?.passed).toBe(false);
      expect(stalenessCheck?.action).toBe("PAUSE_SYMBOL");
      expect(stalenessCheck?.severity).toBe("critical");
    });
  });

  describe("crypto (regular session threshold: 3000 ms = 3 s)", () => {
    it("passes when quote age is 2 s for crypto", () => {
      const health = checkQuoteHealth("BTC", staleTimestamp(2), undefined, undefined, "crypto", "regular");
      // 2s < 3s threshold → not stale
      expect(health.isStale).toBe(false);
    });

    it("fails when quote age is 4 s for crypto", () => {
      const health = checkQuoteHealth("ETH", staleTimestamp(4), undefined, undefined, "crypto", "regular");
      expect(health.isStale).toBe(true);
    });
  });

  describe("futures (regular session threshold: 2000 ms = 2 s)", () => {
    it("passes when quote age is 1 s for futures", () => {
      const health = checkQuoteHealth("ESH25", staleTimestamp(1), undefined, undefined, "futures", "regular");
      expect(health.isStale).toBe(false);
    });

    it("fails when quote age is 3 s for futures", () => {
      const health = checkQuoteHealth("ESH25", staleTimestamp(3), undefined, undefined, "futures", "regular");
      expect(health.isStale).toBe(true);
    });
  });

  it("includes symbol in returned QuoteHealth", () => {
    const health = checkQuoteHealth("TSLA", staleTimestamp(1));
    expect(health.symbol).toBe("TSLA");
  });

  it("exposes lastUpdateAge in seconds", () => {
    const health = checkQuoteHealth("AAPL", staleTimestamp(2));
    expect(health.lastUpdateAge).toBeGreaterThanOrEqual(1.9);
    expect(health.lastUpdateAge).toBeLessThanOrEqual(3.1);
  });
});

// ============================================================================
// NBBO Spread Check
// ============================================================================

describe("checkQuoteHealth — NBBO spread", () => {
  function freshTimestamp(): Date {
    return new Date(Date.now() - 100); // 100 ms ago — definitely fresh
  }

  it("passes when spread is within policy max_spread_bps", () => {
    // bid=100, ask=100.10 → spread = 0.10, spreadBps = 10 bps
    const health = checkQuoteHealth("AAPL", freshTimestamp(), 100, 100.10, "equities");
    const spreadCheck = health.checks.find((c) => c.check === "nbbo_spread");
    expect(spreadCheck).toBeDefined();
    expect(spreadCheck?.passed).toBe(true);
  });

  it("fails when spread exceeds policy max_spread_bps (50 bps default)", () => {
    // bid=100, ask=100.60 → spread = 0.60, spreadBps = 60 bps > 50 bps
    const health = checkQuoteHealth("XYZ", freshTimestamp(), 100, 100.60, "equities");
    const spreadCheck = health.checks.find((c) => c.check === "nbbo_spread");
    expect(spreadCheck).toBeDefined();
    expect(spreadCheck?.passed).toBe(false);
    expect(spreadCheck?.severity).toBe("warning");
    expect(spreadCheck?.action).toBe("ALERT");
  });

  it("detects crossed NBBO (bid > ask) as critical", () => {
    const health = checkQuoteHealth("SPY", freshTimestamp(), 450, 449, "equities");
    const spreadCheck = health.checks.find((c) => c.check === "nbbo_spread");
    expect(spreadCheck?.passed).toBe(false);
    expect(spreadCheck?.severity).toBe("critical");
    expect(spreadCheck?.action).toBe("PAUSE_SYMBOL");
  });

  it("computes spreadBps correctly", () => {
    // bid=200, ask=200.20 → (0.20 / 200) * 10000 = 10 bps
    const health = checkQuoteHealth("MSFT", freshTimestamp(), 200, 200.20, "equities");
    expect(health.spreadBps).toBeCloseTo(10, 1);
    expect(health.bidAskSpread).toBeCloseTo(0.20, 5);
  });

  it("skips spread check when bid/ask not provided", () => {
    const health = checkQuoteHealth("AAPL", freshTimestamp(), undefined, undefined, "equities");
    const spreadCheck = health.checks.find((c) => c.check === "nbbo_spread");
    expect(spreadCheck).toBeUndefined();
    expect(health.spreadBps).toBeUndefined();
    expect(health.bidAskSpread).toBeUndefined();
  });
});

// ============================================================================
// Gap Anomaly Detection
// ============================================================================

describe("checkGapAnomaly", () => {
  it("passes when gap is within sigma threshold", () => {
    // ATR = 1.0, price moved 3 units → 3σ, default threshold is 5σ
    const result = checkGapAnomaly(103, 100, 1.0);
    expect(result.passed).toBe(true);
    expect(result.check).toBe("gap_anomaly");
    expect(result.action).toBe("LOG");
  });

  it("fails when gap exceeds sigma threshold", () => {
    // ATR = 1.0, price moved 7 units → 7σ > 5σ threshold
    const result = checkGapAnomaly(107, 100, 1.0);
    expect(result.passed).toBe(false);
    expect(result.severity).toBe("critical");
    expect(result.action).toBe("PAUSE_SYMBOL");
  });

  it("respects custom sigmaThreshold override", () => {
    // ATR = 1.0, gap = 5σ, but threshold is 4σ → should fail
    const result = checkGapAnomaly(105, 100, 1.0, 4);
    expect(result.passed).toBe(false);
  });

  it("detects negative price drops as well (absolute gap)", () => {
    // ATR = 1.0, price dropped 7 units → |-7| = 7σ > 5σ
    const result = checkGapAnomaly(93, 100, 1.0);
    expect(result.passed).toBe(false);
  });

  it("returns info severity and passes when gap is exactly at threshold boundary", () => {
    // ATR = 1.0, gap = 5σ exactly (not strictly greater) → should pass
    const result = checkGapAnomaly(105, 100, 1.0, 5);
    expect(result.passed).toBe(true);
  });

  it("handles zero ATR gracefully without dividing by zero", () => {
    const result = checkGapAnomaly(110, 100, 0);
    expect(result.passed).toBe(true);
    expect(result.severity).toBe("info");
    expect(result.details).toContain("ATR is zero");
  });

  it("handles negative ATR gracefully", () => {
    const result = checkGapAnomaly(110, 100, -1.0);
    expect(result.passed).toBe(true);
    expect(result.details).toContain("ATR is zero");
  });

  it("includes observed sigma and threshold in details when flagged", () => {
    const result = checkGapAnomaly(108, 100, 1.0, 5);
    expect(result.details).toContain("σ");
  });
});
