/**
 * Promotion Gates — Strativion Autonomous Trading Package
 *
 * Evaluates numeric gate criteria for each lifecycle stage using canonical
 * policy values. A strategy must pass all gates for its current stage before
 * it can be promoted to the next stage.
 *
 * Gate thresholds are sourced from `getPolicy().promotion.stages[stage]`.
 * This module never hardcodes thresholds — all values come from policy.
 */

import type { LifecycleStage, StageGates } from "@/lib/trading/config";
import { getPolicy } from "@/lib/trading/config";
import { supabaseAdmin } from "@/lib/supabase/server";

// ============================================================================
// TYPED TABLE ACCESSORS
// ============================================================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;
const strategyMetrics = () => db.from("strategy_metrics");

// ============================================================================
// TYPES
// ============================================================================

export interface GateScore {
  gate: string;
  required: number | boolean;
  actual: number | boolean;
  passed: boolean;
}

export interface GateEvaluation {
  passed: boolean;
  scores: GateScore[];
  missing: string[];
}

export interface StrategyMetrics {
  signal_count: number;
  sharpe_ratio: number;
  max_drawdown_pct: number;
  hit_rate_pct: number;
  correlation: number;
  sev1_free_days: number;
  fill_sim_error_bps: number;
  trade_count: number;
  slippage_bps: number;
  has_violations: boolean;
  dwell_days: number;
}

// ============================================================================
// STAGE ORDERING
// ============================================================================

const STAGE_ORDER: LifecycleStage[] = [
  "research",
  "replay",
  "shadow",
  "paper",
  "supervised_live",
  "autonomous_live",
];

export function getNextStage(stage: LifecycleStage): LifecycleStage | null {
  const idx = STAGE_ORDER.indexOf(stage);
  if (idx === -1 || idx >= STAGE_ORDER.length - 1) return null;
  return STAGE_ORDER[idx + 1];
}

export function getPreviousStage(stage: LifecycleStage): LifecycleStage | null {
  const idx = STAGE_ORDER.indexOf(stage);
  if (idx <= 0) return null;
  return STAGE_ORDER[idx - 1];
}

export function stageIndex(stage: LifecycleStage): number {
  return STAGE_ORDER.indexOf(stage);
}

// ============================================================================
// METRICS FETCHER
// ============================================================================

export async function fetchStrategyMetrics(
  strategyId: string,
): Promise<StrategyMetrics | null> {
  const { data, error } = await strategyMetrics()
    .select("*")
    .eq("strategy_id", strategyId)
    .single();

  if (error || !data) return null;

  return {
    signal_count: Number(data.signal_count ?? 0),
    sharpe_ratio: Number(data.sharpe_ratio ?? 0),
    max_drawdown_pct: Number(data.max_drawdown_pct ?? 0),
    hit_rate_pct: Number(data.hit_rate_pct ?? 0),
    correlation: Number(data.correlation ?? 0),
    sev1_free_days: Number(data.sev1_free_days ?? 0),
    fill_sim_error_bps: Number(data.fill_sim_error_bps ?? 0),
    trade_count: Number(data.trade_count ?? 0),
    slippage_bps: Number(data.slippage_bps ?? 0),
    has_violations: Boolean(data.has_violations ?? false),
    dwell_days: Number(data.dwell_days ?? 0),
  };
}

// ============================================================================
// GATE EVALUATION
// ============================================================================

function evaluateNumericGate(
  gate: string,
  actual: number,
  required: number,
  comparison: "gte" | "lte",
): GateScore {
  const passed =
    comparison === "gte" ? actual >= required : actual <= required;
  return { gate, required, actual, passed };
}

function evaluateBooleanGate(
  gate: string,
  actual: boolean,
  required: boolean,
): GateScore {
  const passed = actual === required;
  return { gate, required, actual, passed };
}

/**
 * Evaluates all promotion gates for a strategy at its current lifecycle stage.
 *
 * Returns which gates passed, which failed, and which metrics are missing
 * (null metrics from the database).
 */
export async function evaluateGates(
  strategyId: string,
  stage: LifecycleStage,
): Promise<GateEvaluation> {
  const policy = getPolicy();
  const gates: StageGates = policy.promotion.stages[stage];
  const metrics = await fetchStrategyMetrics(strategyId);

  if (!metrics) {
    return {
      passed: false,
      scores: [],
      missing: ["all_metrics"],
    };
  }

  const scores: GateScore[] = [];
  const missing: string[] = [];

  // Dwell days — always checked
  scores.push(
    evaluateNumericGate(
      "min_dwell_days",
      metrics.dwell_days,
      gates.min_dwell_days,
      "gte",
    ),
  );

  // Stage-specific gates
  if (gates.min_signals !== undefined) {
    scores.push(
      evaluateNumericGate(
        "min_signals",
        metrics.signal_count,
        gates.min_signals,
        "gte",
      ),
    );
  }

  if (gates.min_sharpe !== undefined) {
    scores.push(
      evaluateNumericGate(
        "min_sharpe",
        metrics.sharpe_ratio,
        gates.min_sharpe,
        "gte",
      ),
    );
  }

  if (gates.max_drawdown_pct !== undefined) {
    scores.push(
      evaluateNumericGate(
        "max_drawdown_pct",
        metrics.max_drawdown_pct,
        gates.max_drawdown_pct,
        "lte",
      ),
    );
  }

  if (gates.min_hit_rate_pct !== undefined) {
    scores.push(
      evaluateNumericGate(
        "min_hit_rate_pct",
        metrics.hit_rate_pct,
        gates.min_hit_rate_pct,
        "gte",
      ),
    );
  }

  if (gates.min_correlation !== undefined) {
    scores.push(
      evaluateNumericGate(
        "min_correlation",
        metrics.correlation,
        gates.min_correlation,
        "gte",
      ),
    );
  }

  if (gates.zero_sev1_days !== undefined) {
    scores.push(
      evaluateNumericGate(
        "zero_sev1_days",
        metrics.sev1_free_days,
        gates.zero_sev1_days,
        "gte",
      ),
    );
  }

  if (gates.max_fill_sim_error_bps !== undefined) {
    scores.push(
      evaluateNumericGate(
        "max_fill_sim_error_bps",
        metrics.fill_sim_error_bps,
        gates.max_fill_sim_error_bps,
        "lte",
      ),
    );
  }

  if (gates.min_trades !== undefined) {
    scores.push(
      evaluateNumericGate(
        "min_trades",
        metrics.trade_count,
        gates.min_trades,
        "gte",
      ),
    );
  }

  if (gates.max_slippage_bps !== undefined) {
    scores.push(
      evaluateNumericGate(
        "max_slippage_bps",
        metrics.slippage_bps,
        gates.max_slippage_bps,
        "lte",
      ),
    );
  }

  if (gates.zero_violations !== undefined) {
    scores.push(
      evaluateBooleanGate(
        "zero_violations",
        metrics.has_violations,
        false, // must have NO violations
      ),
    );
  }

  const allPassed = scores.every((s) => s.passed);

  return {
    passed: allPassed,
    scores,
    missing,
  };
}
