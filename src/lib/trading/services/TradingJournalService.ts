/**
 * Trading Journal Service
 *
 * Comprehensive trade logging and performance analytics:
 * - Trade entry logging with notes and screenshots
 * - Win/loss tracking and statistics
 * - Strategy tagging and analysis
 * - Emotional state tracking
 * - Performance metrics and reports
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// ============================================================================
// TYPES
// ============================================================================

export type TradeDirection = 'long' | 'short';
export type TradeStatus = 'open' | 'closed' | 'partial';
export type TradeOutcome = 'win' | 'loss' | 'breakeven';
export type EmotionalState =
  | 'confident'
  | 'fearful'
  | 'greedy'
  | 'neutral'
  | 'fomo'
  | 'revenge';
export type TimeFrame = '1m' | '5m' | '15m' | '1h' | '4h' | '1d' | '1w';

export interface TradeEntry {
  id: string;
  userId: string;
  symbol: string;
  direction: TradeDirection;
  status: TradeStatus;

  // Entry details
  entryDate: Date;
  entryPrice: number;
  entryQuantity: number;
  entryReason: string;

  // Exit details (if closed)
  exitDate?: Date;
  exitPrice?: number;
  exitQuantity?: number;
  exitReason?: string;

  // Risk management
  stopLoss?: number;
  takeProfit?: number;
  riskRewardRatio?: number;
  positionSize: number;
  riskAmount?: number;

  // Performance
  profitLoss?: number;
  profitLossPercent?: number;
  outcome?: TradeOutcome;

  // Analysis
  strategy?: string;
  timeFrame?: TimeFrame;
  setupType?: string;
  tags: string[];

  // Psychology
  emotionalStateBefore?: EmotionalState;
  emotionalStateAfter?: EmotionalState;
  followedPlan: boolean;
  mistakes?: string[];
  lessonsLearned?: string;

  // Media
  screenshotUrls?: string[];
  notes?: string;

  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

export interface TradeStats {
  totalTrades: number;
  openTrades: number;
  closedTrades: number;
  winningTrades: number;
  losingTrades: number;
  breakevenTrades: number;

  winRate: number;
  lossRate: number;
  averageWin: number;
  averageLoss: number;
  largestWin: number;
  largestLoss: number;

  profitFactor: number;
  expectancy: number;
  totalProfitLoss: number;
  averageRiskReward: number;

  averageHoldingTime: number; // in hours
  tradesThisWeek: number;
  tradesThisMonth: number;

  bestStrategy?: string;
  worstStrategy?: string;
  bestTimeFrame?: TimeFrame;

  consecutiveWins: number;
  consecutiveLosses: number;
  maxDrawdown: number;
}

export interface StrategyPerformance {
  strategy: string;
  trades: number;
  wins: number;
  losses: number;
  winRate: number;
  totalPL: number;
  averagePL: number;
  profitFactor: number;
}

export interface DailyPerformance {
  date: Date;
  trades: number;
  wins: number;
  losses: number;
  profitLoss: number;
  cumulativePL: number;
}

export interface TradeFilter {
  userId: string;
  startDate?: Date;
  endDate?: Date;
  symbols?: string[];
  strategies?: string[];
  outcomes?: TradeOutcome[];
  direction?: TradeDirection;
  status?: TradeStatus;
  tags?: string[];
  minPL?: number;
  maxPL?: number;
}

// ============================================================================
// SERVICE
// ============================================================================

export class TradingJournalService {
  private readonly supabase: SupabaseClient;

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  // ==========================================================================
  // TRADE CRUD
  // ==========================================================================

  async createTrade(
    trade: Omit<TradeEntry, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<TradeEntry> {
    const now = new Date();
    const newTrade = {
      ...trade,
      id: crypto.randomUUID(),
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    };

    const { data, error } = await this.supabase
      .from('trading_journal')
      .insert(this.toDbFormat(newTrade))
      .select()
      .single();

    if (error) throw error;
    return this.fromDbFormat(data);
  }

  async updateTrade(
    tradeId: string,
    updates: Partial<TradeEntry>
  ): Promise<TradeEntry> {
    const { data, error } = await this.supabase
      .from('trading_journal')
      .update({
        ...this.toDbFormat(updates),
        updated_at: new Date().toISOString(),
      })
      .eq('id', tradeId)
      .select()
      .single();

    if (error) throw error;
    return this.fromDbFormat(data);
  }

  async closeTrade(
    tradeId: string,
    exitPrice: number,
    exitQuantity: number,
    exitReason: string,
    emotionalStateAfter?: EmotionalState,
    lessonsLearned?: string
  ): Promise<TradeEntry> {
    // Get the current trade
    const { data: trade } = await this.supabase
      .from('trading_journal')
      .select('*')
      .eq('id', tradeId)
      .single();

    if (!trade) throw new Error('Trade not found');

    const entryValue = trade.entry_price * trade.entry_quantity;
    const exitValue = exitPrice * exitQuantity;

    let profitLoss: number;
    if (trade.direction === 'long') {
      profitLoss = exitValue - entryValue;
    } else {
      profitLoss = entryValue - exitValue;
    }

    const profitLossPercent = (profitLoss / entryValue) * 100;

    let outcome: TradeOutcome;
    if (profitLoss > 0) outcome = 'win';
    else if (profitLoss < 0) outcome = 'loss';
    else outcome = 'breakeven';

    return this.updateTrade(tradeId, {
      status: exitQuantity >= trade.entry_quantity ? 'closed' : 'partial',
      exitDate: new Date(),
      exitPrice,
      exitQuantity,
      exitReason,
      profitLoss,
      profitLossPercent,
      outcome,
      emotionalStateAfter,
      lessonsLearned,
    });
  }

  async deleteTrade(tradeId: string): Promise<void> {
    const { error } = await this.supabase
      .from('trading_journal')
      .delete()
      .eq('id', tradeId);

    if (error) throw error;
  }

  async getTrade(tradeId: string): Promise<TradeEntry | null> {
    const { data } = await this.supabase
      .from('trading_journal')
      .select('*')
      .eq('id', tradeId)
      .single();

    return data ? this.fromDbFormat(data) : null;
  }

  async getTrades(filter: TradeFilter): Promise<TradeEntry[]> {
    let query = this.supabase
      .from('trading_journal')
      .select('*')
      .eq('user_id', filter.userId)
      .order('entry_date', { ascending: false });

    if (filter.startDate) {
      query = query.gte('entry_date', filter.startDate.toISOString());
    }
    if (filter.endDate) {
      query = query.lte('entry_date', filter.endDate.toISOString());
    }
    if (filter.symbols?.length) {
      query = query.in('symbol', filter.symbols);
    }
    if (filter.strategies?.length) {
      query = query.in('strategy', filter.strategies);
    }
    if (filter.outcomes?.length) {
      query = query.in('outcome', filter.outcomes);
    }
    if (filter.direction) {
      query = query.eq('direction', filter.direction);
    }
    if (filter.status) {
      query = query.eq('status', filter.status);
    }

    const { data, error } = await query;
    if (error) throw error;

    return (data || []).map(this.fromDbFormat);
  }

  // ==========================================================================
  // STATISTICS
  // ==========================================================================

  async getTradeStats(
    userId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<TradeStats> {
    const trades = await this.getTrades({
      userId,
      startDate,
      endDate,
      status: 'closed',
    });

    const allTrades = await this.getTrades({ userId });
    const openTrades = allTrades.filter((t) => t.status === 'open');

    if (trades.length === 0) {
      return this.emptyStats(allTrades.length, openTrades.length);
    }

    const wins = trades.filter((t) => t.outcome === 'win');
    const losses = trades.filter((t) => t.outcome === 'loss');
    const breakevens = trades.filter((t) => t.outcome === 'breakeven');

    const totalWinAmount = wins.reduce(
      (sum, t) => sum + (t.profitLoss || 0),
      0
    );
    const totalLossAmount = Math.abs(
      losses.reduce((sum, t) => sum + (t.profitLoss || 0), 0)
    );
    const totalPL = trades.reduce((sum, t) => sum + (t.profitLoss || 0), 0);

    const profitFactor =
      totalLossAmount > 0
        ? totalWinAmount / totalLossAmount
        : totalWinAmount > 0
          ? Infinity
          : 0;

    const winRate = (wins.length / trades.length) * 100;
    const averageWin = wins.length > 0 ? totalWinAmount / wins.length : 0;
    const averageLoss = losses.length > 0 ? totalLossAmount / losses.length : 0;

    const expectancy =
      (winRate / 100) * averageWin - ((100 - winRate) / 100) * averageLoss;

    // Calculate consecutive streaks
    let maxConsecutiveWins = 0;
    let maxConsecutiveLosses = 0;
    let currentWinStreak = 0;
    let currentLossStreak = 0;

    for (const trade of trades.sort(
      (a, b) => a.entryDate.getTime() - b.entryDate.getTime()
    )) {
      if (trade.outcome === 'win') {
        currentWinStreak++;
        currentLossStreak = 0;
        maxConsecutiveWins = Math.max(maxConsecutiveWins, currentWinStreak);
      } else if (trade.outcome === 'loss') {
        currentLossStreak++;
        currentWinStreak = 0;
        maxConsecutiveLosses = Math.max(
          maxConsecutiveLosses,
          currentLossStreak
        );
      }
    }

    // Calculate holding times
    const holdingTimes = trades
      .filter((t) => t.exitDate)
      .map(
        (t) =>
          (t.exitDate!.getTime() - t.entryDate.getTime()) / (1000 * 60 * 60)
      );
    const averageHoldingTime =
      holdingTimes.length > 0
        ? holdingTimes.reduce((a, b) => a + b, 0) / holdingTimes.length
        : 0;

    // Trades this week/month
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const tradesThisWeek = trades.filter((t) => t.entryDate >= weekAgo).length;
    const tradesThisMonth = trades.filter(
      (t) => t.entryDate >= monthAgo
    ).length;

    // Best/worst strategy
    const strategyStats = this.calculateStrategyPerformance(trades);
    const sortedStrategies = strategyStats.sort(
      (a, b) => b.winRate - a.winRate
    );
    const bestStrategy = sortedStrategies[0]?.strategy;
    const worstStrategy =
      sortedStrategies[sortedStrategies.length - 1]?.strategy;

    // Calculate max drawdown
    let maxDrawdown = 0;
    let peak = 0;
    let runningPL = 0;

    for (const trade of trades.sort(
      (a, b) => a.entryDate.getTime() - b.entryDate.getTime()
    )) {
      runningPL += trade.profitLoss || 0;
      if (runningPL > peak) peak = runningPL;
      const drawdown = peak - runningPL;
      if (drawdown > maxDrawdown) maxDrawdown = drawdown;
    }

    // Average R:R
    const tradesWithRR = trades.filter((t) => t.riskRewardRatio);
    const averageRiskReward =
      tradesWithRR.length > 0
        ? tradesWithRR.reduce((sum, t) => sum + (t.riskRewardRatio || 0), 0) /
          tradesWithRR.length
        : 0;

    return {
      totalTrades: allTrades.length,
      openTrades: openTrades.length,
      closedTrades: trades.length,
      winningTrades: wins.length,
      losingTrades: losses.length,
      breakevenTrades: breakevens.length,
      winRate,
      lossRate: 100 - winRate,
      averageWin,
      averageLoss,
      largestWin:
        wins.length > 0 ? Math.max(...wins.map((t) => t.profitLoss || 0)) : 0,
      largestLoss:
        losses.length > 0
          ? Math.min(...losses.map((t) => t.profitLoss || 0))
          : 0,
      profitFactor,
      expectancy,
      totalProfitLoss: totalPL,
      averageRiskReward,
      averageHoldingTime,
      tradesThisWeek,
      tradesThisMonth,
      bestStrategy,
      worstStrategy,
      consecutiveWins: maxConsecutiveWins,
      consecutiveLosses: maxConsecutiveLosses,
      maxDrawdown,
    };
  }

  // ==========================================================================
  // ANALYTICS
  // ==========================================================================

  calculateStrategyPerformance(trades: TradeEntry[]): StrategyPerformance[] {
    const strategyMap = new Map<string, TradeEntry[]>();

    for (const trade of trades) {
      const strategy = trade.strategy || 'Untagged';
      if (!strategyMap.has(strategy)) {
        strategyMap.set(strategy, []);
      }
      strategyMap.get(strategy)!.push(trade);
    }

    return Array.from(strategyMap.entries()).map(
      ([strategy, strategyTrades]) => {
        const wins = strategyTrades.filter((t) => t.outcome === 'win');
        const losses = strategyTrades.filter((t) => t.outcome === 'loss');
        const totalPL = strategyTrades.reduce(
          (sum, t) => sum + (t.profitLoss || 0),
          0
        );
        const winAmount = wins.reduce((sum, t) => sum + (t.profitLoss || 0), 0);
        const lossAmount = Math.abs(
          losses.reduce((sum, t) => sum + (t.profitLoss || 0), 0)
        );

        return {
          strategy,
          trades: strategyTrades.length,
          wins: wins.length,
          losses: losses.length,
          winRate:
            strategyTrades.length > 0
              ? (wins.length / strategyTrades.length) * 100
              : 0,
          totalPL,
          averagePL:
            strategyTrades.length > 0 ? totalPL / strategyTrades.length : 0,
          profitFactor:
            lossAmount > 0
              ? winAmount / lossAmount
              : winAmount > 0
                ? Infinity
                : 0,
        };
      }
    );
  }

  async getDailyPerformance(
    userId: string,
    days: number = 30
  ): Promise<DailyPerformance[]> {
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);

    const trades = await this.getTrades({
      userId,
      startDate,
      endDate,
      status: 'closed',
    });

    const dailyMap = new Map<string, DailyPerformance>();
    let cumulativePL = 0;

    // Initialize all days
    for (
      let d = new Date(startDate);
      d <= endDate;
      d.setDate(d.getDate() + 1)
    ) {
      const dateKey = d.toISOString().split('T')[0];
      dailyMap.set(dateKey, {
        date: new Date(d),
        trades: 0,
        wins: 0,
        losses: 0,
        profitLoss: 0,
        cumulativePL: 0,
      });
    }

    // Populate with trade data
    for (const trade of trades) {
      if (!trade.exitDate) continue;
      const dateKey = trade.exitDate.toISOString().split('T')[0];
      const day = dailyMap.get(dateKey);
      if (day) {
        day.trades++;
        day.profitLoss += trade.profitLoss || 0;
        if (trade.outcome === 'win') day.wins++;
        if (trade.outcome === 'loss') day.losses++;
      }
    }

    // Calculate cumulative P/L
    const sorted = Array.from(dailyMap.values()).sort(
      (a, b) => a.date.getTime() - b.date.getTime()
    );
    for (const day of sorted) {
      cumulativePL += day.profitLoss;
      day.cumulativePL = cumulativePL;
    }

    return sorted;
  }

  async getSymbolPerformance(
    userId: string
  ): Promise<
    Map<string, { trades: number; winRate: number; totalPL: number }>
  > {
    const trades = await this.getTrades({ userId, status: 'closed' });
    const symbolMap = new Map<string, TradeEntry[]>();

    for (const trade of trades) {
      if (!symbolMap.has(trade.symbol)) {
        symbolMap.set(trade.symbol, []);
      }
      symbolMap.get(trade.symbol)!.push(trade);
    }

    const result = new Map();
    for (const [symbol, symbolTrades] of symbolMap) {
      const wins = symbolTrades.filter((t) => t.outcome === 'win').length;
      const totalPL = symbolTrades.reduce(
        (sum, t) => sum + (t.profitLoss || 0),
        0
      );
      result.set(symbol, {
        trades: symbolTrades.length,
        winRate: (wins / symbolTrades.length) * 100,
        totalPL,
      });
    }

    return result;
  }

  // ==========================================================================
  // INSIGHTS
  // ==========================================================================

  async generateInsights(userId: string): Promise<string[]> {
    const stats = await this.getTradeStats(userId);
    const insights: string[] = [];

    if (stats.closedTrades < 10) {
      insights.push(
        'Keep logging trades to unlock detailed performance insights (need 10+ trades).'
      );
      return insights;
    }

    // Win rate insights
    if (stats.winRate >= 60) {
      insights.push(
        `Excellent win rate of ${stats.winRate.toFixed(1)}%! Your edge is working.`
      );
    } else if (stats.winRate < 40) {
      insights.push(
        `Your win rate of ${stats.winRate.toFixed(1)}% suggests reviewing your entry criteria.`
      );
    }

    // Risk/reward insights
    if (stats.averageRiskReward < 1.5) {
      insights.push(
        'Consider improving your risk/reward ratio. Aim for at least 1.5:1.'
      );
    } else if (stats.averageRiskReward >= 2) {
      insights.push(
        `Great risk/reward ratio of ${stats.averageRiskReward.toFixed(1)}:1!`
      );
    }

    // Profit factor insights
    if (stats.profitFactor >= 2) {
      insights.push(
        `Strong profit factor of ${stats.profitFactor.toFixed(2)}. Your winners outpace losers.`
      );
    } else if (stats.profitFactor < 1) {
      insights.push(
        'Profit factor below 1 indicates losses exceed wins. Review your strategy.'
      );
    }

    // Streak insights
    if (stats.consecutiveLosses >= 3) {
      insights.push(
        `You had a ${stats.consecutiveLosses}-trade losing streak. Consider reducing position size after 2 consecutive losses.`
      );
    }

    // Best strategy insight
    if (stats.bestStrategy) {
      insights.push(
        `Your best performing strategy is "${stats.bestStrategy}". Consider focusing on it.`
      );
    }

    // Drawdown insight
    if (stats.maxDrawdown > 0) {
      insights.push(
        `Maximum drawdown was $${stats.maxDrawdown.toFixed(2)}. Ensure proper risk management.`
      );
    }

    return insights.slice(0, 5);
  }

  // ==========================================================================
  // HELPERS
  // ==========================================================================

  private emptyStats(totalTrades: number, openTrades: number): TradeStats {
    return {
      totalTrades,
      openTrades,
      closedTrades: 0,
      winningTrades: 0,
      losingTrades: 0,
      breakevenTrades: 0,
      winRate: 0,
      lossRate: 0,
      averageWin: 0,
      averageLoss: 0,
      largestWin: 0,
      largestLoss: 0,
      profitFactor: 0,
      expectancy: 0,
      totalProfitLoss: 0,
      averageRiskReward: 0,
      averageHoldingTime: 0,
      tradesThisWeek: 0,
      tradesThisMonth: 0,
      consecutiveWins: 0,
      consecutiveLosses: 0,
      maxDrawdown: 0,
    };
  }

  private toDbFormat(
    trade: Partial<
      TradeEntry & { id?: string; created_at?: string; updated_at?: string }
    >
  ): Record<string, unknown> {
    return {
      id: trade.id,
      user_id: trade.userId,
      symbol: trade.symbol,
      direction: trade.direction,
      status: trade.status,
      entry_date: trade.entryDate?.toISOString(),
      entry_price: trade.entryPrice,
      entry_quantity: trade.entryQuantity,
      entry_reason: trade.entryReason,
      exit_date: trade.exitDate?.toISOString(),
      exit_price: trade.exitPrice,
      exit_quantity: trade.exitQuantity,
      exit_reason: trade.exitReason,
      stop_loss: trade.stopLoss,
      take_profit: trade.takeProfit,
      risk_reward_ratio: trade.riskRewardRatio,
      position_size: trade.positionSize,
      risk_amount: trade.riskAmount,
      profit_loss: trade.profitLoss,
      profit_loss_percent: trade.profitLossPercent,
      outcome: trade.outcome,
      strategy: trade.strategy,
      time_frame: trade.timeFrame,
      setup_type: trade.setupType,
      tags: trade.tags,
      emotional_state_before: trade.emotionalStateBefore,
      emotional_state_after: trade.emotionalStateAfter,
      followed_plan: trade.followedPlan,
      mistakes: trade.mistakes,
      lessons_learned: trade.lessonsLearned,
      screenshot_urls: trade.screenshotUrls,
      notes: trade.notes,
      created_at: trade.created_at,
      updated_at: trade.updated_at,
    };
  }

  private fromDbFormat(data: Record<string, unknown>): TradeEntry {
    return {
      id: data.id as string,
      userId: data.user_id as string,
      symbol: data.symbol as string,
      direction: data.direction as TradeDirection,
      status: data.status as TradeStatus,
      entryDate: new Date(data.entry_date as string),
      entryPrice: data.entry_price as number,
      entryQuantity: data.entry_quantity as number,
      entryReason: data.entry_reason as string,
      exitDate: data.exit_date ? new Date(data.exit_date as string) : undefined,
      exitPrice: data.exit_price as number | undefined,
      exitQuantity: data.exit_quantity as number | undefined,
      exitReason: data.exit_reason as string | undefined,
      stopLoss: data.stop_loss as number | undefined,
      takeProfit: data.take_profit as number | undefined,
      riskRewardRatio: data.risk_reward_ratio as number | undefined,
      positionSize: data.position_size as number,
      riskAmount: data.risk_amount as number | undefined,
      profitLoss: data.profit_loss as number | undefined,
      profitLossPercent: data.profit_loss_percent as number | undefined,
      outcome: data.outcome as TradeOutcome | undefined,
      strategy: data.strategy as string | undefined,
      timeFrame: data.time_frame as TimeFrame | undefined,
      setupType: data.setup_type as string | undefined,
      tags: (data.tags as string[]) || [],
      emotionalStateBefore: data.emotional_state_before as
        | EmotionalState
        | undefined,
      emotionalStateAfter: data.emotional_state_after as
        | EmotionalState
        | undefined,
      followedPlan: data.followed_plan as boolean,
      mistakes: data.mistakes as string[] | undefined,
      lessonsLearned: data.lessons_learned as string | undefined,
      screenshotUrls: data.screenshot_urls as string[] | undefined,
      notes: data.notes as string | undefined,
      createdAt: new Date(data.created_at as string),
      updatedAt: new Date(data.updated_at as string),
    };
  }
}

// ============================================================================
// SINGLETON
// ============================================================================

let tradingJournalServiceInstance: TradingJournalService | null = null;

export function getTradingJournalService(): TradingJournalService {
  if (!tradingJournalServiceInstance) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    tradingJournalServiceInstance = new TradingJournalService(
      supabaseUrl,
      supabaseKey
    );
  }
  return tradingJournalServiceInstance;
}
