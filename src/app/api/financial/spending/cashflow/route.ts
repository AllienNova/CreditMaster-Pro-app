/**
 * Cash Flow Analysis API Endpoint
 *
 * GET /api/financial/spending/cashflow - Get cash flow analysis
 */

import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/api-guard";
import type { AuthedUser } from "@/lib/auth/api-guard";
import { spendingAnalysisService } from "@/lib/financial/spending-analysis-service";

/**
 * GET /api/financial/spending/cashflow
 * Get comprehensive cash flow analysis for the authenticated user
 * Query params:
 *   - months: number of months to analyze (default: 6)
 */
export const GET = withAuth(
  async (request: NextRequest, user: AuthedUser) => {
  try {


    const { searchParams } = new URL(request.url);
    const months = parseInt(searchParams.get("months") || "6", 10);

    // Validate months parameter
    if (isNaN(months) || months < 1 || months > 24) {
      return NextResponse.json(
        { error: "Bad Request", message: "months must be between 1 and 24" },
        { status: 400 },
      );
    }

    const analysis = await spendingAnalysisService.getCashFlowAnalysis(
      user.id,
      months,
    );

    return NextResponse.json({
      success: true,
      data: analysis,
    });
  } catch (error) {
    console.error("Error fetching cash flow analysis:", error);
    return NextResponse.json(
      {
        error: "Internal Server Error",
        message: "Failed to fetch cash flow analysis",
      },
      { status: 500 },
    );
  }
},
);
