"use client";

/**
 * Trading Journal Page — real-data wiring.
 *
 * Previously rendered a hardcoded mock trade list and mock stats via local
 * useState, plus a fabricated "Performance Insights" panel. It now reads the
 * real trade journal and aggregate stats from the authed API (Bearer token,
 * both routes wrapped in `withAuth`):
 *   - GET /api/trading/journal                      → trade list (TradeEntry[])
 *   - GET /api/trading/journal/stats?action=stats   → aggregate TradeStats
 *
 * Honest loading / sign-in / error / empty states; no mock fallback. The
 * former fabricated insight cards (best time of day, generic suggestion) had
 * no API source and are replaced with real stat fields the endpoint exposes
 * (best strategy, expectancy per trade, average holding time).
 *
 * NOTE: the "Log Trade" modal is left as the pre-existing (non-functional)
 * placeholder — the write path needs form inputs for the several required
 * `TradeEntry` fields (positionSize, tags, followedPlan) and a migration for
 * the drifted `trading_journal` table, so it is out of scope for this de-mock.
 */

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  BookOpen,
  TrendingUp,
  TrendingDown,
  Plus,
  Filter,
  Download,
  Brain,
  ChevronRight,
  X,
  AlertTriangle,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type TradeOutcome = "win" | "loss" | "breakeven";
type TradeDirection = "long" | "short";

// ============================================================================
// API RESPONSE SHAPES (as they arrive over JSON — dates are ISO strings)
// ============================================================================

interface ApiEnvelope<T> {
  success?: boolean;
  data: T;
  error?: string;
}

interface ApiTradeEntry {
  id: string;
  symbol: string;
  direction: TradeDirection;
  entryDate: string;
  entryPrice: number;
  exitPrice?: number;
  entryQuantity: number;
  profitLoss?: number;
  outcome?: TradeOutcome;
  strategy?: string;
  notes?: string;
}

interface ApiTradeStats {
  totalTrades: number;
  winRate: number;
  profitFactor: number;
  totalProfitLoss: number;
  averageWin: number;
  averageLoss: number;
  largestWin: number;
  largestLoss: number;
  bestStrategy?: string;
  expectancy: number;
  averageHoldingTime: number;
}

// ============================================================================
// VIEW MODELS (what the UI renders)
// ============================================================================

interface Trade {
  id: string;
  symbol: string;
  direction: TradeDirection;
  entryDate: Date;
  entryPrice: number;
  exitPrice?: number;
  quantity: number;
  profitLoss?: number;
  outcome?: TradeOutcome;
  strategy?: string;
  notes?: string;
}

interface TradeStats {
  totalTrades: number;
  winRate: number;
  profitFactor: number;
  totalPL: number;
  averageWin: number;
  averageLoss: number;
  bestTrade: number;
  worstTrade: number;
  bestStrategy?: string;
  expectancy: number;
  averageHoldingTime: number;
}

// ============================================================================
// ADAPTERS (API shape → view model)
// ============================================================================

function mapTrade(t: ApiTradeEntry): Trade {
  return {
    id: t.id,
    symbol: t.symbol,
    direction: t.direction,
    entryDate: new Date(t.entryDate),
    entryPrice: t.entryPrice,
    exitPrice: t.exitPrice,
    // The service stores the entry size as `entryQuantity`.
    quantity: t.entryQuantity,
    profitLoss: t.profitLoss,
    outcome: t.outcome,
    strategy: t.strategy,
    notes: t.notes,
  };
}

function mapStats(s: ApiTradeStats): TradeStats {
  return {
    totalTrades: s.totalTrades,
    winRate: s.winRate,
    profitFactor: s.profitFactor,
    totalPL: s.totalProfitLoss,
    averageWin: s.averageWin,
    averageLoss: s.averageLoss,
    // The page's best/worst-trade map to the service's largest win/loss.
    bestTrade: s.largestWin,
    worstTrade: s.largestLoss,
    bestStrategy: s.bestStrategy,
    expectancy: s.expectancy,
    averageHoldingTime: s.averageHoldingTime,
  };
}

// ============================================================================
// AUTH HELPERS
// ============================================================================

async function getAccessToken(): Promise<string | null> {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.access_token ?? null;
}

function authedFetch(
  url: string,
  token: string,
  init?: RequestInit,
): Promise<Response> {
  return fetch(url, {
    ...init,
    headers: {
      ...(init?.headers ?? {}),
      Authorization: `Bearer ${token}`,
    },
  });
}

const formatCurrency = (amount: number) => {
  const sign = amount >= 0 ? "+" : "";
  return `${sign}$${Math.abs(amount).toFixed(2)}`;
};

// ============================================================================
// PAGE
// ============================================================================

export default function TradingJournalPage() {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [stats, setStats] = useState<TradeStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [signedIn, setSignedIn] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showNewTradeModal, setShowNewTradeModal] = useState(false);
  const [filterOutcome, setFilterOutcome] = useState<TradeOutcome | "all">(
    "all",
  );

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await getAccessToken();
      if (!token) {
        setSignedIn(false);
        setTrades([]);
        setStats(null);
        return;
      }
      setSignedIn(true);

      const [statsRes, tradesRes] = await Promise.all([
        authedFetch("/api/trading/journal/stats?action=stats", token),
        authedFetch("/api/trading/journal", token),
      ]);

      if (!statsRes.ok) {
        throw new Error(`Failed to load stats (${statsRes.status})`);
      }
      if (!tradesRes.ok) {
        throw new Error(`Failed to load trades (${tradesRes.status})`);
      }

      const statsBody = (await statsRes.json()) as ApiEnvelope<ApiTradeStats>;
      const tradesBody = (await tradesRes.json()) as ApiEnvelope<
        ApiTradeEntry[]
      >;

      setStats(statsBody.data ? mapStats(statsBody.data) : null);
      setTrades((tradesBody.data ?? []).map(mapTrade));
    } catch (err) {
      setTrades([]);
      setStats(null);
      setError(
        err instanceof Error ? err.message : "Failed to load trading journal.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredTrades =
    filterOutcome === "all"
      ? trades
      : trades.filter((t) => t.outcome === filterOutcome);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <BookOpen className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Trading Journal
              </h1>
            </div>
            <p className="text-gray-600 dark:text-slate-400">
              Track, analyze, and improve your trading performance
            </p>
          </div>

          <div className="flex items-center gap-3 mt-4 sm:mt-0">
            <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-300 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors">
              <Download className="w-4 h-4" />
              Export
            </button>
            <button
              onClick={() => setShowNewTradeModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Log Trade
            </button>
          </div>
        </div>

        {loading ? (
          <div
            className="animate-pulse space-y-6"
            role="status"
            aria-label="Loading trading journal"
          >
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-24 bg-gray-200 dark:bg-slate-700 rounded-xl"
                />
              ))}
            </div>
            <div className="h-64 bg-gray-200 dark:bg-slate-700 rounded-xl" />
          </div>
        ) : !signedIn ? (
          <div className="bg-white dark:bg-slate-800 rounded-xl p-10 text-center shadow-sm">
            <BookOpen className="w-12 h-12 text-gray-400 dark:text-slate-500 mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Sign in to view your trading journal
            </h2>
            <p className="text-gray-500 dark:text-slate-400">
              Your logged trades and performance stats are tied to your account.
            </p>
          </div>
        ) : error ? (
          <div className="bg-white dark:bg-slate-800 rounded-xl p-10 text-center shadow-sm">
            <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Couldn&apos;t load your journal
            </h2>
            <p className="text-gray-500 dark:text-slate-400 mb-4">{error}</p>
            <button
              onClick={loadData}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        ) : (
          <>
            {/* Stats Grid */}
            {stats && (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl p-4 text-white"
                >
                  <p className="text-green-100 text-sm">Total P/L</p>
                  <p className="text-2xl font-bold">
                    {formatCurrency(stats.totalPL)}
                  </p>
                  <p className="text-green-200 text-sm mt-1">
                    {stats.totalTrades} trades
                  </p>
                </motion.div>

                <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm">
                  <p className="text-sm text-gray-500 dark:text-slate-400">
                    Win Rate
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {stats.winRate.toFixed(1)}%
                  </p>
                  <div className="h-2 bg-gray-100 dark:bg-slate-700 rounded-full mt-2 overflow-hidden">
                    <div
                      className="h-full bg-green-500 rounded-full"
                      style={{ width: `${Math.min(stats.winRate, 100)}%` }}
                    />
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm">
                  <p className="text-sm text-gray-500 dark:text-slate-400">
                    Profit Factor
                  </p>
                  <p
                    className={`text-2xl font-bold ${stats.profitFactor >= 1.5 ? "text-green-600" : stats.profitFactor >= 1 ? "text-yellow-600" : "text-red-600"}`}
                  >
                    {stats.profitFactor.toFixed(2)}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
                    Target: 2.0+
                  </p>
                </div>

                <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm">
                  <p className="text-sm text-gray-500 dark:text-slate-400">
                    Avg Win/Loss
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="text-green-600 font-semibold">
                      ${stats.averageWin.toFixed(0)}
                    </span>
                    <span className="text-gray-400 dark:text-slate-500">/</span>
                    <span className="text-red-600 font-semibold">
                      ${Math.abs(stats.averageLoss).toFixed(0)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
                    R:R{" "}
                    {stats.averageLoss !== 0
                      ? (
                          stats.averageWin / Math.abs(stats.averageLoss)
                        ).toFixed(2)
                      : "—"}
                  </p>
                </div>
              </div>
            )}

            {/* Performance Insights — real stat fields (best strategy,
                expectancy per trade, average holding time). */}
            {stats && (
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-6 mb-8">
                <h2 className="font-semibold text-blue-900 dark:text-blue-100 mb-3 flex items-center gap-2">
                  <Brain className="w-5 h-5" />
                  Performance Insights
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div className="bg-white dark:bg-slate-800/50 rounded-lg p-3">
                    <p className="font-medium text-blue-900 dark:text-blue-100">
                      Best Strategy
                    </p>
                    <p className="text-blue-700 dark:text-blue-300">
                      {stats.bestStrategy ?? "Not enough data yet"}
                    </p>
                  </div>
                  <div className="bg-white dark:bg-slate-800/50 rounded-lg p-3">
                    <p className="font-medium text-blue-900 dark:text-blue-100">
                      Expectancy / Trade
                    </p>
                    <p className="text-blue-700 dark:text-blue-300">
                      {formatCurrency(stats.expectancy)}
                    </p>
                  </div>
                  <div className="bg-white dark:bg-slate-800/50 rounded-lg p-3">
                    <p className="font-medium text-blue-900 dark:text-blue-100">
                      Avg Holding Time
                    </p>
                    <p className="text-blue-700 dark:text-blue-300">
                      {stats.averageHoldingTime.toFixed(1)} h
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Filters */}
            <div className="flex items-center gap-4 mb-4">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-gray-500 dark:text-slate-400" />
                <span className="text-sm text-gray-500 dark:text-slate-400">
                  Filter:
                </span>
              </div>
              <div className="flex gap-2">
                {(["all", "win", "loss", "breakeven"] as const).map(
                  (outcome) => (
                    <button
                      key={outcome}
                      onClick={() => setFilterOutcome(outcome)}
                      className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${filterOutcome === outcome ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 dark:text-slate-300 hover:bg-gray-200 dark:bg-slate-700 dark:hover:bg-slate-600"}`}
                    >
                      {outcome === "all"
                        ? "All"
                        : outcome.charAt(0).toUpperCase() + outcome.slice(1)}
                    </button>
                  ),
                )}
              </div>
            </div>

            {/* Trade List */}
            {filteredTrades.length === 0 ? (
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-12 text-center">
                <BookOpen className="w-12 h-12 text-gray-400 dark:text-slate-500 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  {trades.length === 0
                    ? "No trades logged yet"
                    : "No trades match this filter"}
                </h3>
                <p className="text-gray-500 dark:text-slate-400 mb-4">
                  {trades.length === 0
                    ? "Log your first trade to start tracking your performance."
                    : "Try a different outcome filter."}
                </p>
                {trades.length === 0 && (
                  <button
                    onClick={() => setShowNewTradeModal(true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                  >
                    Log Trade
                  </button>
                )}
              </div>
            ) : (
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-50 dark:bg-slate-700/50 text-left text-sm text-gray-500 dark:text-slate-400">
                        <th className="px-6 py-4 font-medium">Date</th>
                        <th className="px-6 py-4 font-medium">Symbol</th>
                        <th className="px-6 py-4 font-medium">Direction</th>
                        <th className="px-6 py-4 font-medium">Entry</th>
                        <th className="px-6 py-4 font-medium">Exit</th>
                        <th className="px-6 py-4 font-medium">P/L</th>
                        <th className="px-6 py-4 font-medium">Strategy</th>
                        <th className="px-6 py-4 font-medium"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredTrades.map((trade) => (
                        <tr
                          key={trade.id}
                          className="border-t border-gray-100 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700/30 transition-colors"
                        >
                          <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                            {trade.entryDate.toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4">
                            <span className="font-semibold text-gray-900 dark:text-white">
                              {trade.symbol}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className={`flex items-center gap-1 text-sm ${
                                trade.direction === "long"
                                  ? "text-green-600"
                                  : "text-red-600"
                              }`}
                            >
                              {trade.direction === "long" ? (
                                <TrendingUp className="w-4 h-4" />
                              ) : (
                                <TrendingDown className="w-4 h-4" />
                              )}
                              {trade.direction.toUpperCase()}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                            ${trade.entryPrice.toFixed(2)}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                            {trade.exitPrice
                              ? `$${trade.exitPrice.toFixed(2)}`
                              : "-"}
                          </td>
                          <td className="px-6 py-4">
                            {trade.profitLoss !== undefined && (
                              <span
                                className={`font-semibold ${
                                  trade.profitLoss >= 0
                                    ? "text-green-600"
                                    : "text-red-600"
                                }`}
                              >
                                {formatCurrency(trade.profitLoss)}
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            {trade.strategy && (
                              <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-xs font-medium">
                                {trade.strategy}
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <button className="text-gray-400 hover:text-gray-600 dark:text-slate-300 dark:hover:text-gray-200">
                              <ChevronRight className="w-5 h-5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}

        {/* New Trade Modal (pre-existing placeholder — write path not yet wired) */}
        {showNewTradeModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-md w-full p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Log New Trade
                </h2>
                <button
                  onClick={() => setShowNewTradeModal(false)}
                  className="text-gray-400 hover:text-gray-600 dark:text-slate-300"
                  aria-label="Close modal"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                      Symbol
                    </label>
                    <input
                      type="text"
                      placeholder="AAPL"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                      Direction
                    </label>
                    <select className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white">
                      <option value="long">Long</option>
                      <option value="short">Short</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                      Entry Price
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                      Quantity
                    </label>
                    <input
                      type="number"
                      placeholder="0"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                    Strategy
                  </label>
                  <select className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white">
                    <option value="">Select strategy...</option>
                    <option value="breakout">Breakout</option>
                    <option value="trend">Trend Follow</option>
                    <option value="momentum">Momentum</option>
                    <option value="mean_reversion">Mean Reversion</option>
                    <option value="scalp">Scalp</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                    Entry Reason
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Why did you enter this trade?"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white resize-none"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => setShowNewTradeModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-300 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-slate-700"
                  >
                    Cancel
                  </button>
                  <button className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700">
                    Log Trade
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
}
