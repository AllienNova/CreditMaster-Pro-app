/**
 * AI Financial Coach - Budget Optimization API
 *
 * GET /api/ai/financial-coach/budget - Get budget optimization analysis
 * POST /api/ai/financial-coach/budget/optimize - Generate optimization recommendations
 */

import { NextRequest, NextResponse } from "next/server";
import { withAuth, type AuthedUser } from "@/lib/auth/api-guard";
import { budgetOptimizer } from "@/lib/financial/budget-optimizer";

export const GET = withAuth(async (request: NextRequest, user: AuthedUser) => {
  try {
    const searchParams = request.nextUrl.searchParams;
    const includeTemplates = searchParams.get("includeTemplates") !== "false";
    const includeScenarios = searchParams.get("includeScenarios") !== "false";
    const targetSavingsRate = searchParams.get("targetSavingsRate")
      ? parseFloat(searchParams.get("targetSavingsRate")!)
      : undefined;

    const result = await budgetOptimizer.optimizeBudget({
      userId: user.id,
      includeTemplates,
      includeScenarios,
      targetSavingsRate,
    });

    return NextResponse.json(result);
  } catch (_error) {
    // FinancialCoachBudgetRoute error: Failed to fetch optimization
    void _error;
    return NextResponse.json(
      { error: "Failed to fetch budget optimization" },
      { status: 500 },
    );
  }
});

export const POST = withAuth(async (request: NextRequest, user: AuthedUser) => {
  try {
    const body = await request.json();
    const {
      includeTemplates = true,
      includeScenarios = true,
      targetSavingsRate,
    } = body;

    const result = await budgetOptimizer.optimizeBudget({
      userId: user.id,
      includeTemplates,
      includeScenarios,
      targetSavingsRate: targetSavingsRate
        ? parseFloat(targetSavingsRate)
        : undefined,
    });

    return NextResponse.json(result);
  } catch (_error) {
    // FinancialCoachBudgetRoute error: Optimization failed
    void _error;
    return NextResponse.json(
      { error: "Failed to optimize budget" },
      { status: 500 },
    );
  }
});
