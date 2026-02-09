/**
 * AI Financial Coach - Budget Optimization API
 *
 * GET /api/ai/financial-coach/budget - Get budget optimization analysis
 * POST /api/ai/financial-coach/budget/optimize - Generate optimization recommendations
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { budgetOptimizer } from '@/lib/financial/budget-optimizer';

async function getUser() {
  const supabase = await createClient();
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
  } catch (_error) {
    // FinancialCoachBudgetRoute error: Failed to fetch optimization
    void _error;
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
  } catch (_error) {
    // FinancialCoachBudgetRoute error: Optimization failed
    void _error;
    return NextResponse.json(
      { error: 'Failed to optimize budget' },
      { status: 500 }
    );
  }
}
