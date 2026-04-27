/**
 * Q-Score Calibrator — Platt Scaling
 *
 * Transforms raw Q-Score outputs into calibrated probabilities using
 * Platt's sigmoid method: P(y=1|f) = 1 / (1 + exp(A*f + B)).
 *
 * The parameters A and B are fitted via gradient descent on a
 * cross-entropy loss, and validated with the Brier score.
 */

// ============================================================================
// TYPES
// ============================================================================

export interface PlattParams {
  A: number;
  B: number;
  nSamples: number;
  brierScore: number;
}

export interface CalibrationMetrics {
  brierScore: number;
  reliabilityBins: ReliabilityBin[];
  meanPrediction: number;
  meanOutcome: number;
}

export interface ReliabilityBin {
  binStart: number;
  binEnd: number;
  meanPredicted: number;
  meanActual: number;
  count: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_LEARNING_RATE = 0.01;
const DEFAULT_MAX_ITERATIONS = 5000;
const DEFAULT_CONVERGENCE_THRESHOLD = 1e-8;
const DEFAULT_NUM_BINS = 10;

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Fit Platt scaling parameters (A, B) using gradient descent on
 * the negative log-likelihood (cross-entropy) loss.
 *
 * calibrated_prob = sigmoid(A * rawScore + B)
 *
 * @param predictions - Raw Q-Score predictions in [0, 1]
 * @param actuals     - Binary outcomes (true = positive, false = negative)
 * @returns Fitted PlattParams with Brier score on training data
 */
export function calibrate(predictions: number[], actuals: boolean[]): PlattParams {
  if (predictions.length !== actuals.length) {
    throw new Error(
      `Length mismatch: ${predictions.length} predictions vs ${actuals.length} actuals`,
    );
  }

  const n = predictions.length;
  if (n === 0) {
    return { A: -1, B: 0, nSamples: 0, brierScore: 1 };
  }

  // Target probabilities with Platt's label smoothing to avoid log(0)
  const nPos = actuals.filter((a) => a).length;
  const nNeg = n - nPos;
  const tPos = nPos > 0 ? (nPos + 1) / (nPos + 2) : 0.5;
  const tNeg = nNeg > 0 ? 1 / (nNeg + 2) : 0.5;
  const targets = actuals.map((a) => (a ? tPos : tNeg));

  // Initialize A, B
  let A = 0;
  let B = 0;
  let prevLoss = Infinity;

  for (let iter = 0; iter < DEFAULT_MAX_ITERATIONS; iter++) {
    let gradA = 0;
    let gradB = 0;
    let loss = 0;

    for (let i = 0; i < n; i++) {
      const f = predictions[i];
      const t = targets[i];
      const p = sigmoid(A * f + B);

      // Cross-entropy loss
      const pClamped = clamp(p, 1e-12, 1 - 1e-12);
      loss += -(t * Math.log(pClamped) + (1 - t) * Math.log(1 - pClamped));

      // Gradients
      const diff = p - t;
      gradA += diff * f;
      gradB += diff;
    }

    loss /= n;
    gradA /= n;
    gradB /= n;

    // Gradient descent step
    A -= DEFAULT_LEARNING_RATE * gradA;
    B -= DEFAULT_LEARNING_RATE * gradB;

    // Check convergence
    if (Math.abs(prevLoss - loss) < DEFAULT_CONVERGENCE_THRESHOLD) {
      break;
    }
    prevLoss = loss;
  }

  // Compute Brier score on training data
  const brierScore = computeBrierScore(predictions, actuals, A, B);

  return { A, B, nSamples: n, brierScore };
}

/**
 * Apply Platt calibration to a raw Q-Score.
 * Returns a calibrated probability in [0, 1].
 */
export function applyCalibration(rawQScore: number, params: PlattParams): number {
  return sigmoid(params.A * rawQScore + params.B);
}

/**
 * Validate calibration on a held-out test set.
 * Returns Brier score and reliability diagram bins.
 */
export function validateCalibration(
  params: PlattParams,
  testPredictions: number[],
  testActuals: boolean[],
): CalibrationMetrics {
  if (testPredictions.length !== testActuals.length) {
    throw new Error(
      `Length mismatch: ${testPredictions.length} predictions vs ${testActuals.length} actuals`,
    );
  }

  const n = testPredictions.length;
  if (n === 0) {
    return { brierScore: 1, reliabilityBins: [], meanPrediction: 0, meanOutcome: 0 };
  }

  // Calibrated predictions
  const calibrated = testPredictions.map((p) => applyCalibration(p, params));
  const outcomes = testActuals.map((a) => (a ? 1 : 0));

  // Brier score
  let brierSum = 0;
  let predSum = 0;
  let outcomeSum = 0;

  for (let i = 0; i < n; i++) {
    brierSum += (calibrated[i] - outcomes[i]) ** 2;
    predSum += calibrated[i];
    outcomeSum += outcomes[i];
  }

  const brierScore = brierSum / n;

  // Reliability diagram bins
  const reliabilityBins = buildReliabilityBins(calibrated, outcomes, DEFAULT_NUM_BINS);

  return {
    brierScore,
    reliabilityBins,
    meanPrediction: predSum / n,
    meanOutcome: outcomeSum / n,
  };
}

// ============================================================================
// INTERNAL HELPERS
// ============================================================================

function sigmoid(x: number): number {
  if (x >= 0) {
    return 1 / (1 + Math.exp(-x));
  }
  // Numerically stable form for negative x
  const expX = Math.exp(x);
  return expX / (1 + expX);
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function computeBrierScore(
  predictions: number[],
  actuals: boolean[],
  A: number,
  B: number,
): number {
  const n = predictions.length;
  if (n === 0) return 1;

  let sum = 0;
  for (let i = 0; i < n; i++) {
    const p = sigmoid(A * predictions[i] + B);
    const y = actuals[i] ? 1 : 0;
    sum += (p - y) ** 2;
  }
  return sum / n;
}

function buildReliabilityBins(
  calibrated: number[],
  outcomes: number[],
  numBins: number,
): ReliabilityBin[] {
  const bins: ReliabilityBin[] = [];
  const binWidth = 1 / numBins;

  for (let b = 0; b < numBins; b++) {
    const binStart = b * binWidth;
    const binEnd = (b + 1) * binWidth;

    let predSum = 0;
    let actualSum = 0;
    let count = 0;

    for (let i = 0; i < calibrated.length; i++) {
      if (calibrated[i] >= binStart && (calibrated[i] < binEnd || (b === numBins - 1 && calibrated[i] <= binEnd))) {
        predSum += calibrated[i];
        actualSum += outcomes[i];
        count++;
      }
    }

    bins.push({
      binStart,
      binEnd,
      meanPredicted: count > 0 ? predSum / count : (binStart + binEnd) / 2,
      meanActual: count > 0 ? actualSum / count : 0,
      count,
    });
  }

  return bins;
}
