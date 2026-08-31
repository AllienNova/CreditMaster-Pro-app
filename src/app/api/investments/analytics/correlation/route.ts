/**
 * Portfolio Correlation Matrix API
 *
 * Phase 5.2.3: Portfolio Analytics API Endpoints
 * Endpoint for calculating correlation matrix between portfolio holdings
 */

import { NextRequest, NextResponse } from "next/server";
import { PortfolioAnalytics } from "@/lib/investments/portfolio-analytics";
import { withAuth, type AuthedUser } from "@/lib/auth/api-guard";
import { TimeHorizonSchema } from "@/lib/investments/types/advanced-analytics.types";
import { z } from "zod";
import { rateLimit } from "@/lib/security/redis-rate-limiting";
import { InsufficientHoldingsError } from "@/lib/investments/portfolio-analytics";

// Rate limiter: 100 requests per hour per user
const limiter = rateLimit({
  interval: 60 * 60 * 1000, // 1 hour
  uniqueTokenPerInterval: 500,
});

// Request validation schema
const CorrelationQuerySchema = z.object({
  portfolioId: z.string().uuid("Invalid portfolio ID format"),
  timeHorizon: TimeHorizonSchema.default("1Y"),
});

/**
 * GET /api/investments/analytics/correlation
 * Calculate correlation matrix for portfolio holdings
 *
 * Query Parameters:
 * - portfolioId: string (UUID) - Portfolio ID (required)
 * - timeHorizon: '1M' | '3M' | '6M' | '1Y' | '3Y' | '5Y' - Analysis time horizon (default: '1Y')
 *
 * Returns:
 * - CorrelationMatrix object with correlation coefficients, covariances, and highly correlated pairs
 */
export const GET = withAuth(async (request: NextRequest, user: AuthedUser) => {
  try {
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
    const timeHorizon = searchParams.get("timeHorizon") || "1Y";

    // Validate parameters
    const validationResult = CorrelationQuerySchema.safeParse({
      portfolioId,
      timeHorizon,
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

    const { portfolioId: validPortfolioId, timeHorizon: validTimeHorizon } =
      validationResult.data;

    // Calculate correlation matrix
    const portfolioAnalytics = new PortfolioAnalytics(user.id);
    const correlationMatrix = await portfolioAnalytics.getCorrelationMatrix(
      validPortfolioId,
      validTimeHorizon,
    );

    return NextResponse.json({
      success: true,
      data: correlationMatrix,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error calculating correlation matrix:", error);

    // Too few holdings is the ACCOUNT's state, not a server failure — 422, so
    // the page can say "add another holding to see correlations" instead of
    // rendering a generic error. Checked by type; the message-substring
    // branches below never matched this case, which is why it 500'd.
    if (error instanceof InsufficientHoldingsError) {
      return NextResponse.json(
        {
          error: error.message,
          reason: "insufficient_holdings",
          required: error.required,
          actual: error.actual,
        },
        { status: 422 },
      );
    }

    // Handle specific error types
    if (error instanceof Error) {
      if (
        error.message.includes("not found") ||
        error.message.includes("no holdings")
      ) {
        return NextResponse.json({ error: error.message }, { status: 404 });
      }

      if (error.message.includes("insufficient data")) {
        return NextResponse.json(
          { error: "Insufficient historical data for correlation analysis" },
          { status: 400 },
        );
      }
    }

    return NextResponse.json(
      { error: "Failed to calculate correlation matrix" },
      { status: 500 },
    );
  }
});
