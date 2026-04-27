/**
 * Demotion Rules — Strativion Autonomous Trading Package
 *
 * Checks demotion triggers for active strategies and determines
 * whether a strategy should be demoted (moved down one or more stages).
 *
 * Trigger rules:
 *   - 3+ risk vetoes in 24h → demote one level
 *   - Recon break (reconciliation discrepancy) → demote to paper
 *   - Kill switch L3+ activated → demote all strategies to supervised_live or below
 *   - SEV1 incident → demote to paper
 */

import type { LifecycleStage } from "@/lib/trading/config";
import { supabaseAdmin } from "@/lib/supabase/server";
import { stageIndex, getPreviousStage } from "./promotion-gates";

// ============================================================================
// TYPED TABLE ACCESSORS
// ============================================================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;
const riskVetoes = () => db.from("risk_vetoes");
const reconBreaks = () => db.from("recon_breaks");
const killSwitchEvents = () => db.from("kill_switch_events");
const incidents = () => db.from("incidents");

// ============================================================================
// TYPES
// ============================================================================

export type DemotionTrigger =
  | "risk_vetoes_exceeded"
  | "recon_break"
  | "kill_switch_l3_plus"
  | "sev1_incident";

export interface DemotionResult {
  shouldDemote: boolean;
  trigger: DemotionTrigger | null;
  targetStage: LifecycleStage | null;
  reason: string;
}

// ============================================================================
// RISK VETO CHECK
// ============================================================================

async function checkRiskVetoes(strategyId: string): Promise<{
  exceeded: boolean;
  count: number;
}> {
  const twentyFourHoursAgo = new Date(
    Date.now() - 24 * 60 * 60 * 1000,
  ).toISOString();

  const { data, error } = await riskVetoes()
    .select("id")
    .eq("strategy_id", strategyId)
    .gte("created_at", twentyFourHoursAgo);

  if (error || !data) return { exceeded: false, count: 0 };

  return {
    exceeded: data.length >= 3,
    count: data.length,
  };
}

// ============================================================================
// RECON BREAK CHECK
// ============================================================================

async function checkReconBreak(strategyId: string): Promise<boolean> {
  const { data, error } = await reconBreaks()
    .select("id")
    .eq("strategy_id", strategyId)
    .eq("status", "OPEN")
    .limit(1);

  if (error || !data) return false;
  return data.length > 0;
}

// ============================================================================
// KILL SWITCH LEVEL CHECK
// ============================================================================

async function checkKillSwitchLevel(): Promise<{
  isL3Plus: boolean;
  level: string | null;
}> {
  const { data, error } = await killSwitchEvents()
    .select("level")
    .order("created_at", { ascending: false })
    .limit(1);

  if (error || !data || data.length === 0) {
    return { isL3Plus: false, level: null };
  }

  const level = data[0].level as string;
  const isL3Plus =
    level === "LEVEL_3_FREEZE" || level === "LEVEL_4_FLATTEN";

  return { isL3Plus, level };
}

// ============================================================================
// SEV1 INCIDENT CHECK
// ============================================================================

async function checkSev1Incident(strategyId: string): Promise<boolean> {
  const { data, error } = await incidents()
    .select("id")
    .eq("status", "OPEN")
    .eq("severity", "SEV1")
    .limit(1);

  if (error || !data) return false;
  return data.length > 0;
}

// ============================================================================
// DEMOTION TARGET RESOLUTION
// ============================================================================

function resolveTargetStage(
  currentStage: LifecycleStage,
  trigger: DemotionTrigger,
): LifecycleStage | null {
  switch (trigger) {
    case "risk_vetoes_exceeded": {
      // Demote one level
      return getPreviousStage(currentStage);
    }
    case "recon_break":
    case "sev1_incident": {
      // Demote to paper
      const paperIdx = stageIndex("paper");
      const currentIdx = stageIndex(currentStage);
      if (currentIdx > paperIdx) return "paper";
      return null; // Already at or below paper
    }
    case "kill_switch_l3_plus": {
      // Demote to supervised_live or below (clamp)
      const supervisedIdx = stageIndex("supervised_live");
      const currentIdx = stageIndex(currentStage);
      if (currentIdx > supervisedIdx) return "supervised_live";
      return null; // Already at or below supervised_live
    }
  }
}

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Checks all demotion triggers for a strategy and returns whether
 * it should be demoted and to which stage.
 *
 * Triggers are evaluated in priority order (most severe first):
 *   1. SEV1 incident → paper
 *   2. Recon break → paper
 *   3. Kill switch L3+ → supervised_live or below
 *   4. 3+ risk vetoes in 24h → one level down
 */
export async function checkDemotionTriggers(
  strategyId: string,
  currentStage: LifecycleStage,
): Promise<DemotionResult> {
  // Cannot demote below research
  if (currentStage === "research") {
    return {
      shouldDemote: false,
      trigger: null,
      targetStage: null,
      reason: "Strategy is already at the lowest stage (research).",
    };
  }

  // 1. SEV1 incident
  const hasSev1 = await checkSev1Incident(strategyId);
  if (hasSev1) {
    const target = resolveTargetStage(currentStage, "sev1_incident");
    if (target) {
      return {
        shouldDemote: true,
        trigger: "sev1_incident",
        targetStage: target,
        reason: "Open SEV1 incident detected. Demoting to paper.",
      };
    }
  }

  // 2. Recon break
  const hasReconBreak = await checkReconBreak(strategyId);
  if (hasReconBreak) {
    const target = resolveTargetStage(currentStage, "recon_break");
    if (target) {
      return {
        shouldDemote: true,
        trigger: "recon_break",
        targetStage: target,
        reason: "Open reconciliation break detected. Demoting to paper.",
      };
    }
  }

  // 3. Kill switch L3+
  const ksCheck = await checkKillSwitchLevel();
  if (ksCheck.isL3Plus) {
    const target = resolveTargetStage(currentStage, "kill_switch_l3_plus");
    if (target) {
      return {
        shouldDemote: true,
        trigger: "kill_switch_l3_plus",
        targetStage: target,
        reason: `Kill switch at ${ksCheck.level}. Demoting to ${target}.`,
      };
    }
  }

  // 4. Risk vetoes
  const vetoCheck = await checkRiskVetoes(strategyId);
  if (vetoCheck.exceeded) {
    const target = resolveTargetStage(currentStage, "risk_vetoes_exceeded");
    if (target) {
      return {
        shouldDemote: true,
        trigger: "risk_vetoes_exceeded",
        targetStage: target,
        reason: `${vetoCheck.count} risk vetoes in last 24h (threshold: 3). Demoting one level.`,
      };
    }
  }

  return {
    shouldDemote: false,
    trigger: null,
    targetStage: null,
    reason: "No demotion triggers active.",
  };
}
