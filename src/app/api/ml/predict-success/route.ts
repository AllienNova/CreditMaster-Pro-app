/**
 * ML Success Prediction API
 *
 * Predicts dispute success probability using ML models
 */

import { NextRequest, NextResponse } from "next/server";
import { withPermission, type AuthedUser } from "@/lib/auth/api-guard";
import { mlPredictionModels } from "@/lib/ml-prediction-models";
import { logAIInteraction } from "@/lib/security/audit-logging";

export const POST = withPermission(
  "ml:predict",
  async (request: NextRequest, user: AuthedUser) => {
  try {
    // Parse request body
    const body = await request.json();
    const { loan, error_type, servicer_profile, evidence } = body;

    // Validate required fields
    if (!loan || !error_type) {
      return NextResponse.json(
        { error: "Missing required fields: loan, error_type" },
        { status: 400 },
      );
    }

    // Track timing
    const startTime = Date.now();

    // Predict success
    const prediction = await mlPredictionModels.predictDisputeSuccess(
      loan,
      error_type,
      servicer_profile,
      evidence,
    );

    const duration = Date.now() - startTime;

    // Audit log
    logAIInteraction({
      userId: user.id,
      model: "ml-prediction-models",
      prompt: JSON.stringify({ loan, error_type, servicer_profile, evidence }),
      response: JSON.stringify(prediction),
      tokens: 0,
      cost: 0,
      duration,
      inputValid: true,
      outputValid: true,
    });

    return NextResponse.json({
      success: true,
      prediction,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Success prediction error:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to predict success",
      },
      { status: 500 },
    );
  }
},
);

export const GET = withPermission("ml:predict", async () => {
  return NextResponse.json({
    message: "ML Success Prediction API",
    method: "POST",
    endpoint: "/api/ml/predict-success",
    requiredFields: ["loan", "error_type"],
    optionalFields: ["servicer_profile", "evidence"],
    description: "Predicts dispute success probability using ML models",
  });
});
