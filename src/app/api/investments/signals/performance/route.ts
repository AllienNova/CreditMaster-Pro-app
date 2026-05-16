/**
 * Signal Performance API
 *
 * Phase 5.1.3: Enhanced with rate limiting, Zod validation, and caching
 * Endpoint for getting trading signal performance metrics
 */

import { NextRequest, NextResponse } from "next/server";
import { SignalGenerator } from "@/lib/investments/signal-generator";
import { getUser } from "@/lib/auth/session";
import { rateLimit } from "@/lib/security/redis-rate-limiting";
import { z } from "zod";

// Initialize signal generator
const signalGenerator = new SignalGenerator();

// Rate limiter: 100 requests per hour per user
const limiter = rateLimit({
  interval: 60 * 60 * 1000, // 1 hour
  uniqueTokenPerInterval: 500,
});

// Validation schema
const PeriodSchema = z.enum(["week", "month", "quarter", "year", "all"]);

/**
 * GET /api/investments/signals/performance
 * Get signal performance metrics for the authenticated user
 *
 * Query Parameters:
 * - period: 'week' | 'month' | 'quarter' | 'year' | 'all' (default: 'month')
 */
export async function GET(request: NextRequest) {
  try {
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

    const searchParams = request.nextUrl.searchParams;
    const periodParam = searchParams.get("period") || "month";

    // Validate period with Zod
    const period = PeriodSchema.parse(periodParam);

    const performance = await signalGenerator.getSignalPerformance(
      user.id,
      period,
    );

    return NextResponse.json({
      success: true,
      data: performance,
      metadata: {
        period,
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Error fetching signal performance:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "Invalid period parameter",
          details: "Period must be one of: week, month, quarter, year, all",
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: "Failed to fetch signal performance" },
      { status: 500 },
    );
  }
}
