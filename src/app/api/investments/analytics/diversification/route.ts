/**
 * Portfolio Diversification Score API
 *
 * Phase 5.2.3: Portfolio Analytics API Endpoints
 * Endpoint for calculating diversification scores across sectors, geography, and asset classes
 */

import { NextRequest, NextResponse } from "next/server";
import { PortfolioAnalytics } from "@/lib/investments/portfolio-analytics";
import { getUser } from "@/lib/auth/session";
import { z } from "zod";
import { rateLimit } from "@/lib/rate-limit";

// Initialize portfolio analytics service
const portfolioAnalytics = new PortfolioAnalytics();

// Rate limiter: 100 requests per hour per user
const limiter = rateLimit({
  interval: 60 * 60 * 1000, // 1 hour
  uniqueTokenPerInterval: 500,
});

// Request validation schema
const DiversificationQuerySchema = z.object({
  portfolioId: z.string().uuid("Invalid portfolio ID format"),
});

/**
 * GET /api/investments/analytics/diversification
 * Calculate diversification score for a portfolio
 *
 * Query Parameters:
 * - portfolioId: string (UUID) - Portfolio ID (required)
 *
 * Returns:
 * - DiversificationScore object with sector, geographic, and asset class diversification metrics
 */
export async function GET(request: NextRequest) {
  try {
    // Authentication
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Rate limiting
    try {
      await limiter.check(100, user.id); // 100 requests per hour
    } catch {
      return NextResponse.json(
        { error: "Rate limit exceeded. Maximum 100 requests per hour." },
        { status: 429 },
      );
    }

    // Parse and validate query parameters
    const searchParams = request.nextUrl.searchParams;
    const portfolioId = searchParams.get("portfolioId");

    // Validate parameters
    const validationResult = DiversificationQuerySchema.safeParse({
      portfolioId,
    });

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Invalid request parameters",
          details: validationResult.error.issues,
        },
        { status: 400 },
      );
    }

    const { portfolioId: validPortfolioId } = validationResult.data;

    // Calculate diversification score
    const diversificationScore =
      await portfolioAnalytics.getDiversificationScore(validPortfolioId);

    return NextResponse.json({
      success: true,
      data: diversificationScore,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error calculating diversification score:", error);

    // Handle specific error types
    if (error instanceof Error) {
      if (
        error.message.includes("not found") ||
        error.message.includes("no holdings")
      ) {
        return NextResponse.json({ error: error.message }, { status: 404 });
      }
    }

    return NextResponse.json(
      { error: "Failed to calculate diversification score" },
      { status: 500 },
    );
  }
}
