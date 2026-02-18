/**
 * AI Financial Coach - Individual Goal API
 *
 * GET /api/ai/financial-coach/goals/[goalId] - Get goal details
 * PATCH /api/ai/financial-coach/goals/[goalId] - Update goal progress
 * POST /api/ai/financial-coach/goals/[goalId]/simulate - Simulate goal scenarios
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { goalPlanner } from "@/lib/financial/goal-planner";

interface RouteParams {
  params: Promise<{ goalId: string }>;
}

async function getUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { goalId } = await params;
    const user = await getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { goalId } = await params;
    const user = await getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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
}
