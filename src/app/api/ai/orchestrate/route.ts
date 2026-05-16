/**
 * AI Strategy Orchestration API
 *
 * Orchestrates multiple strategies in parallel for optimal results
 */

import { NextRequest, NextResponse } from "next/server";
import { withPermission, type AuthedUser } from "@/lib/auth/api-guard";
import { studentLoanAIEngine } from "@/lib/student-loan-ai-engine";
import { logAIInteraction } from "@/lib/security/audit-logging";

export const POST = withPermission(
  "ai:orchestrate_strategies",
  async (request: NextRequest, user: AuthedUser) => {
    try {
      // Parse request body
      const body = await request.json();
      const { strategies, loans, portfolio_analysis } = body;

      // Validate required fields
      if (!strategies || !Array.isArray(strategies) || strategies.length === 0) {
        return NextResponse.json(
          { error: "Missing required field: strategies (non-empty array)" },
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

      // Orchestrate strategies
      const orchestration = await studentLoanAIEngine.orchestrateStrategies(
        strategies,
        loans,
      );

      const duration = Date.now() - startTime;

      // Audit log
      logAIInteraction({
        userId: user.id,
        model: "student-loan-ai-engine",
        prompt: JSON.stringify({ strategies, loans, portfolio_analysis }),
        response: JSON.stringify(orchestration),
        tokens: 0,
        cost: 0,
        duration,
        inputValid: true,
        outputValid: true,
      });

      return NextResponse.json({
        success: true,
        orchestration,
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
              : "Failed to orchestrate strategies",
        },
        { status: 500 },
      );
    }
  },
);

export const GET = withPermission("ai:orchestrate_strategies", async () => {
  return NextResponse.json({
    message: "AI Strategy Orchestration API",
    method: "POST",
    endpoint: "/api/ai/orchestrate",
    requiredFields: ["strategies", "loans"],
    optionalFields: ["portfolio_analysis"],
    description:
      "Orchestrates multiple strategies in parallel for optimal results",
  });
});
