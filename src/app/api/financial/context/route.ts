/**
 * Financial Context API
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

    return NextResponse.json({
      success: true,
      data: context,
    });
  } catch (error) {
    console.error('Error fetching financial context:', error);
    return NextResponse.json(
      { error: 'Failed to fetch financial context' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/financial/context/refresh
 * Force refresh the financial context cache
 */
export async function POST(request: NextRequest) {
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
        'financial:write'
      )
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
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
    });
  } catch (error) {
    console.error('Error refreshing financial context:', error);
    return NextResponse.json(
      { error: 'Failed to refresh financial context' },
      { status: 500 }
    );
  }
}
