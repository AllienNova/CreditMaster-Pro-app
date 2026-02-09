/**
 * AI Financial Coach - Goal Simulation API
 *
 * POST /api/ai/financial-coach/goals/[goalId]/simulate - Simulate goal scenarios
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { goalPlanner } from '@/lib/financial/goal-planner';

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

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { goalId } = await params;
    const user = await getUser();

    if (!user) {
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
      goalId,
      scenarios: scenarios.map(
        (s: { monthlyContribution: number; targetDate?: string }) => ({
          monthlyContribution: parseFloat(String(s.monthlyContribution)),
          targetDate: s.targetDate ? new Date(s.targetDate) : undefined,
        })
      ),
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
