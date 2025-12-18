/**
 * Investment Holdings API
 *
 * GET /api/investments/holdings - List all holdings
 * POST /api/investments/holdings - Create a new holding
 */

import { NextRequest, NextResponse } from 'next/server';
import { jwtValidation } from '@/lib/auth/jwt-validation';
import { supabase } from '@/lib/supabase';
import type {
  Holding,
  HoldingCreateInput,
} from '@/lib/investments/types/portfolio.types';

export async function GET(request: NextRequest) {
  try {
    const validation = await jwtValidation.validateFromHeaders(request);
    if (!validation.valid || !validation.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = validation.user.id;
    const searchParams = request.nextUrl.searchParams;
    const sortBy = searchParams.get('sortBy') || 'symbol';
    const sortDir = searchParams.get('sortDir') || 'asc';
    const assetType = searchParams.get('assetType');

    let query = supabase
      .from('investment_holdings')
      .select('*')
      .eq('user_id', userId);

    if (assetType) {
      query = query.eq('asset_type', assetType);
    }

    const sortColumn =
      sortBy === 'value'
        ? 'current_price'
        : sortBy === 'gainLoss'
          ? 'current_price'
          : 'symbol';
    query = query.order(sortColumn, { ascending: sortDir === 'asc' });

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching holdings:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch holdings' },
        { status: 500 }
      );
    }

    const holdings: Holding[] = (data || []).map((h) => ({
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

    return NextResponse.json({
      success: true,
      data: holdings,
      total: holdings.length,
    });
  } catch (error) {
    console.error('Holdings GET error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const validation = await jwtValidation.validateFromHeaders(request);
    if (!validation.valid || !validation.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = validation.user.id;
    const body: HoldingCreateInput = await request.json();

    // Validate required fields
    if (!body.symbol || !body.shares || !body.averageCostBasis) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check if holding already exists for this symbol
    const { data: existing } = await supabase
      .from('investment_holdings')
      .select('id, shares, average_cost_basis')
      .eq('user_id', userId)
      .eq('symbol', body.symbol.toUpperCase())
      .single();

    if (existing) {
      // Update existing holding with new average cost basis
      const newTotalShares = existing.shares + body.shares;
      const newTotalCost =
        existing.shares * existing.average_cost_basis +
        body.shares * body.averageCostBasis;
      const newAvgCost = newTotalCost / newTotalShares;

      const { data, error } = await supabase
        .from('investment_holdings')
        .update({
          shares: newTotalShares,
          average_cost_basis: newAvgCost,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
        .select()
        .single();

      if (error) throw error;

      return NextResponse.json({
        success: true,
        data: transformHolding(data),
        message: 'Holding updated with new shares',
      });
    }

    // Create new holding
    const { data, error } = await supabase
      .from('investment_holdings')
      .insert({
        user_id: userId,
        symbol: body.symbol.toUpperCase(),
        name: body.name || body.symbol.toUpperCase(),
        shares: body.shares,
        average_cost_basis: body.averageCostBasis,
        current_price: body.averageCostBasis,
        asset_type: body.assetType || 'stock',
        sector: body.sector,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(
      { success: true, data: transformHolding(data) },
      { status: 201 }
    );
  } catch (error) {
    console.error('Holdings POST error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

function transformHolding(h: Record<string, unknown>): Holding {
  const shares = h.shares as number;
  const avgCost = h.average_cost_basis as number;
  const currentPrice = (h.current_price as number) || avgCost;
  return {
    id: h.id as string,
    userId: h.user_id as string,
    symbol: h.symbol as string,
    name: h.name as string,
    shares,
    averageCostBasis: avgCost,
    currentPrice,
    totalValue: shares * currentPrice,
    totalCost: shares * avgCost,
    gainLoss: shares * currentPrice - shares * avgCost,
    gainLossPercent: (currentPrice / avgCost - 1) * 100,
    sector: h.sector as string | undefined,
    assetType: h.asset_type as Holding['assetType'],
    lastUpdated: new Date(h.updated_at as string),
    createdAt: new Date(h.created_at as string),
  };
}
