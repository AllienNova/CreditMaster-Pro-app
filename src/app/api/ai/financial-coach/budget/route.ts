/**
 * AI Financial Coach - Budget Optimization API
 *
 * GET /api/ai/financial-coach/budget - Get budget optimization analysis
 * POST /api/ai/financial-coach/budget/optimize - Generate optimization recommendations
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { budgetOptimizer } from '@/lib/financial/budget-optimizer';

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

export async function GET(request: NextRequest) {
  try {
    const user = await getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const includeTemplates = searchParams.get('includeTemplates') !== 'false';
    const includeScenarios = searchParams.get('includeScenarios') !== 'false';
    const targetSavingsRate = searchParams.get('targetSavingsRate')
      ? parseFloat(searchParams.get('targetSavingsRate')!)
      : undefined;

    const result = await budgetOptimizer.optimizeBudget({
      userId: user.id,
      includeTemplates,
      includeScenarios,
      targetSavingsRate,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching budget optimization:', error);
    return NextResponse.json(
      { error: 'Failed to fetch budget optimization' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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
  } catch (error) {
    console.error('Error optimizing budget:', error);
    return NextResponse.json(
      { error: 'Failed to optimize budget' },
      { status: 500 }
    );
  }
}
