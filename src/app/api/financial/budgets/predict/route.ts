/**
 * Budget Prediction API
 *
 * GET /api/financial/budgets/predict - Predict month-end spending
 *
 * @see Phase 2.1.4: Budget API Endpoints
 */

import { NextRequest, NextResponse } from "next/server";
import { getSmartBudgetEngine } from "@/lib/financial/smart-budget-engine";
import { withPermission } from "@/lib/auth/api-guard";
import type { AuthedUser } from "@/lib/auth/api-guard";
import {
  applyFinancialAPIMiddleware,
  finalizeResponse,
} from "@/lib/api/financial-api-middleware";

/**
 * GET /api/financial/budgets/predict
 * Predict month-end spending based on current trajectory
 *
 * @openapi
 * /api/financial/budgets/predict:
 *   get:
 *     summary: Predict month-end spending
 *     description: Forecast spending for the rest of the month based on current patterns
 *     tags: [Budgets]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Prediction retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/MonthEndPrediction'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       500:
 *         description: Server error
 */
export const GET = withPermission(
  "financial:read",
  async (request: NextRequest, _user: AuthedUser) => {
  const startTime = Date.now();

  try {
    // Apply middleware
    const middleware = await applyFinancialAPIMiddleware(request, {
      requireAuth: true,
      rateLimit: true,
      cors: true,
      logging: true,
    });

    if (middleware.error) {
      return middleware.error;
    }

    const userId = middleware.userId!;



    // Predict month-end spending
    const smartBudgetEngine = getSmartBudgetEngine();
    const prediction = await smartBudgetEngine.predictMonthEnd(userId);

    const response = NextResponse.json({
      success: true,
      data: prediction,
      _meta: {
        predictedAt: new Date().toISOString(),
        daysRemaining: prediction.daysRemaining,
        confidence: prediction.predictions.confidence,
      },
    });

    return finalizeResponse(request, response, startTime, userId);
  } catch (error) {
    console.error("Error predicting month-end spending:", error);

    const response = NextResponse.json(
      {
        success: false,
        error: "Failed to predict month-end spending",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );

    return finalizeResponse(request, response, startTime, "anonymous");
  }
},
);
