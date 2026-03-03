"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  ArrowLeftIcon as ArrowLeft,
  ArrowTrendingUpIcon as TrendingUp,
  ChartBarIcon as BarChart,
  ShieldCheckIcon as Shield,
  BoltIcon as Zap,
  ClockIcon as Clock,
  BeakerIcon as Beaker,
  PencilIcon as Pencil,
  TrashIcon as Trash,
  StarIcon as Star,
  ArrowPathIcon as RefreshCw,
  ExclamationTriangleIcon as AlertTriangle,
  InformationCircleIcon as Info,
  CurrencyDollarIcon as DollarSign,
  TagIcon as Tag,
} from "@heroicons/react/24/outline";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

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
  backtest_results: Record<string, unknown> | null;
  degradation_factor: number | null;
  is_system: boolean;
  is_public: boolean;
  is_active: boolean;
  usage_count: number;
  user_id: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const RISK_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  low: { bg: "bg-green-50 dark:bg-green-900/20", text: "text-green-700 dark:text-green-300", border: "border-green-200 dark:border-green-800" },
  medium: { bg: "bg-yellow-50 dark:bg-yellow-900/20", text: "text-yellow-700 dark:text-yellow-300", border: "border-yellow-200 dark:border-yellow-800" },
  high: { bg: "bg-red-50 dark:bg-red-900/20", text: "text-red-700 dark:text-red-300", border: "border-red-200 dark:border-red-800" },
};

// ============================================================================
// STRATEGY DETAIL PAGE
// ============================================================================

export default function StrategyDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [strategy, setStrategy] = useState<Strategy | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const fetchStrategy = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/trading/strategies/${id}`);
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Failed to fetch strategy");
      setStrategy(body.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchStrategy();
  }, [fetchStrategy]);

  const handleDelete = async () => {
    if (!id) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/trading/strategies/${id}`, { method: "DELETE" });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Failed to delete strategy");
      router.push("/trading/strategies");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  // Loading
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex items-center justify-center">
        <RefreshCw className="h-6 w-6 animate-spin text-blue-500" />
        <span className="ml-2 text-gray-500 dark:text-gray-400">Loading strategy...</span>
      </div>
    );
  }

  // Error
  if (error || !strategy) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 p-8">
        <div className="mx-auto max-w-2xl rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-6 text-center">
          <AlertTriangle className="mx-auto h-8 w-8 text-red-500 mb-3" />
          <p className="text-red-700 dark:text-red-300">{error || "Strategy not found"}</p>
          <Link
            href="/trading/strategies"
            className="mt-4 inline-flex items-center gap-2 text-sm text-red-600 dark:text-red-400 hover:underline"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Library
          </Link>
        </div>
      </div>
    );
  }

  const riskLevel = (strategy.risk_params?.riskLevel as string) || "medium";
  const timeframe = (strategy.risk_params?.timeframe as string) || "swing";
  const indicators = (strategy.risk_params?.indicators as string[]) || [];
  const idealConditions = (strategy.risk_params?.idealConditions as string[]) || [];
  const riskStyle = RISK_COLORS[riskLevel] || RISK_COLORS.medium;
  const isOwned = !strategy.is_system && strategy.user_id;

  const entryRules = (strategy.config?.entryRules as Record<string, unknown>[]) || [];
  const exitRules = (strategy.config?.exitRules as Record<string, unknown>[]) || [];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 p-4 md:p-8">
      <div className="mx-auto max-w-5xl">
        {/* Breadcrumb */}
        <div className="mb-6 flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
          <Link href="/trading/strategies" className="hover:text-blue-500 transition-colors">
            Strategy Library
          </Link>
          <span>/</span>
          <span className="text-gray-900 dark:text-white">{strategy.name}</span>
        </div>

        {/* Header */}
        <div className="mb-6 rounded-xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                <BarChart className="h-6 w-6" />
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                    {strategy.name}
                  </h1>
                  {strategy.is_system && (
                    <span className="flex items-center gap-1 rounded-full bg-amber-100 dark:bg-amber-900/30 px-2.5 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-300">
                      <Star className="h-3 w-3" /> System
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 capitalize">
                  {strategy.category.replace(/_/g, " ")} Strategy
                </p>
                {strategy.description && (
                  <p className="mt-2 text-gray-600 dark:text-gray-300">{strategy.description}</p>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <Link
                href={`/trading/backtest?strategy=${strategy.id}`}
                className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
              >
                <Beaker className="h-4 w-4" />
                Run Backtest
              </Link>
              {isOwned && (
                <>
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="flex items-center gap-2 rounded-lg border border-red-300 dark:border-red-700 px-3 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  >
                    <Trash className="h-4 w-4" />
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Delete Confirmation */}
        {showDeleteConfirm && (
          <div className="mb-6 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 flex items-center justify-between">
            <p className="text-sm text-red-700 dark:text-red-300">
              Are you sure you want to delete this strategy? This action cannot be undone.
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="rounded-lg border border-gray-300 dark:border-slate-600 px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {deleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        )}

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column — Config Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Entry Rules */}
            <div className="rounded-xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 p-5">
              <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white">
                <TrendingUp className="h-5 w-5 text-green-500" />
                Entry Rules ({entryRules.length})
              </h2>
              {entryRules.length > 0 ? (
                <div className="space-y-3">
                  {entryRules.map((rule, i) => (
                    <RuleCard key={i} rule={rule} index={i} type="entry" />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400">No entry rules defined</p>
              )}
            </div>

            {/* Exit Rules */}
            <div className="rounded-xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 p-5">
              <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white">
                <Shield className="h-5 w-5 text-red-500" />
                Exit Rules ({exitRules.length})
              </h2>
              {exitRules.length > 0 ? (
                <div className="space-y-3">
                  {exitRules.map((rule, i) => (
                    <RuleCard key={i} rule={rule} index={i} type="exit" />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400">No exit rules defined</p>
              )}
            </div>

            {/* Position Sizing & Risk */}
            <div className="rounded-xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 p-5">
              <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white">
                <DollarSign className="h-5 w-5 text-blue-500" />
                Position Management
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <InfoItem label="Position Sizing" value={String(strategy.config?.positionSizing || "N/A")} />
                <InfoItem label="Position Value" value={strategy.config?.positionValue ? `${strategy.config.positionValue}%` : "N/A"} />
                <InfoItem label="Stop Loss" value={strategy.config?.stopLoss ? `${strategy.config.stopLoss}%` : "None"} />
                <InfoItem label="Take Profit" value={strategy.config?.takeProfit ? `${strategy.config.takeProfit}%` : "None"} />
                <InfoItem label="Trailing Stop" value={strategy.config?.trailingStop ? `${(strategy.config.trailingStop as Record<string, unknown>)?.percent || 0}%` : "None"} />
                <InfoItem label="Trading Hours" value={strategy.config?.tradingHours ? `${(strategy.config.tradingHours as Record<string, unknown>)?.start}–${(strategy.config.tradingHours as Record<string, unknown>)?.end}` : "All"} />
              </div>
            </div>

            {/* Backtest Results */}
            {strategy.backtest_results && (
              <div className="rounded-xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 p-5">
                <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white">
                  <Beaker className="h-5 w-5 text-purple-500" />
                  Last Backtest Results
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <StatCard
                    label="Total Return"
                    value={`${((strategy.backtest_results.totalReturn as number) * 100).toFixed(1)}%`}
                    positive={(strategy.backtest_results.totalReturn as number) >= 0}
                  />
                  <StatCard
                    label="Sharpe Ratio"
                    value={String((strategy.backtest_results.sharpeRatio as number)?.toFixed(2) || "N/A")}
                  />
                  <StatCard
                    label="Max Drawdown"
                    value={`${((strategy.backtest_results.maxDrawdown as number) * 100).toFixed(1)}%`}
                    positive={false}
                  />
                  <StatCard
                    label="Win Rate"
                    value={`${((strategy.backtest_results.winRate as number) * 100).toFixed(0)}%`}
                  />
                </div>
                {strategy.degradation_factor != null && (
                  <div className="mt-3 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                    <Info className="h-3 w-3" />
                    Degradation factor: {(strategy.degradation_factor * 100).toFixed(0)}%
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Column — Metadata Sidebar */}
          <div className="space-y-6">
            {/* Risk & Metadata */}
            <div className={`rounded-xl border p-5 ${riskStyle.bg} ${riskStyle.border}`}>
              <h3 className={`mb-3 font-semibold ${riskStyle.text}`}>Risk Profile</h3>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className={riskStyle.text}>Risk Level</span>
                  <span className={`font-medium capitalize ${riskStyle.text}`}>{riskLevel}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className={riskStyle.text}>Timeframe</span>
                  <span className={`font-medium capitalize ${riskStyle.text}`}>{timeframe.replace(/_/g, " ")}</span>
                </div>
              </div>
            </div>

            {/* Indicators */}
            {indicators.length > 0 && (
              <div className="rounded-xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 p-5">
                <h3 className="mb-3 font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <Tag className="h-4 w-4" />
                  Indicators
                </h3>
                <div className="flex flex-wrap gap-2">
                  {indicators.map((ind) => (
                    <span key={ind} className="rounded-full bg-blue-50 dark:bg-blue-900/20 px-2.5 py-0.5 text-xs font-medium text-blue-700 dark:text-blue-300">
                      {ind}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Ideal Conditions */}
            {idealConditions.length > 0 && (
              <div className="rounded-xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 p-5">
                <h3 className="mb-3 font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <Zap className="h-4 w-4" />
                  Ideal Conditions
                </h3>
                <div className="flex flex-wrap gap-2">
                  {idealConditions.map((cond) => (
                    <span key={cond} className="rounded-full bg-purple-50 dark:bg-purple-900/20 px-2.5 py-0.5 text-xs font-medium text-purple-700 dark:text-purple-300 capitalize">
                      {cond.replace(/_/g, " ")}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Info Card */}
            <div className="rounded-xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 p-5">
              <h3 className="mb-3 font-semibold text-gray-900 dark:text-white">Details</h3>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-gray-500 dark:text-gray-400">Slug</dt>
                  <dd className="font-mono text-gray-700 dark:text-gray-300">{strategy.slug}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500 dark:text-gray-400">Category</dt>
                  <dd className="capitalize text-gray-700 dark:text-gray-300">{strategy.category.replace(/_/g, " ")}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500 dark:text-gray-400">Visibility</dt>
                  <dd className="text-gray-700 dark:text-gray-300">
                    {strategy.is_system ? "System" : strategy.is_public ? "Public" : "Private"}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500 dark:text-gray-400">Uses</dt>
                  <dd className="text-gray-700 dark:text-gray-300">{strategy.usage_count ?? 0}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500 dark:text-gray-400">Created</dt>
                  <dd className="text-gray-700 dark:text-gray-300">
                    {new Date(strategy.created_at).toLocaleDateString()}
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

function RuleCard({
  rule,
  index,
  type,
}: {
  rule: Record<string, unknown>;
  index: number;
  type: "entry" | "exit";
}) {
  const indicator = (rule.indicator as string) || "unknown";
  const condition = (rule.condition as string) || "";
  const value = rule.value;
  const weight = rule.weight as number | undefined;
  const color = type === "entry" ? "green" : "red";

  return (
    <div className={`rounded-lg border border-${color}-100 dark:border-${color}-900/30 bg-${color}-50/50 dark:bg-${color}-900/10 p-3`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`flex h-5 w-5 items-center justify-center rounded text-xs font-bold text-${color}-700 dark:text-${color}-300 bg-${color}-100 dark:bg-${color}-900/30`}>
            {index + 1}
          </span>
          <span className="font-medium text-sm text-gray-900 dark:text-white uppercase">
            {indicator}
          </span>
        </div>
        {weight != null && (
          <span className="text-xs text-gray-500 dark:text-gray-400">
            weight: {weight}
          </span>
        )}
      </div>
      <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
        {condition} {value != null ? String(value) : ""}
        {rule.params ? ` (${JSON.stringify(rule.params)})` : ""}
      </p>
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-gray-500 dark:text-gray-400">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium text-gray-900 dark:text-white capitalize">
        {value}
      </dd>
    </div>
  );
}

function StatCard({
  label,
  value,
  positive,
}: {
  label: string;
  value: string;
  positive?: boolean;
}) {
  return (
    <div className="rounded-lg bg-gray-50 dark:bg-slate-700 p-3 text-center">
      <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
      <p
        className={`mt-1 text-lg font-bold ${
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
