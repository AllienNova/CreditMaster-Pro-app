import { NextRequest, NextResponse } from "next/server";
import { creditMonitoringService } from "@/lib/credit-monitoring/credit-monitoring-service";
import { withAuth } from "@/lib/auth/api-guard";
import type { AuthedUser } from "@/lib/auth/api-guard";

/**
 * GET /api/credit-monitoring
 * Get monitoring dashboard data
 */
export const GET = withAuth(
  async (_request: NextRequest, user: AuthedUser) => {
  try {
    // userId is the authenticated user — never trust a client-supplied id (IDOR).
    const userId = user.id;

    const dashboard =
      await creditMonitoringService.getMonitoringDashboard(userId);

    return NextResponse.json({
      success: true,
      data: dashboard,
    });
  } catch (_error) {
    // Error logged
    return NextResponse.json(
      { error: "Failed to fetch monitoring dashboard" },
      { status: 500 },
    );
  }
  },
);

/**
 * POST /api/credit-monitoring
 * Add new credit score
 */
export const POST = withAuth(
  async (request: NextRequest, user: AuthedUser) => {
  try {
    const body = await request.json();
    const { bureau, score, factors } = body;
    // userId is the authenticated user — never trust a client-supplied id (IDOR).
    const userId = user.id;

    if (!bureau || !score) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    const creditScore = await creditMonitoringService.addCreditScore(
      userId,
      bureau,
      score,
      factors || [],
    );

    if (!creditScore) {
      return NextResponse.json(
        { error: "Failed to add credit score" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      data: creditScore,
    });
  } catch (_error) {
    // Error logged
    return NextResponse.json(
      { error: "Failed to add credit score" },
      { status: 500 },
    );
  }
  },
);
