import { NextResponse } from "next/server";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { verifyCronRequest } from "@/lib/security/cron-auth";

function getSupabase(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error("Supabase credentials not configured");
  }

  return createClient(url, key);
}


export async function GET(request: Request) {
  // Gated in EVERY environment, not just production. These jobs mutate data
  // for all users, and a staging or preview deploy running with any other
  // NODE_ENV was previously wide open. Local runs set CRON_SECRET like any
  // other credential.
  if (!verifyCronRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = getSupabase();
    const results = {
      expiredSessions: 0,
      oldNotifications: 0,
      tempFiles: 0,
      auditLogs: 0,
    };

    // 1. Clean up expired sessions (older than 30 days)
    const { data: expiredSessions } = await supabase
      // idor-audit: cross-user — system batch job over all users; no user session exists and the route is gated by CRON_SECRET
      .from("sessions")
      .select("id")
      .lt("expires_at", new Date().toISOString());

    if (expiredSessions && expiredSessions.length > 0) {
      const sessionIds = expiredSessions.map((s) => s.id);
      // idor-audit: cross-user — system batch job over all users; no user session exists and the route is gated by CRON_SECRET
      await supabase.from("sessions").delete().in("id", sessionIds);
      results.expiredSessions = sessionIds.length;
    }

    // 2. Clean up read notifications older than 90 days
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const { data: oldNotifications } = await supabase
      // idor-audit: cross-user — system batch job over all users; no user session exists and the route is gated by CRON_SECRET
      .from("notifications")
      .select("id")
      .eq("read", true)
      .lt("created_at", ninetyDaysAgo.toISOString());

    if (oldNotifications && oldNotifications.length > 0) {
      const notificationIds = oldNotifications.map((n) => n.id);
      // idor-audit: cross-user — system batch job over all users; no user session exists and the route is gated by CRON_SECRET
      await supabase.from("notifications").delete().in("id", notificationIds);
      results.oldNotifications = notificationIds.length;
    }

    // 3. Clean up temporary uploaded files older than 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data: tempFiles } = await supabase
      // idor-audit: cross-user — system batch job over all users; no user session exists and the route is gated by CRON_SECRET
      .from("uploads")
      .select("id, storage_path")
      .eq("is_temp", true)
      .lt("created_at", sevenDaysAgo.toISOString());

    for (const file of tempFiles || []) {
      // Delete from storage
      // idor-audit: cross-user — system batch job over all users; no user session exists and the route is gated by CRON_SECRET
      await supabase.storage.from("documents").remove([file.storage_path]);
      // Delete record
      // idor-audit: cross-user — system batch job over all users; no user session exists and the route is gated by CRON_SECRET
      await supabase.from("uploads").delete().eq("id", file.id);
      results.tempFiles++;
    }

    // 4. Archive old audit logs (older than 1 year)
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    const { data: oldAuditLogs } = await supabase
      // idor-audit: cross-user — system batch job over all users; no user session exists and the route is gated by CRON_SECRET
      .from("audit_logs")
      .select("id")
      .lt("created_at", oneYearAgo.toISOString());

    if (oldAuditLogs && oldAuditLogs.length > 0) {
      const auditIds = oldAuditLogs.map((a) => a.id);
      // idor-audit: cross-user — system batch job over all users; no user session exists and the route is gated by CRON_SECRET
      await supabase.from("audit_logs").delete().in("id", auditIds);
      results.auditLogs = auditIds.length;
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      results,
    });
  } catch (_error) {
    // Error silently caught
    return NextResponse.json(
      { error: "Failed to cleanup sessions" },
      { status: 500 },
    );
  }
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
