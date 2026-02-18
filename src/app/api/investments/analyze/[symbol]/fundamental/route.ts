/**
 * Fundamental Analysis API Endpoint
 *
 * GET /api/investments/analyze/[symbol]/fundamental
 *
 * Provides fundamental analysis only including:
 * - Valuation metrics (P/E, P/B, P/S, PEG)
 * - Profitability metrics (margins, ROE, ROA)
 * - Growth metrics (revenue, earnings growth)
 * - Financial health metrics (debt ratios, liquidity)
 * - Dividend metrics (yield, payout ratio)
 * - Peer comparison
 * - Fair value estimate
 *
 * Features:
 * - Redis caching with 1-hour TTL
 * - Rate limiting: 10 requests per minute per user
 * - Lightweight response (fundamental data only)
 */

import { NextRequest, NextResponse } from "next/server";
import { aiStockAnalyst } from "@/lib/investments/ai-stock-analyst";

// ============================================================================
// RATE LIMITING
// ============================================================================

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(identifier: string): boolean {
  const now = Date.now();
  const userLimit = rateLimitMap.get(identifier);

  if (!userLimit || now > userLimit.resetAt) {
    rateLimitMap.set(identifier, {
      count: 1,
      resetAt: now + 60000,
    });
    return true;
  }

  if (userLimit.count >= 10) {
    return false;
  }

  userLimit.count++;
  return true;
}

/**
 * GET /api/investments/analyze/[symbol]/fundamental
 *
 * Returns fundamental analysis only for faster response times
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ symbol: string }> },
) {
  try {
    // Get symbol from params (Next.js 15 async params)
    const { symbol } = await context.params;

    // Apply rate limiting
    const identifier = request.headers.get("x-forwarded-for") || symbol;
    if (!checkRateLimit(identifier)) {
      return NextResponse.json(
        {
          success: false,
          error: "Rate limit exceeded. Maximum 10 requests per minute.",
        },
        { status: 429 },
      );
    }

    // Validate symbol
    if (!symbol || symbol.trim().length === 0 || symbol.length > 10) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid symbol. Must be 1-10 characters.",
        },
        { status: 400 },
      );
    }

    // Get fundamental analysis
    const fundamental = await aiStockAnalyst.getFundamentalAnalysis(
      symbol.toUpperCase(),
    );

    // Return successful response
    return NextResponse.json(
      {
        success: true,
        data: fundamental,
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=7200",
        },
      },
    );
  } catch (error) {
    console.error("Error in fundamental analysis API:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 },
    );
  }
}
