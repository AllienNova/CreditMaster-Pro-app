/**
 * AI Automation Workflow API
 *
 * Creates automated workflows for student loan strategies
 */

import { NextRequest, NextResponse } from "next/server";
import { withPermission, type AuthedUser } from "@/lib/auth/api-guard";
import { studentLoanAIEngine } from "@/lib/student-loan-ai-engine";
import { logAIInteraction } from "@/lib/security/audit-logging";

export const POST = withPermission(
  "ai:create_workflow",
  async (request: NextRequest, user: AuthedUser) => {
    try {
      // Parse request body
      const body = await request.json();
      const { strategy, loans, automation_preferences } = body;

      // Validate required fields
      if (!strategy) {
        return NextResponse.json(
          { error: "Missing required field: strategy" },
          { status: 400 },
        );
      }

      if (!loans || !Array.isArray(loans)) {
        return NextResponse.json(
          { error: "Missing required field: loans (array)" },
          { status: 400 },
        );
      }

      // Track timing
      const startTime = Date.now();

      // Create automation workflow
      const workflow = await studentLoanAIEngine.createAutomationWorkflow(
        strategy,
        loans,
        automation_preferences,
      );

      const duration = Date.now() - startTime;

      // Audit log
      logAIInteraction({
        userId: user.id,
        model: "student-loan-ai-engine",
        prompt: JSON.stringify({ strategy, loans, automation_preferences }),
        response: JSON.stringify(workflow),
        tokens: 0,
        cost: 0,
        duration,
        inputValid: true,
        outputValid: true,
      });

      return NextResponse.json({
        success: true,
        workflow,
        timestamp: new Date().toISOString(),
      });
    } catch (_error) {
      // Error logged
      return NextResponse.json(
        {
          success: false,
          error:
            _error instanceof Error
              ? _error.message
              : "Failed to create workflow",
        },
        { status: 500 },
      );
    }
  },
);

export const GET = withPermission("ai:create_workflow", async () => {
  return NextResponse.json({
    message: "AI Automation Workflow API",
    method: "POST",
    endpoint: "/api/ai/create-workflow",
    requiredFields: ["strategy", "loans"],
    optionalFields: ["automation_preferences"],
    description: "Creates automated workflows for student loan strategies",
  });
});
