/**
 * Subscription Audit API Endpoint
 *
 * GET /api/financial/savings/subscriptions
 * Audit subscriptions and get cancellation suggestions
 *
 * Phase 2.2: Savings Optimizer
 */

import { NextRequest, NextResponse } from "next/server";
import { getSavingsOptimizer } from "@/lib/financial/savings-optimizer";
import { withPermission } from "@/lib/auth/api-guard";
import type { AuthedUser } from "@/lib/auth/api-guard";
import {
  applyFinancialAPIMiddleware,
  finalizeResponse,
} from "@/lib/api/financial-api-middleware";
import { z } from "zod";

// ============================================================================
// VALIDATION SCHEMA
// ============================================================================

const SubscriptionsQuerySchema = z.object({
  minAmount: z.coerce.number().min(0).optional().default(0),
});

// ============================================================================
// GET - Audit Subscriptions
// ============================================================================

/**
 * @swagger
 * /api/financial/savings/subscriptions:
 *   get:
 *     summary: Audit subscriptions and recurring charges
 *     description: Detect recurring charges, identify subscriptions, and provide cancellation/optimization recommendations
 *     tags: [Savings]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: minAmount
 *         schema:
 *           type: number
 *           minimum: 0
 *           default: 0
 *         description: Minimum charge amount to include
 *     responses:
 *       200:
 *         description: Subscription audit completed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     recurringCharges:
 *                       type: array
 *                       description: All detected recurring charges
 *                     subscriptions:
 *                       type: array
 *                       description: Identified subscriptions
 *                     recommendations:
 *                       type: array
 *                       description: Cancellation/optimization recommendations
 *       401:
 *         description: Unauthorized - Invalid or missing JWT token
 *       403:
 *         description: Forbidden - Insufficient permissions
 *       500:
 *         description: Internal server error
 */
export const GET = withPermission(
  "financial:read",
  async (request: NextRequest, _user: AuthedUser) => {
  const startTime = Date.now();

  // Apply middleware (auth, rate limiting, CORS, logging)
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

  try {


    // Parse and validate query parameters
    const { searchParams } = new URL(request.url);
    const queryParams = {
      minAmount: searchParams.get("minAmount") || "0",
    };

    const validationResult = SubscriptionsQuerySchema.safeParse(queryParams);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid query parameters",
          details: validationResult.error.issues,
        },
        { status: 400 },
      );
    }

    const { minAmount } = validationResult.data;

    // Find recurring charges and subscriptions
    const savingsOptimizer = getSavingsOptimizer();
    const recurringCharges = await savingsOptimizer.findRecurringCharges(
      userId,
      minAmount,
    );
    const subscriptions = recurringCharges.filter(
      (charge) => charge.isSubscription,
    );
    const recommendations =
      await savingsOptimizer.suggestCancelableSubscriptions(userId);

    // Calculate total subscription spending
    const totalMonthlySubscriptionSpending = subscriptions.reduce(
      (sum, sub) => {
        let monthlyAmount = sub.amount;
        if (sub.frequency === "weekly") monthlyAmount *= 4.33;
        else if (sub.frequency === "biweekly") monthlyAmount *= 2.17;
        else if (sub.frequency === "quarterly") monthlyAmount /= 3;
        else if (sub.frequency === "annually") monthlyAmount /= 12;
        return sum + monthlyAmount;
      },
      0,
    );

    const totalPotentialSavings = recommendations.reduce(
      (sum, rec) => sum + rec.potentialMonthlySavings,
      0,
    );

    const response = NextResponse.json(
      {
        success: true,
        data: {
          recurringCharges,
          subscriptions,
          recommendations,
          summary: {
            totalRecurringCharges: recurringCharges.length,
            totalSubscriptions: subscriptions.length,
            totalMonthlySubscriptionSpending,
            totalAnnualSubscriptionSpending:
              totalMonthlySubscriptionSpending * 12,
            potentialMonthlySavings: totalPotentialSavings,
            potentialAnnualSavings: totalPotentialSavings * 12,
            recommendationsCount: recommendations.length,
          },
        },
        _meta: {
          generatedAt: new Date().toISOString(),
          minAmount,
        },
      },
      { status: 200 },
    );

    return finalizeResponse(request, response, startTime, userId);
  } catch (error) {
    console.error("Subscription audit error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to audit subscriptions",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
},
);
