import { NextRequest, NextResponse } from "next/server";
import { withAuth, type AuthedUser } from "@/lib/auth/api-guard";
import { rbac } from "@/lib/auth/rbac";
import {
  AnalyticsEngine,
  type UserAnalytics,
  type DisputeAnalytics,
  type WorkflowAnalytics,
  type AIUsageAnalytics,
  type FinancialImpact,
  type StrategyAnalytics,
} from "@/lib/analytics";

type AnalyticsResponse =
  | UserAnalytics
  | DisputeAnalytics
  | WorkflowAnalytics
  | AIUsageAnalytics
  | FinancialImpact
  | StrategyAnalytics[]
  | {
      disputes: DisputeAnalytics;
      workflows: WorkflowAnalytics;
      ai_usage: AIUsageAnalytics;
      financial: FinancialImpact;
    };

/**
 * GET /api/analytics
 * Get analytics data
 */
export const GET = withAuth(async (request: NextRequest, user: AuthedUser) => {
  try {
    const userId = user.id;
    const { searchParams } = new URL(request.url);

    const type = searchParams.get("type") || "user";
    const startDate = searchParams.get("start_date") || undefined;
    const endDate = searchParams.get("end_date") || undefined;

    let data: AnalyticsResponse;

    switch (type) {
      case "user":
        data = await AnalyticsEngine.getUserAnalytics(userId);
        break;

      case "disputes":
        data = await AnalyticsEngine.getDisputeAnalytics(
          userId,
          startDate,
          endDate,
        );
        break;

      case "workflows":
        data = await AnalyticsEngine.getWorkflowAnalytics(
          userId,
          startDate,
          endDate,
        );
        break;

      case "ai_usage":
        data = await AnalyticsEngine.getAIUsageAnalytics(
          userId,
          startDate,
          endDate,
        );
        break;

      case "financial":
        data = await AnalyticsEngine.getFinancialImpact(userId);
        break;

      case "dashboard":
        data = await AnalyticsEngine.getDashboardMetrics(userId);
        break;

      case "system":
        // System-wide analytics require admin permission
        if (!rbac.hasPermission(user, "admin:analytics")) {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
        data = {
          disputes: await AnalyticsEngine.getDisputeAnalytics(
            undefined,
            startDate,
            endDate,
          ),
          workflows: await AnalyticsEngine.getWorkflowAnalytics(
            undefined,
            startDate,
            endDate,
          ),
          ai_usage: await AnalyticsEngine.getAIUsageAnalytics(
            undefined,
            startDate,
            endDate,
          ),
          financial: await AnalyticsEngine.getFinancialImpact(),
        };
        break;

      default:
        return NextResponse.json(
          { error: "Invalid analytics type" },
          { status: 400 },
        );
    }

    return NextResponse.json({ data });
  } catch (_error) {
    // Error logged
    void _error;
    return NextResponse.json(
      { error: "Failed to fetch analytics" },
      { status: 500 },
    );
  }
});
