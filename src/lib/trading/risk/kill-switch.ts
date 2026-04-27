/**
 * Kill Switch State Machine — Strativion Autonomous Trading Package
 *
 * 4-level cumulative kill switch with dual-control enforcement for L3/L4.
 *
 * Level semantics (each level includes all actions of levels below it):
 *   L1 PAUSE_NEW        — forbids new order submission; working orders remain
 *   L2 CANCEL_WORKING   — L1 + cancels all working orders (idempotent)
 *   L3 FREEZE           — L2 + suspends signal generation
 *   L4 FLATTEN          — L3 + closes all positions
 *
 * P0-10 SAFETY INVARIANT (HARDCODED — NOT CONFIGURABLE):
 *   L4 FLATTEN is ABSOLUTELY PROHIBITED when system state is untrusted.
 *   L4 FLATTEN MUST NEVER execute without dual-control approval.
 *   The safe default under ambiguous state is FREEZE_AND_ALERT (L3), never flatten.
 *   These checks are not bypassed by any policy, override, context, or prompt.
 *
 * State transitions:
 *   INACTIVE → L1 → L2 → L3 → L4 (escalation only; no skipping)
 *   L4 → L3 → L2 → L1 → INACTIVE (deescalation; dual-control required for L3/L4 exit)
 */

import type { KillSwitchLevel } from "@/lib/trading/config";
import { getPolicy } from "@/lib/trading/config";
import { supabaseAdmin } from "@/lib/supabase/server";

// ============================================================================
// TYPED TABLE ACCESSORS
// New tables not yet reflected in generated Database types — use explicit
// cast matching the established project pattern (see autonomous-executor.ts).
// ============================================================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;
const ksEvents = () => db.from("kill_switch_events");
const dcRequests = () => db.from("dual_control_requests");

// ============================================================================
// TYPES
// ============================================================================

export type KillSwitchState = "INACTIVE" | KillSwitchLevel;

export interface KillSwitchEvent {
  id: string;
  level: KillSwitchState;
  previous_level: KillSwitchState;
  reason: string;
  actor_id: string;
  dual_control_request_id: string | null;
  canonical_package_version: string;
  canonical_hash: string;
  created_at: string;
}

export interface DualControlRequest {
  id: string;
  target_level: KillSwitchLevel;
  requestor_id: string;
  approver_id: string | null;
  denier_id: string | null;
  reason: string;
  denial_reason: string | null;
  status: "PENDING" | "APPROVED" | "DENIED";
  created_at: string;
  resolved_at: string | null;
}

export interface KillSwitchStatus {
  current_level: KillSwitchState;
  activated_at: string | null;
  activated_by: string | null;
  last_event_id: string | null;
  pending_dual_control: DualControlRequest | null;
}

export interface ActivateResult {
  success: boolean;
  event_id: string | null;
  dual_control_request_id: string | null;
  requires_dual_control: boolean;
  error: string | null;
}

export interface DualControlResult {
  success: boolean;
  request_id: string;
  error: string | null;
}

// ============================================================================
// LEVEL ORDERING
// ============================================================================

const LEVEL_ORDER: KillSwitchState[] = [
  "INACTIVE",
  "LEVEL_1_PAUSE_NEW",
  "LEVEL_2_CANCEL_WORKING",
  "LEVEL_3_FREEZE",
  "LEVEL_4_FLATTEN",
];

function levelIndex(level: KillSwitchState): number {
  return LEVEL_ORDER.indexOf(level);
}

function requiresDualControl(level: KillSwitchState): boolean {
  return level === "LEVEL_3_FREEZE" || level === "LEVEL_4_FLATTEN";
}

// ============================================================================
// SYSTEM HEALTH CHECK
// ============================================================================

/**
 * Verifies system state is trusted before allowing L4 FLATTEN.
 *
 * P0-10 SAFETY: This check is hardcoded and cannot be bypassed.
 * Returns false (untrusted) if ANY ambiguity exists.
 * When in doubt, the answer is always "untrusted" — caller must FREEZE_AND_ALERT.
 */
async function isSystemStateTrusted(): Promise<boolean> {
  try {
    // Check for any open untrusted-state incidents
    const { data, error } = await db
      .from("incidents")
      .select("id")
      .eq("status", "OPEN")
      .in("code", [
        "INC_STATE_UNTRUSTED",
        "INC_CLOCK_UNSYNCED",
        "INC_FEED_OUTAGE",
        "INC_BROKER_ACK_TIMEOUT",
        "INC_BROKER_REJECT_BURST",
        "INC_BROKER_DISCONNECTED",
      ])
      .limit(1);

    if (error) {
      // P0-10: Any error checking state = treat as untrusted
      return false;
    }

    return !data || data.length === 0;
  } catch {
    // P0-10: Exception during state check = untrusted
    return false;
  }
}

// ============================================================================
// KILL SWITCH MANAGER
// ============================================================================

export class KillSwitchManager {
  private static instance: KillSwitchManager;

  private constructor() {}

  static getInstance(): KillSwitchManager {
    if (!KillSwitchManager.instance) {
      KillSwitchManager.instance = new KillSwitchManager();
    }
    return KillSwitchManager.instance;
  }

  /**
   * Returns the current kill switch status including the active level
   * and any pending dual-control requests.
   */
  async getCurrentLevel(): Promise<KillSwitchStatus> {
    const [eventsResult, dcResult] = await Promise.all([
      ksEvents()
        .select("id, level, actor_id, created_at")
        .order("created_at", { ascending: false })
        .limit(1),
      dcRequests()
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1),
    ]);

    const lastEvent = eventsResult.data?.[0] ?? null;
    const latestDc = dcResult.data?.[0] ?? null;
    const pendingDc =
      latestDc && latestDc.status === "PENDING" ? latestDc : null;

    const currentLevel: KillSwitchState =
      (lastEvent?.level as KillSwitchState) ?? "INACTIVE";

    return {
      current_level: currentLevel,
      activated_at: lastEvent?.created_at ?? null,
      activated_by: lastEvent?.actor_id ?? null,
      last_event_id: lastEvent?.id ?? null,
      pending_dual_control: pendingDc
        ? (pendingDc as DualControlRequest)
        : null,
    };
  }

  /**
   * Activates the kill switch at the specified level.
   *
   * Escalation rules:
   * - Cannot skip levels (L1 → L3 is rejected; must go L1 → L2 → L3).
   * - L3 and L4 require dual-control approval; calling this creates the
   *   dual-control request and returns requires_dual_control: true.
   * - L4 additionally requires trusted system state (P0-10 hardcoded check).
   *
   * If state is already at or above the requested level, returns success
   * with the existing event_id (idempotent).
   */
  async activateLevel(
    level: KillSwitchLevel,
    reason: string,
    actorId: string,
  ): Promise<ActivateResult> {
    const status = await this.getCurrentLevel();
    const currentIdx = levelIndex(status.current_level);
    const targetIdx = levelIndex(level);

    // Already at or above requested level — idempotent
    if (currentIdx >= targetIdx) {
      return {
        success: true,
        event_id: status.last_event_id,
        dual_control_request_id: null,
        requires_dual_control: false,
        error: null,
      };
    }

    // Enforce sequential escalation — no skipping
    if (targetIdx > currentIdx + 1) {
      const nextLevel = LEVEL_ORDER[currentIdx + 1];
      return {
        success: false,
        event_id: null,
        dual_control_request_id: null,
        requires_dual_control: false,
        error: `Cannot skip levels. Must activate ${nextLevel} before ${level}.`,
      };
    }

    // L3/L4 require dual-control — initiate request
    if (requiresDualControl(level)) {
      const dcResult = await this.requestDualControl(level as KillSwitchLevel, actorId, reason);
      if (!dcResult.success) {
        return {
          success: false,
          event_id: null,
          dual_control_request_id: null,
          requires_dual_control: true,
          error: dcResult.error,
        };
      }
      return {
        success: true,
        event_id: null,
        dual_control_request_id: dcResult.request_id,
        requires_dual_control: true,
        error: null,
      };
    }

    // L1/L2 — apply directly
    return this.applyLevel(level, status.current_level, reason, actorId, null);
  }

  /**
   * Deactivates the kill switch entirely (returns to INACTIVE).
   *
   * L3/L4 deactivation requires dual-control approval.
   * Deactivation from L1/L2 is immediate.
   */
  async deactivateLevel(actorId: string): Promise<ActivateResult> {
    const status = await this.getCurrentLevel();

    if (status.current_level === "INACTIVE") {
      return {
        success: true,
        event_id: null,
        dual_control_request_id: null,
        requires_dual_control: false,
        error: null,
      };
    }

    // Deactivation from L3/L4 requires dual-control
    if (requiresDualControl(status.current_level)) {
      const dcResult = await this.requestDualControl(
        "LEVEL_1_PAUSE_NEW", // signal intent to de-escalate via L1 target
        actorId,
        "Deactivation request from elevated kill switch level",
      );
      if (!dcResult.success) {
        return {
          success: false,
          event_id: null,
          dual_control_request_id: null,
          requires_dual_control: true,
          error: dcResult.error,
        };
      }
      return {
        success: true,
        event_id: null,
        dual_control_request_id: dcResult.request_id,
        requires_dual_control: true,
        error: null,
      };
    }

    return this.applyLevel("INACTIVE", status.current_level, "Deactivation", actorId, null);
  }

  /**
   * Creates a dual-control request for the specified level.
   *
   * The requestor cannot be the approver. Returns the request ID for
   * the second party to approve or deny.
   */
  async requestDualControl(
    targetLevel: KillSwitchLevel,
    requestorId: string,
    reason: string,
  ): Promise<DualControlResult> {
    // Check for existing pending request for same level
    const { data: existing } = await dcRequests()
      .select("id, requestor_id")
      .eq("status", "PENDING")
      .eq("target_level", targetLevel)
      .limit(1);

    if (existing && existing.length > 0) {
      const req = existing[0];
      if (req.requestor_id === requestorId) {
        return {
          success: true,
          request_id: req.id,
          error: null,
        };
      }
      return {
        success: false,
        request_id: "",
        error: "A pending dual-control request already exists for this level from a different requestor.",
      };
    }

    const { data, error } = await dcRequests()
      .insert({
        target_level: targetLevel,
        requestor_id: requestorId,
        reason,
        status: "PENDING",
      })
      .select("id")
      .single();

    if (error || !data) {
      return {
        success: false,
        request_id: "",
        error: error?.message ?? "Failed to create dual-control request.",
      };
    }

    return {
      success: true,
      request_id: data.id,
      error: null,
    };
  }

  /**
   * Approves a pending dual-control request and applies the level change.
   *
   * Safety invariants (P0-10 — HARDCODED):
   *   1. Approver MUST be different from requestor.
   *   2. L4 FLATTEN MUST NEVER execute without this approval.
   *   3. L4 FLATTEN MUST NEVER execute when system state is untrusted.
   *      If state is untrusted, applies L3 FREEZE_AND_ALERT instead.
   */
  async approveDualControl(
    requestId: string,
    approverId: string,
  ): Promise<ActivateResult> {
    const { data: request, error: fetchErr } = await dcRequests()
      .select("*")
      .eq("id", requestId)
      .eq("status", "PENDING")
      .single();

    if (fetchErr || !request) {
      return {
        success: false,
        event_id: null,
        dual_control_request_id: requestId,
        requires_dual_control: true,
        error: "Dual-control request not found or already resolved.",
      };
    }

    // P0-10: Approver must differ from requestor
    if (request.requestor_id === approverId) {
      return {
        success: false,
        event_id: null,
        dual_control_request_id: requestId,
        requires_dual_control: true,
        error: "Approver must be a different person than the requestor.",
      };
    }

    const targetLevel = request.target_level as KillSwitchLevel;

    // P0-10 HARDCODED: L4 FLATTEN requires trusted state — NEVER skipped
    if (targetLevel === "LEVEL_4_FLATTEN") {
      const trusted = await isSystemStateTrusted();
      if (!trusted) {
        // Safe default: FREEZE_AND_ALERT — escalate to L3, never flatten
        await dcRequests()
          .update({
            status: "DENIED",
            denier_id: approverId,
            denial_reason:
              "P0-10: System state untrusted. L4 FLATTEN blocked. Applied L3 FREEZE_AND_ALERT instead.",
            resolved_at: new Date().toISOString(),
          })
          .eq("id", requestId);

        // Apply L3 as the safe alternative
        const status = await this.getCurrentLevel();
        return this.applyLevel(
          "LEVEL_3_FREEZE",
          status.current_level,
          "P0-10 safety: FLATTEN blocked on untrusted state; FREEZE applied",
          approverId,
          null,
        );
      }
    }

    // Mark request as approved
    const { error: updateErr } = await dcRequests()
      .update({
        status: "APPROVED",
        approver_id: approverId,
        resolved_at: new Date().toISOString(),
      })
      .eq("id", requestId);

    if (updateErr) {
      return {
        success: false,
        event_id: null,
        dual_control_request_id: requestId,
        requires_dual_control: true,
        error: updateErr.message,
      };
    }

    const status = await this.getCurrentLevel();
    return this.applyLevel(
      targetLevel,
      status.current_level,
      request.reason,
      approverId,
      requestId,
    );
  }

  /**
   * Denies a pending dual-control request. The level change is not applied.
   */
  async denyDualControl(
    requestId: string,
    denierId: string,
    denialReason: string,
  ): Promise<DualControlResult> {
    const { data: request, error: fetchErr } = await dcRequests()
      .select("requestor_id")
      .eq("id", requestId)
      .eq("status", "PENDING")
      .single();

    if (fetchErr || !request) {
      return {
        success: false,
        request_id: requestId,
        error: "Dual-control request not found or already resolved.",
      };
    }

    if (request.requestor_id === denierId) {
      return {
        success: false,
        request_id: requestId,
        error: "Requestor cannot deny their own request. Use a different actor.",
      };
    }

    const { error } = await dcRequests()
      .update({
        status: "DENIED",
        denier_id: denierId,
        denial_reason: denialReason,
        resolved_at: new Date().toISOString(),
      })
      .eq("id", requestId);

    if (error) {
      return {
        success: false,
        request_id: requestId,
        error: error.message,
      };
    }

    return { success: true, request_id: requestId, error: null };
  }

  // ============================================================================
  // PRIVATE
  // ============================================================================

  private async applyLevel(
    newLevel: KillSwitchState,
    previousLevel: KillSwitchState,
    reason: string,
    actorId: string,
    dualControlRequestId: string | null,
  ): Promise<ActivateResult> {
    const policy = await getPolicy();

    const { data, error } = await ksEvents()
      .insert({
        level: newLevel,
        previous_level: previousLevel,
        reason,
        actor_id: actorId,
        dual_control_request_id: dualControlRequestId,
        canonical_package_version: policy.meta.canonical_package_version,
        canonical_hash: policy.canonicalHash,
      })
      .select("id")
      .single();

    if (error || !data) {
      return {
        success: false,
        event_id: null,
        dual_control_request_id: dualControlRequestId,
        requires_dual_control: false,
        error: error?.message ?? "Failed to persist kill switch event.",
      };
    }

    return {
      success: true,
      event_id: data.id,
      dual_control_request_id: dualControlRequestId,
      requires_dual_control: false,
      error: null,
    };
  }
}

export const killSwitchManager = KillSwitchManager.getInstance();
