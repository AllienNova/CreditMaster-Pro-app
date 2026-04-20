/**
 * Backtest API Route
 *
 * POST — Run a backtest against historical data
 *        Actions: "run" (standard backtest), "walk-forward" (walk-forward optimization)
 * GET  — Fetch backtest results for the user
 */

import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/api-guard";
import type { JWTUser } from "@/lib/auth/jwt-validation";
import { supabaseAdmin } from "@/lib/supabase/server";
import {
  createBacktestEngine,
  type BacktestStrategy,
} from "@/lib/trading/backtesting/backtest-engine";
import { validateStrategy } from "@/lib/trading/strategies/strategy-validator";
import { marketDataService } from "@/lib/investments/market-data-service";
import { AssetType, TimeInterval } from "@/lib/investments/types/market-data.types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- tables not in generated types yet
const strategyLib = (): any => supabaseAdmin.from("strategy_library");
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const backtestTable = (): any => supabaseAdmin.from("backtest_results");

// ============================================================================
// GET — Fetch user's backtest results
// ============================================================================

export const GET = withAuth(async (request: NextRequest, user: JWTUser) => {
  try {
    const params = request.nextUrl.searchParams;
    const strategyName = params.get("strategy");
    const symbol = params.get("symbol");
    const limit = Math.min(parseInt(params.get("limit") || "20", 10), 100);
    const offset = parseInt(params.get("offset") || "0", 10);

    let query = backtestTable()
      .select("*", { count: "exact" })
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (strategyName) {
      query = query.eq("strategy_name", strategyName);
    }

    if (symbol) {
      query = query.contains("symbols", JSON.stringify([symbol]));
    }

    const { data, count, error } = await query;

    if (error) {
      console.error("[trading/backtest] GET error:", error);
      return NextResponse.json(
        { error: "Failed to fetch backtest results", message: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      data: data ?? [],
      count: count ?? 0,
      limit,
      offset,
    });
  } catch (err) {
    console.error("[trading/backtest] GET error:", err);
    return NextResponse.json(
      {
        error: "Failed to fetch backtest results",
        message: err instanceof Error ? err.message : "Unknown error",
      },
      { status: 500 },
    );
  }
});

// ============================================================================
// POST — Run backtest
// ============================================================================

export const POST = withAuth(async (request: NextRequest, user: JWTUser) => {
  try {
    const body = await request.json();
    const { action } = body as { action?: string };

    switch (action) {
      case "run":
        return handleRunBacktest(body, user);
      case "walk-forward":
        return handleWalkForward(body, user);
      default:
        return NextResponse.json(
          { error: "Invalid action. Must be 'run' or 'walk-forward'" },
          { status: 400 },
        );
    }
  } catch (err) {
    console.error("[trading/backtest] POST error:", err);
    return NextResponse.json(
      {
        error: "Failed to run backtest",
        message: err instanceof Error ? err.message : "Unknown error",
      },
      { status: 500 },
    );
  }
});

// ============================================================================
// HANDLERS
// ============================================================================

async function handleRunBacktest(
  body: Record<string, unknown>,
  user: JWTUser,
): Promise<NextResponse> {
  const {
    strategy,
    strategyId,
    symbols,
    startDate,
    endDate,
    initialCapital,
  } = body as {
    strategy?: BacktestStrategy;
    strategyId?: string;
    symbols?: string[];
    startDate?: string;
    endDate?: string;
    initialCapital?: number;
  };

  // Must have either inline strategy or strategyId
  let strategyConfig: BacktestStrategy | undefined = strategy;

  if (!strategyConfig && strategyId) {
    // Load from strategy_library
    const { data: libEntry, error } = await strategyLib()
      .select("config, name")
      .eq("id", strategyId)
      .single();

    if (error || !libEntry) {
      return NextResponse.json(
        { error: "Strategy not found" },
        { status: 404 },
      );
    }

    strategyConfig = libEntry.config as unknown as BacktestStrategy;
    if (!strategyConfig.name) {
      strategyConfig.name = libEntry.name;
    }
  }

  if (!strategyConfig) {
    return NextResponse.json(
      { error: "Either strategy or strategyId is required" },
      { status: 400 },
    );
  }

  // Validate the strategy
  const validation = validateStrategy(strategyConfig);
  if (!validation.valid) {
    return NextResponse.json(
      {
        error: "Invalid strategy configuration",
        details: validation.errors,
        warnings: validation.warnings,
      },
      { status: 400 },
    );
  }

  if (!symbols || !Array.isArray(symbols) || symbols.length === 0) {
    return NextResponse.json(
      { error: "symbols array is required" },
      { status: 400 },
    );
  }

  const capital = initialCapital ?? 100000;
  if (typeof capital !== "number" || capital <= 0) {
    return NextResponse.json(
      { error: "initialCapital must be a positive number" },
      { status: 400 },
    );
  }

  // Create backtest engine
  const engine = createBacktestEngine({
    initialCapital: capital,
    startDate: startDate ? new Date(startDate) : undefined,
    endDate: endDate ? new Date(endDate) : undefined,
  });

  // Run backtest for each symbol
  const results = [];
  let dataSource: "live" | "synthetic" = "live";
  for (const symbol of symbols) {
    const { data, source } = await fetchMarketData(
      symbol,
      365,
      startDate ? new Date(startDate) : undefined,
    );
    if (source === "synthetic") dataSource = "synthetic";
    engine.loadData(symbol, data);
    const result = await engine.runBacktest(symbol, strategyConfig);
    results.push(result);
  }

  // Persist results
  for (const result of results) {
    await backtestTable().insert({
      user_id: user.id,
      strategy_name: strategyConfig.name,
      strategy_config: strategyConfig as unknown as Record<string, unknown>,
      start_date: startDate || new Date(Date.now() - 365 * 86400000).toISOString().split("T")[0],
      end_date: endDate || new Date().toISOString().split("T")[0],
      initial_capital: capital,
      symbols: symbols,
      total_return: result.totalReturn,
      annualized_return: result.annualizedReturn ?? null,
      sharpe_ratio: result.sharpeRatio,
      sortino_ratio: result.sortinoRatio ?? null,
      max_drawdown: result.maxDrawdown,
      win_rate: result.winRate,
      profit_factor: result.profitFactor ?? null,
      total_trades: result.totalTrades,
      equity_curve: result.equityCurve,
      trades: result.trades,
      monthly_returns: result.monthlyReturns ?? null,
    });
  }

  return NextResponse.json({
    success: true,
    data: {
      results,
      dataSource,
      summary: {
        symbols,
        strategyName: strategyConfig.name,
        initialCapital: capital,
        avgReturn:
          results.reduce((s, r) => s + r.totalReturn, 0) / results.length,
        avgSharpe:
          results.reduce((s, r) => s + r.sharpeRatio, 0) / results.length,
        avgDrawdown:
          results.reduce((s, r) => s + r.maxDrawdown, 0) / results.length,
        totalTrades: results.reduce((s, r) => s + r.totalTrades, 0),
      },
      warnings: validation.warnings,
    },
  });
}

async function handleWalkForward(
  body: Record<string, unknown>,
  user: JWTUser,
): Promise<NextResponse> {
  const {
    strategy,
    strategyId,
    symbol,
    windows,
    inSampleRatio,
    initialCapital,
    startDate,
    endDate,
  } = body as {
    strategy?: BacktestStrategy;
    strategyId?: string;
    symbol?: string;
    windows?: number;
    inSampleRatio?: number;
    initialCapital?: number;
    startDate?: string;
    endDate?: string;
  };

  // Resolve strategy
  let strategyConfig: BacktestStrategy | undefined = strategy;

  if (!strategyConfig && strategyId) {
    const { data: libEntry, error } = await strategyLib()
      .select("config, name")
      .eq("id", strategyId)
      .single();

    if (error || !libEntry) {
      return NextResponse.json(
        { error: "Strategy not found" },
        { status: 404 },
      );
    }

    strategyConfig = libEntry.config as unknown as BacktestStrategy;
    if (!strategyConfig.name) {
      strategyConfig.name = libEntry.name;
    }
  }

  if (!strategyConfig) {
    return NextResponse.json(
      { error: "Either strategy or strategyId is required" },
      { status: 400 },
    );
  }

  if (!symbol || typeof symbol !== "string") {
    return NextResponse.json(
      { error: "symbol is required for walk-forward analysis" },
      { status: 400 },
    );
  }

  const capital = initialCapital ?? 100000;
  const numWindows = windows ?? 5;
  const ratio = inSampleRatio ?? 0.7;

  if (numWindows < 2 || numWindows > 20) {
    return NextResponse.json(
      { error: "windows must be between 2 and 20" },
      { status: 400 },
    );
  }

  if (ratio <= 0 || ratio >= 1) {
    return NextResponse.json(
      { error: "inSampleRatio must be between 0 and 1 (exclusive)" },
      { status: 400 },
    );
  }

  const engine = createBacktestEngine({
    initialCapital: capital,
    startDate: startDate ? new Date(startDate) : undefined,
    endDate: endDate ? new Date(endDate) : undefined,
  });

  // Fetch enough data for walk-forward (need at least windows * ~200 bars)
  const barsNeeded = Math.max(numWindows * 200, 1000);
  const { data: wfData, source: wfSource } = await fetchMarketData(
    symbol,
    barsNeeded,
    startDate ? new Date(startDate) : undefined,
  );
  engine.loadData(symbol, wfData);

  const result = await engine.runWalkForward(
    symbol,
    strategyConfig,
    numWindows,
    ratio,
  );

  // Persist the walk-forward summary as a backtest result
  await backtestTable().insert({
    user_id: user.id,
    strategy_name: `${strategyConfig.name} (Walk-Forward)`,
    strategy_config: {
      ...strategyConfig,
      walkForward: { windows: numWindows, inSampleRatio: ratio },
    } as unknown as Record<string, unknown>,
    start_date: startDate || new Date(Date.now() - 365 * 86400000).toISOString().split("T")[0],
    end_date: endDate || new Date().toISOString().split("T")[0],
    initial_capital: capital,
    symbols: [symbol],
    total_return: result.outOfSampleResults.length > 0
      ? result.outOfSampleResults.reduce((s, r) => s + r.totalReturn, 0) /
        result.outOfSampleResults.length
      : 0,
    sharpe_ratio: result.outOfSampleResults.length > 0
      ? result.outOfSampleResults.reduce((s, r) => s + r.sharpeRatio, 0) /
        result.outOfSampleResults.length
      : 0,
    max_drawdown: result.outOfSampleResults.length > 0
      ? Math.min(...result.outOfSampleResults.map((r) => r.maxDrawdown))
      : 0,
    win_rate: result.outOfSampleResults.length > 0
      ? result.outOfSampleResults.reduce((s, r) => s + r.winRate, 0) /
        result.outOfSampleResults.length
      : 0,
    total_trades: result.outOfSampleResults.reduce(
      (s, r) => s + r.totalTrades,
      0,
    ),
  });

  return NextResponse.json({
    success: true,
    data: {
      robustnessScore: result.robustnessScore,
      optimizedParams: result.optimizedParams,
      inSampleResults: result.inSampleResults.map(summarizeResult),
      outOfSampleResults: result.outOfSampleResults.map(summarizeResult),
      windows: numWindows,
      inSampleRatio: ratio,
      symbol,
      dataSource: wfSource,
    },
  });
}

// ============================================================================
// HELPERS
// ============================================================================

interface OHLCV {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

/**
 * Fetch real OHLCV data from market data providers.
 * Falls back to synthetic data (tagged) if all providers fail.
 */
async function fetchMarketData(
  symbol: string,
  days: number,
  baseDate?: Date,
): Promise<{ data: OHLCV[]; source: "live" | "synthetic" }> {
  try {
    const history = await marketDataService.getHistory(
      symbol,
      AssetType.STOCK,
      TimeInterval.ONE_DAY,
      days,
    );

    // Map from StockHistory (OHLCVData with Date timestamps) to backtest OHLCV
    const data: OHLCV[] = history.data
      .slice(0, days)
      .map((bar) => ({
        timestamp: bar.timestamp instanceof Date
          ? bar.timestamp.getTime()
          : new Date(bar.timestamp).getTime(),
        open: bar.open,
        high: bar.high,
        low: bar.low,
        close: bar.close,
        volume: bar.volume,
      }))
      .sort((a, b) => a.timestamp - b.timestamp);

    if (data.length === 0) {
      throw new Error("Empty history returned from market data service");
    }

    return { data, source: "live" };
  } catch {
    return {
      data: generateSyntheticOHLCV(days, 100, baseDate),
      source: "synthetic",
    };
  }
}

function generateSyntheticOHLCV(
  days: number,
  startPrice: number = 100,
  baseDate?: Date,
): OHLCV[] {
  const data: OHLCV[] = [];
  let price = startPrice;
  const start = (baseDate || new Date(Date.now() - days * 86400000)).getTime();

  for (let i = 0; i < days; i++) {
    const change = (Math.random() - 0.48) * 2;
    price = Math.max(10, price + change);
    const high = price + Math.random() * 2;
    const low = price - Math.random() * 2;
    const open = price + (Math.random() - 0.5);

    data.push({
      timestamp: start + i * 86400000,
      open,
      high,
      low,
      close: price,
      volume: 1000000 + Math.random() * 500000,
    });
  }

  return data;
}

function summarizeResult(r: {
  totalReturn: number;
  sharpeRatio: number;
  maxDrawdown: number;
  winRate: number;
  totalTrades: number;
  strategyName: string;
  symbol: string;
}) {
  return {
    strategyName: r.strategyName,
    symbol: r.symbol,
    totalReturn: r.totalReturn,
    sharpeRatio: r.sharpeRatio,
    maxDrawdown: r.maxDrawdown,
    winRate: r.winRate,
    totalTrades: r.totalTrades,
  };
}
