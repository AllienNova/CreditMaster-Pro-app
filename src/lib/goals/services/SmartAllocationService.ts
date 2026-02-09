/**
 * Smart Allocation Service
 *
 * Provides intelligent asset allocation recommendations based on:
 * - Goal type and timeline
 * - User risk profile
 * - Market conditions
 * - Tax efficiency
 * - Glide path adjustments
 */

import { GoalType, RiskTolerance } from './GoalInvestmentService';

// ============================================================================
// TYPES
// ============================================================================

export type AssetClass =
  | 'us_stocks'
  | 'intl_stocks'
  | 'emerging_markets'
  | 'bonds'
  | 'tips'
  | 'real_estate'
  | 'commodities'
  | 'cash'
  | 'alternatives';

export interface AssetAllocation {
  assetClass: AssetClass;
  targetPercent: number;
  minPercent: number;
  maxPercent: number;
  etfTicker?: string;
  etfName?: string;
  expenseRatio?: number;
}

export interface AllocationRecommendation {
  allocations: AssetAllocation[];
  riskScore: number;
  expectedReturn: number;
  expectedVolatility: number;
  sharpeRatio: number;
  rationale: string[];
  warnings?: string[];
}

export interface UserRiskProfile {
  riskTolerance: RiskTolerance;
  investmentExperience: 'beginner' | 'intermediate' | 'advanced';
  incomeStability: 'stable' | 'variable' | 'uncertain';
  emergencyFundMonths: number;
  debtLevel: 'none' | 'low' | 'moderate' | 'high';
  age?: number;
}

export interface GoalContext {
  goalType: GoalType;
  targetAmount: number;
  currentAmount: number;
  targetDate: Date;
  priority: number;
  isFlexible: boolean;
}

export interface MarketConditions {
  equityValuation: 'undervalued' | 'fair' | 'overvalued';
  interestRateEnvironment: 'rising' | 'stable' | 'falling';
  inflationOutlook: 'low' | 'moderate' | 'high';
  economicCycle: 'expansion' | 'peak' | 'contraction' | 'trough';
}

export interface GlidePath {
  yearFromStart: number;
  allocations: AssetAllocation[];
}

// ============================================================================
// CONSTANTS
// ============================================================================

const ASSET_CLASS_INFO: Record<
  AssetClass,
  {
    name: string;
    expectedReturn: number;
    volatility: number;
    correlation: Record<AssetClass, number>;
    defaultEtf: { ticker: string; name: string; expenseRatio: number };
  }
> = {
  us_stocks: {
    name: 'US Stocks',
    expectedReturn: 0.1,
    volatility: 0.16,
    correlation: {
      us_stocks: 1,
      intl_stocks: 0.85,
      emerging_markets: 0.75,
      bonds: 0.1,
      tips: 0.05,
      real_estate: 0.65,
      commodities: 0.3,
      cash: 0,
      alternatives: 0.5,
    },
    defaultEtf: {
      ticker: 'VTI',
      name: 'Vanguard Total Stock Market ETF',
      expenseRatio: 0.0003,
    },
  },
  intl_stocks: {
    name: 'International Stocks',
    expectedReturn: 0.08,
    volatility: 0.18,
    correlation: {
      us_stocks: 0.85,
      intl_stocks: 1,
      emerging_markets: 0.8,
      bonds: 0.15,
      tips: 0.1,
      real_estate: 0.55,
      commodities: 0.35,
      cash: 0,
      alternatives: 0.55,
    },
    defaultEtf: {
      ticker: 'VXUS',
      name: 'Vanguard Total International Stock ETF',
      expenseRatio: 0.0007,
    },
  },
  emerging_markets: {
    name: 'Emerging Markets',
    expectedReturn: 0.11,
    volatility: 0.24,
    correlation: {
      us_stocks: 0.75,
      intl_stocks: 0.8,
      emerging_markets: 1,
      bonds: 0.2,
      tips: 0.15,
      real_estate: 0.5,
      commodities: 0.45,
      cash: 0,
      alternatives: 0.6,
    },
    defaultEtf: {
      ticker: 'VWO',
      name: 'Vanguard FTSE Emerging Markets ETF',
      expenseRatio: 0.0008,
    },
  },
  bonds: {
    name: 'US Bonds',
    expectedReturn: 0.04,
    volatility: 0.05,
    correlation: {
      us_stocks: 0.1,
      intl_stocks: 0.15,
      emerging_markets: 0.2,
      bonds: 1,
      tips: 0.7,
      real_estate: 0.25,
      commodities: 0.1,
      cash: 0.3,
      alternatives: 0.2,
    },
    defaultEtf: {
      ticker: 'BND',
      name: 'Vanguard Total Bond Market ETF',
      expenseRatio: 0.0003,
    },
  },
  tips: {
    name: 'Inflation-Protected Bonds',
    expectedReturn: 0.035,
    volatility: 0.06,
    correlation: {
      us_stocks: 0.05,
      intl_stocks: 0.1,
      emerging_markets: 0.15,
      bonds: 0.7,
      tips: 1,
      real_estate: 0.3,
      commodities: 0.25,
      cash: 0.2,
      alternatives: 0.15,
    },
    defaultEtf: {
      ticker: 'VTIP',
      name: 'Vanguard Short-Term Inflation-Protected Securities ETF',
      expenseRatio: 0.0004,
    },
  },
  real_estate: {
    name: 'Real Estate (REITs)',
    expectedReturn: 0.08,
    volatility: 0.18,
    correlation: {
      us_stocks: 0.65,
      intl_stocks: 0.55,
      emerging_markets: 0.5,
      bonds: 0.25,
      tips: 0.3,
      real_estate: 1,
      commodities: 0.35,
      cash: 0.1,
      alternatives: 0.45,
    },
    defaultEtf: {
      ticker: 'VNQ',
      name: 'Vanguard Real Estate ETF',
      expenseRatio: 0.0012,
    },
  },
  commodities: {
    name: 'Commodities',
    expectedReturn: 0.05,
    volatility: 0.2,
    correlation: {
      us_stocks: 0.3,
      intl_stocks: 0.35,
      emerging_markets: 0.45,
      bonds: 0.1,
      tips: 0.25,
      real_estate: 0.35,
      commodities: 1,
      cash: 0,
      alternatives: 0.4,
    },
    defaultEtf: {
      ticker: 'GSG',
      name: 'iShares S&P GSCI Commodity-Indexed Trust',
      expenseRatio: 0.0075,
    },
  },
  cash: {
    name: 'Cash & Money Market',
    expectedReturn: 0.025,
    volatility: 0.01,
    correlation: {
      us_stocks: 0,
      intl_stocks: 0,
      emerging_markets: 0,
      bonds: 0.3,
      tips: 0.2,
      real_estate: 0.1,
      commodities: 0,
      cash: 1,
      alternatives: 0.05,
    },
    defaultEtf: {
      ticker: 'SGOV',
      name: 'iShares 0-3 Month Treasury Bond ETF',
      expenseRatio: 0.0005,
    },
  },
  alternatives: {
    name: 'Alternatives',
    expectedReturn: 0.07,
    volatility: 0.12,
    correlation: {
      us_stocks: 0.5,
      intl_stocks: 0.55,
      emerging_markets: 0.6,
      bonds: 0.2,
      tips: 0.15,
      real_estate: 0.45,
      commodities: 0.4,
      cash: 0.05,
      alternatives: 1,
    },
    defaultEtf: {
      ticker: 'QAI',
      name: 'IQ Hedge Multi-Strategy Tracker ETF',
      expenseRatio: 0.0079,
    },
  },
};

// ============================================================================
// SERVICE
// ============================================================================

export class SmartAllocationService {
  // ==========================================================================
  // MAIN RECOMMENDATION ENGINE
  // ==========================================================================

  /**
   * Generate smart allocation recommendation
   */
  generateRecommendation(
    goal: GoalContext,
    userProfile: UserRiskProfile,
    marketConditions?: MarketConditions
  ): AllocationRecommendation {
    const yearsToGoal = this.calculateYearsToGoal(goal.targetDate);

    // Determine effective risk level
    const effectiveRisk = this.determineEffectiveRisk(
      userProfile,
      yearsToGoal,
      goal
    );

    // Get base allocation for risk level
    let allocations = this.getBaseAllocation(effectiveRisk, yearsToGoal);

    // Adjust for goal type
    allocations = this.adjustForGoalType(allocations, goal.goalType);

    // Adjust for market conditions if provided
    if (marketConditions) {
      allocations = this.adjustForMarketConditions(
        allocations,
        marketConditions
      );
    }

    // Ensure allocations sum to 100%
    allocations = this.normalizeAllocations(allocations);

    // Calculate portfolio metrics
    const metrics = this.calculatePortfolioMetrics(allocations);

    // Generate rationale
    const rationale = this.generateRationale(
      goal,
      userProfile,
      yearsToGoal,
      effectiveRisk
    );

    // Generate warnings if any
    const warnings = this.generateWarnings(
      goal,
      userProfile,
      allocations,
      yearsToGoal
    );

    return {
      allocations,
      riskScore: this.calculateRiskScore(effectiveRisk, yearsToGoal),
      expectedReturn: metrics.expectedReturn,
      expectedVolatility: metrics.volatility,
      sharpeRatio: metrics.sharpeRatio,
      rationale,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  }

  /**
   * Generate glide path for a goal
   */
  generateGlidePath(
    goal: GoalContext,
    userProfile: UserRiskProfile
  ): GlidePath[] {
    const totalYears = this.calculateYearsToGoal(goal.targetDate);
    const glidePath: GlidePath[] = [];

    for (let year = 0; year <= totalYears; year++) {
      const yearsRemaining = totalYears - year;
      const simulatedGoal = {
        ...goal,
        targetDate: this.addYears(new Date(), yearsRemaining),
      };

      const recommendation = this.generateRecommendation(
        simulatedGoal,
        userProfile
      );

      glidePath.push({
        yearFromStart: year,
        allocations: recommendation.allocations,
      });
    }

    return glidePath;
  }

  // ==========================================================================
  // RISK DETERMINATION
  // ==========================================================================

  private determineEffectiveRisk(
    profile: UserRiskProfile,
    yearsToGoal: number,
    goal: GoalContext
  ): RiskTolerance {
    let riskScore = this.riskToleranceToScore(profile.riskTolerance);

    // Adjust for timeline
    if (yearsToGoal <= 2) {
      riskScore = Math.max(1, riskScore - 2);
    } else if (yearsToGoal <= 5) {
      riskScore = Math.max(1, riskScore - 1);
    } else if (yearsToGoal >= 15) {
      riskScore = Math.min(5, riskScore + 1);
    }

    // Adjust for experience
    if (profile.investmentExperience === 'beginner') {
      riskScore = Math.max(1, riskScore - 1);
    }

    // Adjust for income stability
    if (profile.incomeStability === 'uncertain') {
      riskScore = Math.max(1, riskScore - 1);
    }

    // Adjust for debt level
    if (profile.debtLevel === 'high') {
      riskScore = Math.max(1, riskScore - 1);
    }

    // Adjust for emergency fund
    if (profile.emergencyFundMonths < 3) {
      riskScore = Math.max(1, riskScore - 1);
    }

    // Adjust for goal priority and flexibility
    if (goal.priority === 1 && !goal.isFlexible) {
      riskScore = Math.max(1, riskScore - 1);
    }

    // Adjust for age if provided
    if (profile.age) {
      if (profile.age > 60) {
        riskScore = Math.max(1, riskScore - 1);
      } else if (profile.age < 30) {
        riskScore = Math.min(5, riskScore + 0.5);
      }
    }

    return this.scoreToRiskTolerance(Math.round(riskScore));
  }

  private riskToleranceToScore(risk: RiskTolerance): number {
    switch (risk) {
      case 'conservative':
        return 2;
      case 'moderate':
        return 3;
      case 'aggressive':
        return 4;
    }
  }

  private scoreToRiskTolerance(score: number): RiskTolerance {
    if (score <= 2) return 'conservative';
    if (score <= 3) return 'moderate';
    return 'aggressive';
  }

  // ==========================================================================
  // ALLOCATION GENERATION
  // ==========================================================================

  private getBaseAllocation(
    risk: RiskTolerance,
    yearsToGoal: number
  ): AssetAllocation[] {
    const allocations: AssetAllocation[] = [];

    if (risk === 'conservative') {
      allocations.push(
        {
          assetClass: 'bonds',
          targetPercent: 50,
          minPercent: 40,
          maxPercent: 60,
          ...this.getEtfInfo('bonds'),
        },
        {
          assetClass: 'us_stocks',
          targetPercent: 25,
          minPercent: 15,
          maxPercent: 35,
          ...this.getEtfInfo('us_stocks'),
        },
        {
          assetClass: 'tips',
          targetPercent: 10,
          minPercent: 5,
          maxPercent: 15,
          ...this.getEtfInfo('tips'),
        },
        {
          assetClass: 'cash',
          targetPercent: 10,
          minPercent: 5,
          maxPercent: 20,
          ...this.getEtfInfo('cash'),
        },
        {
          assetClass: 'intl_stocks',
          targetPercent: 5,
          minPercent: 0,
          maxPercent: 10,
          ...this.getEtfInfo('intl_stocks'),
        }
      );
    } else if (risk === 'moderate') {
      allocations.push(
        {
          assetClass: 'us_stocks',
          targetPercent: 40,
          minPercent: 30,
          maxPercent: 50,
          ...this.getEtfInfo('us_stocks'),
        },
        {
          assetClass: 'bonds',
          targetPercent: 25,
          minPercent: 20,
          maxPercent: 35,
          ...this.getEtfInfo('bonds'),
        },
        {
          assetClass: 'intl_stocks',
          targetPercent: 15,
          minPercent: 10,
          maxPercent: 20,
          ...this.getEtfInfo('intl_stocks'),
        },
        {
          assetClass: 'real_estate',
          targetPercent: 10,
          minPercent: 5,
          maxPercent: 15,
          ...this.getEtfInfo('real_estate'),
        },
        {
          assetClass: 'emerging_markets',
          targetPercent: 5,
          minPercent: 0,
          maxPercent: 10,
          ...this.getEtfInfo('emerging_markets'),
        },
        {
          assetClass: 'cash',
          targetPercent: 5,
          minPercent: 2,
          maxPercent: 10,
          ...this.getEtfInfo('cash'),
        }
      );
    } else {
      allocations.push(
        {
          assetClass: 'us_stocks',
          targetPercent: 50,
          minPercent: 40,
          maxPercent: 60,
          ...this.getEtfInfo('us_stocks'),
        },
        {
          assetClass: 'intl_stocks',
          targetPercent: 20,
          minPercent: 15,
          maxPercent: 25,
          ...this.getEtfInfo('intl_stocks'),
        },
        {
          assetClass: 'emerging_markets',
          targetPercent: 10,
          minPercent: 5,
          maxPercent: 15,
          ...this.getEtfInfo('emerging_markets'),
        },
        {
          assetClass: 'real_estate',
          targetPercent: 10,
          minPercent: 5,
          maxPercent: 15,
          ...this.getEtfInfo('real_estate'),
        },
        {
          assetClass: 'alternatives',
          targetPercent: 5,
          minPercent: 0,
          maxPercent: 10,
          ...this.getEtfInfo('alternatives'),
        },
        {
          assetClass: 'bonds',
          targetPercent: 5,
          minPercent: 0,
          maxPercent: 15,
          ...this.getEtfInfo('bonds'),
        }
      );
    }

    return allocations;
  }

  private adjustForGoalType(
    allocations: AssetAllocation[],
    goalType: GoalType
  ): AssetAllocation[] {
    const adjusted = [...allocations];

    switch (goalType) {
      case 'retirement':
        // Add more stocks for long-term growth
        this.adjustAssetPercent(adjusted, 'us_stocks', 5);
        this.adjustAssetPercent(adjusted, 'bonds', -5);
        break;

      case 'house':
        // More conservative, protect downpayment
        this.adjustAssetPercent(adjusted, 'bonds', 10);
        this.adjustAssetPercent(adjusted, 'us_stocks', -10);
        break;

      case 'emergency':
        // Very conservative, high liquidity
        this.adjustAssetPercent(adjusted, 'cash', 15);
        this.adjustAssetPercent(adjusted, 'bonds', 10);
        this.adjustAssetPercent(adjusted, 'us_stocks', -20);
        this.adjustAssetPercent(adjusted, 'intl_stocks', -5);
        break;

      case 'education':
        // Consider tax-advantaged accounts
        this.adjustAssetPercent(adjusted, 'bonds', 5);
        this.adjustAssetPercent(adjusted, 'us_stocks', -5);
        break;
    }

    return adjusted;
  }

  private adjustForMarketConditions(
    allocations: AssetAllocation[],
    conditions: MarketConditions
  ): AssetAllocation[] {
    const adjusted = [...allocations];

    // Adjust for equity valuation
    if (conditions.equityValuation === 'overvalued') {
      this.adjustAssetPercent(adjusted, 'us_stocks', -5);
      this.adjustAssetPercent(adjusted, 'bonds', 3);
      this.adjustAssetPercent(adjusted, 'cash', 2);
    } else if (conditions.equityValuation === 'undervalued') {
      this.adjustAssetPercent(adjusted, 'us_stocks', 5);
      this.adjustAssetPercent(adjusted, 'cash', -5);
    }

    // Adjust for interest rates
    if (conditions.interestRateEnvironment === 'rising') {
      this.adjustAssetPercent(adjusted, 'bonds', -5);
      this.adjustAssetPercent(adjusted, 'tips', 3);
      this.adjustAssetPercent(adjusted, 'cash', 2);
    }

    // Adjust for inflation
    if (conditions.inflationOutlook === 'high') {
      this.adjustAssetPercent(adjusted, 'tips', 5);
      this.adjustAssetPercent(adjusted, 'real_estate', 3);
      this.adjustAssetPercent(adjusted, 'commodities', 2);
      this.adjustAssetPercent(adjusted, 'bonds', -10);
    }

    return adjusted;
  }

  private adjustAssetPercent(
    allocations: AssetAllocation[],
    assetClass: AssetClass,
    delta: number
  ): void {
    const asset = allocations.find((a) => a.assetClass === assetClass);
    if (asset) {
      asset.targetPercent = Math.max(
        asset.minPercent,
        Math.min(asset.maxPercent, asset.targetPercent + delta)
      );
    }
  }

  private normalizeAllocations(
    allocations: AssetAllocation[]
  ): AssetAllocation[] {
    const total = allocations.reduce((sum, a) => sum + a.targetPercent, 0);

    if (Math.abs(total - 100) < 0.01) return allocations;

    const factor = 100 / total;
    return allocations.map((a) => ({
      ...a,
      targetPercent: Math.round(a.targetPercent * factor * 10) / 10,
    }));
  }

  // ==========================================================================
  // METRICS CALCULATION
  // ==========================================================================

  private calculatePortfolioMetrics(allocations: AssetAllocation[]): {
    expectedReturn: number;
    volatility: number;
    sharpeRatio: number;
  } {
    const weights = allocations.map((a) => a.targetPercent / 100);
    const assets = allocations.map((a) => ASSET_CLASS_INFO[a.assetClass]);

    // Expected return
    const expectedReturn = weights.reduce(
      (sum, w, i) => sum + w * assets[i].expectedReturn,
      0
    );

    // Portfolio variance (simplified)
    let variance = 0;
    for (let i = 0; i < weights.length; i++) {
      for (let j = 0; j < weights.length; j++) {
        const corr = assets[i].correlation[allocations[j].assetClass];
        variance +=
          weights[i] *
          weights[j] *
          assets[i].volatility *
          assets[j].volatility *
          corr;
      }
    }
    const volatility = Math.sqrt(variance);

    // Sharpe ratio (assuming 2.5% risk-free rate)
    const riskFreeRate = 0.025;
    const sharpeRatio = (expectedReturn - riskFreeRate) / volatility;

    return {
      expectedReturn: Math.round(expectedReturn * 1000) / 1000,
      volatility: Math.round(volatility * 1000) / 1000,
      sharpeRatio: Math.round(sharpeRatio * 100) / 100,
    };
  }

  private calculateRiskScore(risk: RiskTolerance, yearsToGoal: number): number {
    const baseScore =
      risk === 'conservative' ? 30 : risk === 'moderate' ? 55 : 80;

    // Adjust for timeline
    if (yearsToGoal <= 2) {
      return Math.max(10, baseScore - 20);
    } else if (yearsToGoal >= 10) {
      return Math.min(95, baseScore + 10);
    }

    return baseScore;
  }

  // ==========================================================================
  // RATIONALE & WARNINGS
  // ==========================================================================

  private generateRationale(
    goal: GoalContext,
    profile: UserRiskProfile,
    yearsToGoal: number,
    effectiveRisk: RiskTolerance
  ): string[] {
    const rationale: string[] = [];

    rationale.push(
      `Based on your ${profile.riskTolerance} risk tolerance and ${yearsToGoal.toFixed(1)} years until your goal.`
    );

    if (yearsToGoal <= 3) {
      rationale.push(
        'Short timeline prioritizes capital preservation over growth.'
      );
    } else if (yearsToGoal >= 10) {
      rationale.push(
        'Long timeline allows for higher equity exposure to capture growth.'
      );
    }

    if (goal.goalType === 'retirement') {
      rationale.push(
        'Retirement goals benefit from long-term equity growth with gradual de-risking.'
      );
    } else if (goal.goalType === 'emergency') {
      rationale.push('Emergency funds prioritize liquidity and stability.');
    }

    if (profile.incomeStability === 'uncertain') {
      rationale.push(
        'Income uncertainty suggests maintaining higher cash reserves.'
      );
    }

    return rationale;
  }

  private generateWarnings(
    goal: GoalContext,
    profile: UserRiskProfile,
    allocations: AssetAllocation[],
    yearsToGoal: number
  ): string[] {
    const warnings: string[] = [];

    if (profile.emergencyFundMonths < 3) {
      warnings.push(
        'Consider building an emergency fund before aggressive investing.'
      );
    }

    if (profile.debtLevel === 'high') {
      warnings.push(
        'High debt levels may impact your ability to maintain contributions.'
      );
    }

    const stockPercent = allocations
      .filter((a) =>
        ['us_stocks', 'intl_stocks', 'emerging_markets'].includes(a.assetClass)
      )
      .reduce((sum, a) => sum + a.targetPercent, 0);

    if (stockPercent > 70 && yearsToGoal < 5) {
      warnings.push(
        'High equity exposure with short timeline carries significant risk.'
      );
    }

    if (goal.currentAmount / goal.targetAmount < 0.1 && yearsToGoal < 3) {
      warnings.push(
        'You may need to increase contributions to reach your goal on time.'
      );
    }

    return warnings;
  }

  // ==========================================================================
  // HELPERS
  // ==========================================================================

  private getEtfInfo(assetClass: AssetClass): {
    etfTicker: string;
    etfName: string;
    expenseRatio: number;
  } {
    const info = ASSET_CLASS_INFO[assetClass].defaultEtf;
    return {
      etfTicker: info.ticker,
      etfName: info.name,
      expenseRatio: info.expenseRatio,
    };
  }

  private calculateYearsToGoal(targetDate: Date): number {
    const now = new Date();
    return Math.max(
      0,
      (targetDate.getTime() - now.getTime()) / (365.25 * 24 * 60 * 60 * 1000)
    );
  }

  private addYears(date: Date, years: number): Date {
    const result = new Date(date);
    result.setFullYear(result.getFullYear() + years);
    return result;
  }
}

// ============================================================================
// SINGLETON
// ============================================================================

let smartAllocationInstance: SmartAllocationService | null = null;

export function getSmartAllocationService(): SmartAllocationService {
  if (!smartAllocationInstance) {
    smartAllocationInstance = new SmartAllocationService();
  }
  return smartAllocationInstance;
}

export const smartAllocationService = getSmartAllocationService();
