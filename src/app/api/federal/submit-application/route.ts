/**
 * Federal Program Application Submission API
 *
 * Submits applications for federal student loan programs
 */

import { NextRequest, NextResponse } from "next/server";
import { withPermission, type AuthedUser } from "@/lib/auth/api-guard";
import { federalIntegrationService } from "@/lib/federal-integration-service";
import { logAIInteraction } from "@/lib/security/audit-logging";
import { validateInput } from "@/lib/security/input-validation";

export const POST = withPermission(
  "federal_programs:submit_application",
  async (request: NextRequest, user: AuthedUser) => {
  try {
    // Parse request body
    const body = await request.json();
    const { program_type, application_data } = body;

    // Validate required fields
    if (!program_type || !application_data) {
      return NextResponse.json(
        { error: "Missing required fields: program_type, application_data" },
        { status: 400 },
      );
    }

    // Validate input
    const inputValidation = validateInput(JSON.stringify(application_data), {
      maxLength: 50000,
      checkPromptInjection: true,
      checkPII: false,
    });

    if (!inputValidation.isValid) {
      return NextResponse.json(
        { error: inputValidation.errors.join(", ") },
        { status: 400 },
      );
    }

    // Track timing
    const startTime = Date.now();

    // Submit application based on program type
    let result;
    switch (program_type) {
      case "fresh_start":
        result =
          await federalIntegrationService.submitFreshStartApplication(
            application_data,
          );
        break;
      case "rehabilitation":
        result =
          await federalIntegrationService.submitRehabilitationApplication(
            application_data,
          );
        break;
      case "consolidation":
        result =
          await federalIntegrationService.submitConsolidationApplication(
            application_data,
          );
        break;
      default:
        return NextResponse.json(
          {
            error:
              "Invalid program_type. Must be: fresh_start, rehabilitation, or consolidation",
          },
          { status: 400 },
        );
    }

    const duration = Date.now() - startTime;

    // Audit log
    logAIInteraction({
      userId: user.id,
      model: "federal-integration-service",
      prompt: JSON.stringify({ program_type, application_data: "[REDACTED]" }),
      response: JSON.stringify(result),
      tokens: 0,
      cost: 0,
      duration,
      inputValid: true,
      outputValid: true,
    });

    return NextResponse.json({
      success: true,
      program_type,
      result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Application submission error:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to submit application",
      },
      { status: 500 },
    );
  }
},
);

export const GET = withPermission(
  "federal_programs:submit_application",
  async () => {
  return NextResponse.json({
    message: "Federal Program Application Submission API",
    method: "POST",
    endpoint: "/api/federal/submit-application",
    requiredFields: ["program_type", "application_data"],
    programTypes: ["fresh_start", "rehabilitation", "consolidation"],
    description: "Submits applications for federal student loan programs",
  });
},
);
