/**
 * Active Trading Signals API
 * 
 * Endpoint for getting active trading signals
 */

import { NextRequest, NextResponse } from 'next/server';
import { signalGenerator } from '@/lib/investments/signal-generator';
import { getUser } from '@/lib/auth/session';

/**
 * GET /api/investments/signals/active
 * Get all active signals for the authenticated user
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
    });
  } catch (error) {
    console.error('Error fetching active signals:', error);
    return NextResponse.json(
      { error: 'Failed to fetch active signals' },
      { status: 500 }
    );
  }
}

