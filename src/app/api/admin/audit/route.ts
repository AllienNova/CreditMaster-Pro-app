import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { withRole } from "@/lib/auth/api-guard";
import type { AuthedUser } from "@/lib/auth/api-guard";

function getSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export const GET = withRole(
  "admin",
  async (request: NextRequest, _user: AuthedUser) => {
    const supabase = getSupabaseClient();
    try {
      const { searchParams } = new URL(request.url);
      const page = parseInt(searchParams.get("page") || "1");
      const limit = parseInt(searchParams.get("limit") || "50");
      const action = searchParams.get("action") || "";
      const userId = searchParams.get("userId") || "";
      const startDate = searchParams.get("startDate");
      const endDate = searchParams.get("endDate");

      const offset = (page - 1) * limit;

      let query = supabase
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
  async (request: NextRequest, _user: AuthedUser) => {
    const supabase = getSupabaseClient();
    try {
      const { action, userId, details, ipAddress } = await request.json();

      const { data, error } = await supabase
        .from("audit_logs")
        .insert({
          action,
          user_id: userId,
          details,
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
