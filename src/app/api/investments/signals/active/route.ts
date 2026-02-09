/**
 * Active Trading Signals API
 *
 * Phase 5.1.3: Enhanced with rate limiting and caching
 * Endpoint for getting active trading signals
 */

import { NextRequest, NextResponse } from 'next/server';
import { SignalGenerator } from '@/lib/investments/signal-generator';
import { getUser } from '@/lib/auth/session';
import { rateLimit } from '@/lib/rate-limit';

// Initialize signal generator
const signalGenerator = new SignalGenerator();

// Rate limiter: 100 requests per hour per user
const limiter = rateLimit({
  interval: 60 * 60 * 1000, // 1 hour
  uniqueTokenPerInterval: 500,
});

/**
 * GET /api/investments/signals/active
 * Get all active signals for the authenticated user
 *
 * Query Parameters:
 * - includeEvaluation: boolean - Include current strength evaluation (default: false)
 */
export async function GET(request: NextRequest) {
  try {
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

    const signals = await signalGenerator.getActiveSignals(user.id);

    // Optionally evaluate each signal's current strength
    const searchParams = request.nextUrl.searchParams;
    const includeEvaluation = searchParams.get('includeEvaluation') === 'true';

    let enrichedSignals = signals;

    if (includeEvaluation && signals.length > 0) {
      enrichedSignals = await Promise.all(
        signals.map(async (signal) => {
          try {
            const evaluation = await signalGenerator.evaluateSignalStrength(signal.id);
            return {
              ...signal,
              currentEvaluation: evaluation,
            };
          } catch (error) {
            console.error(`Failed to evaluate signal ${signal.id}:`, error);
            return signal;
          }
        })
      );
    }

    return NextResponse.json({
      success: true,
      data: enrichedSignals,
      count: enrichedSignals.length,
      metadata: {
        includeEvaluation,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Error fetching active signals:', error);
    return NextResponse.json(
      { error: 'Failed to fetch active signals' },
      { status: 500 }
    );
  }
}

