/**
 * Investment Dividends API
 *
 * GET /api/investments/dividends - Get dividend tracking data for user holdings
 */

import { NextRequest, NextResponse } from "next/server";
import { jwtValidation } from "@/lib/auth/jwt-validation";
import { getDividendTrackingService } from "@/lib/investments/services/DividendTrackingService";
import type {
  DividendStock,
  DividendFrequency,
} from "@/lib/investments/services/DividendTrackingService";

interface DividendHoldingResponse {
  symbol: string;
  name: string;
  shares: number;
  dividendPerShare: number;
  annualDividend: number;
  yield: number;
  frequency: DividendFrequency;
  nextPayDate: string | null;
  lastPayDate: string | null;
}

interface DividendResponse {
  holdings: DividendHoldingResponse[];
  totalAnnualIncome: number;
  averageYield: number;
  nextPaymentDate: string | null;
}

function mapStockToResponse(stock: DividendStock): DividendHoldingResponse {
  return {
    symbol: stock.symbol,
    name: stock.companyName,
    shares: stock.sharesHeld,
    dividendPerShare: stock.annualDividend,
    annualDividend: stock.annualDividend * stock.sharesHeld,
    yield: stock.dividendYield,
    frequency: stock.frequency,
    nextPayDate: stock.nextPayDate ? stock.nextPayDate.toISOString() : null,
    lastPayDate: null,
  };
}

export async function GET(request: NextRequest) {
  try {
    const validation = await jwtValidation.validateFromHeaders(request);
    if (!validation.valid || !validation.user?.id) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const userId = validation.user.id;
    const service = getDividendTrackingService();

    const dividendStocks = await service.getDividendStocks(userId);

    const holdings = dividendStocks.map(mapStockToResponse);

    const totalAnnualIncome = holdings.reduce(
      (sum, h) => sum + h.annualDividend,
      0,
    );

    const averageYield =
      holdings.length > 0
        ? holdings.reduce((sum, h) => sum + h.yield, 0) / holdings.length
        : 0;

    const upcomingPayments = dividendStocks
      .filter((s) => s.nextPayDate && s.nextPayDate > new Date())
      .sort(
        (a, b) => a.nextPayDate!.getTime() - b.nextPayDate!.getTime(),
      );

    const nextPaymentDate =
      upcomingPayments.length > 0
        ? upcomingPayments[0].nextPayDate!.toISOString()
        : null;

    const response: DividendResponse = {
      holdings,
      totalAnnualIncome,
      averageYield,
      nextPaymentDate,
    };

    return NextResponse.json({
      success: true,
      data: response,
    });
  } catch (_error) {
    void _error;
    return NextResponse.json(
      { success: false, error: "Failed to fetch dividend data" },
      { status: 500 },
    );
  }
}
