/**
 * Federal Program Application Tracking API
 * 
 * Tracks status of federal student loan program applications
 */

import { NextRequest, NextResponse } from 'next/server';
import { jwtValidation } from '@/lib/auth/jwt-validation';
import { rbac } from '@/lib/auth/rbac';
import { federalIntegrationService } from '@/lib/federal-integration-service';
import { logAIInteraction } from '@/lib/security/audit-logging';

export async function GET(request: NextRequest) {
  try {
    // Validate JWT token
    const validation = await jwtValidation.validateFromHeaders(request);

    if (!validation.valid || !validation.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permissions
    if (!rbac.hasPermission(validation.user, 'federal_programs:track_application')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const user = validation.user;

    // Get application ID from query params
    const { searchParams } = new URL(request.url);
    const applicationId = searchParams.get('application_id');

    if (!applicationId) {
      return NextResponse.json(
        { error: 'Missing required parameter: application_id' },
        { status: 400 }
      );
    }

    // Track timing
    const startTime = Date.now();

    // Track application status
    const status = await federalIntegrationService.trackApplicationStatus(applicationId);

    const duration = Date.now() - startTime;

    // Audit log
    logAIInteraction({
      userId: user.id,
      model: 'federal-integration-service',
      prompt: JSON.stringify({ application_id: applicationId }),
      response: JSON.stringify(status),
      tokens: 0,
      cost: 0,
      duration,
      inputValid: true,
      outputValid: true,
    });

    return NextResponse.json({
      success: true,
      application_id: applicationId,
      status,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Application tracking error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Failed to track application' 
      },
      { status: 500 }
    );
  }
}

export async function POST() {
  return NextResponse.json({
    message: 'Federal Program Application Tracking API',
    method: 'GET',
    endpoint: '/api/federal/track-application?application_id=xxx',
    requiredParams: ['application_id'],
    description: 'Tracks status of federal student loan program applications',
  });
}

