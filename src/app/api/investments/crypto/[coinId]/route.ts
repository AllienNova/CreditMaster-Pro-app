/**
 * Cryptocurrency Analysis API Endpoint
 *
 * GET /api/investments/crypto/[coinId]
 * Complete cryptocurrency analysis with on-chain metrics, DeFi analytics, and sentiment
 */

import { NextRequest, NextResponse } from 'next/server';
import { cryptoAnalyst } from '@/lib/investments/crypto-analyst';
import { getUser } from '@/lib/auth/session';
import { rateLimit } from '@/lib/rate-limit';
import { z } from 'zod';

// Rate limiter: 50 requests per hour per user
const limiter = rateLimit({
  interval: 60 * 60 * 1000, // 1 hour
  uniqueTokenPerInterval: 500,
});

// Query parameters schema
const CryptoAnalysisQuerySchema = z.object({
  depth: z.enum(['basic', 'full']).default('full').optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ coinId: string }> }
) {
  try {
    // Authentication
    const user = await getUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized. Please log in to access crypto analysis.' },
        { status: 401 }
      );
    }

    // Rate limiting
    try {
      await limiter.check(50, user.id);
    } catch {
      return NextResponse.json(
        {
          error: 'Rate limit exceeded. Maximum 50 requests per hour.',
          retryAfter: '1 hour',
        },
        { status: 429 }
      );
    }

    // Get and validate parameters
    const { coinId } = await params;
    
    if (!coinId || typeof coinId !== 'string') {
      return NextResponse.json(
        { error: 'Invalid coin ID. Please provide a valid CoinGecko coin ID.' },
        { status: 400 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const validationResult = CryptoAnalysisQuerySchema.safeParse({
      depth: searchParams.get('depth') || 'full',
    });

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Invalid query parameters',
          details: validationResult.error.errors,
        },
        { status: 400 }
      );
    }

    // Perform crypto analysis
    const analysis = await cryptoAnalyst.analyzeCrypto(coinId);

    // Return response
    return NextResponse.json({
      success: true,
      data: analysis,
      timestamp: new Date().toISOString(),
      metadata: {
        coinId,
        depth: validationResult.data.depth,
        userId: user.id,
      },
    });
  } catch (error) {
    console.error('Crypto analysis API error:', error);

    // Handle specific errors
    if (error instanceof Error) {
      if (error.message.includes('not found') || error.message.includes('404')) {
        return NextResponse.json(
          {
            error: 'Cryptocurrency not found',
            message: 'The requested cryptocurrency could not be found. Please check the coin ID.',
          },
          { status: 404 }
        );
      }

      if (error.message.includes('rate limit') || error.message.includes('429')) {
        return NextResponse.json(
          {
            error: 'External API rate limit exceeded',
            message: 'Please try again in a few moments.',
          },
          { status: 429 }
        );
      }
    }

    // Generic error response
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'An error occurred while analyzing the cryptocurrency. Please try again later.',
      },
      { status: 500 }
    );
  }
}

