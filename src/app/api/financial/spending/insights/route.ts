/**
 * Spending Insights API Endpoint
 *
 * GET /api/financial/spending/insights
 * AI-powered spending insights and recommendations
 *
 * Phase 2.3: Spending Intelligence
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSpendingAnalyzer } from '@/lib/financial/spending-analyzer';
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

const InsightsQuerySchema = z.object({
  type: z.enum(['patterns', 'trends', 'anomalies', 'all']).optional().default('all'),
  priority: z.enum(['high', 'medium', 'low', 'all']).optional().default('all'),
});

// ============================================================================
// GET - Generate Spending Insights
// ============================================================================

/**
 * @swagger
 * /api/financial/spending/insights:
 *   get:
 *     summary: Generate spending insights
 *     description: AI-powered insights about spending patterns, trends, and anomalies with actionable recommendations
 *     tags: [Spending Intelligence]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [patterns, trends, anomalies, all]
 *           default: all
 *         description: Type of insights to generate
 *       - in: query
 *         name: priority
 *         schema:
 *           type: string
 *           enum: [high, medium, low, all]
 *           default: all
 *         description: Filter by priority level
 *     responses:
 *       200:
 *         description: Insights generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   description: AI-generated insights with action items and recommendations
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

  const { userId, startTime: middlewareStartTime } = middleware;

  try {
    // Validate query parameters
    const { searchParams } = new URL(request.url);
    const queryParams = {
      type: searchParams.get('type') || 'all',
      priority: searchParams.get('priority') || 'all',
    };

    const validatedParams = InsightsQuerySchema.parse(queryParams);

    // Check permissions
    const hasPermission = await rbac.hasPermission(userId!, 'financial:view_spending');
    if (!hasPermission) {
      return finalizeResponse(
        request,
        NextResponse.json(
          {
            success: false,
            error: {
              code: 'FORBIDDEN',
              message: 'You do not have permission to view spending insights',
            },
          },
          { status: 403 }
        ),
        middlewareStartTime,
        userId
      );
    }

    // Get spending analyzer
    const analyzer = getSpendingAnalyzer();

    // Generate insights
    const result = await analyzer.generateInsights(
      userId!,
      validatedParams.type as 'patterns' | 'trends' | 'anomalies' | 'all'
    );

    // Filter by priority if specified
    let filteredInsights = result.insights;
    if (validatedParams.priority !== 'all') {
      filteredInsights = result.insights.filter(
        insight => insight.priority === validatedParams.priority
      );
    }

    return finalizeResponse(
      request,
      NextResponse.json({
        success: true,
        data: {
          ...result,
          insights: filteredInsights,
        },
        meta: {
          userId,
          type: validatedParams.type,
          priority: validatedParams.priority,
          totalInsights: filteredInsights.length,
          generatedAt: new Date().toISOString(),
          processingTimeMs: Date.now() - middlewareStartTime,
        },
      }),
      middlewareStartTime,
      userId
    );
  } catch (error) {
    console.error('Error generating spending insights:', error);

    return finalizeResponse(
      request,
      NextResponse.json(
        {
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to generate spending insights',
            details: error instanceof Error ? error.message : 'Unknown error',
          },
        },
        { status: 500 }
      ),
      middlewareStartTime,
      userId
    );
  }
}

