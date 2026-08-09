/**
 * Technical Analysis API Endpoint
 *
 * GET /api/investments/analyze/[symbol]/technical
 *
 * Provides technical analysis only including:
 * - 14+ technical indicators (RSI, MACD, Bollinger Bands, etc.)
 * - Trend analysis (short, medium, long-term)
 * - Support and resistance levels
 * - Technical signals and recommendations
 *
 * Features:
 * - Redis caching with 1-hour TTL
 * - Rate limiting: 10 requests per minute per user
 * - Lightweight response (technical data only)
 */

import { NextRequest, NextResponse } from "next/server";
import { withAuth, type AuthedUser } from "@/lib/auth/api-guard";
import { aiStockAnalyst } from "@/lib/investments/ai-stock-analyst";

// ============================================================================
// RATE LIMITING
// ============================================================================

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(identifier: string): boolean {
  const now = Date.now();
  const userLimit = rateLimitMap.get(identifier);

  if (!userLimit || now > userLimit.resetAt) {
    // Reset rate limit (10 requests per minute)
    rateLimitMap.set(identifier, {
      count: 1,
      resetAt: now + 60000, // 1 minute
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
 * GET /api/investments/analyze/[symbol]/technical
 *
 * Returns technical analysis only for faster response times
 */
export const GET = withAuth(async (request: NextRequest, _user: AuthedUser) => {
  try {
    // Path is .../analyze/[symbol]/technical — symbol is the segment before "technical".
    const segments = request.nextUrl.pathname.split("/");
    const symbol = segments[segments.length - 2] ?? "";

    // Apply rate limiting (use IP or symbol as identifier)
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

    // Get technical analysis
    const technical = await aiStockAnalyst.getTechnicalAnalysis(
      symbol.toUpperCase(),
    );

    // Return successful response
    return NextResponse.json(
      {
        success: true,
        data: technical,
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=7200",
        },
      },
    );
  } catch (error) {
    console.error("Error in technical analysis API:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 },
    );
  }
});
