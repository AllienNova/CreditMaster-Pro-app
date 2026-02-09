/**
 * Dispute Statistics API
 * GET /api/disputes/stats - Get user's dispute statistics
 */

import { NextRequest, NextResponse } from 'next/server';
import { jwtValidation } from '@/lib/auth/jwt-validation';
import { disputeService } from '@/lib/disputes/dispute-service';

export async function GET(request: NextRequest) {
  try {
    const validation = await jwtValidation.validateFromHeaders(request);
    if (!validation.valid || !validation.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = validation.user.id;
    const stats = disputeService.getUserDisputeStats(userId);

    return NextResponse.json({
      success: true,
      data: {
        total: stats.total,
        active: stats.active,
        resolved: stats.resolved,
        successRate: stats.successRate,
        avgResolutionDays: stats.averageResolutionDays,
      },
    });
  } catch (error) {
    console.error('Get dispute stats error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get dispute statistics' },
      { status: 500 }
    );
  }
}
