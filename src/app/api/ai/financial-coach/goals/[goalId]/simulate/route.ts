/**
 * AI Financial Coach - Goal Simulation API
 * 
 * POST /api/ai/financial-coach/goals/[goalId]/simulate - Simulate goal scenarios
 */

import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { goalPlanner } from '@/lib/financial/goal-planner';

export async function POST(
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
    const { scenarios } = body;

    if (!scenarios || !Array.isArray(scenarios)) {
      return NextResponse.json(
        { error: 'Missing required field: scenarios (array)' },
        { status: 400 }
      );
    }

    const simulation = await goalPlanner.simulateGoal({
      goalId: params.goalId,
      scenarios: scenarios.map((s: { monthlyContribution: number; targetDate?: string }) => ({
        monthlyContribution: parseFloat(String(s.monthlyContribution)),
        targetDate: s.targetDate ? new Date(s.targetDate) : undefined,
      })),
    });

    return NextResponse.json(simulation);
  } catch (error) {
    console.error('Error simulating goal:', error);
    return NextResponse.json(
      { error: 'Failed to simulate goal' },
      { status: 500 }
    );
  }
}

