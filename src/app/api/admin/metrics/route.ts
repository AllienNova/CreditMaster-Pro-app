import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  requireRole,
  createAuthResponse,
} from "@/lib/security/auth-middleware";

function getSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export async function GET(request: NextRequest) {
  // SECURITY: Require admin role for platform metrics
  const authResult = await requireRole(request, "admin");
  if (!authResult.authenticated || !authResult.user) {
    return createAuthResponse(authResult);
  }

  const supabase = getSupabaseClient();
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || "30d";

    // Get date range
    const now = new Date();
    const startDate = new Date();
    switch (period) {
      case "7d":
        startDate.setDate(now.getDate() - 7);
        break;
      case "30d":
        startDate.setDate(now.getDate() - 30);
        break;
      case "90d":
        startDate.setDate(now.getDate() - 90);
        break;
      default:
        startDate.setDate(now.getDate() - 30);
    }

    // Fetch metrics in parallel
    const [usersResult, disputesResult, subscriptionsResult, revenueResult] =
      await Promise.all([
        supabase.from("profiles").select("id, created_at", { count: "exact" }),
        supabase
          .from("disputes")
          .select("id, status, created_at", { count: "exact" }),
        supabase
          .from("subscriptions")
          .select("id, plan, status, amount", { count: "exact" }),
        supabase
          .from("payments")
          .select("amount, created_at")
          .gte("created_at", startDate.toISOString()),
      ]);

    const totalUsers = usersResult.count || 0;
    const totalDisputes = disputesResult.count || 0;
    const activeSubscriptions =
      subscriptionsResult.data?.filter((s) => s.status === "active").length ||
      0;

    const mrr =
      subscriptionsResult.data
        ?.filter((s) => s.status === "active")
        .reduce((sum, s) => sum + (s.amount || 0), 0) || 0;

    const revenue =
      revenueResult.data?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;

    const successfulDisputes =
      disputesResult.data?.filter((d) => d.status === "resolved").length || 0;
    const disputeSuccessRate =
      totalDisputes > 0
        ? ((successfulDisputes / totalDisputes) * 100).toFixed(1)
        : 0;

    // New users in period
    const newUsers =
      usersResult.data?.filter((u) => new Date(u.created_at) >= startDate)
        .length || 0;

    return NextResponse.json({
      metrics: {
        totalUsers,
        newUsers,
        totalDisputes,
        successfulDisputes,
        disputeSuccessRate: `${disputeSuccessRate}%`,
        activeSubscriptions,
        mrr,
        revenue,
        period,
      },
      trends: {
        users: generateTrendData(
          usersResult.data || [],
          startDate,
          "created_at",
        ),
        disputes: generateTrendData(
          disputesResult.data || [],
          startDate,
          "created_at",
        ),
        revenue: generateTrendData(
          revenueResult.data || [],
          startDate,
          "created_at",
          "amount",
        ),
      },
    });
  } catch (_error) {
    // Error silently caught
    return NextResponse.json(
      { error: "Failed to fetch metrics" },
      { status: 500 },
    );
  }
}

interface TrendDataItem {
  [key: string]: string | number | undefined;
}

function generateTrendData(
  data: TrendDataItem[],
  startDate: Date,
  dateField: string,
  valueField?: string,
) {
  const days: { [key: string]: number } = {};
  const now = new Date();

  // Initialize days
  for (let d = new Date(startDate); d <= now; d.setDate(d.getDate() + 1)) {
    const key = d.toISOString().split("T")[0];
    days[key] = 0;
  }

  // Populate data
  data.forEach((item) => {
    const dateValue = item[dateField];
    if (typeof dateValue === "string") {
      const date = new Date(dateValue).toISOString().split("T")[0];
      if (days[date] !== undefined) {
        const value = valueField ? item[valueField] : undefined;
        days[date] += typeof value === "number" ? value : 1;
      }
    }
  });

  return Object.entries(days).map(([date, value]) => ({ date, value }));
}
