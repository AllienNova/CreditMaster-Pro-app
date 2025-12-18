/**
 * AI Financial Coach - Individual Goal API
 * 
 * GET /api/ai/financial-coach/goals/[goalId] - Get goal details
 * PATCH /api/ai/financial-coach/goals/[goalId] - Update goal progress
 * POST /api/ai/financial-coach/goals/[goalId]/simulate - Simulate goal scenarios
 */

import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { goalPlanner } from '@/lib/financial/goal-planner';

export async function GET(
  request: NextRequest,
  { params }: { params: { goalId: string } }
) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const goals = await goalPlanner.getUserGoals(user.id);
    const goal = goals.find(g => g.id === params.goalId);

    if (!goal) {
      return NextResponse.json({ error: 'Goal not found' }, { status: 404 });
    }

    // Get adjustment suggestions
    const adjustments = await goalPlanner.getAdjustmentSuggestions(user.id, params.goalId);

    return NextResponse.json({ goal, adjustments });
  } catch (error) {
    console.error('Error fetching goal:', error);
    return NextResponse.json(
      { error: 'Failed to fetch goal' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { goalId: string } }
) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { currentAmount } = body;

    if (currentAmount === undefined) {
      return NextResponse.json(
        { error: 'Missing required field: currentAmount' },
        { status: 400 }
      );
    }

    const updatedGoal = await goalPlanner.updateGoalProgress(
      user.id,
      params.goalId,
      parseFloat(currentAmount)
    );

    if (!updatedGoal) {
      return NextResponse.json({ error: 'Goal not found' }, { status: 404 });
    }

    return NextResponse.json(updatedGoal);
  } catch (error) {
    console.error('Error updating goal:', error);
    return NextResponse.json(
      { error: 'Failed to update goal' },
      { status: 500 }
    );
  }
}

