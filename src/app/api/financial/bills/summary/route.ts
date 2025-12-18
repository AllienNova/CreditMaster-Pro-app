import { NextRequest, NextResponse } from 'next/server';
import { jwtValidation } from '@/lib/auth/jwt-validation';
import { rbac } from '@/lib/auth/rbac';
import { billDetectionService } from '@/lib/financial/bill-detection-service';

/**
 * GET /api/financial/bills/summary
 * Get bill summary for the authenticated user
 */
export async function GET(request: NextRequest) {
  try {
    // Validate JWT and get user
    const validation = await jwtValidation.validateFromHeaders(request);
    if (!validation.valid || !validation.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permissions
    if (!rbac.hasPermission(validation.user, 'financial:read')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const userId = validation.user.id;

    // Get bill summary
    const summary = await billDetectionService.getBillSummary(userId);

    return NextResponse.json({ summary });
  } catch (error) {
    console.error('Error fetching bill summary:', error);
    return NextResponse.json(
      { error: 'Failed to fetch bill summary' },
      { status: 500 }
    );
  }
}
