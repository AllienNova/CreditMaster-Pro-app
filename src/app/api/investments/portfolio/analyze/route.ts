/**
 * Portfolio Analysis API
 *
 * Comprehensive portfolio risk and performance analysis
 */

import { NextRequest, NextResponse } from "next/server";
import { withAuth, type AuthedUser } from "@/lib/auth/api-guard";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

let _supabase: SupabaseClient | null = null;
const supabase = new Proxy({} as SupabaseClient, {
  get(_t, prop, recv) {
    if (!_supabase)
      _supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
      );
    const v = Reflect.get(_supabase, prop, recv);
    return typeof v === "function" ? v.bind(_supabase) : v;
  },
});

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const HOLDINGS_MAX_LENGTH = 500;

const holdingSchema = z.object({
  symbol: z.string().min(1),
  shares: z.number().finite().positive(),
  costBasis: z.number().finite().nonnegative(),
  currentPrice: z.number().finite().nonnegative(),
  sector: z.string().optional(),
  assetClass: z
    .enum(["stock", "etf", "bond", "crypto", "commodity", "cash", "option", "reit"])
    .optional(),
});

const analyzeBodySchema = z.object({
  holdings: z.array(holdingSchema).min(1).max(HOLDINGS_MAX_LENGTH),
  includeStressTest: z.boolean().optional().default(false),
  includeRebalance: z.boolean().optional().default(false),
  targetAllocation: z.record(z.string(), z.number()).optional(),
});

// ============================================================================
// POST - Analyze Portfolio
// ============================================================================

export const POST = withAuth(
  async (request: NextRequest, _user: AuthedUser) => {
  try {
    const rawBody = await request.json();

    const parsed = analyzeBodySchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 },
      );
    }

    const {
      holdings,
      includeStressTest,
      includeRebalance,
      targetAllocation,
    } = parsed.data;

    // Import portfolio analysis service
    const { PortfolioAnalysisService } =
      await import("@/lib/investments/services/PortfolioAnalysisService");
    const portfolioService = new PortfolioAnalysisService();

    // Run main analysis
    const metrics = portfolioService.analyzePortfolio(holdings);

    // Run diversification analysis
    const diversification = portfolioService.analyzeDiversification(holdings);

    // Optional stress testing
    let stressTests = null;
    if (includeStressTest) {
      stressTests = portfolioService.runStressTests(holdings);
    }

    // Optional rebalancing recommendation
    let rebalanceRecommendation = null;
    if (includeRebalance && targetAllocation) {
      rebalanceRecommendation =
        portfolioService.generateRebalanceRecommendation(
          holdings,
          targetAllocation,
        );
    }

    return NextResponse.json({
      metrics,
      diversification,
      stressTests,
      rebalanceRecommendation,
      summary: {
        totalValue: metrics.totalValue,
        totalGainLoss: metrics.totalGainLoss,
        sharpeRatio: metrics.sharpeRatio,
        diversificationScore: diversification.score,
        riskLevel:
          metrics.volatility > 0.25
            ? "high"
            : metrics.volatility > 0.15
              ? "moderate"
              : "low",
      },
    });
  } catch (_error) {
    // PortfolioAnalyzeRoute error: Analysis failed
    void _error;
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
  },
);

// ============================================================================
// GET - Get user's portfolio analysis
// ============================================================================

export const GET = withAuth(async (_request: NextRequest, user: AuthedUser) => {
  try {
    const userId = user.id;

    // Fetch user's holdings from database
    const { data: holdingsData, error } = await supabase
      .from("investment_holdings")
      .select("*")
      .eq("user_id", userId);

    if (error) {
      // PortfolioAnalyzeRoute error: Failed to fetch holdings
      return NextResponse.json(
        { error: "Failed to fetch holdings" },
        { status: 500 },
      );
    }

    if (!holdingsData || holdingsData.length === 0) {
      return NextResponse.json({
        message: "No holdings found",
        metrics: null,
        diversification: null,
      });
    }

    // Transform to PortfolioHolding format
    const holdings = holdingsData.map((h) => ({
      symbol: h.symbol,
      shares: h.shares,
      costBasis: h.cost_basis,
      currentPrice: h.current_price || h.cost_basis,
      sector: h.sector,
      assetClass: h.asset_class || "stock",
    }));

    // Run analysis
    const { PortfolioAnalysisService } =
      await import("@/lib/investments/services/PortfolioAnalysisService");
    const portfolioService = new PortfolioAnalysisService();

    const metrics = portfolioService.analyzePortfolio(holdings);
    const diversification = portfolioService.analyzeDiversification(holdings);

    return NextResponse.json({
      holdings: holdingsData,
      metrics,
      diversification,
      summary: {
        totalValue: metrics.totalValue,
        totalGainLoss: metrics.totalGainLoss,
        sharpeRatio: metrics.sharpeRatio,
        diversificationScore: diversification.score,
      },
    });
  } catch (_error) {
    // PortfolioAnalyzeRoute error: GET failed
    void _error;
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
});
