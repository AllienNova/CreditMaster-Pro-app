import { NextRequest, NextResponse } from 'next/server';
import { creditMonitoringService } from '@/lib/credit-monitoring/credit-monitoring-service';
import { jwtValidation } from '@/lib/auth/jwt-validation';
import { rbac } from '@/lib/auth/rbac';

/**
 * GET /api/credit-monitoring/alerts
 * Get credit monitoring alerts
 */
export async function GET(request: NextRequest) {
  try {
    // Validate JWT token
    const validation = await jwtValidation.validateFromHeaders(request);

    if (!validation.valid || !validation.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permissions (premium feature)
    if (!rbac.hasPermission(validation.user, 'credit:alerts')) {
      return NextResponse.json({ error: 'Forbidden - Premium feature' }, { status: 403 });
    }

    // Extract userId from validated token
    const userId = validation.user.id;

    const { searchParams } = new URL(request.url);
    const unreadOnly = searchParams.get('unreadOnly') === 'true';
    const limit = Number.parseInt(searchParams.get('limit') || '50');
    const severity = searchParams.get('severity') as 'low' | 'medium' | 'high' | 'critical' | null;

    const alerts = await creditMonitoringService.getAlerts(userId, {
      unreadOnly,
      limit,
      severity: severity || undefined,
    });

    return NextResponse.json({
      success: true,
      data: alerts,
    });
  } catch (error) {
    console.error('Error fetching alerts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch alerts' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/credit-monitoring/alerts
 * Mark alert(s) as read
 */
export async function PATCH(request: NextRequest) {
  try {
    // Validate JWT token
    const validation = await jwtValidation.validateFromHeaders(request);

    if (!validation.valid || !validation.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permissions (premium feature)
    if (!rbac.hasPermission(validation.user, 'credit:alerts')) {
      return NextResponse.json({ error: 'Forbidden - Premium feature' }, { status: 403 });
    }

    // Extract userId from validated token
    const userId = validation.user.id;

    const body = await request.json();
    const { alertId, markAllAsRead } = body;

    let success = false;

    if (markAllAsRead) {
      success = await creditMonitoringService.markAllAlertsAsRead(userId);
    } else if (alertId) {
      success = await creditMonitoringService.markAlertAsRead(alertId);
    } else {
      return NextResponse.json(
        { error: 'Either alertId or markAllAsRead must be provided' },
        { status: 400 }
      );
    }

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to mark alert(s) as read' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error('Error marking alerts as read:', error);
    return NextResponse.json(
      { error: 'Failed to mark alerts as read' },
      { status: 500 }
    );
  }
}

