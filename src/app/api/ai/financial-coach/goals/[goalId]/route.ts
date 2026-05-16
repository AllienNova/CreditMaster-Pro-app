/**
 * AI Financial Coach - Individual Goal API
 *
 * GET /api/ai/financial-coach/goals/[goalId] - Get goal details
 * PATCH /api/ai/financial-coach/goals/[goalId] - Update goal progress
 */

import { NextRequest, NextResponse } from "next/server";
import { withAuth, type AuthedUser } from "@/lib/auth/api-guard";
import { goalPlanner } from "@/lib/financial/goal-planner";

// The guard does not forward Next's route `params`; extract the id from the path.
function goalIdFrom(request: NextRequest): string {
  return request.nextUrl.pathname.split("/").pop() as string;
}

export const GET = withAuth(async (request: NextRequest, user: AuthedUser) => {
  try {
    const goalId = goalIdFrom(request);

    const goals = await goalPlanner.getUserGoals(user.id);
    const goal = goals.find((g) => g.id === goalId);

    if (!goal) {
      return NextResponse.json({ error: "Goal not found" }, { status: 404 });
    }

    // Get adjustment suggestions
    const adjustments = await goalPlanner.getAdjustmentSuggestions(
      user.id,
      goalId,
    );

    return NextResponse.json({ goal, adjustments });
  } catch (_error) {
    // GoalDetailRoute error: Failed to fetch goal
    void _error;
    return NextResponse.json(
      { error: "Failed to fetch goal" },
      { status: 500 },
    );
  }
});

export const PATCH = withAuth(
  async (request: NextRequest, user: AuthedUser) => {
    try {
      const goalId = goalIdFrom(request);

      const body = await request.json();
      const { currentAmount } = body;

      if (currentAmount === undefined) {
        return NextResponse.json(
          { error: "Missing required field: currentAmount" },
          { status: 400 },
        );
      }

      const updatedGoal = await goalPlanner.updateGoalProgress(
        user.id,
        goalId,
        parseFloat(currentAmount),
      );

      if (!updatedGoal) {
        return NextResponse.json({ error: "Goal not found" }, { status: 404 });
      }

      return NextResponse.json(updatedGoal);
    } catch (_error) {
      // GoalDetailRoute error: Failed to update goal
      void _error;
      return NextResponse.json(
        { error: "Failed to update goal" },
        { status: 500 },
      );
    }
  },
);
