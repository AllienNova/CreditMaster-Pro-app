/**
 * Portfolio Rebalancing Recommendations API
 *
 * Phase 5.2.3: Portfolio Analytics API Endpoints
 * Endpoint for generating intelligent rebalancing recommendations using Modern Portfolio Theory
 */

import { NextRequest, NextResponse } from 'next/server';
import { PortfolioAnalytics } from '@/lib/investments/portfolio-analytics';
import { getUser } from '@/lib/auth/session';
import { RiskLevel } from '@/lib/investments/types/advanced-analytics.types';
import { z } from 'zod';
import { rateLimit } from '@/lib/rate-limit';

// Initialize portfolio analytics service
const portfolioAnalytics = new PortfolioAnalytics();

// Rate limiter: 100 requests per hour per user
const limiter = rateLimit({
  interval: 60 * 60 * 1000, // 1 hour
  uniqueTokenPerInterval: 500,
});

// Request validation schema
const RebalanceQuerySchema = z.object({
  portfolioId: z.string().uuid('Invalid portfolio ID format'),
  targetRiskLevel: z.nativeEnum(RiskLevel).optional(),
});

/**
 * GET /api/investments/analytics/rebalance
 * Generate rebalancing recommendations for a portfolio
 *
 * Query Parameters:
 * - portfolioId: string (UUID) - Portfolio ID (required)
 * - targetRiskLevel: 'conservative' | 'moderate' | 'aggressive' | 'very_aggressive' - Target risk level (optional)
 *
 * Returns:
 * - RebalancingRecommendation object with trade suggestions, expected impact, and reasons
 */
export async function GET(request: NextRequest) {
  try {
    // Authentication
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Rate limiting
    try {
      await limiter.check(100, user.id); // 100 requests per hour
    } catch {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Maximum 100 requests per hour.' },
        { status: 429 }
      );
    }

    // Parse and validate query parameters
    const searchParams = request.nextUrl.searchParams;
    const portfolioId = searchParams.get('portfolioId');
    const targetRiskLevel = searchParams.get('targetRiskLevel') as RiskLevel | null;

    // Validate parameters
    const validationResult = RebalanceQuerySchema.safeParse({
      portfolioId,
      targetRiskLevel,
    });

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Invalid request parameters',
          details: validationResult.error.errors,
        },
        { status: 400 }
      );
    }

    const { portfolioId: validPortfolioId, targetRiskLevel: validTargetRiskLevel } = validationResult.data;

    // Generate rebalancing recommendations
    const recommendations = await portfolioAnalytics.suggestRebalancing(
      validPortfolioId,
      validTargetRiskLevel
    );

    return NextResponse.json({
      success: true,
      data: recommendations,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error generating rebalancing recommendations:', error);

    // Handle specific error types
    if (error instanceof Error) {
      if (error.message.includes('not found') || error.message.includes('no holdings')) {
        return NextResponse.json(
          { error: error.message },
          { status: 404 }
        );
      }

      if (error.message.includes('insufficient data')) {
        return NextResponse.json(
          { error: 'Insufficient data for rebalancing analysis' },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Failed to generate rebalancing recommendations' },
      { status: 500 }
    );
  }
}

