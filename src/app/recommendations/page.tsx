/**
 * Recommendations.
 *
 * WHAT THIS PAGE TOLD EVERY READER ABOUT THEIR OWN ACCOUNTS.
 *
 * The file labelled its own constant "Mock Data" and then rendered it as
 * personal findings:
 *
 *   "Reduce your Chase card balance by $500 to lower utilization to 25%.
 *    This could increase your score by up to 25 points."
 *   "We found a late payment on your Experian report that may be inaccurate."
 *
 * Nobody here has a Chase card, no report was read, and no late payment was
 * found. "We found" is the part that does the damage — it claims an inspection
 * happened. A reader could file a dispute over an entry nobody located.
 *
 * The `impact` numbers went with it. "+25 points" and "+40 points" are score
 * predictions, and the engine behind this page does not predict scores: the
 * real type carries `potentialSavings` and `potentialReturn`, which are money.
 *
 * WHAT WAS ALREADY BUILT AND UNREACHABLE.
 *
 *   GET /api/ai/financial-coach/recommendations
 *     -> recommendationEngine.generateRecommendations
 *     -> financialContextEngine.getFinancialContext(userId)
 *     -> budgets, financial_goals, financial_alerts, financial_insights,
 *        investment_portfolios, recurring_bills, profiles — 9 reads
 *
 * Eight generators (savings_strategy, debt_payoff, investment_suggestion,
 * budget_adjustment, account_optimization, credit_improvement, insurance_needs,
 * tax_optimization), each deriving from that context, no Math.random anywhere
 * in the chain. Nothing in the app called it. That is the sixth
 * built-but-unreachable feature this sweep and the largest: a working
 * personalised recommendation engine sitting behind a hardcoded list.
 *
 * The filter chips now come from RecommendationType instead of the invented
 * credit/debt/savings/protection, and only appear for types the engine
 * actually returned — a chip that can only ever show nothing is a dead control.
 *
 * QUICK_LINKS is kept: those are real sibling routes, navigation rather than
 * data.
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

/** Mirrors RecommendationType in lib/financial/types/ai-coach.types.ts:15. */
const TYPE_LABELS: Record<string, string> = {
  savings_strategy: "Savings",
  debt_payoff: "Debt",
  investment_suggestion: "Investing",
  budget_adjustment: "Budget",
  account_optimization: "Accounts",
  credit_improvement: "Credit",
  insurance_needs: "Insurance",
  tax_optimization: "Tax",
};

const PRIORITY_CLASSES: Record<string, string> = {
  critical: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",
  high: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  medium: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  low: "bg-gray-100 text-gray-700 dark:bg-slate-700 dark:text-slate-300",
};

const TIMEFRAME_LABELS: Record<string, string> = {
  immediate: "Now",
  short_term: "Short term",
  medium_term: "Medium term",
  long_term: "Long term",
};

const QUICK_LINKS = [
  {
    label: "Credit Cards",
    href: "/recommendations/credit-cards",
    iconPath:
      "M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z",
  },
  {
    label: "Loans",
    href: "/recommendations/loans",
    iconPath:
      "M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z",
  },
  {
    label: "Insights",
    href: "/recommendations/insights",
    iconPath:
      "M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z",
  },
];

/** Mirrors RecommendationStep in ai-coach.types.ts:70. */
interface Step {
  id: string;
  order: number;
  title: string;
  description: string;
  actionType: string;
  actionUrl?: string;
  isCompleted: boolean;
}

/** Mirrors Recommendation in ai-coach.types.ts:34. */
interface Recommendation {
  id: string;
  type: string;
  priority: string;
  title: string;
  description: string;
  rationale: string;
  aiInsight?: string;
  potentialSavings?: number;
  potentialReturn?: number;
  riskLevel: string;
  timeframe: string;
  estimatedEffort: string;
  actionSteps?: Step[];
  confidenceScore?: number;
  personalizedFactors?: string[];
}

const currency = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);

export default function RecommendationsPage() {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/financial-coach/recommendations");
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        setRecommendations([]);
        setError(
          "We could not work out your recommendations. Nothing is suggested in their place — try again in a moment.",
        );
      } else {
        setRecommendations(
          Array.isArray(json?.recommendations)
            ? (json.recommendations as Recommendation[])
            : [],
        );
      }
    } catch {
      setRecommendations([]);
      setError("We could not reach the recommendations service.");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const availableTypes = Array.from(
    new Set(recommendations.map((rec) => rec.type)),
  );

  const visible =
    typeFilter === "all"
      ? recommendations
      : recommendations.filter((rec) => rec.type === typeFilter);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Recommendations
        </h1>
        <p className="text-gray-600 dark:text-slate-300">
          Worked out from your budgets, goals, bills and accounts
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {QUICK_LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-gray-200 dark:border-slate-700 flex items-center gap-3 hover:border-blue-300"
          >
            <svg
              className="w-5 h-5 text-blue-600 shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d={link.iconPath}
              />
            </svg>
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              {link.label}
            </span>
          </Link>
        ))}
      </div>

      {error && (
        <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-amber-200 dark:border-amber-900/50">
          <p className="font-medium text-gray-900 dark:text-white mb-1">
            Recommendations are unavailable
          </p>
          <p className="text-sm text-gray-600 dark:text-slate-300">{error}</p>
        </div>
      )}

      {availableTypes.length > 1 && (
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setTypeFilter("all")}
            className={`px-4 py-2 rounded-lg text-sm ${
              typeFilter === "all"
                ? "bg-blue-600 text-white"
                : "bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-200"
            }`}
          >
            All
          </button>
          {availableTypes.map((type) => (
            <button
              key={type}
              onClick={() => setTypeFilter(type)}
              className={`px-4 py-2 rounded-lg text-sm ${
                typeFilter === type
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-200"
              }`}
            >
              {TYPE_LABELS[type] ?? type}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="space-y-4 animate-pulse">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-36 bg-gray-200 dark:bg-slate-700 rounded-xl"
            />
          ))}
        </div>
      ) : visible.length === 0 ? (
        !error && (
          <div className="bg-white dark:bg-slate-800 rounded-xl p-8 border border-gray-200 dark:border-slate-700">
            <p className="font-medium text-gray-900 dark:text-white mb-1">
              No recommendations for you right now
            </p>
            <p className="text-sm text-gray-600 dark:text-slate-300">
              These are worked out from your budgets, goals, bills and linked
              accounts. The more of those you have set up, the more we can say.
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
          {visible.map((rec) => (
            <article
              key={rec.id}
              className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-gray-200 dark:border-slate-700"
            >
              <div className="flex items-start justify-between gap-3 mb-2 flex-wrap">
                <h2 className="font-semibold text-gray-900 dark:text-white">
                  {rec.title}
                </h2>
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-0.5 text-xs rounded-full capitalize ${
                      PRIORITY_CLASSES[rec.priority] ?? PRIORITY_CLASSES.low
                    }`}
                  >
                    {rec.priority}
                  </span>
                  <span className="px-2 py-0.5 text-xs rounded-full bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-200">
                    {TYPE_LABELS[rec.type] ?? rec.type}
                  </span>
                </div>
              </div>

              <p className="text-sm text-gray-600 dark:text-slate-300">
                {rec.description}
              </p>

              {rec.rationale && (
                <p className="text-sm text-gray-500 dark:text-slate-400 mt-2">
                  {rec.rationale}
                </p>
              )}

              <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm mt-4">
                {typeof rec.potentialSavings === "number" &&
                  rec.potentialSavings > 0 && (
                    <div>
                      <dt className="text-gray-500 dark:text-slate-400">
                        Could save
                      </dt>
                      <dd className="font-medium text-gray-900 dark:text-white">
                        {currency(rec.potentialSavings)}
                      </dd>
                    </div>
                  )}
                {typeof rec.potentialReturn === "number" &&
                  rec.potentialReturn > 0 && (
                    <div>
                      <dt className="text-gray-500 dark:text-slate-400">
                        Could return
                      </dt>
                      <dd className="font-medium text-gray-900 dark:text-white">
                        {currency(rec.potentialReturn)}
                      </dd>
                    </div>
                  )}
                {rec.timeframe && (
                  <div>
                    <dt className="text-gray-500 dark:text-slate-400">
                      Timeframe
                    </dt>
                    <dd className="font-medium text-gray-900 dark:text-white">
                      {TIMEFRAME_LABELS[rec.timeframe] ?? rec.timeframe}
                    </dd>
                  </div>
                )}
                {rec.estimatedEffort && (
                  <div>
                    <dt className="text-gray-500 dark:text-slate-400">Effort</dt>
                    <dd className="font-medium text-gray-900 dark:text-white capitalize">
                      {rec.estimatedEffort}
                    </dd>
                  </div>
                )}
              </dl>

              {(rec.actionSteps ?? []).length > 0 && (
                <ol className="mt-4 space-y-2">
                  {(rec.actionSteps ?? [])
                    .slice()
                    .sort((a, b) => a.order - b.order)
                    .map((step) => (
                      <li
                        key={step.id}
                        className="text-sm text-gray-600 dark:text-slate-300"
                      >
                        <span className="font-medium text-gray-900 dark:text-white">
                          {step.title}
                        </span>
                        {step.description && ` — ${step.description}`}
                        {step.actionUrl && (
                          <Link
                            href={step.actionUrl}
                            className="ml-2 text-blue-600 hover:underline"
                          >
                            Open
                          </Link>
                        )}
                      </li>
                    ))}
                </ol>
              )}

              {(rec.personalizedFactors ?? []).length > 0 && (
                <p className="mt-4 text-xs text-gray-500 dark:text-slate-400">
                  Based on: {(rec.personalizedFactors ?? []).join(", ")}
                </p>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
