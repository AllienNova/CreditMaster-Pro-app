/**
 * Custom Strategy Builder
 *
 * Fluent API for constructing BacktestStrategy + StrategyDefinition objects.
 * Validates on build() to ensure all required fields are present and correct.
 */

import type {
  BacktestStrategy,
  StrategyRule,
} from "../backtesting/backtest-engine";
import type {
  StrategyCategory,
  StrategyDefinition,
  StrategyMetadata,
  StrategyRiskLevel,
  StrategyTimeframe,
  MarketCondition,
} from "./strategy-types";
import {
  validateStrategy,
  validateStrategyDefinition,
  type ValidationResult,
} from "./strategy-validator";

// ============================================================================
// BUILDER
// ============================================================================

export class StrategyBuilder {
  private _id = "";
  private _name = "";
  private _description?: string;
  private _entryRules: StrategyRule[] = [];
  private _exitRules: StrategyRule[] = [];
  private _positionSizing: BacktestStrategy["positionSizing"] = "percent";
  private _positionValue?: number;
  private _stopLoss?: BacktestStrategy["stopLoss"];
  private _takeProfit?: BacktestStrategy["takeProfit"];
  private _trailingStop?: BacktestStrategy["trailingStop"];
  private _tradingHours?: BacktestStrategy["tradingHours"];
  private _daysOfWeek?: number[];
  private _metadata?: Partial<StrategyMetadata>;

  // --------------------------------------------------------------------------
  // IDENTITY
  // --------------------------------------------------------------------------

  /** Set strategy ID (kebab-case) */
  id(id: string): this {
    this._id = id;
    return this;
  }

  /** Set strategy display name */
  name(name: string): this {
    this._name = name;
    return this;
  }

  /** Set optional description */
  description(desc: string): this {
    this._description = desc;
    return this;
  }

  // --------------------------------------------------------------------------
  // RULES
  // --------------------------------------------------------------------------

  /** Add an entry rule */
  addEntryRule(
    indicator: string,
    operator: StrategyRule["operator"],
    value: number | string,
    params?: Record<string, number>,
  ): this {
    this._entryRules.push({ indicator, operator, value, ...(params && { params }) });
    return this;
  }

  /** Add an exit rule */
  addExitRule(
    indicator: string,
    operator: StrategyRule["operator"],
    value: number | string,
    params?: Record<string, number>,
  ): this {
    this._exitRules.push({ indicator, operator, value, ...(params && { params }) });
    return this;
  }

  /** Replace all entry rules */
  setEntryRules(rules: StrategyRule[]): this {
    this._entryRules = [...rules];
    return this;
  }

  /** Replace all exit rules */
  setExitRules(rules: StrategyRule[]): this {
    this._exitRules = [...rules];
    return this;
  }

  // --------------------------------------------------------------------------
  // POSITION SIZING
  // --------------------------------------------------------------------------

  /** Set position sizing method */
  positionSizing(
    type: BacktestStrategy["positionSizing"],
    value?: number,
  ): this {
    this._positionSizing = type;
    this._positionValue = value;
    return this;
  }

  // --------------------------------------------------------------------------
  // RISK MANAGEMENT
  // --------------------------------------------------------------------------

  /** Set stop loss */
  stopLoss(type: "fixed" | "atr" | "percent", value: number): this {
    this._stopLoss = { type, value };
    return this;
  }

  /** Set take profit */
  takeProfit(
    type: "fixed" | "atr" | "percent" | "risk_multiple",
    value: number,
  ): this {
    this._takeProfit = { type, value };
    return this;
  }

  /** Set trailing stop */
  trailingStop(
    type: "percent" | "atr",
    value: number,
    activation?: number,
  ): this {
    this._trailingStop = { type, value, ...(activation !== undefined && { activation }) };
    return this;
  }

  // --------------------------------------------------------------------------
  // FILTERS
  // --------------------------------------------------------------------------

  /** Set trading hours (0-24 range) */
  tradingHours(start: number, end: number): this {
    this._tradingHours = { start, end };
    return this;
  }

  /** Set days of week (0=Sunday, 6=Saturday) */
  daysOfWeek(days: number[]): this {
    this._daysOfWeek = [...days];
    return this;
  }

  // --------------------------------------------------------------------------
  // METADATA
  // --------------------------------------------------------------------------

  /** Set strategy category */
  category(category: StrategyCategory): this {
    this._metadata = { ...this._metadata, category };
    return this;
  }

  /** Set risk level */
  riskLevel(level: StrategyRiskLevel): this {
    this._metadata = { ...this._metadata, riskLevel: level };
    return this;
  }

  /** Set timeframe */
  timeframe(tf: StrategyTimeframe): this {
    this._metadata = { ...this._metadata, timeframe: tf };
    return this;
  }

  /** Set ideal market conditions */
  idealConditions(conditions: MarketCondition[]): this {
    this._metadata = { ...this._metadata, idealConditions: conditions };
    return this;
  }

  /** Set metadata indicators list */
  indicators(indicators: string[]): this {
    this._metadata = { ...this._metadata, indicators };
    return this;
  }

  /** Set expected return range */
  expectedReturnRange(min: number, max: number): this {
    this._metadata = { ...this._metadata, expectedReturnRange: { min, max } };
    return this;
  }

  /** Set expected drawdown range */
  expectedDrawdownRange(min: number, max: number): this {
    this._metadata = { ...this._metadata, expectedDrawdownRange: { min, max } };
    return this;
  }

  /** Set minimum recommended capital */
  minCapital(amount: number): this {
    this._metadata = { ...this._metadata, minCapital: amount };
    return this;
  }

  /** Set all metadata at once */
  setMetadata(metadata: StrategyMetadata): this {
    this._metadata = { ...metadata };
    return this;
  }

  // --------------------------------------------------------------------------
  // BUILD
  // --------------------------------------------------------------------------

  /** Validate without building — returns validation result */
  validate(): ValidationResult {
    if (this._id || this._metadata) {
      return validateStrategyDefinition(this.toDefinitionObject());
    }
    return validateStrategy(this.toStrategyObject());
  }

  /** Build a BacktestStrategy (rules + risk only, no metadata) */
  buildStrategy(): BacktestStrategy {
    const strategy = this.toStrategyObject();
    const result = validateStrategy(strategy);
    if (!result.valid) {
      const msgs = result.errors.map((e) => `${e.field}: ${e.message}`);
      throw new Error(`Invalid strategy:\n${msgs.join("\n")}`);
    }
    return strategy;
  }

  /** Build a full StrategyDefinition (strategy + id + metadata) */
  buildDefinition(): StrategyDefinition {
    const def = this.toDefinitionObject();
    const result = validateStrategyDefinition(def);
    if (!result.valid) {
      const msgs = result.errors.map((e) => `${e.field}: ${e.message}`);
      throw new Error(`Invalid strategy definition:\n${msgs.join("\n")}`);
    }
    return def as StrategyDefinition;
  }

  /** Reset builder to empty state */
  reset(): this {
    this._id = "";
    this._name = "";
    this._description = undefined;
    this._entryRules = [];
    this._exitRules = [];
    this._positionSizing = "percent";
    this._positionValue = undefined;
    this._stopLoss = undefined;
    this._takeProfit = undefined;
    this._trailingStop = undefined;
    this._tradingHours = undefined;
    this._daysOfWeek = undefined;
    this._metadata = undefined;
    return this;
  }

  // --------------------------------------------------------------------------
  // SERIALIZATION
  // --------------------------------------------------------------------------

  /** Export as plain JSON object (for persistence / JSONB storage) */
  toJSON(): Record<string, unknown> {
    if (this._id || this._metadata) {
      return this.toDefinitionObject() as unknown as Record<string, unknown>;
    }
    return this.toStrategyObject() as unknown as Record<string, unknown>;
  }

  /** Import from a plain JSON object */
  static fromJSON(json: Record<string, unknown>): StrategyBuilder {
    const builder = new StrategyBuilder();

    if (json.id) builder._id = json.id as string;

    // If it has a nested strategy object, it's a StrategyDefinition
    const strategyObj = (json.strategy ?? json) as Record<string, unknown>;

    if (strategyObj.name) builder._name = strategyObj.name as string;
    if (strategyObj.description)
      builder._description = strategyObj.description as string;
    if (Array.isArray(strategyObj.entryRules))
      builder._entryRules = strategyObj.entryRules as StrategyRule[];
    if (Array.isArray(strategyObj.exitRules))
      builder._exitRules = strategyObj.exitRules as StrategyRule[];
    if (strategyObj.positionSizing)
      builder._positionSizing =
        strategyObj.positionSizing as BacktestStrategy["positionSizing"];
    if (strategyObj.positionValue !== undefined)
      builder._positionValue = strategyObj.positionValue as number;
    if (strategyObj.stopLoss)
      builder._stopLoss = strategyObj.stopLoss as BacktestStrategy["stopLoss"];
    if (strategyObj.takeProfit)
      builder._takeProfit =
        strategyObj.takeProfit as BacktestStrategy["takeProfit"];
    if (strategyObj.trailingStop)
      builder._trailingStop =
        strategyObj.trailingStop as BacktestStrategy["trailingStop"];
    if (strategyObj.tradingHours)
      builder._tradingHours =
        strategyObj.tradingHours as BacktestStrategy["tradingHours"];
    if (Array.isArray(strategyObj.daysOfWeek))
      builder._daysOfWeek = strategyObj.daysOfWeek as number[];

    if (json.metadata)
      builder._metadata = json.metadata as Partial<StrategyMetadata>;

    return builder;
  }

  // --------------------------------------------------------------------------
  // INTERNAL
  // --------------------------------------------------------------------------

  private toStrategyObject(): BacktestStrategy {
    const strategy: BacktestStrategy = {
      name: this._name,
      entryRules: [...this._entryRules],
      exitRules: [...this._exitRules],
      positionSizing: this._positionSizing,
    };

    if (this._description) strategy.description = this._description;
    if (this._positionValue !== undefined)
      strategy.positionValue = this._positionValue;
    if (this._stopLoss) strategy.stopLoss = { ...this._stopLoss };
    if (this._takeProfit) strategy.takeProfit = { ...this._takeProfit };
    if (this._trailingStop) strategy.trailingStop = { ...this._trailingStop };
    if (this._tradingHours) strategy.tradingHours = { ...this._tradingHours };
    if (this._daysOfWeek) strategy.daysOfWeek = [...this._daysOfWeek];

    return strategy;
  }

  private toDefinitionObject(): Partial<StrategyDefinition> {
    return {
      id: this._id,
      strategy: this.toStrategyObject(),
      metadata: this._metadata as StrategyMetadata,
    };
  }
}

/** Factory function — creates a new StrategyBuilder */
export function createStrategyBuilder(): StrategyBuilder {
  return new StrategyBuilder();
}
