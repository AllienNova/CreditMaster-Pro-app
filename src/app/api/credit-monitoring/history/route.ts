import { NextRequest, NextResponse } from "next/server";
import {
  creditMonitoringService,
  Bureau,
} from "@/lib/credit-monitoring/credit-monitoring-service";
import { withAuth } from "@/lib/auth/api-guard";
import type { AuthedUser } from "@/lib/auth/api-guard";

/**
 * GET /api/credit-monitoring/history
 * Get credit score history for a specific bureau
 */
export const GET = withAuth(
  async (request: NextRequest, user: AuthedUser) => {
  try {
    const { searchParams } = new URL(request.url);
    // userId is the authenticated user — never trust a client-supplied id (IDOR).
    const userId = user.id;
    const bureau = searchParams.get("bureau") as Bureau;
    const days = parseInt(searchParams.get("days") || "365");

    if (!bureau) {
      return NextResponse.json(
        { error: "Bureau is required" },
        { status: 400 },
      );
    }

    const history = await creditMonitoringService.getScoreHistory(
      userId,
      bureau,
      days,
    );

    return NextResponse.json({
      success: true,
      data: history,
    });
  } catch (_error) {
    // Error silently caught
    return NextResponse.json(
      { error: "Failed to fetch score history" },
      { status: 500 },
    );
  }
  },
);
