import { FederalIntegrationService } from "@/lib/federal-integration-service";
import { NextRequest, NextResponse } from "next/server";
import { jwtValidation } from '@/lib/auth/jwt-validation';
import { rbac } from '@/lib/auth/rbac';

const federalIntegrationService = new FederalIntegrationService();

export async function POST(req: NextRequest) {
  try {
    // Validate JWT token
    const validation = await jwtValidation.validateFromHeaders(req.headers);

    if (!validation.valid || !validation.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permissions
    if (!rbac.hasPermission(validation.user, 'student_loans:federal_programs')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const { programType, applicationData } = body;

    let result;

    switch (programType) {
      case "fresh-start":
        result = await federalIntegrationService.submitFreshStartApplication(
          applicationData
        );
        break;
      case "rehabilitation":
        result = await federalIntegrationService.submitRehabilitationApplication(
          applicationData
        );
        break;
      case "consolidation":
        result = await federalIntegrationService.submitConsolidationApplication(
          applicationData
        );
        break;
      default:
        return NextResponse.json(
          { error: "Invalid program type" },
          { status: 400 }
        );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Federal programs POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    // Validate JWT token
    const validation = await jwtValidation.validateFromHeaders(req.headers);

    if (!validation.valid || !validation.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permissions
    if (!rbac.hasPermission(validation.user, 'student_loans:federal_programs')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url, 'http://localhost');
    const applicationId = searchParams.get("applicationId");

    if (!applicationId) {
      return NextResponse.json(
        { error: "Application ID is required" },
        { status: 400 }
      );
    }

    const result = await federalIntegrationService.trackApplicationStatus(
      applicationId
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error('Federal programs GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

