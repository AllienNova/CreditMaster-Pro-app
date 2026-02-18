/**
 * AI Recommendation API Endpoint
 *
 * GET /api/investments/analyze/[symbol]/recommendation
 *
 * Provides AI-powered investment recommendation including:
 * - Buy/Sell/Hold recommendation with confidence score
 * - Price targets (bull, base, bear scenarios)
 * - Risk assessment and key risk factors
 * - Investment thesis and rationale
 * - Bull case and bear case arguments
 * - Entry price, target price, and stop-loss levels
 * - Position sizing recommendation
 *
 * Features:
 * - Redis caching with 1-hour TTL
 * - Rate limiting: 10 requests per minute per user
 * - Customizable timeframe and risk tolerance
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
 * GET /api/investments/analyze/[symbol]/recommendation
 *
 * Query Parameters:
 * - timeframe: Investment timeframe (short, medium, long) (default: medium)
 * - riskTolerance: Risk tolerance level (conservative, moderate, aggressive) (default: moderate)
 *
 * Example:
 * GET /api/investments/analyze/AAPL/recommendation?timeframe=long&riskTolerance=aggressive
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

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const timeframe = searchParams.get("timeframe") || "medium";
    const riskTolerance = searchParams.get("riskTolerance") || "moderate";

    // Validate timeframe
    const validTimeframes = ["short", "medium", "long"];
    if (!validTimeframes.includes(timeframe)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid timeframe. Must be: short, medium, or long",
        },
        { status: 400 },
      );
    }

    // Validate risk tolerance
    const validRiskTolerances = ["conservative", "moderate", "aggressive"];
    if (!validRiskTolerances.includes(riskTolerance)) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Invalid riskTolerance. Must be: conservative, moderate, or aggressive",
        },
        { status: 400 },
      );
    }

    // Get AI recommendation
    const recommendation = await aiStockAnalyst.getAIRecommendation(
      symbol.toUpperCase(),
      {
        timeframe: timeframe as "short" | "medium" | "long",
        riskTolerance: riskTolerance as
          | "conservative"
          | "moderate"
          | "aggressive",
      },
    );

    // Return successful response
    return NextResponse.json(
      {
        success: true,
        data: recommendation,
        meta: {
          timeframe,
          riskTolerance,
        },
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=7200",
        },
      },
    );
  } catch (error) {
    console.error("Error in AI recommendation API:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 },
    );
  }
}
