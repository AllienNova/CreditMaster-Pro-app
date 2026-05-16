/**
 * Trading Signals API
 *
 * Phase 5.1.3: Enhanced with Zod validation, rate limiting, and advanced filtering
 * Endpoints for generating and managing trading signals
 */

import { NextRequest, NextResponse } from "next/server";
import { SignalGenerator } from "@/lib/investments/signal-generator";
import { withAuth, type AuthedUser } from "@/lib/auth/api-guard";
import {
  AnalysisType,
  SignalFiltersSchema,
  SignalType,
  SignalStatus,
} from "@/lib/investments/types/trading-signals.types";
import { Timeframe } from "@/lib/investments/types/investment.types";
import { z } from "zod";
import { rateLimit } from "@/lib/security/redis-rate-limiting";

// Initialize signal generator
const signalGenerator = new SignalGenerator();

// Rate limiter: 100 requests per hour per user
const limiter = rateLimit({
  interval: 60 * 60 * 1000, // 1 hour
  uniqueTokenPerInterval: 500,
});

// Request validation schemas
const GenerateSignalSchema = z.object({
  symbol: z.string().min(1).max(10).toUpperCase(),
  assetType: z.enum(["stock", "etf", "crypto", "option"]).default("stock"),
  analysisTypes: z
    .array(z.nativeEnum(AnalysisType))
    .default([
      AnalysisType.TECHNICAL,
      AnalysisType.FUNDAMENTAL,
      AnalysisType.SENTIMENT,
      AnalysisType.AI_COMBINED,
    ]),
  timeframe: z
    .enum(["1m", "5m", "15m", "30m", "1h", "4h", "1d", "1w", "1M"] as const)
    .default("1d"),
});

/**
 * GET /api/investments/signals
 * Get signal history for the authenticated user with advanced filtering
 *
 * Query Parameters:
 * - symbols: string[] - Filter by symbols (comma-separated)
 * - signalTypes: SignalType[] - Filter by signal types (comma-separated)
 * - statuses: SignalStatus[] - Filter by statuses (comma-separated)
 * - assetTypes: string[] - Filter by asset types (comma-separated)
 * - minConfidence: number - Minimum confidence (0-1)
 * - minStrength: number - Minimum strength (0-100)
 * - startDate: string - Start date (ISO format)
 * - endDate: string - End date (ISO format)
 * - limit: number - Max results (default: 20, max: 100)
 * - offset: number - Pagination offset (default: 0)
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

    const filters: Partial<z.infer<typeof SignalFiltersSchema>> = {};

    // Parse array parameters
    if (searchParams.get("symbols")) {
      filters.symbols = searchParams
        .get("symbols")!
        .split(",")
        .map((s) => s.trim().toUpperCase());
    }
    if (searchParams.get("signalTypes")) {
      filters.signalTypes = searchParams
        .get("signalTypes")!
        .split(",") as SignalType[];
    }
    if (searchParams.get("statuses")) {
      filters.statuses = searchParams
        .get("statuses")!
        .split(",") as SignalStatus[];
    }
    if (searchParams.get("assetTypes")) {
      filters.assetTypes = searchParams.get("assetTypes")!.split(",") as ("stock" | "etf" | "crypto" | "option")[];
    }

    // Parse numeric parameters
    if (searchParams.get("minConfidence")) {
      filters.minConfidence = parseFloat(searchParams.get("minConfidence")!);
    }
    if (searchParams.get("minStrength")) {
      filters.minStrength = parseInt(searchParams.get("minStrength")!);
    }

    // Parse date parameters
    if (searchParams.get("startDate")) {
      filters.startDate = new Date(searchParams.get("startDate")!);
    }
    if (searchParams.get("endDate")) {
      filters.endDate = new Date(searchParams.get("endDate")!);
    }

    // Parse pagination parameters
    if (searchParams.get("limit")) {
      filters.limit = Math.min(parseInt(searchParams.get("limit")!), 100);
    }
    if (searchParams.get("offset")) {
      filters.offset = parseInt(searchParams.get("offset")!);
    }

    // Validate filters
    const validatedFilters = SignalFiltersSchema.partial().parse(filters);

    const signals = await signalGenerator.getSignalHistory(
      user.id,
      validatedFilters,
    );

    return NextResponse.json({
      success: true,
      data: signals,
      count: signals.length,
      filters: validatedFilters,
    });
  } catch (error) {
    console.error("Error fetching signals:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid filter parameters", details: error.issues },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: "Failed to fetch signals" },
      { status: 500 },
    );
  }
});

/**
 * POST /api/investments/signals
 * Generate a new trading signal with multi-model AI consensus
 *
 * Request Body:
 * {
 *   symbol: string (required) - Stock symbol (e.g., "AAPL")
 *   assetType: 'stock' | 'etf' | 'crypto' | 'option' (default: 'stock')
 *   analysisTypes: AnalysisType[] (default: all types)
 *   timeframe: Timeframe (default: '1d')
 * }
 */
export const POST = withAuth(async (request: NextRequest, user: AuthedUser) => {
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

    const body = await request.json();

    // Validate request body with Zod
    const validatedData = GenerateSignalSchema.parse(body);

    // Generate signal with multi-model AI consensus
    const signal = await signalGenerator.generateSignal(
      user.id,
      validatedData.symbol,
      validatedData.assetType,
      validatedData.analysisTypes,
      validatedData.timeframe as Timeframe,
    );

    return NextResponse.json(
      {
        success: true,
        data: signal,
        message: `${signal.signalType.toUpperCase()} signal generated for ${validatedData.symbol}`,
        metadata: {
          modelsUsed: signal.metadata?.modelsUsed || [],
          consensusScore: signal.consensusScore,
          confidence: signal.confidence,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Error generating signal:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request body", details: error.issues },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        error: "Failed to generate signal",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
});
