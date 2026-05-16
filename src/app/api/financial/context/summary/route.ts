/**
 * Financial Context Summary API
 *
 * GET /api/financial/context/summary - Get lightweight financial summary
 *
 * Returns a condensed view of the user's financial situation without
 * the full transaction history and detailed breakdowns. Ideal for
 * dashboard widgets and quick status checks.
 */

import { NextRequest, NextResponse } from "next/server";
import { withPermission } from "@/lib/auth/api-guard";
import type { AuthedUser } from "@/lib/auth/api-guard";
import { financialContextEngine } from "@/lib/financial/financial-context-engine";

/**
 * GET /api/financial/context/summary
 * Returns a lightweight financial summary for the authenticated user
 *
 * @example
 * GET /api/financial/context/summary
 *
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "netWorth": 50000,
 *     "totalAssets": 75000,
 *     "totalLiabilities": 25000,
 *     "monthlyIncome": 5000,
 *     "monthlyExpenses": 3500,
 *     "monthlySavings": 1500,
 *     "savingsRate": 30,
 *     "totalDebt": 25000,
 *     "debtToIncomeRatio": 25,
 *     "creditScore": 720,
 *     "healthScore": 78,
 *     "healthGrade": "C",
 *     "activeGoals": 3,
 *     "goalProgress": 45
 *   }
 * }
 */
export const GET = withPermission(
  "financial:read",
  async (request: NextRequest, user: AuthedUser) => {
  try {


    const summary = await financialContextEngine.getFinancialSummary(
      user.id,
    );

    return NextResponse.json({
      success: true,
      data: summary,
    });
  } catch (error) {
    console.error("Error fetching financial summary:", error);
    return NextResponse.json(
      { error: "Failed to fetch financial summary" },
      { status: 500 },
    );
  }
},
);
