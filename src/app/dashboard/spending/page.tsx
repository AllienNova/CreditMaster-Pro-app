"use client";

/**
 * Spending Dashboard Page
 *
 * Comprehensive spending visualization backed by real, per-user data:
 * - Category breakdown donut chart      ← /api/financial/dashboard (spendingByCategory)
 * - Monthly spending trend line chart    ← /api/financial/dashboard (monthlyTrend.expenses)
 * - Summary cards (total, daily, count)  ← /api/financial/dashboard (monthlyExpenses)
 * - Month-over-month change              ← /api/financial/spending (comparisonToPreviousMonth)
 * - Top merchants                        ← /api/financial/spending (topMerchants)
 * - Spending insights                    ← /api/financial/spending (insights)
 *
 * Both endpoints are authenticated (Bearer JWT) and derive the user id
 * server-side. Fields with no honest per-user source — per-category trend
 * arrows and budget-vs-actual — are rendered neutrally or empty-stated rather
 * than fabricated.
 */

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import DonutChart from "@/components/charts/DonutChart";
import {
  LineChartComponent as LineChart,
  formatCurrency,
} from "@/components/charts";
import { PullToRefresh } from "@/components/ui/PullToRefresh";

const categoryColorPalette = [
  "#22C55E",
  "#3B82F6",
  "#F59E0B",
  "#EC4899",
  "#EF4444",
  "#8B5CF6",
  "#06B6D4",
  "#84CC16",
  "#F97316",
  "#10B981",
  "#6366F1",
  "#14B8A6",
  "#9CA3AF",
];

function getCategoryColor(category: string): string {
  const colorMap: Record<string, string> = {
    "Food & Dining": "#22C55E",
    Shopping: "#3B82F6",
    Transportation: "#F59E0B",
    Entertainment: "#EC4899",
    "Bills & Utilities": "#EF4444",
    "Health & Fitness": "#8B5CF6",
    Travel: "#06B6D4",
    Education: "#84CC16",
    "Personal Care": "#F97316",
    Groceries: "#10B981",
    "Gas & Fuel": "#6366F1",
    Home: "#14B8A6",
    Other: "#9CA3AF",
  };
  const index = Object.keys(colorMap).indexOf(category);
  return (
    colorMap[category] ||
    categoryColorPalette[index % categoryColorPalette.length] ||
    "#9CA3AF"
  );
}

// ============================================================================
// VIEW MODELS
// ============================================================================

interface SpendingCategory {
  name: string;
  value: number;
  color?: string;
  transactionCount: number;
  trend: "up" | "down" | "stable";
  changePercent: number;
}

interface Merchant {
  name: string;
  category: string;
  amount: number;
  transactionCount: number;
}

interface MonthlySpending {
  month: string;
  amount: number;
}

interface SpendingInsight {
  id: string;
  type: "saving" | "warning" | "tip" | "achievement";
  title: string;
  description: string;
  potentialSavings?: number;
}

// ============================================================================
// API RESPONSE SHAPES (subset of the JSON the auth'd endpoints return)
// ============================================================================

interface DashboardApiData {
  monthlyExpenses: number;
  spendingByCategory: {
    category: string;
    amount: number;
    percentage: number;
    transactionCount: number;
  }[];
  monthlyTrend: {
    month: string;
    income: number;
    expenses: number;
    savings: number;
  }[];
}

interface SpendingApiData {
  totalSpending: number;
  averageDaily: number;
  topMerchants: {
    merchant: string;
    amount: number;
    transactionCount: number;
  }[];
  comparisonToPreviousMonth: number;
  insights: string[];
}

interface ApiEnvelope<T> {
  success: boolean;
  data?: T;
}

export default function SpendingDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<
    "week" | "month" | "quarter" | "year"
  >("month");

  // Real data, populated from the authenticated financial APIs.
  const [categories, setCategories] = useState<SpendingCategory[]>([]);
  const [monthlyTrend, setMonthlyTrend] = useState<MonthlySpending[]>([]);
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [insights, setInsights] = useState<SpendingInsight[]>([]);
  const [totalSpending, setTotalSpending] = useState(0);
  const [dailyAverage, setDailyAverage] = useState(0);
  const [spendingChange, setSpendingChange] = useState(0);
  const [transactionCount, setTransactionCount] = useState(0);

  const router = useRouter();

  const loadData = useCallback(async (accessToken: string) => {
    setLoading(true);
    setError(null);

    const headers = { Authorization: `Bearer ${accessToken}` };

    const [dashboardResult, spendingResult] = await Promise.allSettled([
      fetch("/api/financial/dashboard", { headers }),
      fetch("/api/financial/spending?days=30", { headers }),
    ]);

    try {
      // Dashboard is the primary source (category breakdown + monthly trend +
      // totals). If it fails, the page has no honest data to show.
      if (
        dashboardResult.status !== "fulfilled" ||
        !dashboardResult.value.ok
      ) {
        throw new Error(
          "We couldn't load your spending data. Please try again.",
        );
      }
      const dashboardJson =
        (await dashboardResult.value.json()) as ApiEnvelope<DashboardApiData>;
      if (!dashboardJson.success || !dashboardJson.data) {
        throw new Error(
          "We couldn't load your spending data. Please try again.",
        );
      }
      const dashboard = dashboardJson.data;

      // Per-category trend/changePercent has no per-user source yet, so it is
      // rendered neutrally (stable / no percent) rather than invented.
      setCategories(
        dashboard.spendingByCategory.map((cat) => ({
          name: cat.category,
          value: cat.amount,
          transactionCount: cat.transactionCount,
          trend: "stable" as const,
          changePercent: 0,
        })),
      );
      setMonthlyTrend(
        dashboard.monthlyTrend.map((m) => ({
          month: m.month,
          amount: m.expenses,
        })),
      );
      setTotalSpending(dashboard.monthlyExpenses);
      setDailyAverage(dashboard.monthlyExpenses / 30);
      setTransactionCount(
        dashboard.spendingByCategory.reduce(
          (sum, cat) => sum + cat.transactionCount,
          0,
        ),
      );

      // Spending analysis is a secondary source (merchants, insights, MoM
      // change). A failure here leaves those sections empty — never mocked.
      let change = 0;
      if (spendingResult.status === "fulfilled" && spendingResult.value.ok) {
        const spendingJson =
          (await spendingResult.value.json()) as ApiEnvelope<SpendingApiData>;
        if (spendingJson.success && spendingJson.data) {
          const spending = spendingJson.data;
          setMerchants(
            spending.topMerchants.map((m) => ({
              name: m.merchant,
              category: "",
              amount: m.amount,
              transactionCount: m.transactionCount,
            })),
          );
          setInsights(
            spending.insights.map((text, i) => ({
              id: String(i),
              type: "tip" as const,
              title: text,
              description: "",
            })),
          );
          change = spending.comparisonToPreviousMonth;
        } else {
          setMerchants([]);
          setInsights([]);
        }
      } else {
        setMerchants([]);
        setInsights([]);
      }
      setSpendingChange(change);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "We couldn't load your spending data. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        router.push("/auth/login");
        return;
      }
      await loadData(session.access_token);
    };

    void init();
  }, [router, loadData]);

  const donutData = categories.map((cat) => ({
    name: cat.name,
    value: cat.value,
    color: getCategoryColor(cat.name),
  }));

  const trendData = monthlyTrend.map((m) => ({
    label: m.month,
    spending: m.amount,
  }));

  const getInsightColor = (type: SpendingInsight["type"]) => {
    switch (type) {
      case "warning":
        return "border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20";
      case "saving":
        return "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20";
      case "achievement":
        return "border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20";
      case "tip":
        return "border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20";
      default:
        return "border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900 dark:border-slate-700 dark:bg-slate-800";
    }
  };

  const handleRefresh = useCallback(async () => {
    const supabase = createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      router.push("/auth/login");
      return;
    }
    await loadData(session.access_token);
  }, [router, loadData]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-blue-50 to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        {/* Skeleton Header */}
        <header className="bg-white dark:bg-slate-800/80 backdrop-blur-sm shadow-sm border-b border-white/20 dark:border-slate-700/20 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center space-x-4">
                <div className="h-5 w-16 bg-gray-200 dark:bg-slate-700 rounded animate-pulse"></div>
                <div className="h-6 w-24 bg-gray-200 dark:bg-slate-700 rounded animate-pulse"></div>
              </div>
              <div className="flex gap-2">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="h-8 w-16 bg-gray-200 dark:bg-slate-700 rounded-lg animate-pulse"
                  ></div>
                ))}
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Skeleton Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="bg-white dark:bg-slate-800/80 backdrop-blur-sm rounded-lg p-6 shadow-lg animate-pulse"
              >
                <div className="h-4 w-32 bg-gray-200 dark:bg-slate-700 rounded mb-3"></div>
                <div className="h-8 w-24 bg-gray-200 dark:bg-slate-700 rounded mb-2"></div>
                <div className="h-3 w-20 bg-gray-200 dark:bg-slate-700 rounded"></div>
              </div>
            ))}
          </div>

          {/* Skeleton Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            <div className="bg-white dark:bg-slate-800/80 backdrop-blur-sm rounded-lg p-6 shadow-lg animate-pulse">
              <div className="h-6 w-48 bg-gray-200 dark:bg-slate-700 rounded mb-4"></div>
              <div className="h-64 bg-gray-200 dark:bg-slate-700 rounded"></div>
            </div>
            <div className="bg-white dark:bg-slate-800/80 backdrop-blur-sm rounded-lg p-6 shadow-lg animate-pulse">
              <div className="h-6 w-40 bg-gray-200 dark:bg-slate-700 rounded mb-4"></div>
              <div className="h-64 bg-gray-200 dark:bg-slate-700 rounded"></div>
            </div>
          </div>

          {/* Skeleton Table */}
          <div className="bg-white dark:bg-slate-800/80 backdrop-blur-sm rounded-lg p-6 shadow-lg animate-pulse">
            <div className="h-6 w-40 bg-gray-200 dark:bg-slate-700 rounded mb-4"></div>
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center gap-4">
                  <div className="h-3 w-3 bg-gray-200 dark:bg-slate-700 rounded-full"></div>
                  <div className="h-4 flex-1 bg-gray-200 dark:bg-slate-700 rounded"></div>
                  <div className="h-4 w-20 bg-gray-200 dark:bg-slate-700 rounded"></div>
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-blue-50 to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white dark:bg-slate-800/80 backdrop-blur-sm rounded-lg p-12 shadow-lg text-center">
            <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              Unable to load spending
            </h1>
            <p className="text-gray-500 dark:text-slate-400 mb-6">{error}</p>
            <button
              onClick={() => void handleRefresh()}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <PullToRefresh
      onRefresh={handleRefresh}
      className="min-h-screen bg-gradient-to-br from-blue-50 via-blue-50 to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900"
    >
      {/* Header */}
      <header className="bg-white dark:bg-slate-800/80 backdrop-blur-sm shadow-sm border-b border-white/20 dark:border-slate-700/20 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 py-3 sm:h-16 sm:py-0">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push("/dashboard")}
                className="text-gray-600 hover:text-gray-900 dark:text-slate-400 dark:hover:text-white whitespace-nowrap"
              >
                ← Back
              </button>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                Spending
              </h1>
            </div>

            {/* Time Range Selector */}
            <div className="flex gap-1.5 sm:gap-2 w-full sm:w-auto">
              {(["week", "month", "quarter", "year"] as const).map((range) => (
                <button
                  key={range}
                  onClick={() => setTimeRange(range)}
                  className={`flex-1 sm:flex-initial px-2 sm:px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg transition-colors ${timeRange === range ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-slate-700 dark:text-slate-300"}`}
                >
                  {range.charAt(0).toUpperCase() + range.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white dark:bg-slate-800/80 backdrop-blur-sm rounded-lg p-6 shadow-lg">
            <p className="text-sm text-gray-500 dark:text-slate-400 mb-1">
              Total Spent This Month
            </p>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">
              {formatCurrency(totalSpending)}
            </p>
            <p
              className={`text-sm mt-1 ${spendingChange < 0 ? "text-green-600" : "text-red-600"}`}
            >
              {spendingChange > 0 ? "↑" : "↓"}{" "}
              {Math.abs(spendingChange).toFixed(1)}% from last month
            </p>
          </div>

          <div className="bg-white dark:bg-slate-800/80 backdrop-blur-sm rounded-lg p-6 shadow-lg">
            <p className="text-sm text-gray-500 dark:text-slate-400 mb-1">
              Daily Average
            </p>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">
              {formatCurrency(dailyAverage)}
            </p>
            <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
              Based on this month
            </p>
          </div>

          <div className="bg-white dark:bg-slate-800/80 backdrop-blur-sm rounded-lg p-6 shadow-lg">
            <p className="text-sm text-gray-500 dark:text-slate-400 mb-1">
              Transactions
            </p>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">
              {transactionCount}
            </p>
            <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
              Across {categories.length} categories
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Spending by Category - Donut Chart */}
          <div className="bg-white dark:bg-slate-800/80 backdrop-blur-sm rounded-lg p-6 shadow-lg">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Spending by Category
            </h2>
            {categories.length === 0 ? (
              <div className="h-80 flex items-center justify-center text-center text-gray-500 dark:text-slate-400">
                No spending data yet. Connect an account to see your category
                breakdown.
              </div>
            ) : (
              <DonutChart
                data={donutData}
                height={320}
                innerRadius={70}
                outerRadius={100}
                showLegend={true}
                currency={true}
                centerValue={formatCurrency(totalSpending)}
                centerLabel="Total Spent"
                useCategyColors={true}
              />
            )}
          </div>

          {/* Monthly Trend */}
          <div className="bg-white dark:bg-slate-800/80 backdrop-blur-sm rounded-lg p-6 shadow-lg">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Monthly Trend
            </h2>
            {trendData.length === 0 ? (
              <div className="h-80 flex items-center justify-center text-center text-gray-500 dark:text-slate-400">
                No trend data yet.
              </div>
            ) : (
              <LineChart
                data={trendData}
                lines={[
                  {
                    dataKey: "spending",
                    name: "Monthly Spending",
                    color: "#3B82F6",
                  },
                ]}
                height={320}
                currency={true}
              />
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Budget vs Actual — no honest per-user source wired yet */}
          <div className="bg-white dark:bg-slate-800/80 backdrop-blur-sm rounded-lg p-6 shadow-lg">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Budget vs Actual
            </h2>
            <div className="py-8 text-center text-gray-500 dark:text-slate-400">
              Budget comparison isn&apos;t available yet. Set up category budgets
              to track budget vs actual spending.
            </div>
          </div>

          {/* Top Merchants */}
          <div className="bg-white dark:bg-slate-800/80 backdrop-blur-sm rounded-lg p-6 shadow-lg">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Top Merchants
            </h2>
            {merchants.length === 0 ? (
              <div className="py-8 text-center text-gray-500 dark:text-slate-400">
                No merchant activity yet.
              </div>
            ) : (
              <div className="space-y-3">
                {merchants.map((merchant, index) => (
                  <div
                    key={merchant.name}
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-700/50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-sm font-bold text-blue-600 dark:text-blue-400">
                        {index + 1}
                      </span>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {merchant.name}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-slate-400">
                          {merchant.transactionCount} transactions
                        </p>
                      </div>
                    </div>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {formatCurrency(merchant.amount)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Spending Insights */}
        <div className="bg-white dark:bg-slate-800/80 backdrop-blur-sm rounded-lg p-6 shadow-lg">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Spending Insights
          </h2>
          {insights.length === 0 ? (
            <div className="py-8 text-center text-gray-500 dark:text-slate-400">
              No insights yet. Insights appear as we analyze your spending.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {insights.map((insight) => (
                <div
                  key={insight.id}
                  className={`p-4 rounded-lg border ${getInsightColor(insight.type)}`}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        {insight.title}
                      </h3>
                      {insight.description && (
                        <p className="text-sm text-gray-600 dark:text-slate-400 mt-1">
                          {insight.description}
                        </p>
                      )}
                      {insight.potentialSavings && (
                        <p className="text-sm font-medium text-green-600 dark:text-green-400 mt-2">
                          Potential savings:{" "}
                          {formatCurrency(insight.potentialSavings)}/month
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Category Breakdown Table */}
        <div className="bg-white dark:bg-slate-800/80 backdrop-blur-sm rounded-lg p-4 sm:p-6 shadow-lg mt-8">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Category Breakdown
          </h2>
          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <table className="w-full min-w-[500px]">
              <thead>
                <tr className="border-b border-gray-200 dark:border-slate-700">
                  <th className="text-left py-3 px-4 text-xs sm:text-sm font-medium text-gray-500 dark:text-slate-400">
                    Category
                  </th>
                  <th className="text-right py-3 px-4 text-xs sm:text-sm font-medium text-gray-500 dark:text-slate-400">
                    Amount
                  </th>
                  <th className="text-right py-3 px-4 text-xs sm:text-sm font-medium text-gray-500 dark:text-slate-400 hidden sm:table-cell">
                    % of Total
                  </th>
                  <th className="text-right py-3 px-4 text-xs sm:text-sm font-medium text-gray-500 dark:text-slate-400 hidden md:table-cell">
                    Transactions
                  </th>
                  <th className="text-right py-3 px-4 text-xs sm:text-sm font-medium text-gray-500 dark:text-slate-400">
                    Trend
                  </th>
                </tr>
              </thead>
              <tbody>
                {categories.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="py-8 text-center text-gray-500 dark:text-slate-400 text-sm"
                    >
                      No spending data yet.
                    </td>
                  </tr>
                ) : (
                  categories.map((category) => (
                    <tr
                      key={category.name}
                      className="border-b border-gray-100 dark:border-slate-700/50 hover:bg-gray-50 dark:hover:bg-slate-700/30"
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className="w-3 h-3 rounded-full flex-shrink-0"
                            style={{
                              backgroundColor: getCategoryColor(category.name),
                            }}
                          />
                          <span className="font-medium text-gray-900 dark:text-white text-sm truncate">
                            {category.name}
                          </span>
                        </div>
                      </td>
                      <td className="text-right py-3 px-4 font-medium text-gray-900 dark:text-white text-sm whitespace-nowrap">
                        {formatCurrency(category.value)}
                      </td>
                      <td className="text-right py-3 px-4 text-gray-600 dark:text-slate-400 text-sm hidden sm:table-cell">
                        {totalSpending > 0
                          ? ((category.value / totalSpending) * 100).toFixed(1)
                          : "0.0"}
                        %
                      </td>
                      <td className="text-right py-3 px-4 text-gray-600 dark:text-slate-400 text-sm hidden md:table-cell">
                        {category.transactionCount}
                      </td>
                      <td className="text-right py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1 text-sm whitespace-nowrap ${
                            category.trend === "up"
                              ? "text-red-600"
                              : category.trend === "down"
                                ? "text-green-600"
                                : "text-gray-500 dark:text-slate-400"
                          }`}
                        >
                          {category.trend === "up"
                            ? "↑"
                            : category.trend === "down"
                              ? "↓"
                              : "→"}
                          {category.changePercent !== 0 &&
                            `${Math.abs(category.changePercent)}%`}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </PullToRefresh>
  );
}
