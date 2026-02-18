/**
 * Federal Program Eligibility Check API
 *
 * Checks eligibility for federal student loan programs
 */

import { NextRequest, NextResponse } from "next/server";
import { jwtValidation } from "@/lib/auth/jwt-validation";
import { rbac } from "@/lib/auth/rbac";
import { federalIntegrationService } from "@/lib/federal-integration-service";
import { logAIInteraction } from "@/lib/security/audit-logging";

export async function POST(request: NextRequest) {
  try {
    // Validate JWT token
    const validation = await jwtValidation.validateFromHeaders(request);

    if (!validation.valid || !validation.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check permissions
    if (
      !rbac.hasPermission(validation.user, "federal_programs:check_eligibility")
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const user = validation.user;

    // Parse request body
    const body = await request.json();
    const { program_type, ssn } = body;

    // Validate required fields
    if (!program_type || !ssn) {
      return NextResponse.json(
        { error: "Missing required fields: program_type, ssn" },
        { status: 400 },
      );
    }

    // Track timing
    const startTime = Date.now();

    // Check eligibility based on program type
    let eligibility;
    switch (program_type) {
      case "fresh_start":
        eligibility =
          await federalIntegrationService.checkFreshStartEligibility(ssn);
        break;
      case "rehabilitation":
        eligibility =
          await federalIntegrationService.checkRehabilitationEligibility(ssn);
        break;
      case "discharge":
        eligibility =
          await federalIntegrationService.checkDischargeEligibility(ssn);
        break;
      default:
        return NextResponse.json(
          {
            error:
              "Invalid program_type. Must be: fresh_start, rehabilitation, or discharge",
          },
          { status: 400 },
        );
    }

    const duration = Date.now() - startTime;

    // Audit log
    logAIInteraction({
      userId: user.id,
      model: "federal-integration-service",
      prompt: JSON.stringify({ program_type, ssn: "[REDACTED]" }),
      response: JSON.stringify(eligibility),
      tokens: 0,
      cost: 0,
      duration,
      inputValid: true,
      outputValid: true,
    });

    return NextResponse.json({
      success: true,
      program_type,
      eligibility,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Eligibility check error:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to check eligibility",
      },
      { status: 500 },
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: "Federal Program Eligibility Check API",
    method: "POST",
    endpoint: "/api/federal/check-eligibility",
    requiredFields: ["program_type", "ssn"],
    programTypes: ["fresh_start", "rehabilitation", "discharge"],
    description: "Checks eligibility for federal student loan programs",
  });
}
