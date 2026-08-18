/**
 * Insights.
 *
 * WHAT THIS PAGE ASSERTED ABOUT THE READER, WITH NO FETCH IN THE FILE.
 *
 * The constant was labelled "Mock Data" and rendered as measurements:
 *
 *   "Your overall credit utilization has increased from 22% to 31% over the
 *    last 60 days"                                        confidence 94%
 *   "Your dining and entertainment spending increased 45% this month
 *    compared to your 3-month average"                    confidence 88%
 *   "Your average account age has increased to 4.2 years" confidence 91%
 *   "Your portfolio allocation has drifted 12% from your target"
 *   "Your emergency fund currently covers 1.8 months of expenses"
 *
 * Every one is a number nobody computed, about accounts nobody read, and the
 * word "detected" sat beside them. The confidence percentages made it worse: a
 * made-up figure carrying a made-up certainty about itself.
 *
 * WHAT WAS ALREADY BUILT AND UNREACHABLE.
 *
 *   GET  /api/financial/insights?stored=true -> smartInsightsEngine
 *   POST /api/financial/insights             -> dismiss / record an action
 *
 * SmartInsightsEngine reads six tables and contains no Math.random. Its
 * `FinancialInsight` (types/insight.types.ts:43) carries a REAL `confidence`
 * (0-100) and a `dataSource` naming what the insight was computed from — so
 * confidence is still shown, and now it means something.
 *
 * WHY `stored=true`. The route can also generate insights on demand, which
 * runs a model. A page view should not silently spend that, and an insight the
 * reader dismissed must stay dismissed rather than being regenerated under
 * them on the next visit.
 *
 * Dismiss is wired because the route has always supported it and nothing
 * called it. An insight you cannot dismiss is a notification you cannot turn
 * off. It removes the card only after the server confirms — hiding it first
 * would show a dismissal that did not happen.
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

/** Mirrors InsightCategory in types/insight.types.ts:25. */
const CATEGORY_LABELS: Record<string, string> = {
  spending: "Spending",
  savings: "Savings",
  bills: "Bills",
  budget: "Budget",
  income: "Income",
  accounts: "Accounts",
  credit: "Credit",
  investments: "Investments",
  debt: "Debt",
  goals: "Goals",
};

const PRIORITY_CLASSES: Record<string, string> = {
  critical: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",
  high: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  medium: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  low: "bg-gray-100 text-gray-700 dark:bg-slate-700 dark:text-slate-300",
  info: "bg-gray-100 text-gray-700 dark:bg-slate-700 dark:text-slate-300",
};

const TREND_LABELS: Record<string, string> = {
  up: "trending up",
  down: "trending down",
  stable: "steady",
};

/** Mirrors InsightAction in types/insight.types.ts:86. */
interface InsightAction {
  id: string;
  label: string;
  type: string;
  href?: string;
}

/** Mirrors FinancialInsight in types/insight.types.ts:43. */
interface Insight {
  id: string;
  type: string;
  category: string;
  priority: string;
  title: string;
  description: string;
  details?: string;
  aiSummary?: string;
  aiRecommendation?: string;
  amount?: number;
  percentage?: number;
  trend?: "up" | "down" | "stable";
  actions?: InsightAction[];
  dismissed: boolean;
  confidence: number;
  dataSource?: string[];
  createdAt?: string;
}

const currency = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);

export default function InsightsPage() {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dismissing, setDismissing] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/financial/insights?stored=true");
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        setInsights([]);
        setError(
          "We could not load your insights. Nothing is estimated in their place — try again in a moment.",
        );
      } else {
        setInsights(Array.isArray(json?.data) ? (json.data as Insight[]) : []);
      }
    } catch {
      setInsights([]);
      setError("We could not reach the insights service.");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const dismiss = useCallback(async (insightId: string) => {
    setDismissing(insightId);
    try {
      const res = await fetch("/api/financial/insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ insightId, action: "dismiss" }),
      });
      if (res.ok) {
        setInsights((current) =>
          current.filter((insight) => insight.id !== insightId),
        );
      }
    } catch {
      // Left in place on failure: a dismissal that did not happen must not
      // look like one that did.
    }
    setDismissing(null);
  }, []);

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <Link
          href="/recommendations"
          className="text-gray-500 hover:text-gray-700 dark:text-slate-300 dark:hover:text-white"
        >
          ← Recommendations
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Insights
        </h1>
        <p className="text-gray-600 dark:text-slate-300">
          What we have noticed in your accounts, bills and budgets
        </p>
      </div>

      {error && (
        <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-amber-200 dark:border-amber-900/50">
          <p className="font-medium text-gray-900 dark:text-white mb-1">
            Insights are unavailable
          </p>
          <p className="text-sm text-gray-600 dark:text-slate-300">{error}</p>
        </div>
      )}

      {loading ? (
        <div className="space-y-4 animate-pulse">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-32 bg-gray-200 dark:bg-slate-700 rounded-xl"
            />
          ))}
        </div>
      ) : insights.length === 0 ? (
        !error && (
          <div className="bg-white dark:bg-slate-800 rounded-xl p-8 border border-gray-200 dark:border-slate-700">
            <p className="font-medium text-gray-900 dark:text-white mb-1">
              Nothing to report yet
            </p>
            <p className="text-sm text-gray-600 dark:text-slate-300">
              Insights come from your linked accounts, bills, budgets and
              goals. Once there is enough there to notice something, it appears
              here.
            </p>
            <Link
              href="/financial"
              className="inline-block mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
            >
              Go to your finances
            </Link>
          </div>
        )
      ) : (
        <div className="space-y-4">
          {insights.map((insight) => (
            <article
              key={insight.id}
              className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-gray-200 dark:border-slate-700"
            >
              <div className="flex items-start justify-between gap-3 mb-2 flex-wrap">
                <h2 className="font-semibold text-gray-900 dark:text-white">
                  {insight.title}
                </h2>
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-0.5 text-xs rounded-full capitalize ${
                      PRIORITY_CLASSES[insight.priority] ??
                      PRIORITY_CLASSES.info
                    }`}
                  >
                    {insight.priority}
                  </span>
                  <span className="px-2 py-0.5 text-xs rounded-full bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-200">
                    {CATEGORY_LABELS[insight.category] ?? insight.category}
                  </span>
                </div>
              </div>

              <p className="text-sm text-gray-600 dark:text-slate-300">
                {insight.description}
              </p>

              {insight.details && (
                <p className="text-sm text-gray-500 dark:text-slate-400 mt-2">
                  {insight.details}
                </p>
              )}

              {insight.aiRecommendation && (
                <p className="text-sm text-gray-600 dark:text-slate-300 mt-2">
                  {insight.aiRecommendation}
                </p>
              )}

              <div className="flex items-center gap-4 flex-wrap mt-4 text-sm">
                {typeof insight.amount === "number" && (
                  <span className="font-medium text-gray-900 dark:text-white">
                    {currency(insight.amount)}
                  </span>
                )}
                {typeof insight.percentage === "number" && (
                  <span className="text-gray-600 dark:text-slate-300">
                    {insight.percentage}%
                    {insight.trend && ` ${TREND_LABELS[insight.trend] ?? ""}`}
                  </span>
                )}
                {typeof insight.confidence === "number" && (
                  <span className="text-gray-500 dark:text-slate-400">
                    {insight.confidence}% confidence
                  </span>
                )}
              </div>

              {(insight.dataSource ?? []).length > 0 && (
                <p className="mt-3 text-xs text-gray-500 dark:text-slate-400">
                  Worked out from: {(insight.dataSource ?? []).join(", ")}
                </p>
              )}

              <div className="flex items-center gap-3 mt-4 flex-wrap">
                {(insight.actions ?? [])
                  .filter((action) => action.type === "link" && action.href)
                  .map((action) => (
                    <Link
                      key={action.id}
                      href={action.href as string}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
                    >
                      {action.label}
                    </Link>
                  ))}
                <button
                  onClick={() => dismiss(insight.id)}
                  disabled={dismissing === insight.id}
                  className="px-4 py-2 text-sm text-gray-600 dark:text-slate-300 hover:text-gray-900 dark:hover:text-white disabled:opacity-60"
                >
                  {dismissing === insight.id ? "Dismissing…" : "Dismiss"}
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
