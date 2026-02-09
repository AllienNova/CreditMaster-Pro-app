/**
 * Rule-Based Trading Engine
 * 
 * Visual rule builder with condition evaluation for automated trading.
 * Supports entry/exit conditions, position sizing, and risk management.
 */

// ============================================================================
// TYPES
// ============================================================================

export type ConditionOperator = 
  | 'gt' | 'gte' | 'lt' | 'lte' | 'eq' | 'neq'
  | 'crosses_above' | 'crosses_below'
  | 'between' | 'outside';

export type ConditionType = 
  | 'price' | 'indicator' | 'volume' | 'pattern' 
  | 'time' | 'fundamental' | 'custom';

export type IndicatorType =
  | 'sma' | 'ema' | 'rsi' | 'macd' | 'macd_signal' | 'macd_histogram'
  | 'bollinger_upper' | 'bollinger_lower' | 'bollinger_middle'
  | 'atr' | 'adx' | 'cci' | 'stoch_k' | 'stoch_d'
  | 'vwap' | 'obv' | 'mfi' | 'williams_r';

export type PositionSizingMethod = 
  | 'fixed_dollar' | 'fixed_shares' | 'percent_portfolio' 
  | 'risk_based' | 'kelly' | 'volatility_adjusted';

export interface Condition {
  id: string;
  type: ConditionType;
  
  // Price conditions
  priceField?: 'open' | 'high' | 'low' | 'close' | 'vwap';
  
  // Indicator conditions
  indicator?: IndicatorType;
  indicatorPeriod?: number;
  indicatorParams?: Record<string, number>;
  
  // Comparison
  operator: ConditionOperator;
  value: number | string;
  value2?: number; // For 'between' operator
  
  // Reference (for crosses)
  referenceIndicator?: IndicatorType;
  referencePeriod?: number;
  referenceValue?: number;
  
  // Lookback
  barsAgo?: number;
}

export interface ConditionGroup {
  id: string;
  logic: 'and' | 'or';
  conditions: (Condition | ConditionGroup)[];
}

export interface PositionSizing {
  method: PositionSizingMethod;
  value: number;
  
  // Risk-based params
  riskPercent?: number;
  
  // Kelly params
  kellyFraction?: number;
  
  // Volatility params
  targetVolatility?: number;
  
  // Limits
  maxPositionPercent?: number;
  minShares?: number;
  maxShares?: number;
}

export interface StopLossConfig {
  type: 'fixed_percent' | 'fixed_price' | 'atr' | 'swing_low' | 'trailing';
  value: number;
  atrMultiplier?: number;
  trailingType?: 'percentage' | 'atr' | 'chandelier';
}

export interface TakeProfitConfig {
  type: 'fixed_percent' | 'fixed_price' | 'risk_multiple' | 'atr';
  value: number;
  targets?: { percent: number; exitPercent: number }[];
}

export interface RuleFilters {
  symbols?: string[];
  excludeSymbols?: string[];
  sectors?: string[];
  minPrice?: number;
  maxPrice?: number;
  minVolume?: number;
  minMarketCap?: number;
  maxMarketCap?: number;
  tradingHours?: { start: string; end: string };
  daysOfWeek?: number[];
  excludeEarningsDays?: number;
}

export interface ExecutionSettings {
  orderType: 'market' | 'limit' | 'stop_limit';
  limitOffset?: number; // % from current price
  timeInForce: 'day' | 'gtc' | 'ioc';
  extendedHours: boolean;
  maxSlippage?: number;
}

export interface TradingRule {
  id: string;
  userId: string;
  name: string;
  description?: string;
  enabled: boolean;
  
  // Conditions
  entryConditions: ConditionGroup;
  exitConditions: ConditionGroup;
  
  // Position management
  positionSizing: PositionSizing;
  
  // Risk management
  stopLoss: StopLossConfig;
  takeProfit?: TakeProfitConfig;
  
  // Filters
  filters: RuleFilters;
  
  // Execution
  execution: ExecutionSettings;
  
  // Performance tracking
  performance?: {
    totalTrades: number;
    winRate: number;
    avgReturn: number;
    profitFactor: number;
    lastTriggered?: Date;
  };
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

export interface RuleSignal {
  ruleId: string;
  ruleName: string;
  type: 'entry' | 'exit';
  symbol: string;
  side: 'buy' | 'sell' | 'close';
  price: number;
  quantity?: number;
  stopLoss?: number;
  takeProfit?: number;
  confidence: number;
  triggeredConditions: string[];
  timestamp: Date;
}

export interface MarketData {
  symbol: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  vwap?: number;
  timestamp: Date;
  indicators?: Record<string, number>;
}

// ============================================================================
// RULE-BASED ENGINE
// ============================================================================

export class RuleBasedEngine {
  private rules: Map<string, TradingRule> = new Map();
  private indicatorCache: Map<string, Map<string, number>> = new Map();

  // ============================================================================
  // RULE MANAGEMENT
  // ============================================================================

  addRule(rule: TradingRule): void {
    this.rules.set(rule.id, rule);
  }

  removeRule(ruleId: string): void {
    this.rules.delete(ruleId);
  }

  getRule(ruleId: string): TradingRule | undefined {
    return this.rules.get(ruleId);
  }

  getAllRules(): TradingRule[] {
    return Array.from(this.rules.values());
  }

  enableRule(ruleId: string): void {
    const rule = this.rules.get(ruleId);
    if (rule) rule.enabled = true;
  }

  disableRule(ruleId: string): void {
    const rule = this.rules.get(ruleId);
    if (rule) rule.enabled = false;
  }

  // ============================================================================
  // SIGNAL GENERATION
  // ============================================================================

  async evaluateRules(
    marketData: MarketData[],
    portfolioValue: number
  ): Promise<RuleSignal[]> {
    const signals: RuleSignal[] = [];

    for (const rule of this.rules.values()) {
      if (!rule.enabled) continue;

      for (const data of marketData) {
        // Check filters
        if (!this.passesFilters(data, rule.filters)) continue;

        // Evaluate entry conditions
        const entryResult = await this.evaluateConditionGroup(
          rule.entryConditions,
          data
        );

        if (entryResult.passed) {
          const quantity = this.calculatePositionSize(
            rule.positionSizing,
            data.close,
            portfolioValue,
            data
          );

          const stopLoss = this.calculateStopLoss(rule.stopLoss, data);
          const takeProfit = rule.takeProfit 
            ? this.calculateTakeProfit(rule.takeProfit, data, stopLoss)
            : undefined;

          signals.push({
            ruleId: rule.id,
            ruleName: rule.name,
            type: 'entry',
            symbol: data.symbol,
            side: 'buy',
            price: data.close,
            quantity,
            stopLoss,
            takeProfit,
            confidence: entryResult.confidence,
            triggeredConditions: entryResult.triggeredConditions,
            timestamp: new Date(),
          });
        }

        // Evaluate exit conditions
        const exitResult = await this.evaluateConditionGroup(
          rule.exitConditions,
          data
        );

        if (exitResult.passed) {
          signals.push({
            ruleId: rule.id,
            ruleName: rule.name,
            type: 'exit',
            symbol: data.symbol,
            side: 'close',
            price: data.close,
            confidence: exitResult.confidence,
            triggeredConditions: exitResult.triggeredConditions,
            timestamp: new Date(),
          });
        }
      }
    }

    return signals;
  }

  // ============================================================================
  // CONDITION EVALUATION
  // ============================================================================

  private async evaluateConditionGroup(
    group: ConditionGroup,
    data: MarketData
  ): Promise<{ passed: boolean; confidence: number; triggeredConditions: string[] }> {
    const results: { passed: boolean; conditionId: string }[] = [];

    for (const item of group.conditions) {
      if ('logic' in item) {
        // Nested group
        const nested = await this.evaluateConditionGroup(item, data);
        results.push({ passed: nested.passed, conditionId: item.id });
      } else {
        // Single condition
        const passed = await this.evaluateCondition(item, data);
        results.push({ passed, conditionId: item.id });
      }
    }

    const triggeredConditions = results
      .filter(r => r.passed)
      .map(r => r.conditionId);

    if (group.logic === 'and') {
      const passed = results.every(r => r.passed);
      const confidence = passed ? triggeredConditions.length / results.length : 0;
      return { passed, confidence, triggeredConditions };
    } else {
      const passed = results.some(r => r.passed);
      const confidence = triggeredConditions.length / results.length;
      return { passed, confidence, triggeredConditions };
    }
  }

  private async evaluateCondition(
    condition: Condition,
    data: MarketData
  ): Promise<boolean> {
    let currentValue: number;

    // Get current value based on condition type
    switch (condition.type) {
      case 'price':
        currentValue = this.getPriceValue(data, condition.priceField || 'close');
        break;
      case 'indicator':
        currentValue = await this.getIndicatorValue(
          data,
          condition.indicator!,
          condition.indicatorPeriod || 14,
          condition.indicatorParams
        );
        break;
      case 'volume':
        currentValue = data.volume;
        break;
      default:
        return false;
    }

    // Get comparison value
    let compareValue = typeof condition.value === 'number' 
      ? condition.value 
      : parseFloat(condition.value);

    // Handle reference indicator
    if (condition.referenceIndicator) {
      compareValue = await this.getIndicatorValue(
        data,
        condition.referenceIndicator,
        condition.referencePeriod || 14
      );
    } else if (condition.referenceValue !== undefined) {
      compareValue = condition.referenceValue;
    }

    // Evaluate operator
    return this.evaluateOperator(
      currentValue,
      condition.operator,
      compareValue,
      condition.value2
    );
  }

  private evaluateOperator(
    current: number,
    operator: ConditionOperator,
    compare: number,
    compare2?: number
  ): boolean {
    switch (operator) {
      case 'gt': return current > compare;
      case 'gte': return current >= compare;
      case 'lt': return current < compare;
      case 'lte': return current <= compare;
      case 'eq': return Math.abs(current - compare) < 0.0001;
      case 'neq': return Math.abs(current - compare) >= 0.0001;
      case 'between': return current >= compare && current <= (compare2 || compare);
      case 'outside': return current < compare || current > (compare2 || compare);
      case 'crosses_above':
      case 'crosses_below':
        // These require historical data - simplified for now
        return current > compare; // Placeholder
      default:
        return false;
    }
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  private getPriceValue(data: MarketData, field: string): number {
    switch (field) {
      case 'open': return data.open;
      case 'high': return data.high;
      case 'low': return data.low;
      case 'close': return data.close;
      case 'vwap': return data.vwap || data.close;
      default: return data.close;
    }
  }

  private async getIndicatorValue(
    data: MarketData,
    indicator: IndicatorType,
    period: number,
    params?: Record<string, number>
  ): Promise<number> {
    // Check cache first
    const cacheKey = `${data.symbol}:${indicator}:${period}`;
    const cached = this.indicatorCache.get(data.symbol)?.get(cacheKey);
    if (cached !== undefined) return cached;

    // Check if pre-computed in market data
    if (data.indicators?.[`${indicator}_${period}`] !== undefined) {
      return data.indicators[`${indicator}_${period}`];
    }

    // Calculate indicator (simplified - would integrate with TA library)
    let value = 0;
    switch (indicator) {
      case 'sma':
      case 'ema':
        value = data.close; // Placeholder
        break;
      case 'rsi':
        value = 50; // Placeholder
        break;
      case 'macd':
        value = 0; // Placeholder
        break;
      case 'atr':
        value = data.high - data.low; // Simplified
        break;
      default:
        value = 0;
    }

    // Cache result
    if (!this.indicatorCache.has(data.symbol)) {
      this.indicatorCache.set(data.symbol, new Map());
    }
    this.indicatorCache.get(data.symbol)!.set(cacheKey, value);

    return value;
  }

  private passesFilters(data: MarketData, filters: RuleFilters): boolean {
    if (filters.symbols?.length && !filters.symbols.includes(data.symbol)) {
      return false;
    }
    if (filters.excludeSymbols?.includes(data.symbol)) {
      return false;
    }
    if (filters.minPrice && data.close < filters.minPrice) {
      return false;
    }
    if (filters.maxPrice && data.close > filters.maxPrice) {
      return false;
    }
    if (filters.minVolume && data.volume < filters.minVolume) {
      return false;
    }
    return true;
  }

  private calculatePositionSize(
    sizing: PositionSizing,
    price: number,
    portfolioValue: number,
    data: MarketData
  ): number {
    let dollarAmount: number;

    switch (sizing.method) {
      case 'fixed_dollar':
        dollarAmount = sizing.value;
        break;
      case 'fixed_shares':
        return Math.min(
          sizing.value,
          sizing.maxShares || Infinity
        );
      case 'percent_portfolio':
        dollarAmount = portfolioValue * (sizing.value / 100);
        break;
      case 'risk_based':
        // Risk a % of portfolio per trade
        const riskPercent = sizing.riskPercent || 1;
        dollarAmount = portfolioValue * (riskPercent / 100);
        break;
      case 'kelly':
        // Simplified Kelly
        const fraction = sizing.kellyFraction || 0.25;
        dollarAmount = portfolioValue * fraction * (sizing.value / 100);
        break;
      case 'volatility_adjusted':
        // Adjust for volatility
        const targetVol = sizing.targetVolatility || 0.02;
        const estimatedVol = (data.high - data.low) / data.close;
        const volRatio = targetVol / Math.max(estimatedVol, 0.001);
        dollarAmount = portfolioValue * (sizing.value / 100) * Math.min(volRatio, 2);
        break;
      default:
        dollarAmount = portfolioValue * 0.02; // 2% default
    }

    // Apply limits
    let shares = Math.floor(dollarAmount / price);
    if (sizing.maxPositionPercent) {
      const maxDollar = portfolioValue * (sizing.maxPositionPercent / 100);
      shares = Math.min(shares, Math.floor(maxDollar / price));
    }
    if (sizing.minShares) shares = Math.max(shares, sizing.minShares);
    if (sizing.maxShares) shares = Math.min(shares, sizing.maxShares);

    return shares;
  }

  private calculateStopLoss(config: StopLossConfig, data: MarketData): number {
    switch (config.type) {
      case 'fixed_percent':
        return data.close * (1 - config.value / 100);
      case 'fixed_price':
        return config.value;
      case 'atr':
        const atr = data.high - data.low; // Simplified
        return data.close - atr * (config.atrMultiplier || 2);
      case 'swing_low':
        return data.low * 0.99; // Simplified
      case 'trailing':
        return data.close * (1 - config.value / 100);
      default:
        return data.close * 0.95;
    }
  }

  private calculateTakeProfit(
    config: TakeProfitConfig,
    data: MarketData,
    stopLoss: number
  ): number {
    switch (config.type) {
      case 'fixed_percent':
        return data.close * (1 + config.value / 100);
      case 'fixed_price':
        return config.value;
      case 'risk_multiple':
        const risk = data.close - stopLoss;
        return data.close + risk * config.value;
      case 'atr':
        const atr = data.high - data.low;
        return data.close + atr * config.value;
      default:
        return data.close * 1.1;
    }
  }

  // ============================================================================
  // SERIALIZATION
  // ============================================================================

  exportRule(ruleId: string): string | null {
    const rule = this.rules.get(ruleId);
    if (!rule) return null;
    return JSON.stringify(rule, null, 2);
  }

  importRule(json: string): TradingRule {
    const rule = JSON.parse(json) as TradingRule;
    rule.id = crypto.randomUUID();
    rule.createdAt = new Date();
    rule.updatedAt = new Date();
    this.rules.set(rule.id, rule);
    return rule;
  }

  clearIndicatorCache(): void {
    this.indicatorCache.clear();
  }
}

// Export singleton
export const ruleBasedEngine = new RuleBasedEngine();
