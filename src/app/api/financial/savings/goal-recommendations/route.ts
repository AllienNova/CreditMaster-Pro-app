/**
 * Savings Goal Recommendations API Endpoint
 *
 * GET /api/financial/savings/goal-recommendations
 * Get AI-powered savings goal recommendations
 *
 * Phase 2.2: Savings Optimizer
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSavingsOptimizer } from '@/lib/financial/savings-optimizer';
import { jwtValidation } from '@/lib/auth/jwt-validation';
import { rbac } from '@/lib/auth/rbac';
import {
  applyFinancialAPIMiddleware,
  finalizeResponse,
} from '@/lib/api/financial-api-middleware';
import { z } from 'zod';

// ============================================================================
// VALIDATION SCHEMA
// ============================================================================

const GoalRecommendationsQuerySchema = z.object({
  targetAmount: z.coerce.number().min(0).optional(),
});

// ============================================================================
// GET - Get Savings Goal Recommendations
// ============================================================================

/**
 * @swagger
 * /api/financial/savings/goal-recommendations:
 *   get:
 *     summary: Get AI-powered savings goal recommendations
 *     description: Generate personalized savings goal recommendations based on income, spending patterns, and financial profile
 *     tags: [Savings]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: targetAmount
 *         schema:
 *           type: number
 *           minimum: 0
 *         description: Optional target savings amount
 *     responses:
 *       200:
 *         description: Savings goal recommendations generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   description: Array of personalized savings goal recommendations
 *       401:
 *         description: Unauthorized - Invalid or missing JWT token
 *       403:
 *         description: Forbidden - Insufficient permissions
 *       500:
 *         description: Internal server error
 */
export async function GET(request: NextRequest) {
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
    // Validate JWT and permissions
    const validation = await jwtValidation.validateFromHeaders(request);
    if (!validation.valid || !validation.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (!rbac.hasPermission(validation.user, 'financial:view_savings')) {
      return NextResponse.json(
        { success: false, error: 'Forbidden - Insufficient permissions' },
        { status: 403 }
      );
    }

    // Parse and validate query parameters
    const { searchParams } = new URL(request.url);
    const queryParams = {
      targetAmount: searchParams.get('targetAmount'),
    };

    const validationResult = GoalRecommendationsQuerySchema.safeParse(queryParams);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid query parameters',
          details: validationResult.error.errors,
        },
        { status: 400 }
      );
    }

    const { targetAmount } = validationResult.data;

    // Generate savings goal recommendations
    const savingsOptimizer = getSavingsOptimizer();
    const recommendations = await savingsOptimizer.generateSavingsGoalRecommendations(
      userId,
      targetAmount
    );

    const response = NextResponse.json(
      {
        success: true,
        data: recommendations,
        _meta: {
          generatedAt: new Date().toISOString(),
          recommendationsCount: recommendations.length,
          targetAmount: targetAmount || null,
          aiGenerated: recommendations.some((rec) => rec.aiGenerated),
        },
      },
      { status: 200 }
    );

    return finalizeResponse(request, response, startTime, userId);
  } catch (error) {
    console.error('Savings goal recommendations error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to generate savings goal recommendations',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

