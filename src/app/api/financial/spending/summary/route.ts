/**
 * Spending Summary API Route
 *
 * GET /api/financial/spending/summary - Get quick spending summary
 */

import { NextRequest, NextResponse } from 'next/server';
import { spendingAnalysisService } from '@/lib/financial/spending-analysis-service';
import { jwtValidation } from '@/lib/auth/jwt-validation';
import { rbac } from '@/lib/auth/rbac';

/**
 * GET /api/financial/spending/summary
 * Get quick spending summary for the authenticated user
 */
export async function GET(request: NextRequest) {
  try {
    // Validate JWT token
    const validation = await jwtValidation.validateFromHeaders(request);

    if (!validation.valid || !validation.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permissions
    if (!rbac.hasPermission(validation.user, 'financial:read')) {
      return NextResponse.json(
        { error: 'Forbidden - Premium feature' },
        { status: 403 }
      );
    }

    const userId = validation.user.id;

    const summary = await spendingAnalysisService.getQuickSummary(userId);

    return NextResponse.json({
      success: true,
      data: summary,
    });
  } catch (error) {
    console.error('Error fetching spending summary:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch spending summary',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
