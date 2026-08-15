import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { withRole } from "@/lib/auth/api-guard";
import type { AuthedUser } from "@/lib/auth/api-guard";

const MAX_LIMIT = 100;

function getSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

function clampLimit(raw: string | null): number {
  const parsed = parseInt(raw ?? "50", 10);
  const safe = Number.isNaN(parsed) ? 50 : parsed;
  return Math.min(Math.max(safe, 1), MAX_LIMIT);
}

function clampPage(raw: string | null): number {
  const parsed = parseInt(raw ?? "1", 10);
  const safe = Number.isNaN(parsed) ? 1 : parsed;
  return Math.max(safe, 1);
}

export const GET = withRole(
  "admin",
  async (request: NextRequest, _user: AuthedUser) => {
    const supabase = getSupabaseClient();
    try {
      const { searchParams } = new URL(request.url);
      const page = clampPage(searchParams.get("page"));
      const limit = clampLimit(searchParams.get("limit"));
      const action = searchParams.get("action") || "";
      const userId = searchParams.get("userId") || "";
      const startDate = searchParams.get("startDate");
      const endDate = searchParams.get("endDate");

      const offset = (page - 1) * limit;

      let query = supabase
        // idor-audit: cross-user — platform-wide admin report; spans users by definition and the route is gated by withRole("admin")
        .from("audit_logs")
        .select("*, profiles(full_name, email)", { count: "exact" });

      if (action && action !== "all") {
        query = query.eq("action", action);
      }

      if (userId) {
        query = query.eq("user_id", userId);
      }

      if (startDate) {
        query = query.gte("created_at", startDate);
      }

      if (endDate) {
        query = query.lte("created_at", endDate);
      }

      const {
        data: logs,
        count,
        error,
      } = await query
        .range(offset, offset + limit - 1)
        .order("created_at", { ascending: false });

      if (error) {
        return NextResponse.json(
          { error: "Failed to fetch audit logs" },
          { status: 500 },
        );
      }

      return NextResponse.json({
        logs: logs ?? [],
        total: count ?? 0,
        page,
        limit,
        totalPages: Math.ceil((count ?? 0) / limit),
      });
    } catch (_error) {
      return NextResponse.json(
        { error: "Failed to fetch audit logs" },
        { status: 500 },
      );
    }
  },
);

export const POST = withRole(
  "admin",
  async (request: NextRequest, user: AuthedUser) => {
    const supabase = getSupabaseClient();
    try {
      // SECURITY: the actor and origin of a forensic log entry must never come
      // from the client body — a caller could otherwise attribute their own
      // action to an arbitrary spoofed userId/ipAddress. Both are derived
      // server-side: user_id from the authenticated session, ip_address from
      // the request headers.
      const { action, details, resourceType, resourceId } =
        await request.json();
      const ipAddress =
        request.headers.get("x-forwarded-for") ||
        request.headers.get("x-real-ip") ||
        "unknown";

      const { data, error } = await supabase
        // idor-audit: cross-user — platform-wide admin report; spans users by definition and the route is gated by withRole("admin")
        .from("audit_logs")
        .insert({
          action,
          user_id: user.id,
          details,
          // `resource_type` is NOT NULL on audit_logs. This insert omitted it
          // entirely, so every admin audit write failed against the live
          // schema. Callers may name the resource; otherwise it is recorded
          // honestly as an unspecified admin action rather than left null.
          resource_type: resourceType || "admin_action",
          resource_id: resourceId ?? null,
          ip_address: ipAddress,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      return NextResponse.json({ log: data });
    } catch (_error) {
      return NextResponse.json(
        { error: "Failed to create audit log" },
        { status: 500 },
      );
    }
  },
);
