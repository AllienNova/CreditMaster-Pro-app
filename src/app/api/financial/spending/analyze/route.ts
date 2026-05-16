/**
 * Spending Analysis API Route
 *
 * POST /api/financial/spending/analyze - Analyze spending for a period
 */

import { NextRequest, NextResponse } from "next/server";
import { spendingAnalysisService } from "@/lib/financial/spending-analysis-service";
import { withPermission } from "@/lib/auth/api-guard";
import type { AuthedUser } from "@/lib/auth/api-guard";

/**
 * POST /api/financial/spending/analyze
 * Analyze spending patterns for a specific period
 */
export const POST = withPermission(
  "financial:read",
  async (request: NextRequest, user: AuthedUser) => {
    const userId = user.id;
  try {


    const body = await request.json();
    const { startDate, endDate } = body;

    // Validate required fields
    if (!startDate || !endDate) {
      return NextResponse.json(
        {
          error: "Missing required fields",
          required: ["startDate", "endDate"],
        },
        { status: 400 },
      );
    }

    // Validate dates
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return NextResponse.json(
        { error: "Invalid date format" },
        { status: 400 },
      );
    }

    if (start >= end) {
      return NextResponse.json(
        { error: "startDate must be before endDate" },
        { status: 400 },
      );
    }

    const analysis = await spendingAnalysisService.analyzeSpending(userId, {
      startDate: start,
      endDate: end,
    });

    return NextResponse.json({
      success: true,
      data: analysis,
    });
  } catch (error) {
    console.error("Error analyzing spending:", error);
    return NextResponse.json(
      {
        error: "Failed to analyze spending",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
},
);
