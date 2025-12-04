import { NextRequest, NextResponse } from 'next/server';
import { creditMonitoringService } from '@/lib/credit-monitoring/credit-monitoring-service';
import { jwtValidation } from '@/lib/auth/jwt-validation';
import { rbac } from '@/lib/auth/rbac';

/**
 * GET /api/credit-monitoring/settings
 * Get monitoring settings
 */
export async function GET(request: NextRequest) {
  try {
    // Validate JWT token
    const validation = await jwtValidation.validateFromHeaders(request.headers);

    if (!validation.valid || !validation.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permissions
    if (!rbac.hasPermission(validation.user, 'credit:read')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Extract userId from validated token
    const userId = validation.user.id;

    const settings = await creditMonitoringService.getMonitoringSettings(userId);

    return NextResponse.json({
      success: true,
      data: settings,
    });
  } catch (error) {
    console.error('Error fetching monitoring settings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch monitoring settings' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/credit-monitoring/settings
 * Update monitoring settings
 */
export async function PUT(request: NextRequest) {
  try {
    // Validate JWT token
    const validation = await jwtValidation.validateFromHeaders(request.headers);

    if (!validation.valid || !validation.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permissions
    if (!rbac.hasPermission(validation.user, 'credit:update_settings')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Extract userId from validated token
    const userId = validation.user.id;

    const body = await request.json();
    const { ...settings } = body;

    const success = await creditMonitoringService.updateMonitoringSettings(userId, settings);

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to update monitoring settings' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error('Error updating monitoring settings:', error);
    return NextResponse.json(
      { error: 'Failed to update monitoring settings' },
      { status: 500 }
    );
  }
}

