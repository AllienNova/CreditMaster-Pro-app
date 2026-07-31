/**
 * Shared audit-logging helper for the /api/privacy/* data-subject-rights
 * routes (GDPR Art. 15/17/20, CCPA §1798.100/105/110/120).
 *
 * Writes directly to `audit_logs` with a service-role client, rather than
 * through `src/lib/audit/audit-logger.ts`, whose `AuditAction` union is
 * scoped to admin-panel actions (actor acting on a target) and doesn't fit
 * the self-service shape here (the authenticated user IS the subject).
 *
 * Uses a plain (untyped) `createClient` rather than the `supabaseAdmin`
 * singleton from `@/lib/supabase/server`: `audit_logs` is absent from the
 * generated `Database` type in `src/lib/supabase/types.ts` (confirmed by
 * grep — pre-existing schema-drift, out of scope here), so `supabaseAdmin`'s
 * `<Database>`-typed `.from("audit_logs")` resolves to `never` and rejects
 * any insert payload. This matches the same workaround already established
 * at `src/lib/audit/audit-logger.ts` and `src/app/api/admin/audit/route.ts`.
 *
 * `resource_type` is NOT NULL on `audit_logs`; every call here supplies it
 * explicitly rather than relying on the column default.
 */

import type { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getAuditClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export type PrivacyAuditAction =
  | "gdpr_export_completed"
  | "gdpr_export_failed"
  | "gdpr_erasure_api_requested"
  | "gdpr_erasure_api_completed"
  | "gdpr_erasure_api_failed";

/**
 * Best-effort client IP extraction — matches the idiom already established
 * at src/app/api/admin/audit/route.ts.
 */
export function getClientIp(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for") ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

interface WriteAuditLogParams {
  userId: string;
  action: PrivacyAuditAction;
  resourceType: string;
  request: NextRequest;
  details?: Record<string, unknown>;
}

/**
 * Records one data-subject-rights audit event. Never throws — a dropped
 * audit row must not take down the underlying export/erasure/consent
 * operation, but a failure to write it must still be observable, so it is
 * logged loudly to stderr (mirrors src/lib/audit/audit-logger.ts).
 */
export async function writeAuditLog({
  userId,
  action,
  resourceType,
  request,
  details,
}: WriteAuditLogParams): Promise<void> {
  try {
    const { error } = await getAuditClient().from("audit_logs").insert({
      user_id: userId,
      action,
      resource_type: resourceType,
      details: details ?? null,
      ip_address: getClientIp(request),
      user_agent: request.headers.get("user-agent") ?? null,
      created_at: new Date().toISOString(),
    });

    if (error) {
      console.error("[privacy-audit] failed to persist audit event", {
        action,
        code: error.code,
        message: error.message,
      });
    }
  } catch (err) {
    console.error("[privacy-audit] unexpected error persisting audit event", {
      action,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}
