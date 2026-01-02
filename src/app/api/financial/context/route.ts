/**
 * Financial Context API - Phase 1.5
 *
 * GET /api/financial/context - Get complete financial context for authenticated user
 *   Query Parameters:
 *   - refresh: boolean - Force refresh bypassing cache
 *   - enhanced: boolean - Return enhanced context with metadata
 *   - includeBills: boolean - Include recurring bills (default: true)
 *   - includeInsights: boolean - Include AI insights (default: true)
 *   - includeRecommendations: boolean - Include recommendations (default: true)
 *   - transactionDays: number - Days of transaction history (default: 30)
 *
 * POST /api/financial/context/refresh - Force refresh the financial context
 *
 * @swagger
 * /api/financial/context:
 *   get:
 *     summary: Get financial context summary
 *     description: Returns comprehensive financial snapshot including accounts, budgets, goals, and health score
 *     tags: [Financial Context]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: refresh
 *         schema:
 *           type: boolean
 *         description: Force refresh bypassing cache
 *       - in: query
 *         name: enhanced
 *         schema:
 *           type: boolean
 *         description: Return enhanced context with metadata
 *     responses:
 *       200:
 *         description: Financial context retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/FinancialContext'
 *       401:
 *         description: Unauthorized - Invalid or missing JWT token
 *       403:
 *         description: Forbidden - Insufficient permissions
 *       500:
 *         description: Internal server error
 */

import { NextRequest, NextResponse } from 'next/server';
import { jwtValidation } from '@/lib/auth/jwt-validation';
import { rbac } from '@/lib/auth/rbac';
import { financialContextEngine } from '@/lib/financial/financial-context-engine';
import { FinancialContextOptions } from '@/lib/financial/types/financial-context.types';

/**
 * Parse boolean query parameter
 */
function parseBooleanParam(
  value: string | null,
  defaultValue: boolean
): boolean {
  if (value === null) return defaultValue;
  return value.toLowerCase() === 'true';
}

/**
 * Parse integer query parameter
 */
function parseIntParam(value: string | null, defaultValue: number): number {
  if (value === null) return defaultValue;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

/**
 * GET /api/financial/context
 * Returns the complete financial context for the authenticated user
 *
 * @example
 * // Basic context
 * GET /api/financial/context
 *
 * @example
 * // Enhanced context with custom options
 * GET /api/financial/context?enhanced=true&transactionDays=60&includeBills=false
 *
 * @example
 * // Force refresh
 * GET /api/financial/context?refresh=true
 */
export async function GET(request: NextRequest) {
  try {
    // Validate JWT token
    const validation = await jwtValidation.validateFromHeaders(request);

    if (!validation.valid || !validation.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permissions
    if (
      !rbac.hasPermission(
        validation.user as Parameters<typeof rbac.hasPermission>[0],
        'financial:read'
      )
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;

    // Parse query parameters
    const forceRefresh = parseBooleanParam(searchParams.get('refresh'), false);
    const enhanced = parseBooleanParam(searchParams.get('enhanced'), false);

    // For enhanced context, parse additional options
    if (enhanced) {
      const options: FinancialContextOptions = {
        forceRefresh,
        includeBills: parseBooleanParam(searchParams.get('includeBills'), true),
        includeInsights: parseBooleanParam(
          searchParams.get('includeInsights'),
          true
        ),
        includeRecommendations: parseBooleanParam(
          searchParams.get('includeRecommendations'),
          true
        ),
        includeTransactions: parseBooleanParam(
          searchParams.get('includeTransactions'),
          true
        ),
        includeInvestments: parseBooleanParam(
          searchParams.get('includeInvestments'),
          true
        ),
        includeCreditProfile: parseBooleanParam(
          searchParams.get('includeCreditProfile'),
          true
        ),
        transactionDays: parseIntParam(searchParams.get('transactionDays'), 30),
      };

      const context = await financialContextEngine.getEnhancedFinancialContext(
        validation.user.id,
        options
      );

      return NextResponse.json({
        success: true,
        data: context,
        _meta: {
          enhanced: true,
          options,
        },
      });
    }

    // Standard context (backward compatible)
    const context = await financialContextEngine.getFinancialContext(
      validation.user.id,
      forceRefresh
    );

    // Add caching headers (5-minute TTL with stale-while-revalidate)
    const headers = new Headers();
    headers.set('Content-Type', 'application/json');
    if (!forceRefresh) {
      headers.set('Cache-Control', 'private, max-age=300, stale-while-revalidate=60');
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          summary: {
            totalAssets: context.accounts.totalAssets,
            totalLiabilities: context.accounts.totalLiabilities,
            netWorth: context.accounts.netWorth,
          },
          accounts: context.accounts,
          budgetStatus: context.budgets,
          goals: context.goals,
          healthScore: context.healthScore,
          insights: context.insights || [],
        },
        _meta: {
          generatedAt: new Date().toISOString(),
          cached: !forceRefresh,
          ttl: 300,
        },
      },
      { headers }
    );
  } catch (error) {
    console.error('Error fetching financial context:', error);

    // Return appropriate error status based on error type
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch financial context';
    const statusCode = errorMessage.includes('not found') ? 404 : 500;

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        _meta: {
          timestamp: new Date().toISOString(),
        },
      },
      { status: statusCode }
    );
  }
}

/**
 * POST /api/financial/context/refresh
 * Force refresh the financial context cache
 *
 * @swagger
 * /api/financial/context/refresh:
 *   post:
 *     summary: Force refresh financial context
 *     description: Clears cache and fetches fresh financial data
 *     tags: [Financial Context]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Context refreshed successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       500:
 *         description: Internal server error
 */
export async function POST(request: NextRequest) {
  try {
    // Validate JWT token
    const validation = await jwtValidation.validateFromHeaders(request);

    if (!validation.valid || !validation.user) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized - Invalid or missing JWT token',
        },
        { status: 401 }
      );
    }

    // Check permissions
    if (
      !rbac.hasPermission(
        validation.user as Parameters<typeof rbac.hasPermission>[0],
        'financial:write'
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          error: 'Forbidden - Insufficient permissions to refresh financial context',
        },
        { status: 403 }
      );
    }

    // Clear cache and fetch fresh data
    financialContextEngine.clearCache(validation.user.id);
    const context = await financialContextEngine.getFinancialContext(
      validation.user.id,
      true
    );

    return NextResponse.json({
      success: true,
      data: context,
      message: 'Financial context refreshed successfully',
      _meta: {
        refreshedAt: new Date().toISOString(),
        userId: validation.user.id,
      },
    });
  } catch (error) {
    console.error('Error refreshing financial context:', error);

    const errorMessage = error instanceof Error ? error.message : 'Failed to refresh financial context';

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        _meta: {
          timestamp: new Date().toISOString(),
        },
      },
      { status: 500 }
    );
  }
}
