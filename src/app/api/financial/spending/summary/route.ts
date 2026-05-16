/**
 * Spending Summary API Route
 *
 * GET /api/financial/spending/summary - Get quick spending summary
 */

import { NextRequest, NextResponse } from "next/server";
import { spendingAnalysisService } from "@/lib/financial/spending-analysis-service";
import { withPermission } from "@/lib/auth/api-guard";
import type { AuthedUser } from "@/lib/auth/api-guard";

/**
 * GET /api/financial/spending/summary
 * Get quick spending summary for the authenticated user
 */
export const GET = withPermission(
  "financial:read",
  async (request: NextRequest, user: AuthedUser) => {
    const userId = user.id;
  try {


    const summary = await spendingAnalysisService.getQuickSummary(userId);

    return NextResponse.json({
      success: true,
      data: summary,
    });
  } catch (error) {
    console.error("Error fetching spending summary:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch spending summary",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
},
);
