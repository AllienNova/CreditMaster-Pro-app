"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  MagnifyingGlassIcon as Search,
  FunnelIcon as Filter,
  ArrowTrendingUpIcon as TrendingUp,
  ChartBarIcon as BarChart,
  ShieldCheckIcon as Shield,
  BoltIcon as Zap,
  ClockIcon as Clock,
  PlusIcon as Plus,
  ArrowPathIcon as RefreshCw,
  ChevronRightIcon as ChevronRight,
  BeakerIcon as Beaker,
  StarIcon as Star,
} from "@heroicons/react/24/outline";
import Link from "next/link";

// ============================================================================
// TYPES
// ============================================================================

interface Strategy {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  category: string;
  config: Record<string, unknown>;
  risk_params: Record<string, unknown>;
  is_system: boolean;
  is_public: boolean;
  is_active: boolean;
  usage_count: number;
  created_at: string;
  user_id: string | null;
}

type CategoryFilter = "all" | "momentum" | "mean_reversion" | "trend_following" | "volatility" | "volume" | "gap" | "breakout" | "pctt";
type RiskFilter = "all" | "low" | "medium" | "high";

// ============================================================================
// CONSTANTS
// ============================================================================

const CATEGORIES: { value: CategoryFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "momentum", label: "Momentum" },
  { value: "mean_reversion", label: "Mean Reversion" },
  { value: "trend_following", label: "Trend Following" },
  { value: "volatility", label: "Volatility" },
  { value: "volume", label: "Volume" },
  { value: "gap", label: "Gap" },
  { value: "breakout", label: "Breakout" },
  { value: "pctt", label: "PCTT" },
];

const RISK_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  low: { bg: "bg-green-100 dark:bg-green-900/30", text: "text-green-700 dark:text-green-300", dot: "bg-green-500" },
  medium: { bg: "bg-yellow-100 dark:bg-yellow-900/30", text: "text-yellow-700 dark:text-yellow-300", dot: "bg-yellow-500" },
  high: { bg: "bg-red-100 dark:bg-red-900/30", text: "text-red-700 dark:text-red-300", dot: "bg-red-500" },
};

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  momentum: <TrendingUp className="h-4 w-4" />,
  mean_reversion: <RefreshCw className="h-4 w-4" />,
  trend_following: <TrendingUp className="h-4 w-4" />,
  volatility: <Zap className="h-4 w-4" />,
  volume: <BarChart className="h-4 w-4" />,
  gap: <ChevronRight className="h-4 w-4" />,
  breakout: <Zap className="h-4 w-4" />,
  pctt: <Shield className="h-4 w-4" />,
};

// ============================================================================
// STRATEGY LIBRARY PAGE
// ============================================================================

export default function StrategyLibraryPage() {
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all");
  const [riskFilter, setRiskFilter] = useState<RiskFilter>("all");
  const [systemOnly, setSystemOnly] = useState(false);
  const [totalCount, setTotalCount] = useState(0);

  const fetchStrategies = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (categoryFilter !== "all") params.set("category", categoryFilter);
      if (search.trim()) params.set("search", search.trim());
      if (systemOnly) params.set("system", "true");
      params.set("limit", "50");

      const res = await fetch(`/api/trading/strategies?${params.toString()}`);
      const body = await res.json();

      if (!res.ok) {
        throw new Error(body.error || "Failed to fetch strategies");
      }

      let data: Strategy[] = body.data ?? [];

      // Client-side risk filter (API doesn't filter by risk_params directly)
      if (riskFilter !== "all") {
        data = data.filter((s) => {
          const risk = (s.risk_params as Record<string, unknown>)?.riskLevel;
          return risk === riskFilter;
        });
      }

      setStrategies(data);
      setTotalCount(body.count ?? data.length);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [search, categoryFilter, riskFilter, systemOnly]);

  useEffect(() => {
    const debounce = setTimeout(fetchStrategies, 300);
    return () => clearTimeout(debounce);
  }, [fetchStrategies]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 p-4 md:p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Strategy Library
            </h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Browse pre-built and custom trading strategies
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/trading/backtest"
              className="flex items-center gap-2 rounded-lg border border-gray-300 dark:border-slate-600 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
            >
              <Beaker className="h-4 w-4" />
              Backtest Results
            </Link>
            <Link
              href="/trading"
              className="flex items-center gap-2 rounded-lg border border-gray-300 dark:border-slate-600 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
            >
              <BarChart className="h-4 w-4" />
              Trading Dashboard
            </Link>
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="mb-6 rounded-xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 p-4">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search strategies..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 pl-10 pr-4 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Category Filter */}
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-400" />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value as CategoryFilter)}
              className="rounded-lg border border-gray-300 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>

          {/* Risk Filter */}
          <select
            value={riskFilter}
            onChange={(e) => setRiskFilter(e.target.value as RiskFilter)}
            className="rounded-lg border border-gray-300 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Risk</option>
            <option value="low">Low Risk</option>
            <option value="medium">Medium Risk</option>
            <option value="high">High Risk</option>
          </select>

          {/* System Only Toggle */}
          <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 cursor-pointer">
            <input
              type="checkbox"
              checked={systemOnly}
              onChange={(e) => setSystemOnly(e.target.checked)}
              className="rounded border-gray-300 dark:border-slate-600 text-blue-500 focus:ring-blue-500"
            />
            System Only
          </label>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="mb-6 flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
        <span>{totalCount} strategies found</span>
        {strategies.filter((s) => s.is_system).length > 0 && (
          <span className="flex items-center gap-1">
            <Star className="h-3 w-3 text-amber-500" />
            {strategies.filter((s) => s.is_system).length} system
          </span>
        )}
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <RefreshCw className="h-6 w-6 animate-spin text-blue-500" />
          <span className="ml-2 text-gray-500 dark:text-gray-400">Loading strategies...</span>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mb-6 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4">
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
          <button
            onClick={fetchStrategies}
            className="mt-2 text-sm text-red-600 dark:text-red-400 underline hover:no-underline"
          >
            Retry
          </button>
        </div>
      )}

      {/* Strategy Grid */}
      {!loading && !error && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {strategies.map((strategy) => (
            <StrategyCard key={strategy.id} strategy={strategy} />
          ))}

          {strategies.length === 0 && (
            <div className="col-span-full flex flex-col items-center justify-center py-16 text-center">
              <BarChart className="h-12 w-12 text-gray-300 dark:text-slate-600 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">No strategies found</h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Try adjusting your filters or search terms
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// STRATEGY CARD
// ============================================================================

function StrategyCard({ strategy }: { strategy: Strategy }) {
  const riskLevel = ((strategy.risk_params as Record<string, unknown>)?.riskLevel as string) || "medium";
  const timeframe = ((strategy.risk_params as Record<string, unknown>)?.timeframe as string) || "swing";
  const riskStyle = RISK_COLORS[riskLevel] || RISK_COLORS.medium;
  const categoryIcon = CATEGORY_ICONS[strategy.category] || <BarChart className="h-4 w-4" />;

  return (
    <Link
      href={`/trading/strategies/${strategy.id}`}
      className="group block rounded-xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 p-5 hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-md transition-all"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
            {categoryIcon}
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
              {strategy.name}
            </h3>
            <span className="text-xs text-gray-500 dark:text-gray-400 capitalize">
              {strategy.category.replace(/_/g, " ")}
            </span>
          </div>
        </div>
        {strategy.is_system && (
          <span className="flex items-center gap-1 rounded-full bg-amber-100 dark:bg-amber-900/30 px-2 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-300">
            <Star className="h-3 w-3" />
            System
          </span>
        )}
      </div>

      {/* Description */}
      {strategy.description && (
        <p className="mb-3 text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
          {strategy.description}
        </p>
      )}

      {/* Tags */}
      <div className="flex flex-wrap gap-2 mb-3">
        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${riskStyle.bg} ${riskStyle.text}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${riskStyle.dot}`} />
          {riskLevel} risk
        </span>
        <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 dark:bg-slate-700 px-2 py-0.5 text-xs font-medium text-gray-600 dark:text-gray-300">
          <Clock className="h-3 w-3" />
          {timeframe.replace(/_/g, " ")}
        </span>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-gray-400 dark:text-gray-500 pt-3 border-t border-gray-100 dark:border-slate-700">
        <span>{strategy.usage_count ?? 0} uses</span>
        <span className="flex items-center gap-1 text-blue-500 dark:text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity">
          View Details <ChevronRight className="h-3 w-3" />
        </span>
      </div>
    </Link>
  );
}
