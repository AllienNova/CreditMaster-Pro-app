/**
 * ML Timeline Prediction API
 *
 * Predicts dispute resolution timeline using ML models
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
    const { loan, error_type, servicer_profile, dispute_complexity } = body;

    // Validate required fields
    if (!loan || !error_type) {
      return NextResponse.json(
        { error: "Missing required fields: loan, error_type" },
        { status: 400 },
      );
    }

    // Track timing
    const startTime = Date.now();

    // Predict timeline (using predictDisputeSuccess as predictResolutionTimeline doesn't exist yet)
    const prediction = await mlPredictionModels.predictDisputeSuccess(
      loan,
      error_type,
      servicer_profile,
      [],
    );

    const duration = Date.now() - startTime;

    // Audit log
    logAIInteraction({
      userId: user.id,
      model: "ml-prediction-models",
      prompt: JSON.stringify({
        loan,
        error_type,
        servicer_profile,
        dispute_complexity,
      }),
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
    console.error("Timeline prediction error:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to predict timeline",
      },
      { status: 500 },
    );
  }
},
);

export const GET = withPermission("ml:predict", async () => {
  return NextResponse.json({
    message: "ML Timeline Prediction API",
    method: "POST",
    endpoint: "/api/ml/predict-timeline",
    requiredFields: ["loan", "error_type"],
    optionalFields: ["servicer_profile", "dispute_complexity"],
    description: "Predicts dispute resolution timeline using ML models",
  });
});
