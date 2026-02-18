/**
 * Trading Signals API Route
 *
 * Handles signal retrieval and management:
 * - GET: Retrieve fused signals, PCTT signals, ISE rankings
 * - POST: Analyze symbol, generate signals
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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

// In-memory signal store (in production, use database)
const signalStore: Map<string, TradingSignal> = new Map();

// ============================================================================
// GET - Retrieve Signals
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const action = searchParams.get("action");

    // Get specific signal by ID
    const signalId = searchParams.get("id");
    if (signalId) {
      const signal = signalStore.get(signalId);
      if (!signal) {
        return NextResponse.json(
          { error: "Signal not found" },
          { status: 404 },
        );
      }
      return NextResponse.json({ success: true, data: signal });
    }

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

    // Get active signals
    if (action === "active") {
      const activeSignals = Array.from(signalStore.values())
        .filter((s) => s.status === "active")
        .filter((s) => !filter.symbol || s.symbol === filter.symbol)
        .filter((s) => !filter.source || s.source === filter.source)
        .filter(
          (s) => !filter.minConfidence || s.confidence >= filter.minConfidence,
        )
        .sort((a, b) => b.confidence - a.confidence)
        .slice(0, filter.limit || 20);

      return NextResponse.json({
        success: true,
        data: {
          signals: activeSignals,
          count: activeSignals.length,
        },
      });
    }

    // Get signal summary
    if (action === "summary") {
      const allSignals = Array.from(signalStore.values());
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
            ? activeSignals.reduce((sum, s) => sum + s.confidence, 0) /
              activeSignals.length
            : 0,
        topSignals: activeSignals
          .sort((a, b) => b.confidence - a.confidence)
          .slice(0, 5),
      };

      return NextResponse.json({ success: true, data: summary });
    }

    // Default: return all signals with filter
    let signals = Array.from(signalStore.values());

    if (filter.symbol) {
      signals = signals.filter((s) => s.symbol === filter.symbol);
    }
    if (filter.source) {
      signals = signals.filter((s) => s.source === filter.source);
    }
    if (filter.status) {
      signals = signals.filter((s) => s.status === filter.status);
    }
    if (filter.minConfidence) {
      signals = signals.filter((s) => s.confidence >= filter.minConfidence!);
    }

    signals.sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );

    if (filter.limit) {
      signals = signals.slice(0, filter.limit);
    }

    return NextResponse.json({
      success: true,
      data: {
        signals,
        count: signals.length,
      },
    });
  } catch (_error) {
    // SignalsAPI error: Signals GET error
    void _error;
    return NextResponse.json(
      { error: "Failed to retrieve signals" },
      { status: 500 },
    );
  }
}

// ============================================================================
// POST - Generate/Manage Signals
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { action } = body;

    switch (action) {
      case "analyze": {
        const { symbol, timeframe, includeEngines } = body;

        if (!symbol) {
          return NextResponse.json(
            { error: "symbol required" },
            { status: 400 },
          );
        }

        // Mock analysis result - in production, call actual engines
        const analysisResult = {
          symbol,
          timeframe: timeframe || "1h",
          timestamp: new Date(),
          engines: {
            pctt:
              includeEngines?.pctt !== false
                ? {
                    signal: Math.random() > 0.5 ? "long" : "short",
                    confidence: 0.6 + Math.random() * 0.35,
                    structure: "Support line forming",
                  }
                : null,
            rule:
              includeEngines?.rule !== false
                ? {
                    signal: Math.random() > 0.5 ? "long" : "short",
                    confidence: 0.5 + Math.random() * 0.4,
                    triggeredRules: ["MA crossover", "RSI oversold"],
                  }
                : null,
            ml:
              includeEngines?.ml !== false
                ? {
                    signal: Math.random() > 0.5 ? "long" : "short",
                    confidence: 0.55 + Math.random() * 0.4,
                    predictedReturn: (Math.random() - 0.5) * 0.1,
                  }
                : null,
          },
          fusedSignal: {
            side: Math.random() > 0.5 ? "long" : "short",
            confidence: 0.65 + Math.random() * 0.3,
            consensus: 0.7 + Math.random() * 0.25,
          },
        };

        return NextResponse.json({
          success: true,
          data: analysisResult,
        });
      }

      case "create": {
        const signal: TradingSignal = {
          id: `SIG-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
          symbol: body.symbol,
          timestamp: new Date(),
          source: body.source || "fused",
          type: body.type || "entry",
          side: body.side,
          strength: body.strength || 0.7,
          confidence: body.confidence || 0.7,
          entryPrice: body.entryPrice,
          stopLoss: body.stopLoss,
          targets: body.targets,
          rationale: body.rationale,
          expiresAt: body.expiresAt ? new Date(body.expiresAt) : undefined,
          status: "active",
        };

        signalStore.set(signal.id, signal);

        return NextResponse.json({
          success: true,
          data: signal,
        });
      }

      case "cancel": {
        const { signalId } = body;

        if (!signalId) {
          return NextResponse.json(
            { error: "signalId required" },
            { status: 400 },
          );
        }

        const signal = signalStore.get(signalId);
        if (!signal) {
          return NextResponse.json(
            { error: "Signal not found" },
            { status: 404 },
          );
        }

        signal.status = "cancelled";
        signalStore.set(signalId, signal);

        return NextResponse.json({
          success: true,
          data: signal,
        });
      }

      case "trigger": {
        const { signalId } = body;

        if (!signalId) {
          return NextResponse.json(
            { error: "signalId required" },
            { status: 400 },
          );
        }

        const signal = signalStore.get(signalId);
        if (!signal) {
          return NextResponse.json(
            { error: "Signal not found" },
            { status: 404 },
          );
        }

        signal.status = "triggered";
        signalStore.set(signalId, signal);

        return NextResponse.json({
          success: true,
          data: signal,
        });
      }

      case "cleanup": {
        const now = new Date();
        let cleanedCount = 0;

        for (const [id, signal] of signalStore) {
          if (
            signal.expiresAt &&
            signal.expiresAt < now &&
            signal.status === "active"
          ) {
            signal.status = "expired";
            signalStore.set(id, signal);
            cleanedCount++;
          }
        }

        return NextResponse.json({
          success: true,
          data: { cleanedCount },
        });
      }

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (_error) {
    // SignalsAPI error: Signals POST error
    void _error;
    return NextResponse.json(
      { error: "Failed to process signal request" },
      { status: 500 },
    );
  }
}
