/**
 * Strategy Validator
 *
 * Validates custom strategies against the BacktestStrategy interface.
 * Returns structured errors for UI display.
 */

import type { BacktestStrategy, StrategyRule } from "../backtesting/backtest-engine";
import type { StrategyDefinition, StrategyMetadata } from "./strategy-types";

// ============================================================================
// VALIDATION TYPES
// ============================================================================

export interface ValidationError {
  field: string;
  message: string;
  severity: "error" | "warning";
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
}

// ============================================================================
// VALID VALUE SETS
// ============================================================================

const VALID_OPERATORS = new Set([
  "gt",
  "lt",
  "gte",
  "lte",
  "eq",
  "crosses_above",
  "crosses_below",
]);

const VALID_POSITION_SIZING = new Set([
  "fixed",
  "percent",
  "risk_based",
  "kelly",
]);

const VALID_STOP_LOSS_TYPES = new Set(["fixed", "atr", "percent"]);
const VALID_TAKE_PROFIT_TYPES = new Set([
  "fixed",
  "atr",
  "percent",
  "risk_multiple",
]);
const VALID_TRAILING_STOP_TYPES = new Set(["percent", "atr"]);

const VALID_INDICATORS = new Set([
  "close",
  "open",
  "high",
  "low",
  "volume",
  "sma_10",
  "sma_20",
  "sma_50",
  "sma_100",
  "sma_200",
  "ema_10",
  "ema_20",
  "ema_50",
  "ema_100",
  "ema_200",
  "rsi_7",
  "rsi_14",
  "rsi_21",
  "macd",
  "macd_signal",
  "macd_histogram",
  "atr_7",
  "atr_14",
  "atr_21",
  "bb_upper",
  "bb_middle",
  "bb_lower",
]);

const VALID_CATEGORIES = new Set([
  "momentum",
  "mean_reversion",
  "trend_following",
  "volatility",
  "volume",
  "gap",
  "breakout",
  "pctt",
]);

const VALID_RISK_LEVELS = new Set(["low", "medium", "high"]);

const VALID_TIMEFRAMES = new Set([
  "intraday",
  "swing",
  "position",
  "multi_timeframe",
]);

const VALID_MARKET_CONDITIONS = new Set([
  "trending",
  "ranging",
  "volatile",
  "low_volatility",
  "any",
]);

// ============================================================================
// STRATEGY VALIDATION
// ============================================================================

/** Validate a BacktestStrategy configuration */
export function validateStrategy(strategy: unknown): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  if (!strategy || typeof strategy !== "object") {
    errors.push({
      field: "strategy",
      message: "Strategy must be a non-null object",
      severity: "error",
    });
    return { valid: false, errors, warnings };
  }

  const s = strategy as Record<string, unknown>;

  // Name
  if (!s.name || typeof s.name !== "string" || s.name.trim().length === 0) {
    errors.push({
      field: "name",
      message: "Strategy name is required and must be a non-empty string",
      severity: "error",
    });
  } else if (s.name.length > 100) {
    errors.push({
      field: "name",
      message: "Strategy name must be 100 characters or fewer",
      severity: "error",
    });
  }

  // Entry rules
  if (!Array.isArray(s.entryRules) || s.entryRules.length === 0) {
    errors.push({
      field: "entryRules",
      message: "At least one entry rule is required",
      severity: "error",
    });
  } else {
    validateRules(s.entryRules as unknown[], "entryRules", errors, warnings);
  }

  // Exit rules
  if (!Array.isArray(s.exitRules) || s.exitRules.length === 0) {
    errors.push({
      field: "exitRules",
      message: "At least one exit rule is required",
      severity: "error",
    });
  } else {
    validateRules(s.exitRules as unknown[], "exitRules", errors, warnings);
  }

  // Position sizing
  if (
    !s.positionSizing ||
    !VALID_POSITION_SIZING.has(s.positionSizing as string)
  ) {
    errors.push({
      field: "positionSizing",
      message: `positionSizing must be one of: ${[...VALID_POSITION_SIZING].join(", ")}`,
      severity: "error",
    });
  }

  // Stop loss
  if (s.stopLoss !== undefined) {
    validateRiskConfig(
      s.stopLoss,
      "stopLoss",
      VALID_STOP_LOSS_TYPES,
      errors,
    );
  } else {
    warnings.push({
      field: "stopLoss",
      message: "No stop loss configured — consider adding one for risk management",
      severity: "warning",
    });
  }

  // Take profit
  if (s.takeProfit !== undefined) {
    validateRiskConfig(
      s.takeProfit,
      "takeProfit",
      VALID_TAKE_PROFIT_TYPES,
      errors,
    );
  }

  // Trailing stop
  if (s.trailingStop !== undefined) {
    validateRiskConfig(
      s.trailingStop,
      "trailingStop",
      VALID_TRAILING_STOP_TYPES,
      errors,
    );
  }

  // Trading hours
  if (s.tradingHours !== undefined) {
    const th = s.tradingHours as Record<string, unknown>;
    if (typeof th !== "object" || th === null) {
      errors.push({
        field: "tradingHours",
        message: "tradingHours must be an object with start and end",
        severity: "error",
      });
    } else {
      if (
        typeof th.start !== "number" ||
        th.start < 0 ||
        th.start >= 24
      ) {
        errors.push({
          field: "tradingHours.start",
          message: "tradingHours.start must be a number between 0 and 23",
          severity: "error",
        });
      }
      if (
        typeof th.end !== "number" ||
        th.end <= 0 ||
        th.end > 24
      ) {
        errors.push({
          field: "tradingHours.end",
          message: "tradingHours.end must be a number between 1 and 24",
          severity: "error",
        });
      }
      if (
        typeof th.start === "number" &&
        typeof th.end === "number" &&
        th.end <= th.start
      ) {
        errors.push({
          field: "tradingHours",
          message: "tradingHours.end must be greater than tradingHours.start",
          severity: "error",
        });
      }
    }
  }

  // Days of week
  if (s.daysOfWeek !== undefined) {
    if (!Array.isArray(s.daysOfWeek)) {
      errors.push({
        field: "daysOfWeek",
        message: "daysOfWeek must be an array of numbers (0=Sunday, 6=Saturday)",
        severity: "error",
      });
    } else {
      for (const day of s.daysOfWeek) {
        if (typeof day !== "number" || day < 0 || day > 6) {
          errors.push({
            field: "daysOfWeek",
            message: "Each day must be a number between 0 (Sunday) and 6 (Saturday)",
            severity: "error",
          });
          break;
        }
      }
    }
  }

  // Max rules check
  const totalRules =
    (Array.isArray(s.entryRules) ? s.entryRules.length : 0) +
    (Array.isArray(s.exitRules) ? s.exitRules.length : 0);
  if (totalRules > 20) {
    warnings.push({
      field: "rules",
      message:
        "Strategy has more than 20 rules — this may lead to overfitting and rare signal generation",
      severity: "warning",
    });
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/** Validate a full StrategyDefinition (strategy + metadata) */
export function validateStrategyDefinition(def: unknown): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  if (!def || typeof def !== "object") {
    errors.push({
      field: "definition",
      message: "Strategy definition must be a non-null object",
      severity: "error",
    });
    return { valid: false, errors, warnings };
  }

  const d = def as Record<string, unknown>;

  // ID validation
  if (!d.id || typeof d.id !== "string" || d.id.trim().length === 0) {
    errors.push({
      field: "id",
      message: "Strategy ID is required",
      severity: "error",
    });
  } else if (!/^[a-z0-9-]+$/.test(d.id)) {
    errors.push({
      field: "id",
      message: "Strategy ID must be kebab-case (lowercase letters, numbers, hyphens)",
      severity: "error",
    });
  }

  // Validate strategy
  const strategyResult = validateStrategy(d.strategy);
  errors.push(...strategyResult.errors);
  warnings.push(...strategyResult.warnings);

  // Validate metadata
  if (d.metadata !== undefined) {
    validateMetadata(d.metadata, errors, warnings);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

// ============================================================================
// HELPERS
// ============================================================================

function validateRules(
  rules: unknown[],
  prefix: string,
  errors: ValidationError[],
  warnings: ValidationError[],
): void {
  rules.forEach((rule, i) => {
    const r = rule as Record<string, unknown>;
    const field = `${prefix}[${i}]`;

    // Indicator
    if (!r.indicator || typeof r.indicator !== "string") {
      errors.push({
        field: `${field}.indicator`,
        message: "Rule indicator is required and must be a string",
        severity: "error",
      });
    } else if (!VALID_INDICATORS.has(r.indicator)) {
      warnings.push({
        field: `${field}.indicator`,
        message: `Unknown indicator "${r.indicator}" — ensure it is available in the backtest engine`,
        severity: "warning",
      });
    }

    // Operator
    if (!r.operator || !VALID_OPERATORS.has(r.operator as string)) {
      errors.push({
        field: `${field}.operator`,
        message: `Rule operator must be one of: ${[...VALID_OPERATORS].join(", ")}`,
        severity: "error",
      });
    }

    // Value
    if (r.value === undefined || r.value === null) {
      errors.push({
        field: `${field}.value`,
        message: "Rule value is required (number or indicator name)",
        severity: "error",
      });
    } else if (typeof r.value !== "number" && typeof r.value !== "string") {
      errors.push({
        field: `${field}.value`,
        message: "Rule value must be a number or indicator name string",
        severity: "error",
      });
    } else if (typeof r.value === "string" && !VALID_INDICATORS.has(r.value)) {
      warnings.push({
        field: `${field}.value`,
        message: `Unknown indicator "${r.value}" used as comparison value`,
        severity: "warning",
      });
    }
  });
}

function validateRiskConfig(
  config: unknown,
  field: string,
  validTypes: Set<string>,
  errors: ValidationError[],
): void {
  if (typeof config !== "object" || config === null) {
    errors.push({
      field,
      message: `${field} must be an object with type and value`,
      severity: "error",
    });
    return;
  }

  const c = config as Record<string, unknown>;

  if (!c.type || !validTypes.has(c.type as string)) {
    errors.push({
      field: `${field}.type`,
      message: `${field}.type must be one of: ${[...validTypes].join(", ")}`,
      severity: "error",
    });
  }

  if (typeof c.value !== "number" || c.value <= 0) {
    errors.push({
      field: `${field}.value`,
      message: `${field}.value must be a positive number`,
      severity: "error",
    });
  }
}

function validateMetadata(
  metadata: unknown,
  errors: ValidationError[],
  warnings: ValidationError[],
): void {
  if (typeof metadata !== "object" || metadata === null) {
    errors.push({
      field: "metadata",
      message: "Metadata must be a non-null object",
      severity: "error",
    });
    return;
  }

  const m = metadata as Record<string, unknown>;

  if (!m.category || !VALID_CATEGORIES.has(m.category as string)) {
    errors.push({
      field: "metadata.category",
      message: `category must be one of: ${[...VALID_CATEGORIES].join(", ")}`,
      severity: "error",
    });
  }

  if (!m.riskLevel || !VALID_RISK_LEVELS.has(m.riskLevel as string)) {
    errors.push({
      field: "metadata.riskLevel",
      message: `riskLevel must be one of: ${[...VALID_RISK_LEVELS].join(", ")}`,
      severity: "error",
    });
  }

  if (!m.timeframe || !VALID_TIMEFRAMES.has(m.timeframe as string)) {
    errors.push({
      field: "metadata.timeframe",
      message: `timeframe must be one of: ${[...VALID_TIMEFRAMES].join(", ")}`,
      severity: "error",
    });
  }

  if (!Array.isArray(m.idealConditions) || m.idealConditions.length === 0) {
    warnings.push({
      field: "metadata.idealConditions",
      message: "At least one ideal market condition is recommended",
      severity: "warning",
    });
  } else {
    for (const cond of m.idealConditions) {
      if (!VALID_MARKET_CONDITIONS.has(cond as string)) {
        errors.push({
          field: "metadata.idealConditions",
          message: `Invalid market condition "${cond}" — must be one of: ${[...VALID_MARKET_CONDITIONS].join(", ")}`,
          severity: "error",
        });
        break;
      }
    }
  }

  if (!Array.isArray(m.indicators) || m.indicators.length === 0) {
    warnings.push({
      field: "metadata.indicators",
      message: "At least one indicator should be listed in metadata",
      severity: "warning",
    });
  }

  if (typeof m.minCapital === "number" && m.minCapital <= 0) {
    errors.push({
      field: "metadata.minCapital",
      message: "minCapital must be a positive number",
      severity: "error",
    });
  }
}

// ============================================================================
// EXPORTS FOR VALID VALUE SETS (for UI dropdowns)
// ============================================================================

export const VALID_INDICATOR_LIST = [...VALID_INDICATORS] as const;
export const VALID_OPERATOR_LIST = [...VALID_OPERATORS] as const;
export const VALID_POSITION_SIZING_LIST = [...VALID_POSITION_SIZING] as const;
export const VALID_CATEGORY_LIST = [...VALID_CATEGORIES] as const;
export const VALID_RISK_LEVEL_LIST = [...VALID_RISK_LEVELS] as const;
export const VALID_TIMEFRAME_LIST = [...VALID_TIMEFRAMES] as const;
export const VALID_MARKET_CONDITION_LIST = [...VALID_MARKET_CONDITIONS] as const;
