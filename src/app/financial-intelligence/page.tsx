"use client";

/**
 * Financial Intelligence Hub
 *
 * Central AI-powered financial dashboard — the web equivalent of the mobile
 * Financial Intelligence screen. Displays health score, quick actions,
 * AI-generated insights, and budget summary.
 */

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Brain,
  Calculator,
  Receipt,
  PieChart,
  CreditCard,
  Target,
  TrendingUp,
  TrendingDown,
  Minus,
  Lightbulb,
  AlertTriangle,
  Star,
  BarChart3,
  ArrowRight,
  RefreshCw,
  Sparkles,
  Activity,
  Shield,
} from "lucide-react";
import type { FinancialSnapshot as ApiFinancialSnapshot } from "@/lib/financial/types/aggregated-context.types";

/**
 * Score → letter grade, matching `HealthScoreCalculatorV2.getGrade`
 * (`src/lib/financial/health-score-calculator-v2.ts:1271`) band for band.
 *
 * Copied rather than imported ON PURPOSE: that module imports
 * `getServiceRoleClient`, so importing it into this client component would
 * pull service-role database code into the browser bundle. The bands are five
 * lines and change rarely; the service-role key must never ship to a client.
 *
 * Note the codebase has no "+" grades. The old mock displayed "B+", a value
 * this system cannot produce — a tell that nothing computed it.
 */
function gradeFromScore(score: number): "A" | "B" | "C" | "D" | "F" {
  if (score >= 90) return "A";
  if (score >= 80) return "B";
  if (score >= 70) return "C";
  if (score >= 60) return "D";
  return "F";
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/*
 * The VIEW model this page renders. Deliberately NOT the same shape as the
 * API's `FinancialSnapshot` (imported above as ApiFinancialSnapshot), which
 * carries 20-odd fields including totalAssets, budgetUtilization and
 * portfolioValue, and carries no grade or trend at all. Two different types
 * sharing one name in two files is how a screen ends up reading a field that
 * was never on the wire — which is exactly what happened here. The alias keeps
 * the distinction visible at every use site.
 */
interface FinancialSnapshot {
  healthScore: number;
  /** Derived from healthScore — see gradeFromScore. Never sourced from the API. */
  healthGrade: "A" | "B" | "C" | "D" | "F";
  healthTrend: "up" | "down" | "stable";
  netWorth: number;
  totalDebt: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  savingsRate: number;
}

interface Insight {
  id: string;
  type: "pattern" | "trend" | "recommendation" | "warning" | "opportunity";
  title: string;
  description: string;
  confidence: number;
  actionable: boolean;
}

interface BudgetCategory {
  category: string;
  budgeted: number;
  spent: number;
  percentUsed: number;
}

interface BudgetSummary {
  totalBudgeted: number;
  totalSpent: number;
  percentUsed: number;
  daysRemaining: number;
  topCategories: BudgetCategory[];
}

// ---------------------------------------------------------------------------
// Quick-action config
// ---------------------------------------------------------------------------

interface QuickAction {
  id: string;
  title: string;
  description: string;
  href: string;
  icon: React.ReactNode;
  gradient: string;
}

const QUICK_ACTIONS: QuickAction[] = [
  {
    id: "smart-budget",
    title: "Smart Budget",
    description: "AI-powered budgeting with spending pattern analysis",
    href: "/financial/smart-budget",
    icon: <Calculator className="h-6 w-6" />,
    gradient: "from-emerald-500 to-teal-600",
  },
  {
    id: "ai-coach",
    title: "AI Coach",
    description: "Personalized financial coaching and Baby Steps",
    href: "/financial/coach",
    icon: <Brain className="h-6 w-6" />,
    gradient: "from-blue-500 to-indigo-600",
  },
  {
    id: "bill-negotiator",
    title: "Bill Negotiator",
    description: "Save money by negotiating recurring bills",
    href: "/financial/bills",
    icon: <Receipt className="h-6 w-6" />,
    gradient: "from-cyan-500 to-blue-600",
  },
  {
    id: "spending-insights",
    title: "Spending Insights",
    description: "AI-driven spending analysis and anomaly detection",
    href: "/dashboard/spending",
    icon: <PieChart className="h-6 w-6" />,
    gradient: "from-violet-500 to-purple-600",
  },
  {
    id: "debt-payoff",
    title: "Debt Payoff",
    description: "Strategic debt elimination with Avalanche & Snowball",
    href: "/financial/debt",
    icon: <CreditCard className="h-6 w-6" />,
    gradient: "from-amber-500 to-orange-600",
  },
  {
    id: "goals",
    title: "Financial Goals",
    description: "Track and optimize progress toward your goals",
    href: "/financial/goals",
    icon: <Target className="h-6 w-6" />,
    gradient: "from-rose-500 to-red-600",
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Compact currency for the metrics row: $124,350 -> $124.4K.
 *
 * The four cards share one grid column, so a full-precision figure does not fit
 * at a readable weight — it was overflowing the card, and simply truncating it
 * produced "$124…", which is worse than useless on a financial dashboard.
 * Compact notation is the standard answer: the magnitude stays legible and the
 * exact figure is preserved in the `title` attribute.
 *
 * Values under 10,000 are left in full, because "$8.5K" is less informative
 * than "$8,500" and there is room for it.
 */
function formatCompactCurrency(amount: number): string {
  if (Math.abs(amount) < 10000) return formatCurrency(amount);
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(amount);
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** The subset of BudgetAnalysis this screen reads, as it arrives over JSON. */
interface BudgetAnalysisResponse {
  hasBudget?: boolean;
  data?: {
    periodEnd?: string;
    summary?: {
      totalBudgeted?: number;
      totalSpent?: number;
      percentUsed?: number;
    };
    categoryAnalysis?: BudgetCategory[];
  } | null;
}

/**
 * /api/financial/budgets/analyze returns a `BudgetAnalysis`
 * (`src/lib/financial/types/budget.types.ts:523`): the totals live under
 * `summary`, the per-category rows are `categoryAnalysis`, and there is no
 * `daysRemaining` — the period is described by `periodEnd`.
 *
 * The old code assigned that response STRAIGHT into this screen's flatter
 * BudgetSummary state. `Response.json()` is `any`, so the compiler had nothing
 * to object to, and the bug only showed at runtime: a user who actually HAD a
 * budget reached `budget.topCategories.map(...)` on `undefined` and crashed the
 * page. Users with no budget were the ones who escaped — they got MOCK_BUDGET.
 * Deleting the mock is what made this reachable enough to notice.
 */
function toBudgetSummary(body: BudgetAnalysisResponse | null): BudgetSummary | null {
  const analysis = body?.hasBudget === false ? null : body?.data;
  if (!analysis?.summary) return null;

  const end = analysis.periodEnd ? new Date(analysis.periodEnd).getTime() : NaN;
  const daysRemaining = Number.isNaN(end)
    ? 0
    : Math.max(0, Math.ceil((end - Date.now()) / MS_PER_DAY));

  return {
    totalBudgeted: analysis.summary.totalBudgeted ?? 0,
    totalSpent: analysis.summary.totalSpent ?? 0,
    percentUsed: analysis.summary.percentUsed ?? 0,
    daysRemaining,
    topCategories: analysis.categoryAnalysis ?? [],
  };
}

function getScoreColor(score: number): string {
  if (score >= 90) return "#22C55E";
  if (score >= 80) return "#84CC16";
  if (score >= 70) return "#3B82F6";
  if (score >= 60) return "#F59E0B";
  return "#EF4444";
}

function getProgressColor(pct: number): string {
  if (pct >= 100) return "bg-red-500";
  if (pct >= 90) return "bg-amber-500";
  if (pct >= 75) return "bg-blue-500";
  return "bg-emerald-500";
}

function getInsightMeta(type: Insight["type"]): {
  icon: React.ReactNode;
  color: string;
  bg: string;
} {
  switch (type) {
    case "pattern":
      return {
        icon: <BarChart3 className="h-5 w-5" />,
        color: "text-violet-500",
        bg: "bg-violet-100 dark:bg-violet-900/30",
      };
    case "trend":
      return {
        icon: <TrendingUp className="h-5 w-5" />,
        color: "text-blue-500",
        bg: "bg-blue-100 dark:bg-blue-900/30",
      };
    case "recommendation":
      return {
        icon: <Lightbulb className="h-5 w-5" />,
        color: "text-emerald-500",
        bg: "bg-emerald-100 dark:bg-emerald-900/30",
      };
    case "warning":
      return {
        icon: <AlertTriangle className="h-5 w-5" />,
        color: "text-amber-500",
        bg: "bg-amber-100 dark:bg-amber-900/30",
      };
    case "opportunity":
      return {
        icon: <Star className="h-5 w-5" />,
        color: "text-yellow-500",
        bg: "bg-yellow-100 dark:bg-yellow-900/30",
      };
  }
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function HealthScoreGauge({
  score,
  grade,
  trend,
}: {
  score: number;
  grade: string;
  trend: "up" | "down" | "stable";
}) {
  const size = 180;
  const strokeWidth = 14;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const progress = (score / 100) * circumference;
  const color = getScoreColor(score);

  const TrendIcon =
    trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus;
  const trendColor =
    trend === "up"
      ? "text-emerald-500"
      : trend === "down"
        ? "text-red-500"
        : "text-gray-400 dark:text-slate-500";

  return (
    <div className="flex flex-col items-center">
      <div className="relative">
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            className="text-gray-200 dark:text-slate-700"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeDasharray={`${progress} ${circumference}`}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-5xl font-bold" style={{ color }}>
            {score}
          </span>
          <span className="text-sm font-medium text-gray-500 dark:text-slate-400">
            {grade}
          </span>
          <TrendIcon className={`h-5 w-5 mt-1 ${trendColor}`} />
        </div>
      </div>
      <p className="mt-3 text-sm text-gray-500 dark:text-slate-400">
        Financial Vitality Score
      </p>
    </div>
  );
}

function MetricCard({
  label,
  value,
  exactValue,
  icon,
  trend,
}: {
  label: string;
  value: string;
  /** Full-precision figure for the tooltip when `value` is compacted. */
  exactValue?: string;
  icon: React.ReactNode;
  trend?: "positive" | "negative" | "neutral";
}) {
  const trendStyles: Record<string, string> = {
    positive: "text-emerald-600 dark:text-emerald-400",
    negative: "text-red-600 dark:text-red-400",
    neutral: "text-gray-600 dark:text-slate-400",
  };

  return (
    // `min-w-0` is the fix, not the smaller font. Grid and flex children default
    // to `min-width: auto`, which refuses to shrink below their content — so a
    // value like "$124,350" at text-2xl simply overflowed the card and spilled
    // across the one next to it. Every nesting level that must be allowed to
    // shrink needs it, which is why it appears three times here.
    <div className="min-w-0 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 p-4 sm:p-5">
      <div className="flex items-center gap-2 sm:gap-3 mb-2 min-w-0">
        {/* shrink-0 keeps the icon square; without it the icon squashes before
            the text does. */}
        <div className="shrink-0 p-2 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400">
          {icon}
        </div>
        <span className="min-w-0 truncate text-sm font-medium text-gray-500 dark:text-slate-400">
          {label}
        </span>
      </div>
      {/* Steps down on narrow viewports rather than clipping. `tabular-nums`
          keeps the four cards' digits vertically aligned. `title` preserves the
          full value for anyone who does hit the truncation. */}
      <p
        title={exactValue ?? value}
        className={`tabular-nums break-words text-xl sm:text-2xl font-bold ${trendStyles[trend ?? "neutral"]}`}
      >
        {value}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page component
// ---------------------------------------------------------------------------

export default function FinancialIntelligencePage() {
  const [snapshot, setSnapshot] = useState<FinancialSnapshot | null>(null);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [budget, setBudget] = useState<BudgetSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  /** Set when the snapshot could not be loaded. Nothing is estimated in its place. */
  const [error, setError] = useState<string | null>(null);
  /** The budget route's own words when the user has no active budget. */
  const [budgetNotice, setBudgetNotice] = useState<string | null>(null);
  /** True when /api/financial/ai-insights served its degraded payload. */
  const [degraded, setDegraded] = useState(false);

  /*
   * WHAT THIS REPLACED — and why it was worse than an ordinary mock.
   *
   * This page fetched three real routes and, on any failure OR any missing
   * field, silently substituted MOCK_SNAPSHOT: a $124,350 net worth, $28,400
   * of debt, an $8,500 monthly income and a "B+" health grade, rendered with
   * nothing to mark a single digit of it as invented.
   *
   * The fallback was not the rare path. It was the ONLY path.
   * /api/financial/context answers `{ success, data: context }`, and the old
   * code read `data.netWorth` off the TOP level of that envelope — where it is
   * always undefined — so every `??` fell through on every request, for every
   * user, forever. The screen had never once shown a real number.
   *
   * Three defects, not one:
   *   1. It read past the envelope the route actually returns.
   *   2. It asked the wrong route. The snapshot lives on
   *      /api/financial/aggregated?snapshot=true, which returns a real
   *      FinancialSnapshot computed from the user's own accounts;
   *      /financial/context returns the wider context object and never carried
   *      these fields at its top level.
   *   3. It answered failure with fiction.
   *
   * healthTrend comes from /api/financial/ai-insights (`vitality.trend`) — the
   * only real source for it. That route sets `degraded: true` when its own
   * upstreams fail, and this page now surfaces that instead of burying it.
   */
  const fetchData = useCallback(async () => {
    setError(null);
    const [aggRes, budgetRes, insightsRes] = await Promise.allSettled([
      fetch("/api/financial/aggregated?snapshot=true"),
      fetch("/api/financial/budgets/analyze?period=monthly"),
      fetch("/api/financial/ai-insights"),
    ]);

    const body = async (r: PromiseSettledResult<Response>) =>
      r.status === "fulfilled" && r.value.ok
        ? await r.value.json().catch(() => null)
        : null;

    const [agg, budgetJson, insightsJson] = await Promise.all([
      body(aggRes),
      body(budgetRes),
      body(insightsRes),
    ]);

    const measured = agg?.data?.snapshot as ApiFinancialSnapshot | undefined;
    const ai = insightsJson?.data;

    if (measured) {
      // Prefer the vitality score the insights route computed; fall back to
      // the aggregate's own. Both are measured — neither is a stand-in.
      const score =
        typeof ai?.healthScore === "number" && ai.healthScore > 0
          ? ai.healthScore
          : measured.healthScore;
      setSnapshot({
        healthScore: score,
        healthGrade: gradeFromScore(score),
        healthTrend: ai?.healthTrend ?? "stable",
        netWorth: measured.netWorth,
        totalDebt: measured.totalDebt,
        monthlyIncome: measured.monthlyIncome,
        monthlyExpenses: measured.monthlyExpenses,
        savingsRate: measured.savingsRate,
      });
    } else {
      setSnapshot(null);
      setError(
        "We could not load your financial snapshot. Nothing on this page is estimated in its place — reconnect your accounts or try again.",
      );
    }

    // hasBudget:false is the route telling us the user has no budget yet. That
    // is a real answer with its own message, not a hole to fill.
    setBudget(toBudgetSummary(budgetJson as BudgetAnalysisResponse | null));
    setBudgetNotice(budgetJson?.message ?? null);
    setInsights(Array.isArray(ai?.insights) ? (ai.insights as Insight[]) : []);
    setDegraded(insightsJson?.degraded === true);

    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  // ------ Loading state ------
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="space-y-6 animate-pulse">
            <div className="h-10 bg-gray-200 dark:bg-slate-700 rounded w-1/3" />
            <div className="h-5 bg-gray-200 dark:bg-slate-700 rounded w-2/3" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="bg-gray-200 dark:bg-slate-700 rounded-xl h-28"
                />
              ))}
            </div>
            <div className="bg-gray-200 dark:bg-slate-700 rounded-xl h-64" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div
                  key={i}
                  className="bg-gray-200 dark:bg-slate-700 rounded-xl h-40"
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* ---------------------------------------------------------------- */}
        {/* Header                                                           */}
        {/* ---------------------------------------------------------------- */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
              <Sparkles className="h-8 w-8 text-blue-600 dark:text-blue-400" />
              Financial Intelligence
            </h1>
            <p className="mt-2 text-gray-600 dark:text-slate-400">
              AI-powered insights and tools to optimize your financial vitality
            </p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="mt-4 sm:mt-0 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-sm font-medium text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
          >
            <RefreshCw
              className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
            />
            Refresh
          </button>
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* Health Score + Key Metrics                                        */}
        {/* ---------------------------------------------------------------- */}
        {/*
          The screen says what it does not know. Previously this space was
          occupied by invented figures whenever a call failed, so a broken
          backend and a healthy one looked identical to the user.
        */}
        {error && (
          <div className="mb-8 rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-900/20 p-4">
            <p className="font-medium text-gray-900 dark:text-white">
              Your financial snapshot is unavailable
            </p>
            <p className="mt-1 text-sm text-gray-700 dark:text-slate-300">
              {error}
            </p>
          </div>
        )}

        {degraded && (
          <div className="mb-8 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
            <p className="text-sm text-gray-700 dark:text-slate-300">
              Insights are running in a reduced mode right now, so this list may
              be incomplete.
            </p>
          </div>
        )}

        {snapshot && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 p-6 md:p-8 mb-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 items-center">
              {/* Gauge */}
              <div className="lg:col-span-1 flex justify-center">
                <HealthScoreGauge
                  score={snapshot.healthScore}
                  grade={snapshot.healthGrade}
                  trend={snapshot.healthTrend}
                />
              </div>

              {/* Metric cards */}
              {/* min-w-0 on the grid itself: without it this column refuses to
                  shrink inside the lg:grid-cols-3 parent, pushing the cards
                  wider than the container. */}
              {/* 2x2, not 1x4. These four cards share only two of the three
                  columns, so a single row gave each card roughly 150px of
                  content width — narrower than "$124.4K" at a readable weight,
                  which is why the figures overflowed and then truncated. A 2x2
                  grid doubles the width per card and costs nothing vertically,
                  since the gauge beside it is taller than two rows anyway. */}
              <div className="min-w-0 lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <MetricCard
                  label="Net Worth"
                  value={formatCompactCurrency(snapshot.netWorth)}
                  exactValue={formatCurrency(snapshot.netWorth)}
                  icon={<Activity className="h-5 w-5" />}
                  trend="positive"
                />
                <MetricCard
                  label="Total Debt"
                  value={formatCompactCurrency(snapshot.totalDebt)}
                  exactValue={formatCurrency(snapshot.totalDebt)}
                  icon={<CreditCard className="h-5 w-5" />}
                  trend="negative"
                />
                <MetricCard
                  label="Monthly Income"
                  value={formatCompactCurrency(snapshot.monthlyIncome)}
                  exactValue={formatCurrency(snapshot.monthlyIncome)}
                  icon={<TrendingUp className="h-5 w-5" />}
                  trend="positive"
                />
                <MetricCard
                  label="Savings Rate"
                  value={`${snapshot.savingsRate.toFixed(1)}%`}
                  icon={<Shield className="h-5 w-5" />}
                  trend={snapshot.savingsRate >= 20 ? "positive" : "negative"}
                />
              </div>
            </div>
          </div>
        )}

        {/* ---------------------------------------------------------------- */}
        {/* Quick Actions Grid                                               */}
        {/* ---------------------------------------------------------------- */}
        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Quick Actions
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {QUICK_ACTIONS.map((action) => (
              <Link
                key={action.id}
                href={action.href}
                className="group relative bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 p-5 hover:shadow-md hover:border-blue-200 dark:hover:border-blue-700 transition-all"
              >
                <div className="flex items-start gap-4">
                  <div
                    className={`flex-shrink-0 p-3 rounded-xl bg-gradient-to-br ${action.gradient} text-white shadow-sm`}
                  >
                    {action.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      {action.title}
                    </h3>
                    <p className="mt-1 text-sm text-gray-500 dark:text-slate-400 line-clamp-2">
                      {action.description}
                    </p>
                  </div>
                  <ArrowRight className="h-5 w-5 text-gray-300 dark:text-slate-600 group-hover:text-blue-500 dark:group-hover:text-blue-400 transition-colors flex-shrink-0 mt-1" />
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* Two-column: AI Insights + Budget Summary                         */}
        {/* ---------------------------------------------------------------- */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* AI Insights — wider column */}
          <section className="lg:col-span-3">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 p-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-amber-500" />
                  AI Insights
                </h2>
                <Link
                  href="/dashboard/spending"
                  className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
                >
                  View all
                </Link>
              </div>

              {insights.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-slate-400 py-8 text-center">
                  No insights available yet. Connect an account to get started.
                </p>
              ) : (
                <div className="divide-y divide-gray-100 dark:divide-slate-700">
                  {insights.map((insight) => {
                    const meta = getInsightMeta(insight.type);
                    return (
                      <div
                        key={insight.id}
                        className="py-4 first:pt-0 last:pb-0"
                      >
                        <div className="flex gap-3">
                          <div
                            className={`flex-shrink-0 p-2 rounded-lg ${meta.bg} ${meta.color}`}
                          >
                            {meta.icon}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                              {insight.title}
                            </h4>
                            <p className="mt-1 text-sm text-gray-500 dark:text-slate-400 line-clamp-2">
                              {insight.description}
                            </p>
                            <div className="mt-2 flex items-center gap-3">
                              <span className="text-xs text-gray-400 dark:text-slate-500">
                                {(insight.confidence * 100).toFixed(0)}%
                                confidence
                              </span>
                              {insight.actionable && (
                                <span className="inline-flex items-center text-xs font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-0.5 rounded-full">
                                  Actionable
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>

          {/*
            "No budget yet" is an answer, not a gap. The route returns
            hasBudget:false with its own copy; this used to be papered over
            with MOCK_BUDGET, which showed a stranger's spending to a user who
            had never created a budget.
          */}
          {!budget && budgetNotice && (
            <section className="lg:col-span-2">
              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  Monthly Budget
                </h2>
                <p className="text-sm text-gray-600 dark:text-slate-400 mb-4">
                  {budgetNotice}
                </p>
                <Link
                  href="/financial/smart-budget"
                  className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Create a budget
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </section>
          )}

          {/* Budget Summary — narrower column */}
          {budget && (
            <section className="lg:col-span-2">
              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 p-6">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Monthly Budget
                  </h2>
                  <Link
                    href="/financial/smart-budget"
                    className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    Manage
                  </Link>
                </div>

                {/* Summary metrics */}
                <div className="grid grid-cols-3 gap-3 mb-5">
                  <div className="text-center">
                    <p className="text-xs text-gray-500 dark:text-slate-400">
                      Budgeted
                    </p>
                    <p className="text-lg font-bold text-gray-900 dark:text-white">
                      {formatCurrency(budget.totalBudgeted)}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-500 dark:text-slate-400">
                      Spent
                    </p>
                    <p className="text-lg font-bold text-gray-900 dark:text-white">
                      {formatCurrency(budget.totalSpent)}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-500 dark:text-slate-400">
                      Remaining
                    </p>
                    <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(budget.totalBudgeted - budget.totalSpent)}
                    </p>
                  </div>
                </div>

                {/* Overall progress */}
                <div className="mb-5">
                  <div className="flex items-center justify-between text-xs text-gray-500 dark:text-slate-400 mb-1">
                    <span>{budget.percentUsed.toFixed(0)}% used</span>
                    <span>{budget.daysRemaining} days left</span>
                  </div>
                  <div className="h-2.5 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${getProgressColor(budget.percentUsed)}`}
                      style={{
                        width: `${Math.min(budget.percentUsed, 100)}%`,
                      }}
                    />
                  </div>
                </div>

                {/* Category bars */}
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-gray-700 dark:text-slate-300">
                    Top Categories
                  </h3>
                  {budget.topCategories.map((cat) => (
                    <div key={cat.category}>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-gray-700 dark:text-slate-300 capitalize">
                          {cat.category.replace(/_/g, " ")}
                        </span>
                        <span className="text-gray-500 dark:text-slate-400">
                          {formatCurrency(cat.spent)} /{" "}
                          {formatCurrency(cat.budgeted)}
                        </span>
                      </div>
                      <div className="h-1.5 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${getProgressColor(cat.percentUsed)}`}
                          style={{
                            width: `${Math.min(cat.percentUsed, 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* Enhanced Budget CTA                                              */}
        {/* ---------------------------------------------------------------- */}
        <div className="mt-8 bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl shadow-lg p-6 md:p-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="text-white">
              <h3 className="text-xl font-bold">
                Try Enhanced Smart Budget
              </h3>
              <p className="mt-1 text-blue-100 text-sm max-w-lg">
                Leverage AI to automatically categorize spending, detect
                patterns, and optimize your budget allocations in real time.
              </p>
            </div>
            <Link
              href="/financial-intelligence/smart-budget-enhanced"
              className="inline-flex items-center gap-2 px-6 py-3 bg-white text-blue-700 font-semibold rounded-lg hover:bg-blue-50 transition-colors shadow-sm whitespace-nowrap"
            >
              <Calculator className="h-5 w-5" />
              Open Enhanced Budget
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
