/**
 * Trading Compliance API Route
 *
 * Handles 30-law compliance evaluation:
 * - GET: Retrieve compliance evaluation history
 * - POST: Evaluate a trading signal against compliance laws
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  createComplianceScorer,
  type ComplianceContext,
} from "@/lib/trading/compliance";
import type { OperatingMode } from "@/lib/trading/modes/mode-types";

// ============================================================================
// VALID SIGNAL TYPES
// ============================================================================

const VALID_SIGNAL_TYPES = new Set(["buy", "sell", "hold"]);

// ============================================================================
// GET - Retrieve Compliance History
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;

    const symbol = searchParams.get("symbol");
    const signalType = searchParams.get("signalType");
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    // Build query
    let query = supabase
      .from("compliance_scores")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (symbol) {
      query = query.eq("symbol", symbol);
    }
    if (signalType) {
      query = query.eq("signal_type", signalType);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json(
        { error: "Failed to retrieve compliance history" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        scores: data || [],
        count: (data || []).length,
        offset,
        limit,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (_error) {
    void _error;
    return NextResponse.json(
      { error: "Failed to retrieve compliance history" },
      { status: 500 },
    );
  }
}

// ============================================================================
// POST - Evaluate Compliance
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as Record<string, unknown>;

    // Validate required fields
    const symbol = body.symbol as string | undefined;
    if (!symbol) {
      return NextResponse.json(
        { error: "symbol is required" },
        { status: 400 },
      );
    }

    const signalType = body.signalType as string | undefined;
    if (!signalType || !VALID_SIGNAL_TYPES.has(signalType)) {
      return NextResponse.json(
        { error: 'signalType is required and must be "buy", "sell", or "hold"' },
        { status: 400 },
      );
    }

    const currentPrice = Number(body.currentPrice);
    if (!Number.isFinite(currentPrice) || currentPrice <= 0) {
      return NextResponse.json(
        { error: "currentPrice must be a positive number" },
        { status: 400 },
      );
    }

    const signalStrength = Number(body.signalStrength ?? 50);
    if (!Number.isFinite(signalStrength)) {
      return NextResponse.json(
        { error: "signalStrength must be a number" },
        { status: 400 },
      );
    }

    const operatingMode =
      (body.operatingMode as OperatingMode) || "watch";

    // Build compliance context
    const context: ComplianceContext = {
      userId: user.id,
      signalId: (body.signalId as string) || undefined,
      symbol,
      signalType: signalType as ComplianceContext["signalType"],
      operatingMode,
      signalStrength,
      currentPrice,
      stopLossPrice:
        body.stopLossPrice !== undefined
          ? Number(body.stopLossPrice)
          : undefined,
      takeProfitPrice:
        body.takeProfitPrice !== undefined
          ? Number(body.takeProfitPrice)
          : undefined,
      positionSize:
        body.positionSize !== undefined
          ? Number(body.positionSize)
          : undefined,
      portfolioValue:
        body.portfolioValue !== undefined
          ? Number(body.portfolioValue)
          : undefined,
      openPositions:
        body.openPositions !== undefined
          ? Number(body.openPositions)
          : undefined,
      maxPositions:
        body.maxPositions !== undefined
          ? Number(body.maxPositions)
          : undefined,
      dailyPnlPct:
        body.dailyPnlPct !== undefined
          ? Number(body.dailyPnlPct)
          : undefined,
      maxDailyLossPct:
        body.maxDailyLossPct !== undefined
          ? Number(body.maxDailyLossPct)
          : undefined,
      regimeType: (body.regimeType as string) || undefined,
      relativeVolume:
        body.relativeVolume !== undefined
          ? Number(body.relativeVolume)
          : undefined,
      atr: body.atr !== undefined ? Number(body.atr) : undefined,
      extendedHours:
        body.extendedHours !== undefined
          ? Boolean(body.extendedHours)
          : undefined,
      riskRewardRatio:
        body.riskRewardRatio !== undefined
          ? Number(body.riskRewardRatio)
          : undefined,
      portfolioCorrelation:
        body.portfolioCorrelation !== undefined
          ? Number(body.portfolioCorrelation)
          : undefined,
      sector: (body.sector as string) || undefined,
      existingSectors: Array.isArray(body.existingSectors)
        ? (body.existingSectors as string[])
        : undefined,
      daysSinceLastTrade:
        body.daysSinceLastTrade !== undefined
          ? Number(body.daysSinceLastTrade)
          : undefined,
      additionalContext:
        (body.additionalContext as Record<string, unknown>) || undefined,
    };

    // Evaluate compliance
    const scorer = createComplianceScorer();
    const result = scorer.evaluateSignal(context);

    return NextResponse.json({
      success: true,
      data: {
        compositeScore: result.compositeScore,
        shouldBlock: result.shouldBlock,
        hasCriticalViolation: result.hasCriticalViolation,
        applicableLaws: result.applicableLaws,
        passingLaws: result.passingLaws,
        failingLaws: result.failingLaws,
        violations: result.violations,
        summary: result.summary,
        context: result.context,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (_error) {
    void _error;
    return NextResponse.json(
      { error: "Failed to evaluate compliance" },
      { status: 500 },
    );
  }
}
