import { NextRequest, NextResponse } from "next/server";
import { withRole, type AuthedUser } from "@/lib/auth/api-guard";
import { AnalyticsEngine } from "@/lib/analytics";

/**
 * GET /api/analytics/timeseries
 * Get time series data for analytics (admin only)
 */
export const GET = withRole(
  "admin",
  async (request: NextRequest, user: AuthedUser) => {
  try {
    const userId = user.id;
    const { searchParams } = new URL(request.url);

    const metric = searchParams.get("metric") as
      | "disputes"
      | "workflows"
      | "ai_requests"
      | "savings";
    const startDate = searchParams.get("start_date") || undefined;
    const endDate = searchParams.get("end_date") || undefined;
    const interval = (searchParams.get("interval") || "day") as
      | "day"
      | "week"
      | "month";
    const scope = searchParams.get("scope") || "user"; // 'user' or 'system'

    if (!metric) {
      return NextResponse.json(
        { error: "Metric is required" },
        { status: 400 },
      );
    }

    // The route is admin-gated by withRole("admin"); both user-scoped and
    // system-wide time series are available to the authenticated admin.

    // Get time series data
    const data = await AnalyticsEngine.getTimeSeriesData(
      metric,
      scope === "user" ? userId : undefined,
      startDate,
      endDate,
      interval,
    );

    return NextResponse.json({ data });
  } catch (_error) {
    // Error logged
    void _error;
    return NextResponse.json(
      { error: "Failed to fetch time series data" },
      { status: 500 },
    );
  }
},
);
