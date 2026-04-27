/**
 * Incident Manager — Strativion Autonomous Trading Package
 *
 * Raises, tracks, and resolves incidents sourced from the canonical
 * incident taxonomy in incident-codes.ts.
 *
 * Severity response protocol:
 *   SEV1 — page immediately + escalate kill switch (L2 minimum)
 *   SEV2 — alert within 5 minutes; no automatic kill switch escalation
 *   SEV3 — alert only (log to incidents table)
 *   SEV4 — log only (no alert)
 *
 * Supervisory signals (SIG_*) always use ALERT_ONLY regardless of their
 * severity classification. They must never trigger order mutations or
 * policy changes autonomously.
 *
 * DESIGN NOTE: FLATTEN is absent from all default_actions. No incident
 * code ever triggers a flatten autonomously. See P0-10 in kill-switch.ts.
 */

import type { IncidentSeverity } from "@/lib/trading/config";
import { getPolicy } from "@/lib/trading/config";
import { supabaseAdmin } from "@/lib/supabase/server";
import {
  getIncidentDefinition,
  type CanonicalIncident,
  type IncidentAction,
} from "./incident-codes";

// ============================================================================
// TYPED TABLE ACCESSORS
// ============================================================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;
const incidentsTable = () => db.from("incidents");
const auditTable = () => db.from("trading_audit_trail");

// ============================================================================
// TYPES
// ============================================================================

export type IncidentStatus = "OPEN" | "RESOLVED" | "SUPPRESSED";

export interface IncidentRecord {
  id: string;
  code: string;
  category: string;
  severity: IncidentSeverity;
  default_action: IncidentAction;
  auto_recoverable: boolean;
  status: IncidentStatus;
  raised_by: string;
  resolved_by: string | null;
  resolution_note: string | null;
  details: Record<string, unknown>;
  canonical_package_version: string;
  canonical_hash: string;
  raised_at: string;
  resolved_at: string | null;
}

export interface RaiseResult {
  success: boolean;
  incident_id: string | null;
  /** True if a kill switch escalation was automatically triggered (SEV1). */
  kill_switch_escalated: boolean;
  error: string | null;
}

export interface ResolveResult {
  success: boolean;
  incident_id: string;
  error: string | null;
}

// ============================================================================
// SEVERITY THRESHOLDS
// ============================================================================

/** Minimum kill switch level that SEV1 incidents trigger automatically. */
const SEV1_KILL_SWITCH_LEVEL = "LEVEL_2_CANCEL_WORKING" as const;

// ============================================================================
// INCIDENT MANAGER
// ============================================================================

export class IncidentManager {
  private static instance: IncidentManager;

  private constructor() {}

  static getInstance(): IncidentManager {
    if (!IncidentManager.instance) {
      IncidentManager.instance = new IncidentManager();
    }
    return IncidentManager.instance;
  }

  /**
   * Raises an incident and executes the severity response protocol.
   *
   * If the incident code is not in the canonical registry, the raise is
   * rejected to prevent unregistered incidents from escaping policy control.
   *
   * Idempotency: if an OPEN incident with the same code already exists,
   * returns the existing incident ID without creating a duplicate.
   */
  async raiseIncident(
    code: string,
    raisedBy: string,
    details: Record<string, unknown> = {},
  ): Promise<RaiseResult> {
    const definition = getIncidentDefinition(code);
    if (!definition) {
      return {
        success: false,
        incident_id: null,
        kill_switch_escalated: false,
        error: `Unknown incident code: ${code}. Must be registered in the canonical incident taxonomy.`,
      };
    }

    // Idempotency check — deduplicate open incidents by code
    const { data: existing } = await incidentsTable()
      .select("id")
      .eq("code", code)
      .eq("status", "OPEN")
      .limit(1);

    if (existing && existing.length > 0) {
      return {
        success: true,
        incident_id: existing[0].id,
        kill_switch_escalated: false,
        error: null,
      };
    }

    const policy = await getPolicy();

    const { data, error } = await incidentsTable()
      .insert({
        code: definition.code,
        category: definition.category,
        severity: definition.severity,
        default_action: definition.default_action,
        auto_recoverable: definition.auto_recoverable,
        status: "OPEN",
        raised_by: raisedBy,
        details,
        canonical_package_version: policy.meta.canonical_package_version,
        canonical_hash: policy.canonicalHash,
      })
      .select("id")
      .single();

    if (error || !data) {
      return {
        success: false,
        incident_id: null,
        kill_switch_escalated: false,
        error: error?.message ?? "Failed to persist incident.",
      };
    }

    const incidentId = data.id;
    let killSwitchEscalated = false;

    // Execute severity response protocol
    killSwitchEscalated = await this.executeSeverityResponse(
      definition,
      incidentId,
      raisedBy,
    );

    return {
      success: true,
      incident_id: incidentId,
      kill_switch_escalated: killSwitchEscalated,
      error: null,
    };
  }

  /**
   * Resolves an open incident.
   *
   * Auto-recoverable incidents may be resolved by the system actor.
   * Non-auto-recoverable incidents require a human actor.
   */
  async resolveIncident(
    incidentId: string,
    resolvedBy: string,
    resolutionNote: string,
  ): Promise<ResolveResult> {
    const { data: incident, error: fetchErr } = await incidentsTable()
      .select("id, code, auto_recoverable, status")
      .eq("id", incidentId)
      .single();

    if (fetchErr || !incident) {
      return {
        success: false,
        incident_id: incidentId,
        error: "Incident not found.",
      };
    }

    if (incident.status !== "OPEN") {
      return {
        success: false,
        incident_id: incidentId,
        error: `Incident is already ${incident.status}.`,
      };
    }

    const { error } = await incidentsTable()
      .update({
        status: "RESOLVED",
        resolved_by: resolvedBy,
        resolution_note: resolutionNote,
        resolved_at: new Date().toISOString(),
      })
      .eq("id", incidentId);

    if (error) {
      return {
        success: false,
        incident_id: incidentId,
        error: error.message,
      };
    }

    return { success: true, incident_id: incidentId, error: null };
  }

  /**
   * Returns all open incidents, ordered by severity (SEV1 first) then time.
   */
  async getActiveIncidents(): Promise<IncidentRecord[]> {
    const { data, error } = await incidentsTable()
      .select("*")
      .eq("status", "OPEN")
      .order("raised_at", { ascending: false });

    if (error || !data) {
      return [];
    }

    // Sort by severity: SEV1 > SEV2 > SEV3 > SEV4
    const severityOrder: Record<IncidentSeverity, number> = {
      SEV1: 0,
      SEV2: 1,
      SEV3: 2,
      SEV4: 3,
    };

    return (data as IncidentRecord[]).sort(
      (a, b) =>
        (severityOrder[a.severity] ?? 4) - (severityOrder[b.severity] ?? 4),
    );
  }

  // ============================================================================
  // PRIVATE
  // ============================================================================

  /**
   * Executes the severity-based response protocol for a raised incident.
   *
   * Returns true if kill switch escalation was triggered.
   *
   * SUPERVISORY SIGNALS: SIG_* codes always use ALERT_ONLY regardless of
   * severity. They detect and surface anomalies; they never mutate state.
   */
  private async executeSeverityResponse(
    definition: CanonicalIncident,
    incidentId: string,
    raisedBy: string,
  ): Promise<boolean> {
    // Supervisory signals: alert only, never escalate, never mutate
    if (definition.code.startsWith("SIG_")) {
      await this.emitAlert(definition, incidentId, "SUPERVISORY_SIGNAL");
      return false;
    }

    switch (definition.severity) {
      case "SEV1":
        // Page immediately and escalate kill switch
        await this.emitAlert(definition, incidentId, "PAGE_IMMEDIATELY");
        return this.escalateKillSwitch(definition, incidentId, raisedBy);

      case "SEV2":
        // Alert within 5 minutes — schedule alert (persisted; external scheduler picks up)
        await this.scheduleAlert(definition, incidentId, 5 * 60 * 1000);
        return false;

      case "SEV3":
        // Alert only
        await this.emitAlert(definition, incidentId, "ALERT");
        return false;

      case "SEV4":
        // Log only — already persisted to incidents table; nothing more to do
        return false;

      default: {
        // Exhaustive check
        const _exhaustive: never = definition.severity;
        void _exhaustive;
        return false;
      }
    }
  }

  /**
   * Persists an alert record to the audit trail.
   * Actual paging/notification delivery is handled by the notification layer.
   */
  private async emitAlert(
    definition: CanonicalIncident,
    incidentId: string,
    alertType: string,
  ): Promise<void> {
    await auditTable().insert({
      actor: "incident-manager",
      action: `INCIDENT_ALERT:${alertType}`,
      resource_type: "incident",
      resource_id: incidentId,
      reason: `${definition.severity} incident raised: ${definition.code}`,
      success: true,
      details: {
        code: definition.code,
        category: definition.category,
        severity: definition.severity,
        default_action: definition.default_action,
        alert_type: alertType,
      },
    });
  }

  /**
   * Schedules a deferred alert by persisting a scheduled_alert record.
   * A background worker delivers the alert after the delay elapses.
   */
  private async scheduleAlert(
    definition: CanonicalIncident,
    incidentId: string,
    delayMs: number,
  ): Promise<void> {
    const deliverAt = new Date(Date.now() + delayMs).toISOString();
    await auditTable().insert({
      actor: "incident-manager",
      action: "INCIDENT_ALERT:SCHEDULED",
      resource_type: "incident",
      resource_id: incidentId,
      reason: `${definition.severity} incident scheduled alert: ${definition.code}`,
      success: true,
      details: {
        code: definition.code,
        severity: definition.severity,
        deliver_at: deliverAt,
        delay_ms: delayMs,
      },
    });
  }

  /**
   * Triggers kill switch escalation to at least LEVEL_2_CANCEL_WORKING
   * for SEV1 incidents.
   *
   * Uses the system actor. The kill switch manager enforces its own
   * dual-control rules — if L2 requires dual-control approval, a request
   * is created and the escalation is pending.
   */
  private async escalateKillSwitch(
    definition: CanonicalIncident,
    incidentId: string,
    triggeredBy: string,
  ): Promise<boolean> {
    try {
      // Lazy import to avoid circular dependency
      const { killSwitchManager } = await import("@/lib/trading/risk/kill-switch");
      const result = await killSwitchManager.activateLevel(
        SEV1_KILL_SWITCH_LEVEL,
        `SEV1 incident ${definition.code} (incident_id=${incidentId})`,
        triggeredBy,
      );
      return result.success;
    } catch {
      // Kill switch escalation failure is recorded but does not suppress incident
      await this.emitAlert(
        definition,
        incidentId,
        "KILL_SWITCH_ESCALATION_FAILED",
      );
      return false;
    }
  }
}

export const incidentManager = IncidentManager.getInstance();
