/**
 * Audit Trail — Strativion Autonomous Trading Package
 *
 * Immutable append-only log of all significant runtime decisions.
 * Every entry carries canonical_hash so the policy version in force
 * at decision time is permanently recorded.
 *
 * Table: trading_audit_trail
 *
 * All state mutations — kill switch transitions, incident raises,
 * order lifecycle events, mode changes — must produce an audit entry.
 */

import { getPolicy } from "@/lib/trading/config";
import { supabaseAdmin } from "@/lib/supabase/server";

// ============================================================================
// TYPED TABLE ACCESSOR
// ============================================================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const auditTable = () => (supabaseAdmin as any).from("trading_audit_trail");

// ============================================================================
// TYPES
// ============================================================================

export type AuditResourceType =
  | "kill_switch"
  | "dual_control"
  | "incident"
  | "order"
  | "position"
  | "risk_rule"
  | "mode_transition"
  | "policy"
  | "session"
  | "system";

export interface AuditEntry {
  id: string;
  actor: string;
  action: string;
  resource_type: AuditResourceType;
  resource_id: string | null;
  reason: string;
  success: boolean;
  details: Record<string, unknown>;
  canonical_package_version: string;
  canonical_hash: string;
  created_at: string;
}

export interface RecordAuditEntryInput {
  actor: string;
  action: string;
  resource_type: AuditResourceType;
  resource_id?: string | null;
  reason: string;
  success: boolean;
  details?: Record<string, unknown>;
}

export interface AuditTrailQuery {
  resource_type?: AuditResourceType;
  resource_id?: string;
  actor?: string;
  action?: string;
  success?: boolean;
  since?: Date;
  until?: Date;
  limit?: number;
  offset?: number;
}

export interface AuditTrailPage {
  entries: AuditEntry[];
  total: number;
}

// ============================================================================
// AUDIT TRAIL
// ============================================================================

export class AuditTrail {
  private static instance: AuditTrail;

  private constructor() {}

  static getInstance(): AuditTrail {
    if (!AuditTrail.instance) {
      AuditTrail.instance = new AuditTrail();
    }
    return AuditTrail.instance;
  }

  /**
   * Records an immutable audit entry with the current canonical policy hash.
   *
   * Returns the ID of the created entry on success.
   * On failure, logs the error and returns null — audit failures must never
   * block the primary operation being audited.
   */
  async recordAuditEntry(
    input: RecordAuditEntryInput,
  ): Promise<string | null> {
    try {
      const policy = await getPolicy();

      const { data, error } = await auditTable()
        .insert({
          actor: input.actor,
          action: input.action,
          resource_type: input.resource_type,
          resource_id: input.resource_id ?? null,
          reason: input.reason,
          success: input.success,
          details: input.details ?? {},
          canonical_package_version: policy.meta.canonical_package_version,
          canonical_hash: policy.canonicalHash,
        })
        .select("id")
        .single();

      if (error || !data) {
        // Audit failure is logged to stderr but must not throw
        console.error(
          "[AuditTrail] Failed to persist entry:",
          error?.message ?? "unknown error",
          { action: input.action, actor: input.actor },
        );
        return null;
      }

      return data.id;
    } catch (err) {
      console.error("[AuditTrail] Unexpected error:", err, {
        action: input.action,
        actor: input.actor,
      });
      return null;
    }
  }

  /**
   * Retrieves audit trail entries matching the given filters.
   *
   * Results are ordered newest-first. Default limit is 100, max 1000.
   */
  async getAuditTrail(query: AuditTrailQuery = {}): Promise<AuditTrailPage> {
    const limit = Math.min(query.limit ?? 100, 1000);
    const offset = query.offset ?? 0;

    let builder = auditTable()
      .select("*", { count: "exact" });

    if (query.resource_type) {
      builder = builder.eq("resource_type", query.resource_type);
    }
    if (query.resource_id) {
      builder = builder.eq("resource_id", query.resource_id);
    }
    if (query.actor) {
      builder = builder.eq("actor", query.actor);
    }
    if (query.action) {
      builder = builder.eq("action", query.action);
    }
    if (query.success !== undefined) {
      builder = builder.eq("success", query.success);
    }
    if (query.since) {
      builder = builder.gte("created_at", query.since.toISOString());
    }
    if (query.until) {
      builder = builder.lte("created_at", query.until.toISOString());
    }

    const { data, error, count } = await builder
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error || !data) {
      return { entries: [], total: 0 };
    }

    return {
      entries: data as AuditEntry[],
      total: count ?? 0,
    };
  }
}

export const auditTrail = AuditTrail.getInstance();
