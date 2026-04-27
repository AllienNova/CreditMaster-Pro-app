/**
 * Q-Score Calibrator — Unit Tests
 */

import {
  calibrate,
  applyCalibration,
  validateCalibration,
} from "../q-score-calibrator";
import type { PlattParams } from "../q-score-calibrator";

// ============================================================================
// CALIBRATE TESTS
// ============================================================================

describe("calibrate", () => {
  it("fits parameters on a well-separated dataset", () => {
    // High predictions for true, low for false
    const predictions = [0.9, 0.85, 0.8, 0.75, 0.2, 0.15, 0.1, 0.05];
    const actuals = [true, true, true, true, false, false, false, false];

    const params = calibrate(predictions, actuals);

    expect(params.nSamples).toBe(8);
    expect(Number.isFinite(params.A)).toBe(true);
    expect(Number.isFinite(params.B)).toBe(true);
    expect(params.brierScore).toBeLessThan(0.3);
  });

  it("produces low Brier score for perfectly calibrated data", () => {
    // Create data where predictions match outcomes well
    const predictions: number[] = [];
    const actuals: boolean[] = [];

    for (let i = 0; i < 100; i++) {
      const p = i / 100;
      predictions.push(p);
      actuals.push(p > 0.5);
    }

    const params = calibrate(predictions, actuals);
    expect(params.brierScore).toBeLessThan(0.3);
    expect(params.nSamples).toBe(100);
  });

  it("handles all-true actuals", () => {
    const predictions = [0.8, 0.6, 0.7, 0.9];
    const actuals = [true, true, true, true];

    const params = calibrate(predictions, actuals);
    expect(Number.isFinite(params.A)).toBe(true);
    expect(Number.isFinite(params.B)).toBe(true);
    expect(Number.isFinite(params.brierScore)).toBe(true);
  });

  it("handles all-false actuals", () => {
    const predictions = [0.2, 0.3, 0.1, 0.4];
    const actuals = [false, false, false, false];

    const params = calibrate(predictions, actuals);
    expect(Number.isFinite(params.A)).toBe(true);
    expect(Number.isFinite(params.B)).toBe(true);
  });

  it("returns defaults for empty input", () => {
    const params = calibrate([], []);
    expect(params.nSamples).toBe(0);
    expect(params.brierScore).toBe(1);
  });

  it("throws on length mismatch", () => {
    expect(() => calibrate([0.5, 0.6], [true])).toThrow("Length mismatch");
  });
});

// ============================================================================
// APPLY CALIBRATION TESTS
// ============================================================================

describe("applyCalibration", () => {
  it("returns a value in [0, 1]", () => {
    const params: PlattParams = { A: -2, B: 1, nSamples: 100, brierScore: 0.1 };

    for (const score of [0, 0.1, 0.25, 0.5, 0.75, 0.9, 1.0]) {
      const calibrated = applyCalibration(score, params);
      expect(calibrated).toBeGreaterThanOrEqual(0);
      expect(calibrated).toBeLessThanOrEqual(1);
    }
  });

  it("is monotonic with positive A (higher score -> higher probability)", () => {
    const params: PlattParams = { A: 3, B: -1, nSamples: 50, brierScore: 0.1 };

    const low = applyCalibration(0.2, params);
    const mid = applyCalibration(0.5, params);
    const high = applyCalibration(0.8, params);

    expect(high).toBeGreaterThan(mid);
    expect(mid).toBeGreaterThan(low);
  });

  it("returns 0.5 when A*f + B = 0", () => {
    const params: PlattParams = { A: -2, B: 1, nSamples: 10, brierScore: 0.1 };
    // A*f + B = 0 when f = -B/A = -1/-2 = 0.5
    const result = applyCalibration(0.5, params);
    expect(result).toBeCloseTo(0.5, 5);
  });
});

// ============================================================================
// VALIDATE CALIBRATION TESTS
// ============================================================================

describe("validateCalibration", () => {
  it("computes Brier score on test set", () => {
    const params: PlattParams = { A: -4, B: 2, nSamples: 50, brierScore: 0.1 };

    const testPreds = [0.9, 0.8, 0.7, 0.3, 0.2, 0.1];
    const testActuals = [true, true, true, false, false, false];

    const metrics = validateCalibration(params, testPreds, testActuals);

    expect(metrics.brierScore).toBeGreaterThanOrEqual(0);
    expect(metrics.brierScore).toBeLessThanOrEqual(1);
    expect(metrics.reliabilityBins.length).toBe(10);
    expect(Number.isFinite(metrics.meanPrediction)).toBe(true);
    expect(Number.isFinite(metrics.meanOutcome)).toBe(true);
  });

  it("returns perfect Brier score for perfect calibration", () => {
    // Identity calibration: A=0, B=0 → sigmoid(0) = 0.5 for all inputs
    // This won't be perfect. Instead, test with params that closely match the data.
    const predictions = [0.9, 0.9, 0.1, 0.1];
    const actuals = [true, true, false, false];

    const params = calibrate(predictions, actuals);
    const metrics = validateCalibration(params, predictions, actuals);

    // Should be very low since training and test are the same
    expect(metrics.brierScore).toBeLessThan(0.15);
  });

  it("throws on length mismatch", () => {
    const params: PlattParams = { A: -1, B: 0, nSamples: 10, brierScore: 0.1 };
    expect(() => validateCalibration(params, [0.5], [true, false])).toThrow("Length mismatch");
  });

  it("returns defaults for empty test set", () => {
    const params: PlattParams = { A: -1, B: 0, nSamples: 10, brierScore: 0.1 };
    const metrics = validateCalibration(params, [], []);
    expect(metrics.brierScore).toBe(1);
    expect(metrics.reliabilityBins.length).toBe(0);
  });

  it("reliability bins cover [0, 1]", () => {
    const params: PlattParams = { A: -3, B: 1.5, nSamples: 50, brierScore: 0.1 };
    const preds = Array.from({ length: 20 }, (_, i) => i / 20);
    const actuals = preds.map((p) => p > 0.5);

    const metrics = validateCalibration(params, preds, actuals);

    expect(metrics.reliabilityBins[0].binStart).toBe(0);
    expect(metrics.reliabilityBins[metrics.reliabilityBins.length - 1].binEnd).toBe(1);

    const totalCount = metrics.reliabilityBins.reduce((s, b) => s + b.count, 0);
    expect(totalCount).toBe(20);
  });
});
