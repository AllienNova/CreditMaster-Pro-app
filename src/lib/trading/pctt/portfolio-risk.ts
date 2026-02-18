/**
 * PCTT Portfolio Risk Management
 *
 * Implements production-grade portfolio risk controls:
 * - Portfolio heat calculation (aggregate risk)
 * - Correlation controls (diversification enforcement)
 * - Drawdown-based scaling
 * - Kill switch
 */

// ============================================================================
// TYPES
// ============================================================================

export interface PositionRisk {
  symbol: string;
  side: "long" | "short";
  quantity: number;
  entryPrice: number;
  currentPrice: number;
  stopPrice: number;

  // Calculated risk
  dollarRisk: number; // Worst-case loss at stop
  percentRisk: number; // Risk as % of account
  unrealizedPL: number;
  unrealizedPLPercent: number;
}

export interface CorrelationPair {
  symbol1: string;
  symbol2: string;
  correlation: number;
  lookbackPeriod: number;
}

export interface PortfolioRiskMetrics {
  // Heat metrics
  totalHeat: number; // Sum of all position risks / account
  maxHeat: number; // Configured maximum heat
  heatUtilization: number; // totalHeat / maxHeat

  // Exposure metrics
  grossExposure: number; // Sum of absolute position values
  netExposure: number; // Long - Short exposure
  longExposure: number;
  shortExposure: number;

  // Concentration
  largestPosition: number; // Largest single position %
  sectorConcentration: Record<string, number>;

  // Correlation risk
  correlatedGroups: string[][];
  maxCorrelatedExposure: number;

  // Drawdown
  currentDrawdown: number;
  maxDrawdown: number;
  drawdownScaleFactor: number;

  // Status
  canTrade: boolean;
  blockReasons: string[];
  killSwitchActive: boolean;
  killSwitchReason?: string;
}

export interface PortfolioRiskConfig {
  // Heat limits
  maxHeat: number; // Max aggregate risk (default: 0.06 = 6%)
  maxPositionHeat: number; // Max single position risk (default: 0.02 = 2%)

  // Exposure limits
  maxGrossExposure: number; // Max total exposure (default: 2.0 = 200%)
  maxNetExposure: number; // Max directional bias (default: 1.0 = 100%)
  maxPositionSize: number; // Max single position (default: 0.20 = 20%)

  // Correlation
  correlationThreshold: number; // Threshold for "correlated" (default: 0.7)
  maxCorrelatedExposure: number; // Max exposure in correlated group (default: 0.30)
  correlationLookback: number; // Days for correlation calc (default: 60)

  // Drawdown scaling
  drawdownLevel1: number; // First scaling threshold (default: 0.05 = 5%)
  drawdownScale1: number; // Scale factor at level 1 (default: 0.5)
  drawdownLevel2: number; // Second threshold (default: 0.10 = 10%)
  drawdownScale2: number; // Scale at level 2 (default: 0.25)
  drawdownKillLevel: number; // Kill switch threshold (default: 0.15 = 15%)

  // Kill switch
  enableKillSwitch: boolean;
  killSwitchCooldownMinutes: number;
}

export interface TradeProposal {
  symbol: string;
  side: "long" | "short";
  quantity: number;
  entryPrice: number;
  stopPrice: number;
  sector?: string;
}

export interface RiskCheckResult {
  approved: boolean;
  adjustedQuantity?: number;
  reasons: string[];
  metrics: {
    proposedHeat: number;
    remainingHeat: number;
    correlationImpact: number;
  };
}

// ============================================================================
// DEFAULT CONFIG
// ============================================================================

export const DEFAULT_PORTFOLIO_RISK_CONFIG: PortfolioRiskConfig = {
  maxHeat: 0.06,
  maxPositionHeat: 0.02,
  maxGrossExposure: 2.0,
  maxNetExposure: 1.0,
  maxPositionSize: 0.2,
  correlationThreshold: 0.7,
  maxCorrelatedExposure: 0.3,
  correlationLookback: 60,
  drawdownLevel1: 0.05,
  drawdownScale1: 0.5,
  drawdownLevel2: 0.1,
  drawdownScale2: 0.25,
  drawdownKillLevel: 0.15,
  enableKillSwitch: true,
  killSwitchCooldownMinutes: 60,
};

// ============================================================================
// PORTFOLIO RISK MANAGER
// ============================================================================

export class PortfolioRiskManager {
  private config: PortfolioRiskConfig;
  private accountEquity: number;
  private peakEquity: number;
  private positions: Map<string, PositionRisk> = new Map();
  private correlationMatrix: Map<string, number> = new Map();
  private sectorMap: Map<string, string> = new Map();
  private killSwitchActive: boolean = false;
  private killSwitchReason?: string;
  private killSwitchTriggeredAt?: Date;

  constructor(
    accountEquity: number,
    config: Partial<PortfolioRiskConfig> = {},
  ) {
    this.accountEquity = accountEquity;
    this.peakEquity = accountEquity;
    this.config = { ...DEFAULT_PORTFOLIO_RISK_CONFIG, ...config };
  }

  // ============================================================================
  // POSITION MANAGEMENT
  // ============================================================================

  /**
   * Add or update a position
   */
  updatePosition(position: PositionRisk): void {
    // Calculate derived risk metrics
    const dollarRisk =
      Math.abs(position.entryPrice - position.stopPrice) * position.quantity;
    const percentRisk = dollarRisk / this.accountEquity;
    const unrealizedPL =
      (position.currentPrice - position.entryPrice) *
      position.quantity *
      (position.side === "long" ? 1 : -1);
    const unrealizedPLPercent =
      unrealizedPL / (position.entryPrice * position.quantity);

    this.positions.set(position.symbol, {
      ...position,
      dollarRisk,
      percentRisk,
      unrealizedPL,
      unrealizedPLPercent,
    });
  }

  /**
   * Remove a position
   */
  removePosition(symbol: string): void {
    this.positions.delete(symbol);
  }

  /**
   * Update account equity (for drawdown tracking)
   */
  updateEquity(newEquity: number): void {
    this.accountEquity = newEquity;
    if (newEquity > this.peakEquity) {
      this.peakEquity = newEquity;
    }

    // Check drawdown kill switch
    const drawdown = this.calculateDrawdown();
    if (
      this.config.enableKillSwitch &&
      drawdown >= this.config.drawdownKillLevel
    ) {
      this.triggerKillSwitch(
        `Drawdown exceeded ${this.config.drawdownKillLevel * 100}%`,
      );
    }
  }

  /**
   * Set sector for a symbol (for concentration tracking)
   */
  setSector(symbol: string, sector: string): void {
    this.sectorMap.set(symbol, sector);
  }

  /**
   * Update correlation between two symbols
   */
  updateCorrelation(
    symbol1: string,
    symbol2: string,
    correlation: number,
  ): void {
    const key = [symbol1, symbol2].sort().join(":");
    this.correlationMatrix.set(key, correlation);
  }

  // ============================================================================
  // HEAT CALCULATION
  // ============================================================================

  /**
   * Calculate total portfolio heat (aggregate risk)
   */
  calculateHeat(): number {
    let totalHeat = 0;

    for (const position of this.positions.values()) {
      totalHeat += position.percentRisk;
    }

    return totalHeat;
  }

  /**
   * Calculate remaining heat capacity
   */
  getRemainingHeat(): number {
    const currentHeat = this.calculateHeat();
    const scaledMaxHeat = this.config.maxHeat * this.getDrawdownScaleFactor();
    return Math.max(0, scaledMaxHeat - currentHeat);
  }

  // ============================================================================
  // CORRELATION ANALYSIS
  // ============================================================================

  /**
   * Get correlation between two symbols
   */
  getCorrelation(symbol1: string, symbol2: string): number {
    const key = [symbol1, symbol2].sort().join(":");
    return this.correlationMatrix.get(key) ?? 0;
  }

  /**
   * Find correlated symbol groups
   */
  findCorrelatedGroups(): string[][] {
    const symbols = Array.from(this.positions.keys());
    const groups: string[][] = [];
    const visited = new Set<string>();

    for (const symbol of symbols) {
      if (visited.has(symbol)) continue;

      const group = [symbol];
      visited.add(symbol);

      for (const other of symbols) {
        if (visited.has(other)) continue;

        const correlation = this.getCorrelation(symbol, other);
        if (Math.abs(correlation) >= this.config.correlationThreshold) {
          group.push(other);
          visited.add(other);
        }
      }

      if (group.length > 1) {
        groups.push(group);
      }
    }

    return groups;
  }

  /**
   * Calculate exposure in correlated groups
   */
  calculateCorrelatedExposure(): number {
    const groups = this.findCorrelatedGroups();
    let maxGroupExposure = 0;

    for (const group of groups) {
      let groupExposure = 0;
      for (const symbol of group) {
        const position = this.positions.get(symbol);
        if (position) {
          groupExposure +=
            (position.currentPrice * position.quantity) / this.accountEquity;
        }
      }
      maxGroupExposure = Math.max(maxGroupExposure, groupExposure);
    }

    return maxGroupExposure;
  }

  // ============================================================================
  // DRAWDOWN MANAGEMENT
  // ============================================================================

  /**
   * Calculate current drawdown from peak
   */
  calculateDrawdown(): number {
    if (this.peakEquity === 0) return 0;
    return (this.peakEquity - this.accountEquity) / this.peakEquity;
  }

  /**
   * Get drawdown-based scale factor for risk
   */
  getDrawdownScaleFactor(): number {
    const drawdown = this.calculateDrawdown();

    if (drawdown >= this.config.drawdownKillLevel) {
      return 0; // No trading
    } else if (drawdown >= this.config.drawdownLevel2) {
      return this.config.drawdownScale2;
    } else if (drawdown >= this.config.drawdownLevel1) {
      return this.config.drawdownScale1;
    }

    return 1.0; // Full capacity
  }

  // ============================================================================
  // KILL SWITCH
  // ============================================================================

  /**
   * Trigger the kill switch
   */
  triggerKillSwitch(reason: string): void {
    this.killSwitchActive = true;
    this.killSwitchReason = reason;
    this.killSwitchTriggeredAt = new Date();
  }

  /**
   * Reset kill switch (manual intervention)
   */
  resetKillSwitch(): void {
    this.killSwitchActive = false;
    this.killSwitchReason = undefined;
    this.killSwitchTriggeredAt = undefined;
  }

  /**
   * Check if kill switch cooldown has passed
   */
  isKillSwitchCooldownPassed(): boolean {
    if (!this.killSwitchTriggeredAt) return true;

    const cooldownMs = this.config.killSwitchCooldownMinutes * 60 * 1000;
    return Date.now() - this.killSwitchTriggeredAt.getTime() > cooldownMs;
  }

  // ============================================================================
  // TRADE APPROVAL
  // ============================================================================

  /**
   * Check if a proposed trade is allowed
   */
  checkTradeProposal(proposal: TradeProposal): RiskCheckResult {
    const reasons: string[] = [];
    let approved = true;

    // Calculate proposed position risk
    const proposedDollarRisk =
      Math.abs(proposal.entryPrice - proposal.stopPrice) * proposal.quantity;
    const proposedPercentRisk = proposedDollarRisk / this.accountEquity;
    const proposedValue = proposal.entryPrice * proposal.quantity;
    const proposedExposure = proposedValue / this.accountEquity;

    // Check kill switch
    if (this.killSwitchActive) {
      approved = false;
      reasons.push(`Kill switch active: ${this.killSwitchReason}`);
    }

    // Check drawdown
    const scaleFactor = this.getDrawdownScaleFactor();
    if (scaleFactor === 0) {
      approved = false;
      reasons.push("Trading halted due to drawdown");
    }

    // Check single position heat
    const scaledMaxPositionHeat = this.config.maxPositionHeat * scaleFactor;
    if (proposedPercentRisk > scaledMaxPositionHeat) {
      approved = false;
      reasons.push(
        `Position heat ${(proposedPercentRisk * 100).toFixed(2)}% exceeds max ${(scaledMaxPositionHeat * 100).toFixed(2)}%`,
      );
    }

    // Check total heat
    const currentHeat = this.calculateHeat();
    const scaledMaxHeat = this.config.maxHeat * scaleFactor;
    if (currentHeat + proposedPercentRisk > scaledMaxHeat) {
      approved = false;
      reasons.push(
        `Total heat would exceed ${(scaledMaxHeat * 100).toFixed(2)}%`,
      );
    }

    // Check position size
    if (proposedExposure > this.config.maxPositionSize) {
      approved = false;
      reasons.push(
        `Position size ${(proposedExposure * 100).toFixed(2)}% exceeds max ${(this.config.maxPositionSize * 100).toFixed(2)}%`,
      );
    }

    // Check correlation exposure
    let correlationImpact = 0;
    for (const [symbol, position] of this.positions) {
      const correlation = this.getCorrelation(proposal.symbol, symbol);
      if (Math.abs(correlation) >= this.config.correlationThreshold) {
        correlationImpact +=
          (position.currentPrice * position.quantity) / this.accountEquity;
      }
    }

    if (
      correlationImpact + proposedExposure >
      this.config.maxCorrelatedExposure
    ) {
      approved = false;
      reasons.push(
        `Correlated exposure ${((correlationImpact + proposedExposure) * 100).toFixed(2)}% exceeds max ${(this.config.maxCorrelatedExposure * 100).toFixed(2)}%`,
      );
    }

    // Check gross exposure
    const currentGross = this.calculateGrossExposure();
    if (currentGross + proposedExposure > this.config.maxGrossExposure) {
      approved = false;
      reasons.push(
        `Gross exposure would exceed ${(this.config.maxGrossExposure * 100).toFixed(2)}%`,
      );
    }

    // Calculate adjusted quantity if partially approved
    let adjustedQuantity: number | undefined;
    if (!approved && reasons.length > 0) {
      const maxAllowedRisk = Math.min(
        scaledMaxHeat - currentHeat,
        scaledMaxPositionHeat,
      );
      if (maxAllowedRisk > 0) {
        const riskPerShare = Math.abs(proposal.entryPrice - proposal.stopPrice);
        adjustedQuantity = Math.floor(
          (maxAllowedRisk * this.accountEquity) / riskPerShare,
        );
      }
    }

    return {
      approved,
      adjustedQuantity,
      reasons,
      metrics: {
        proposedHeat: proposedPercentRisk,
        remainingHeat: this.getRemainingHeat(),
        correlationImpact,
      },
    };
  }

  // ============================================================================
  // EXPOSURE CALCULATIONS
  // ============================================================================

  /**
   * Calculate gross exposure (sum of absolute positions)
   */
  calculateGrossExposure(): number {
    let gross = 0;
    for (const position of this.positions.values()) {
      gross += Math.abs(position.currentPrice * position.quantity);
    }
    return gross / this.accountEquity;
  }

  /**
   * Calculate net exposure (long - short)
   */
  calculateNetExposure(): number {
    let long = 0;
    let short = 0;

    for (const position of this.positions.values()) {
      const value = position.currentPrice * position.quantity;
      if (position.side === "long") {
        long += value;
      } else {
        short += value;
      }
    }

    return (long - short) / this.accountEquity;
  }

  /**
   * Calculate sector concentration
   */
  calculateSectorConcentration(): Record<string, number> {
    const concentration: Record<string, number> = {};

    for (const [symbol, position] of this.positions) {
      const sector = this.sectorMap.get(symbol) || "Unknown";
      const value =
        (position.currentPrice * position.quantity) / this.accountEquity;
      concentration[sector] = (concentration[sector] || 0) + value;
    }

    return concentration;
  }

  // ============================================================================
  // METRICS
  // ============================================================================

  /**
   * Get comprehensive portfolio risk metrics
   */
  getMetrics(): PortfolioRiskMetrics {
    const totalHeat = this.calculateHeat();
    const grossExposure = this.calculateGrossExposure();
    const netExposure = this.calculateNetExposure();
    const drawdown = this.calculateDrawdown();
    const correlatedGroups = this.findCorrelatedGroups();
    const maxCorrelatedExposure = this.calculateCorrelatedExposure();
    const sectorConcentration = this.calculateSectorConcentration();

    // Calculate long/short exposure
    let longExposure = 0;
    let shortExposure = 0;
    let largestPosition = 0;

    for (const position of this.positions.values()) {
      const exposure =
        (position.currentPrice * position.quantity) / this.accountEquity;
      largestPosition = Math.max(largestPosition, exposure);

      if (position.side === "long") {
        longExposure += exposure;
      } else {
        shortExposure += exposure;
      }
    }

    // Determine if trading is allowed
    const blockReasons: string[] = [];

    if (this.killSwitchActive) {
      blockReasons.push(`Kill switch: ${this.killSwitchReason}`);
    }
    if (totalHeat >= this.config.maxHeat * this.getDrawdownScaleFactor()) {
      blockReasons.push("Max heat reached");
    }
    if (grossExposure >= this.config.maxGrossExposure) {
      blockReasons.push("Max gross exposure reached");
    }
    if (drawdown >= this.config.drawdownKillLevel) {
      blockReasons.push("Drawdown kill level reached");
    }

    return {
      totalHeat,
      maxHeat: this.config.maxHeat,
      heatUtilization: totalHeat / this.config.maxHeat,
      grossExposure,
      netExposure,
      longExposure,
      shortExposure,
      largestPosition,
      sectorConcentration,
      correlatedGroups,
      maxCorrelatedExposure,
      currentDrawdown: drawdown,
      maxDrawdown: drawdown, // Would need history for true max
      drawdownScaleFactor: this.getDrawdownScaleFactor(),
      canTrade: blockReasons.length === 0,
      blockReasons,
      killSwitchActive: this.killSwitchActive,
      killSwitchReason: this.killSwitchReason,
    };
  }
}

// ============================================================================
// FACTORY
// ============================================================================

export function createPortfolioRiskManager(
  accountEquity: number,
  config?: Partial<PortfolioRiskConfig>,
): PortfolioRiskManager {
  return new PortfolioRiskManager(accountEquity, config);
}
