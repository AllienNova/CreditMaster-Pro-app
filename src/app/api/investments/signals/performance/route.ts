/**
 * Signal Performance API
 * 
 * Endpoint for getting trading signal performance metrics
 */

import { NextRequest, NextResponse } from 'next/server';
import { signalGenerator } from '@/lib/investments/signal-generator';
import { getUser } from '@/lib/auth/session';

/**
 * GET /api/investments/signals/performance
 * Get signal performance metrics for the authenticated user
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const period = (searchParams.get('period') || 'month') as 'week' | 'month' | 'quarter' | 'year' | 'all';

    const validPeriods = ['week', 'month', 'quarter', 'year', 'all'];
    if (!validPeriods.includes(period)) {
      return NextResponse.json(
        { error: `Invalid period. Must be one of: ${validPeriods.join(', ')}` },
        { status: 400 }
      );
    }

    const performance = await signalGenerator.getSignalPerformance(user.id, period);

    return NextResponse.json({
      success: true,
      data: performance,
    });
  } catch (error) {
    console.error('Error fetching signal performance:', error);
    return NextResponse.json(
      { error: 'Failed to fetch signal performance' },
      { status: 500 }
    );
  }
}

