import { NextRequest, NextResponse } from "next/server";
import { creditMonitoringService } from "@/lib/credit-monitoring/credit-monitoring-service";

/**
 * GET /api/credit-monitoring/scores
 * Get current credit scores for all bureaus
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 },
      );
    }

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
}
