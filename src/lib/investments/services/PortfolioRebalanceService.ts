/**
 * Portfolio Rebalance Service
 *
 * Monitors portfolio allocations and generates rebalancing alerts when
 * holdings drift from target allocations. Features:
 * - Target allocation management
 * - Drift detection and alerts
 * - Rebalancing recommendations
 * - Tax-efficient rebalancing suggestions
 * - Historical rebalance tracking
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// ============================================================================
// TYPES
// ============================================================================

export type AssetClass =
  | 'us_stocks'
  | 'international_stocks'
  | 'emerging_markets'
  | 'bonds'
  | 'real_estate'
  | 'commodities'
  | 'cash'
  | 'crypto'
  | 'alternatives';

export type RebalanceStrategy =
  | 'threshold' // Rebalance when drift exceeds threshold
  | 'calendar' // Rebalance on schedule
  | 'cash_flow' // Rebalance using new contributions
  | 'tax_optimized'; // Consider tax implications

export type AlertPriority = 'low' | 'medium' | 'high';

export interface TargetAllocation {
  assetClass: AssetClass;
  targetPercent: number;
  minPercent: number;
  maxPercent: number;
}

export interface CurrentAllocation {
  assetClass: AssetClass;
  currentPercent: number;
  currentValue: number;
  drift: number;
  driftPercent: number;
}

export interface Portfolio {
  id: string;
  userId: string;
  name: string;
  totalValue: number;
  targetAllocations: TargetAllocation[];
  currentAllocations: CurrentAllocation[];
  rebalanceStrategy: RebalanceStrategy;
  driftThreshold: number;
  lastRebalanceDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface RebalanceAlert {
  id: string;
  portfolioId: string;
  userId: string;
  priority: AlertPriority;
  driftAmount: number;
  driftPercent: number;
  outOfBalanceAssets: AssetClass[];
  recommendation: string;
  dismissed: boolean;
  createdAt: Date;
}

export interface RebalanceTrade {
  assetClass: AssetClass;
  action: 'buy' | 'sell';
  currentValue: number;
  targetValue: number;
  tradeAmount: number;
  percentChange: number;
}

export interface RebalanceRecommendation {
  portfolioId: string;
  totalDrift: number;
  maxDrift: number;
  needsRebalance: boolean;
  trades: RebalanceTrade[];
  estimatedTaxImpact?: number;
  alternativeStrategies?: {
    strategy: string;
    description: string;
    trades: RebalanceTrade[];
  }[];
}

export interface RebalanceHistory {
  id: string;
  portfolioId: string;
  userId: string;
  executedAt: Date;
  preRebalanceAllocations: CurrentAllocation[];
  postRebalanceAllocations: CurrentAllocation[];
  trades: RebalanceTrade[];
  totalTradeValue: number;
}

export interface DriftAnalysis {
  totalDrift: number;
  maxDrift: number;
  driftByAsset: Map<AssetClass, number>;
  outOfBounds: AssetClass[];
}

// ============================================================================
// DEFAULT PORTFOLIO MODELS
// ============================================================================

export const PORTFOLIO_MODELS: Record<string, TargetAllocation[]> = {
  aggressive: [
    {
      assetClass: 'us_stocks',
      targetPercent: 50,
      minPercent: 45,
      maxPercent: 55,
    },
    {
      assetClass: 'international_stocks',
      targetPercent: 25,
      minPercent: 20,
      maxPercent: 30,
    },
    {
      assetClass: 'emerging_markets',
      targetPercent: 10,
      minPercent: 5,
      maxPercent: 15,
    },
    { assetClass: 'bonds', targetPercent: 10, minPercent: 5, maxPercent: 15 },
    { assetClass: 'cash', targetPercent: 5, minPercent: 0, maxPercent: 10 },
  ],
  moderate: [
    {
      assetClass: 'us_stocks',
      targetPercent: 40,
      minPercent: 35,
      maxPercent: 45,
    },
    {
      assetClass: 'international_stocks',
      targetPercent: 15,
      minPercent: 10,
      maxPercent: 20,
    },
    { assetClass: 'bonds', targetPercent: 35, minPercent: 30, maxPercent: 40 },
    {
      assetClass: 'real_estate',
      targetPercent: 5,
      minPercent: 0,
      maxPercent: 10,
    },
    { assetClass: 'cash', targetPercent: 5, minPercent: 0, maxPercent: 10 },
  ],
  conservative: [
    {
      assetClass: 'us_stocks',
      targetPercent: 25,
      minPercent: 20,
      maxPercent: 30,
    },
    {
      assetClass: 'international_stocks',
      targetPercent: 10,
      minPercent: 5,
      maxPercent: 15,
    },
    { assetClass: 'bonds', targetPercent: 50, minPercent: 45, maxPercent: 55 },
    { assetClass: 'cash', targetPercent: 15, minPercent: 10, maxPercent: 20 },
  ],
  income: [
    {
      assetClass: 'us_stocks',
      targetPercent: 20,
      minPercent: 15,
      maxPercent: 25,
    },
    { assetClass: 'bonds', targetPercent: 50, minPercent: 45, maxPercent: 55 },
    {
      assetClass: 'real_estate',
      targetPercent: 15,
      minPercent: 10,
      maxPercent: 20,
    },
    { assetClass: 'cash', targetPercent: 15, minPercent: 10, maxPercent: 20 },
  ],
};

// ============================================================================
// PORTFOLIO REBALANCE SERVICE
// ============================================================================

export class PortfolioRebalanceService {
  private supabase: SupabaseClient;

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  // ==========================================================================
  // PORTFOLIO MANAGEMENT
  // ==========================================================================

  async createPortfolio(
    userId: string,
    name: string,
    targetAllocations: TargetAllocation[],
    options?: {
      rebalanceStrategy?: RebalanceStrategy;
      driftThreshold?: number;
    }
  ): Promise<Portfolio> {
    const portfolio: Omit<Portfolio, 'id' | 'currentAllocations'> = {
      userId,
      name,
      totalValue: 0,
      targetAllocations,
      rebalanceStrategy: options?.rebalanceStrategy || 'threshold',
      driftThreshold: options?.driftThreshold || 5,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const { data, error } = await this.supabase
      .from('portfolios')
      .insert({
        user_id: portfolio.userId,
        name: portfolio.name,
        total_value: portfolio.totalValue,
        target_allocations: portfolio.targetAllocations,
        rebalance_strategy: portfolio.rebalanceStrategy,
        drift_threshold: portfolio.driftThreshold,
        created_at: portfolio.createdAt.toISOString(),
        updated_at: portfolio.updatedAt.toISOString(),
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to create portfolio: ${error.message}`);

    return this.mapRowToPortfolio(data);
  }

  async getPortfolio(
    portfolioId: string,
    userId: string
  ): Promise<Portfolio | null> {
    const { data, error } = await this.supabase
      .from('portfolios')
      .select('*')
      .eq('id', portfolioId)
      .eq('user_id', userId)
      .single();

    if (error) return null;

    return this.mapRowToPortfolio(data);
  }

  async getUserPortfolios(userId: string): Promise<Portfolio[]> {
    const { data, error } = await this.supabase
      .from('portfolios')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw new Error(`Failed to get portfolios: ${error.message}`);

    return (data || []).map((row) => this.mapRowToPortfolio(row));
  }

  async updateTargetAllocations(
    portfolioId: string,
    userId: string,
    targetAllocations: TargetAllocation[]
  ): Promise<Portfolio> {
    // Validate allocations sum to 100%
    const total = targetAllocations.reduce(
      (sum, a) => sum + a.targetPercent,
      0
    );
    if (Math.abs(total - 100) > 0.01) {
      throw new Error(`Target allocations must sum to 100%, got ${total}%`);
    }

    const { data, error } = await this.supabase
      .from('portfolios')
      .update({
        target_allocations: targetAllocations,
        updated_at: new Date().toISOString(),
      })
      .eq('id', portfolioId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error)
      throw new Error(`Failed to update allocations: ${error.message}`);

    return this.mapRowToPortfolio(data);
  }

  // ==========================================================================
  // DRIFT ANALYSIS
  // ==========================================================================

  calculateDrift(
    targetAllocations: TargetAllocation[],
    currentAllocations: CurrentAllocation[]
  ): {
    totalDrift: number;
    maxDrift: number;
    driftByAsset: Map<AssetClass, number>;
    outOfBounds: AssetClass[];
  } {
    const driftByAsset = new Map<AssetClass, number>();
    const outOfBounds: AssetClass[] = [];
    let totalDrift = 0;
    let maxDrift = 0;

    for (const target of targetAllocations) {
      const current = currentAllocations.find(
        (c) => c.assetClass === target.assetClass
      );
      const currentPercent = current?.currentPercent || 0;
      const drift = currentPercent - target.targetPercent;
      const absDrift = Math.abs(drift);

      driftByAsset.set(target.assetClass, drift);
      totalDrift += absDrift;
      maxDrift = Math.max(maxDrift, absDrift);

      // Check if out of bounds
      if (
        currentPercent < target.minPercent ||
        currentPercent > target.maxPercent
      ) {
        outOfBounds.push(target.assetClass);
      }
    }

    return { totalDrift, maxDrift, driftByAsset, outOfBounds };
  }

  async analyzePortfolioDrift(
    portfolioId: string,
    userId: string
  ): Promise<{
    portfolio: Portfolio;
    driftAnalysis: { totalDrift: number; maxDrift: number; driftByAsset: Map<AssetClass, number>; outOfBounds: AssetClass[] };
    needsRebalance: boolean;
    alertPriority: AlertPriority;
  }> {
    const portfolio = await this.getPortfolio(portfolioId, userId);
    if (!portfolio) {
      throw new Error('Portfolio not found');
    }

    const driftAnalysis = this.calculateDrift(
      portfolio.targetAllocations,
      portfolio.currentAllocations
    );

    const needsRebalance =
      driftAnalysis.maxDrift > portfolio.driftThreshold ||
      driftAnalysis.outOfBounds.length > 0;

    let alertPriority: AlertPriority = 'low';
    if (driftAnalysis.maxDrift > portfolio.driftThreshold * 2) {
      alertPriority = 'high';
    } else if (driftAnalysis.maxDrift > portfolio.driftThreshold) {
      alertPriority = 'medium';
    }

    return { portfolio, driftAnalysis, needsRebalance, alertPriority };
  }

  // ==========================================================================
  // REBALANCING RECOMMENDATIONS
  // ==========================================================================

  generateRebalanceRecommendation(
    portfolio: Portfolio,
    options?: { taxOptimized?: boolean }
  ): RebalanceRecommendation {
    const driftAnalysis = this.calculateDrift(
      portfolio.targetAllocations,
      portfolio.currentAllocations
    );

    const trades: RebalanceTrade[] = [];

    for (const target of portfolio.targetAllocations) {
      const current = portfolio.currentAllocations.find(
        (c) => c.assetClass === target.assetClass
      );
      const currentValue = current?.currentValue || 0;
      const targetValue = (target.targetPercent / 100) * portfolio.totalValue;
      const tradeAmount = targetValue - currentValue;

      if (Math.abs(tradeAmount) > 100) {
        // Minimum trade threshold
        trades.push({
          assetClass: target.assetClass,
          action: tradeAmount > 0 ? 'buy' : 'sell',
          currentValue,
          targetValue,
          tradeAmount: Math.abs(tradeAmount),
          percentChange: (tradeAmount / currentValue) * 100 || 0,
        });
      }
    }

    // Sort by trade amount (largest first for sells, then buys)
    const sells = trades
      .filter((t) => t.action === 'sell')
      .sort((a, b) => b.tradeAmount - a.tradeAmount);
    const buys = trades
      .filter((t) => t.action === 'buy')
      .sort((a, b) => b.tradeAmount - a.tradeAmount);
    const sortedTrades = [...sells, ...buys];

    const recommendation: RebalanceRecommendation = {
      portfolioId: portfolio.id,
      totalDrift: driftAnalysis.totalDrift,
      maxDrift: driftAnalysis.maxDrift,
      needsRebalance: driftAnalysis.maxDrift > portfolio.driftThreshold,
      trades: sortedTrades,
    };

    // Add alternative strategies
    if (options?.taxOptimized) {
      recommendation.alternativeStrategies = [
        {
          strategy: 'cash_flow',
          description: 'Direct new contributions to underweighted assets',
          trades: buys,
        },
        {
          strategy: 'partial',
          description: 'Rebalance only the most out-of-balance assets',
          trades: sortedTrades.filter((t) => t.percentChange > 20),
        },
      ];
    }

    return recommendation;
  }

  // ==========================================================================
  // ALERTS
  // ==========================================================================

  async createRebalanceAlert(
    portfolioId: string,
    userId: string,
    driftAnalysis: ReturnType<typeof this.calculateDrift>,
    priority: AlertPriority
  ): Promise<RebalanceAlert> {
    const recommendation = this.generateAlertRecommendation(driftAnalysis);

    const { data, error } = await this.supabase
      .from('rebalance_alerts')
      .insert({
        portfolio_id: portfolioId,
        user_id: userId,
        priority,
        drift_amount: driftAnalysis.totalDrift,
        drift_percent: driftAnalysis.maxDrift,
        out_of_balance_assets: driftAnalysis.outOfBounds,
        recommendation,
        dismissed: false,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to create alert: ${error.message}`);

    return this.mapRowToAlert(data);
  }

  async getActiveAlerts(userId: string): Promise<RebalanceAlert[]> {
    const { data, error } = await this.supabase
      .from('rebalance_alerts')
      .select('*')
      .eq('user_id', userId)
      .eq('dismissed', false)
      .order('created_at', { ascending: false });

    if (error) throw new Error(`Failed to get alerts: ${error.message}`);

    return (data || []).map((row) => this.mapRowToAlert(row));
  }

  async dismissAlert(alertId: string, userId: string): Promise<void> {
    await this.supabase
      .from('rebalance_alerts')
      .update({ dismissed: true })
      .eq('id', alertId)
      .eq('user_id', userId);
  }

  // ==========================================================================
  // REBALANCE EXECUTION
  // ==========================================================================

  async recordRebalance(
    portfolioId: string,
    userId: string,
    preAllocations: CurrentAllocation[],
    postAllocations: CurrentAllocation[],
    trades: RebalanceTrade[]
  ): Promise<RebalanceHistory> {
    const totalTradeValue = trades.reduce((sum, t) => sum + t.tradeAmount, 0);

    const { data, error } = await this.supabase
      .from('rebalance_history')
      .insert({
        portfolio_id: portfolioId,
        user_id: userId,
        executed_at: new Date().toISOString(),
        pre_rebalance_allocations: preAllocations,
        post_rebalance_allocations: postAllocations,
        trades,
        total_trade_value: totalTradeValue,
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to record rebalance: ${error.message}`);

    // Update portfolio last rebalance date
    await this.supabase
      .from('portfolios')
      .update({
        last_rebalance_date: new Date().toISOString(),
        current_allocations: postAllocations,
        updated_at: new Date().toISOString(),
      })
      .eq('id', portfolioId)
      .eq('user_id', userId);

    // Dismiss any active alerts
    await this.supabase
      .from('rebalance_alerts')
      .update({ dismissed: true })
      .eq('portfolio_id', portfolioId)
      .eq('dismissed', false);

    return this.mapRowToHistory(data);
  }

  async getRebalanceHistory(
    portfolioId: string,
    userId: string,
    limit?: number
  ): Promise<RebalanceHistory[]> {
    let query = this.supabase
      .from('rebalance_history')
      .select('*')
      .eq('portfolio_id', portfolioId)
      .eq('user_id', userId)
      .order('executed_at', { ascending: false });

    if (limit) {
      query = query.limit(limit);
    }

    const { data, error } = await query;

    if (error) throw new Error(`Failed to get history: ${error.message}`);

    return (data || []).map((row) => this.mapRowToHistory(row));
  }

  // ==========================================================================
  // PRIVATE HELPERS
  // ==========================================================================

  private generateAlertRecommendation(
    driftAnalysis: ReturnType<typeof this.calculateDrift>
  ): string {
    if (driftAnalysis.outOfBounds.length === 0) {
      return `Portfolio drift of ${driftAnalysis.maxDrift.toFixed(1)}% detected. Consider rebalancing to maintain target allocation.`;
    }

    const assetNames = driftAnalysis.outOfBounds
      .map((a) => a.replace(/_/g, ' '))
      .join(', ');

    return `${driftAnalysis.outOfBounds.length} asset class(es) are outside target bounds: ${assetNames}. Rebalancing recommended.`;
  }

  private mapRowToPortfolio(row: Record<string, unknown>): Portfolio {
    return {
      id: row.id as string,
      userId: row.user_id as string,
      name: row.name as string,
      totalValue: row.total_value as number,
      targetAllocations: row.target_allocations as TargetAllocation[],
      currentAllocations:
        (row.current_allocations as CurrentAllocation[]) || [],
      rebalanceStrategy: row.rebalance_strategy as RebalanceStrategy,
      driftThreshold: row.drift_threshold as number,
      lastRebalanceDate: row.last_rebalance_date
        ? new Date(row.last_rebalance_date as string)
        : undefined,
      createdAt: new Date(row.created_at as string),
      updatedAt: new Date(row.updated_at as string),
    };
  }

  private mapRowToAlert(row: Record<string, unknown>): RebalanceAlert {
    return {
      id: row.id as string,
      portfolioId: row.portfolio_id as string,
      userId: row.user_id as string,
      priority: row.priority as AlertPriority,
      driftAmount: row.drift_amount as number,
      driftPercent: row.drift_percent as number,
      outOfBalanceAssets: row.out_of_balance_assets as AssetClass[],
      recommendation: row.recommendation as string,
      dismissed: row.dismissed as boolean,
      createdAt: new Date(row.created_at as string),
    };
  }

  private mapRowToHistory(row: Record<string, unknown>): RebalanceHistory {
    return {
      id: row.id as string,
      portfolioId: row.portfolio_id as string,
      userId: row.user_id as string,
      executedAt: new Date(row.executed_at as string),
      preRebalanceAllocations:
        row.pre_rebalance_allocations as CurrentAllocation[],
      postRebalanceAllocations:
        row.post_rebalance_allocations as CurrentAllocation[],
      trades: row.trades as RebalanceTrade[],
      totalTradeValue: row.total_trade_value as number,
    };
  }
}

// ============================================================================
// SINGLETON
// ============================================================================

let portfolioRebalanceServiceInstance: PortfolioRebalanceService | null = null;

export function getPortfolioRebalanceService(): PortfolioRebalanceService {
  if (!portfolioRebalanceServiceInstance) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    portfolioRebalanceServiceInstance = new PortfolioRebalanceService(
      supabaseUrl,
      supabaseKey
    );
  }
  return portfolioRebalanceServiceInstance;
}
