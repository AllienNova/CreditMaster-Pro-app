/**
 * Financial Health Score API
 *
 * GET /api/financial/health-score - Get current health score
 * GET /api/financial/health-score/history - Get historical scores
 * POST /api/financial/health-score/calculate - Calculate and save new score
 */

import { NextRequest, NextResponse } from 'next/server';
import { jwtValidation } from '@/lib/auth/jwt-validation';
import { rbac } from '@/lib/auth/rbac';
import { financialContextEngine } from '@/lib/financial/financial-context-engine';
import { healthScoreCalculator } from '@/lib/financial/health-score-calculator';

/**
 * GET /api/financial/health-score
 * Returns the current financial health score
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

    // Check if requesting history
    const history = request.nextUrl.searchParams.get('history');
    if (history === 'true') {
      const days = parseInt(
        request.nextUrl.searchParams.get('days') || '30',
        10
      );
      const historicalScores = await healthScoreCalculator.getHistoricalScores(
        validation.user.id,
        days
      );

      return NextResponse.json({
        success: true,
        data: historicalScores,
      });
    }

    // Get current context and extract health score
    const context = await financialContextEngine.getFinancialContext(
      validation.user.id
    );

    return NextResponse.json({
      success: true,
      data: context.healthScore,
    });
  } catch (error) {
    console.error('Error fetching health score:', error);
    return NextResponse.json(
      { error: 'Failed to fetch health score' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/financial/health-score
 * Calculate and save a new health score
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

    // Force refresh context to get latest data
    const context = await financialContextEngine.getFinancialContext(
      validation.user.id,
      true
    );

    // Save the score to database
    await healthScoreCalculator.saveScore(
      validation.user.id,
      context.healthScore
    );

    return NextResponse.json({
      success: true,
      data: context.healthScore,
      message: 'Health score calculated and saved',
    });
  } catch (error) {
    console.error('Error calculating health score:', error);
    return NextResponse.json(
      { error: 'Failed to calculate health score' },
      { status: 500 }
    );
  }
}
