import { NextRequest, NextResponse } from 'next/server';
import { creditMonitoringService, Bureau } from '@/lib/credit-monitoring/credit-monitoring-service';

/**
 * GET /api/credit-monitoring/history
 * Get credit score history for a specific bureau
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const bureau = searchParams.get('bureau') as Bureau;
    const days = parseInt(searchParams.get('days') || '365');

    if (!userId || !bureau) {
      return NextResponse.json(
        { error: 'User ID and bureau are required' },
        { status: 400 }
      );
    }

    const history = await creditMonitoringService.getScoreHistory(userId, bureau, days);

    return NextResponse.json({
      success: true,
      data: history,
    });
  } catch (_error) {
    // Error silently caught
    return NextResponse.json(
      { error: 'Failed to fetch score history' },
      { status: 500 }
    );
  }
}

