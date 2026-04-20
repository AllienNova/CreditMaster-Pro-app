/**
 * Investment Portfolio API
 *
 * GET /api/investments/portfolio - Get user's portfolio overview
 */

import { NextRequest, NextResponse } from "next/server";
import { jwtValidation } from "@/lib/auth/jwt-validation";
import { getSupabase } from "@/lib/supabase/client";

const supabase = getSupabase();
import type {
  Portfolio,
  Holding,
  AllocationItem,
  PerformancePoint,
} from "@/lib/investments/types/portfolio.types";
import { marketDataService } from "@/lib/investments/market-data-service";
import { AssetType, TimeInterval } from "@/lib/investments/types/market-data.types";

export async function GET(request: NextRequest) {
  try {
    // Validate JWT token
    const validation = await jwtValidation.validateFromHeaders(request);
    if (!validation.valid || !validation.user?.id) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const userId = validation.user.id;
    const searchParams = request.nextUrl.searchParams;
    const period = searchParams.get("period") || "1M"; // 1M, 3M, 6M, 1Y, ALL

    // Fetch holdings from database
    const { data: holdingsData, error: holdingsError } = await supabase
      .from("investment_holdings")
      .select("*")
      .eq("user_id", userId);

    if (holdingsError) {
      // PortfolioRoute error: Failed to fetch holdings
      return NextResponse.json(
        { success: false, error: "Failed to fetch holdings" },
        { status: 500 },
      );
    }

    // Transform database records to Holding type
    const holdings: Holding[] = (holdingsData || []).map((h) => ({
      id: h.id,
      userId: h.user_id,
      symbol: h.symbol,
      name: h.name,
      shares: h.shares,
      averageCostBasis: h.average_cost_basis,
      currentPrice: h.current_price || h.average_cost_basis,
      totalValue: h.shares * (h.current_price || h.average_cost_basis),
      totalCost: h.shares * h.average_cost_basis,
      gainLoss:
        h.shares * (h.current_price || h.average_cost_basis) -
        h.shares * h.average_cost_basis,
      gainLossPercent:
        ((h.current_price || h.average_cost_basis) / h.average_cost_basis - 1) *
        100,
      sector: h.sector,
      assetType: h.asset_type,
      lastUpdated: new Date(h.updated_at),
      createdAt: new Date(h.created_at),
    }));

    // Calculate portfolio totals
    const totalValue = holdings.reduce((sum, h) => sum + h.totalValue, 0);
    const totalCost = holdings.reduce((sum, h) => sum + h.totalCost, 0);
    const totalGainLoss = totalValue - totalCost;
    const totalGainLossPercent =
      totalCost > 0 ? (totalGainLoss / totalCost) * 100 : 0;

    // Calculate day change from live quotes
    const { dayChange, dayChangePercent } = await calculateDayChange(holdings);

    // Calculate allocation by asset type
    const allocationMap = new Map<string, number>();
    holdings.forEach((h) => {
      const current = allocationMap.get(h.assetType) || 0;
      allocationMap.set(h.assetType, current + h.totalValue);
    });

    const allocation: AllocationItem[] = Array.from(allocationMap.entries())
      .map(([name, value]) => ({
        name: formatAssetType(name),
        value,
        percentage: totalValue > 0 ? (value / totalValue) * 100 : 0,
      }))
      .sort((a, b) => b.value - a.value);

    // Build performance history from live historical prices
    const { performanceHistory, performanceDataSource } =
      await buildPerformanceHistory(
        holdings,
        totalValue,
        period as "1M" | "3M" | "6M" | "1Y" | "ALL",
      );

    const portfolio: Portfolio = {
      userId,
      totalValue,
      totalCost,
      totalGainLoss,
      totalGainLossPercent,
      dayChange,
      dayChangePercent,
      holdings,
      allocation,
      performanceHistory,
      lastUpdated: new Date(),
    };

    return NextResponse.json({ success: true, data: portfolio, performanceDataSource });
  } catch (_error) {
    // PortfolioRoute error: API failed
    void _error;
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}

function formatAssetType(type: string): string {
  const map: Record<string, string> = {
    stock: "Stocks",
    etf: "ETFs",
    mutual_fund: "Mutual Funds",
    bond: "Bonds",
    crypto: "Cryptocurrency",
    option: "Options",
    other: "Other",
  };
  return map[type] || type;
}

/**
 * Calculate day change by comparing current price to previous close for each holding.
 * Returns zero values if quotes are unavailable.
 */
async function calculateDayChange(
  holdings: Holding[],
): Promise<{ dayChange: number; dayChangePercent: number }> {
  if (holdings.length === 0) {
    return { dayChange: 0, dayChangePercent: 0 };
  }

  const symbols = [...new Set(holdings.map((h) => h.symbol))];
  let totalDayChange = 0;
  let totalPrevValue = 0;

  await Promise.all(
    symbols.map(async (symbol) => {
      try {
        const quote = await marketDataService.getQuote(symbol, AssetType.STOCK);
        const q = quote as import("@/lib/investments/types/market-data.types").StockQuote;
        const symbolHoldings = holdings.filter((h) => h.symbol === symbol);
        const totalShares = symbolHoldings.reduce((s, h) => s + h.shares, 0);
        totalDayChange += q.change * totalShares;
        totalPrevValue += q.previousClose * totalShares;
      } catch {
        // Skip — leave values at zero for unavailable symbols
      }
    }),
  );

  const dayChangePercent =
    totalPrevValue > 0 ? (totalDayChange / totalPrevValue) * 100 : 0;

  return { dayChange: totalDayChange, dayChangePercent };
}

/**
 * Build portfolio performance history from real historical prices.
 * Returns an empty array (not fake data) when historical data is unavailable.
 */
async function buildPerformanceHistory(
  holdings: Holding[],
  currentValue: number,
  period: "1M" | "3M" | "6M" | "1Y" | "ALL",
): Promise<{
  performanceHistory: PerformancePoint[];
  performanceDataSource: "live" | "unavailable";
}> {
  if (holdings.length === 0) {
    return { performanceHistory: [], performanceDataSource: "unavailable" };
  }

  const periodDays = { "1M": 30, "3M": 90, "6M": 180, "1Y": 365, ALL: 730 };
  const days = periodDays[period];
  const symbols = [...new Set(holdings.map((h) => h.symbol))];

  // Fetch historical data for each unique symbol
  const historicalBySymbol = new Map<
    string,
    Array<{ date: string; close: number }>
  >();
  let anyLive = false;

  await Promise.all(
    symbols.map(async (symbol) => {
      try {
        const history = await marketDataService.getHistory(
          symbol,
          AssetType.STOCK,
          TimeInterval.ONE_DAY,
          days,
        );
        if (history.data.length > 0) {
          anyLive = true;
          const bars = history.data
            .map((bar) => ({
              date: (bar.timestamp instanceof Date
                ? bar.timestamp
                : new Date(bar.timestamp)
              )
                .toISOString()
                .split("T")[0],
              close: bar.close,
            }))
            .sort((a, b) => a.date.localeCompare(b.date));
          historicalBySymbol.set(symbol, bars);
        }
      } catch {
        // Skip unavailable symbols
      }
    }),
  );

  if (!anyLive) {
    return { performanceHistory: [], performanceDataSource: "unavailable" };
  }

  // Collect all trading dates present across all symbols
  const allDates = new Set<string>();
  historicalBySymbol.forEach((bars) => bars.forEach((b) => allDates.add(b.date)));
  const sortedDates = [...allDates].sort();

  // Build a price lookup: symbol → date → close
  const priceMap = new Map<string, Map<string, number>>();
  historicalBySymbol.forEach((bars, symbol) => {
    const byDate = new Map<string, number>();
    bars.forEach((b) => byDate.set(b.date, b.close));
    priceMap.set(symbol, byDate);
  });

  // For each date, sum portfolio value across all holdings
  const points: PerformancePoint[] = sortedDates.map((date) => {
    let value = 0;
    holdings.forEach((h) => {
      const byDate = priceMap.get(h.symbol);
      if (byDate) {
        // Walk backward to find the nearest available price on or before this date
        const price = byDate.get(date);
        if (price !== undefined) {
          value += price * h.shares;
        }
      }
    });
    return { date, value: Math.round(value * 100) / 100 };
  });

  // Filter out dates where we got zero (no price data at all)
  const nonZero = points.filter((p) => p.value > 0);

  if (nonZero.length === 0) {
    return { performanceHistory: [], performanceDataSource: "unavailable" };
  }

  // Ensure the last point reflects current portfolio value
  nonZero[nonZero.length - 1] = {
    date: new Date().toISOString().split("T")[0],
    value: currentValue,
  };

  return { performanceHistory: nonZero, performanceDataSource: "live" };
}
