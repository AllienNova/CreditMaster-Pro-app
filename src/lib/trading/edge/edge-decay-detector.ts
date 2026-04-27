/**
 * Edge Decay Detector
 *
 * Monitors strategy performance degradation through 3 independent detectors:
 *   1. Rolling Sharpe decline
 *   2. Win rate decay below historical average
 *   3. Average P&L convergence toward zero
 *
 * Uses a 2-of-3 voting rule: if 2+ detectors trigger, the edge is decaying.
 * All 3 triggering escalates the recommendation to "demote".
 */

// ============================================================================
// TYPES
// ============================================================================

export interface EdgeDecayInput {
  /** Recent trade returns (newest last) */
  returns: number[];
  /** Recent win rate (0-1) */
  recentWinRate: number;
  /** Long-term historical win rate (0-1) */
  historicalWinRate: number;
  /** Recent average P&L per trade */
  recentAvgPnl: number;
  /** Historical average P&L per trade */
  historicalAvgPnl: number;
  /** Rolling Sharpe lookback window (default: 20) */
  sharpeWindow?: number;
  /** Win rate decay threshold as decimal fraction (default: 0.10) */
  winRateThreshold?: number;
  /** P&L decay threshold as fraction of historical (default: 0.25) */
  pnlThreshold?: number;
}

export interface EdgeDecayResult {
  /** True when 2+ detectors fire */
  decaying: boolean;
  /** Names of detectors that fired */
  triggeredDetectors: string[];
  /** Score per detector (0 = no decay, 1 = maximum decay) */
  scores: Record<string, number>;
  /** Graduated recommendation based on severity */
  recommendation: "continue" | "reduce_size" | "pause" | "demote";
}

// ============================================================================
// INDIVIDUAL DETECTORS
// ============================================================================

/**
 * Detector 1: Rolling Sharpe declining over a lookback window.
 *
 * Splits the returns into two equal halves and checks whether the
 * second-half Sharpe is lower than the first-half Sharpe.
 */
export function isSharpeDeclining(
  returns: number[],
  window: number = 20,
): boolean {
  if (returns.length < window) return false;

  const recent = returns.slice(-window);
  const mid = Math.floor(recent.length / 2);
  const firstHalf = recent.slice(0, mid);
  const secondHalf = recent.slice(mid);

  const sharpe1 = computeSharpe(firstHalf);
  const sharpe2 = computeSharpe(secondHalf);

  return sharpe2 < sharpe1;
}

/**
 * Detector 2: Win rate declining below historical average by more
 * than `threshold` (absolute percentage points, expressed as decimal).
 */
export function isWinRateDecaying(
  recentWinRate: number,
  historicalWinRate: number,
  threshold: number = 0.10,
): boolean {
  return historicalWinRate - recentWinRate > threshold;
}

/**
 * Detector 3: Average trade P&L declining toward zero.
 *
 * Triggers when the recent average P&L drops below `threshold` fraction
 * of the historical average P&L.
 */
export function isPnlDecaying(
  recentAvgPnl: number,
  historicalAvgPnl: number,
  threshold: number = 0.25,
): boolean {
  if (historicalAvgPnl <= 0) return recentAvgPnl <= 0;
  return recentAvgPnl / historicalAvgPnl < threshold;
}

// ============================================================================
// COMPOSITE DETECTOR
// ============================================================================

/**
 * Run all 3 detectors and produce a composite edge-decay assessment.
 *
 * - 0 triggers  -> continue
 * - 1 trigger   -> reduce_size
 * - 2 triggers  -> pause (decaying = true)
 * - 3 triggers  -> demote (decaying = true)
 */
export function detectEdgeDecay(params: EdgeDecayInput): EdgeDecayResult {
  const sharpeWindow = params.sharpeWindow ?? 20;
  const winRateThreshold = params.winRateThreshold ?? 0.10;
  const pnlThreshold = params.pnlThreshold ?? 0.25;

  const triggeredDetectors: string[] = [];
  const scores: Record<string, number> = {};

  // Detector 1: Sharpe decline
  const sharpeDeclining = isSharpeDeclining(params.returns, sharpeWindow);
  const sharpeScore = sharpeDeclining ? computeSharpeDecayScore(params.returns, sharpeWindow) : 0;
  scores["sharpe"] = sharpeScore;
  if (sharpeDeclining) triggeredDetectors.push("sharpe");

  // Detector 2: Win rate decay
  const winRateDecaying = isWinRateDecaying(
    params.recentWinRate,
    params.historicalWinRate,
    winRateThreshold,
  );
  const winRateScore = winRateDecaying
    ? computeWinRateDecayScore(params.recentWinRate, params.historicalWinRate, winRateThreshold)
    : 0;
  scores["winRate"] = winRateScore;
  if (winRateDecaying) triggeredDetectors.push("winRate");

  // Detector 3: P&L decay
  const pnlDecaying = isPnlDecaying(
    params.recentAvgPnl,
    params.historicalAvgPnl,
    pnlThreshold,
  );
  const pnlScore = pnlDecaying
    ? computePnlDecayScore(params.recentAvgPnl, params.historicalAvgPnl)
    : 0;
  scores["pnl"] = pnlScore;
  if (pnlDecaying) triggeredDetectors.push("pnl");

  // Voting
  const triggerCount = triggeredDetectors.length;
  const decaying = triggerCount >= 2;

  let recommendation: EdgeDecayResult["recommendation"];
  if (triggerCount === 0) {
    recommendation = "continue";
  } else if (triggerCount === 1) {
    recommendation = "reduce_size";
  } else if (triggerCount === 2) {
    recommendation = "pause";
  } else {
    recommendation = "demote";
  }

  return { decaying, triggeredDetectors, scores, recommendation };
}

// ============================================================================
// PRIVATE HELPERS
// ============================================================================

function computeSharpe(returns: number[]): number {
  if (returns.length < 2) return 0;
  const avg = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance =
    returns.reduce((a, b) => a + (b - avg) ** 2, 0) / (returns.length - 1);
  const std = Math.sqrt(variance);
  if (std < 1e-12) return 0;
  return avg / std;
}

function computeSharpeDecayScore(returns: number[], window: number): number {
  const recent = returns.slice(-window);
  const mid = Math.floor(recent.length / 2);
  const sharpe1 = computeSharpe(recent.slice(0, mid));
  const sharpe2 = computeSharpe(recent.slice(mid));

  if (sharpe1 <= 0) return sharpe2 <= 0 ? 0.5 : 0;
  const drop = (sharpe1 - sharpe2) / Math.abs(sharpe1);
  return Math.min(1, Math.max(0, drop));
}

function computeWinRateDecayScore(
  recentWinRate: number,
  historicalWinRate: number,
  threshold: number,
): number {
  if (historicalWinRate <= 0) return 1;
  const drop = historicalWinRate - recentWinRate;
  // Normalize: threshold = 0.5 severity, 2x threshold = 1.0 severity
  return Math.min(1, Math.max(0, drop / (2 * threshold)));
}

function computePnlDecayScore(
  recentAvgPnl: number,
  historicalAvgPnl: number,
): number {
  if (historicalAvgPnl <= 0) return recentAvgPnl <= 0 ? 1 : 0;
  const ratio = recentAvgPnl / historicalAvgPnl;
  // 0 or negative P&L = score 1, at historical level = score 0
  return Math.min(1, Math.max(0, 1 - ratio));
}
