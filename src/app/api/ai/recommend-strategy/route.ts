/**
 * AI Strategy Recommendation API
 *
 * Uses Student Loan AI Engine to recommend optimal strategies
 */

import { NextRequest, NextResponse } from "next/server";
import { withPermission, type AuthedUser } from "@/lib/auth/api-guard";
import { studentLoanAIEngine } from "@/lib/student-loan-ai-engine";
import { logAIInteraction } from "@/lib/security/audit-logging";
import { validateInput } from "@/lib/security/input-validation";

export const POST = withPermission(
  "ai:strategy_recommendation",
  async (request: NextRequest, user: AuthedUser) => {
    try {
      // Parse request body
      const body = await request.json();
      const { loans, portfolio_analysis, servicer_profiles } = body;

      // Validate required fields
      if (!loans || !Array.isArray(loans)) {
        return NextResponse.json(
          { error: "Missing required field: loans (array)" },
          { status: 400 },
        );
      }

      // Validate input
      const inputValidation = validateInput(JSON.stringify(body), {
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

      // Get AI recommendation
      const recommendation = await studentLoanAIEngine.recommendStrategy(
        loans,
        portfolio_analysis,
        servicer_profiles,
      );

      const duration = Date.now() - startTime;

      // Audit log
      logAIInteraction({
        userId: user.id,
        model: "student-loan-ai-engine",
        prompt: JSON.stringify({
          loans,
          portfolio_analysis,
          servicer_profiles,
        }),
        response: JSON.stringify(recommendation),
        tokens: 0,
        cost: 0,
        duration,
        inputValid: inputValidation.isValid,
        outputValid: true,
      });

      return NextResponse.json({
        success: true,
        recommendation,
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
              : "Failed to generate recommendation",
        },
        { status: 500 },
      );
    }
  },
);

export const GET = withPermission("ai:strategy_recommendation", async () => {
  return NextResponse.json({
    message: "AI Strategy Recommendation API",
    method: "POST",
    endpoint: "/api/ai/recommend-strategy",
    requiredFields: ["loans"],
    optionalFields: ["portfolio_analysis", "servicer_profiles"],
    description: "Uses AI to recommend optimal student loan strategies",
  });
});
