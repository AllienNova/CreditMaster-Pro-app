/**
 * Budget Rollover API Endpoints
 *
 * GET /api/financial/budgets/rollover - Get rollover summary
 * POST /api/financial/budgets/rollover - Process rollovers for all budgets
 * PATCH /api/financial/budgets/rollover - Adjust rollover amount for a specific budget
 */

import { NextRequest, NextResponse } from "next/server";
import { jwtValidation } from "@/lib/auth/jwt-validation";
import { budgetService } from "@/lib/financial/budget-service";

/**
 * GET /api/financial/budgets/rollover
 * Get rollover summary for the authenticated user
 */
export async function GET(request: NextRequest) {
  try {
    const validation = await jwtValidation.validateFromHeaders(request);
    if (!validation.valid || !validation.user) {
      return NextResponse.json(
        { error: "Unauthorized", message: "Invalid or missing authentication" },
        { status: 401 },
      );
    }

    const summary = await budgetService.getRolloverSummary(validation.user.id);

    return NextResponse.json({
      success: true,
      data: summary,
    });
  } catch (_error) {
    // RolloverRoute error: Failed to fetch rollover summary
    void _error;
    return NextResponse.json(
      {
        error: "Internal Server Error",
        message: "Failed to fetch rollover summary",
      },
      { status: 500 },
    );
  }
}

/**
 * POST /api/financial/budgets/rollover
 * Process rollovers for all budgets that need it
 */
export async function POST(request: NextRequest) {
  try {
    const validation = await jwtValidation.validateFromHeaders(request);
    if (!validation.valid || !validation.user) {
      return NextResponse.json(
        { error: "Unauthorized", message: "Invalid or missing authentication" },
        { status: 401 },
      );
    }

    const result = await budgetService.processRolloversForUser(
      validation.user.id,
    );

    return NextResponse.json({
      success: true,
      data: {
        processed: result.processed,
        totalRollover: result.totalRollover,
        message:
          result.processed > 0
            ? `Processed ${result.processed} budget(s) with $${result.totalRollover.toFixed(2)} total rollover`
            : "No budgets needed rollover processing",
      },
    });
  } catch (_error) {
    // RolloverRoute error: Failed to process rollovers
    void _error;
    return NextResponse.json(
      {
        error: "Internal Server Error",
        message: "Failed to process rollovers",
      },
      { status: 500 },
    );
  }
}

/**
 * PATCH /api/financial/budgets/rollover
 * Adjust rollover amount for a specific budget
 * Body: { budgetId: string, rolloverAmount: number }
 */
export async function PATCH(request: NextRequest) {
  try {
    const validation = await jwtValidation.validateFromHeaders(request);
    if (!validation.valid || !validation.user) {
      return NextResponse.json(
        { error: "Unauthorized", message: "Invalid or missing authentication" },
        { status: 401 },
      );
    }

    const body = await request.json();
    const { budgetId, rolloverAmount } = body;

    if (!budgetId || typeof budgetId !== "string") {
      return NextResponse.json(
        { error: "Bad Request", message: "budgetId is required" },
        { status: 400 },
      );
    }

    if (typeof rolloverAmount !== "number" || rolloverAmount < 0) {
      return NextResponse.json(
        {
          error: "Bad Request",
          message: "rolloverAmount must be a non-negative number",
        },
        { status: 400 },
      );
    }

    const budget = await budgetService.adjustRolloverAmount(
      budgetId,
      validation.user.id,
      rolloverAmount,
    );

    return NextResponse.json({
      success: true,
      data: budget,
    });
  } catch (_error) {
    // RolloverRoute error: Failed to adjust rollover
    const message =
      _error instanceof Error ? _error.message : "Failed to adjust rollover";
    return NextResponse.json(
      { error: "Internal Server Error", message },
      { status: 500 },
    );
  }
}
