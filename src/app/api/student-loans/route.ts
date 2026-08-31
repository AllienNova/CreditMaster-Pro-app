import { FederalIntegrationService } from "@/lib/federal-integration-service";
import { NextRequest, NextResponse } from "next/server";
import { jwtValidation } from '@/lib/auth/jwt-validation';
import { rbac } from '@/lib/auth/rbac';

const federalIntegrationService = new FederalIntegrationService();

export async function GET(req: NextRequest) {
  try {
    // Validate JWT token
    const validation = await jwtValidation.validateFromHeaders(req.headers);

    if (!validation.valid || !validation.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permissions
    if (!rbac.hasPermission(validation.user, 'student_loans:read')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Extract userId from validated token (not from query params)
    const userId = validation.user.id;

    const result = await federalIntegrationService.retrieveNSLDSData(userId);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Student loans error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

