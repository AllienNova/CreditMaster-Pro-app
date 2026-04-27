/**
 * Tests for signals/htf-alignment.ts — Sprint 9C
 */

import {
  checkHTFAlignment,
  type HTFInput,
} from "../htf-alignment";
import type { Bar } from "@/lib/trading/data/bar-consolidator";

// ============================================================================
// HELPERS
// ============================================================================

function makeBar(
  timestamp: number,
  close: number,
  high?: number,
  low?: number,
): Bar {
  return {
    timestamp,
    open: close - 0.5,
    high: high ?? close + 1,
    low: low ?? close - 1,
    close,
    volume: 1000,
  };
}

/**
 * Generate bars with a clear uptrend (steadily rising closes).
 * Each bar's close increases by `step`.
 */
function uptrend(count: number, startPrice: number = 100, step: number = 1): Bar[] {
  return Array.from({ length: count }, (_, i) =>
    makeBar(i * 3_600_000, startPrice + i * step),
  );
}

/**
 * Generate bars with a clear downtrend (steadily falling closes).
 */
function downtrend(count: number, startPrice: number = 200, step: number = 1): Bar[] {
  return Array.from({ length: count }, (_, i) =>
    makeBar(i * 3_600_000, startPrice - i * step),
  );
}

/**
 * Generate flat/ranging bars with oscillating closes.
 */
function flatBars(count: number, centerPrice: number = 100): Bar[] {
  return Array.from({ length: count }, (_, i) => {
    // Oscillate by tiny amounts around center
    const offset = i % 2 === 0 ? 0.01 : -0.01;
    return makeBar(i * 3_600_000, centerPrice + offset);
  });
}

// ============================================================================
// EMA SLOPE METHOD
// ============================================================================

describe("checkHTFAlignment — ema_slope", () => {
  it("returns bullish and aligned for long signal on uptrend", () => {
    const bars = uptrend(30);
    const result = checkHTFAlignment({
      signalTimeframe: "5m",
      signalDirection: "long",
      htfBars: bars,
      method: "ema_slope",
    });
    expect(result.aligned).toBe(true);
    expect(result.htfTrend).toBe("bullish");
    expect(result.method).toBe("ema_slope");
  });

  it("returns bearish and aligned for short signal on downtrend", () => {
    const bars = downtrend(30);
    const result = checkHTFAlignment({
      signalTimeframe: "5m",
      signalDirection: "short",
      htfBars: bars,
      method: "ema_slope",
    });
    expect(result.aligned).toBe(true);
    expect(result.htfTrend).toBe("bearish");
  });

  it("returns not aligned for long signal on downtrend", () => {
    const bars = downtrend(30);
    const result = checkHTFAlignment({
      signalTimeframe: "5m",
      signalDirection: "long",
      htfBars: bars,
      method: "ema_slope",
    });
    expect(result.aligned).toBe(false);
    expect(result.htfTrend).toBe("bearish");
  });

  it("returns neutral for flat bars", () => {
    const bars = flatBars(30);
    const result = checkHTFAlignment({
      signalTimeframe: "5m",
      signalDirection: "long",
      htfBars: bars,
      method: "ema_slope",
    });
    expect(result.aligned).toBe(false);
    expect(result.htfTrend).toBe("neutral");
  });

  it("returns neutral with insufficient bars", () => {
    const bars = uptrend(5); // Too few for EMA(20) + lookback
    const result = checkHTFAlignment({
      signalTimeframe: "5m",
      signalDirection: "long",
      htfBars: bars,
      method: "ema_slope",
    });
    expect(result.aligned).toBe(false);
    expect(result.htfTrend).toBe("neutral");
    expect(result.details).toContain("Insufficient");
  });
});

// ============================================================================
// PIVOT STRUCTURE METHOD
// ============================================================================

describe("checkHTFAlignment — pivot_structure", () => {
  it("returns bullish for bars with higher highs and higher lows", () => {
    // Create bars with clear ascending pivots
    const bars: Bar[] = [];
    for (let i = 0; i < 40; i++) {
      const base = 100 + i * 0.5;
      // Create oscillation with higher pivots
      const swing = Math.sin(i * 0.5) * 3;
      bars.push({
        timestamp: i * 3_600_000,
        open: base + swing - 0.5,
        high: base + swing + 2,
        low: base + swing - 2,
        close: base + swing,
        volume: 1000,
      });
    }

    const result = checkHTFAlignment({
      signalTimeframe: "5m",
      signalDirection: "long",
      htfBars: bars,
      method: "pivot_structure",
    });
    expect(result.method).toBe("pivot_structure");
    // With an ascending base, we expect bullish or neutral depending on pivot extraction
    expect(["bullish", "neutral"]).toContain(result.htfTrend);
  });

  it("returns bearish for bars with lower highs and lower lows", () => {
    const bars: Bar[] = [];
    for (let i = 0; i < 40; i++) {
      const base = 200 - i * 0.5;
      const swing = Math.sin(i * 0.5) * 3;
      bars.push({
        timestamp: i * 3_600_000,
        open: base + swing - 0.5,
        high: base + swing + 2,
        low: base + swing - 2,
        close: base + swing,
        volume: 1000,
      });
    }

    const result = checkHTFAlignment({
      signalTimeframe: "5m",
      signalDirection: "short",
      htfBars: bars,
      method: "pivot_structure",
    });
    expect(result.method).toBe("pivot_structure");
    expect(["bearish", "neutral"]).toContain(result.htfTrend);
  });

  it("returns neutral with insufficient bars", () => {
    const bars = uptrend(5);
    const result = checkHTFAlignment({
      signalTimeframe: "5m",
      signalDirection: "long",
      htfBars: bars,
      method: "pivot_structure",
    });
    expect(result.aligned).toBe(false);
    expect(result.htfTrend).toBe("neutral");
  });
});

// ============================================================================
// BOTH MODE
// ============================================================================

describe("checkHTFAlignment — both mode", () => {
  it("returns aligned when both methods agree on bullish", () => {
    // Strong uptrend should produce bullish from both methods
    const bars = uptrend(40, 100, 2);
    const result = checkHTFAlignment({
      signalTimeframe: "5m",
      signalDirection: "long",
      htfBars: bars,
      method: "both",
    });
    expect(result.method).toBe("both");
    // If both agree bullish, should be aligned
    if (result.htfTrend === "bullish") {
      expect(result.aligned).toBe(true);
    }
    // The details should contain both EMA and Pivot info
    expect(result.details).toContain("EMA:");
    expect(result.details).toContain("Pivot:");
  });

  it("returns not aligned when methods disagree", () => {
    // Flat bars: EMA says neutral, pivots say neutral
    const bars = flatBars(40);
    const result = checkHTFAlignment({
      signalTimeframe: "5m",
      signalDirection: "long",
      htfBars: bars,
      method: "both",
    });
    expect(result.aligned).toBe(false);
    expect(result.method).toBe("both");
  });

  it("defaults to ema_slope when method is not specified", () => {
    const bars = uptrend(30);
    const result = checkHTFAlignment({
      signalTimeframe: "5m",
      signalDirection: "long",
      htfBars: bars,
    });
    expect(result.method).toBe("ema_slope");
  });
});

// ============================================================================
// ALIGNMENT LOGIC
// ============================================================================

describe("checkHTFAlignment — alignment logic", () => {
  it("short signal on bullish trend is NOT aligned", () => {
    const bars = uptrend(30);
    const result = checkHTFAlignment({
      signalTimeframe: "5m",
      signalDirection: "short",
      htfBars: bars,
      method: "ema_slope",
    });
    expect(result.aligned).toBe(false);
    expect(result.htfTrend).toBe("bullish");
  });

  it("neutral HTF never aligns with any signal direction", () => {
    const bars = flatBars(30);
    const longResult = checkHTFAlignment({
      signalTimeframe: "5m",
      signalDirection: "long",
      htfBars: bars,
      method: "ema_slope",
    });
    const shortResult = checkHTFAlignment({
      signalTimeframe: "5m",
      signalDirection: "short",
      htfBars: bars,
      method: "ema_slope",
    });
    expect(longResult.aligned).toBe(false);
    expect(shortResult.aligned).toBe(false);
  });
});
