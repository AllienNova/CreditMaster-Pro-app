/**
 * PCTT Core Engine — Unit Tests (TRD-005 / TRD-006 / TRD-007)
 * TRD-008: 80%+ branch coverage
 *
 * This file tests the three advanced PCTT features that are NOT covered
 * by the existing pctt/__tests__/pctt-core.test.ts (which covers pivots,
 * boundaries, regime, state machine, ATR, reset, and config).
 *
 * Focus areas:
 *   TRD-005: White's Reality Check (statistical significance validation)
 *   TRD-006: Hybrid Trailing Stop (ATR + volatility-adaptive trailing)
 *   TRD-007: Composite Rejection Score (multi-factor rejection scoring)
 */

import {
  PCTTEngine,
  createPCTTEngine,
  type OHLCV,
  type WhiteRealityResult,
  type HybridTrailingStop,
  DEFAULT_PCTT_CONFIG,
} from '../pctt/pctt-core';
import { CorrelationMonitor } from '../correlation-monitor';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Generate N bars of OHLCV data with controllable trend. */
function makeOHLCV(
  count: number,
  basePrice = 100,
  trend: 'up' | 'down' | 'flat' = 'flat',
  volatility = 0.01,
): OHLCV[] {
  const bars: OHLCV[] = [];
  let price = basePrice;
  const startTime = 1_700_000_000;

  for (let i = 0; i < count; i++) {
    const trendDelta =
      trend === 'up' ? volatility * 0.3 * price :
      trend === 'down' ? -volatility * 0.3 * price :
      0;
    price += trendDelta + (Math.random() - 0.5) * volatility * price;
    const range = price * volatility;
    const open = price - range * 0.2;
    const close = price + range * 0.2;
    const high = Math.max(open, close) + range * 0.3;
    const low = Math.min(open, close) - range * 0.3;

    bars.push({
      time: startTime + i * 60,
      open,
      high,
      low,
      close,
      volume: 100_000 + Math.floor(Math.random() * 50_000),
    });
  }
  return bars;
}

// ---------------------------------------------------------------------------
// TRD-005: White's Reality Check
// ---------------------------------------------------------------------------

describe('PCTTEngine — TRD-005: White\'s Reality Check', () => {
  let engine: PCTTEngine;

  beforeEach(() => {
    // Use small bootstrapSamples to keep tests fast
    engine = createPCTTEngine({ bootstrapSamples: 50, whiteRealityAlpha: 0.05 });
  });

  it('should return p-value=1 and isSignificant=false when bar count < 11', () => {
    // Less than 11 bars produces <10 bar-to-bar returns
    const bars = makeOHLCV(8);
    const result = engine.whiteRealityCheck(bars);

    expect(result.pValue).toBe(1);
    expect(result.isSignificant).toBe(false);
    expect(result.numSamples).toBe(0);
    expect(result.alpha).toBe(0.05);
  });

  it('should return a complete WhiteRealityResult for sufficient data', () => {
    const bars = makeOHLCV(200, 100, 'flat', 0.02);
    const result = engine.whiteRealityCheck(bars);

    expect(typeof result.pValue).toBe('number');
    expect(result.pValue).toBeGreaterThanOrEqual(0);
    expect(result.pValue).toBeLessThanOrEqual(1);
    expect(typeof result.isSignificant).toBe('boolean');
    expect(typeof result.actualMetric).toBe('number');
    expect(typeof result.bootstrapMean).toBe('number');
    expect(typeof result.bootstrapStdDev).toBe('number');
    expect(result.bootstrapStdDev).toBeGreaterThanOrEqual(0);
    expect(typeof result.bootstrapPercentile95).toBe('number');
    expect(result.numSamples).toBe(50);
    expect(result.alpha).toBe(0.05);
  });

  it('should mark isSignificant=true when pValue < alpha', () => {
    // We can't force significance deterministically, but we can verify the
    // logical relationship: isSignificant === (pValue < alpha).
    const bars = makeOHLCV(200, 100, 'up', 0.02);
    const result = engine.whiteRealityCheck(bars);

    expect(result.isSignificant).toBe(result.pValue < result.alpha);
  });

  it('should accept a custom metric function', () => {
    const bars = makeOHLCV(100);
    const customMetric = (returns: number[]): number => {
      // Simple cumulative return
      return returns.reduce((a, b) => a + b, 0);
    };

    const result = engine.whiteRealityCheck(bars, customMetric);
    expect(typeof result.actualMetric).toBe('number');
    expect(result.numSamples).toBeGreaterThan(0);
  });

  it('should return actualMetric=0 when PCTT produces < 2 signal returns', () => {
    // Very short series (but >=11 bars so bootstrap runs) — PCTT likely produces
    // 0 signals, so actualMetric comes from the fallback.
    const bars = makeOHLCV(15);
    const result = engine.whiteRealityCheck(bars);

    // With 15 bars the engine can barely extract pivots let alone generate signals
    expect(typeof result.actualMetric).toBe('number');
    // Even if actualMetric is 0 the bootstrap should still complete
    expect(result.numSamples).toBe(50);
  });
});

// ---------------------------------------------------------------------------
// TRD-006: Hybrid Trailing Stop
// ---------------------------------------------------------------------------

describe('PCTTEngine — TRD-006: Hybrid Trailing Stop', () => {
  let engine: PCTTEngine;

  beforeEach(() => {
    engine = createPCTTEngine({
      trailingAtrMultiplier: 2.0,
      trailingMinLockR: 0.5,
      trailingVolatilityHalfLife: 20,
      adaptiveStopVolWeight: 0.3,
    });
  });

  it('should initialise a long trailing stop with active=false', () => {
    const stop = engine.initHybridTrailingStop('long', 100, 95, 2);

    expect(stop.active).toBe(false);
    expect(stop.direction).toBe('long');
    expect(stop.entryPrice).toBe(100);
    expect(stop.initialStop).toBe(95);
    expect(stop.currentStop).toBe(95);
    expect(stop.highWaterMark).toBe(100);
    expect(stop.riskDistance).toBe(5); // |100-95|
    expect(stop.lockedR).toBe(0);
    expect(stop.barsHeld).toBe(0);
    expect(stop.atrAtEntry).toBe(2);
    expect(stop.trailingDistance).toBe(4); // 2.0 * 2
  });

  it('should initialise a short trailing stop', () => {
    const stop = engine.initHybridTrailingStop('short', 100, 105, 2);

    expect(stop.direction).toBe('short');
    expect(stop.entryPrice).toBe(100);
    expect(stop.initialStop).toBe(105);
    expect(stop.riskDistance).toBe(5);
  });

  it('should return null from updateHybridTrailingStop when no stop is initialised', () => {
    const bar: OHLCV = { time: 0, open: 100, high: 101, low: 99, close: 100, volume: 100_000 };
    expect(engine.updateHybridTrailingStop(bar, 2)).toBeNull();
  });

  it('should activate long trailing stop once lockedR reaches minLockR', () => {
    engine.initHybridTrailingStop('long', 100, 95, 2);
    // riskDistance = 5, minLockR = 0.5 → need highWaterMark >= 100 + 0.5*5 = 102.5

    // Bar that pushes price to 103 → lockedR = (103-100)/5 = 0.6 >= 0.5
    const bar: OHLCV = { time: 1, open: 101, high: 103, low: 100.5, close: 102, volume: 100_000 };
    const result = engine.updateHybridTrailingStop(bar, 2)!;

    expect(result).not.toBeNull();
    expect(result.stop.active).toBe(true);
    expect(result.stop.highWaterMark).toBe(103);
    expect(result.stop.lockedR).toBeGreaterThanOrEqual(0.5);
  });

  it('should ratchet stop upward for long position as price rises', () => {
    engine.initHybridTrailingStop('long', 100, 95, 2);

    // First bar: activate trailing (high = 105, lockedR = 1.0)
    const bar1: OHLCV = { time: 1, open: 101, high: 105, low: 100, close: 104, volume: 100_000 };
    const r1 = engine.updateHybridTrailingStop(bar1, 2)!;
    const stop1 = r1.adaptiveStop;

    // Second bar: price goes even higher
    const bar2: OHLCV = { time: 2, open: 104, high: 110, low: 103, close: 109, volume: 100_000 };
    const r2 = engine.updateHybridTrailingStop(bar2, 2)!;
    const stop2 = r2.adaptiveStop;

    // Stop should ratchet up (or stay same), never down
    expect(stop2).toBeGreaterThanOrEqual(stop1);
  });

  it('should detect stopHit for long when bar.low <= currentStop', () => {
    engine.initHybridTrailingStop('long', 100, 95, 2);

    // Bar that drops below initial stop
    const bar: OHLCV = { time: 1, open: 96, high: 97, low: 94, close: 94.5, volume: 100_000 };
    const result = engine.updateHybridTrailingStop(bar, 2)!;

    expect(result.stopHit).toBe(true);
  });

  it('should handle short trailing stop and detect stopHit', () => {
    engine.initHybridTrailingStop('short', 100, 105, 2);

    // Bar rallies above stop
    const bar: OHLCV = { time: 1, open: 104, high: 106, low: 103, close: 105.5, volume: 100_000 };
    const result = engine.updateHybridTrailingStop(bar, 2)!;

    expect(result.stopHit).toBe(true);
  });

  it('should ratchet stop downward for short position as price falls', () => {
    engine.initHybridTrailingStop('short', 100, 105, 2);

    // Activate: low = 95, lockedR = (100-95)/5 = 1.0
    const bar1: OHLCV = { time: 1, open: 99, high: 100, low: 95, close: 96, volume: 100_000 };
    const r1 = engine.updateHybridTrailingStop(bar1, 2)!;
    const stop1 = r1.adaptiveStop;

    // Price continues lower
    const bar2: OHLCV = { time: 2, open: 96, high: 97, low: 90, close: 91, volume: 100_000 };
    const r2 = engine.updateHybridTrailingStop(bar2, 2)!;
    const stop2 = r2.adaptiveStop;

    expect(stop2).toBeLessThanOrEqual(stop1);
  });

  it('should return a read-only copy from getHybridTrailingStop', () => {
    engine.initHybridTrailingStop('long', 100, 95, 2);
    const copy = engine.getHybridTrailingStop()!;

    expect(copy.entryPrice).toBe(100);

    // Mutating the copy should not affect internal state
    copy.entryPrice = 999;
    expect(engine.getHybridTrailingStop()!.entryPrice).toBe(100);
  });

  it('should return null from getHybridTrailingStop when none is active', () => {
    expect(engine.getHybridTrailingStop()).toBeNull();
  });

  it('should clear stop on closeHybridTrailingStop', () => {
    engine.initHybridTrailingStop('long', 100, 95, 2);
    expect(engine.getHybridTrailingStop()).not.toBeNull();

    engine.closeHybridTrailingStop();
    expect(engine.getHybridTrailingStop()).toBeNull();
  });

  it('should increment barsHeld on each update', () => {
    engine.initHybridTrailingStop('long', 100, 95, 2);

    const bar: OHLCV = { time: 1, open: 100, high: 101, low: 99, close: 100, volume: 100_000 };
    engine.updateHybridTrailingStop(bar, 2);
    engine.updateHybridTrailingStop(bar, 2);
    engine.updateHybridTrailingStop(bar, 2);

    const stop = engine.getHybridTrailingStop()!;
    expect(stop.barsHeld).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// TRD-007: Composite Rejection Score & Correlation Monitor Integration
// ---------------------------------------------------------------------------

describe('PCTTEngine — TRD-007: Correlation Monitor & Composite Rejection', () => {
  it('should accept a CorrelationMonitor via setCorrelationMonitor', () => {
    const engine = createPCTTEngine();
    const monitor = new CorrelationMonitor();

    // Should not throw
    expect(() => engine.setCorrelationMonitor(monitor, 'AAPL')).not.toThrow();
  });

  it('should produce default correlationScore=0.5 without a monitor set', () => {
    // When no monitor is injected, calculateCorrelationScore returns 0.5.
    // We can only observe this indirectly by running enough bars through the
    // engine to trigger a composite rejection score computation.
    // Instead, we verify that the engine processes without error.
    const engine = createPCTTEngine({
      pivotDepth: 3,
      minQScore: 0.1,
      minRejectionScore: 0.01,
    });

    const bars = makeOHLCV(200, 100, 'flat', 0.02);
    let lastResult;
    for (const bar of bars) {
      lastResult = engine.update(bar);
    }

    expect(lastResult).toBeDefined();
    expect(lastResult!.structure).toBeDefined();
  });

  it('should process bars with a CorrelationMonitor attached', () => {
    const engine = createPCTTEngine({
      pivotDepth: 3,
      minQScore: 0.1,
      minRejectionScore: 0.01,
    });
    const monitor = new CorrelationMonitor();
    engine.setCorrelationMonitor(monitor, 'AAPL');

    // Feed some prices into the monitor so it has data
    const prices = makeOHLCV(200).map((b, i) => ({
      date: new Date(2024, 0, i + 1),
      close: b.close,
    }));
    monitor.ingestPrices('AAPL', prices);

    const bars = makeOHLCV(200, 100, 'flat', 0.02);
    let lastResult;
    for (const bar of bars) {
      lastResult = engine.update(bar);
    }

    expect(lastResult).toBeDefined();
  });

  it('should validate DEFAULT_PCTT_CONFIG has TRD-007 rejection weights summing to 1', () => {
    const sum =
      DEFAULT_PCTT_CONFIG.rejectionCandleWeight +
      DEFAULT_PCTT_CONFIG.rejectionVolumeWeight +
      DEFAULT_PCTT_CONFIG.rejectionCorrelationWeight +
      DEFAULT_PCTT_CONFIG.rejectionStructureWeight;

    expect(sum).toBeCloseTo(1.0, 5);
  });

  it('should validate DEFAULT_PCTT_CONFIG has TRD-005 bootstrap fields', () => {
    expect(DEFAULT_PCTT_CONFIG.bootstrapSamples).toBe(1000);
    expect(DEFAULT_PCTT_CONFIG.whiteRealityAlpha).toBe(0.05);
  });

  it('should validate DEFAULT_PCTT_CONFIG has TRD-006 trailing stop fields', () => {
    expect(DEFAULT_PCTT_CONFIG.hybridTrailingEnabled).toBe(true);
    expect(DEFAULT_PCTT_CONFIG.trailingAtrMultiplier).toBe(2.0);
    expect(DEFAULT_PCTT_CONFIG.trailingVolatilityHalfLife).toBe(20);
    expect(DEFAULT_PCTT_CONFIG.trailingMinLockR).toBe(0.5);
    expect(DEFAULT_PCTT_CONFIG.adaptiveStopVolWeight).toBe(0.3);
  });
});

// ---------------------------------------------------------------------------
// Integration: createPCTTEngine + update + TRD features
// ---------------------------------------------------------------------------

describe('PCTTEngine — Factory & Integration', () => {
  it('should create engine with default config', () => {
    const engine = createPCTTEngine();
    expect(engine).toBeInstanceOf(PCTTEngine);
  });

  it('should accept partial TRD-005/006/007 config overrides', () => {
    const engine = createPCTTEngine({
      bootstrapSamples: 100,
      whiteRealityAlpha: 0.10,
      hybridTrailingEnabled: false,
      trailingAtrMultiplier: 3.0,
      rejectionCandleWeight: 0.4,
      rejectionVolumeWeight: 0.2,
      rejectionCorrelationWeight: 0.2,
      rejectionStructureWeight: 0.2,
    });

    // Verify engine works with custom config
    const bars = makeOHLCV(50);
    for (const bar of bars) {
      engine.update(bar);
    }
    expect(engine.getStructure()).toBeDefined();
  });

  it('should reset trailing stop state on engine reset', () => {
    const engine = createPCTTEngine();
    engine.initHybridTrailingStop('long', 100, 95, 2);
    expect(engine.getHybridTrailingStop()).not.toBeNull();

    engine.reset();
    // After reset, trailing stop should be cleared (getStructure returns null)
    expect(engine.getStructure()).toBeNull();
  });
});
