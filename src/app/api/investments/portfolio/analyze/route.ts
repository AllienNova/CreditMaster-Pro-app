/**
 * Portfolio Analysis API
 *
 * Comprehensive portfolio risk and performance analysis
 */

import { NextRequest, NextResponse } from "next/server";
import { jwtValidation } from "@/lib/auth/jwt-validation";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

// ============================================================================
// POST - Analyze Portfolio
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const validation = await jwtValidation.validateFromHeaders(request);
    if (!validation.valid || !validation.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      holdings,
      includeStressTest = false,
      includeRebalance = false,
      targetAllocation,
    } = body;

    if (!holdings || !Array.isArray(holdings) || holdings.length === 0) {
      return NextResponse.json(
        { error: "Holdings array required" },
        { status: 400 },
      );
    }

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
}

// ============================================================================
// GET - Get user's portfolio analysis
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    const validation = await jwtValidation.validateFromHeaders(request);
    if (!validation.valid || !validation.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = validation.user.id;

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
}
