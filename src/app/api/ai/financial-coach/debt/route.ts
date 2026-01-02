/**
 * AI Financial Coach - Debt Strategy API
 *
 * GET /api/ai/financial-coach/debt - Get debt strategy analysis
 * POST /api/ai/financial-coach/debt/analyze - Generate debt payoff strategies
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { debtStrategyEngine } from '@/lib/financial/debt-strategy-engine';

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
    const extraMonthlyPayment = searchParams.get('extraPayment')
      ? parseFloat(searchParams.get('extraPayment')!)
      : 0;
    const includeRefinancing =
      searchParams.get('includeRefinancing') !== 'false';
    const targetPayoffDate = searchParams.get('targetPayoffDate')
      ? new Date(searchParams.get('targetPayoffDate')!)
      : undefined;

    const result = await debtStrategyEngine.analyzeDebtStrategy({
      userId: user.id,
      extraMonthlyPayment,
      includeRefinancing,
      targetPayoffDate,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching debt strategy:', error);
    return NextResponse.json(
      { error: 'Failed to fetch debt strategy' },
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
      extraMonthlyPayment = 0,
      includeRefinancing = true,
      targetPayoffDate,
    } = body;

    const result = await debtStrategyEngine.analyzeDebtStrategy({
      userId: user.id,
      extraMonthlyPayment: parseFloat(String(extraMonthlyPayment)),
      includeRefinancing,
      targetPayoffDate: targetPayoffDate
        ? new Date(targetPayoffDate)
        : undefined,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error analyzing debt strategy:', error);
    return NextResponse.json(
      { error: 'Failed to analyze debt strategy' },
      { status: 500 }
    );
  }
}
