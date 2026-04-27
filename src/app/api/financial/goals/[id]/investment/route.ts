/**
 * Goal Investment API
 *
 * GET /api/financial/goals/[id]/investment
 * Returns investment projection, recommended allocation, and suggested funds
 * for a specific financial goal.
 */

import { NextRequest, NextResponse } from "next/server";
import { jwtValidation } from "@/lib/auth/jwt-validation";
import { rbac } from "@/lib/auth/rbac";
import { getSupabase } from "@/lib/supabase/client";
import { goalInvestmentService } from "@/lib/goals/services";

const supabase = getSupabase();

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

const SUGGESTED_FUNDS: Record<
  string,
  { ticker: string; name: string; type: string; expenseRatio: number }[]
> = {
  stocks: [
    { ticker: "VTI", name: "Vanguard Total Stock Market ETF", type: "ETF", expenseRatio: 0.03 },
    { ticker: "VOO", name: "Vanguard S&P 500 ETF", type: "ETF", expenseRatio: 0.03 },
  ],
  bonds: [
    { ticker: "BND", name: "Vanguard Total Bond Market ETF", type: "ETF", expenseRatio: 0.03 },
    { ticker: "AGG", name: "iShares Core U.S. Aggregate Bond ETF", type: "ETF", expenseRatio: 0.03 },
  ],
  alternatives: [
    { ticker: "VNQ", name: "Vanguard Real Estate ETF", type: "ETF", expenseRatio: 0.12 },
  ],
  cash: [
    { ticker: "SHV", name: "iShares Short Treasury Bond ETF", type: "ETF", expenseRatio: 0.15 },
  ],
};

const ALLOCATION_COLORS: Record<string, string> = {
  stocks: "#3B82F6",
  bonds: "#22C55E",
  alternatives: "#8B5CF6",
  cash: "#F59E0B",
};

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const validation = await jwtValidation.validateFromHeaders(request);

    if (!validation.valid || !validation.user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    if (!rbac.hasPermission(validation.user, "financial:create_goals")) {
      return NextResponse.json(
        { success: false, error: "Forbidden - Premium feature required" },
        { status: 403 },
      );
    }

    const userId = validation.user.id;
    const { id: goalId } = await params;

    const { data: goal, error } = await supabase
      .from("financial_goals")
      .select("*")
      .eq("id", goalId)
      .eq("user_id", userId)
      .single();

    if (error || !goal) {
      return NextResponse.json(
        { success: false, error: "Goal not found" },
        { status: 404 },
      );
    }

    const targetDate = new Date(goal.target_date);
    const now = new Date();
    const yearsToGoal = Math.max(
      0,
      (targetDate.getTime() - now.getTime()) / (365.25 * 24 * 60 * 60 * 1000),
    );

    const goalType = goal.type || "custom";
    const monthlyContribution = goal.monthly_contribution || 0;

    // Get recommended allocation from service
    const allocation = goalInvestmentService.getRecommendedAllocation(
      goalType,
      yearsToGoal,
    );

    // Calculate projection
    const projection = goalInvestmentService.calculateProjection(
      goal.current_amount,
      monthlyContribution,
      goal.target_amount,
      targetDate,
    );

    // Build allocation with colors and suggested funds
    const allocationWithDetails = allocation.map((a) => ({
      assetClass: a.assetClass,
      label: a.assetClass.charAt(0).toUpperCase() + a.assetClass.slice(1),
      percent: a.percent,
      value: Math.round((a.percent / 100) * goal.current_amount),
      color: ALLOCATION_COLORS[a.assetClass] || "#6B7280",
      rationale: a.rationale,
      suggestedFunds: SUGGESTED_FUNDS[a.assetClass] || [],
    }));

    // Build monthly projection data points (up to 24 months)
    const monthCount = Math.min(24, Math.ceil(yearsToGoal * 12));
    const monthlyDataPoints: { month: string; projected: number; target: number }[] = [];
    let runningAmount = goal.current_amount;
    const monthlyReturn = 0.07 / 12;

    for (let i = 1; i <= monthCount; i++) {
      runningAmount = runningAmount * (1 + monthlyReturn) + monthlyContribution;
      const monthDate = new Date(now);
      monthDate.setMonth(monthDate.getMonth() + i);
      monthlyDataPoints.push({
        month: monthDate.toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
        projected: Math.round(runningAmount),
        target: goal.target_amount,
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        goalId,
        goalName: goal.name,
        goalType,
        currentAmount: goal.current_amount,
        targetAmount: goal.target_amount,
        targetDate: goal.target_date,
        yearsToGoal: Math.round(yearsToGoal * 10) / 10,
        projection: {
          projectedAmount: projection.projectedAmount,
          isOnTrack: projection.isOnTrack,
          shortfall: projection.shortfallAmount,
          requiredMonthlyContribution: projection.requiredMonthlyContribution,
          confidenceLevel: projection.confidenceLevel,
          scenarios: [
            { label: "Pessimistic", amount: projection.scenarios.pessimistic, probability: 5 },
            { label: "Expected", amount: projection.scenarios.expected, probability: 50 },
            { label: "Optimistic", amount: projection.scenarios.optimistic, probability: 95 },
          ],
          monthlyDataPoints,
        },
        allocation: allocationWithDetails,
        suggestedMonthlyContribution: projection.requiredMonthlyContribution,
      },
    });
  } catch (_error) {
    const errorMessage =
      _error instanceof Error ? _error.message : "Failed to fetch goal investment data";

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        _meta: { timestamp: new Date().toISOString() },
      },
      { status: 500 },
    );
  }
}
