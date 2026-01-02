/**
 * Individual Trading Signal API
 * 
 * Endpoints for managing individual trading signals
 */

import { NextRequest, NextResponse } from 'next/server';
import { signalGenerator } from '@/lib/investments/signal-generator';
import { getUser } from '@/lib/auth/session';

/**
 * GET /api/investments/signals/[id]
 * Get a specific signal by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const signals = await signalGenerator.getSignalHistory(user.id);
    const signal = signals.find((s) => s.id === id);

    if (!signal) {
      return NextResponse.json({ error: 'Signal not found' }, { status: 404 });
    }

    // Evaluate current strength
    const evaluation = await signalGenerator.evaluateSignalStrength(id);

    return NextResponse.json({
      success: true,
      data: {
        ...signal,
        currentEvaluation: evaluation,
      },
    });
  } catch (error) {
    console.error('Error fetching signal:', error);
    return NextResponse.json(
      { error: 'Failed to fetch signal' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/investments/signals/[id]
 * Update signal outcome (track execution)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { entryPrice, exitPrice, status } = body;

    if (!entryPrice || !status) {
      return NextResponse.json(
        { error: 'entryPrice and status are required' },
        { status: 400 }
      );
    }

    if (!['executed', 'expired', 'cancelled'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be: executed, expired, or cancelled' },
        { status: 400 }
      );
    }

    const outcome = await signalGenerator.trackSignalOutcome(id, {
      entryPrice: parseFloat(entryPrice),
      exitPrice: exitPrice ? parseFloat(exitPrice) : undefined,
      status,
    });

    return NextResponse.json({
      success: true,
      data: outcome,
      message: `Signal ${status}`,
    });
  } catch (error) {
    console.error('Error updating signal:', error);
    return NextResponse.json(
      {
        error: 'Failed to update signal',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

