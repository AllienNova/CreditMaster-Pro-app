import { FederalIntegrationService } from "@/lib/federal-integration-service";
import { NextRequest, NextResponse } from "next/server";
import { FederalProgramApplication } from "@/types/student-loan";

const federalIntegrationService = new FederalIntegrationService();

export async function POST(req: NextRequest) {
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
}

export async function GET(req: NextRequest) {
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
}

