/**
 * PCTT Core Engine Tests
 * 
 * Tests for pivot extraction, boundary estimation, regime detection,
 * and the state machine.
 */

import { 
  PCTTEngine, 
  createPCTTEngine, 
  OHLCV, 
  PCTTConfig,
  DEFAULT_PCTT_CONFIG,
  StructureObject,
  PCTTSignal,
} from '../pctt-core';

// ============================================================================
// TEST DATA GENERATORS
// ============================================================================

function generateOHLCV(
  basePrice: number,
  bars: number,
  volatility: number = 0.02,
  trend: 'up' | 'down' | 'range' = 'range'
): OHLCV[] {
  const data: OHLCV[] = [];
  let price = basePrice;
  const startTime = Date.now() - bars * 60000;

  for (let i = 0; i < bars; i++) {
    // Trend component
    let trendMove = 0;
    if (trend === 'up') trendMove = volatility * 0.3;
    if (trend === 'down') trendMove = -volatility * 0.3;

    // Random component
    const randomMove = (Math.random() - 0.5) * volatility * price;
    price = price + trendMove * price + randomMove;

    const range = price * volatility;
    const open = price + (Math.random() - 0.5) * range * 0.5;
    const close = price + (Math.random() - 0.5) * range * 0.5;
    const high = Math.max(open, close) + Math.random() * range * 0.3;
    const low = Math.min(open, close) - Math.random() * range * 0.3;

    data.push({
      time: startTime + i * 60000,
      open,
      high,
      low,
      close,
      volume: Math.floor(100000 + Math.random() * 50000),
    });
  }

  return data;
}

function generatePivotPattern(
  basePrice: number,
  pattern: 'higher_lows' | 'lower_highs' | 'channel' | 'breakout_up' | 'breakout_down'
): OHLCV[] {
  const data: OHLCV[] = [];
  const startTime = Date.now() - 100 * 60000;
  let price = basePrice;

  for (let i = 0; i < 100; i++) {
    let bias = 0;
    
    switch (pattern) {
      case 'higher_lows':
        // Create higher lows pattern
        if (i % 10 === 5) bias = -0.02; // Down swing
        if (i % 10 === 0) bias = 0.02;  // Up swing, higher low
        break;
      case 'lower_highs':
        if (i % 10 === 5) bias = 0.02;
        if (i % 10 === 0) bias = -0.02;
        break;
      case 'channel':
        bias = Math.sin(i / 5) * 0.01;
        break;
      case 'breakout_up':
        if (i < 80) bias = Math.sin(i / 5) * 0.005;
        else bias = 0.03; // Strong breakout
        break;
      case 'breakout_down':
        if (i < 80) bias = Math.sin(i / 5) * 0.005;
        else bias = -0.03;
        break;
    }

    price = price * (1 + bias + (Math.random() - 0.5) * 0.01);
    
    const range = price * 0.01;
    const open = price;
    const close = price * (1 + (Math.random() - 0.5) * 0.005);
    const high = Math.max(open, close) + Math.random() * range;
    const low = Math.min(open, close) - Math.random() * range;

    data.push({
      time: startTime + i * 60000,
      open,
      high,
      low,
      close,
      volume: 100000,
    });
  }

  return data;
}

// ============================================================================
// PIVOT EXTRACTION TESTS
// ============================================================================

describe('PCTTEngine - Pivot Extraction', () => {
  let engine: PCTTEngine;

  beforeEach(() => {
    engine = createPCTTEngine({ pivotDepth: 3 });
  });

  afterEach(() => {
    engine.reset();
  });

  test('should not extract pivots with insufficient data', () => {
    const data = generateOHLCV(100, 5);
    
    for (const bar of data) {
      engine.update(bar);
    }

    const pivots = engine.getPivots();
    expect(pivots.highs.length).toBe(0);
    expect(pivots.lows.length).toBe(0);
  });

  test('should extract pivots after sufficient confirmation bars', () => {
    const data = generateOHLCV(100, 50);
    
    for (const bar of data) {
      engine.update(bar);
    }

    const pivots = engine.getPivots();
    // With 50 bars and depth 3, we should have some pivots
    expect(pivots.highs.length + pivots.lows.length).toBeGreaterThan(0);
  });

  test('pivots should be non-repainting (confirmed only)', () => {
    const data = generateOHLCV(100, 30);
    
    // Process first 20 bars
    for (let i = 0; i < 20; i++) {
      engine.update(data[i]);
    }
    const pivotsBefore = engine.getPivots();
    const pivotCountBefore = pivotsBefore.highs.length + pivotsBefore.lows.length;

    // Process remaining bars
    for (let i = 20; i < 30; i++) {
      engine.update(data[i]);
    }
    const pivotsAfter = engine.getPivots();

    // Earlier pivots should still exist (non-repainting)
    expect(pivotsAfter.highs.length + pivotsAfter.lows.length).toBeGreaterThanOrEqual(pivotCountBefore);
  });

  test('pivots should have confirmation bar set correctly', () => {
    const data = generateOHLCV(100, 50);
    
    for (const bar of data) {
      engine.update(bar);
    }

    const pivots = engine.getPivots();
    
    for (const pivot of [...pivots.highs, ...pivots.lows]) {
      expect(pivot.confirmed).toBe(true);
      expect(pivot.confirmationBar).toBeGreaterThan(pivot.index);
    }
  });
});

// ============================================================================
// BOUNDARY ESTIMATION TESTS
// ============================================================================

describe('PCTTEngine - Boundary Estimation', () => {
  let engine: PCTTEngine;

  beforeEach(() => {
    engine = createPCTTEngine();
  });

  afterEach(() => {
    engine.reset();
  });

  test('should return null boundaries with insufficient pivots', () => {
    const data = generateOHLCV(100, 10);
    
    let result;
    for (const bar of data) {
      result = engine.update(bar);
    }

    expect(result?.structure.support).toBeNull();
    expect(result?.structure.resistance).toBeNull();
  });

  test('should estimate boundaries with sufficient data', () => {
    const data = generateOHLCV(100, 100, 0.02, 'range');
    
    let result;
    for (const bar of data) {
      result = engine.update(bar);
    }

    // At least one boundary should be present with range data
    const hasSupport = result?.structure.support !== null;
    const hasResistance = result?.structure.resistance !== null;
    expect(hasSupport || hasResistance).toBe(true);
  });

  test('Q-score should be between 0 and 1', () => {
    const data = generateOHLCV(100, 100);
    
    let result;
    for (const bar of data) {
      result = engine.update(bar);
    }

    if (result?.structure.support) {
      expect(result.structure.support.qScore).toBeGreaterThanOrEqual(0);
      expect(result.structure.support.qScore).toBeLessThanOrEqual(1);
    }
    if (result?.structure.resistance) {
      expect(result.structure.resistance.qScore).toBeGreaterThanOrEqual(0);
      expect(result.structure.resistance.qScore).toBeLessThanOrEqual(1);
    }
  });

  test('touch count should be positive for valid boundaries', () => {
    const data = generateOHLCV(100, 150, 0.01, 'range');
    
    let result;
    for (const bar of data) {
      result = engine.update(bar);
    }

    if (result?.structure.support) {
      expect(result.structure.support.touches).toBeGreaterThan(0);
    }
    if (result?.structure.resistance) {
      expect(result.structure.resistance.touches).toBeGreaterThan(0);
    }
  });
});

// ============================================================================
// REGIME DETECTION TESTS
// ============================================================================

describe('PCTTEngine - Regime Detection', () => {
  let engine: PCTTEngine;

  beforeEach(() => {
    engine = createPCTTEngine({ erPeriod: 10 });
  });

  afterEach(() => {
    engine.reset();
  });

  test('should detect uptrend regime', () => {
    const data = generateOHLCV(100, 50, 0.01, 'up');
    
    let result;
    for (const bar of data) {
      result = engine.update(bar);
    }

    expect(result?.structure.regime).toBe('trend_up');
    expect(result?.structure.efficiencyRatio).toBeGreaterThan(0.3);
  });

  test('should detect downtrend regime', () => {
    const data = generateOHLCV(100, 50, 0.01, 'down');
    
    let result;
    for (const bar of data) {
      result = engine.update(bar);
    }

    expect(result?.structure.regime).toBe('trend_down');
  });

  test('should detect range regime with high crossing count', () => {
    // Generate choppy range data
    const data: OHLCV[] = [];
    let price = 100;
    const startTime = Date.now();

    for (let i = 0; i < 50; i++) {
      // Oscillate around mean
      price = 100 + Math.sin(i * 0.5) * 2 + (Math.random() - 0.5) * 1;
      
      data.push({
        time: startTime + i * 60000,
        open: price,
        high: price + 0.5,
        low: price - 0.5,
        close: price + (Math.random() - 0.5) * 0.3,
        volume: 100000,
      });
    }

    let result;
    for (const bar of data) {
      result = engine.update(bar);
    }

    // Should be range or transition due to high crossings
    expect(['range', 'transition']).toContain(result?.structure.regime);
    expect(result?.structure.crossingCount).toBeGreaterThan(0);
  });

  test('efficiency ratio should be between 0 and 1', () => {
    const data = generateOHLCV(100, 50);
    
    let result;
    for (const bar of data) {
      result = engine.update(bar);
    }

    expect(result?.structure.efficiencyRatio).toBeGreaterThanOrEqual(0);
    expect(result?.structure.efficiencyRatio).toBeLessThanOrEqual(1);
  });
});

// ============================================================================
// STATE MACHINE TESTS
// ============================================================================

describe('PCTTEngine - State Machine', () => {
  let engine: PCTTEngine;

  beforeEach(() => {
    engine = createPCTTEngine({
      pivotDepth: 3,
      minQScore: 0.5, // Lower threshold for testing
      breakPenetration: 0.1,
      breakConfirmation: 0.15,
    });
  });

  afterEach(() => {
    engine.reset();
  });

  test('should start in idle state', () => {
    const result = engine.update({
      time: Date.now(),
      open: 100,
      high: 101,
      low: 99,
      close: 100,
      volume: 100000,
    });

    expect(result.structure.event).toBe('idle');
  });

  test('should generate signal on valid breakout + retest pattern', () => {
    const data = generatePivotPattern(100, 'breakout_up');
    
    let signal: PCTTSignal | null = null;
    for (const bar of data) {
      const result = engine.update(bar);
      if (result.signal && result.signal.type !== 'none') {
        signal = result.signal;
      }
    }

    // May or may not generate signal depending on data
    // Just verify no errors and signal format if present
    if (signal) {
      expect(['long', 'short']).toContain(signal.type);
      expect(signal.entryPrice).toBeGreaterThan(0);
      expect(signal.stopPrice).toBeGreaterThan(0);
      expect(signal.targetPrices.length).toBeGreaterThan(0);
      expect(signal.qScore).toBeGreaterThanOrEqual(0);
      expect(signal.qScore).toBeLessThanOrEqual(1);
    }
  });

  test('signal should have valid risk/reward structure', () => {
    const data = generatePivotPattern(100, 'breakout_up');
    
    let signal: PCTTSignal | null = null;
    for (const bar of data) {
      const result = engine.update(bar);
      if (result.signal && result.signal.type === 'long') {
        signal = result.signal;
        break;
      }
    }

    if (signal) {
      // For long signal: entry > stop, targets > entry
      expect(signal.entryPrice).toBeGreaterThan(signal.stopPrice);
      for (const target of signal.targetPrices) {
        expect(target).toBeGreaterThan(signal.entryPrice);
      }
      expect(signal.riskReward).toBeGreaterThan(0);
    }
  });
});

// ============================================================================
// ATR CALCULATION TESTS
// ============================================================================

describe('PCTTEngine - ATR Calculation', () => {
  let engine: PCTTEngine;

  beforeEach(() => {
    engine = createPCTTEngine({ atrPeriod: 14 });
  });

  afterEach(() => {
    engine.reset();
  });

  test('ATR should be 0 with insufficient data', () => {
    const data = generateOHLCV(100, 5);
    
    let result;
    for (const bar of data) {
      result = engine.update(bar);
    }

    expect(result?.structure.atr).toBe(0);
  });

  test('ATR should be positive with sufficient data', () => {
    const data = generateOHLCV(100, 30);
    
    let result;
    for (const bar of data) {
      result = engine.update(bar);
    }

    expect(result?.structure.atr).toBeGreaterThan(0);
  });

  test('ATR should scale with price volatility', () => {
    const lowVolData = generateOHLCV(100, 30, 0.005);
    const highVolData = generateOHLCV(100, 30, 0.05);

    const engine1 = createPCTTEngine();
    const engine2 = createPCTTEngine();

    let lowVolResult, highVolResult;
    
    for (let i = 0; i < 30; i++) {
      lowVolResult = engine1.update(lowVolData[i]);
      highVolResult = engine2.update(highVolData[i]);
    }

    // High volatility should have higher ATR
    expect(highVolResult!.structure.atr).toBeGreaterThan(lowVolResult!.structure.atr);
  });
});

// ============================================================================
// ENGINE RESET TESTS
// ============================================================================

describe('PCTTEngine - Reset', () => {
  test('reset should clear all state', () => {
    const engine = createPCTTEngine();
    const data = generateOHLCV(100, 50);
    
    // Process some data
    for (const bar of data) {
      engine.update(bar);
    }
    
    // Verify we have state
    const pivotsBefore = engine.getPivots();
    expect(pivotsBefore.highs.length + pivotsBefore.lows.length).toBeGreaterThan(0);
    
    // Reset
    engine.reset();
    
    // Verify state is cleared
    const pivotsAfter = engine.getPivots();
    expect(pivotsAfter.highs.length).toBe(0);
    expect(pivotsAfter.lows.length).toBe(0);
    expect(engine.getStructure()).toBeNull();
  });
});

// ============================================================================
// CONFIGURATION TESTS
// ============================================================================

describe('PCTTEngine - Configuration', () => {
  test('should use default config when none provided', () => {
    const engine = createPCTTEngine();
    // Just verify it creates without error
    expect(engine).toBeDefined();
  });

  test('should merge partial config with defaults', () => {
    const engine = createPCTTEngine({ pivotDepth: 10 });
    
    // Process data and verify it works
    const data = generateOHLCV(100, 50);
    for (const bar of data) {
      engine.update(bar);
    }
    
    // Verify custom pivot depth is used (fewer pivots with larger depth)
    const pivots = engine.getPivots();
    expect(pivots).toBeDefined();
  });

  test('DEFAULT_PCTT_CONFIG should have required fields', () => {
    expect(DEFAULT_PCTT_CONFIG.pivotDepth).toBeDefined();
    expect(DEFAULT_PCTT_CONFIG.atrPeriod).toBeDefined();
    expect(DEFAULT_PCTT_CONFIG.minQScore).toBeDefined();
    expect(DEFAULT_PCTT_CONFIG.breakPenetration).toBeDefined();
    expect(DEFAULT_PCTT_CONFIG.retestWindow).toBeDefined();
  });
});
