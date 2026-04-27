/**
 * Covariance Matrix Computation
 *
 * Computes an NxN sample covariance matrix from return series using
 * a standard two-pass algorithm with NaN protection.
 *
 * Cov[i][j] = (1 / (n - 1)) * Σ (r_i_t - μ_i)(r_j_t - μ_j)
 */

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Compute the NxN sample covariance matrix from an array of return series.
 *
 * @param returns - Array of return series, one per asset. Each inner array
 *                  contains daily returns (e.g. 0.01 = +1%). All series must
 *                  have the same length.
 * @returns NxN covariance matrix where matrix[i][j] = Cov(asset_i, asset_j)
 */
export function computeCovarianceMatrix(returns: number[][]): number[][] {
  const n = returns.length;

  if (n === 0) {
    return [];
  }

  // Single asset: variance only
  if (n === 1) {
    const variance = computeVariance(returns[0]);
    return [[variance]];
  }

  // Validate all series have the same length
  const seriesLength = returns[0].length;
  for (let i = 1; i < n; i++) {
    if (returns[i].length !== seriesLength) {
      throw new Error(
        `Return series length mismatch: series 0 has ${seriesLength} observations, series ${i} has ${returns[i].length}`,
      );
    }
  }

  if (seriesLength < 2) {
    // Need at least 2 observations for sample covariance
    return Array.from({ length: n }, () => new Array<number>(n).fill(0));
  }

  // Pass 1: compute means
  const means = returns.map((series) => computeMean(series));

  // Pass 2: compute covariance entries
  const cov: number[][] = Array.from({ length: n }, () =>
    new Array<number>(n).fill(0),
  );

  for (let i = 0; i < n; i++) {
    for (let j = i; j < n; j++) {
      let sum = 0;
      for (let t = 0; t < seriesLength; t++) {
        const devI = safeNumber(returns[i][t]) - means[i];
        const devJ = safeNumber(returns[j][t]) - means[j];
        sum += devI * devJ;
      }
      const covIJ = sum / (seriesLength - 1);
      cov[i][j] = covIJ;
      cov[j][i] = covIJ; // symmetric
    }
  }

  return cov;
}

// ============================================================================
// INTERNAL HELPERS
// ============================================================================

function computeMean(values: number[]): number {
  if (values.length === 0) return 0;
  let sum = 0;
  for (const v of values) {
    sum += safeNumber(v);
  }
  return sum / values.length;
}

function computeVariance(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = computeMean(values);
  let sum = 0;
  for (const v of values) {
    const dev = safeNumber(v) - mean;
    sum += dev * dev;
  }
  return sum / (values.length - 1);
}

/** Replace NaN / Infinity with 0 for numerical safety */
function safeNumber(v: number): number {
  return Number.isFinite(v) ? v : 0;
}
