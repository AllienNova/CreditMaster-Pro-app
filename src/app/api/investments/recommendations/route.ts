/**
 * Investment Recommendations API
 *
 * AI-powered investment recommendations and price predictions
 */

import { NextRequest, NextResponse } from "next/server";
import { withAuth, type AuthedUser } from "@/lib/auth/api-guard";
import type { TechnicalAnalysis } from "@/lib/investments/types/technical-analysis.types";

// ============================================================================
// POST - Generate Recommendation
// ============================================================================

export const POST = withAuth(
  async (request: NextRequest, _user: AuthedUser) => {
  try {
    const body = await request.json();
    const { symbol, includePrice = false, userProfile } = body;

    if (!symbol) {
      return NextResponse.json({ error: "Symbol required" }, { status: 400 });
    }

    // Import services dynamically
    const { AIRecommendationEngine } =
      await import("@/lib/investments/services/AIRecommendationEngine");
    const { MarketDataService } =
      await import("@/lib/investments/services/MarketDataService");

    const recommendationEngine = new AIRecommendationEngine();
    const marketService = new MarketDataService();

    // Get market data for technical analysis
    const marketData = await marketService.getHistoricalData(symbol, "1d", 100);

    if (!marketData || marketData.length === 0) {
      return NextResponse.json(
        { error: "No market data available" },
        { status: 400 },
      );
    }

    // Calculate technical indicators
    const { calculateSMA, calculateRSI, calculateMACD } =
      await import("@/components/investments/charts/TechnicalIndicators");

    const currentPrice = marketData[marketData.length - 1].close;
    const sma20 = calculateSMA(marketData, 20);
    const rsi = calculateRSI(marketData, 14);
    const macd = calculateMACD(marketData);

    // Build technical analysis object
    const technicalData = {
      price: currentPrice,
      trend: {
        direction:
          sma20[sma20.length - 1]?.value < currentPrice
            ? "bullish"
            : ("bearish" as const),
        strength: 0.6,
      },
      indicators: {
        rsi: rsi[rsi.length - 1]?.value,
        macd: macd[macd.length - 1]
          ? {
              line: macd[macd.length - 1].macd,
              signal: macd[macd.length - 1].signal,
              histogram: macd[macd.length - 1].histogram,
            }
          : undefined,
      },
      volatility: 0.2, // Simplified
    };

    // Generate recommendation
    const recommendation = await recommendationEngine.generateRecommendation(
      symbol,
      currentPrice,
      // Simplified technical data — the engine accesses fields loosely
      technicalData as unknown as TechnicalAnalysis,
      undefined, // Fundamental data
      undefined, // Sentiment data
      userProfile,
    );

    // Optionally include price prediction
    let pricePrediction = null;
    if (includePrice) {
      pricePrediction = await recommendationEngine.predictPrice(
        symbol,
        currentPrice,
        // Simplified technical data — the engine accesses fields loosely
      technicalData as unknown as TechnicalAnalysis,
      );
    }

    return NextResponse.json({
      recommendation,
      pricePrediction,
      technicalSummary: {
        price: currentPrice,
        rsi: rsi[rsi.length - 1]?.value,
        trend: technicalData.trend.direction,
      },
    });
  } catch (error) {
    console.error("Recommendation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
  },
);

// ============================================================================
// GET - Get recommendation by symbol
// ============================================================================

export const GET = withAuth(
  async (request: NextRequest, _user: AuthedUser) => {
  try {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get("symbol");

    if (!symbol) {
      // Return list of recent recommendations (from cache/DB in production)
      return NextResponse.json({
        recommendations: [],
        message: "Provide symbol parameter for specific recommendation",
      });
    }

    // Generate fresh recommendation
    const response = await POST(
      new NextRequest(request.url, {
        method: "POST",
        body: JSON.stringify({ symbol }),
      }),
    );

    return response;
  } catch (error) {
    console.error("Recommendation GET error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
  },
);
