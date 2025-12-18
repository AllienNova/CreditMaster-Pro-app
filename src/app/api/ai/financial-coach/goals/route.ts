/**
 * AI Financial Coach - Goals API
 * 
 * GET /api/ai/financial-coach/goals - Get user's financial goals
 * POST /api/ai/financial-coach/goals - Create a new goal
 */

import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { goalPlanner } from '@/lib/financial/goal-planner';

export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const goals = await goalPlanner.getUserGoals(user.id);
    return NextResponse.json({ goals, count: goals.length });
  } catch (error) {
    console.error('Error fetching goals:', error);
    return NextResponse.json(
      { error: 'Failed to fetch goals' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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
        { error: 'Missing required fields: type, name, targetAmount, targetDate' },
        { status: 400 }
      );
    }

    const goal = await goalPlanner.createGoalPlan({
      userId: user.id,
      type,
      name,
      description,
      targetAmount: parseFloat(targetAmount),
      targetDate: new Date(targetDate),
      monthlyContribution: monthlyContribution ? parseFloat(monthlyContribution) : undefined,
      linkedAccountId,
      autoSaveEnabled,
      priority,
    });

    return NextResponse.json(goal, { status: 201 });
  } catch (error) {
    console.error('Error creating goal:', error);
    return NextResponse.json(
      { error: 'Failed to create goal' },
      { status: 500 }
    );
  }
}

