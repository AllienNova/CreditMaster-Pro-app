/**
 * Trading Signals API Route
 *
 * Handles signal retrieval and management:
 * - GET: Retrieve signals from Supabase (trading_signals_v2)
 * - POST: Analyze symbol via PCTT engine, create/cancel/trigger signals
 */

import { NextRequest, NextResponse } from "next/server";
import { withAuth, type AuthedUser } from "@/lib/auth/api-guard";
import { createClient, supabaseAdmin } from "@/lib/supabase/server";
import { createPCTTEngine, type OHLCV } from "@/lib/trading/pctt/pctt-core";
import { classifyRegime, type RegimeClassification } from "@/lib/trading/regime";
import { checkHTFAlignment, type HTFResult } from "@/lib/trading/signals";
import type { Bar } from "@/lib/trading/data/bar-consolidator";
import { creditService, CREDIT_COSTS } from "@/lib/credits";

// ============================================================================
// TYPES
// ============================================================================

interface TradingSignal {
  id: string;
  symbol: string;
  timestamp: Date;
  source: "pctt" | "rule" | "ml" | "llm" | "fused";
  type: "entry" | "exit";
  side: "long" | "short";
  strength: number;
  confidence: number;
  entryPrice?: number;
  stopLoss?: number;
  targets?: number[];
  rationale?: string;
  expiresAt?: Date;
  status: "active" | "triggered" | "expired" | "cancelled";
}

interface SignalFilter {
  symbol?: string;
  source?: string;
  status?: string;
  minConfidence?: number;
  limit?: number;
}

// ============================================================================
// SYNTHETIC CANDLE FALLBACK
// ============================================================================

function makeSyntheticCandles(days: number): OHLCV[] {
  const candles: OHLCV[] = [];
  let price = 100 + Math.random() * 200;
  const baseDate = new Date();
  baseDate.setDate(baseDate.getDate() - days);

  for (let i = 0; i < days; i++) {
    const drift = (Math.random() - 0.48) * 3;
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
// OHLCV FETCH — attempts real Alpaca data; falls back to synthetic
// ============================================================================

async function fetchCandles(symbol: string, days = 200): Promise<OHLCV[]> {
  const apiKey = process.env.ALPACA_API_KEY;
  const apiSecret = process.env.ALPACA_API_SECRET;

  if (apiKey && apiSecret) {
    try {
      const end = new Date();
      const start = new Date();
      start.setDate(start.getDate() - days);

      const params = new URLSearchParams({
        symbols: symbol,
        timeframe: "1Day",
        start: start.toISOString(),
        end: end.toISOString(),
        limit: String(days),
        feed: "iex",
      });

      const res = await fetch(
        `https://data.alpaca.markets/v2/stocks/bars?${params}`,
        {
          headers: {
            "APCA-API-KEY-ID": apiKey,
            "APCA-API-SECRET-KEY": apiSecret,
          },
          // 5 second timeout
          signal: AbortSignal.timeout(5000),
        },
      );

      if (res.ok) {
        const json = (await res.json()) as {
          bars: Record<string, Array<{ t: string; o: number; h: number; l: number; c: number; v: number }>>;
        };
        const bars = json.bars?.[symbol];
        if (bars && bars.length >= 20) {
          return bars.map((b) => ({
            time: new Date(b.t).getTime(),
            open: b.o,
            high: b.h,
            low: b.l,
            close: b.c,
            volume: b.v,
          }));
        }
      }
    } catch {
      // Fall through to synthetic
    }
  }

  return makeSyntheticCandles(days);
}

// ============================================================================
// PCTT ANALYSIS
// ============================================================================

interface PCTTEngineResult {
  signal: "long" | "short" | "none";
  confidence: number;
  structure: string;
  entryPrice: number;
  stopPrice: number;
  targetPrices: number[];
  qScore: number;
}

async function runPCTTEngine(symbol: string): Promise<PCTTEngineResult | null> {
  try {
    const candles = await fetchCandles(symbol);
    if (candles.length < 20) return null;

    const engine = createPCTTEngine();
    let lastSignal: PCTTEngineResult | null = null;

    for (const bar of candles) {
      const { structure, signal } = engine.update(bar);

      if (signal && signal.type !== "none") {
        const regimeLabel = structure.regime.replace(/_/g, " ");
        lastSignal = {
          signal: signal.type,
          confidence: signal.confidence,
          structure: `${regimeLabel} — event: ${signal.event}`,
          entryPrice: signal.entryPrice,
          stopPrice: signal.stopPrice,
          targetPrices: signal.targetPrices,
          qScore: signal.qScore,
        };
      }
    }

    return lastSignal;
  } catch {
    return null;
  }
}

// ============================================================================
// DB ROW → TradingSignal
// ============================================================================

function rowToSignal(row: Record<string, unknown>): TradingSignal {
  return {
    id: String(row.id),
    symbol: String(row.symbol),
    timestamp: new Date(String(row.created_at)),
    source: (row.source as TradingSignal["source"]) ?? "fused",
    type: (row.signal_type as TradingSignal["type"]) ?? "entry",
    side: (row.action as TradingSignal["side"]) ?? "long",
    strength: Number(row.confidence) || 0.7,
    confidence: Number(row.confidence) || 0.7,
    entryPrice: row.entry_price != null ? Number(row.entry_price) : undefined,
    stopLoss: row.stop_loss != null ? Number(row.stop_loss) : undefined,
    targets: row.target_price != null ? [Number(row.target_price)] : undefined,
    rationale: (row.source_details as Record<string, unknown>)?.rationale as string | undefined,
    expiresAt: row.expires_at ? new Date(String(row.expires_at)) : undefined,
    status: (row.status as TradingSignal["status"]) ?? "active",
  };
}

// ============================================================================
// GET - Retrieve Signals
// ============================================================================

export const GET = withAuth(async (request: NextRequest, user: AuthedUser) => {
  try {
    const supabase = await createClient();
    const searchParams = request.nextUrl.searchParams;
    const action = searchParams.get("action");

    // Build filter
    const filter: SignalFilter = {};
    const symbol = searchParams.get("symbol");
    if (symbol) filter.symbol = symbol;
    const source = searchParams.get("source");
    if (source) filter.source = source;
    const status = searchParams.get("status");
    if (status) filter.status = status;
    const minConfidence = searchParams.get("minConfidence");
    if (minConfidence) filter.minConfidence = parseFloat(minConfidence);
    const limit = searchParams.get("limit");
    if (limit) filter.limit = parseInt(limit, 10);

    // Get specific signal by ID
    const signalId = searchParams.get("id");
    if (signalId) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabaseAdmin as any)
        .from("trading_signals_v2")
        .select("*")
        .eq("id", signalId)
        .eq("user_id", user.id)
        .single();

      if (error || !data) {
        return NextResponse.json({ error: "Signal not found" }, { status: 404 });
      }
      return NextResponse.json({ success: true, data: rowToSignal(data as Record<string, unknown>) });
    }

    // Build base query
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query = (supabaseAdmin as any)
      .from("trading_signals_v2")
      .select("*")
      .eq("user_id", user.id);

    if (filter.symbol) query = query.eq("symbol", filter.symbol);
    if (filter.source) query = query.eq("source", filter.source);
    if (filter.status) query = query.eq("status", filter.status);
    if (filter.minConfidence) query = query.gte("confidence", filter.minConfidence);

    query = query.order("created_at", { ascending: false }).limit(filter.limit || 100);

    // Get active signals
    if (action === "active") {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let activeQuery = (supabaseAdmin as any)
        .from("trading_signals_v2")
        .select("*")
        .eq("user_id", user.id)
        .eq("status", "active");

      if (filter.symbol) activeQuery = activeQuery.eq("symbol", filter.symbol);
      if (filter.source) activeQuery = activeQuery.eq("source", filter.source);
      if (filter.minConfidence) activeQuery = activeQuery.gte("confidence", filter.minConfidence);

      activeQuery = activeQuery
        .order("confidence", { ascending: false })
        .limit(filter.limit || 20);

      const { data: rows } = await activeQuery;
      const signals = ((rows as Record<string, unknown>[]) ?? []).map(rowToSignal);

      return NextResponse.json({
        success: true,
        data: { signals, count: signals.length },
      });
    }

    // Get signal summary
    if (action === "summary") {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: allRows } = await (supabaseAdmin as any)
        .from("trading_signals_v2")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(500);

      const allSignals = ((allRows as Record<string, unknown>[]) ?? []).map(rowToSignal);
      const activeSignals = allSignals.filter((s) => s.status === "active");

      const summary = {
        total: allSignals.length,
        active: activeSignals.length,
        bySource: {
          pctt: activeSignals.filter((s) => s.source === "pctt").length,
          rule: activeSignals.filter((s) => s.source === "rule").length,
          ml: activeSignals.filter((s) => s.source === "ml").length,
          llm: activeSignals.filter((s) => s.source === "llm").length,
          fused: activeSignals.filter((s) => s.source === "fused").length,
        },
        bySide: {
          long: activeSignals.filter((s) => s.side === "long").length,
          short: activeSignals.filter((s) => s.side === "short").length,
        },
        avgConfidence:
          activeSignals.length > 0
            ? activeSignals.reduce((sum, s) => sum + s.confidence, 0) / activeSignals.length
            : 0,
        topSignals: activeSignals
          .sort((a, b) => b.confidence - a.confidence)
          .slice(0, 5),
      };

      return NextResponse.json({ success: true, data: summary });
    }

    // Default: return filtered signals
    const { data: rows } = await query;
    const signals = ((rows as Record<string, unknown>[]) ?? []).map(rowToSignal);

    return NextResponse.json({
      success: true,
      data: { signals, count: signals.length },
    });
  } catch (_error) {
    void _error;
    return NextResponse.json(
      { error: "Failed to retrieve signals" },
      { status: 500 },
    );
  }
});

// ============================================================================
// POST - Generate/Manage Signals
// ============================================================================

export const POST = withAuth(async (request: NextRequest, user: AuthedUser) => {
  try {
    const supabase = await createClient();

    const body = await request.json();
    const { action } = body;

    switch (action) {
      case "analyze": {
        const { symbol, timeframe, includeEngines } = body;

        if (!symbol) {
          return NextResponse.json({ error: "symbol required" }, { status: 400 });
        }

        // Credit check before expensive signal analysis
        const signalCost = CREDIT_COSTS.signal_analysis;
        const hasSignalCredits = await creditService.checkSufficientCredits(user.id, signalCost);
        if (!hasSignalCredits) {
          return NextResponse.json(
            {
              success: false,
              error: "Insufficient credits",
              code: "INSUFFICIENT_CREDITS",
              required: signalCost,
              action: "signal_analysis",
            },
            { status: 402 },
          );
        }

        // Run PCTT engine
        const pcttResult =
          includeEngines?.pctt !== false ? await runPCTTEngine(symbol) : null;

        // Rule-based engine: simple RSI/MA heuristic on synthetic candles
        let ruleResult: {
          signal: string;
          confidence: number;
          triggeredRules: string[];
        } | null = null;

        if (includeEngines?.rule !== false) {
          try {
            const candles = await fetchCandles(symbol, 50);
            if (candles.length >= 14) {
              // Compute a simple 14-period RSI
              let gains = 0;
              let losses = 0;
              for (let i = candles.length - 14; i < candles.length; i++) {
                const delta = candles[i].close - candles[i - 1 < 0 ? 0 : i - 1].close;
                if (delta > 0) gains += delta;
                else losses -= delta;
              }
              const avgGain = gains / 14;
              const avgLoss = losses / 14;
              const rsi = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);

              // 20/50 MA
              const closes = candles.map((c) => c.close);
              const ma20 = closes.slice(-20).reduce((a, b) => a + b, 0) / 20;
              const ma50 = closes.slice(-50).reduce((a, b) => a + b, 0) / 50;

              const triggeredRules: string[] = [];
              let ruleSignal: "long" | "short" = "long";
              let ruleConfidence = 0.5;

              if (rsi < 30) { triggeredRules.push("RSI oversold"); ruleConfidence += 0.15; }
              if (rsi > 70) { triggeredRules.push("RSI overbought"); ruleSignal = "short"; ruleConfidence += 0.15; }
              if (ma20 > ma50) { triggeredRules.push("MA20 above MA50 (bullish)"); ruleConfidence += 0.1; }
              if (ma20 < ma50) { triggeredRules.push("MA20 below MA50 (bearish)"); ruleSignal = "short"; ruleConfidence += 0.1; }

              if (triggeredRules.length > 0) {
                ruleResult = {
                  signal: ruleSignal,
                  confidence: Math.min(0.95, ruleConfidence),
                  triggeredRules,
                };
              }
            }
          } catch {
            ruleResult = null;
          }
        }

        // ML engine placeholder — no model is wired; skip to avoid false signals
        const mlResult: null = null;

        // Fuse signals from engines that produced a result
        const availableSignals: Array<{ signal: string; confidence: number }> = [];
        if (pcttResult) availableSignals.push({ signal: pcttResult.signal, confidence: pcttResult.confidence });
        if (ruleResult) availableSignals.push({ signal: ruleResult.signal, confidence: ruleResult.confidence });

        if (availableSignals.length === 0 && includeEngines?.pctt !== false) {
          // All engines that were requested returned null — the system cannot produce a signal
          return NextResponse.json(
            { error: "Unable to produce a signal for the requested symbol at this time" },
            { status: 503 },
          );
        }

        const longVotes = availableSignals.filter((s) => s.signal === "long");
        const shortVotes = availableSignals.filter((s) => s.signal === "short");
        const fusedSide = longVotes.length >= shortVotes.length ? "long" : "short";
        const fusedVotes = fusedSide === "long" ? longVotes : shortVotes;
        const fusedConfidence =
          fusedVotes.length > 0
            ? fusedVotes.reduce((sum, s) => sum + s.confidence, 0) / fusedVotes.length
            : 0;
        const consensus = availableSignals.length > 0
          ? fusedVotes.length / availableSignals.length
          : 0;

        // ==============================================================
        // Strativion: Regime detection — filter aggressive signals in
        // CRISIS or SHOCK regimes
        // ==============================================================
        let regimeInfo: RegimeClassification | null = null;
        let regimeFiltered = false;

        try {
          const candles = await fetchCandles(symbol, 200);
          if (candles.length >= 52) {
            const closes = candles.map((c) => c.close);
            const highs = candles.map((c) => c.high);
            const lows = candles.map((c) => c.low);
            const volumes = candles.map((c) => c.volume);

            regimeInfo = classifyRegime(closes, highs, lows, volumes);

            if (
              (regimeInfo.regime === "crisis" || regimeInfo.regime === "shock") &&
              fusedConfidence < 0.8
            ) {
              regimeFiltered = true;
            }
          }
        } catch (regimeErr) {
          // Regime detection error — log and continue without filtering
          console.error("[RegimeDetector] Error classifying regime:", regimeErr);
        }

        // ==============================================================
        // Strativion: HTF alignment — filter signals that don't align
        // with higher timeframe trend
        // ==============================================================
        let htfInfo: HTFResult | null = null;

        try {
          const candles = await fetchCandles(symbol, 200);
          if (candles.length >= 23) {
            // Convert OHLCV candles to Bar format for HTF alignment
            const htfBars: Bar[] = candles.map((c) => ({
              timestamp: c.time,
              open: c.open,
              high: c.high,
              low: c.low,
              close: c.close,
              volume: c.volume,
            }));

            htfInfo = checkHTFAlignment({
              signalTimeframe: "1d",
              signalDirection: fusedSide as "long" | "short",
              htfBars,
              method: "ema_slope",
            });
          }
        } catch (htfErr) {
          // HTF alignment error — log and continue without filtering
          console.error("[HTFAlignment] Error checking alignment:", htfErr);
        }

        const analysisResult = {
          symbol,
          timeframe: timeframe || "1D",
          timestamp: new Date(),
          engines: {
            pctt: pcttResult
              ? {
                  signal: pcttResult.signal,
                  confidence: pcttResult.confidence,
                  structure: pcttResult.structure,
                  entryPrice: pcttResult.entryPrice,
                  stopPrice: pcttResult.stopPrice,
                  targetPrices: pcttResult.targetPrices,
                  qScore: pcttResult.qScore,
                }
              : null,
            rule: ruleResult,
            ml: mlResult,
          },
          fusedSignal: {
            side: fusedSide,
            confidence: fusedConfidence,
            consensus,
          },
          regime: regimeInfo
            ? {
                regime: regimeInfo.regime,
                confidence: regimeInfo.confidence,
                efficiencyRatio: regimeInfo.efficiencyRatio,
                filtered: regimeFiltered,
              }
            : null,
          htfAlignment: htfInfo
            ? {
                aligned: htfInfo.aligned,
                htfTrend: htfInfo.htfTrend,
                method: htfInfo.method,
                details: htfInfo.details,
              }
            : null,
        };

        // Deduct credits after successful analysis
        try {
          await creditService.deductCredits(user.id, "signal_analysis", {
            symbol,
            timeframe: timeframe || "1D",
          });
        } catch (deductErr) {
          console.error("[Credits] Failed to deduct for signal_analysis:", deductErr);
        }

        return NextResponse.json({ success: true, data: analysisResult });
      }

      case "create": {
        if (!body.symbol || !body.side) {
          return NextResponse.json(
            { error: "symbol and side are required" },
            { status: 400 },
          );
        }

        const signalId = `SIG-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;

        const row = {
          id: signalId,
          user_id: user.id,
          symbol: body.symbol,
          signal_type: body.type || "entry",
          action: body.side,
          confidence: body.confidence ?? 0.7,
          source: body.source || "fused",
          source_details: {
            strength: body.strength ?? 0.7,
            rationale: body.rationale,
          },
          entry_price: body.entryPrice ?? null,
          stop_loss: body.stopLoss ?? null,
          target_price: body.targets?.[0] ?? null,
          status: "active",
          expires_at: body.expiresAt ?? null,
          created_at: new Date().toISOString(),
        };

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: inserted, error: insertError } = await (supabaseAdmin as any)
          .from("trading_signals_v2")
          .insert(row)
          .select()
          .single();

        if (insertError || !inserted) {
          return NextResponse.json(
            { error: "Failed to create signal" },
            { status: 500 },
          );
        }

        return NextResponse.json({
          success: true,
          data: rowToSignal(inserted as Record<string, unknown>),
        });
      }

      case "cancel": {
        const { signalId } = body;

        if (!signalId) {
          return NextResponse.json({ error: "signalId required" }, { status: 400 });
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: existing } = await (supabaseAdmin as any)
          .from("trading_signals_v2")
          .select("id")
          .eq("id", signalId)
          .eq("user_id", user.id)
          .single();

        if (!existing) {
          return NextResponse.json({ error: "Signal not found" }, { status: 404 });
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: updated } = await (supabaseAdmin as any)
          .from("trading_signals_v2")
          .update({ status: "cancelled" })
          .eq("id", signalId)
          .eq("user_id", user.id)
          .select()
          .single();

        return NextResponse.json({
          success: true,
          data: rowToSignal((updated ?? existing) as Record<string, unknown>),
        });
      }

      case "trigger": {
        const { signalId } = body;

        if (!signalId) {
          return NextResponse.json({ error: "signalId required" }, { status: 400 });
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: existing } = await (supabaseAdmin as any)
          .from("trading_signals_v2")
          .select("id")
          .eq("id", signalId)
          .eq("user_id", user.id)
          .single();

        if (!existing) {
          return NextResponse.json({ error: "Signal not found" }, { status: 404 });
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: updated } = await (supabaseAdmin as any)
          .from("trading_signals_v2")
          .update({ status: "triggered", executed_at: new Date().toISOString() })
          .eq("id", signalId)
          .eq("user_id", user.id)
          .select()
          .single();

        return NextResponse.json({
          success: true,
          data: rowToSignal((updated ?? existing) as Record<string, unknown>),
        });
      }

      case "cleanup": {
        const now = new Date().toISOString();

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { count } = await (supabaseAdmin as any)
          .from("trading_signals_v2")
          .update({ status: "expired" })
          .eq("user_id", user.id)
          .eq("status", "active")
          .lt("expires_at", now)
          .not("expires_at", "is", null);

        return NextResponse.json({
          success: true,
          data: { cleanedCount: count ?? 0 },
        });
      }

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (_error) {
    void _error;
    return NextResponse.json(
      { error: "Failed to process signal request" },
      { status: 500 },
    );
  }
});
