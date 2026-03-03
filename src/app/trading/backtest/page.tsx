"use client";

import React, { Suspense, useState, useEffect, useCallback } from "react";
import {
  BeakerIcon as Beaker,
  ChartBarIcon as BarChart,
  ArrowTrendingUpIcon as TrendingUp,
  ArrowTrendingDownIcon as TrendingDown,
  ArrowPathIcon as RefreshCw,
  FunnelIcon as Filter,
  MagnifyingGlassIcon as Search,
  CalendarIcon as Calendar,
  CurrencyDollarIcon as DollarSign,
  ClockIcon as Clock,
  ChevronDownIcon as ChevronDown,
  ChevronUpIcon as ChevronUp,
  ExclamationTriangleIcon as AlertTriangle,
} from "@heroicons/react/24/outline";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

// ============================================================================
// TYPES
// ============================================================================

interface BacktestResult {
  id: string;
  user_id: string;
  strategy_name: string;
  strategy_config: Record<string, unknown>;
  start_date: string;
  end_date: string;
  initial_capital: number;
  symbols: string[];
  total_return: number;
  annualized_return: number | null;
  sharpe_ratio: number;
  sortino_ratio: number | null;
  max_drawdown: number;
  win_rate: number;
  profit_factor: number | null;
  total_trades: number;
  equity_curve: unknown[] | null;
  trades: unknown[] | null;
  monthly_returns: unknown | null;
  created_at: string;
}

type SortField = "created_at" | "total_return" | "sharpe_ratio" | "max_drawdown" | "win_rate" | "total_trades";
type SortDir = "asc" | "desc";

// ============================================================================
// BACKTEST RESULTS PAGE
// ============================================================================

export default function BacktestResultsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex items-center justify-center">
        <RefreshCw className="h-6 w-6 animate-spin text-blue-500" />
      </div>
    }>
      <BacktestResultsContent />
    </Suspense>
  );
}

function BacktestResultsContent() {
  const searchParams = useSearchParams();
  const strategyFilter = searchParams?.get("strategy") || "";

  const [results, setResults] = useState<BacktestResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [symbolFilter, setSymbolFilter] = useState("");
  const [strategySearch, setStrategySearch] = useState(strategyFilter);
  const [sortField, setSortField] = useState<SortField>("created_at");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);

  const fetchResults = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (strategySearch.trim()) params.set("strategy", strategySearch.trim());
      if (symbolFilter.trim()) params.set("symbol", symbolFilter.trim().toUpperCase());
      params.set("limit", "50");

      const res = await fetch(`/api/trading/backtest?${params.toString()}`);
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Failed to fetch results");

      setResults(body.data ?? []);
      setTotalCount(body.count ?? 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [strategySearch, symbolFilter]);

  useEffect(() => {
    const debounce = setTimeout(fetchResults, 300);
    return () => clearTimeout(debounce);
  }, [fetchResults]);

  // Client-side sort
  const sortedResults = [...results].sort((a, b) => {
    const aVal = a[sortField] ?? 0;
    const bVal = b[sortField] ?? 0;
    if (typeof aVal === "string" && typeof bVal === "string") {
      return sortDir === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    }
    return sortDir === "asc" ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
  });

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 p-4 md:p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
              <Beaker className="h-7 w-7 text-purple-500" />
              Backtest Results
            </h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Review historical performance of your trading strategies
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/trading/strategies"
              className="flex items-center gap-2 rounded-lg border border-gray-300 dark:border-slate-600 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
            >
              <BarChart className="h-4 w-4" />
              Strategy Library
            </Link>
            <Link
              href="/trading"
              className="flex items-center gap-2 rounded-lg border border-gray-300 dark:border-slate-600 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
            >
              Trading Dashboard
            </Link>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 rounded-xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Filter by strategy name..."
              value={strategySearch}
              onChange={(e) => setStrategySearch(e.target.value)}
              className="w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 pl-10 pr-4 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Symbol (e.g. AAPL)"
              value={symbolFilter}
              onChange={(e) => setSymbolFilter(e.target.value)}
              className="rounded-lg border border-gray-300 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 pl-10 pr-4 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 w-40"
            />
          </div>
          <button
            onClick={fetchResults}
            className="flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* Stats Summary */}
      {!loading && results.length > 0 && <SummaryBar results={results} />}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <RefreshCw className="h-6 w-6 animate-spin text-purple-500" />
          <span className="ml-2 text-gray-500 dark:text-gray-400">Loading results...</span>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mb-6 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
          </div>
        </div>
      )}

      {/* Results Table */}
      {!loading && !error && (
        <div className="rounded-xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 overflow-hidden">
          {results.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Beaker className="h-12 w-12 text-gray-300 dark:text-slate-600 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">No backtest results</h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Run a backtest from the Strategy Library to see results here
              </p>
              <Link
                href="/trading/strategies"
                className="mt-4 text-sm text-purple-600 dark:text-purple-400 hover:underline"
              >
                Browse Strategies
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-slate-700/50">
                  <tr>
                    <SortHeader field="created_at" label="Date" sortField={sortField} sortDir={sortDir} onToggle={toggleSort} />
                    <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Strategy</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Symbols</th>
                    <SortHeader field="total_return" label="Return" sortField={sortField} sortDir={sortDir} onToggle={toggleSort} />
                    <SortHeader field="sharpe_ratio" label="Sharpe" sortField={sortField} sortDir={sortDir} onToggle={toggleSort} />
                    <SortHeader field="max_drawdown" label="Drawdown" sortField={sortField} sortDir={sortDir} onToggle={toggleSort} />
                    <SortHeader field="win_rate" label="Win Rate" sortField={sortField} sortDir={sortDir} onToggle={toggleSort} />
                    <SortHeader field="total_trades" label="Trades" sortField={sortField} sortDir={sortDir} onToggle={toggleSort} />
                    <th className="px-4 py-3 w-8" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                  {sortedResults.map((result) => (
                    <React.Fragment key={result.id}>
                      <tr
                        className="hover:bg-gray-50 dark:hover:bg-slate-700/30 cursor-pointer transition-colors"
                        onClick={() => setExpandedId(expandedId === result.id ? null : result.id)}
                      >
                        <td className="px-4 py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap">
                          {new Date(result.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                          {result.strategy_name}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1">
                            {result.symbols.slice(0, 3).map((s) => (
                              <span key={s} className="rounded bg-gray-100 dark:bg-slate-700 px-1.5 py-0.5 text-xs font-mono text-gray-700 dark:text-gray-300">
                                {s}
                              </span>
                            ))}
                            {result.symbols.length > 3 && (
                              <span className="text-xs text-gray-400">+{result.symbols.length - 3}</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={result.total_return >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}>
                            {(result.total_return * 100).toFixed(1)}%
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-700 dark:text-gray-300 whitespace-nowrap">
                          {result.sharpe_ratio.toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-red-600 dark:text-red-400 whitespace-nowrap">
                          {(result.max_drawdown * 100).toFixed(1)}%
                        </td>
                        <td className="px-4 py-3 text-gray-700 dark:text-gray-300 whitespace-nowrap">
                          {(result.win_rate * 100).toFixed(0)}%
                        </td>
                        <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                          {result.total_trades}
                        </td>
                        <td className="px-4 py-3">
                          {expandedId === result.id ? (
                            <ChevronUp className="h-4 w-4 text-gray-400" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-gray-400" />
                          )}
                        </td>
                      </tr>
                      {expandedId === result.id && (
                        <tr>
                          <td colSpan={9} className="p-0">
                            <ExpandedResultRow result={result} />
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Footer */}
          {results.length > 0 && (
            <div className="px-4 py-3 border-t border-gray-100 dark:border-slate-700 text-xs text-gray-500 dark:text-gray-400">
              Showing {results.length} of {totalCount} results
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

function SummaryBar({ results }: { results: BacktestResult[] }) {
  const avgReturn = results.reduce((s, r) => s + r.total_return, 0) / results.length;
  const avgSharpe = results.reduce((s, r) => s + r.sharpe_ratio, 0) / results.length;
  const avgWinRate = results.reduce((s, r) => s + r.win_rate, 0) / results.length;
  const bestReturn = Math.max(...results.map((r) => r.total_return));
  const totalTrades = results.reduce((s, r) => s + r.total_trades, 0);

  return (
    <div className="mb-6 grid grid-cols-2 md:grid-cols-5 gap-4">
      <MiniStat label="Avg Return" value={`${(avgReturn * 100).toFixed(1)}%`} positive={avgReturn >= 0} />
      <MiniStat label="Avg Sharpe" value={avgSharpe.toFixed(2)} />
      <MiniStat label="Avg Win Rate" value={`${(avgWinRate * 100).toFixed(0)}%`} />
      <MiniStat label="Best Return" value={`${(bestReturn * 100).toFixed(1)}%`} positive={bestReturn >= 0} />
      <MiniStat label="Total Trades" value={String(totalTrades)} />
    </div>
  );
}

function MiniStat({
  label,
  value,
  positive,
}: {
  label: string;
  value: string;
  positive?: boolean;
}) {
  return (
    <div className="rounded-lg bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 p-3">
      <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
      <p
        className={`mt-0.5 text-lg font-bold ${
          positive === true
            ? "text-green-600 dark:text-green-400"
            : positive === false
              ? "text-red-600 dark:text-red-400"
              : "text-gray-900 dark:text-white"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function SortHeader({
  field,
  label,
  sortField,
  sortDir,
  onToggle,
}: {
  field: SortField;
  label: string;
  sortField: SortField;
  sortDir: SortDir;
  onToggle: (field: SortField) => void;
}) {
  const active = sortField === field;
  return (
    <th
      className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400 cursor-pointer hover:text-gray-700 dark:hover:text-gray-200 select-none whitespace-nowrap"
      onClick={() => onToggle(field)}
    >
      <span className="flex items-center gap-1">
        {label}
        {active && (sortDir === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)}
      </span>
    </th>
  );
}

function ExpandedResultRow({ result }: { result: BacktestResult }) {
  return (
    <div className="bg-gray-50 dark:bg-slate-700/30 p-5 border-t border-gray-100 dark:border-slate-700">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400">Date Range</p>
          <p className="text-sm font-medium text-gray-900 dark:text-white">
            {result.start_date} — {result.end_date}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400">Initial Capital</p>
          <p className="text-sm font-medium text-gray-900 dark:text-white">
            ${result.initial_capital.toLocaleString()}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400">Annualized Return</p>
          <p className={`text-sm font-medium ${(result.annualized_return ?? 0) >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
            {result.annualized_return != null ? `${(result.annualized_return * 100).toFixed(1)}%` : "N/A"}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400">Sortino Ratio</p>
          <p className="text-sm font-medium text-gray-900 dark:text-white">
            {result.sortino_ratio != null ? result.sortino_ratio.toFixed(2) : "N/A"}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400">Profit Factor</p>
          <p className="text-sm font-medium text-gray-900 dark:text-white">
            {result.profit_factor != null ? result.profit_factor.toFixed(2) : "N/A"}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400">Symbols</p>
          <p className="text-sm font-medium text-gray-900 dark:text-white font-mono">
            {result.symbols.join(", ")}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400">Total Trades</p>
          <p className="text-sm font-medium text-gray-900 dark:text-white">{result.total_trades}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400">Created</p>
          <p className="text-sm font-medium text-gray-900 dark:text-white">
            {new Date(result.created_at).toLocaleString()}
          </p>
        </div>
      </div>

      {/* Equity Curve Placeholder */}
      {result.equity_curve && Array.isArray(result.equity_curve) && result.equity_curve.length > 0 && (
        <div className="mt-4 rounded-lg bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 p-4">
          <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Equity Curve</h4>
          <div className="flex items-end gap-px h-20">
            {sampleEquityCurve(result.equity_curve).map((val, i) => {
              const max = Math.max(...sampleEquityCurve(result.equity_curve!).map(Math.abs));
              const height = max > 0 ? (Math.abs(val) / max) * 100 : 0;
              return (
                <div
                  key={i}
                  className={`flex-1 rounded-t ${val >= 0 ? "bg-green-400 dark:bg-green-500" : "bg-red-400 dark:bg-red-500"}`}
                  style={{ height: `${Math.max(height, 2)}%` }}
                />
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function sampleEquityCurve(curve: unknown[]): number[] {
  const maxBars = 60;
  if (curve.length <= maxBars) {
    return curve.map((p) => {
      if (typeof p === "number") return p;
      if (typeof p === "object" && p && "equity" in p) return (p as { equity: number }).equity;
      return 0;
    });
  }
  const step = Math.ceil(curve.length / maxBars);
  const sampled: number[] = [];
  for (let i = 0; i < curve.length; i += step) {
    const point = curve[i];
    if (typeof point === "number") sampled.push(point);
    else if (typeof point === "object" && point && "equity" in point) sampled.push((point as { equity: number }).equity);
    else sampled.push(0);
  }
  return sampled;
}
