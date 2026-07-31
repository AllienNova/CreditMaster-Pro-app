/**
 * Audit Logger Service
 *
 * Tracks sensitive admin operations for security and compliance
 */

import { createClient } from "@supabase/supabase-js";

// Audit event types
export type AuditAction =
  | "user.view"
  | "user.update"
  | "user.delete"
  | "user.suspend"
  | "user.role_change"
  | "subscription.update"
  | "subscription.cancel"
  | "subscription.refund"
  | "dispute.view"
  | "dispute.update"
  | "dispute.delete"
  | "settings.update"
  | "feature_flag.update"
  | "config.update"
  | "export.data"
  | "login.success"
  | "login.failed"
  | "logout"
  | "password.change"
  | "mfa.enable"
  | "mfa.disable"
  | "api_key.create"
  | "api_key.revoke";

export interface AuditEvent {
  action: AuditAction;
  actorId: string;
  actorEmail?: string;
  actorRole?: string;
  targetId?: string;
  targetType?: string;
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  success: boolean;
  errorMessage?: string;
}

interface AuditLogEntry extends AuditEvent {
  id: string;
  timestamp: string;
}

function getSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

/**
 * Log an audit event
 */
export async function logAuditEvent(event: AuditEvent): Promise<void> {
  const supabase = getSupabaseClient();
  try {
    // Column names are mapped to the CANONICAL audit_logs shape (ADR-0010).
    // This writer previously invented its own vocabulary — actor_id, target_id,
    // target_type — none of which exist on the table, so every insert failed.
    // `resource_type` is NOT NULL, so `targetType` falls back to a non-empty
    // marker rather than nulling the constraint out.
    const entry = {
      action: event.action,
      user_id: event.actorId,
      actor_email: event.actorEmail,
      actor_role: event.actorRole,
      resource_id: event.targetId,
      resource_type: event.targetType || "unspecified",
      details: event.details,
      ip_address: event.ipAddress,
      user_agent: event.userAgent,
      success: event.success,
      error_message: event.errorMessage,
      created_at: new Date().toISOString(),
    };

    const { error } = await supabase.from("audit_logs").insert(entry);

    if (error) {
      // A dropped audit record is a compliance failure, not a nuisance: this
      // used to be swallowed silently, so audit logging failed for months
      // against a schema that never had these columns. Surface it loudly.
      // Deliberately not rethrown — an audit outage must not take down the
      // caller's operation — but it MUST be observable.
      console.error("[audit-logger] failed to persist audit event", {
        action: event.action,
        resourceType: event.targetType || "unspecified",
        code: error.code,
        message: error.message,
      });
    }
  } catch (error) {
    console.error("[audit-logger] unexpected error persisting audit event", {
      action: event.action,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Query audit logs with filters
 */
export async function queryAuditLogs(filters: {
  actorId?: string;
  targetId?: string;
  action?: AuditAction;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}): Promise<{ logs: AuditLogEntry[]; total: number }> {
  const supabase = getSupabaseClient();
  let query = supabase.from("audit_logs").select("*", { count: "exact" });

  if (filters.actorId) {
    query = query.eq("actor_id", filters.actorId);
  }
  if (filters.targetId) {
    query = query.eq("target_id", filters.targetId);
  }
  if (filters.action) {
    query = query.eq("action", filters.action);
  }
  if (filters.startDate) {
    query = query.gte("created_at", filters.startDate.toISOString());
  }
  if (filters.endDate) {
    query = query.lte("created_at", filters.endDate.toISOString());
  }

  query = query
    .order("created_at", { ascending: false })
    .range(
      filters.offset || 0,
      (filters.offset || 0) + (filters.limit || 50) - 1,
    );

  const { data, error, count } = await query;

  if (error) throw error;

  return {
    logs: (data || []).map((row) => ({
      id: row.id,
      action: row.action,
      actorId: row.actor_id,
      actorEmail: row.actor_email,
      actorRole: row.actor_role,
      targetId: row.target_id,
      targetType: row.target_type,
      details: row.details,
      ipAddress: row.ip_address,
      userAgent: row.user_agent,
      success: row.success,
      errorMessage: row.error_message,
      timestamp: row.created_at,
    })),
    total: count || 0,
  };
}

/**
 * Helper to create audit logger for a specific actor
 */
export function createAuditLogger(
  actorId: string,
  actorEmail?: string,
  actorRole?: string,
) {
  return {
    log: (event: Omit<AuditEvent, "actorId" | "actorEmail" | "actorRole">) =>
      logAuditEvent({ ...event, actorId, actorEmail, actorRole }),

    success: (action: AuditAction, details?: Record<string, any>) =>
      logAuditEvent({
        action,
        actorId,
        actorEmail,
        actorRole,
        details,
        success: true,
      }),

    failure: (
      action: AuditAction,
      errorMessage: string,
      details?: Record<string, any>,
    ) =>
      logAuditEvent({
        action,
        actorId,
        actorEmail,
        actorRole,
        details,
        success: false,
        errorMessage,
      }),
  };
}
