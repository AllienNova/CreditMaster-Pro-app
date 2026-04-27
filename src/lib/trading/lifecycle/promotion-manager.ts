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
// TYPES
// ============================================================================

export interface StrategyLifecycleRecord {
  id: string;
  strategy_id: string;
  current_stage: LifecycleStage;
  entered_stage_at: string;
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
      .select("current_stage")
      .eq("strategy_id", strategyId)
      .single();

    if (error || !data) return "research";

    return data.current_stage as LifecycleStage;
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

    if (existing) {
      await strategyLifecycle()
        .update({
          current_stage: toStage,
          entered_stage_at: now,
          promoted_count: isPromotion
            ? (existing.promoted_count ?? 0) + 1
            : existing.promoted_count ?? 0,
          demoted_count: !isPromotion
            ? (existing.demoted_count ?? 0) + 1
            : existing.demoted_count ?? 0,
          updated_at: now,
        })
        .eq("strategy_id", strategyId);
    } else {
      await strategyLifecycle().insert({
        strategy_id: strategyId,
        current_stage: toStage,
        entered_stage_at: now,
        promoted_count: isPromotion ? 1 : 0,
        demoted_count: !isPromotion ? 1 : 0,
        created_at: now,
        updated_at: now,
      });
    }

    // Write audit trail
    await lifecycleAudit().insert({
      strategy_id: strategyId,
      action,
      from_stage: fromStage,
      to_stage: toStage,
      reason: reason ?? `${action} from ${fromStage} to ${toStage}`,
      created_at: now,
    });
  }
}

export const promotionManager = PromotionManager.getInstance();
