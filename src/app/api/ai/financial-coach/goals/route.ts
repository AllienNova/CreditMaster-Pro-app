/**
 * AI Financial Coach - Goals API
 *
 * GET /api/ai/financial-coach/goals - Get user's financial goals
 * POST /api/ai/financial-coach/goals - Create a new goal
 */

import { NextRequest, NextResponse } from "next/server";
import { withAuth, type AuthedUser } from "@/lib/auth/api-guard";
import { goalPlanner } from "@/lib/financial/goal-planner";

export const GET = withAuth(
  async (_request: NextRequest, user: AuthedUser) => {
    try {
      const goals = await goalPlanner.getUserGoals(user.id);
      return NextResponse.json({ goals, count: goals.length });
    } catch (_error) {
      // FinancialCoachGoalsRoute error: Failed to fetch goals
      void _error;
      return NextResponse.json(
        { error: "Failed to fetch goals" },
        { status: 500 },
      );
    }
  },
);

export const POST = withAuth(async (request: NextRequest, user: AuthedUser) => {
  try {
    const body = await request.json();
    const {
      type,
      name,
      description,
      targetAmount,
      targetDate,
      monthlyContribution,
      linkedAccountId,
      autoSaveEnabled,
      priority,
    } = body;

    // Validate required fields
    if (!type || !name || !targetAmount || !targetDate) {
      return NextResponse.json(
        {
          error:
            "Missing required fields: type, name, targetAmount, targetDate",
        },
        { status: 400 },
      );
    }

    const goal = await goalPlanner.createGoalPlan({
      userId: user.id,
      type,
      name,
      description,
      targetAmount: parseFloat(targetAmount),
      targetDate: new Date(targetDate),
      monthlyContribution: monthlyContribution
        ? parseFloat(monthlyContribution)
        : undefined,
      linkedAccountId,
      autoSaveEnabled,
      priority,
    });

    return NextResponse.json(goal, { status: 201 });
  } catch (_error) {
    // FinancialCoachGoalsRoute error: Failed to create goal
    void _error;
    return NextResponse.json(
      { error: "Failed to create goal" },
      { status: 500 },
    );
  }
});
