/**
 * PCTT Explainable AI Module
 *
 * Provides human-readable explanations for PCTT trading decisions:
 * - Real-time decision narration
 * - Visual indicators for chart overlay
 * - Confidence breakdowns
 * - Risk factor explanations
 * - Trade rationale generation
 */

import type {
  StructureObject,
  PCTTSignal,
  BoundaryLine,
  PCTTEvent,
} from "./pctt-core";

// ============================================================================
// TYPES
// ============================================================================

export interface DecisionExplanation {
  summary: string; // One-line summary
  narrative: string; // Detailed explanation
  factors: DecisionFactor[]; // Contributing factors
  confidence: ConfidenceBreakdown; // How confidence was calculated
  risks: RiskExplanation[]; // Risk factors
  visualCues: VisualCue[]; // Chart overlay indicators
  timestamp: Date;
}

export interface DecisionFactor {
  name: string;
  value: number | string;
  impact: "positive" | "negative" | "neutral";
  weight: number; // 0-1 contribution to decision
  explanation: string;
}

export interface ConfidenceBreakdown {
  overall: number; // 0-100
  components: {
    structureQuality: number; // Q-score contribution
    regimeAlignment: number; // Regime suitability
    eventTiming: number; // Entry timing quality
    riskReward: number; // R:R attractiveness
    volumeConfirmation?: number; // Volume support
  };
  adjustments: {
    factor: string;
    adjustment: number;
    reason: string;
  }[];
}

export interface RiskExplanation {
  type: "structural" | "timing" | "market" | "execution";
  level: "low" | "medium" | "high";
  description: string;
  mitigation?: string;
}

export interface VisualCue {
  type: "zone" | "level" | "arrow" | "text" | "highlight";
  position: { x: number; y: number } | { price: number; barIndex: number };
  color: string;
  label?: string;
  tooltip?: string;
}

export interface TradeNarrative {
  setup: string; // What pattern formed
  trigger: string; // What triggered the signal
  execution: string; // How to execute
  management: string; // How to manage the trade
  invalidation: string; // When the trade is invalid
}

export interface LiveCommentary {
  currentState: string;
  watchingFor: string[];
  recentEvents: { time: Date; event: string }[];
  nextActions: string[];
}

// ============================================================================
// EXPLANATION TEMPLATES
// ============================================================================

const REGIME_DESCRIPTIONS: Record<string, string> = {
  trend_up:
    "The market is in an uptrend with strong directional momentum. Price is making higher highs and higher lows.",
  trend_down:
    "The market is in a downtrend with bearish momentum. Price is making lower highs and lower lows.",
  range:
    "The market is range-bound, oscillating between support and resistance without clear direction.",
  transition:
    "The market is transitioning between regimes. Direction is unclear and caution is warranted.",
};

const EVENT_DESCRIPTIONS: Record<PCTTEvent, string> = {
  idle: "No active pattern. Waiting for structure to develop.",
  break_up: "Price has broken above resistance. Monitoring for confirmation.",
  break_down: "Price has broken below support. Monitoring for confirmation.",
  freeze_up:
    "Breakout confirmed. Structure frozen. Waiting for retest opportunity.",
  freeze_down:
    "Breakdown confirmed. Structure frozen. Waiting for retest opportunity.",
  retest_up:
    "Price is retesting the broken resistance (now support). Watching for rejection.",
  retest_down:
    "Price is retesting the broken support (now resistance). Watching for rejection.",
  entry_long:
    "LONG SIGNAL: Price rejected from support with bullish confirmation.",
  entry_short:
    "SHORT SIGNAL: Price rejected from resistance with bearish confirmation.",
  failure:
    "Setup has failed. Price invalidated the pattern by breaching the safety line.",
};

const Q_SCORE_INTERPRETATIONS = [
  {
    min: 0.8,
    label: "Excellent",
    description:
      "Very high quality structure with multiple confirmed touches and minimal violations.",
  },
  {
    min: 0.7,
    label: "Good",
    description:
      "Solid structure quality. Reliable for trading with proper risk management.",
  },
  {
    min: 0.6,
    label: "Acceptable",
    description:
      "Moderate structure quality. Consider waiting for better setup.",
  },
  {
    min: 0.5,
    label: "Marginal",
    description: "Borderline quality. High risk, use smaller position size.",
  },
  {
    min: 0,
    label: "Poor",
    description: "Low quality structure. Not recommended for trading.",
  },
];

// ============================================================================
// EXPLAINABLE AI CLASS
// ============================================================================

export class PCTTExplainableAI {
  private recentEvents: { time: Date; event: string }[] = [];
  private lastStructure: StructureObject | null = null;

  /**
   * Generate a complete explanation for the current market structure
   */
  explainStructure(structure: StructureObject): DecisionExplanation {
    const factors = this.analyzeFactors(structure);
    const confidence = this.calculateConfidenceBreakdown(structure);
    const risks = this.identifyRisks(structure);
    const visualCues = this.generateVisualCues(structure);

    const summary = this.generateSummary(structure, confidence.overall);
    const narrative = this.generateNarrative(structure, factors);

    return {
      summary,
      narrative,
      factors,
      confidence,
      risks,
      visualCues,
      timestamp: new Date(),
    };
  }

  /**
   * Generate explanation for a specific trading signal
   */
  explainSignal(
    signal: PCTTSignal,
    structure: StructureObject,
  ): TradeNarrative {
    const direction = signal.type === "long" ? "bullish" : "bearish";
    const oppDirection = signal.type === "long" ? "bearish" : "bullish";

    const riskAmount = Math.abs(signal.entryPrice - signal.stopPrice);
    const reward1R = signal.targetPrices[0] - signal.entryPrice;
    const rr = Math.abs(reward1R / riskAmount);

    return {
      setup: this.generateSetupExplanation(signal, structure),
      trigger: this.generateTriggerExplanation(signal, structure),
      execution:
        `Enter ${signal.type.toUpperCase()} at $${signal.entryPrice.toFixed(2)} (current price). ` +
        `Use a limit order within the entry zone for better fill. ` +
        `Position should not exceed 2-3% of portfolio risk.`,
      management:
        `Initial stop at $${signal.stopPrice.toFixed(2)} (${((riskAmount / signal.entryPrice) * 100).toFixed(1)}% risk). ` +
        `First target at $${signal.targetPrices[0].toFixed(2)} (${rr.toFixed(1)}R). ` +
        `Consider scaling out: 50% at 1R, 25% at 2R, trail remainder.`,
      invalidation:
        `Trade is INVALID if price closes ${signal.type === "long" ? "below" : "above"} ` +
        `$${signal.stopPrice.toFixed(2)}. ` +
        `Also invalid if ${oppDirection} momentum increases significantly or structure breaks down.`,
    };
  }

  /**
   * Generate real-time commentary for live chart display
   */
  generateLiveCommentary(structure: StructureObject): LiveCommentary {
    const currentState = this.describeCurrentState(structure);
    const watchingFor = this.identifyWatchItems(structure);
    const nextActions = this.suggestNextActions(structure);

    // Track state changes
    if (this.lastStructure && this.lastStructure.event !== structure.event) {
      this.recentEvents.push({
        time: new Date(),
        event: `State changed: ${this.lastStructure.event} → ${structure.event}`,
      });
    }
    this.lastStructure = structure;

    // Keep only recent events
    const cutoff = Date.now() - 300000; // 5 minutes
    this.recentEvents = this.recentEvents.filter(
      (e) => e.time.getTime() > cutoff,
    );

    return {
      currentState,
      watchingFor,
      recentEvents: this.recentEvents.slice(-5),
      nextActions,
    };
  }

  // ==========================================================================
  // FACTOR ANALYSIS
  // ==========================================================================

  private analyzeFactors(structure: StructureObject): DecisionFactor[] {
    const factors: DecisionFactor[] = [];

    // Support quality
    if (structure.support) {
      factors.push({
        name: "Support Quality",
        value: `${(structure.support.qScore * 100).toFixed(0)}%`,
        impact:
          structure.support.qScore >= 0.65
            ? "positive"
            : structure.support.qScore >= 0.5
              ? "neutral"
              : "negative",
        weight: 0.25,
        explanation: this.interpretQScore(structure.support.qScore, "support"),
      });
    }

    // Resistance quality
    if (structure.resistance) {
      factors.push({
        name: "Resistance Quality",
        value: `${(structure.resistance.qScore * 100).toFixed(0)}%`,
        impact:
          structure.resistance.qScore >= 0.65
            ? "positive"
            : structure.resistance.qScore >= 0.5
              ? "neutral"
              : "negative",
        weight: 0.25,
        explanation: this.interpretQScore(
          structure.resistance.qScore,
          "resistance",
        ),
      });
    }

    // Regime
    factors.push({
      name: "Market Regime",
      value: structure.regime.replace("_", " "),
      impact:
        structure.regime === "range"
          ? "neutral"
          : structure.regime === "transition"
            ? "negative"
            : "positive",
      weight: 0.2,
      explanation: REGIME_DESCRIPTIONS[structure.regime],
    });

    // Efficiency ratio
    factors.push({
      name: "Trend Efficiency",
      value: `${(structure.efficiencyRatio * 100).toFixed(0)}%`,
      impact:
        structure.efficiencyRatio >= 0.5
          ? "positive"
          : structure.efficiencyRatio >= 0.3
            ? "neutral"
            : "negative",
      weight: 0.15,
      explanation:
        structure.efficiencyRatio >= 0.5
          ? "Strong directional movement with minimal noise."
          : structure.efficiencyRatio >= 0.3
            ? "Moderate trend efficiency. Some chop present."
            : "Low efficiency indicates choppy, range-bound conditions.",
    });

    // Distance to levels
    factors.push({
      name: "Distance to Support",
      value: `${structure.distanceToSupport.toFixed(1)}R`,
      impact:
        structure.distanceToSupport < 1
          ? "positive"
          : structure.distanceToSupport < 2
            ? "neutral"
            : "negative",
      weight: 0.075,
      explanation:
        structure.distanceToSupport < 1
          ? "Price is near support - potential bounce zone."
          : "Price has room to fall before reaching support.",
    });

    factors.push({
      name: "Distance to Resistance",
      value: `${structure.distanceToResistance.toFixed(1)}R`,
      impact:
        structure.distanceToResistance < 1
          ? "negative"
          : structure.distanceToResistance < 2
            ? "neutral"
            : "positive",
      weight: 0.075,
      explanation:
        structure.distanceToResistance < 1
          ? "Price is near resistance - potential reversal zone."
          : "Price has room to rise before reaching resistance.",
    });

    return factors;
  }

  // ==========================================================================
  // CONFIDENCE CALCULATION
  // ==========================================================================

  private calculateConfidenceBreakdown(
    structure: StructureObject,
  ): ConfidenceBreakdown {
    const adjustments: ConfidenceBreakdown["adjustments"] = [];

    // Structure quality (average of support and resistance Q-scores)
    const supportQ = structure.support?.qScore ?? 0;
    const resistanceQ = structure.resistance?.qScore ?? 0;
    const structureQuality = Math.round(((supportQ + resistanceQ) / 2) * 100);

    // Regime alignment (trending regimes are better)
    let regimeAlignment = 50;
    if (structure.regime === "trend_up" || structure.regime === "trend_down") {
      regimeAlignment = 80;
    } else if (structure.regime === "range") {
      regimeAlignment = 60;
    } else {
      regimeAlignment = 30;
      adjustments.push({
        factor: "Transition Regime",
        adjustment: -20,
        reason: "Market direction unclear during regime transition",
      });
    }

    // Event timing
    let eventTiming = 50;
    if (structure.event.includes("entry")) {
      eventTiming = 90;
    } else if (structure.event.includes("retest")) {
      eventTiming = 75;
    } else if (structure.event.includes("freeze")) {
      eventTiming = 60;
    } else if (structure.event === "idle") {
      eventTiming = 30;
    }

    // Risk/reward based on distances
    const distanceRatio =
      structure.distanceToResistance / (structure.distanceToSupport + 0.1);
    const riskReward = Math.min(100, Math.round(distanceRatio * 30 + 40));

    // Calculate overall
    const overall = Math.round(
      structureQuality * 0.3 +
        regimeAlignment * 0.25 +
        eventTiming * 0.25 +
        riskReward * 0.2,
    );

    // Apply adjustments
    let adjustedOverall = overall;
    for (const adj of adjustments) {
      adjustedOverall += adj.adjustment;
    }
    adjustedOverall = Math.max(0, Math.min(100, adjustedOverall));

    return {
      overall: adjustedOverall,
      components: {
        structureQuality,
        regimeAlignment,
        eventTiming,
        riskReward,
      },
      adjustments,
    };
  }

  // ==========================================================================
  // RISK IDENTIFICATION
  // ==========================================================================

  private identifyRisks(structure: StructureObject): RiskExplanation[] {
    const risks: RiskExplanation[] = [];

    // Structural risks
    if (!structure.support || structure.support.qScore < 0.5) {
      risks.push({
        type: "structural",
        level: "high",
        description: "Support structure is weak or undefined.",
        mitigation: "Wait for clearer support formation or use wider stops.",
      });
    }

    if (!structure.resistance || structure.resistance.qScore < 0.5) {
      risks.push({
        type: "structural",
        level: "high",
        description: "Resistance structure is weak or undefined.",
        mitigation:
          "Use conservative targets and be prepared for false breakouts.",
      });
    }

    // Timing risks
    if (structure.regime === "transition") {
      risks.push({
        type: "timing",
        level: "high",
        description: "Market is in regime transition - direction unclear.",
        mitigation: "Reduce position size or wait for regime confirmation.",
      });
    }

    if (structure.event === "idle") {
      risks.push({
        type: "timing",
        level: "medium",
        description: "No active setup - premature entry risk.",
        mitigation: "Wait for proper break and retest sequence.",
      });
    }

    // Market condition risks
    if (structure.efficiencyRatio < 0.3) {
      risks.push({
        type: "market",
        level: "medium",
        description: "Low trend efficiency indicates choppy conditions.",
        mitigation: "Consider range-trading strategies or staying flat.",
      });
    }

    // Distance risks
    if (structure.distanceToSupport > 3 && structure.distanceToResistance > 3) {
      risks.push({
        type: "execution",
        level: "medium",
        description: "Price is far from both levels - poor entry location.",
        mitigation: "Wait for price to approach a key level.",
      });
    }

    return risks;
  }

  // ==========================================================================
  // VISUAL CUE GENERATION
  // ==========================================================================

  private generateVisualCues(structure: StructureObject): VisualCue[] {
    const cues: VisualCue[] = [];

    // Support zone
    if (structure.support) {
      cues.push({
        type: "zone",
        position: { price: 0, barIndex: 0 }, // Will be calculated by chart
        color: structure.support.qScore >= 0.65 ? "#26a69a" : "#9e9e9e",
        label: `Support Q:${(structure.support.qScore * 100).toFixed(0)}%`,
        tooltip: this.interpretQScore(structure.support.qScore, "support"),
      });
    }

    // Resistance zone
    if (structure.resistance) {
      cues.push({
        type: "zone",
        position: { price: 0, barIndex: 0 },
        color: structure.resistance.qScore >= 0.65 ? "#ef5350" : "#9e9e9e",
        label: `Resistance Q:${(structure.resistance.qScore * 100).toFixed(0)}%`,
        tooltip: this.interpretQScore(
          structure.resistance.qScore,
          "resistance",
        ),
      });
    }

    // Event indicator
    if (structure.event !== "idle") {
      const isEntry = structure.event.includes("entry");
      cues.push({
        type: "text",
        position: { x: 0, y: 0 },
        color: isEntry ? "#4caf50" : "#ff9800",
        label: structure.event.replace("_", " ").toUpperCase(),
        tooltip: EVENT_DESCRIPTIONS[structure.event],
      });
    }

    // Regime background
    cues.push({
      type: "highlight",
      position: { x: 0, y: 0 },
      color:
        structure.regime === "trend_up"
          ? "rgba(38, 166, 154, 0.1)"
          : structure.regime === "trend_down"
            ? "rgba(239, 83, 80, 0.1)"
            : "rgba(158, 158, 158, 0.1)",
      label: structure.regime.replace("_", " "),
      tooltip: REGIME_DESCRIPTIONS[structure.regime],
    });

    return cues;
  }

  // ==========================================================================
  // NARRATIVE GENERATION
  // ==========================================================================

  private generateSummary(
    structure: StructureObject,
    confidence: number,
  ): string {
    const regime = structure.regime.replace("_", " ");
    const event =
      structure.event === "idle"
        ? "waiting for setup"
        : structure.event.replace("_", " ");

    return (
      `${regime.charAt(0).toUpperCase() + regime.slice(1)} market, ${event}. ` +
      `Confidence: ${confidence}%.`
    );
  }

  private generateNarrative(
    structure: StructureObject,
    factors: DecisionFactor[],
  ): string {
    const parts: string[] = [];

    // Regime context
    parts.push(REGIME_DESCRIPTIONS[structure.regime]);

    // Structure quality
    const positiveFactors = factors.filter((f) => f.impact === "positive");
    const negativeFactors = factors.filter((f) => f.impact === "negative");

    if (positiveFactors.length > 0) {
      parts.push(
        `Positive factors: ${positiveFactors.map((f) => f.name.toLowerCase()).join(", ")}.`,
      );
    }
    if (negativeFactors.length > 0) {
      parts.push(
        `Concerns: ${negativeFactors.map((f) => f.name.toLowerCase()).join(", ")}.`,
      );
    }

    // Current event
    parts.push(EVENT_DESCRIPTIONS[structure.event]);

    return parts.join(" ");
  }

  private generateSetupExplanation(
    signal: PCTTSignal,
    structure: StructureObject,
  ): string {
    const direction = signal.type === "long" ? "bullish" : "bearish";
    const line = signal.type === "long" ? "support" : "resistance";

    return (
      `A ${direction} retest setup has formed. Price broke through ${line}, ` +
      `confirmed the breakout, and has now returned to test the level. ` +
      `The structure has a Q-score of ${(signal.qScore * 100).toFixed(0)}%, ` +
      `indicating ${this.getQScoreLabel(signal.qScore).toLowerCase()} quality. ` +
      `Risk/reward ratio is ${signal.riskReward.toFixed(1)}:1.`
    );
  }

  private generateTriggerExplanation(
    signal: PCTTSignal,
    structure: StructureObject,
  ): string {
    if (signal.type === "long") {
      return (
        "Price has shown rejection from support with a bullish candlestick pattern. " +
        "The candle closed above the level after wicking below, indicating buyer strength."
      );
    } else {
      return (
        "Price has shown rejection from resistance with a bearish candlestick pattern. " +
        "The candle closed below the level after wicking above, indicating seller strength."
      );
    }
  }

  // ==========================================================================
  // LIVE COMMENTARY HELPERS
  // ==========================================================================

  private describeCurrentState(structure: StructureObject): string {
    return (
      `${EVENT_DESCRIPTIONS[structure.event]} ` +
      `Market regime: ${structure.regime.replace("_", " ")}. ` +
      `Efficiency: ${(structure.efficiencyRatio * 100).toFixed(0)}%.`
    );
  }

  private identifyWatchItems(structure: StructureObject): string[] {
    const items: string[] = [];

    switch (structure.event) {
      case "idle":
        items.push("Break of support or resistance");
        items.push("Structure development (more touches)");
        break;
      case "break_up":
      case "break_down":
        items.push("Confirmation close");
        items.push("False breakout reversal");
        break;
      case "freeze_up":
      case "freeze_down":
        items.push("Retest of broken level");
        items.push("Continuation without retest");
        break;
      case "retest_up":
      case "retest_down":
        items.push("Rejection candlestick pattern");
        items.push("Break through retest level (failure)");
        break;
      default:
        items.push("Entry execution");
        items.push("Stop loss placement");
    }

    return items;
  }

  private suggestNextActions(structure: StructureObject): string[] {
    const actions: string[] = [];

    if (structure.event === "idle") {
      actions.push("Set alerts at support and resistance levels");
      actions.push("Monitor for structure improvement");
    } else if (structure.event.includes("entry")) {
      actions.push("Verify entry conditions");
      actions.push("Calculate position size");
      actions.push("Set stop loss order");
    } else if (structure.event.includes("retest")) {
      actions.push("Watch for rejection candle");
      actions.push("Prepare entry order");
    } else if (structure.event.includes("freeze")) {
      actions.push("Wait for retest");
      actions.push("Do not chase");
    }

    return actions;
  }

  // ==========================================================================
  // UTILITY HELPERS
  // ==========================================================================

  private interpretQScore(
    qScore: number,
    type: "support" | "resistance",
  ): string {
    const interpretation = Q_SCORE_INTERPRETATIONS.find((i) => qScore >= i.min);
    const label = interpretation?.label ?? "Unknown";
    const desc = interpretation?.description ?? "";

    return `${type.charAt(0).toUpperCase() + type.slice(1)} quality: ${label}. ${desc}`;
  }

  private getQScoreLabel(qScore: number): string {
    const interpretation = Q_SCORE_INTERPRETATIONS.find((i) => qScore >= i.min);
    return interpretation?.label ?? "Unknown";
  }
}

// ============================================================================
// FACTORY
// ============================================================================

export function createPCTTExplainableAI(): PCTTExplainableAI {
  return new PCTTExplainableAI();
}
