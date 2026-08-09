/**
 * AI Financial Coach - Debt Strategy API
 *
 * GET /api/ai/financial-coach/debt - Get debt strategy analysis
 * POST /api/ai/financial-coach/debt/analyze - Generate debt payoff strategies
 */

import { NextRequest, NextResponse } from "next/server";
import { withAuth, type AuthedUser } from "@/lib/auth/api-guard";
import { debtStrategyEngine } from "@/lib/financial/debt-strategy-engine";

export const GET = withAuth(async (request: NextRequest, user: AuthedUser) => {
  try {
    const searchParams = request.nextUrl.searchParams;
    const extraMonthlyPayment = searchParams.get("extraPayment")
      ? parseFloat(searchParams.get("extraPayment")!)
      : 0;
    const includeRefinancing =
      searchParams.get("includeRefinancing") !== "false";
    const targetPayoffDate = searchParams.get("targetPayoffDate")
      ? new Date(searchParams.get("targetPayoffDate")!)
      : undefined;

    const result = await debtStrategyEngine.analyzeDebtStrategy({
      userId: user.id,
      extraMonthlyPayment,
      includeRefinancing,
      targetPayoffDate,
    });

    return NextResponse.json(result);
  } catch (_error) {
    // FinancialCoachDebtRoute error: Failed to fetch strategy
    void _error;
    return NextResponse.json(
      { error: "Failed to fetch debt strategy" },
      { status: 500 },
    );
  }
});

export const POST = withAuth(async (request: NextRequest, user: AuthedUser) => {
  try {
    const body = await request.json();
    const {
      extraMonthlyPayment = 0,
      includeRefinancing = true,
      targetPayoffDate,
    } = body;

    const result = await debtStrategyEngine.analyzeDebtStrategy({
      userId: user.id,
      extraMonthlyPayment: parseFloat(String(extraMonthlyPayment)),
      includeRefinancing,
      targetPayoffDate: targetPayoffDate
        ? new Date(targetPayoffDate)
        : undefined,
    });

    return NextResponse.json(result);
  } catch (_error) {
    // FinancialCoachDebtRoute error: Analysis failed
    void _error;
    return NextResponse.json(
      { error: "Failed to analyze debt strategy" },
      { status: 500 },
    );
  }
});
