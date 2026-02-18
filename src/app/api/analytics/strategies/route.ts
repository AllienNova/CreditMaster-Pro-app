import { NextRequest, NextResponse } from "next/server";
import { jwtValidation } from "@/lib/auth/jwt-validation";
import { AnalyticsEngine } from "@/lib/analytics";

/**
 * GET /api/analytics/strategies
 * Get strategy effectiveness analytics
 */
export async function GET(request: NextRequest) {
  try {
    // Validate JWT token
    const validation = await jwtValidation.validateFromHeaders(request);

    if (!validation.valid || !validation.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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
}
