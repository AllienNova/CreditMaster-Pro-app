/**
 * 30-Law Compliance Scorer
 *
 * Evaluates trading signals against 30 compliance laws.
 * Returns a composite score (0-100) with per-law breakdown.
 */

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type {
  ComplianceContext,
  ComplianceResult,
  ComplianceViolation,
  LawId,
  LawScore,
} from "./compliance-types";
import {
  LAW_PASS_THRESHOLD,
  MIN_COMPOSITE_SCORE,
  MIN_AUTONOMOUS_SCORE,
} from "./compliance-types";
import { TRADING_LAWS } from "./law-definitions";
import { checkApplicability } from "./law-applicability";

// ============================================================================
// LAW SCORING FUNCTIONS
// ============================================================================

/**
 * Pure scoring function signature.
 * Returns 0 (total violation) to 100 (fully compliant).
 */
type LawScoringFn = (ctx: ComplianceContext) => number;

/**
 * All 30 scoring functions. Each returns 0-100 based on the compliance
 * context. Scores are proportional: partial compliance = partial score.
 */
const LAW_SCORERS: Record<LawId, LawScoringFn> = {
  // ─── Risk Management ─────────────────────────────────────────────

  "LAW-01": (ctx) => {
    // Position Size Limit: risk <= 2% of portfolio
    if (!ctx.positionSize || !ctx.portfolioValue) return 100;
    const riskPct = (ctx.positionSize / ctx.portfolioValue) * 100;
    if (riskPct <= 2) return 100;
    if (riskPct <= 3) return 70;
    if (riskPct <= 5) return 40;
    return 10;
  },

  "LAW-02": (ctx) => {
    // Stop Loss Required
    if (ctx.signalType === "hold") return 100;
    if (ctx.stopLossPrice !== undefined && ctx.stopLossPrice > 0) return 100;
    return 0;
  },

  "LAW-03": (ctx) => {
    // Daily Loss Limit
    if (ctx.dailyPnlPct === undefined || ctx.maxDailyLossPct === undefined)
      return 100;
    if (ctx.dailyPnlPct >= 0) return 100; // Not losing
    const lossRatio = Math.abs(ctx.dailyPnlPct) / ctx.maxDailyLossPct;
    if (lossRatio <= 0.5) return 100;
    if (lossRatio <= 0.75) return 70;
    if (lossRatio <= 1.0) return 40;
    return 0; // Exceeded limit
  },

  "LAW-04": (ctx) => {
    // Max Open Positions
    if (ctx.openPositions === undefined || ctx.maxPositions === undefined)
      return 100;
    if (ctx.openPositions < ctx.maxPositions) return 100;
    if (ctx.openPositions === ctx.maxPositions) return 30;
    return 0; // Over limit
  },

  "LAW-05": (ctx) => {
    // Portfolio Heat: total risk <= 6%
    if (!ctx.positionSize || !ctx.portfolioValue) return 100;
    const riskPct = (ctx.positionSize / ctx.portfolioValue) * 100;
    // Approximate portfolio heat from position size + existing positions
    const estimatedHeat = riskPct * (1 + (ctx.openPositions ?? 0) * 0.3);
    if (estimatedHeat <= 6) return 100;
    if (estimatedHeat <= 8) return 70;
    if (estimatedHeat <= 10) return 40;
    return 10;
  },

  "LAW-06": (ctx) => {
    // Drawdown Protection
    if (ctx.dailyPnlPct === undefined) return 100;
    // Use accumulated daily P&L as proxy for drawdown
    if (ctx.dailyPnlPct >= 0) return 100;
    const drawdownPct = Math.abs(ctx.dailyPnlPct);
    if (drawdownPct <= 5) return 100;
    if (drawdownPct <= 10) return 70;
    if (drawdownPct <= 15) return 40;
    return 20;
  },

  // ─── Position Sizing ─────────────────────────────────────────────

  "LAW-07": (ctx) => {
    // ATR-Based Sizing
    if (ctx.atr === undefined || !ctx.positionSize || !ctx.currentPrice)
      return 100;
    // Ideal: position size = portfolio * 1% / ATR (gives 1R risk)
    const atrPct = (ctx.atr / ctx.currentPrice) * 100;
    if (atrPct <= 0) return 100;
    // Check if position size is calibrated: not too large vs ATR
    const impliedRisk = ctx.positionSize * (atrPct / 100);
    const portfolioRiskPct = ctx.portfolioValue
      ? (impliedRisk / ctx.portfolioValue) * 100
      : 0;
    if (portfolioRiskPct <= 2) return 100;
    if (portfolioRiskPct <= 3) return 70;
    if (portfolioRiskPct <= 5) return 40;
    return 20;
  },

  "LAW-08": (ctx) => {
    // Risk/Reward Minimum (>= 1.5:1)
    if (ctx.riskRewardRatio === undefined) return 100;
    if (ctx.riskRewardRatio >= 2.0) return 100;
    if (ctx.riskRewardRatio >= 1.5) return 70;
    if (ctx.riskRewardRatio >= 1.0) return 40;
    return 0;
  },

  "LAW-09": (ctx) => {
    // Scaling Rules: don't add to losing positions
    // If the current price is below stop loss for a buy, it's a losing add
    if (ctx.signalType !== "buy") return 100;
    if (ctx.stopLossPrice === undefined) return 80; // Can't determine
    if (ctx.currentPrice >= ctx.stopLossPrice) return 100; // Above stop = OK
    return 20; // Price below stop means adding to a loser
  },

  "LAW-10": (ctx) => {
    // Concentration Limit: no single position > 20% of portfolio
    if (!ctx.positionSize || !ctx.portfolioValue) return 100;
    const concentrationPct = (ctx.positionSize / ctx.portfolioValue) * 100;
    if (concentrationPct <= 15) return 100;
    if (concentrationPct <= 20) return 70;
    if (concentrationPct <= 25) return 30;
    return 0;
  },

  // ─── Entry Criteria ──────────────────────────────────────────────

  "LAW-11": (ctx) => {
    // Regime Alignment
    if (!ctx.regimeType) return 80; // No regime data = neutral score
    const regime = ctx.regimeType.toLowerCase();

    if (ctx.signalType === "buy") {
      if (regime.includes("trend_up") || regime.includes("bullish")) return 100;
      if (regime.includes("range") || regime.includes("transition")) return 60;
      if (regime.includes("trend_down") || regime.includes("bearish")) return 20;
    }
    if (ctx.signalType === "sell") {
      if (regime.includes("trend_down") || regime.includes("bearish"))
        return 100;
      if (regime.includes("range") || regime.includes("transition")) return 60;
      if (regime.includes("trend_up") || regime.includes("bullish")) return 20;
    }
    return 50; // Neutral/unknown regime
  },

  "LAW-12": (ctx) => {
    // Signal Strength Minimum
    if (ctx.signalStrength >= 80) return 100;
    if (ctx.signalStrength >= 60) return 80;
    if (ctx.signalStrength >= 40) return 50;
    if (ctx.signalStrength >= 20) return 30;
    return 10;
  },

  "LAW-13": (ctx) => {
    // Volume Confirmation
    if (ctx.relativeVolume === undefined) return 100;
    if (ctx.relativeVolume >= 1.5) return 100; // Strong volume
    if (ctx.relativeVolume >= 1.0) return 80; // Average volume
    if (ctx.relativeVolume >= 0.7) return 50; // Below average
    return 20; // Very low volume
  },

  "LAW-14": (ctx) => {
    // Multi-Timeframe Alignment
    // Use signal strength as proxy (strong signals typically align across TFs)
    if (ctx.signalStrength >= 75) return 100;
    if (ctx.signalStrength >= 50) return 70;
    return 40;
  },

  "LAW-15": (ctx) => {
    // No Counter-Trend Entries
    if (!ctx.regimeType) return 70; // No data = cautious pass
    const regime = ctx.regimeType.toLowerCase();
    const isBuy = ctx.signalType === "buy";
    const isSell = ctx.signalType === "sell";

    // Counter-trend: buy in downtrend, sell in uptrend
    if (isBuy && (regime.includes("trend_down") || regime.includes("bearish")))
      return 20;
    if (isSell && (regime.includes("trend_up") || regime.includes("bullish")))
      return 20;
    return 100; // Aligned with trend or neutral
  },

  "LAW-16": (ctx) => {
    // Earnings Blackout
    // We don't have earnings data directly, use additionalContext
    const daysToEarnings = ctx.additionalContext?.daysToEarnings as
      | number
      | undefined;
    if (daysToEarnings === undefined) return 80; // No data = cautious pass
    if (Math.abs(daysToEarnings) >= 3) return 100; // Safe distance
    if (Math.abs(daysToEarnings) >= 2) return 50; // Borderline
    return 10; // Too close to earnings
  },

  // ─── Exit Criteria ───────────────────────────────────────────────

  "LAW-17": (ctx) => {
    // Trailing Stop (applies to holds)
    // Check if a stop loss is set (serves as trailing stop proxy)
    if (ctx.stopLossPrice !== undefined && ctx.stopLossPrice > 0) return 100;
    return 30; // No trailing stop protection
  },

  "LAW-18": (ctx) => {
    // Time-Based Exit
    if (ctx.daysSinceLastTrade === undefined) return 80;
    if (ctx.daysSinceLastTrade <= 10) return 100; // Fresh position
    if (ctx.daysSinceLastTrade <= 20) return 70; // Getting stale
    if (ctx.daysSinceLastTrade <= 30) return 40;
    return 20; // Overly stale position
  },

  "LAW-19": (ctx) => {
    // Target Respect
    if (ctx.takeProfitPrice === undefined) return 60; // No target set = partial score
    if (ctx.takeProfitPrice > 0) return 100; // Target is set
    return 40;
  },

  "LAW-20": (ctx) => {
    // Cut Losers Early
    if (ctx.stopLossPrice === undefined) return 40; // No stop = poor compliance
    if (ctx.currentPrice >= ctx.stopLossPrice) return 100; // Not currently losing
    // How far below stop are we?
    const lossFromStop =
      ((ctx.stopLossPrice - ctx.currentPrice) / ctx.stopLossPrice) * 100;
    if (lossFromStop <= 1) return 70;
    if (lossFromStop <= 3) return 40;
    return 10; // Significant loss beyond stop
  },

  // ─── Market Structure ────────────────────────────────────────────

  "LAW-21": (ctx) => {
    // Market Hours
    if (ctx.extendedHours === undefined) return 100; // No data = assume normal
    if (!ctx.extendedHours) return 100; // During regular hours
    // Extended hours trading is penalized
    return 0;
  },

  "LAW-22": (ctx) => {
    // Liquidity Check
    if (ctx.relativeVolume === undefined) return 80;
    if (ctx.relativeVolume >= 0.5) return 100; // Adequate liquidity
    if (ctx.relativeVolume >= 0.3) return 50;
    return 20; // Illiquid
  },

  "LAW-23": (ctx) => {
    // Spread Check
    // Use ATR as proxy for typical spread conditions
    if (ctx.atr === undefined || ctx.currentPrice <= 0) return 80;
    const atrPct = (ctx.atr / ctx.currentPrice) * 100;
    if (atrPct <= 2) return 100; // Tight conditions
    if (atrPct <= 4) return 70;
    if (atrPct <= 8) return 40;
    return 20; // Wide spreads likely
  },

  "LAW-24": (ctx) => {
    // Volatility Filter
    if (ctx.atr === undefined || ctx.currentPrice <= 0) return 80;
    const atrPct = (ctx.atr / ctx.currentPrice) * 100;
    if (atrPct <= 3) return 100; // Normal volatility
    if (atrPct <= 5) return 70; // Elevated
    if (atrPct <= 8) return 40; // High
    return 10; // Extreme volatility
  },

  // ─── Portfolio Management ────────────────────────────────────────

  "LAW-25": (ctx) => {
    // Sector Diversification: no more than 30% in one sector
    if (!ctx.sector || !ctx.existingSectors) return 100;
    const sectorCount = ctx.existingSectors.filter(
      (s) => s === ctx.sector,
    ).length;
    const totalPositions = ctx.existingSectors.length + 1; // +1 for proposed
    const sectorPct = ((sectorCount + 1) / totalPositions) * 100;
    if (sectorPct <= 25) return 100;
    if (sectorPct <= 30) return 70;
    if (sectorPct <= 40) return 40;
    return 10;
  },

  "LAW-26": (ctx) => {
    // Correlation Check
    if (ctx.portfolioCorrelation === undefined) return 100;
    const absCorr = Math.abs(ctx.portfolioCorrelation);
    if (absCorr <= 0.3) return 100; // Low correlation
    if (absCorr <= 0.5) return 80;
    if (absCorr <= 0.7) return 50;
    if (absCorr <= 0.85) return 30;
    return 10; // Highly correlated
  },

  "LAW-27": (ctx) => {
    // Rebalance Trigger
    // If we have position size and portfolio data, check deviation
    if (!ctx.positionSize || !ctx.portfolioValue) return 80;
    const positionPct = (ctx.positionSize / ctx.portfolioValue) * 100;
    // Target is equal-weight: 100 / (openPositions + 1)
    const targetPct = 100 / ((ctx.openPositions ?? 0) + 1);
    const deviation = Math.abs(positionPct - targetPct);
    if (deviation <= 3) return 100;
    if (deviation <= 5) return 70;
    if (deviation <= 10) return 40;
    return 20;
  },

  // ─── Behavioral ──────────────────────────────────────────────────

  "LAW-28": (ctx) => {
    // Cooldown Period: minimum 1 day between trades on same symbol
    if (ctx.daysSinceLastTrade === undefined) return 100;
    if (ctx.daysSinceLastTrade >= 1) return 100;
    return 20; // Trading too frequently on same symbol
  },

  "LAW-29": (ctx) => {
    // Revenge Trading: don't increase size after a loss
    if (ctx.dailyPnlPct === undefined) return 100;
    if (ctx.dailyPnlPct >= 0) return 100; // Not losing today
    // Losing today — penalize proportionally
    const lossPct = Math.abs(ctx.dailyPnlPct);
    if (lossPct <= 0.5) return 80;
    if (lossPct <= 1.0) return 60;
    if (lossPct <= 2.0) return 40;
    return 20; // Heavy losses — likely revenge trading
  },

  // ─── Execution ───────────────────────────────────────────────────

  "LAW-30": (_ctx) => {
    // Compliance Score Gate — this is evaluated AFTER composite score
    // It's a meta-law: always returns 100 here, composite check is done
    // separately in the shouldBlock logic.
    return 100;
  },
};

// ============================================================================
// REMEDIATION MESSAGES
// ============================================================================

const LAW_REMEDIATIONS: Record<LawId, string> = {
  "LAW-01": "Reduce position size to 2% or less of portfolio value",
  "LAW-02": "Set a stop loss before entering the trade",
  "LAW-03": "Stop trading for the day or reduce position sizes",
  "LAW-04": "Close an existing position before opening a new one",
  "LAW-05": "Reduce total portfolio exposure or add hedges",
  "LAW-06": "Reduce position sizes proportionally to current drawdown",
  "LAW-07": "Recalculate position size using ATR-based formula",
  "LAW-08": "Find a better entry with improved risk/reward ratio",
  "LAW-09": "Only add to positions that are in profit",
  "LAW-10": "Split the order across multiple positions or reduce size",
  "LAW-11": "Wait for regime confirmation before entering",
  "LAW-12": "Wait for a stronger signal before acting",
  "LAW-13": "Wait for volume to pick up before entering",
  "LAW-14": "Confirm the signal on higher timeframes",
  "LAW-15": "Trade with the trend, not against it",
  "LAW-16": "Wait until after the earnings release to trade",
  "LAW-17": "Add a trailing stop to protect profits",
  "LAW-18": "Consider closing stale positions that are not moving",
  "LAW-19": "Set a profit target for the position",
  "LAW-20": "Exit the losing position promptly",
  "LAW-21": "Wait for regular market hours to place the trade",
  "LAW-22": "Choose a more liquid instrument or wait for better conditions",
  "LAW-23": "Use limit orders to avoid paying excessive spread",
  "LAW-24": "Wait for volatility to normalize before trading",
  "LAW-25": "Diversify into a different sector",
  "LAW-26": "Choose a less correlated instrument",
  "LAW-27": "Rebalance the portfolio toward target allocation",
  "LAW-28": "Wait for the cooldown period to expire",
  "LAW-29": "Take a break from trading to avoid emotional decisions",
  "LAW-30": "Review and resolve individual law violations to improve score",
};

// ============================================================================
// COMPLIANCE SCORER CLASS
// ============================================================================

export class ComplianceScorer {
  /**
   * Evaluate a trading signal against all applicable laws.
   *
   * This is the main entry point for compliance evaluation.
   * It determines which laws apply, scores each one, computes
   * the weighted composite, and returns a full result.
   */
  evaluateSignal(context: ComplianceContext): ComplianceResult {
    // 1. Determine applicable laws
    const applicability = checkApplicability(context);

    // 2. Score each applicable law
    const lawScores: Record<string, LawScore> = {};
    const violations: ComplianceViolation[] = [];
    let passingCount = 0;
    let failingCount = 0;

    for (const lawId of applicability.applicableLaws) {
      const law = TRADING_LAWS[lawId];
      const scorer = LAW_SCORERS[lawId];
      const score = Math.max(0, Math.min(100, scorer(context)));
      const passed = score >= LAW_PASS_THRESHOLD;

      lawScores[lawId] = {
        lawId,
        score,
        applicable: true,
        weight: law.weight,
        passed,
        details: this.buildLawDetails(lawId, score, passed),
      };

      if (passed) {
        passingCount++;
      } else {
        failingCount++;
        violations.push({
          lawId,
          lawName: law.name,
          severity: law.violationSeverity,
          score,
          threshold: LAW_PASS_THRESHOLD,
          details: this.buildLawDetails(lawId, score, passed),
          remediation: LAW_REMEDIATIONS[lawId],
        });
      }
    }

    // 3. Add non-applicable laws to the record (for completeness)
    for (const { lawId } of applicability.skippedLaws) {
      const law = TRADING_LAWS[lawId];
      lawScores[lawId] = {
        lawId,
        score: 0,
        applicable: false,
        weight: law.weight,
        passed: false,
        details: "Not applicable to this signal",
      };
    }

    // 4. Compute weighted composite score (only from applicable laws)
    const compositeScore = this.computeCompositeScore(
      applicability.applicableLaws,
      lawScores as Record<LawId, LawScore>,
    );

    // 5. Determine critical/blocking status
    const hasCriticalViolation = violations.some(
      (v) => v.severity === "critical" || v.severity === "blocking",
    );

    // 6. Determine if trade should be blocked
    const shouldBlock = this.determineShouldBlock(
      compositeScore,
      violations,
      context.operatingMode,
    );

    // 7. Build summary
    const summary = this.buildSummary(
      compositeScore,
      applicability.totalApplicable,
      passingCount,
      failingCount,
      shouldBlock,
      context,
    );

    const result: ComplianceResult = {
      compositeScore,
      lawScores: lawScores as Record<LawId, LawScore>,
      applicableLaws: applicability.totalApplicable,
      passingLaws: passingCount,
      failingLaws: failingCount,
      violations,
      hasCriticalViolation,
      shouldBlock,
      summary,
      context: {
        symbol: context.symbol,
        signalType: context.signalType,
        operatingMode: context.operatingMode,
      },
    };

    // 8. Persist to DB (fire-and-forget)
    this.persistResult(context.userId, context.signalId ?? null, result).catch(
      () => {
        // DB persistence failure should never block scoring
      },
    );

    return result;
  }

  // ────────────────────────────────────────────────────────────────

  /**
   * Compute a weighted average of applicable law scores.
   */
  private computeCompositeScore(
    applicableLawIds: LawId[],
    lawScores: Record<LawId, LawScore>,
  ): number {
    if (applicableLawIds.length === 0) return 100; // No laws = fully compliant

    let weightedSum = 0;
    let totalWeight = 0;

    for (const lawId of applicableLawIds) {
      const ls = lawScores[lawId];
      if (!ls) continue;
      weightedSum += ls.score * ls.weight;
      totalWeight += ls.weight;
    }

    if (totalWeight === 0) return 100;
    return Math.round((weightedSum / totalWeight) * 100) / 100;
  }

  /**
   * Determine whether the trade should be blocked based on:
   * - Composite score vs minimum thresholds
   * - Any blocking-severity violations
   * - Mode-dependent stricter thresholds
   */
  private determineShouldBlock(
    compositeScore: number,
    violations: ComplianceViolation[],
    operatingMode: string,
  ): boolean {
    // Any blocking violation immediately blocks
    const hasBlockingViolation = violations.some(
      (v) => v.severity === "blocking",
    );
    if (hasBlockingViolation) return true;

    // Any critical violation from a blocking-capable law blocks
    const hasCriticalBlockingLaw = violations.some((v) => {
      if (v.severity !== "critical") return false;
      const law = TRADING_LAWS[v.lawId];
      return law?.canBlock === true;
    });
    if (hasCriticalBlockingLaw) return true;

    // Mode-dependent score thresholds
    if (operatingMode === "autonomous") {
      return compositeScore < MIN_AUTONOMOUS_SCORE;
    }

    return compositeScore < MIN_COMPOSITE_SCORE;
  }

  /**
   * Build a human-readable details string for a single law score.
   */
  private buildLawDetails(
    lawId: LawId,
    score: number,
    passed: boolean,
  ): string {
    const law = TRADING_LAWS[lawId];
    const status = passed ? "PASS" : "FAIL";
    return `${law.name}: ${score}/100 (${status}) - ${law.description}`;
  }

  /**
   * Build a summary string for the entire compliance result.
   */
  private buildSummary(
    compositeScore: number,
    applicableLaws: number,
    passingLaws: number,
    failingLaws: number,
    shouldBlock: boolean,
    context: ComplianceContext,
  ): string {
    const action = shouldBlock ? "BLOCKED" : "ALLOWED";
    return (
      `${context.symbol} ${context.signalType.toUpperCase()} signal scored ` +
      `${compositeScore.toFixed(1)}/100 (${action}). ` +
      `${passingLaws}/${applicableLaws} laws passed, ` +
      `${failingLaws} violations. ` +
      `Mode: ${context.operatingMode}.`
    );
  }

  /**
   * Persist the compliance result to the database (fire-and-forget).
   * Never throws — DB errors are silently swallowed.
   */
  async persistResult(
    userId: string,
    signalId: string | null,
    result: ComplianceResult,
  ): Promise<void> {
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey =
        process.env.SUPABASE_SERVICE_ROLE_KEY ??
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      if (!supabaseUrl || !supabaseKey) return;

      const client = createSupabaseClient(supabaseUrl, supabaseKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });

      await client.from("compliance_scores").insert({
        user_id: userId,
        signal_id: signalId,
        composite_score: result.compositeScore,
        law_scores: result.lawScores,
        applicable_laws: result.applicableLaws,
        passing_laws: result.passingLaws,
        failing_laws: result.failingLaws,
        violations: result.violations,
        has_critical_violation: result.hasCriticalViolation,
        symbol: result.context.symbol,
        signal_type: result.context.signalType,
        operating_mode: result.context.operatingMode,
      });
    } catch {
      // DB persistence failure is non-fatal
    }
  }
}

// ============================================================================
// FACTORY + SINGLETON
// ============================================================================

let _instance: ComplianceScorer | null = null;

/**
 * Create or return the singleton ComplianceScorer instance.
 */
export function createComplianceScorer(): ComplianceScorer {
  if (!_instance) {
    _instance = new ComplianceScorer();
  }
  return _instance;
}

/**
 * Reset the singleton (useful for testing).
 */
export function resetComplianceScorer(): void {
  _instance = null;
}
