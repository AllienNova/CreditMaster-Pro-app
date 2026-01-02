/**
 * AI Financial Coach - Goal Simulation API
 *
 * POST /api/ai/financial-coach/goals/[goalId]/simulate - Simulate goal scenarios
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { goalPlanner } from '@/lib/financial/goal-planner';

interface RouteParams {
  params: Promise<{ goalId: string }>;
}

async function getUser() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } }
  );
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
