"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Wallet,
  CreditCard,
  Calendar,
  Target,
  Lightbulb,
  ChevronRight,
  ArrowUp,
  ArrowDown,
  Minus,
  PieChart,
  DollarSign,
  Bell,
  CheckCircle,
  AlertTriangle,
} from "lucide-react";
import Link from "next/link";

interface WeeklySummary {
  healthScore: number;
  healthScoreChange: number;
  spending: {
    totalSpent: number;
    comparedToLastWeek: number;
    trend: "up" | "down" | "stable";
    topCategories: {
      category: string;
      amount: number;
      percentOfTotal: number;
    }[];
  };
  budget: {
    totalBudget: number;
    totalSpent: number;
    percentUsed: number;
    daysRemaining: number;
    categoriesOverBudget: number;
  };
  credit: {
    currentScore: number;
    scoreChange: number;
  };
  bills: {
    upcomingCount: number;
    totalDueThisWeek: number;
    overdueCount: number;
  };
  investments: {
    portfolioValue: number;
    weeklyChange: number;
    weeklyChangePercent: number;
    dividendsReceived: number;
  };
  goals: {
    activeGoals: number;
    goalsOnTrack: number;
    goalsAtRisk: number;
  };
  insights: {
    id: string;
    type: "tip" | "alert" | "achievement";
    title: string;
    description: string;
    actionUrl?: string;
  }[];
}

const MOCK_SUMMARY: WeeklySummary = {
  healthScore: 78,
  healthScoreChange: 3,
  spending: {
    totalSpent: 1245.67,
    comparedToLastWeek: -12.5,
    trend: "down",
    topCategories: [
      { category: "Groceries", amount: 342.15, percentOfTotal: 27.5 },
      { category: "Dining", amount: 256.8, percentOfTotal: 20.6 },
      { category: "Transportation", amount: 189.45, percentOfTotal: 15.2 },
      { category: "Shopping", amount: 167.9, percentOfTotal: 13.5 },
      { category: "Entertainment", amount: 98.5, percentOfTotal: 7.9 },
    ],
  },
  budget: {
    totalBudget: 4000,
    totalSpent: 2856,
    percentUsed: 71.4,
    daysRemaining: 12,
    categoriesOverBudget: 1,
  },
  credit: {
    currentScore: 742,
    scoreChange: 8,
  },
  bills: {
    upcomingCount: 4,
    totalDueThisWeek: 487.5,
    overdueCount: 0,
  },
  investments: {
    portfolioValue: 45678.9,
    weeklyChange: 1234.56,
    weeklyChangePercent: 2.78,
    dividendsReceived: 45.23,
  },
  goals: {
    activeGoals: 3,
    goalsOnTrack: 2,
    goalsAtRisk: 1,
  },
  insights: [
    {
      id: "1",
      type: "achievement",
      title: "Credit Score Improved!",
      description:
        "Your credit score went up 8 points this week. Great progress!",
      actionUrl: "/credit",
    },
    {
      id: "2",
      type: "tip",
      title: "Spending Down 12.5%",
      description: "You spent less this week than last week. Keep it up!",
      actionUrl: "/financial/transactions",
    },
    {
      id: "3",
      type: "alert",
      title: "Goal Needs Attention",
      description: "Your vacation fund is behind schedule by $150",
      actionUrl: "/financial/goals",
    },
  ],
};

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
};

const formatPercent = (value: number, showSign = true) => {
  const sign = showSign && value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}%`;
};

const TrendIcon = ({ trend }: { trend: "up" | "down" | "stable" }) => {
  if (trend === "up") return <ArrowUp className="w-4 h-4 text-red-500" />;
  if (trend === "down") return <ArrowDown className="w-4 h-4 text-green-500" />;
  return <Minus className="w-4 h-4 text-gray-500 dark:text-slate-400" />;
};

export default function WeeklySummaryPage() {
  const [summary] = useState<WeeklySummary>(MOCK_SUMMARY);

  const getHealthScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  const getHealthScoreBg = (score: number) => {
    if (score >= 80) return "from-green-500 to-emerald-600";
    if (score >= 60) return "from-yellow-500 to-orange-600";
    return "from-red-500 to-rose-600";
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <BarChart3 className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Weekly Summary
            </h1>
          </div>
          <p className="text-gray-600 dark:text-slate-400">
            Your financial health overview for the week of Jan 13 - Jan 19, 2026
          </p>
        </div>

        {/* Health Score Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`bg-gradient-to-r ${getHealthScoreBg(summary.healthScore)} rounded-xl p-6 mb-8 text-white`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/80 mb-1">Financial Health Score</p>
              <div className="flex items-baseline gap-3">
                <span className="text-5xl font-bold">
                  {summary.healthScore}
                </span>
                <span className="text-white/60">/100</span>
                <span
                  className={`flex items-center gap-1 px-2 py-1 rounded-full text-sm ${
                    summary.healthScoreChange > 0
                      ? "bg-white dark:bg-slate-800/20"
                      : "bg-red-500/30"
                  }`}
                >
                  {summary.healthScoreChange > 0 ? (
                    <ArrowUp className="w-3 h-3" />
                  ) : (
                    <ArrowDown className="w-3 h-3" />
                  )}
                  {Math.abs(summary.healthScoreChange)} pts
                </span>
              </div>
              <p className="text-white/70 mt-2">
                {summary.healthScore >= 80
                  ? "Excellent! Keep up the great work!"
                  : summary.healthScore >= 60
                    ? "Good progress. A few areas to improve."
                    : "Needs attention. Review recommendations below."}
              </p>
            </div>
            <div className="hidden sm:block">
              <div className="w-32 h-32 rounded-full border-8 border-white/30 flex items-center justify-center">
                <span className="text-4xl font-bold">
                  {summary.healthScore}
                </span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <Wallet className="w-5 h-5 text-blue-500" />
              <span className="text-sm text-gray-500 dark:text-slate-400">
                Spent This Week
              </span>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {formatCurrency(summary.spending.totalSpent)}
            </p>
            <div className="flex items-center gap-1 text-sm mt-1">
              <TrendIcon trend={summary.spending.trend} />
              <span
                className={
                  summary.spending.trend === "down"
                    ? "text-green-600"
                    : "text-red-600"
                }
              >
                {formatPercent(summary.spending.comparedToLastWeek)} vs last
                week
              </span>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <PieChart className="w-5 h-5 text-blue-500" />
              <span className="text-sm text-gray-500 dark:text-slate-400">
                Budget Used
              </span>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {summary.budget.percentUsed.toFixed(0)}%
            </p>
            <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
              {summary.budget.daysRemaining} days remaining
            </p>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <CreditCard className="w-5 h-5 text-emerald-500" />
              <span className="text-sm text-gray-500 dark:text-slate-400">
                Credit Score
              </span>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {summary.credit.currentScore}
            </p>
            <div className="flex items-center gap-1 text-sm mt-1">
              {summary.credit.scoreChange > 0 ? (
                <ArrowUp className="w-3 h-3 text-green-500" />
              ) : summary.credit.scoreChange < 0 ? (
                <ArrowDown className="w-3 h-3 text-red-500" />
              ) : null}
              <span
                className={
                  summary.credit.scoreChange >= 0
                    ? "text-green-600"
                    : "text-red-600"
                }
              >
                {summary.credit.scoreChange > 0 ? "+" : ""}
                {summary.credit.scoreChange} pts
              </span>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-5 h-5 text-green-500" />
              <span className="text-sm text-gray-500 dark:text-slate-400">
                Portfolio
              </span>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {formatCurrency(summary.investments.portfolioValue)}
            </p>
            <div className="flex items-center gap-1 text-sm mt-1">
              {summary.investments.weeklyChangePercent >= 0 ? (
                <ArrowUp className="w-3 h-3 text-green-500" />
              ) : (
                <ArrowDown className="w-3 h-3 text-red-500" />
              )}
              <span
                className={
                  summary.investments.weeklyChangePercent >= 0
                    ? "text-green-600"
                    : "text-red-600"
                }
              >
                {formatPercent(summary.investments.weeklyChangePercent)}
              </span>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Insights */}
          <div className="lg:col-span-2 space-y-6">
            {/* Insights */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-yellow-500" />
                Key Insights
              </h2>
              <div className="space-y-3">
                {summary.insights.map((insight) => (
                  <div
                    key={insight.id}
                    className={`p-4 rounded-lg ${insight.type === "achievement" ? "bg-green-50 border border-green-200" : insight.type === "alert" ? "bg-amber-50 border border-amber-200" : "bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800"}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        {insight.type === "achievement" ? (
                          <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                        ) : insight.type === "alert" ? (
                          <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
                        ) : (
                          <Lightbulb className="w-5 h-5 text-blue-600 mt-0.5" />
                        )}
                        <div>
                          <h3 className="font-medium text-gray-900 dark:text-white">
                            {insight.title}
                          </h3>
                          <p className="text-sm text-gray-600 dark:text-slate-400 mt-1">
                            {insight.description}
                          </p>
                        </div>
                      </div>
                      {insight.actionUrl && (
                        <Link
                          href={insight.actionUrl}
                          className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
                        >
                          View
                          <ChevronRight className="w-4 h-4" />
                        </Link>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Spending Breakdown */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-green-500" />
                Spending Breakdown
              </h2>
              <div className="space-y-4">
                {summary.spending.topCategories.map((cat, index) => (
                  <div key={cat.category}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-700 dark:text-slate-300">
                        {cat.category}
                      </span>
                      <span className="text-sm text-gray-600 dark:text-slate-400">
                        {formatCurrency(cat.amount)}
                      </span>
                    </div>
                    <div className="h-2 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full"
                        style={{ width: `${cat.percentOfTotal}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <Link
                href="/financial/transactions"
                className="mt-4 inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
              >
                View all transactions
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* Right Column - Quick Actions */}
          <div className="space-y-6">
            {/* Bills Due */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-500" />
                Bills This Week
              </h2>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 dark:text-slate-400">
                    Upcoming
                  </span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {summary.bills.upcomingCount} bills
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 dark:text-slate-400">
                    Total Due
                  </span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {formatCurrency(summary.bills.totalDueThisWeek)}
                  </span>
                </div>
                {summary.bills.overdueCount > 0 && (
                  <div className="flex items-center justify-between text-red-600">
                    <span>Overdue</span>
                    <span className="font-semibold">
                      {summary.bills.overdueCount}
                    </span>
                  </div>
                )}
              </div>
              <Link
                href="/budgeting/bills"
                className="mt-4 w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg text-sm font-medium hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
              >
                <Calendar className="w-4 h-4" />
                View Bill Calendar
              </Link>
            </div>

            {/* Goals Progress */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Target className="w-5 h-5 text-blue-500" />
                Goals Progress
              </h2>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-3 bg-gray-50 dark:bg-slate-700 rounded-lg">
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {summary.goals.activeGoals}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-slate-400">
                    Active
                  </p>
                </div>
                <div className="p-3 bg-green-50 dark:bg-green-900/30 rounded-lg">
                  <p className="text-2xl font-bold text-green-600">
                    {summary.goals.goalsOnTrack}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-slate-400">
                    On Track
                  </p>
                </div>
                <div className="p-3 bg-amber-50 dark:bg-amber-900/30 rounded-lg">
                  <p className="text-2xl font-bold text-amber-600">
                    {summary.goals.goalsAtRisk}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-slate-400">
                    At Risk
                  </p>
                </div>
              </div>
              <Link
                href="/financial/goals"
                className="mt-4 w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg text-sm font-medium hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
              >
                <Target className="w-4 h-4" />
                View All Goals
              </Link>
            </div>

            {/* Investment Highlights */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-green-500" />
                Investments
              </h2>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 dark:text-slate-400">
                    Weekly Change
                  </span>
                  <span
                    className={`font-semibold ${
                      summary.investments.weeklyChange >= 0
                        ? "text-green-600"
                        : "text-red-600"
                    }`}
                  >
                    {summary.investments.weeklyChange >= 0 ? "+" : ""}
                    {formatCurrency(summary.investments.weeklyChange)}
                  </span>
                </div>
                {summary.investments.dividendsReceived > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600 dark:text-slate-400">
                      Dividends
                    </span>
                    <span className="font-semibold text-green-600">
                      +{formatCurrency(summary.investments.dividendsReceived)}
                    </span>
                  </div>
                )}
              </div>
              <Link
                href="/investments"
                className="mt-4 w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-lg text-sm font-medium hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors"
              >
                <TrendingUp className="w-4 h-4" />
                View Portfolio
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
