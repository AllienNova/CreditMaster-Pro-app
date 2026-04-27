/**
 * Tests for data/bar-consolidator.ts — Sprint 9C
 */

import {
  consolidateBars,
  getTimeframePeriodMs,
  type Bar,
  type Timeframe,
} from "../bar-consolidator";

// ============================================================================
// HELPERS
// ============================================================================

/** Build a bar at a given epoch ms offset. */
function bar(
  timestamp: number,
  open: number,
  high: number,
  low: number,
  close: number,
  volume: number = 100,
): Bar {
  return { timestamp, open, high, low, close, volume };
}

/**
 * Generate a sequence of 1-minute bars starting at a given timestamp.
 * Prices oscillate slightly for realism.
 */
function generate1mBars(
  startMs: number,
  count: number,
  basePrice: number = 100,
): Bar[] {
  const bars: Bar[] = [];
  for (let i = 0; i < count; i++) {
    const ts = startMs + i * 60_000;
    const open = basePrice + i * 0.1;
    const high = open + 0.5;
    const low = open - 0.3;
    const close = open + 0.2;
    bars.push(bar(ts, open, high, low, close, 1000 + i * 10));
  }
  return bars;
}

// ============================================================================
// getTimeframePeriodMs
// ============================================================================

describe("getTimeframePeriodMs", () => {
  it("returns 60000 for 1m", () => {
    expect(getTimeframePeriodMs("1m")).toBe(60_000);
  });

  it("returns 300000 for 5m", () => {
    expect(getTimeframePeriodMs("5m")).toBe(300_000);
  });

  it("returns 900000 for 15m", () => {
    expect(getTimeframePeriodMs("15m")).toBe(900_000);
  });

  it("returns 3600000 for 1h", () => {
    expect(getTimeframePeriodMs("1h")).toBe(3_600_000);
  });

  it("returns 86400000 for 1d", () => {
    expect(getTimeframePeriodMs("1d")).toBe(86_400_000);
  });
});

// ============================================================================
// consolidateBars — OHLCV correctness
// ============================================================================

describe("consolidateBars — OHLCV correctness", () => {
  it("returns empty array for empty input", () => {
    expect(consolidateBars([], "5m")).toEqual([]);
  });

  it("returns single bar unchanged when only one bar input", () => {
    const input = [bar(300_000, 100, 102, 99, 101, 500)];
    const result = consolidateBars(input, "5m");
    expect(result).toHaveLength(1);
    expect(result[0].open).toBe(100);
    expect(result[0].close).toBe(101);
  });

  it("consolidates 1m -> 5m with correct OHLCV", () => {
    // 5 bars at t=0,1,2,3,4 minutes (all within the same 5m period starting at t=0)
    const base = 0; // Epoch 0 aligns to a 5m boundary
    const input: Bar[] = [
      bar(base + 0 * 60_000, 100, 105, 98, 103, 1000),
      bar(base + 1 * 60_000, 103, 107, 101, 102, 1500),
      bar(base + 2 * 60_000, 102, 104, 99, 101, 800),
      bar(base + 3 * 60_000, 101, 106, 97, 104, 1200),
      bar(base + 4 * 60_000, 104, 108, 100, 106, 900),
    ];

    const result = consolidateBars(input, "5m");
    expect(result).toHaveLength(1);

    const consolidated = result[0];
    expect(consolidated.open).toBe(100);        // first bar's open
    expect(consolidated.high).toBe(108);        // max high
    expect(consolidated.low).toBe(97);          // min low
    expect(consolidated.close).toBe(106);       // last bar's close
    expect(consolidated.volume).toBe(5400);     // sum of volumes
  });

  it("produces two 5m bars from 10 contiguous 1m bars", () => {
    const base = 0;
    const input = generate1mBars(base, 10);
    const result = consolidateBars(input, "5m");
    expect(result).toHaveLength(2);

    // First 5m bar: bars 0-4
    expect(result[0].open).toBe(input[0].open);
    expect(result[0].close).toBe(input[4].close);

    // Second 5m bar: bars 5-9
    expect(result[1].open).toBe(input[5].open);
    expect(result[1].close).toBe(input[9].close);
  });

  it("consolidates 5m -> 1h correctly", () => {
    // 12 bars at 5-minute intervals = 1 hour
    const base = 0;
    const input: Bar[] = [];
    for (let i = 0; i < 12; i++) {
      const ts = base + i * 300_000; // 5-minute increments
      input.push(bar(ts, 100 + i, 105 + i, 95 + i, 102 + i, 500));
    }

    const result = consolidateBars(input, "1h");
    expect(result).toHaveLength(1);
    expect(result[0].open).toBe(100);           // first bar's open
    expect(result[0].high).toBe(116);           // max(105+0..105+11) = 116
    expect(result[0].low).toBe(95);             // min(95+0..95+11) = 95
    expect(result[0].close).toBe(113);          // last bar's close = 102+11
    expect(result[0].volume).toBe(6000);        // 12 * 500
  });

  it("consolidates 1h -> 1d correctly", () => {
    // 24 bars at 1-hour intervals
    const base = 0;
    const input: Bar[] = [];
    for (let i = 0; i < 24; i++) {
      const ts = base + i * 3_600_000;
      input.push(bar(ts, 200 + i, 210 + i, 190 + i, 205 + i, 10000));
    }

    const result = consolidateBars(input, "1d");
    expect(result).toHaveLength(1);
    expect(result[0].open).toBe(200);
    expect(result[0].close).toBe(228);          // 205 + 23
    expect(result[0].volume).toBe(240000);      // 24 * 10000
  });

  it("preserves timestamp as period start", () => {
    // Bars at 1:01, 1:02, 1:03 should consolidate to period starting at 1:00
    const hourMs = 3_600_000;
    const input: Bar[] = [
      bar(hourMs + 1 * 60_000, 100, 102, 99, 101, 100),
      bar(hourMs + 2 * 60_000, 101, 103, 100, 102, 100),
      bar(hourMs + 3 * 60_000, 102, 104, 101, 103, 100),
    ];

    const result = consolidateBars(input, "1h");
    expect(result).toHaveLength(1);
    expect(result[0].timestamp).toBe(hourMs); // Aligned to hour boundary
  });
});

// ============================================================================
// consolidateBars — gap handling
// ============================================================================

describe("consolidateBars — gap handling", () => {
  it("splits bars across a large gap into separate consolidated bars", () => {
    // Two groups of 5 bars with a 2-hour gap between them
    // (market closed during the gap)
    const group1Start = 0;
    const group2Start = group1Start + 5 * 60_000 + 2 * 3_600_000; // 2h gap

    const group1 = generate1mBars(group1Start, 5, 100);
    const group2 = generate1mBars(group2Start, 5, 110);

    // All bars happen to fall in different 5m period buckets due to the gap
    const input = [...group1, ...group2];
    const result = consolidateBars(input, "5m");

    // Should produce at least 2 consolidated bars (group1 and group2 don't merge)
    expect(result.length).toBeGreaterThanOrEqual(2);

    // First consolidated bar's open should be from group1
    expect(result[0].open).toBe(group1[0].open);

    // Last consolidated bar's close should be from group2
    expect(result[result.length - 1].close).toBe(group2[group2.length - 1].close);
  });

  it("does not merge bars from different 5m periods even without gap", () => {
    // 7 contiguous 1-minute bars crossing a 5-minute boundary
    const base = 0;
    const input = generate1mBars(base, 7);

    const result = consolidateBars(input, "5m");
    // 5 bars in first period, 2 in second
    expect(result).toHaveLength(2);
    expect(result[0].close).toBe(input[4].close);
    expect(result[1].open).toBe(input[5].open);
    expect(result[1].close).toBe(input[6].close);
  });
});

// ============================================================================
// consolidateBars — edge cases
// ============================================================================

describe("consolidateBars — edge cases", () => {
  it("handles bars with zero volume", () => {
    const input: Bar[] = [
      bar(0, 100, 102, 99, 101, 0),
      bar(60_000, 101, 103, 100, 102, 0),
    ];

    const result = consolidateBars(input, "5m");
    expect(result).toHaveLength(1);
    expect(result[0].volume).toBe(0);
  });

  it("handles bars with identical OHLC values", () => {
    const input: Bar[] = [
      bar(0, 100, 100, 100, 100, 500),
      bar(60_000, 100, 100, 100, 100, 500),
    ];

    const result = consolidateBars(input, "5m");
    expect(result).toHaveLength(1);
    expect(result[0].open).toBe(100);
    expect(result[0].high).toBe(100);
    expect(result[0].low).toBe(100);
    expect(result[0].close).toBe(100);
    expect(result[0].volume).toBe(1000);
  });
});
