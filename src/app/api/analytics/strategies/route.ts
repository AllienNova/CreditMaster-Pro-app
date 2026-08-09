import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/api-guard";
import { AnalyticsEngine } from "@/lib/analytics";

/**
 * GET /api/analytics/strategies
 * Get strategy effectiveness analytics
 */
export const GET = withAuth(async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url);
    const strategyId = searchParams.get("strategy_id") || undefined;

    // Get strategy analytics
    const strategies = await AnalyticsEngine.getStrategyAnalytics(strategyId);

    return NextResponse.json({ strategies });
  } catch (_error) {
    // Error logged
    return NextResponse.json(
      { error: "Failed to fetch strategy analytics" },
      { status: 500 },
    );
  }
});
