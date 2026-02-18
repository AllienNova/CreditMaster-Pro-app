/**
 * Stock Analysis API Route
 *
 * GET /api/investments/analyze/[symbol] - Get comprehensive stock analysis
 * POST /api/investments/analyze/[symbol] - Request custom analysis with options
 */

import { NextRequest, NextResponse } from "next/server";
import { jwtValidation } from "@/lib/auth/jwt-validation";
import { aiStockAnalyst } from "@/lib/investments/ai-stock-analyst";
import type {
  StockAnalysisRequest,
  AnalysisType,
} from "@/lib/investments/types/stock-analysis.types";

interface RouteParams {
  params: Promise<{ symbol: string }>;
}

/**
 * GET /api/investments/analyze/[symbol]
 * Get comprehensive stock analysis with default options
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    // Validate JWT
    const validation = await jwtValidation.validateFromHeaders(request);
    if (!validation.valid) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const { symbol } = await params;

    if (!symbol || symbol.length < 1 || symbol.length > 10) {
      return NextResponse.json(
        { success: false, error: "Invalid symbol. Must be 1-10 characters." },
        { status: 400 },
      );
    }

    // Perform analysis with default options
    const analysisRequest: StockAnalysisRequest = {
      symbol: symbol.toUpperCase(),
      analysisTypes: ["technical", "fundamental", "sentiment", "ai"],
      includeAI: true,
      timeframe: "medium",
      riskTolerance: "moderate",
    };

    const result = await aiStockAnalyst.analyzeStock(analysisRequest);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      data: result.data,
      meta: {
        processingTime: result.processingTime,
        dataFreshness: result.dataFreshness,
      },
    });
  } catch (error) {
    console.error("Stock analysis error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 },
    );
  }
}

/**
 * POST /api/investments/analyze/[symbol]
 * Request custom analysis with specific options
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    // Validate JWT
    const validation = await jwtValidation.validateFromHeaders(request);
    if (!validation.valid) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const { symbol } = await params;

    if (!symbol || symbol.length < 1 || symbol.length > 10) {
      return NextResponse.json(
        { success: false, error: "Invalid symbol. Must be 1-10 characters." },
        { status: 400 },
      );
    }

    // Parse request body
    const body = await request.json();

    // Validate analysis types
    const validAnalysisTypes: AnalysisType[] = [
      "technical",
      "fundamental",
      "sentiment",
      "risk",
      "ai",
    ];
    const analysisTypes =
      body.analysisTypes?.filter((t: string) =>
        validAnalysisTypes.includes(t as AnalysisType),
      ) || validAnalysisTypes;

    // Validate timeframe
    const validTimeframes = ["short", "medium", "long"];
    const timeframe = validTimeframes.includes(body.timeframe)
      ? body.timeframe
      : "medium";

    // Validate risk tolerance
    const validRiskTolerances = ["conservative", "moderate", "aggressive"];
    const riskTolerance = validRiskTolerances.includes(body.riskTolerance)
      ? body.riskTolerance
      : "moderate";

    const analysisRequest: StockAnalysisRequest = {
      symbol: symbol.toUpperCase(),
      analysisTypes,
      includeAI: body.includeAI !== false,
      timeframe,
      riskTolerance,
    };

    const result = await aiStockAnalyst.analyzeStock(analysisRequest);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      data: result.data,
      meta: {
        processingTime: result.processingTime,
        dataFreshness: result.dataFreshness,
        requestOptions: {
          analysisTypes,
          timeframe,
          riskTolerance,
          includeAI: body.includeAI !== false,
        },
      },
    });
  } catch (error) {
    console.error("Stock analysis error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 },
    );
  }
}
