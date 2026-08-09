/**
 * AI Spending Analysis API
 * GET /api/ai/spending-analysis - Get spending pattern analysis
 * POST /api/ai/spending-analysis - Analyze a specific transaction for risk
 */

import { NextRequest, NextResponse } from "next/server";
import { withAuth, type AuthedUser } from "@/lib/auth/api-guard";
import { getSpendingAnalyzer } from "@/lib/ai-personalization";

export const GET = withAuth(async (request: NextRequest, user: AuthedUser) => {
  try {
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get("days") ?? "30", 10);

    const analyzer = getSpendingAnalyzer();
    const analysis = await analyzer.analyzeSpendingPatterns(user.id, days);

    return NextResponse.json(analysis);
  } catch (_error) {
    // SpendingAnalysisRoute error: Analysis failed
    void _error;
    return NextResponse.json(
      { error: "Failed to analyze spending" },
      { status: 500 },
    );
  }
});

export const POST = withAuth(async (request: NextRequest, user: AuthedUser) => {
  try {
    const body = await request.json();
    const { transaction } = body;

    if (
      !transaction ||
      !transaction.amount ||
      !transaction.merchant ||
      !transaction.category
    ) {
      return NextResponse.json(
        { error: "Transaction details required" },
        { status: 400 },
      );
    }

    const analyzer = getSpendingAnalyzer();
    const riskAnalysis = await analyzer.analyzeTransactionRisk(user.id, {
      ...transaction,
      timestamp: transaction.timestamp ?? new Date().toISOString(),
    });

    // Create alert if risk is elevated
    if (riskAnalysis.recommendedIntervention !== "none") {
      const alert = await analyzer.createSpendingAlert(user.id, riskAnalysis);
      return NextResponse.json({
        ...riskAnalysis,
        alertId: alert.id,
      });
    }

    return NextResponse.json(riskAnalysis);
  } catch (_error) {
    // SpendingAnalysisRoute error: Transaction risk analysis failed
    void _error;
    return NextResponse.json(
      { error: "Failed to analyze transaction" },
      { status: 500 },
    );
  }
});
