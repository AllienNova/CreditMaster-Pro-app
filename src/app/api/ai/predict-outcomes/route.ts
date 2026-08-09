/**
 * AI Outcome Prediction API
 *
 * Predicts outcomes for student loan strategies using ML models
 */

import { NextRequest, NextResponse } from "next/server";
import { withPermission, type AuthedUser } from "@/lib/auth/api-guard";
import { studentLoanAIEngine } from "@/lib/student-loan-ai-engine";
import { logAIInteraction } from "@/lib/security/audit-logging";

export const POST = withPermission(
  "ai:predict_outcomes",
  async (request: NextRequest, user: AuthedUser) => {
    try {
      // Parse request body
      const body = await request.json();
      const { strategy, loans, portfolio_analysis } = body;

      // Validate required fields
      if (!strategy || !loans) {
        return NextResponse.json(
          { error: "Missing required fields: strategy, loans" },
          { status: 400 },
        );
      }

      // Track timing
      const startTime = Date.now();

      // Predict outcomes
      const predictions = await studentLoanAIEngine.predictOutcomes(
        [strategy],
        loans,
      );

      const duration = Date.now() - startTime;

      // Audit log
      logAIInteraction({
        userId: user.id,
        model: "student-loan-ai-engine",
        prompt: JSON.stringify({ strategy, loans, portfolio_analysis }),
        response: JSON.stringify(predictions),
        tokens: 0,
        cost: 0,
        duration,
        inputValid: true,
        outputValid: true,
      });

      return NextResponse.json({
        success: true,
        predictions,
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
              : "Failed to predict outcomes",
        },
        { status: 500 },
      );
    }
  },
);

export const GET = withPermission("ai:predict_outcomes", async () => {
  return NextResponse.json({
    message: "AI Outcome Prediction API",
    method: "POST",
    endpoint: "/api/ai/predict-outcomes",
    requiredFields: ["strategy", "loans"],
    optionalFields: ["portfolio_analysis"],
    description:
      "Predicts outcomes for student loan strategies using ML models",
  });
});
