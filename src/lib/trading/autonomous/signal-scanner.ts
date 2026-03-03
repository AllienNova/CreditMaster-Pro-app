/**
 * Signal Scanner
 *
 * Scans a watchlist of symbols through the PCTT pipeline, returning
 * actionable trade signals that meet minimum Q-score thresholds.
 * Used by the autonomous scheduler on each scan cycle.
 */

import {
  PCTTTradingService,
  type PCTTTradingConfig,
  type TradeSetup,
} from "@/lib/trading/pctt/pctt-trading-service";
import { type OHLCV } from "@/lib/trading/pctt/pctt-core";
import { supabaseAdmin } from "@/lib/supabase/server";
import type { ScanResult, ScanCycleResult } from "./autonomous-types";

// ============================================================================
// WATCHLIST LOADER
// ============================================================================

/**
 * Load the user's autonomous trading watchlist from the DB.
 * Falls back to a default set of liquid, large-cap symbols.
 */
export async function loadWatchlist(userId: string): Promise<string[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabaseAdmin as any)
    .from("trading_accounts")
    .select("watchlist")
    .eq("user_id", userId)
    .single();

  if (error || !data?.watchlist || !Array.isArray(data.watchlist)) {
    return DEFAULT_WATCHLIST;
  }

  return data.watchlist as string[];
}

const DEFAULT_WATCHLIST = [
  "AAPL", "MSFT", "GOOGL", "AMZN", "NVDA",
  "META", "TSLA", "SPY", "QQQ", "AMD",
];

// ============================================================================
// MARKET DATA FETCHER
// ============================================================================

/**
 * Fetch recent OHLCV candles for a symbol.
 *
 * In production this would call a market data provider (Alpaca, Polygon, etc.).
 * For now generates realistic synthetic data with slight positive drift.
 */
export async function fetchCandles(
  symbol: string,
  days: number = 200,
): Promise<OHLCV[]> {
  // TODO: Replace with real market data provider call
  // e.g., const bars = await alpaca.getBars(symbol, { timeframe: '1Day', limit: days });
  return generateSyntheticCandles(symbol, days);
}

function generateSyntheticCandles(
  _symbol: string,
  days: number,
): OHLCV[] {
  const candles: OHLCV[] = [];
  let price = 100 + Math.random() * 200; // Start between 100-300
  const baseDate = new Date();
  baseDate.setDate(baseDate.getDate() - days);

  for (let i = 0; i < days; i++) {
    const drift = (Math.random() - 0.48) * 3; // Slight upward bias
    const volatility = Math.random() * 4;
    price = Math.max(20, price + drift);

    const open = price + (Math.random() - 0.5) * volatility;
    const high = Math.max(open, price) + Math.random() * volatility;
    const low = Math.min(open, price) - Math.random() * volatility;

    const date = new Date(baseDate);
    date.setDate(date.getDate() + i);

    candles.push({
      time: date.getTime(),
      open,
      high,
      low,
      close: price,
      volume: 500_000 + Math.random() * 2_000_000,
    });
  }

  return candles;
}

// ============================================================================
// SIGNAL SCANNER
// ============================================================================

/**
 * Scan a single symbol for PCTT signals.
 */
export async function scanSymbol(
  service: PCTTTradingService,
  symbol: string,
  candles: OHLCV[],
  minQScore: number,
): Promise<ScanResult> {
  const scannedAt = Date.now();

  try {
    // Run PCTT analysis
    const setup: TradeSetup | null = await service.analyzeForTrade(symbol, candles);

    if (!setup || !setup.isValid) {
      return {
        symbol,
        hasSignal: false,
        qScore: setup?.signal?.qScore ?? 0,
        reason: setup
          ? `Invalid setup: ${setup.validationErrors.join(", ")}`
          : "No signal generated",
        scannedAt,
      };
    }

    const qScore = setup.signal.qScore;

    if (qScore < minQScore) {
      return {
        symbol,
        hasSignal: false,
        qScore,
        reason: `Q-score ${qScore.toFixed(2)} below threshold ${minQScore}`,
        scannedAt,
      };
    }

    return {
      symbol,
      hasSignal: true,
      qScore,
      side: setup.signal.type === "long" ? "buy" : "sell",
      confidence: setup.signal.confidence ?? qScore,
      entryPrice: setup.entryPrice,
      stopLoss: setup.stopLossPrice,
      takeProfit: setup.takeProfitTargets[0],
      regime: setup.structure?.regime ?? "unknown",
      scannedAt,
    };
  } catch (err) {
    return {
      symbol,
      hasSignal: false,
      qScore: 0,
      reason: `Scan error: ${err instanceof Error ? err.message : String(err)}`,
      scannedAt,
    };
  }
}

/**
 * Run a full scan cycle across all watchlist symbols.
 */
export async function runScanCycle(
  userId: string,
  config: Partial<PCTTTradingConfig>,
  minQScore: number,
  symbols?: string[],
): Promise<ScanCycleResult> {
  const cycleId = `scan_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const startedAt = Date.now();

  const watchlist = symbols ?? (await loadWatchlist(userId));
  const service = new PCTTTradingService(userId, config);

  const results: ScanResult[] = [];
  const errors: Array<{ symbol: string; error: string }> = [];
  let tradesQueued = 0;

  // Scan symbols sequentially to avoid overwhelming the PCTT engine
  for (const symbol of watchlist) {
    try {
      const candles = await fetchCandles(symbol);
      const result = await scanSymbol(service, symbol, candles, minQScore);
      results.push(result);

      if (result.hasSignal) {
        tradesQueued++;
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      errors.push({ symbol, error: errorMsg });
      results.push({
        symbol,
        hasSignal: false,
        qScore: 0,
        reason: `Error: ${errorMsg}`,
        scannedAt: Date.now(),
      });
    }
  }

  // Persist scan cycle to DB
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabaseAdmin as any)
      .from("autonomous_scan_logs")
      .insert({
        cycle_id: cycleId,
        user_id: userId,
        started_at: new Date(startedAt).toISOString(),
        completed_at: new Date().toISOString(),
        symbols_scanned: watchlist.length,
        signals_found: results.filter((r) => r.hasSignal).length,
        trades_queued: tradesQueued,
        errors: errors.length > 0 ? errors : null,
      });
  } catch {
    // Non-blocking — scan log persistence failure shouldn't halt the pipeline
    console.error(`[autonomous] Failed to persist scan cycle ${cycleId}`);
  }

  return {
    cycleId,
    userId,
    startedAt,
    completedAt: Date.now(),
    symbolsScanned: watchlist.length,
    signalsFound: results.filter((r) => r.hasSignal).length,
    tradesQueued,
    errors,
    results,
  };
}
