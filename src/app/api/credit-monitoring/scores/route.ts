import { NextRequest, NextResponse } from "next/server";
import { creditMonitoringService } from "@/lib/credit-monitoring/credit-monitoring-service";
import { withAuth } from "@/lib/auth/api-guard";
import type { AuthedUser } from "@/lib/auth/api-guard";

/**
 * GET /api/credit-monitoring/scores
 * Get current credit scores for all bureaus
 */
export const GET = withAuth(
  async (_request: NextRequest, user: AuthedUser) => {
  try {
    // userId is the authenticated user — never trust a client-supplied id (IDOR).
    const userId = user.id;

    const scores = await creditMonitoringService.getCurrentScores(userId);

    return NextResponse.json({
      success: true,
      data: scores,
    });
  } catch (_error) {
    // Error silently caught
    return NextResponse.json(
      { error: "Failed to fetch credit scores" },
      { status: 500 },
    );
  }
  },
);
