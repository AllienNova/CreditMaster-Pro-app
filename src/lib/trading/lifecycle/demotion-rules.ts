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
 *
 * Fail-CLOSED contract: every check below treats a query error or missing
 * result as "cannot verify safe" and reports the trigger as active, never
 * as absent. Silently defaulting to "no trigger" on error would let a
 * misbehaving strategy stay live purely because a table couldn't be read
 * (or, for risk_vetoes/recon_breaks, doesn't exist yet) — the same
 * fail-closed contract `promotion-gates.ts` uses for missing metrics.
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
  dataUnavailable: boolean;
}> {
  const twentyFourHoursAgo = new Date(
    Date.now() - 24 * 60 * 60 * 1000,
  ).toISOString();

  const { data, error } = await riskVetoes()
    .select("id")
    .eq("strategy_id", strategyId)
    .gte("created_at", twentyFourHoursAgo);

  // Fail CLOSED: risk_vetoes is a phantom table today, so this query errors
  // on every call. Reporting "no vetoes" here would permanently and
  // invisibly disable this trigger the moment the code is wired up.
  if (error || !data) {
    return { exceeded: true, count: 0, dataUnavailable: true };
  }

  return {
    exceeded: data.length >= 3,
    count: data.length,
    dataUnavailable: false,
  };
}

// ============================================================================
// RECON BREAK CHECK
// ============================================================================

async function checkReconBreak(strategyId: string): Promise<{
  triggered: boolean;
  dataUnavailable: boolean;
}> {
  const { data, error } = await reconBreaks()
    .select("id")
    .eq("strategy_id", strategyId)
    .eq("status", "OPEN")
    .limit(1);

  // Fail CLOSED: recon_breaks is a phantom table today, so this query
  // errors on every call. An error/missing result is indistinguishable
  // from "no break" to the caller unless it is explicitly treated as one.
  if (error || !data) return { triggered: true, dataUnavailable: true };
  return { triggered: data.length > 0, dataUnavailable: false };
}

// ============================================================================
// KILL SWITCH LEVEL CHECK
// ============================================================================

async function checkKillSwitchLevel(): Promise<{
  isL3Plus: boolean;
  level: string | null;
  dataUnavailable: boolean;
}> {
  const { data, error } = await killSwitchEvents()
    .select("level")
    .order("created_at", { ascending: false })
    .limit(1);

  // Fail CLOSED only on a genuine query error — kill_switch_events is a
  // real table, so an empty result (no event ever recorded) is legitimate
  // and must stay isL3Plus:false. An unreadable state, in contrast, must
  // be treated as tripped: the safe assumption for an e-stop under
  // uncertainty is "assume active," not "assume clear."
  if (error) {
    return { isL3Plus: true, level: null, dataUnavailable: true };
  }
  if (!data || data.length === 0) {
    return { isL3Plus: false, level: null, dataUnavailable: false };
  }

  const level = data[0].level as string;
  const isL3Plus =
    level === "LEVEL_3_FREEZE" || level === "LEVEL_4_FLATTEN";

  return { isL3Plus, level, dataUnavailable: false };
}

// ============================================================================
// SEV1 INCIDENT CHECK
// ============================================================================

async function checkSev1Incident(strategyId: string): Promise<{
  triggered: boolean;
  dataUnavailable: boolean;
}> {
  const { data, error } = await incidents()
    .select("id")
    .eq("status", "OPEN")
    .eq("severity", "SEV1")
    .limit(1);

  // Fail CLOSED: incidents is a real table, but the query can still error
  // (RLS, network, outage). An unreadable incident state must be treated
  // as an active SEV1 — assume the incident is open, not resolved.
  if (error || !data) return { triggered: true, dataUnavailable: true };
  return { triggered: data.length > 0, dataUnavailable: false };
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
  const sev1Check = await checkSev1Incident(strategyId);
  if (sev1Check.triggered) {
    const target = resolveTargetStage(currentStage, "sev1_incident");
    if (target) {
      return {
        shouldDemote: true,
        trigger: "sev1_incident",
        targetStage: target,
        reason: sev1Check.dataUnavailable
          ? "SEV1 incident status unavailable (query failed) — failing closed. Demoting to paper."
          : "Open SEV1 incident detected. Demoting to paper.",
      };
    }
  }

  // 2. Recon break
  const reconCheck = await checkReconBreak(strategyId);
  if (reconCheck.triggered) {
    const target = resolveTargetStage(currentStage, "recon_break");
    if (target) {
      return {
        shouldDemote: true,
        trigger: "recon_break",
        targetStage: target,
        reason: reconCheck.dataUnavailable
          ? "Reconciliation break status unavailable (query failed) — failing closed. Demoting to paper."
          : "Open reconciliation break detected. Demoting to paper.",
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
        reason: ksCheck.dataUnavailable
          ? `Kill switch status unavailable (query failed) — failing closed. Demoting to ${target}.`
          : `Kill switch at ${ksCheck.level}. Demoting to ${target}.`,
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
        reason: vetoCheck.dataUnavailable
          ? "Risk veto data unavailable (query failed) — failing closed. Demoting one level."
          : `${vetoCheck.count} risk vetoes in last 24h (threshold: 3). Demoting one level.`,
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
