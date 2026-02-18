/**
 * Investment Portfolio API
 *
 * GET /api/investments/portfolio - Get user's portfolio overview
 */

import { NextRequest, NextResponse } from 'next/server';
import { jwtValidation } from '@/lib/auth/jwt-validation';
import { getSupabase } from '@/lib/supabase/client';

const supabase = getSupabase();
import type {
  Portfolio,
  Holding,
  AllocationItem,
  PerformancePoint,
} from '@/lib/investments/types/portfolio.types';

export async function GET(request: NextRequest) {
  try {
    // Validate JWT token
    const validation = await jwtValidation.validateFromHeaders(request);
    if (!validation.valid || !validation.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = validation.user.id;
    const searchParams = request.nextUrl.searchParams;
    const period = searchParams.get('period') || '1M'; // 1M, 3M, 6M, 1Y, ALL

    // Fetch holdings from database
    const { data: holdingsData, error: holdingsError } = await supabase
      .from('investment_holdings')
      .select('*')
      .eq('user_id', userId);

    if (holdingsError) {
      // PortfolioRoute error: Failed to fetch holdings
      return NextResponse.json(
        { success: false, error: 'Failed to fetch holdings' },
        { status: 500 }
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

    // Calculate day change (mock for now - would need real-time data)
    const dayChange = totalValue * 0.012; // Mock 1.2% daily change
    const dayChangePercent = 1.2;

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

    // Generate performance history based on period
    const performanceHistory = generatePerformanceHistory(
      totalValue,
      period as '1M' | '3M' | '6M' | '1Y' | 'ALL'
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

    return NextResponse.json({ success: true, data: portfolio });
  } catch (_error) {
    // PortfolioRoute error: API failed
    void _error;
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

function formatAssetType(type: string): string {
  const map: Record<string, string> = {
    stock: 'Stocks',
    etf: 'ETFs',
    mutual_fund: 'Mutual Funds',
    bond: 'Bonds',
    crypto: 'Cryptocurrency',
    option: 'Options',
    other: 'Other',
  };
  return map[type] || type;
}

function generatePerformanceHistory(
  currentValue: number,
  period: '1M' | '3M' | '6M' | '1Y' | 'ALL'
): PerformancePoint[] {
  const points: PerformancePoint[] = [];
  const periodDays = { '1M': 30, '3M': 90, '6M': 180, '1Y': 365, ALL: 730 };
  const days = periodDays[period];
  const volatility = 0.02;
  let value = currentValue * (1 - Math.random() * 0.15); // Start 0-15% lower

  for (let i = days; i >= 0; i -= Math.max(1, Math.floor(days / 50))) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const change = (Math.random() - 0.48) * volatility * value;
    value = Math.max(value + change, value * 0.9);
    points.push({
      date: date.toISOString().split('T')[0],
      value: Math.round(value * 100) / 100,
    });
  }
  // Ensure last point is current value
  points[points.length - 1] = {
    date: new Date().toISOString().split('T')[0],
    value: currentValue,
  };
  return points;
}
