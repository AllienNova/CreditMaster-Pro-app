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
 * The symbols the autonomous scanner sweeps each cycle.
 *
 * PER-USER WATCHLISTS ARE NOT BUILT. This used to select
 * `trading_accounts.watchlist`, a column that exists in no migration and no
 * other query in the repo — there is no table, no writer, and no UI for it.
 * The select therefore always errored into the `DEFAULT_WATCHLIST` fallback,
 * so the function has only ever returned the default while reading like a
 * per-user lookup.
 *
 * The dead query is removed rather than replaced with a new column: adding a
 * column nothing writes would be the same defect pointing the other way. When
 * per-user watchlists are actually built, this is where they load.
 *
 * `userId` is retained so callers and the eventual real implementation do not
 * have to change.
 */
export async function loadWatchlist(_userId: string): Promise<string[]> {
  return DEFAULT_WATCHLIST;
}

const DEFAULT_WATCHLIST = [
  "AAPL", "MSFT", "GOOGL", "AMZN", "NVDA",
  "META", "TSLA", "SPY", "QQQ", "AMD",
];

// ============================================================================
// MARKET DATA FETCHER
// ============================================================================

/**
 * Fetch recent OHLCV candles for a symbol from the real market-data provider.
 *
 * Honesty contract (DEFAB-1 / ADR-0005): this scanner feeds the autonomous
 * executor, so it returns REAL bars or NONE. It previously returned
 * `generateSyntheticCandles` — a Math.random() random walk labelled "realistic
 * synthetic data" — meaning every autonomous scan decision was computed from
 * invented prices. That generator is DELETED, not degraded.
 *
 * Real wiring is ADR-0005 (Alpaca canonical) M6-1. Until it lands here, this
 * returns an EMPTY set so `scanSymbol` skips the symbol rather than acting on
 * fabricated data — callers guard on candle count.
 */
export async function fetchCandles(
  _symbol: string,
  _days: number = 200,
): Promise<OHLCV[]> {
  // Deliberately empty until the Alpaca provider call is wired (ADR-0005 M6-1).
  // Returning [] makes downstream scans skip; NEVER substitute synthetic bars.
  return [];
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

  // Persist scan cycle to DB. autonomous_scan_logs does not exist in the
  // Next.js app's Supabase project as of Wave 7 (docs/qa/triage-trading.md)
  // — same Fly.io-only reachability question as autonomous_execution_logs
  // above. The bare try/catch here was dead code for that failure mode:
  // postgrest-js resolves `{ error }` instead of throwing, so a missing
  // table never reached the catch. Now the resolved `error` is checked
  // directly, so a failed write is finally logged.
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabaseAdmin as any)
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

    if (error) {
      console.error(
        `[autonomous] Failed to persist scan cycle ${cycleId}: ${error.message}`,
      );
    }
  } catch (err) {
    // Non-blocking — scan log persistence failure shouldn't halt the pipeline
    console.error(`[autonomous] Failed to persist scan cycle ${cycleId}`, err);
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
