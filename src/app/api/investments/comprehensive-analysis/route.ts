/**
 * Comprehensive Investment Analysis API
 *
 * POST /api/investments/comprehensive-analysis - Get unified analysis from all 6 services
 */

import { NextRequest, NextResponse } from "next/server";
import { jwtValidation } from "@/lib/auth/jwt-validation";
import { z } from "zod";
import { getInvestmentAnalysisEngine } from "@/lib/investments/services/InvestmentAnalysisEngine";
import { getMarketDataService } from "@/lib/investments/services/MarketDataService";
import { getAnalysisCacheService } from "@/lib/investments/services/AnalysisCacheService";

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const ComprehensiveAnalysisRequestSchema = z.object({
  symbol: z.string().min(1).max(10).toUpperCase(),
  timeframe: z
    .enum(["1m", "5m", "15m", "30m", "1h", "4h", "1d", "1w", "1M"])
    .optional()
    .default("1d"),
  userProfile: z
    .object({
      riskTolerance: z
        .enum(["conservative", "moderate", "aggressive"])
        .optional(),
      investmentHorizon: z
        .enum(["short_term", "medium_term", "long_term"])
        .optional(),
      preferredAssetClasses: z.array(z.string()).optional(),
    })
    .optional(),
  customWeights: z
    .object({
      technical: z.number().min(0).max(1).optional(),
      fundamental: z.number().min(0).max(1).optional(),
      sentiment: z.number().min(0).max(1).optional(),
      pattern: z.number().min(0).max(1).optional(),
    })
    .optional(),
});

type ComprehensiveAnalysisRequest = z.infer<
  typeof ComprehensiveAnalysisRequestSchema
>;

// ============================================================================
// POST HANDLER
// ============================================================================

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Validate authentication
    const validation = await jwtValidation.validateFromHeaders(request);
    if (!validation.valid || !validation.user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validationResult = ComprehensiveAnalysisRequestSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid request",
          details: validationResult.error.errors,
        },
        { status: 400 },
      );
    }

    const { symbol, timeframe, userProfile, customWeights } =
      validationResult.data;

    // Check cache first
    const cacheService = getAnalysisCacheService();
    const cacheKey = { symbol, timeframe, userProfile, customWeights };
    const cachedAnalysis = cacheService.get("comprehensive-analysis", cacheKey);

    if (cachedAnalysis) {
      return NextResponse.json({
        success: true,
        data: cachedAnalysis,
        meta: {
          cached: true,
          processingTime: Date.now() - startTime,
          timestamp: new Date().toISOString(),
        },
      });
    }

    // Get market data service
    const marketDataService = getMarketDataService();

    // Fetch current price
    const quote = await marketDataService.getQuote(symbol);
    if (!quote) {
      return NextResponse.json(
        { success: false, error: `Unable to fetch quote for ${symbol}` },
        { status: 404 },
      );
    }

    // Fetch historical data (100 periods for comprehensive analysis)
    const historicalData = await marketDataService.getHistoricalData(
      symbol,
      timeframe,
      100,
    );

    if (!historicalData || historicalData.length < 20) {
      return NextResponse.json(
        {
          success: false,
          error: `Insufficient historical data for ${symbol}`,
        },
        { status: 404 },
      );
    }

    // Get investment analysis engine
    const analysisEngine = getInvestmentAnalysisEngine();

    // Convert CandleData to expected format
    const convertedHistoricalData = historicalData.map((candle) => ({
      close: candle.close,
      high: candle.high,
      low: candle.low,
      volume: candle.volume,
      timestamp: new Date(candle.timestamp),
    }));

    // Convert userProfile to expected format (if provided)
    const convertedUserProfile = userProfile
      ? {
          riskTolerance: userProfile.riskTolerance || ("moderate" as const),
          investmentHorizon:
            userProfile.investmentHorizon || ("medium_term" as const),
          portfolioSize: 100000, // Default value
          goals: [{ type: "growth" as const }],
        }
      : undefined;

    // Perform comprehensive analysis
    const analysis = await analysisEngine.analyzeInvestment(
      symbol,
      quote.price,
      convertedHistoricalData,
      {
        timeframe,
        userProfile: convertedUserProfile,
      },
    );

    // Cache the result (5 minutes TTL)
    cacheService.set(
      "comprehensive-analysis",
      cacheKey,
      analysis,
      5 * 60 * 1000,
    );

    const processingTime = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      data: {
        ...analysis,
        // Convert Date to ISO string for JSON serialization
        analyzedAt: analysis.analyzedAt.toISOString(),
      },
      meta: {
        cached: false,
        processingTime: `${processingTime}ms`,
        dataPoints: historicalData.length,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Comprehensive analysis error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 },
    );
  }
}

// ============================================================================
// GET HANDLER - API Documentation
// ============================================================================

export async function GET() {
  return NextResponse.json({
    endpoint: "/api/investments/comprehensive-analysis",
    method: "POST",
    description:
      "Get comprehensive investment analysis combining all 6 analysis services",
    services: [
      "Technical Analysis",
      "Fundamental Analysis",
      "Sentiment Analysis",
      "Pattern Recognition",
      "AI Recommendations",
      "Portfolio Analysis",
    ],
    requestBody: {
      symbol: "string (required) - Stock symbol (e.g., AAPL)",
      timeframe:
        "string (optional) - 1m, 5m, 15m, 30m, 1h, 4h, 1d, 1w, 1M (default: 1d)",
      userProfile: {
        riskTolerance: "conservative | moderate | aggressive",
        investmentHorizon: "short_term | medium_term | long_term",
        preferredAssetClasses: "string[]",
      },
      customWeights: {
        technical: "number (0-1, default: 0.30)",
        fundamental: "number (0-1, default: 0.35)",
        sentiment: "number (0-1, default: 0.20)",
        pattern: "number (0-1, default: 0.15)",
      },
    },
  });
}
