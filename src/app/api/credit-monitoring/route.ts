import { NextRequest, NextResponse } from 'next/server';
import { creditMonitoringService } from '@/lib/credit-monitoring/credit-monitoring-service';

/**
 * GET /api/credit-monitoring
 * Get monitoring dashboard data
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    const dashboard = await creditMonitoringService.getMonitoringDashboard(userId);

    return NextResponse.json({
      success: true,
      data: dashboard,
    });
  } catch (error) {
    console.error('Error fetching monitoring dashboard:', error);
    return NextResponse.json(
      { error: 'Failed to fetch monitoring dashboard' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/credit-monitoring
 * Add new credit score
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, bureau, score, factors } = body;

    if (!userId || !bureau || !score) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const creditScore = await creditMonitoringService.addCreditScore(
      userId,
      bureau,
      score,
      factors || []
    );

    if (!creditScore) {
      return NextResponse.json(
        { error: 'Failed to add credit score' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: creditScore,
    });
  } catch (error) {
    console.error('Error adding credit score:', error);
    return NextResponse.json(
      { error: 'Failed to add credit score' },
      { status: 500 }
    );
  }
}

