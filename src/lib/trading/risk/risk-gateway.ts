/**
 * Risk Gateway
 * 
 * Central risk management layer that validates all trades before execution.
 * Enforces portfolio-level risk rules and provides kill switch functionality.
 */

import { createClient } from '@/lib/supabase/server';

// ============================================================================
// TYPES
// ============================================================================

export interface RiskRules {
  // Position limits
  maxPositionSize: number;        // % of portfolio per position
  maxSectorExposure: number;      // % per sector
  maxCorrelatedExposure: number;  // % correlated assets
  maxOpenPositions: number;
  
  // Loss limits
  maxDailyLoss: number;           // % triggers pause
  maxWeeklyLoss: number;          // % triggers review
  maxDrawdown: number;            // % triggers kill switch
  maxLossPerTrade: number;        // Hard stop per trade
  
  // Cash management
  minCashReserve: number;         // Always maintain %
  marginUtilizationLimit: number; // Max margin usage %
  
  // Time rules
  tradingHoursOnly: boolean;
  noTradesBeforeEarnings: number; // Days before earnings
  noTradesAroundFOMC: boolean;
  
  // Consensus requirements
  minSignalConsensus: number;     // Min agreement %
  minConfidence: number;          // Min confidence score
}

export interface ProposedTrade {
  symbol: string;
  side: 'buy' | 'sell';
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
  severity: 'critical' | 'high' | 'medium';
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
  triggeredBy?: 'system' | 'user';
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
};

// ============================================================================
// RISK GATEWAY CLASS
// ============================================================================

export class RiskGateway {
  private rules: RiskRules;
  private killSwitch: KillSwitchStatus = { active: false };
  private userId: string;

  constructor(userId: string, rules?: Partial<RiskRules>) {
    this.userId = userId;
    this.rules = { ...DEFAULT_RISK_RULES, ...rules };
  }

  // ============================================================================
  // MAIN VALIDATION
  // ============================================================================

  async validateTrade(
    trade: ProposedTrade,
    portfolio: PortfolioState
  ): Promise<RiskValidation> {
    const violations: RiskViolation[] = [];
    const warnings: RiskWarning[] = [];

    // Check kill switch first
    if (this.killSwitch.active) {
      violations.push({
        rule: 'kill_switch',
        message: `Trading halted: ${this.killSwitch.reason}`,
        severity: 'critical',
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
        rule: 'max_position_size',
        message: `Position size ${positionPercent.toFixed(1)}% exceeds limit of ${this.rules.maxPositionSize}%`,
        severity: 'high',
        currentValue: positionPercent,
        limit: this.rules.maxPositionSize,
      });
    }

    // Cash reserve check
    const cashAfterTrade = portfolio.cashBalance - tradeValue;
    const cashPercent = (cashAfterTrade / portfolio.totalValue) * 100;
    
    if (cashPercent < this.rules.minCashReserve) {
      violations.push({
        rule: 'min_cash_reserve',
        message: `Trade would leave only ${cashPercent.toFixed(1)}% cash, below ${this.rules.minCashReserve}% minimum`,
        severity: 'high',
        currentValue: cashPercent,
        limit: this.rules.minCashReserve,
      });
    }

    // Open positions check
    if (trade.side === 'buy' && portfolio.openPositionCount >= this.rules.maxOpenPositions) {
      violations.push({
        rule: 'max_open_positions',
        message: `Already at maximum ${this.rules.maxOpenPositions} open positions`,
        severity: 'medium',
        currentValue: portfolio.openPositionCount,
        limit: this.rules.maxOpenPositions,
      });
    }

    // Daily loss check
    const dailyLossPercent = Math.abs(Math.min(0, portfolio.dailyPnL)) / portfolio.totalValue * 100;
    if (dailyLossPercent >= this.rules.maxDailyLoss) {
      violations.push({
        rule: 'max_daily_loss',
        message: `Daily loss ${dailyLossPercent.toFixed(1)}% has reached limit of ${this.rules.maxDailyLoss}%`,
        severity: 'critical',
        currentValue: dailyLossPercent,
        limit: this.rules.maxDailyLoss,
      });
    }

    // Drawdown check
    if (portfolio.drawdown >= this.rules.maxDrawdown) {
      violations.push({
        rule: 'max_drawdown',
        message: `Drawdown ${portfolio.drawdown.toFixed(1)}% has reached limit of ${this.rules.maxDrawdown}%`,
        severity: 'critical',
        currentValue: portfolio.drawdown,
        limit: this.rules.maxDrawdown,
      });
      
      // Auto-trigger kill switch
      await this.triggerKillSwitch(`Max drawdown of ${this.rules.maxDrawdown}% reached`);
    }

    // Sector exposure check
    if (trade.sector) {
      const sectorExposure = this.calculateSectorExposure(portfolio, trade.sector);
      const newExposure = sectorExposure + positionPercent;
      
      if (newExposure > this.rules.maxSectorExposure) {
        violations.push({
          rule: 'max_sector_exposure',
          message: `${trade.sector} exposure would be ${newExposure.toFixed(1)}%, exceeds ${this.rules.maxSectorExposure}%`,
          severity: 'medium',
          currentValue: newExposure,
          limit: this.rules.maxSectorExposure,
        });
      }
    }

    // Signal consensus check
    if (trade.signalConsensus !== undefined && trade.signalConsensus < this.rules.minSignalConsensus) {
      violations.push({
        rule: 'min_signal_consensus',
        message: `Signal consensus ${(trade.signalConsensus * 100).toFixed(0)}% below minimum ${(this.rules.minSignalConsensus * 100).toFixed(0)}%`,
        severity: 'medium',
        currentValue: trade.signalConsensus,
        limit: this.rules.minSignalConsensus,
      });
    }

    // Signal confidence check
    if (trade.signalConfidence !== undefined && trade.signalConfidence < this.rules.minConfidence) {
      violations.push({
        rule: 'min_confidence',
        message: `Signal confidence ${(trade.signalConfidence * 100).toFixed(0)}% below minimum ${(this.rules.minConfidence * 100).toFixed(0)}%`,
        severity: 'medium',
        currentValue: trade.signalConfidence,
        limit: this.rules.minConfidence,
      });
    }

    // Stop loss check
    if (!trade.stopLoss) {
      warnings.push({
        rule: 'missing_stop_loss',
        message: 'Trade has no stop loss defined',
        currentValue: 0,
        threshold: 1,
      });
    } else {
      const riskPercent = Math.abs(trade.price - trade.stopLoss) / trade.price * 100;
      if (riskPercent > this.rules.maxLossPerTrade) {
        violations.push({
          rule: 'max_loss_per_trade',
          message: `Stop loss risk ${riskPercent.toFixed(1)}% exceeds limit of ${this.rules.maxLossPerTrade}%`,
          severity: 'high',
          currentValue: riskPercent,
          limit: this.rules.maxLossPerTrade,
        });
      }
    }

    // Weekly loss warning
    const weeklyLossPercent = Math.abs(Math.min(0, portfolio.weeklyPnL)) / portfolio.totalValue * 100;
    if (weeklyLossPercent >= this.rules.maxWeeklyLoss * 0.8) {
      warnings.push({
        rule: 'weekly_loss_warning',
        message: `Weekly loss ${weeklyLossPercent.toFixed(1)}% approaching limit of ${this.rules.maxWeeklyLoss}%`,
        currentValue: weeklyLossPercent,
        threshold: this.rules.maxWeeklyLoss,
      });
    }

    // Generate adjusted trade if possible
    let adjustedTrade: ProposedTrade | undefined;
    if (violations.some(v => v.rule === 'max_position_size')) {
      const maxQuantity = Math.floor(
        (portfolio.totalValue * this.rules.maxPositionSize / 100) / trade.price
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
  // PORTFOLIO RISK STATUS
  // ============================================================================

  async checkPortfolioRisk(portfolio: PortfolioState): Promise<{
    status: 'healthy' | 'warning' | 'critical';
    issues: string[];
    metrics: Record<string, number>;
  }> {
    const issues: string[] = [];
    let status: 'healthy' | 'warning' | 'critical' = 'healthy';

    const metrics = {
      cashPercent: (portfolio.cashBalance / portfolio.totalValue) * 100,
      dailyLossPercent: Math.abs(Math.min(0, portfolio.dailyPnL)) / portfolio.totalValue * 100,
      weeklyLossPercent: Math.abs(Math.min(0, portfolio.weeklyPnL)) / portfolio.totalValue * 100,
      drawdown: portfolio.drawdown,
      positionCount: portfolio.openPositionCount,
      largestPosition: Math.max(...portfolio.positions.map(p => p.percent), 0),
    };

    // Check critical conditions
    if (metrics.drawdown >= this.rules.maxDrawdown) {
      status = 'critical';
      issues.push(`Drawdown ${metrics.drawdown.toFixed(1)}% at or above limit`);
    }

    if (metrics.dailyLossPercent >= this.rules.maxDailyLoss) {
      status = 'critical';
      issues.push(`Daily loss ${metrics.dailyLossPercent.toFixed(1)}% at or above limit`);
    }

    // Check warning conditions
    if (status !== 'critical') {
      if (metrics.drawdown >= this.rules.maxDrawdown * 0.8) {
        status = 'warning';
        issues.push(`Drawdown ${metrics.drawdown.toFixed(1)}% approaching limit`);
      }

      if (metrics.dailyLossPercent >= this.rules.maxDailyLoss * 0.8) {
        status = 'warning';
        issues.push(`Daily loss ${metrics.dailyLossPercent.toFixed(1)}% approaching limit`);
      }

      if (metrics.cashPercent < this.rules.minCashReserve * 1.5) {
        status = 'warning';
        issues.push(`Cash reserve ${metrics.cashPercent.toFixed(1)}% is low`);
      }

      if (metrics.largestPosition > this.rules.maxPositionSize * 0.9) {
        status = 'warning';
        issues.push(`Largest position ${metrics.largestPosition.toFixed(1)}% near limit`);
      }
    }

    return { status, issues, metrics };
  }

  // ============================================================================
  // KILL SWITCH
  // ============================================================================

  async triggerKillSwitch(reason: string): Promise<void> {
    this.killSwitch = {
      active: true,
      reason,
      triggeredAt: new Date(),
      triggeredBy: 'system',
    };

    // Persist to database
    await this.saveKillSwitchStatus();

    // RiskGateway: KILL SWITCH TRIGGERED
  }

  async resetKillSwitch(userId: string, confirmation: string): Promise<boolean> {
    if (confirmation !== 'CONFIRM_RESET') {
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

  private calculateSectorExposure(portfolio: PortfolioState, sector: string): number {
    return portfolio.positions
      .filter(p => p.sector === sector)
      .reduce((sum, p) => sum + p.percent, 0);
  }

  private async saveKillSwitchStatus(): Promise<void> {
    const supabase = await createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from('risk_rules').upsert({
      user_id: this.userId,
      kill_switch_active: this.killSwitch.active,
      kill_switch_reason: this.killSwitch.reason,
      kill_switch_triggered_at: this.killSwitch.triggeredAt?.toISOString(),
    });
  }

  private async saveRules(): Promise<void> {
    const supabase = await createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from('risk_rules').upsert({
      user_id: this.userId,
      max_daily_loss: this.rules.maxDailyLoss,
      max_position_size: this.rules.maxPositionSize,
      max_correlated_exposure: this.rules.maxCorrelatedExposure,
      max_sector_exposure: this.rules.maxSectorExposure,
      min_cash_reserve: this.rules.minCashReserve,
      max_open_positions: this.rules.maxOpenPositions,
      max_drawdown: this.rules.maxDrawdown,
      trading_hours_only: this.rules.tradingHoursOnly,
      no_trades_before_earnings: this.rules.noTradesBeforeEarnings,
      no_trades_around_fomc: this.rules.noTradesAroundFOMC,
      min_signal_consensus: this.rules.minSignalConsensus,
      min_confidence: this.rules.minConfidence,
    });
  }

  async loadRules(): Promise<void> {
    const supabase = await createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase as any)
      .from('risk_rules')
      .select('*')
      .eq('user_id', this.userId)
      .single();

    if (data) {
      this.rules = {
        maxPositionSize: data.max_position_size ?? DEFAULT_RISK_RULES.maxPositionSize,
        maxSectorExposure: data.max_sector_exposure ?? DEFAULT_RISK_RULES.maxSectorExposure,
        maxCorrelatedExposure: data.max_correlated_exposure ?? DEFAULT_RISK_RULES.maxCorrelatedExposure,
        maxOpenPositions: data.max_open_positions ?? DEFAULT_RISK_RULES.maxOpenPositions,
        maxDailyLoss: data.max_daily_loss ?? DEFAULT_RISK_RULES.maxDailyLoss,
        maxWeeklyLoss: DEFAULT_RISK_RULES.maxWeeklyLoss,
        maxDrawdown: data.max_drawdown ?? DEFAULT_RISK_RULES.maxDrawdown,
        maxLossPerTrade: DEFAULT_RISK_RULES.maxLossPerTrade,
        minCashReserve: data.min_cash_reserve ?? DEFAULT_RISK_RULES.minCashReserve,
        marginUtilizationLimit: DEFAULT_RISK_RULES.marginUtilizationLimit,
        tradingHoursOnly: data.trading_hours_only ?? DEFAULT_RISK_RULES.tradingHoursOnly,
        noTradesBeforeEarnings: data.no_trades_before_earnings ?? DEFAULT_RISK_RULES.noTradesBeforeEarnings,
        noTradesAroundFOMC: data.no_trades_around_fomc ?? DEFAULT_RISK_RULES.noTradesAroundFOMC,
        minSignalConsensus: data.min_signal_consensus ?? DEFAULT_RISK_RULES.minSignalConsensus,
        minConfidence: data.min_confidence ?? DEFAULT_RISK_RULES.minConfidence,
      };

      this.killSwitch = {
        active: data.kill_switch_active ?? false,
        reason: data.kill_switch_reason,
        triggeredAt: data.kill_switch_triggered_at ? new Date(data.kill_switch_triggered_at) : undefined,
      };
    }
  }
}

// Factory function
export function createRiskGateway(userId: string, rules?: Partial<RiskRules>): RiskGateway {
  return new RiskGateway(userId, rules);
}
