/**
 * Savings Recommendations API Endpoint
 *
 * GET /api/financial/savings/recommendations
 * Get personalized savings tips and strategies
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

// ============================================================================
// GET - Get Savings Recommendations
// ============================================================================

/**
 * @swagger
 * /api/financial/savings/recommendations:
 *   get:
 *     summary: Get personalized savings recommendations
 *     description: AI-powered savings tips and strategies based on spending patterns
 *     tags: [Savings]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Savings recommendations retrieved successfully
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
 *                     potentialSavings:
 *                       type: object
 *                       description: Summary of potential savings
 *                     topOpportunities:
 *                       type: array
 *                       description: Top 5 savings opportunities
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

    if (!rbac.hasPermission(validation.user, 'financial:read')) {
      return NextResponse.json(
        { success: false, error: 'Forbidden - Insufficient permissions' },
        { status: 403 }
      );
    }

    // Calculate potential savings
    const savingsOptimizer = getSavingsOptimizer();
    const potentialSavings = await savingsOptimizer.calculatePotentialSavings(userId);

    const response = NextResponse.json(
      {
        success: true,
        data: {
          potentialSavings,
          topOpportunities: potentialSavings.topOpportunities,
          breakdown: potentialSavings.breakdown,
          implementation: {
            difficulty: potentialSavings.implementationDifficulty,
            estimatedTime: potentialSavings.estimatedTimeToImplement,
          },
        },
        _meta: {
          generatedAt: new Date().toISOString(),
          totalMonthlySavings: potentialSavings.totalMonthlySavings,
          totalAnnualSavings: potentialSavings.totalAnnualSavings,
        },
      },
      { status: 200 }
    );

    return finalizeResponse(request, response, startTime, userId);
  } catch (error) {
    console.error('Savings recommendations error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to generate savings recommendations',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

