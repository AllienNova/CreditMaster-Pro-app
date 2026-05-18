"use client";

/**
 * Spending Dashboard Page
 *
 * Comprehensive spending visualization with:
 * - Category breakdown donut chart
 * - Monthly spending trends
 * - Top merchants
 * - Budget vs actual comparison
 * - Spending insights
 */

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import DonutChart from "@/components/charts/DonutChart";
import {
  LineChartComponent as LineChart,
  BarChartComponent as BarChart,
  formatCurrency,
  CHART_COLORS,
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

// Types
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

interface BudgetComparison {
  category: string;
  budgeted: number;
  spent: number;
  remaining: number;
  percentUsed: number;
}

interface SpendingInsight {
  id: string;
  type: "saving" | "warning" | "tip" | "achievement";
  title: string;
  description: string;
  potentialSavings?: number;
}

// Mock data - will be replaced with API calls
const MOCK_SPENDING_DATA: SpendingCategory[] = [
  {
    name: "Housing",
    value: 1850,
    transactionCount: 2,
    trend: "stable",
    changePercent: 0,
  },
  {
    name: "Food & Dining",
    value: 680,
    transactionCount: 45,
    trend: "up",
    changePercent: 12,
  },
  {
    name: "Transportation",
    value: 420,
    transactionCount: 28,
    trend: "down",
    changePercent: -8,
  },
  {
    name: "Shopping",
    value: 385,
    transactionCount: 15,
    trend: "up",
    changePercent: 25,
  },
  {
    name: "Utilities",
    value: 245,
    transactionCount: 6,
    trend: "stable",
    changePercent: 2,
  },
  {
    name: "Entertainment",
    value: 195,
    transactionCount: 12,
    trend: "up",
    changePercent: 15,
  },
  {
    name: "Healthcare",
    value: 150,
    transactionCount: 4,
    trend: "down",
    changePercent: -20,
  },
  {
    name: "Subscriptions",
    value: 89,
    transactionCount: 8,
    trend: "stable",
    changePercent: 0,
  },
];

const MOCK_MONTHLY_TREND: MonthlySpending[] = [
  { month: "Aug", amount: 3850 },
  { month: "Sep", amount: 4120 },
  { month: "Oct", amount: 3920 },
  { month: "Nov", amount: 4280 },
  { month: "Dec", amount: 4650 },
  { month: "Jan", amount: 4014 },
];

const MOCK_TOP_MERCHANTS: Merchant[] = [
  {
    name: "Whole Foods",
    category: "Food & Dining",
    amount: 342,
    transactionCount: 8,
  },
  { name: "Amazon", category: "Shopping", amount: 285, transactionCount: 12 },
  {
    name: "Shell Gas",
    category: "Transportation",
    amount: 198,
    transactionCount: 6,
  },
  {
    name: "Netflix",
    category: "Entertainment",
    amount: 15.99,
    transactionCount: 1,
  },
  {
    name: "Spotify",
    category: "Entertainment",
    amount: 10.99,
    transactionCount: 1,
  },
];

const MOCK_BUDGET_COMPARISON: BudgetComparison[] = [
  {
    category: "Food & Dining",
    budgeted: 600,
    spent: 680,
    remaining: -80,
    percentUsed: 113,
  },
  {
    category: "Shopping",
    budgeted: 400,
    spent: 385,
    remaining: 15,
    percentUsed: 96,
  },
  {
    category: "Entertainment",
    budgeted: 200,
    spent: 195,
    remaining: 5,
    percentUsed: 98,
  },
  {
    category: "Transportation",
    budgeted: 500,
    spent: 420,
    remaining: 80,
    percentUsed: 84,
  },
];

const MOCK_INSIGHTS: SpendingInsight[] = [
  {
    id: "1",
    type: "warning",
    title: "Food spending up 12%",
    description:
      "Your food & dining spending increased from last month. Consider meal planning to reduce costs.",
    potentialSavings: 80,
  },
  {
    id: "2",
    type: "saving",
    title: "Subscription savings found",
    description:
      "You have 3 streaming services. Consolidating could save money.",
    potentialSavings: 25,
  },
  {
    id: "3",
    type: "achievement",
    title: "Transportation down 8%",
    description: "Great job reducing transportation costs this month!",
  },
  {
    id: "4",
    type: "tip",
    title: "Set up automatic savings",
    description:
      "Based on your spending patterns, you could save $200/month automatically.",
    potentialSavings: 200,
  },
];

export default function SpendingDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<
    "week" | "month" | "quarter" | "year"
  >("month");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const router = useRouter();

  const supabase = createClient();

  useEffect(() => {

    const checkAuth = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        router.push("/auth/login");
        return;
      }
      setLoading(false);
    };

    checkAuth();
  }, [router, supabase]);

  const totalSpending = MOCK_SPENDING_DATA.reduce(
    (sum, cat) => sum + cat.value,
    0,
  );
  const lastMonthSpending = 4280;
  const spendingChange =
    ((totalSpending - lastMonthSpending) / lastMonthSpending) * 100;

  const donutData = MOCK_SPENDING_DATA.map((cat) => ({
    name: cat.name,
    value: cat.value,
    color: getCategoryColor(cat.name),
  }));

  const trendData = MOCK_MONTHLY_TREND.map((m) => ({
    label: m.month,
    spending: m.amount,
  }));

  const getInsightIcon = (type: SpendingInsight["type"]) => {
    switch (type) {
      case "warning":
        return "";
      case "saving":
        return "";
      case "achievement":
        return "";
      case "tip":
        return "";
      default:
        return "";
    }
  };

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
    setLoading(true);
    // Simulate data refresh
    await new Promise((resolve) => setTimeout(resolve, 800));
    setLoading(false);
  }, []);

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
              {formatCurrency(totalSpending / 30)}
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
              {MOCK_SPENDING_DATA.reduce(
                (sum, cat) => sum + cat.transactionCount,
                0,
              )}
            </p>
            <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
              Across {MOCK_SPENDING_DATA.length} categories
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Spending by Category - Donut Chart */}
          <div className="bg-white dark:bg-slate-800/80 backdrop-blur-sm rounded-lg p-6 shadow-lg">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Spending by Category
            </h2>
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
              onSliceClick={(data) => setSelectedCategory(data.name)}
            />
          </div>

          {/* Monthly Trend */}
          <div className="bg-white dark:bg-slate-800/80 backdrop-blur-sm rounded-lg p-6 shadow-lg">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Monthly Trend
            </h2>
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
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Budget vs Actual */}
          <div className="bg-white dark:bg-slate-800/80 backdrop-blur-sm rounded-lg p-6 shadow-lg">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Budget vs Actual
            </h2>
            <div className="space-y-4">
              {MOCK_BUDGET_COMPARISON.map((item) => (
                <div key={item.category} className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium text-gray-700 dark:text-slate-300">
                      {item.category}
                    </span>
                    <span
                      className={
                        item.percentUsed > 100
                          ? "text-red-600"
                          : "text-gray-600 dark:text-slate-400"
                      }
                    >
                      {formatCurrency(item.spent)} /{" "}
                      {formatCurrency(item.budgeted)}
                    </span>
                  </div>
                  <div className="h-2 bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        item.percentUsed > 100
                          ? "bg-red-500"
                          : item.percentUsed > 80
                            ? "bg-amber-500"
                            : "bg-green-500"
                      }`}
                      style={{ width: `${Math.min(item.percentUsed, 100)}%` }}
                    />
                  </div>
                  <p
                    className={`text-xs ${item.remaining < 0 ? "text-red-600" : "text-green-600"}`}
                  >
                    {item.remaining < 0
                      ? `${formatCurrency(Math.abs(item.remaining))} over budget`
                      : `${formatCurrency(item.remaining)} remaining`}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Top Merchants */}
          <div className="bg-white dark:bg-slate-800/80 backdrop-blur-sm rounded-lg p-6 shadow-lg">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Top Merchants
            </h2>
            <div className="space-y-3">
              {MOCK_TOP_MERCHANTS.map((merchant, index) => (
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
                        {merchant.category} • {merchant.transactionCount}{" "}
                        transactions
                      </p>
                    </div>
                  </div>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {formatCurrency(merchant.amount)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Spending Insights */}
        <div className="bg-white dark:bg-slate-800/80 backdrop-blur-sm rounded-lg p-6 shadow-lg">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Spending Insights
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {MOCK_INSIGHTS.map((insight) => (
              <div
                key={insight.id}
                className={`p-4 rounded-lg border ${getInsightColor(insight.type)}`}
              >
                <div className="flex items-start gap-3">
                  <span className="text-2xl">
                    {getInsightIcon(insight.type)}
                  </span>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      {insight.title}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-slate-400 mt-1">
                      {insight.description}
                    </p>
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
                {MOCK_SPENDING_DATA.map((category) => (
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
                      {((category.value / totalSpending) * 100).toFixed(1)}%
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
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </PullToRefresh>
  );
}
