/**
 * 30-Law Compliance Engine Types
 *
 * Type definitions for the compliance scoring system that evaluates
 * every trading signal against 30 trading laws.
 */

import type { OperatingMode } from "../modes/mode-types";

/** Unique identifier for each of the 30 laws */
export type LawId =
  | "LAW-01"
  | "LAW-02"
  | "LAW-03"
  | "LAW-04"
  | "LAW-05"
  | "LAW-06"
  | "LAW-07"
  | "LAW-08"
  | "LAW-09"
  | "LAW-10"
  | "LAW-11"
  | "LAW-12"
  | "LAW-13"
  | "LAW-14"
  | "LAW-15"
  | "LAW-16"
  | "LAW-17"
  | "LAW-18"
  | "LAW-19"
  | "LAW-20"
  | "LAW-21"
  | "LAW-22"
  | "LAW-23"
  | "LAW-24"
  | "LAW-25"
  | "LAW-26"
  | "LAW-27"
  | "LAW-28"
  | "LAW-29"
  | "LAW-30";

/** Law categories */
export type LawCategory =
  | "risk_management"
  | "position_sizing"
  | "entry_criteria"
  | "exit_criteria"
  | "market_structure"
  | "portfolio_management"
  | "behavioral"
  | "execution";

/** Severity of a law violation */
export type ViolationSeverity = "info" | "warning" | "critical" | "blocking";

/** Definition of a single trading law */
export interface LawDefinition {
  id: LawId;
  name: string;
  description: string;
  category: LawCategory;
  /** Weight in composite score calculation (0-1, higher = more important) */
  weight: number;
  /** Whether this law can block trade execution */
  canBlock: boolean;
  /** Severity when violated */
  violationSeverity: ViolationSeverity;
  /** Signal types this law applies to ("all" or specific types) */
  applicableTo: "all" | ("buy" | "sell" | "hold")[];
  /** Operating modes this law applies to */
  applicableModes: "all" | OperatingMode[];
}

/** Score for a single law evaluation */
export interface LawScore {
  lawId: LawId;
  /** Score 0-100 (100 = fully compliant) */
  score: number;
  /** Whether this law applies to the current signal */
  applicable: boolean;
  /** Weight used in composite calculation */
  weight: number;
  /** Whether this law passed (score >= threshold) */
  passed: boolean;
  /** Human-readable explanation */
  details: string;
}

/** A violation record */
export interface ComplianceViolation {
  lawId: LawId;
  lawName: string;
  severity: ViolationSeverity;
  score: number;
  threshold: number;
  details: string;
  /** Suggested remediation */
  remediation: string;
}

/** Input context for compliance evaluation */
export interface ComplianceContext {
  userId: string;
  signalId?: string;
  symbol: string;
  signalType: "buy" | "sell" | "hold";
  operatingMode: OperatingMode;
  /** Signal strength/confidence 0-100 */
  signalStrength: number;
  /** Current price */
  currentPrice: number;
  /** Stop loss price, if set */
  stopLossPrice?: number;
  /** Take profit price, if set */
  takeProfitPrice?: number;
  /** Position size in dollars */
  positionSize?: number;
  /** Portfolio total value */
  portfolioValue?: number;
  /** Number of existing open positions */
  openPositions?: number;
  /** Max allowed positions */
  maxPositions?: number;
  /** Current daily P&L percentage */
  dailyPnlPct?: number;
  /** Max daily loss percentage allowed */
  maxDailyLossPct?: number;
  /** Regime type from PCTT pipeline */
  regimeType?: string;
  /** Volume relative to average (ratio, 1.0 = average) */
  relativeVolume?: number;
  /** Average True Range (ATR) for the symbol */
  atr?: number;
  /** Whether market is in extended hours */
  extendedHours?: boolean;
  /** Risk/reward ratio (reward:risk) */
  riskRewardRatio?: number;
  /** Correlation with existing positions (-1 to 1) */
  portfolioCorrelation?: number;
  /** Sector of the symbol */
  sector?: string;
  /** Sectors of existing positions (for concentration check) */
  existingSectors?: string[];
  /** Days since last trade on this symbol */
  daysSinceLastTrade?: number;
  /** Additional context */
  additionalContext?: Record<string, unknown>;
}

/** Full compliance evaluation result */
export interface ComplianceResult {
  /** Composite score 0-100 */
  compositeScore: number;
  /** Per-law scores */
  lawScores: Record<LawId, LawScore>;
  /** Number of applicable laws */
  applicableLaws: number;
  /** Number of passing laws */
  passingLaws: number;
  /** Number of failing laws */
  failingLaws: number;
  /** List of violations */
  violations: ComplianceViolation[];
  /** Whether any critical/blocking violation exists */
  hasCriticalViolation: boolean;
  /** Whether the trade should be blocked */
  shouldBlock: boolean;
  /** Human-readable summary */
  summary: string;
  /** Context used for evaluation */
  context: {
    symbol: string;
    signalType: string;
    operatingMode: OperatingMode;
  };
}

/** Stored compliance score (matches DB schema) */
export interface StoredComplianceScore {
  id: string;
  userId: string;
  signalId: string | null;
  compositeScore: number;
  lawScores: Record<string, LawScore>;
  applicableLaws: number;
  passingLaws: number;
  failingLaws: number;
  violations: ComplianceViolation[];
  hasCriticalViolation: boolean;
  symbol: string;
  signalType: string;
  operatingMode: string;
  createdAt: string;
}

/** Passing threshold for a law (score must be >= this to pass) */
export const LAW_PASS_THRESHOLD = 60;

/** Minimum composite score to allow trade execution */
export const MIN_COMPOSITE_SCORE = 50;

/** Minimum composite score for autonomous mode */
export const MIN_AUTONOMOUS_SCORE = 70;
