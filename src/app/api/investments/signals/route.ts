/**
 * Trading Signals API
 * 
 * Endpoints for generating and managing trading signals
 */

import { NextRequest, NextResponse } from 'next/server';
import { signalGenerator } from '@/lib/investments/signal-generator';
import { getUser } from '@/lib/auth/session';
import { AnalysisType } from '@/lib/investments/types/trading-signals.types';
import { Timeframe } from '@/lib/investments/types/investment.types';

/**
 * GET /api/investments/signals
 * Get signal history for the authenticated user
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const symbol = searchParams.get('symbol') || undefined;
    const assetType = searchParams.get('assetType') || undefined;
    const status = searchParams.get('status') as any;
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined;

    const signals = await signalGenerator.getSignalHistory(user.id, {
      symbol,
      assetType,
      status,
      limit,
    });

    return NextResponse.json({
      success: true,
      data: signals,
      count: signals.length,
    });
  } catch (error) {
    console.error('Error fetching signals:', error);
    return NextResponse.json(
      { error: 'Failed to fetch signals' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/investments/signals
 * Generate a new trading signal
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      symbol,
      assetType = 'stock',
      analysisTypes = ['technical', 'fundamental', 'sentiment', 'ai_combined'],
      timeframe = '1d',
    } = body;

    if (!symbol) {
      return NextResponse.json(
        { error: 'Symbol is required' },
        { status: 400 }
      );
    }

    // Validate analysis types
    const validAnalysisTypes: AnalysisType[] = ['technical', 'fundamental', 'sentiment', 'ai_combined'];
    const invalidTypes = analysisTypes.filter((t: string) => !validAnalysisTypes.includes(t as AnalysisType));
    if (invalidTypes.length > 0) {
      return NextResponse.json(
        { error: `Invalid analysis types: ${invalidTypes.join(', ')}` },
        { status: 400 }
      );
    }

    // Validate timeframe
    const validTimeframes: Timeframe[] = ['1m', '5m', '15m', '30m', '1h', '4h', '1d', '1w', '1M'];
    if (!validTimeframes.includes(timeframe)) {
      return NextResponse.json(
        { error: `Invalid timeframe: ${timeframe}` },
        { status: 400 }
      );
    }

    // Generate signal
    const signal = await signalGenerator.generateSignal(
      user.id,
      symbol.toUpperCase(),
      assetType,
      analysisTypes,
      timeframe
    );

    return NextResponse.json({
      success: true,
      data: signal,
      message: `${signal.signalType.toUpperCase()} signal generated for ${symbol}`,
    });
  } catch (error) {
    console.error('Error generating signal:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate signal',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

