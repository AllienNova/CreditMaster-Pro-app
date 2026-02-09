/**
 * Portfolio Performance Analysis API
 *
 * Phase 5.2.3: Portfolio Analytics API Endpoints
 * Endpoint for calculating comprehensive portfolio performance metrics
 */

import { NextRequest, NextResponse } from 'next/server';
import { PortfolioAnalytics } from '@/lib/investments/portfolio-analytics';
import { getUser } from '@/lib/auth/session';
import { TimeHorizonSchema } from '@/lib/investments/types/advanced-analytics.types';
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
const PerformanceQuerySchema = z.object({
  portfolioId: z.string().uuid('Invalid portfolio ID format'),
  timeHorizon: TimeHorizonSchema.default('1Y'),
  benchmark: z.string().min(1).max(10).optional(),
});

/**
 * GET /api/investments/analytics/performance
 * Calculate comprehensive performance metrics for a portfolio
 *
 * Query Parameters:
 * - portfolioId: string (UUID) - Portfolio ID (required)
 * - timeHorizon: '1M' | '3M' | '6M' | '1Y' | '3Y' | '5Y' - Analysis time horizon (default: '1Y')
 * - benchmark: string - Benchmark symbol for comparison (optional, default: 'SPY')
 *
 * Returns:
 * - PortfolioPerformance object with returns, risk-adjusted metrics, benchmark comparison, and attribution
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
    const timeHorizon = searchParams.get('timeHorizon') || '1Y';
    const benchmark = searchParams.get('benchmark') || undefined;

    // Validate parameters
    const validationResult = PerformanceQuerySchema.safeParse({
      portfolioId,
      timeHorizon,
      benchmark,
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

    const { portfolioId: validPortfolioId, timeHorizon: validTimeHorizon, benchmark: validBenchmark } = validationResult.data;

    // Calculate portfolio performance
    const performance = await portfolioAnalytics.getPortfolioPerformance(
      validPortfolioId,
      validBenchmark,
      validTimeHorizon
    );

    return NextResponse.json({
      success: true,
      data: performance,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error calculating portfolio performance:', error);

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
          { error: 'Insufficient historical data for performance analysis' },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Failed to calculate portfolio performance' },
      { status: 500 }
    );
  }
}

