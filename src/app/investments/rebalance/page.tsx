"use client";

/**
 * Portfolio Rebalancing.
 *
 * WHAT THIS PAGE USED TO TELL EVERY VISITOR, WITH NO FETCH IN THE FILE.
 *
 *   that they held $27,500 of US Stocks, 55% against a 50% target, 5% adrift
 *   and then, as instructions:
 *     sell US Stocks      $2,500
 *     buy International   $1,000
 *     buy Bonds           $1,500
 *
 * That is not a misleading summary, it is a trade list. Someone who trusted it
 * would have placed orders against a portfolio they do not own. It is the
 * highest-consequence fabrication found in the web tree: the other screens
 * misinform, this one instructs.
 *
 * WHAT IT DOES NOW.
 *   GET  /api/investments/portfolio            -> { success, data: Portfolio }
 *   POST /api/investments/allocation-analysis  -> { success, data: AssetAllocationAnalysis }
 *
 * `AssetAllocationService.analyzeAllocation` (AssetAllocationService.ts:211)
 * computes current allocations, drift and rebalancing recommendations from the
 * portfolio it is given. It contains no `Math.random` and does real
 * arithmetic, so what appears here is derived from the user's own holdings.
 *
 * RISK TOLERANCE IS ASKED, NOT ASSUMED. The target model depends on it, and
 * nothing in the profile records it. Rather than defaulting silently to
 * "moderate" and presenting the resulting targets as though they were the
 * user's plan, the selector is on screen, its default is labelled, and the
 * analysis re-runs when it changes.
 *
 * WITH NO HOLDINGS THERE IS NO ANALYSIS. An empty portfolio produces an empty
 * state, not a model allocation shown as though it were a position.
 */

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  PieChart,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  TrendingDown,
  Info,
} from "lucide-react";

const RISK_OPTIONS = [
  { value: "very_conservative", label: "Very conservative" },
  { value: "conservative", label: "Conservative" },
  { value: "moderate", label: "Moderate" },
  { value: "aggressive", label: "Aggressive" },
  { value: "very_aggressive", label: "Very aggressive" },
] as const;

type RiskValue = (typeof RISK_OPTIONS)[number]["value"];

/** Mirrors AssetAllocation in asset-allocation.types.ts:54. */
interface AssetAllocation {
  assetClass: string;
  percentage: number;
  value: number;
  targetPercentage?: number;
  deviation?: number;
}

/** Mirrors RebalancingRecommendation in asset-allocation.types.ts:98. */
interface RebalancingRecommendation {
  symbol: string;
  currentValue: number;
  currentPercentage: number;
  targetPercentage: number;
  action: "buy" | "sell" | "hold";
  sharesToTrade: number;
  valueToTrade: number;
  reason: string;
  priority: "high" | "medium" | "low";
}

interface Analysis {
  currentAllocations: AssetAllocation[];
  deviationFromTarget: number;
  needsRebalancing: boolean;
  rebalancingRecommendations: RebalancingRecommendation[];
  diversificationScore?: number;
}

interface Portfolio {
  holdings?: unknown[];
  totalValue?: number;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function titleCase(value: string): string {
  return value
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(" ");
}

export default function RebalancePage() {
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [risk, setRisk] = useState<RiskValue>("moderate");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/investments/portfolio");
      const json = await res.json().catch(() => null);
      const p = json?.data as Portfolio | undefined;

      if (!res.ok || !p) {
        setPortfolio(null);
        setAnalysis(null);
        setError(
          "We could not load your portfolio. Nothing here is filled in for you — try again in a moment.",
        );
        setLoading(false);
        return;
      }

      setPortfolio(p);

      // No holdings, no analysis. A model allocation is not a position.
      if (!Array.isArray(p.holdings) || p.holdings.length === 0) {
        setAnalysis(null);
        setLoading(false);
        return;
      }

      const aRes = await fetch("/api/investments/allocation-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ portfolio: p, riskTolerance: risk }),
      });
      const aJson = await aRes.json().catch(() => null);
      if (!aRes.ok || !aJson?.data) {
        setAnalysis(null);
        setError(
          "We could not analyse your allocation. We are not going to show you trades we did not compute.",
        );
      } else {
        setAnalysis(aJson.data as Analysis);
      }
    } catch {
      setPortfolio(null);
      setAnalysis(null);
      setError("We could not reach the portfolio service.");
    }
    setLoading(false);
  }, [risk]);

  useEffect(() => {
    load();
  }, [load]);

  const trades = (analysis?.rebalancingRecommendations ?? []).filter(
    (r) => r.action !== "hold",
  );
  const hasHoldings =
    Array.isArray(portfolio?.holdings) && portfolio!.holdings!.length > 0;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
            <PieChart className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Portfolio Rebalancing
          </h1>
        </div>
        <p className="text-gray-600 dark:text-slate-400 mb-8">
          How your holdings sit against a target model.
        </p>

        {error && (
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 mb-6 border border-amber-200 dark:border-amber-900/50">
            <p className="font-medium text-gray-900 dark:text-white mb-1">
              Rebalancing is unavailable
            </p>
            <p className="text-sm text-gray-600 dark:text-slate-300">{error}</p>
          </div>
        )}

        {/* Asked, not assumed: the target model depends on this and nothing
            records it against the account. */}
        <div className="bg-white dark:bg-slate-800 rounded-xl p-5 mb-6 shadow-sm border border-gray-200 dark:border-slate-700">
          <label
            htmlFor="risk"
            className="block text-sm font-medium text-gray-900 dark:text-white mb-1"
          >
            Risk tolerance
          </label>
          <p className="text-xs text-gray-500 dark:text-slate-400 mb-2">
            We have not recorded yours, so this starts at Moderate. The targets
            below follow whatever you pick.
          </p>
          <select
            id="risk"
            value={risk}
            onChange={(e) => setRisk(e.target.value as RiskValue)}
            className="px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-white"
          >
            {RISK_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {loading ? (
          <div className="space-y-4 animate-pulse">
            {[1, 2].map((i) => (
              <div
                key={i}
                className="h-40 bg-gray-200 dark:bg-slate-700 rounded-xl"
              />
            ))}
          </div>
        ) : !hasHoldings ? (
          <div className="bg-white dark:bg-slate-800 rounded-xl p-10 text-center border border-gray-200 dark:border-slate-700">
            <PieChart className="w-8 h-8 text-gray-400 dark:text-slate-500 mx-auto mb-3" />
            <p className="font-medium text-gray-900 dark:text-white">
              No holdings to rebalance
            </p>
            <p className="text-sm text-gray-600 dark:text-slate-400 mt-1">
              There is nothing in your portfolio yet, so there is nothing to
              compare against a target.
            </p>
          </div>
        ) : (
          analysis && (
            <>
              <div
                className={`rounded-xl p-5 mb-6 border ${
                  analysis.needsRebalancing
                    ? "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-900/50"
                    : "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-900/50"
                }`}
              >
                <div className="flex items-center gap-3">
                  {analysis.needsRebalancing ? (
                    <AlertTriangle className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                  ) : (
                    <CheckCircle className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                  )}
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white">
                      {analysis.needsRebalancing
                        ? "Your allocation has drifted from the target"
                        : "Your allocation is close to the target"}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-slate-300">
                      Overall deviation{" "}
                      {analysis.deviationFromTarget.toFixed(1)}%.
                    </p>
                  </div>
                </div>
              </div>

              {/* Current allocation */}
              <div className="bg-white dark:bg-slate-800 rounded-xl p-6 mb-6 shadow-sm border border-gray-200 dark:border-slate-700">
                <h2 className="font-semibold text-gray-900 dark:text-white mb-4">
                  Current allocation
                </h2>
                <div className="space-y-4">
                  {analysis.currentAllocations.map((allocation) => (
                    <motion.div
                      key={allocation.assetClass}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {titleCase(allocation.assetClass)}
                        </span>
                        <span className="text-sm text-gray-600 dark:text-slate-300">
                          {allocation.percentage.toFixed(1)}%
                          {typeof allocation.targetPercentage === "number" && (
                            <span className="text-gray-400 dark:text-slate-500">
                              {" "}
                              / {allocation.targetPercentage.toFixed(1)}% target
                            </span>
                          )}
                        </span>
                      </div>
                      <div className="h-2 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-500 rounded-full"
                          style={{
                            width: `${Math.min(100, allocation.percentage)}%`,
                          }}
                        />
                      </div>
                      <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                        {formatCurrency(allocation.value)}
                      </p>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Recommended trades */}
              <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-slate-700">
                <h2 className="font-semibold text-gray-900 dark:text-white mb-1">
                  Suggested trades
                </h2>
                <p className="text-xs text-gray-500 dark:text-slate-400 mb-4 flex items-start gap-1">
                  <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                  Computed from your holdings against the model for the risk
                  level above. Fynvita does not place these for you.
                </p>
                {trades.length === 0 ? (
                  <p className="text-sm text-gray-600 dark:text-slate-400">
                    Nothing to trade — your holdings already sit within the
                    target range.
                  </p>
                ) : (
                  <ul className="divide-y divide-gray-100 dark:divide-slate-700">
                    {trades.map((trade) => (
                      <li
                        key={trade.symbol}
                        className="py-3 flex items-center gap-3"
                      >
                        {trade.action === "sell" ? (
                          <TrendingDown className="w-4 h-4 text-rose-500 flex-shrink-0" />
                        ) : (
                          <TrendingUp className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                        )}
                        <div className="flex-1">
                          <p className="font-medium text-gray-900 dark:text-white capitalize">
                            {trade.action} {trade.symbol}
                          </p>
                          {trade.reason && (
                            <p className="text-xs text-gray-500 dark:text-slate-400">
                              {trade.reason}
                            </p>
                          )}
                        </div>
                        <span className="text-sm font-semibold text-gray-900 dark:text-white">
                          {formatCurrency(trade.valueToTrade)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </>
          )
        )}

        <button
          onClick={load}
          disabled={loading}
          className="mt-6 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-sm font-medium text-gray-700 dark:text-slate-300 disabled:opacity-50"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>
    </div>
  );
}
