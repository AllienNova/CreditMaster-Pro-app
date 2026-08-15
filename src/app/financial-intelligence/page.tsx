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

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface FinancialSnapshot {
  healthScore: number;
  healthGrade: string;
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
// Mock data (replaced by real API calls in useEffect)
// ---------------------------------------------------------------------------

const MOCK_SNAPSHOT: FinancialSnapshot = {
  healthScore: 78,
  healthGrade: "B+",
  healthTrend: "up",
  netWorth: 124_350,
  totalDebt: 28_400,
  monthlyIncome: 8_500,
  monthlyExpenses: 5_200,
  savingsRate: 38.8,
};

const MOCK_INSIGHTS: Insight[] = [
  {
    id: "ins-1",
    type: "recommendation",
    title: "Increase Emergency Fund",
    description:
      "You have 2.1 months of expenses saved. Aim for 3-6 months for a stronger safety net.",
    confidence: 0.92,
    actionable: true,
  },
  {
    id: "ins-2",
    type: "pattern",
    title: "Dining Spend Up 23%",
    description:
      "Your restaurant and delivery spending has risen $180 over the past 30 days compared to your 3-month average.",
    confidence: 0.88,
    actionable: true,
  },
  {
    id: "ins-3",
    type: "opportunity",
    title: "Refinance Opportunity",
    description:
      "Based on your credit score trend, you may qualify for a 1.2% lower rate on your auto loan, saving ~$840/year.",
    confidence: 0.79,
    actionable: true,
  },
  {
    id: "ins-4",
    type: "trend",
    title: "Savings Rate Improving",
    description:
      "Your savings rate has steadily increased from 31% to 38.8% over the last quarter. Keep it up!",
    confidence: 0.95,
    actionable: false,
  },
  {
    id: "ins-5",
    type: "warning",
    title: "Subscription Creep Detected",
    description:
      "3 new recurring charges totaling $47/mo were detected. Review them to avoid unnecessary spending.",
    confidence: 0.85,
    actionable: true,
  },
];

const MOCK_BUDGET: BudgetSummary = {
  totalBudgeted: 5_200,
  totalSpent: 3_640,
  percentUsed: 70,
  daysRemaining: 12,
  topCategories: [
    { category: "Housing", budgeted: 1_800, spent: 1_800, percentUsed: 100 },
    { category: "Groceries", budgeted: 600, spent: 480, percentUsed: 80 },
    {
      category: "Transportation",
      budgeted: 400,
      spent: 310,
      percentUsed: 77.5,
    },
    { category: "Dining", budgeted: 300, spent: 340, percentUsed: 113 },
    {
      category: "Entertainment",
      budgeted: 200,
      spent: 120,
      percentUsed: 60,
    },
  ],
};

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

  const fetchData = useCallback(async () => {
    try {
      // Attempt real API calls — fall back to mock data on failure so the
      // page is always useful during development.
      const [ctxRes, budgetRes, insightsRes] = await Promise.allSettled([
        fetch("/api/financial/context"),
        fetch("/api/financial/budgets/analyze?period=monthly"),
        fetch("/api/financial/spending/insights?timeRange=30d"),
      ]);

      if (ctxRes.status === "fulfilled" && ctxRes.value.ok) {
        const data = await ctxRes.value.json();
        setSnapshot({
          healthScore: data.healthScore?.score ?? MOCK_SNAPSHOT.healthScore,
          healthGrade: data.healthScore?.grade ?? MOCK_SNAPSHOT.healthGrade,
          healthTrend: data.healthScore?.trend ?? MOCK_SNAPSHOT.healthTrend,
          netWorth: data.netWorth ?? MOCK_SNAPSHOT.netWorth,
          totalDebt: data.totalDebt ?? MOCK_SNAPSHOT.totalDebt,
          monthlyIncome: data.monthlyIncome ?? MOCK_SNAPSHOT.monthlyIncome,
          monthlyExpenses:
            data.monthlyExpenses ?? MOCK_SNAPSHOT.monthlyExpenses,
          savingsRate: data.savingsRate ?? MOCK_SNAPSHOT.savingsRate,
        });
      } else {
        setSnapshot(MOCK_SNAPSHOT);
      }

      if (budgetRes.status === "fulfilled" && budgetRes.value.ok) {
        const data = await budgetRes.value.json();
        setBudget(data.data ?? MOCK_BUDGET);
      } else {
        setBudget(MOCK_BUDGET);
      }

      if (insightsRes.status === "fulfilled" && insightsRes.value.ok) {
        const data = await insightsRes.value.json();
        setInsights(
          (data.data?.insights as Insight[] | undefined) ?? MOCK_INSIGHTS,
        );
      } else {
        setInsights(MOCK_INSIGHTS);
      }
    } catch {
      setSnapshot(MOCK_SNAPSHOT);
      setBudget(MOCK_BUDGET);
      setInsights(MOCK_INSIGHTS);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
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
