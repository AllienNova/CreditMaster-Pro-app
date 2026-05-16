/**
 * Pattern Recognition API
 *
 * Endpoints for chart pattern detection and analysis
 */

import { NextRequest, NextResponse } from "next/server";
import { withAuth, type AuthedUser } from "@/lib/auth/api-guard";

// ============================================================================
// POST - Scan for patterns
// ============================================================================

export const POST = withAuth(
  async (request: NextRequest, _user: AuthedUser) => {
  try {
    const body = await request.json();
    const { symbol, timeframe = "1d", data } = body;

    if (!symbol) {
      return NextResponse.json({ error: "Symbol required" }, { status: 400 });
    }

    // Import pattern recognition service dynamically for server
    const { PatternRecognitionService } =
      await import("@/lib/investments/services/PatternRecognitionService");
    const patternService = new PatternRecognitionService();

    // If data is provided, scan it directly
    // Otherwise, fetch data from market data service
    let candleData = data;

    if (!candleData) {
      // Fetch market data
      const { MarketDataService } =
        await import("@/lib/investments/services/MarketDataService");
      const marketService = new MarketDataService();

      candleData = await marketService.getHistoricalData(
        symbol,
        timeframe,
        200,
      );
    }

    if (!candleData || candleData.length === 0) {
      return NextResponse.json(
        { error: "No data available for pattern scan" },
        { status: 400 },
      );
    }

    // Scan for patterns
    const scanResult = patternService.scanForPatterns(
      candleData,
      symbol,
      timeframe,
    );

    return NextResponse.json({
      symbol,
      timeframe,
      scannedAt: scanResult.scannedAt,
      patterns: scanResult.patterns,
      pivotPoints: scanResult.pivotPoints,
      supportLevels: scanResult.supportLevels,
      resistanceLevels: scanResult.resistanceLevels,
      summary: {
        totalPatterns: scanResult.patterns.length,
        bullishPatterns: scanResult.patterns.filter(
          (p) => p.direction === "bullish",
        ).length,
        bearishPatterns: scanResult.patterns.filter(
          (p) => p.direction === "bearish",
        ).length,
        highReliabilityPatterns: scanResult.patterns.filter(
          (p) => p.reliability >= 70,
        ).length,
      },
    });
  } catch (error) {
    console.error("Pattern scan error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
  },
);

// ============================================================================
// GET - Get pattern info
// ============================================================================

export const GET = withAuth(
  async (request: NextRequest, _user: AuthedUser) => {
  try {
    const { searchParams } = new URL(request.url);
    const patternType = searchParams.get("type");

    const { PATTERN_INFO } =
      await import("@/lib/investments/services/PatternRecognitionService");

    if (patternType) {
      const info = PATTERN_INFO[patternType as keyof typeof PATTERN_INFO];
      if (!info) {
        return NextResponse.json(
          { error: "Unknown pattern type" },
          { status: 404 },
        );
      }
      return NextResponse.json({ pattern: { type: patternType, ...info } });
    }

    // Return all pattern info
    const patterns = Object.entries(PATTERN_INFO).map(([type, info]) => ({
      type,
      ...info,
    }));

    return NextResponse.json({
      patterns,
      total: patterns.length,
    });
  } catch (error) {
    console.error("Pattern GET error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
  },
);
