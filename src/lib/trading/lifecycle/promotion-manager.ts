/**
 * Promotion Manager — Strativion Autonomous Trading Package
 *
 * 6-stage strategy lifecycle state machine controlling which strategies
 * can trade live and with what budget.
 *
 * Stages (in order):
 *   research → replay → shadow → paper → supervised_live → autonomous_live
 *
 * Promotion requires passing all gate criteria for the current stage
 * (sourced from canonical policy) and respecting minimum dwell time.
 *
 * Demotion moves a strategy down one stage with a recorded reason.
 *
 * Budget and position limits are enforced per-stage from policy.
 */

import type { LifecycleStage, StageGates } from "@/lib/trading/config";
import { getPolicy } from "@/lib/trading/config";
import { supabaseAdmin } from "@/lib/supabase/server";
import { evaluateGates, getNextStage, getPreviousStage } from "./promotion-gates";

// ============================================================================
// TYPED TABLE ACCESSORS
// ============================================================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;
const strategyLifecycle = () => db.from("strategy_lifecycle");
const lifecycleAudit = () => db.from("lifecycle_audit");

// ============================================================================
// ERRORS
// ============================================================================

/**
 * Raised when the lifecycle stage of a strategy cannot be determined.
 *
 * The stage gates autonomous trading, so an unreadable stage must stop the
 * caller rather than resolve to a guess. Mirrors WellnessDataFetchError in
 * trading/risk/wellness-gate.ts and the fail-closed demotion checks in
 * ./demotion-rules.ts.
 */
export class LifecycleStateUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LifecycleStateUnavailableError";
  }
}

// ============================================================================
// TYPES
// ============================================================================

export interface StrategyLifecycleRecord {
  id: string;
  strategy_id: string;
  /** Canonical column is `stage`; there is no `current_stage` column. */
  stage: LifecycleStage;
  /** Canonical column is `dwell_start`; there is no `entered_stage_at`. */
  dwell_start: string;
  promoted_count: number;
  demoted_count: number;
  created_at: string;
  updated_at: string;
}

export interface PromotionResult {
  promoted: boolean;
  reason: string;
  previousStage?: LifecycleStage;
  newStage?: LifecycleStage;
}

export interface CanTradeResult {
  allowed: boolean;
  maxBudgetPct: number;
  maxPositions: number;
}

// ============================================================================
// PROMOTION MANAGER
// ============================================================================

export class PromotionManager {
  private static instance: PromotionManager;

  private constructor() {}

  static getInstance(): PromotionManager {
    if (!PromotionManager.instance) {
      PromotionManager.instance = new PromotionManager();
    }
    return PromotionManager.instance;
  }

  /**
   * Returns the current lifecycle stage for a strategy.
   * Defaults to "research" if no record exists.
   */
  async getStrategyStage(strategyId: string): Promise<LifecycleStage> {
    const { data, error } = await strategyLifecycle()
      .select("stage")
      .eq("strategy_id", strategyId)
      .single();

    // PGRST116 = no matching row. That is the legitimate "this strategy has
    // never been staged" case and correctly defaults to the lowest stage.
    if (error?.code === "PGRST116") return "research";

    // Any OTHER error means the stage is UNKNOWN, and this value gates
    // autonomous trading. The previous code collapsed both cases into
    // `return "research"`, and because it selected a column that does not
    // exist (current_stage; the real column is `stage`) the error branch fired
    // on EVERY call — so every strategy reported the lowest stage
    // unconditionally, and callers went on to overwrite real stage state
    // computed from a value that was never read. Refuse to guess instead:
    // this mirrors the fail-closed hardening applied to the sibling
    // demotion-rules.ts in dc4980e.
    if (error) {
      throw new LifecycleStateUnavailableError(
        `Cannot determine lifecycle stage for strategy ${strategyId}: ${error.message}`,
      );
    }

    if (!data) return "research";

    return data.stage as LifecycleStage;
  }

  /**
   * Attempts to promote a strategy to the next lifecycle stage.
   *
   * Checks:
   *   1. Strategy is not already at autonomous_live
   *   2. All gate criteria for the current stage are met
   *   3. Minimum dwell time has elapsed
   *
   * Returns the result including whether promotion succeeded and why.
   */
  async attemptPromotion(strategyId: string): Promise<PromotionResult> {
    const currentStage = await this.getStrategyStage(strategyId);
    const nextStage = getNextStage(currentStage);

    if (!nextStage) {
      return {
        promoted: false,
        reason: "Strategy is already at the highest stage (autonomous_live).",
      };
    }

    // Evaluate gates for the current stage
    const gateResult = await evaluateGates(strategyId, currentStage);

    if (!gateResult.passed) {
      const failedGates = gateResult.scores
        .filter((s) => !s.passed)
        .map((s) => `${s.gate}: actual=${s.actual}, required=${s.required}`)
        .join("; ");

      const missingInfo =
        gateResult.missing.length > 0
          ? ` Missing metrics: ${gateResult.missing.join(", ")}.`
          : "";

      return {
        promoted: false,
        reason: `Gate criteria not met for ${currentStage}. Failed: ${failedGates}.${missingInfo}`,
      };
    }

    // Apply promotion
    await this.updateStage(strategyId, currentStage, nextStage, "promotion");

    return {
      promoted: true,
      reason: `Promoted from ${currentStage} to ${nextStage}. All gates passed.`,
      previousStage: currentStage,
      newStage: nextStage,
    };
  }

  /**
   * Demotes a strategy one stage with a recorded reason.
   * Returns the new stage after demotion, or the current stage if already at research.
   */
  async demote(
    strategyId: string,
    reason: string,
  ): Promise<LifecycleStage> {
    const currentStage = await this.getStrategyStage(strategyId);
    const prevStage = getPreviousStage(currentStage);

    if (!prevStage) {
      return currentStage; // Already at research
    }

    await this.updateStage(strategyId, currentStage, prevStage, "demotion", reason);
    return prevStage;
  }

  /**
   * Demotes a strategy to a specific stage (for severe triggers like SEV1).
   * Only allows demotion — the target must be below the current stage.
   */
  async demoteTo(
    strategyId: string,
    targetStage: LifecycleStage,
    reason: string,
  ): Promise<LifecycleStage> {
    const currentStage = await this.getStrategyStage(strategyId);

    // Import stageIndex for comparison
    const { stageIndex } = await import("./promotion-gates");

    if (stageIndex(targetStage) >= stageIndex(currentStage)) {
      return currentStage; // Not a demotion
    }

    await this.updateStage(strategyId, currentStage, targetStage, "demotion", reason);
    return targetStage;
  }

  /**
   * Checks whether a strategy is allowed to trade and returns its
   * risk budget and position limits for the current stage.
   */
  async canTrade(strategyId: string): Promise<CanTradeResult> {
    const currentStage = await this.getStrategyStage(strategyId);
    const policy = getPolicy();
    const gates: StageGates = policy.promotion.stages[currentStage];

    const budgetPct = gates.risk_budget_pct;
    const allowed = budgetPct > 0;

    return {
      allowed,
      maxBudgetPct: budgetPct,
      maxPositions: gates.max_positions,
    };
  }

  // ============================================================================
  // PRIVATE
  // ============================================================================

  private async updateStage(
    strategyId: string,
    fromStage: LifecycleStage,
    toStage: LifecycleStage,
    action: "promotion" | "demotion",
    reason?: string,
  ): Promise<void> {
    const now = new Date().toISOString();
    const isPromotion = action === "promotion";

    // Upsert the lifecycle record
    const { data: existing } = await strategyLifecycle()
      .select("id, promoted_count, demoted_count")
      .eq("strategy_id", strategyId)
      .single();

    // Column names below are the CANONICAL ones on strategy_lifecycle: `stage`
    // and `dwell_start`. The previous code wrote `current_stage` /
    // `entered_stage_at`, which do not exist on that table, so every write
    // failed with PGRST204 — and because the result was awaited without ever
    // reading `error`, the failure was silent and the state machine recorded
    // nothing. promoted_count / demoted_count were genuinely missing and are
    // added by 20260731000070.
    if (existing) {
      const { error: updateError } = await strategyLifecycle()
        .update({
          stage: toStage,
          dwell_start: now,
          promoted_count: isPromotion
            ? (existing.promoted_count ?? 0) + 1
            : existing.promoted_count ?? 0,
          demoted_count: !isPromotion
            ? (existing.demoted_count ?? 0) + 1
            : existing.demoted_count ?? 0,
          ...(isPromotion ? { promoted_at: now } : { demoted_at: now }),
          ...(isPromotion ? {} : { demotion_reason: reason ?? null }),
          updated_at: now,
        })
        .eq("strategy_id", strategyId);

      if (updateError) {
        throw new LifecycleStateUnavailableError(
          `Failed to record ${action} for strategy ${strategyId}: ${updateError.message}`,
        );
      }
    } else {
      const { error: insertError } = await strategyLifecycle().insert({
        strategy_id: strategyId,
        stage: toStage,
        dwell_start: now,
        promoted_count: isPromotion ? 1 : 0,
        demoted_count: !isPromotion ? 1 : 0,
        ...(isPromotion ? { promoted_at: now } : { demoted_at: now }),
        ...(isPromotion ? {} : { demotion_reason: reason ?? null }),
        created_at: now,
        updated_at: now,
      });

      if (insertError) {
        throw new LifecycleStateUnavailableError(
          `Failed to create lifecycle record for strategy ${strategyId}: ${insertError.message}`,
        );
      }
    }

    // Write audit trail. A stage transition whose audit row is lost is a
    // half-recorded state change on a safety-critical machine, so this throws
    // rather than being fire-and-forget as it was before.
    const { error: auditError } = await lifecycleAudit().insert({
      strategy_id: strategyId,
      action,
      from_stage: fromStage,
      to_stage: toStage,
      reason: reason ?? `${action} from ${fromStage} to ${toStage}`,
      created_at: now,
    });

    if (auditError) {
      throw new LifecycleStateUnavailableError(
        `Failed to write lifecycle audit row for strategy ${strategyId}: ${auditError.message}`,
      );
    }
  }
}

export const promotionManager = PromotionManager.getInstance();
