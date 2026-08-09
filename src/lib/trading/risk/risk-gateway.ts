/**
 * Risk Gateway
 *
 * Central risk management layer that validates all trades before execution.
 * Enforces portfolio-level risk rules and provides kill switch functionality.
 */

import { supabaseAdmin } from "@/lib/supabase/server";
import {
  CorrelationMonitor,
  type RegimeChangeEvent,
} from "@/lib/trading/correlation-monitor";
import { computePortfolioHeat, checkHeatBudget } from "@/lib/trading/risk/portfolio-heat";
import type { MarketRegime } from "@/lib/trading/config";

// ============================================================================
// TYPES
// ============================================================================

export interface RiskRules {
  // Position limits
  maxPositionSize: number; // % of portfolio per position
  maxSectorExposure: number; // % per sector
  maxCorrelatedExposure: number; // % correlated assets
  maxOpenPositions: number;

  // Loss limits
  maxDailyLoss: number; // % triggers pause
  maxWeeklyLoss: number; // % triggers review
  maxDrawdown: number; // % triggers kill switch
  maxLossPerTrade: number; // Hard stop per trade

  // Cash management
  minCashReserve: number; // Always maintain %
  marginUtilizationLimit: number; // Max margin usage %

  // Time rules
  tradingHoursOnly: boolean;
  noTradesBeforeEarnings: number; // Days before earnings
  noTradesAroundFOMC: boolean;

  // Consensus requirements
  minSignalConsensus: number; // Min agreement %
  minConfidence: number; // Min confidence score

  // Kill switch auto-trigger thresholds (RSK-003)
  lossVelocityWindowMs: number; // Rolling window for velocity calc
  lossVelocityThreshold: number; // % loss per hour to trigger
  correlationSpikeThreshold: number; // Average corr jump to trigger
  maxConsecutiveLosses: number; // Consecutive losing trades before halt

  // Concentration limits (RSK-006)
  maxHHI: number; // Max Herfindahl-Hirschman Index (0-10000)
  maxSinglePositionPct: number; // Hard cap % for any single position
  maxSectorWeights: Record<string, number>; // Per-sector weight limits
}

export interface ProposedTrade {
  symbol: string;
  side: "buy" | "sell";
  quantity: number;
  price: number;
  stopLoss?: number;
  signalConsensus?: number;
  signalConfidence?: number;
  sector?: string;
}

export interface PortfolioState {
  totalValue: number;
  cashBalance: number;
  positions: {
    symbol: string;
    value: number;
    percent: number;
    sector?: string;
    correlation?: number;
  }[];
  dailyPnL: number;
  weeklyPnL: number;
  drawdown: number;
  openPositionCount: number;
}

export interface RiskValidation {
  approved: boolean;
  violations: RiskViolation[];
  warnings: RiskWarning[];
  adjustedTrade?: ProposedTrade;
}

export interface RiskViolation {
  rule: string;
  message: string;
  severity: "critical" | "high" | "medium";
  currentValue: number;
  limit: number;
}

export interface RiskWarning {
  rule: string;
  message: string;
  currentValue: number;
  threshold: number;
}

export interface KillSwitchStatus {
  active: boolean;
  reason?: string;
  triggeredAt?: Date;
  triggeredBy?: "system" | "user";
  triggerType?: KillSwitchTrigger;
}

export type KillSwitchTrigger =
  | "max_drawdown"
  | "loss_velocity"
  | "correlation_spike"
  | "consecutive_losses"
  | "manual";

export interface LossEvent {
  timestamp: number; // ms epoch
  lossPct: number; // loss as positive %
}

export interface ConcentrationReport {
  hhi: number; // 0-10000 scale
  normalizedHHI: number; // 0-1 scale
  topHolding: { symbol: string; pct: number } | null;
  sectorWeights: Record<string, number>;
  violations: RiskViolation[];
  warnings: RiskWarning[];
}

// 3-Gate Architecture Types

export type OperatingMode = "watch" | "guided" | "autonomous";

export interface RiskGateResult {
  gate: "compliance" | "risk_limits" | "execution";
  passed: boolean;
  violations: RiskViolation[];
  warnings: RiskWarning[];
}

export interface EnhancedRiskValidation extends RiskValidation {
  gateResults: RiskGateResult[];
  operatingMode?: OperatingMode;
  confirmationRequired?: boolean;
  circuitBreakerEvents?: CircuitBreakerEventInput[];
}

export interface CircuitBreakerEventInput {
  breakerType: string;
  severity: "info" | "warning" | "critical" | "emergency";
  triggerValue: number;
  thresholdValue: number;
  actionTaken: string;
  details: Record<string, unknown>;
  symbol?: string;
}

export interface TradeContext {
  trade: ProposedTrade;
  portfolio: PortfolioState;
  operatingMode?: OperatingMode;
  complianceScore?: number;
  dailyTradeCount?: number;
  maxDailyTrades?: number;
}

// ============================================================================
// DEFAULT RISK RULES
// ============================================================================

export const DEFAULT_RISK_RULES: RiskRules = {
  maxPositionSize: 10,
  maxSectorExposure: 25,
  maxCorrelatedExposure: 30,
  maxOpenPositions: 20,
  maxDailyLoss: 2,
  maxWeeklyLoss: 5,
  maxDrawdown: 15,
  maxLossPerTrade: 2,
  minCashReserve: 10,
  marginUtilizationLimit: 50,
  tradingHoursOnly: true,
  noTradesBeforeEarnings: 2,
  noTradesAroundFOMC: true,
  minSignalConsensus: 0.6,
  minConfidence: 0.5,
  // Kill switch auto-trigger thresholds
  lossVelocityWindowMs: 3600_000, // 1 hour
  lossVelocityThreshold: 3, // 3% per hour
  correlationSpikeThreshold: 0.3, // avg corr jump of 0.3
  maxConsecutiveLosses: 5,
  // Concentration limits
  maxHHI: 2500, // > 2500 = highly concentrated
  maxSinglePositionPct: 15, // hard cap 15%
  maxSectorWeights: {}, // empty = use maxSectorExposure for all
};

// ============================================================================
// RISK GATEWAY CLASS
// ============================================================================

export class RiskGateway {
  private rules: RiskRules;
  private killSwitch: KillSwitchStatus = { active: false };
  private userId: string;

  // RSK-003: Automated kill switch trigger state
  private lossEvents: LossEvent[] = [];
  private consecutiveLosses: number = 0;
  private correlationMonitor: CorrelationMonitor | null = null;

  // Strativion: Current market regime for heat budget checks
  private currentRegime: MarketRegime | null = null;

  constructor(userId: string, rules?: Partial<RiskRules>) {
    this.userId = userId;
    this.rules = { ...DEFAULT_RISK_RULES, ...rules };
  }

  /** Attach a correlation monitor for spike detection (RSK-003) */
  setCorrelationMonitor(monitor: CorrelationMonitor): void {
    this.correlationMonitor = monitor;
  }

  /** Set current market regime for portfolio heat budget checks */
  setCurrentRegime(regime: MarketRegime): void {
    this.currentRegime = regime;
  }

  // ============================================================================
  // MAIN VALIDATION
  // ============================================================================

  async validateTrade(
    trade: ProposedTrade,
    portfolio: PortfolioState,
  ): Promise<RiskValidation> {
    const violations: RiskViolation[] = [];
    const warnings: RiskWarning[] = [];

    // Check kill switch first
    if (this.killSwitch.active) {
      violations.push({
        rule: "kill_switch",
        message: `Trading halted: ${this.killSwitch.reason}`,
        severity: "critical",
        currentValue: 1,
        limit: 0,
      });
      return { approved: false, violations, warnings };
    }

    // Position size check
    const tradeValue = trade.quantity * trade.price;
    const positionPercent = (tradeValue / portfolio.totalValue) * 100;

    if (positionPercent > this.rules.maxPositionSize) {
      violations.push({
        rule: "max_position_size",
        message: `Position size ${positionPercent.toFixed(1)}% exceeds limit of ${this.rules.maxPositionSize}%`,
        severity: "high",
        currentValue: positionPercent,
        limit: this.rules.maxPositionSize,
      });
    }

    // Cash reserve check
    const cashAfterTrade = portfolio.cashBalance - tradeValue;
    const cashPercent = (cashAfterTrade / portfolio.totalValue) * 100;

    if (cashPercent < this.rules.minCashReserve) {
      violations.push({
        rule: "min_cash_reserve",
        message: `Trade would leave only ${cashPercent.toFixed(1)}% cash, below ${this.rules.minCashReserve}% minimum`,
        severity: "high",
        currentValue: cashPercent,
        limit: this.rules.minCashReserve,
      });
    }

    // Open positions check
    if (
      trade.side === "buy" &&
      portfolio.openPositionCount >= this.rules.maxOpenPositions
    ) {
      violations.push({
        rule: "max_open_positions",
        message: `Already at maximum ${this.rules.maxOpenPositions} open positions`,
        severity: "medium",
        currentValue: portfolio.openPositionCount,
        limit: this.rules.maxOpenPositions,
      });
    }

    // Daily loss check
    const dailyLossPercent =
      (Math.abs(Math.min(0, portfolio.dailyPnL)) / portfolio.totalValue) * 100;
    if (dailyLossPercent >= this.rules.maxDailyLoss) {
      violations.push({
        rule: "max_daily_loss",
        message: `Daily loss ${dailyLossPercent.toFixed(1)}% has reached limit of ${this.rules.maxDailyLoss}%`,
        severity: "critical",
        currentValue: dailyLossPercent,
        limit: this.rules.maxDailyLoss,
      });
    }

    // Drawdown check
    if (portfolio.drawdown >= this.rules.maxDrawdown) {
      violations.push({
        rule: "max_drawdown",
        message: `Drawdown ${portfolio.drawdown.toFixed(1)}% has reached limit of ${this.rules.maxDrawdown}%`,
        severity: "critical",
        currentValue: portfolio.drawdown,
        limit: this.rules.maxDrawdown,
      });

      // Auto-trigger kill switch
      await this.triggerKillSwitch(
        `Max drawdown of ${this.rules.maxDrawdown}% reached`,
        "max_drawdown",
      );
    }

    // Sector exposure check
    if (trade.sector) {
      const sectorExposure = this.calculateSectorExposure(
        portfolio,
        trade.sector,
      );
      const newExposure = sectorExposure + positionPercent;
      const sectorLimit =
        this.rules.maxSectorWeights[trade.sector] ??
        this.rules.maxSectorExposure;

      if (newExposure > sectorLimit) {
        violations.push({
          rule: "max_sector_exposure",
          message: `${trade.sector} exposure would be ${newExposure.toFixed(1)}%, exceeds ${sectorLimit}%`,
          severity: "medium",
          currentValue: newExposure,
          limit: sectorLimit,
        });
      }
    }

    // RSK-006: Single position hard cap
    if (positionPercent > this.rules.maxSinglePositionPct) {
      violations.push({
        rule: "max_single_position",
        message: `Position ${positionPercent.toFixed(1)}% exceeds hard cap of ${this.rules.maxSinglePositionPct}%`,
        severity: "critical",
        currentValue: positionPercent,
        limit: this.rules.maxSinglePositionPct,
      });
    }

    // RSK-006: HHI concentration check (simulate adding this trade)
    if (trade.side === "buy") {
      const simulatedPositions = [...portfolio.positions];
      const existing = simulatedPositions.find(
        (p) => p.symbol === trade.symbol,
      );
      if (existing) {
        existing.percent += positionPercent;
      } else {
        simulatedPositions.push({
          symbol: trade.symbol,
          value: tradeValue,
          percent: positionPercent,
          sector: trade.sector,
        });
      }
      const hhi = this.calculateHHI(simulatedPositions.map((p) => p.percent));
      if (hhi > this.rules.maxHHI) {
        violations.push({
          rule: "max_hhi_concentration",
          message: `Portfolio HHI would be ${hhi.toFixed(0)}, exceeds limit of ${this.rules.maxHHI}`,
          severity: "high",
          currentValue: hhi,
          limit: this.rules.maxHHI,
        });
      } else if (hhi > this.rules.maxHHI * 0.8) {
        warnings.push({
          rule: "hhi_concentration_warning",
          message: `Portfolio HHI ${hhi.toFixed(0)} approaching limit of ${this.rules.maxHHI}`,
          currentValue: hhi,
          threshold: this.rules.maxHHI,
        });
      }
    }

    // Strativion: Portfolio heat budget check
    // Computes portfolio risk using position weights and checks against
    // regime-aware heat ceiling. Requires covMatrix and regime to be available.
    if (this.currentRegime && portfolio.positions.length > 0) {
      try {
        const weights = portfolio.positions.map(
          (p) => (p.value / portfolio.totalValue) * portfolio.totalValue,
        );
        // Build a simple diagonal covariance proxy from position weights
        // TODO: use real covariance matrix from returns data when available
        const n = weights.length;
        const covMatrix: number[][] = Array.from({ length: n }, (_, i) =>
          Array.from({ length: n }, (_, j) => (i === j ? 0.04 : 0.01)),
        );
        const heat = computePortfolioHeat(weights, covMatrix, portfolio.totalValue);
        const heatCheck = checkHeatBudget(heat, this.currentRegime);

        if (!heatCheck.allowed) {
          violations.push({
            rule: "portfolio_heat_budget",
            message: `Portfolio heat ${(heat * 100).toFixed(2)}% exceeds ${this.currentRegime} ceiling of ${(heatCheck.ceiling * 100).toFixed(2)}%`,
            severity: "high",
            currentValue: heat,
            limit: heatCheck.ceiling,
          });
        } else if (heatCheck.utilization > 0.8) {
          warnings.push({
            rule: "portfolio_heat_warning",
            message: `Portfolio heat utilization ${(heatCheck.utilization * 100).toFixed(1)}% approaching ceiling`,
            currentValue: heat,
            threshold: heatCheck.ceiling,
          });
        }
      } catch (heatErr) {
        // Portfolio heat calculation error — log and continue
        console.error("[PortfolioHeat] Error in validateTrade:", heatErr);
      }
    }

    // RSK-003: Correlation spike kill switch
    if (this.correlationMonitor) {
      const regimeEvents = this.correlationMonitor.detectRegimeChange(
        portfolio.positions.map((p) => p.symbol),
      );
      const criticalSpikes = regimeEvents.filter(
        (e: RegimeChangeEvent) =>
          e.severity === "critical" || e.severity === "high",
      );
      if (criticalSpikes.length > 0) {
        const avgChange =
          criticalSpikes.reduce((sum: number, e: RegimeChangeEvent) => {
            const pairChanges = e.affectedPairs.map((p) =>
              Math.abs(p.after - p.before),
            );
            return (
              sum +
              (pairChanges.length > 0
                ? pairChanges.reduce((a, b) => a + b, 0) / pairChanges.length
                : 0)
            );
          }, 0) / criticalSpikes.length;

        if (avgChange >= this.rules.correlationSpikeThreshold) {
          await this.triggerKillSwitch(
            `Correlation spike detected: avg change ${avgChange.toFixed(2)} across ${criticalSpikes.length} events`,
            "correlation_spike",
          );
          violations.push({
            rule: "correlation_spike_halt",
            message: `Trading halted: correlation spike (avg delta ${avgChange.toFixed(2)})`,
            severity: "critical",
            currentValue: avgChange,
            limit: this.rules.correlationSpikeThreshold,
          });
        }
      }
    }

    // Signal consensus check
    if (
      trade.signalConsensus !== undefined &&
      trade.signalConsensus < this.rules.minSignalConsensus
    ) {
      violations.push({
        rule: "min_signal_consensus",
        message: `Signal consensus ${(trade.signalConsensus * 100).toFixed(0)}% below minimum ${(this.rules.minSignalConsensus * 100).toFixed(0)}%`,
        severity: "medium",
        currentValue: trade.signalConsensus,
        limit: this.rules.minSignalConsensus,
      });
    }

    // Signal confidence check
    if (
      trade.signalConfidence !== undefined &&
      trade.signalConfidence < this.rules.minConfidence
    ) {
      violations.push({
        rule: "min_confidence",
        message: `Signal confidence ${(trade.signalConfidence * 100).toFixed(0)}% below minimum ${(this.rules.minConfidence * 100).toFixed(0)}%`,
        severity: "medium",
        currentValue: trade.signalConfidence,
        limit: this.rules.minConfidence,
      });
    }

    // Stop loss check
    if (!trade.stopLoss) {
      warnings.push({
        rule: "missing_stop_loss",
        message: "Trade has no stop loss defined",
        currentValue: 0,
        threshold: 1,
      });
    } else {
      const riskPercent =
        (Math.abs(trade.price - trade.stopLoss) / trade.price) * 100;
      if (riskPercent > this.rules.maxLossPerTrade) {
        violations.push({
          rule: "max_loss_per_trade",
          message: `Stop loss risk ${riskPercent.toFixed(1)}% exceeds limit of ${this.rules.maxLossPerTrade}%`,
          severity: "high",
          currentValue: riskPercent,
          limit: this.rules.maxLossPerTrade,
        });
      }
    }

    // Weekly loss warning
    const weeklyLossPercent =
      (Math.abs(Math.min(0, portfolio.weeklyPnL)) / portfolio.totalValue) * 100;
    if (weeklyLossPercent >= this.rules.maxWeeklyLoss * 0.8) {
      warnings.push({
        rule: "weekly_loss_warning",
        message: `Weekly loss ${weeklyLossPercent.toFixed(1)}% approaching limit of ${this.rules.maxWeeklyLoss}%`,
        currentValue: weeklyLossPercent,
        threshold: this.rules.maxWeeklyLoss,
      });
    }

    // Generate adjusted trade if possible
    let adjustedTrade: ProposedTrade | undefined;
    if (violations.some((v) => v.rule === "max_position_size")) {
      const maxQuantity = Math.floor(
        (portfolio.totalValue * this.rules.maxPositionSize) / 100 / trade.price,
      );
      if (maxQuantity > 0) {
        adjustedTrade = { ...trade, quantity: maxQuantity };
      }
    }

    return {
      approved: violations.length === 0,
      violations,
      warnings,
      adjustedTrade,
    };
  }

  // ============================================================================
  // 3-GATE ARCHITECTURE (Enhanced Validation)
  // ============================================================================

  /**
   * Gate 1: Pre-Trade Compliance
   *
   * Checks kill switch, operating mode restrictions, and compliance score.
   * This gate must pass before any risk limit evaluation.
   */
  async preTradeCompliance(context: TradeContext): Promise<RiskGateResult> {
    const violations: RiskViolation[] = [];
    const warnings: RiskWarning[] = [];

    // Kill switch check
    if (this.killSwitch.active) {
      violations.push({
        rule: "kill_switch",
        message: `Trading halted: ${this.killSwitch.reason}`,
        severity: "critical",
        currentValue: 1,
        limit: 0,
      });
    }

    // Operating mode validation
    if (context.operatingMode === "watch") {
      violations.push({
        rule: "watch_mode_restriction",
        message:
          "WATCH mode active: live trades are not permitted, paper trading only",
        severity: "critical",
        currentValue: 0,
        limit: 0,
      });
    }

    // Compliance score check
    if (
      context.complianceScore !== undefined &&
      context.complianceScore < 50
    ) {
      violations.push({
        rule: "low_compliance_score",
        message: `Compliance score ${context.complianceScore} is below minimum threshold of 50`,
        severity: "high",
        currentValue: context.complianceScore,
        limit: 50,
      });
    } else if (
      context.complianceScore !== undefined &&
      context.complianceScore < 70
    ) {
      warnings.push({
        rule: "compliance_score_warning",
        message: `Compliance score ${context.complianceScore} is below recommended threshold of 70`,
        currentValue: context.complianceScore,
        threshold: 70,
      });
    }

    return {
      gate: "compliance",
      passed: violations.length === 0,
      violations,
      warnings,
    };
  }

  /**
   * Gate 2: Risk Limits
   *
   * Evaluates position size, cash reserves, open positions, daily/weekly loss,
   * drawdown, sector exposure, single position hard cap, HHI concentration,
   * and correlation spike checks.
   */
  async riskLimits(context: TradeContext): Promise<RiskGateResult> {
    const { trade, portfolio } = context;
    const violations: RiskViolation[] = [];
    const warnings: RiskWarning[] = [];

    const tradeValue = trade.quantity * trade.price;
    const positionPercent = (tradeValue / portfolio.totalValue) * 100;

    // Position size check
    if (positionPercent > this.rules.maxPositionSize) {
      violations.push({
        rule: "max_position_size",
        message: `Position size ${positionPercent.toFixed(1)}% exceeds limit of ${this.rules.maxPositionSize}%`,
        severity: "high",
        currentValue: positionPercent,
        limit: this.rules.maxPositionSize,
      });
    }

    // Cash reserve check
    const cashAfterTrade = portfolio.cashBalance - tradeValue;
    const cashPercent = (cashAfterTrade / portfolio.totalValue) * 100;

    if (cashPercent < this.rules.minCashReserve) {
      violations.push({
        rule: "min_cash_reserve",
        message: `Trade would leave only ${cashPercent.toFixed(1)}% cash, below ${this.rules.minCashReserve}% minimum`,
        severity: "high",
        currentValue: cashPercent,
        limit: this.rules.minCashReserve,
      });
    }

    // Open positions check
    if (
      trade.side === "buy" &&
      portfolio.openPositionCount >= this.rules.maxOpenPositions
    ) {
      violations.push({
        rule: "max_open_positions",
        message: `Already at maximum ${this.rules.maxOpenPositions} open positions`,
        severity: "medium",
        currentValue: portfolio.openPositionCount,
        limit: this.rules.maxOpenPositions,
      });
    }

    // Daily loss check
    const dailyLossPercent =
      (Math.abs(Math.min(0, portfolio.dailyPnL)) / portfolio.totalValue) * 100;
    if (dailyLossPercent >= this.rules.maxDailyLoss) {
      violations.push({
        rule: "max_daily_loss",
        message: `Daily loss ${dailyLossPercent.toFixed(1)}% has reached limit of ${this.rules.maxDailyLoss}%`,
        severity: "critical",
        currentValue: dailyLossPercent,
        limit: this.rules.maxDailyLoss,
      });
    }

    // Drawdown check
    if (portfolio.drawdown >= this.rules.maxDrawdown) {
      violations.push({
        rule: "max_drawdown",
        message: `Drawdown ${portfolio.drawdown.toFixed(1)}% has reached limit of ${this.rules.maxDrawdown}%`,
        severity: "critical",
        currentValue: portfolio.drawdown,
        limit: this.rules.maxDrawdown,
      });

      // Auto-trigger kill switch
      await this.triggerKillSwitch(
        `Max drawdown of ${this.rules.maxDrawdown}% reached`,
        "max_drawdown",
      );
    }

    // Sector exposure check
    if (trade.sector) {
      const sectorExposure = this.calculateSectorExposure(
        portfolio,
        trade.sector,
      );
      const newExposure = sectorExposure + positionPercent;
      const sectorLimit =
        this.rules.maxSectorWeights[trade.sector] ??
        this.rules.maxSectorExposure;

      if (newExposure > sectorLimit) {
        violations.push({
          rule: "max_sector_exposure",
          message: `${trade.sector} exposure would be ${newExposure.toFixed(1)}%, exceeds ${sectorLimit}%`,
          severity: "medium",
          currentValue: newExposure,
          limit: sectorLimit,
        });
      }
    }

    // RSK-006: Single position hard cap
    if (positionPercent > this.rules.maxSinglePositionPct) {
      violations.push({
        rule: "max_single_position",
        message: `Position ${positionPercent.toFixed(1)}% exceeds hard cap of ${this.rules.maxSinglePositionPct}%`,
        severity: "critical",
        currentValue: positionPercent,
        limit: this.rules.maxSinglePositionPct,
      });
    }

    // RSK-006: HHI concentration check (simulate adding this trade)
    if (trade.side === "buy") {
      const simulatedPositions = [...portfolio.positions];
      const existing = simulatedPositions.find(
        (p) => p.symbol === trade.symbol,
      );
      if (existing) {
        existing.percent += positionPercent;
      } else {
        simulatedPositions.push({
          symbol: trade.symbol,
          value: tradeValue,
          percent: positionPercent,
          sector: trade.sector,
        });
      }
      const hhi = this.calculateHHI(
        simulatedPositions.map((p) => p.percent),
      );
      if (hhi > this.rules.maxHHI) {
        violations.push({
          rule: "max_hhi_concentration",
          message: `Portfolio HHI would be ${hhi.toFixed(0)}, exceeds limit of ${this.rules.maxHHI}`,
          severity: "high",
          currentValue: hhi,
          limit: this.rules.maxHHI,
        });
      } else if (hhi > this.rules.maxHHI * 0.8) {
        warnings.push({
          rule: "hhi_concentration_warning",
          message: `Portfolio HHI ${hhi.toFixed(0)} approaching limit of ${this.rules.maxHHI}`,
          currentValue: hhi,
          threshold: this.rules.maxHHI,
        });
      }
    }

    // Strativion: Portfolio heat budget check (Gate 2)
    if (this.currentRegime && portfolio.positions.length > 0) {
      try {
        const weights = portfolio.positions.map(
          (p) => (p.value / portfolio.totalValue) * portfolio.totalValue,
        );
        const n = weights.length;
        // TODO: use real covariance matrix from returns data when available
        const covMatrix: number[][] = Array.from({ length: n }, (_, i) =>
          Array.from({ length: n }, (_, j) => (i === j ? 0.04 : 0.01)),
        );
        const heat = computePortfolioHeat(weights, covMatrix, portfolio.totalValue);
        const heatCheck = checkHeatBudget(heat, this.currentRegime);

        if (!heatCheck.allowed) {
          violations.push({
            rule: "portfolio_heat_budget",
            message: `Portfolio heat ${(heat * 100).toFixed(2)}% exceeds ${this.currentRegime} ceiling of ${(heatCheck.ceiling * 100).toFixed(2)}%`,
            severity: "high",
            currentValue: heat,
            limit: heatCheck.ceiling,
          });
        } else if (heatCheck.utilization > 0.8) {
          warnings.push({
            rule: "portfolio_heat_warning",
            message: `Portfolio heat utilization ${(heatCheck.utilization * 100).toFixed(1)}% approaching ceiling`,
            currentValue: heat,
            threshold: heatCheck.ceiling,
          });
        }
      } catch (heatErr) {
        console.error("[PortfolioHeat] Error in riskLimits:", heatErr);
      }
    }

    // RSK-003: Correlation spike check
    if (this.correlationMonitor) {
      const regimeEvents = this.correlationMonitor.detectRegimeChange(
        portfolio.positions.map((p) => p.symbol),
      );
      const criticalSpikes = regimeEvents.filter(
        (e: RegimeChangeEvent) =>
          e.severity === "critical" || e.severity === "high",
      );
      if (criticalSpikes.length > 0) {
        const avgChange =
          criticalSpikes.reduce((sum: number, e: RegimeChangeEvent) => {
            const pairChanges = e.affectedPairs.map((p) =>
              Math.abs(p.after - p.before),
            );
            return (
              sum +
              (pairChanges.length > 0
                ? pairChanges.reduce((a, b) => a + b, 0) / pairChanges.length
                : 0)
            );
          }, 0) / criticalSpikes.length;

        if (avgChange >= this.rules.correlationSpikeThreshold) {
          await this.triggerKillSwitch(
            `Correlation spike detected: avg change ${avgChange.toFixed(2)} across ${criticalSpikes.length} events`,
            "correlation_spike",
          );
          violations.push({
            rule: "correlation_spike_halt",
            message: `Trading halted: correlation spike (avg delta ${avgChange.toFixed(2)})`,
            severity: "critical",
            currentValue: avgChange,
            limit: this.rules.correlationSpikeThreshold,
          });
        }
      }
    }

    return {
      gate: "risk_limits",
      passed: violations.length === 0,
      violations,
      warnings,
    };
  }

  /**
   * Gate 3: Execution Gate
   *
   * Checks signal consensus, confidence, stop loss, mode-specific restrictions,
   * weekly loss warning, and generates adjusted trade if possible.
   */
  async executionGate(context: TradeContext): Promise<RiskGateResult> {
    const { trade, portfolio } = context;
    const violations: RiskViolation[] = [];
    const warnings: RiskWarning[] = [];

    // Signal consensus check
    if (
      trade.signalConsensus !== undefined &&
      trade.signalConsensus < this.rules.minSignalConsensus
    ) {
      violations.push({
        rule: "min_signal_consensus",
        message: `Signal consensus ${(trade.signalConsensus * 100).toFixed(0)}% below minimum ${(this.rules.minSignalConsensus * 100).toFixed(0)}%`,
        severity: "medium",
        currentValue: trade.signalConsensus,
        limit: this.rules.minSignalConsensus,
      });
    }

    // Signal confidence check
    if (
      trade.signalConfidence !== undefined &&
      trade.signalConfidence < this.rules.minConfidence
    ) {
      violations.push({
        rule: "min_confidence",
        message: `Signal confidence ${(trade.signalConfidence * 100).toFixed(0)}% below minimum ${(this.rules.minConfidence * 100).toFixed(0)}%`,
        severity: "medium",
        currentValue: trade.signalConfidence,
        limit: this.rules.minConfidence,
      });
    }

    // Stop loss check
    if (!trade.stopLoss) {
      warnings.push({
        rule: "missing_stop_loss",
        message: "Trade has no stop loss defined",
        currentValue: 0,
        threshold: 1,
      });
    } else {
      const riskPercent =
        (Math.abs(trade.price - trade.stopLoss) / trade.price) * 100;
      if (riskPercent > this.rules.maxLossPerTrade) {
        violations.push({
          rule: "max_loss_per_trade",
          message: `Stop loss risk ${riskPercent.toFixed(1)}% exceeds limit of ${this.rules.maxLossPerTrade}%`,
          severity: "high",
          currentValue: riskPercent,
          limit: this.rules.maxLossPerTrade,
        });
      }
    }

    // Mode-specific restrictions
    if (context.operatingMode === "autonomous") {
      // Autonomous mode: check compliance score >= 70 and daily trade limit
      if (
        context.complianceScore !== undefined &&
        context.complianceScore < 70
      ) {
        violations.push({
          rule: "autonomous_compliance_required",
          message: `Autonomous mode requires compliance score >= 70, current: ${context.complianceScore}`,
          severity: "high",
          currentValue: context.complianceScore,
          limit: 70,
        });
      }
      if (
        context.dailyTradeCount !== undefined &&
        context.maxDailyTrades !== undefined &&
        context.dailyTradeCount >= context.maxDailyTrades
      ) {
        violations.push({
          rule: "autonomous_daily_trade_limit",
          message: `Autonomous mode daily trade limit reached: ${context.dailyTradeCount}/${context.maxDailyTrades}`,
          severity: "high",
          currentValue: context.dailyTradeCount,
          limit: context.maxDailyTrades,
        });
      }
    }

    // Weekly loss warning
    const weeklyLossPercent =
      (Math.abs(Math.min(0, portfolio.weeklyPnL)) / portfolio.totalValue) * 100;
    if (weeklyLossPercent >= this.rules.maxWeeklyLoss * 0.8) {
      warnings.push({
        rule: "weekly_loss_warning",
        message: `Weekly loss ${weeklyLossPercent.toFixed(1)}% approaching limit of ${this.rules.maxWeeklyLoss}%`,
        currentValue: weeklyLossPercent,
        threshold: this.rules.maxWeeklyLoss,
      });
    }

    return {
      gate: "execution",
      passed: violations.length === 0,
      violations,
      warnings,
    };
  }

  /**
   * Enhanced trade validation using 3-gate architecture.
   *
   * Runs all 3 gates sequentially:
   *   Gate 1: preTradeCompliance — stops on critical violations
   *   Gate 2: riskLimits — evaluates all position/loss/concentration rules
   *   Gate 3: executionGate — signal quality, mode restrictions, stop loss
   *
   * Returns gate-by-gate results, circuit breaker events for persistence,
   * and confirmation requirements based on operating mode.
   */
  async validateTradeEnhanced(
    context: TradeContext,
  ): Promise<EnhancedRiskValidation> {
    const gateResults: RiskGateResult[] = [];
    const allViolations: RiskViolation[] = [];
    const allWarnings: RiskWarning[] = [];
    const circuitBreakerEvents: CircuitBreakerEventInput[] = [];

    // Gate 1: Pre-Trade Compliance
    const gate1 = await this.preTradeCompliance(context);
    gateResults.push(gate1);
    allViolations.push(...gate1.violations);
    allWarnings.push(...gate1.warnings);

    // Record circuit breaker events for critical Gate 1 violations
    for (const v of gate1.violations) {
      if (v.severity === "critical") {
        circuitBreakerEvents.push({
          breakerType: v.rule,
          severity: "critical",
          triggerValue: v.currentValue,
          thresholdValue: v.limit,
          actionTaken: "trade_blocked",
          details: { gate: "compliance", message: v.message },
          symbol: context.trade.symbol,
        });
      }
    }

    // If Gate 1 has critical violations, stop here
    const hasCriticalGate1 = gate1.violations.some(
      (v) => v.severity === "critical",
    );
    if (hasCriticalGate1) {
      return {
        approved: false,
        violations: allViolations,
        warnings: allWarnings,
        gateResults,
        operatingMode: context.operatingMode,
        confirmationRequired: false,
        circuitBreakerEvents,
      };
    }

    // Gate 2: Risk Limits
    const gate2 = await this.riskLimits(context);
    gateResults.push(gate2);
    allViolations.push(...gate2.violations);
    allWarnings.push(...gate2.warnings);

    // Record circuit breaker events for critical Gate 2 violations
    for (const v of gate2.violations) {
      if (v.severity === "critical") {
        circuitBreakerEvents.push({
          breakerType: v.rule,
          severity: "critical",
          triggerValue: v.currentValue,
          thresholdValue: v.limit,
          actionTaken: "trade_blocked",
          details: { gate: "risk_limits", message: v.message },
          symbol: context.trade.symbol,
        });
      }
    }

    // Gate 3: Execution Gate
    const gate3 = await this.executionGate(context);
    gateResults.push(gate3);
    allViolations.push(...gate3.violations);
    allWarnings.push(...gate3.warnings);

    // Generate adjusted trade if possible
    let adjustedTrade: ProposedTrade | undefined;
    if (allViolations.some((v) => v.rule === "max_position_size")) {
      const maxQuantity = Math.floor(
        (context.portfolio.totalValue * this.rules.maxPositionSize) /
          100 /
          context.trade.price,
      );
      if (maxQuantity > 0) {
        adjustedTrade = { ...context.trade, quantity: maxQuantity };
      }
    }

    // Determine confirmation requirement based on mode
    const approved = allViolations.length === 0;
    let confirmationRequired = false;

    if (context.operatingMode === "guided" && approved) {
      confirmationRequired = true;
    }

    return {
      approved,
      violations: allViolations,
      warnings: allWarnings,
      adjustedTrade,
      gateResults,
      operatingMode: context.operatingMode,
      confirmationRequired,
      circuitBreakerEvents,
    };
  }

  /**
   * Persist a circuit breaker event to the database.
   */
  async recordCircuitBreakerEvent(
    event: CircuitBreakerEventInput,
  ): Promise<void> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabaseAdmin.from as any)("circuit_breaker_events").upsert({
        user_id: this.userId,
        breaker_type: event.breakerType,
        severity: event.severity,
        trigger_value: event.triggerValue,
        threshold_value: event.thresholdValue,
        action_taken: event.actionTaken,
        details: event.details,
        symbol: event.symbol ?? null,
        created_at: new Date().toISOString(),
      });
    } catch {
      // DB unavailable — circuit breaker event not persisted
    }
  }

  // ============================================================================
  // PORTFOLIO RISK STATUS
  // ============================================================================

  async checkPortfolioRisk(portfolio: PortfolioState): Promise<{
    status: "healthy" | "warning" | "critical";
    issues: string[];
    metrics: Record<string, number>;
  }> {
    const issues: string[] = [];
    let status: "healthy" | "warning" | "critical" = "healthy";

    const metrics = {
      cashPercent: (portfolio.cashBalance / portfolio.totalValue) * 100,
      dailyLossPercent:
        (Math.abs(Math.min(0, portfolio.dailyPnL)) / portfolio.totalValue) *
        100,
      weeklyLossPercent:
        (Math.abs(Math.min(0, portfolio.weeklyPnL)) / portfolio.totalValue) *
        100,
      drawdown: portfolio.drawdown,
      positionCount: portfolio.openPositionCount,
      largestPosition: Math.max(
        ...portfolio.positions.map((p) => p.percent),
        0,
      ),
    };

    // Check critical conditions
    if (metrics.drawdown >= this.rules.maxDrawdown) {
      status = "critical";
      issues.push(`Drawdown ${metrics.drawdown.toFixed(1)}% at or above limit`);
    }

    if (metrics.dailyLossPercent >= this.rules.maxDailyLoss) {
      status = "critical";
      issues.push(
        `Daily loss ${metrics.dailyLossPercent.toFixed(1)}% at or above limit`,
      );
    }

    // Check warning conditions
    if (status !== "critical") {
      if (metrics.drawdown >= this.rules.maxDrawdown * 0.8) {
        status = "warning";
        issues.push(
          `Drawdown ${metrics.drawdown.toFixed(1)}% approaching limit`,
        );
      }

      if (metrics.dailyLossPercent >= this.rules.maxDailyLoss * 0.8) {
        status = "warning";
        issues.push(
          `Daily loss ${metrics.dailyLossPercent.toFixed(1)}% approaching limit`,
        );
      }

      if (metrics.cashPercent < this.rules.minCashReserve * 1.5) {
        status = "warning";
        issues.push(`Cash reserve ${metrics.cashPercent.toFixed(1)}% is low`);
      }

      if (metrics.largestPosition > this.rules.maxPositionSize * 0.9) {
        status = "warning";
        issues.push(
          `Largest position ${metrics.largestPosition.toFixed(1)}% near limit`,
        );
      }
    }

    return { status, issues, metrics };
  }

  // ============================================================================
  // RSK-003: AUTOMATED KILL SWITCH TRIGGERS
  // ============================================================================

  /**
   * Record a trade loss and check velocity-based kill switch.
   * Call this after each closed trade with a loss.
   */
  async recordLoss(
    lossPct: number,
  ): Promise<{ triggered: boolean; reason?: string }> {
    const now = Date.now();
    this.lossEvents.push({ timestamp: now, lossPct });
    this.consecutiveLosses++;

    // Prune stale loss events outside the velocity window
    const windowStart = now - this.rules.lossVelocityWindowMs;
    this.lossEvents = this.lossEvents.filter((e) => e.timestamp >= windowStart);

    // Check loss velocity: total loss% in window / window hours
    const totalLoss = this.lossEvents.reduce((sum, e) => sum + e.lossPct, 0);
    const windowHours = this.rules.lossVelocityWindowMs / 3600_000;
    const velocity = totalLoss / windowHours;

    if (velocity >= this.rules.lossVelocityThreshold) {
      const reason = `Loss velocity ${velocity.toFixed(2)}%/hr exceeds threshold of ${this.rules.lossVelocityThreshold}%/hr`;
      await this.triggerKillSwitch(reason, "loss_velocity");
      return { triggered: true, reason };
    }

    // Check consecutive losses
    if (this.consecutiveLosses >= this.rules.maxConsecutiveLosses) {
      const reason = `${this.consecutiveLosses} consecutive losses reached limit of ${this.rules.maxConsecutiveLosses}`;
      await this.triggerKillSwitch(reason, "consecutive_losses");
      return { triggered: true, reason };
    }

    return { triggered: false };
  }

  /** Record a winning trade — resets consecutive loss counter */
  recordWin(): void {
    this.consecutiveLosses = 0;
  }

  /** Get current loss velocity (% per hour) */
  getLossVelocity(): number {
    const now = Date.now();
    const windowStart = now - this.rules.lossVelocityWindowMs;
    const recentLosses = this.lossEvents.filter(
      (e) => e.timestamp >= windowStart,
    );
    const totalLoss = recentLosses.reduce((sum, e) => sum + e.lossPct, 0);
    const windowHours = this.rules.lossVelocityWindowMs / 3600_000;
    return totalLoss / windowHours;
  }

  /** Get consecutive loss count */
  getConsecutiveLosses(): number {
    return this.consecutiveLosses;
  }

  // ============================================================================
  // RSK-006: CONCENTRATION ANALYSIS
  // ============================================================================

  /**
   * Calculate Herfindahl-Hirschman Index from position weights.
   * HHI = sum of squared position percentages (0-10000 scale).
   * < 1500 = diversified, 1500-2500 = moderate, > 2500 = concentrated
   */
  calculateHHI(positionPcts: number[]): number {
    return positionPcts.reduce((sum, pct) => sum + pct * pct, 0);
  }

  /**
   * Full concentration report for a portfolio.
   */
  getConcentrationReport(portfolio: PortfolioState): ConcentrationReport {
    const violations: RiskViolation[] = [];
    const warnings: RiskWarning[] = [];

    // HHI
    const pcts = portfolio.positions.map((p) => p.percent);
    const hhi = this.calculateHHI(pcts);
    const n = pcts.length;
    const normalizedHHI = n > 1 ? (hhi - 10000 / n) / (10000 - 10000 / n) : 1;

    if (hhi > this.rules.maxHHI) {
      violations.push({
        rule: "max_hhi_concentration",
        message: `Portfolio HHI ${hhi.toFixed(0)} exceeds limit of ${this.rules.maxHHI}`,
        severity: "high",
        currentValue: hhi,
        limit: this.rules.maxHHI,
      });
    } else if (hhi > this.rules.maxHHI * 0.8) {
      warnings.push({
        rule: "hhi_concentration_warning",
        message: `Portfolio HHI ${hhi.toFixed(0)} approaching limit of ${this.rules.maxHHI}`,
        currentValue: hhi,
        threshold: this.rules.maxHHI,
      });
    }

    // Single position hard cap
    const sorted = [...portfolio.positions].sort(
      (a, b) => b.percent - a.percent,
    );
    const topHolding =
      sorted.length > 0
        ? { symbol: sorted[0].symbol, pct: sorted[0].percent }
        : null;

    for (const pos of sorted) {
      if (pos.percent > this.rules.maxSinglePositionPct) {
        violations.push({
          rule: "max_single_position",
          message: `${pos.symbol} at ${pos.percent.toFixed(1)}% exceeds hard cap of ${this.rules.maxSinglePositionPct}%`,
          severity: "critical",
          currentValue: pos.percent,
          limit: this.rules.maxSinglePositionPct,
        });
      }
    }

    // Sector weights
    const sectorWeights: Record<string, number> = {};
    for (const pos of portfolio.positions) {
      const sector = pos.sector ?? "unknown";
      sectorWeights[sector] = (sectorWeights[sector] ?? 0) + pos.percent;
    }

    for (const [sector, weight] of Object.entries(sectorWeights)) {
      const sectorLimit =
        this.rules.maxSectorWeights[sector] ?? this.rules.maxSectorExposure;
      if (weight > sectorLimit) {
        violations.push({
          rule: "sector_weight_limit",
          message: `${sector} sector at ${weight.toFixed(1)}% exceeds limit of ${sectorLimit}%`,
          severity: "medium",
          currentValue: weight,
          limit: sectorLimit,
        });
      } else if (weight > sectorLimit * 0.85) {
        warnings.push({
          rule: "sector_weight_warning",
          message: `${sector} sector at ${weight.toFixed(1)}% approaching limit of ${sectorLimit}%`,
          currentValue: weight,
          threshold: sectorLimit,
        });
      }
    }

    return {
      hhi,
      normalizedHHI,
      topHolding,
      sectorWeights,
      violations,
      warnings,
    };
  }

  // ============================================================================
  // KILL SWITCH
  // ============================================================================

  async triggerKillSwitch(
    reason: string,
    triggerType: KillSwitchTrigger = "manual",
  ): Promise<void> {
    this.killSwitch = {
      active: true,
      reason,
      triggeredAt: new Date(),
      triggeredBy: triggerType === "manual" ? "user" : "system",
      triggerType,
    };

    // Persist to database
    await this.saveKillSwitchStatus();

    // RiskGateway: KILL SWITCH TRIGGERED
  }

  async resetKillSwitch(
    userId: string,
    confirmation: string,
  ): Promise<boolean> {
    if (confirmation !== "CONFIRM_RESET") {
      return false;
    }

    this.killSwitch = { active: false };
    await this.saveKillSwitchStatus();

    // RiskGateway: Kill switch reset by user
    return true;
  }

  getKillSwitchStatus(): KillSwitchStatus {
    return { ...this.killSwitch };
  }

  // ============================================================================
  // RULES MANAGEMENT
  // ============================================================================

  getRules(): RiskRules {
    return { ...this.rules };
  }

  async updateRules(updates: Partial<RiskRules>): Promise<void> {
    this.rules = { ...this.rules, ...updates };
    await this.saveRules();
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  private calculateSectorExposure(
    portfolio: PortfolioState,
    sector: string,
  ): number {
    return portfolio.positions
      .filter((p) => p.sector === sector)
      .reduce((sum, p) => sum + p.percent, 0);
  }

  private async saveKillSwitchStatus(): Promise<void> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabaseAdmin.from as any)("risk_rules").upsert({
        user_id: this.userId,
        kill_switch_active: this.killSwitch.active,
        kill_switch_reason: this.killSwitch.reason ?? null,
        kill_switch_triggered_at:
          this.killSwitch.triggeredAt?.toISOString() ?? null,
        kill_switch_triggered_by: this.killSwitch.triggeredBy ?? null,
        kill_switch_trigger_type: this.killSwitch.triggerType ?? null,
        updated_at: new Date().toISOString(),
      });
    } catch {
      // DB unavailable — kill switch state preserved in memory
    }
  }

  private async saveRules(): Promise<void> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabaseAdmin.from as any)("risk_rules").upsert({
        user_id: this.userId,
        max_position_size: this.rules.maxPositionSize,
        max_sector_exposure: this.rules.maxSectorExposure,
        max_correlated_exposure: this.rules.maxCorrelatedExposure,
        max_open_positions: this.rules.maxOpenPositions,
        max_daily_loss: this.rules.maxDailyLoss,
        max_weekly_loss: this.rules.maxWeeklyLoss,
        max_drawdown: this.rules.maxDrawdown,
        max_loss_per_trade: this.rules.maxLossPerTrade,
        min_cash_reserve: this.rules.minCashReserve,
        margin_utilization_limit: this.rules.marginUtilizationLimit,
        trading_hours_only: this.rules.tradingHoursOnly,
        no_trades_before_earnings: this.rules.noTradesBeforeEarnings,
        no_trades_around_fomc: this.rules.noTradesAroundFOMC,
        min_signal_consensus: this.rules.minSignalConsensus,
        min_confidence: this.rules.minConfidence,
        loss_velocity_window_ms: this.rules.lossVelocityWindowMs,
        loss_velocity_threshold: this.rules.lossVelocityThreshold,
        correlation_spike_threshold: this.rules.correlationSpikeThreshold,
        max_consecutive_losses: this.rules.maxConsecutiveLosses,
        max_hhi: this.rules.maxHHI,
        max_single_position_pct: this.rules.maxSinglePositionPct,
        max_sector_weights: this.rules.maxSectorWeights,
        updated_at: new Date().toISOString(),
      });
    } catch {
      // DB unavailable — rules preserved in memory
    }
  }

  async loadRules(): Promise<void> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabaseAdmin.from as any)("risk_rules")
        .select("*")
        .eq("user_id", this.userId)
        .single();

      if (data) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const row = data as any;
        this.rules = {
          maxPositionSize:
            row.max_position_size ?? DEFAULT_RISK_RULES.maxPositionSize,
          maxSectorExposure:
            row.max_sector_exposure ?? DEFAULT_RISK_RULES.maxSectorExposure,
          maxCorrelatedExposure:
            row.max_correlated_exposure ??
            DEFAULT_RISK_RULES.maxCorrelatedExposure,
          maxOpenPositions:
            row.max_open_positions ?? DEFAULT_RISK_RULES.maxOpenPositions,
          maxDailyLoss: row.max_daily_loss ?? DEFAULT_RISK_RULES.maxDailyLoss,
          maxWeeklyLoss:
            row.max_weekly_loss ?? DEFAULT_RISK_RULES.maxWeeklyLoss,
          maxDrawdown: row.max_drawdown ?? DEFAULT_RISK_RULES.maxDrawdown,
          maxLossPerTrade:
            row.max_loss_per_trade ?? DEFAULT_RISK_RULES.maxLossPerTrade,
          minCashReserve:
            row.min_cash_reserve ?? DEFAULT_RISK_RULES.minCashReserve,
          marginUtilizationLimit:
            row.margin_utilization_limit ??
            DEFAULT_RISK_RULES.marginUtilizationLimit,
          tradingHoursOnly:
            row.trading_hours_only ?? DEFAULT_RISK_RULES.tradingHoursOnly,
          noTradesBeforeEarnings:
            row.no_trades_before_earnings ??
            DEFAULT_RISK_RULES.noTradesBeforeEarnings,
          noTradesAroundFOMC:
            row.no_trades_around_fomc ?? DEFAULT_RISK_RULES.noTradesAroundFOMC,
          minSignalConsensus:
            row.min_signal_consensus ?? DEFAULT_RISK_RULES.minSignalConsensus,
          minConfidence: row.min_confidence ?? DEFAULT_RISK_RULES.minConfidence,
          lossVelocityWindowMs:
            row.loss_velocity_window_ms ??
            DEFAULT_RISK_RULES.lossVelocityWindowMs,
          lossVelocityThreshold:
            row.loss_velocity_threshold ??
            DEFAULT_RISK_RULES.lossVelocityThreshold,
          correlationSpikeThreshold:
            row.correlation_spike_threshold ??
            DEFAULT_RISK_RULES.correlationSpikeThreshold,
          maxConsecutiveLosses:
            row.max_consecutive_losses ??
            DEFAULT_RISK_RULES.maxConsecutiveLosses,
          maxHHI: row.max_hhi ?? DEFAULT_RISK_RULES.maxHHI,
          maxSinglePositionPct:
            row.max_single_position_pct ??
            DEFAULT_RISK_RULES.maxSinglePositionPct,
          maxSectorWeights:
            row.max_sector_weights ?? DEFAULT_RISK_RULES.maxSectorWeights,
        };

        this.killSwitch = {
          active: row.kill_switch_active ?? false,
          reason: row.kill_switch_reason,
          triggeredAt: row.kill_switch_triggered_at
            ? new Date(row.kill_switch_triggered_at)
            : undefined,
          triggeredBy: row.kill_switch_triggered_by ?? undefined,
          triggerType: row.kill_switch_trigger_type ?? undefined,
        };
      }
    } catch {
      // DB unavailable — continue with in-memory defaults
    }
  }
}

// Factory function
export function createRiskGateway(
  userId: string,
  rules?: Partial<RiskRules>,
): RiskGateway {
  return new RiskGateway(userId, rules);
}
