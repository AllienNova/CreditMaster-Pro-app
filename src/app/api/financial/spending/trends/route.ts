/**
 * Spending Trends API Endpoint
 *
 * GET /api/financial/spending/trends - Get spending trend analysis
 */

import { NextRequest, NextResponse } from 'next/server';
import { jwtValidation } from '@/lib/auth/jwt-validation';
import { spendingAnalysisService } from '@/lib/financial/spending-analysis-service';

/**
 * GET /api/financial/spending/trends
 * Get spending trend analysis for the authenticated user
 * Query params:
 *   - months: number of months to analyze (default: 6)
 *   - compareYoY: whether to include year-over-year comparison (default: false)
 *   - categories: comma-separated list of categories to filter (optional)
 */
export async function GET(request: NextRequest) {
  try {
    const validation = await jwtValidation.validateFromHeaders(request);
    if (!validation.valid || !validation.user) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Invalid or missing authentication' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const months = parseInt(searchParams.get('months') || '6', 10);
    const compareYoY = searchParams.get('compareYoY') === 'true';
    const categoriesParam = searchParams.get('categories');
    const categories = categoriesParam ? categoriesParam.split(',') : undefined;

    // Validate months parameter
    if (isNaN(months) || months < 1 || months > 24) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'months must be between 1 and 24' },
        { status: 400 }
      );
    }

    const analysis = await spendingAnalysisService.getSpendingTrends(
      validation.user.id,
      { months, compareYoY, categories }
    );

    return NextResponse.json({
      success: true,
      data: analysis,
    });
  } catch (error) {
    console.error('Error fetching spending trends:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to fetch spending trends' },
      { status: 500 }
    );
  }
}

