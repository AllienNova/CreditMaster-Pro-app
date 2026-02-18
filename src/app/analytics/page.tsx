"use client";

import { Icon } from "@/components/ui/Icon";
const overviewStats = [
  {
    label: "Current Credit Score",
    value: "720",
    change: "+45",
    changeLabel: "from 675",
    color: "emerald",
  },
  {
    label: "Active Disputes",
    value: "5",
    change: "3",
    changeLabel: "pending response",
    color: "blue",
  },
  {
    label: "Items Removed",
    value: "12",
    change: "+4",
    changeLabel: "this month",
    color: "purple",
  },
  {
    label: "Success Rate",
    value: "78%",
    change: "+5%",
    changeLabel: "vs last month",
    color: "orange",
  },
];

const recentActivity = [
  {
    type: "score_update",
    message: "Credit score increased by 15 points",
    date: "2 hours ago",
    icon: "trending-up",
  },
  {
    type: "dispute_resolved",
    message: "Late payment removed from Experian",
    date: "1 day ago",
    icon: "trending-up",
  },
  {
    type: "dispute_sent",
    message: "Collection dispute sent to Equifax",
    date: "3 days ago",
    icon: "check",
  },
  {
    type: "report_pulled",
    message: "Credit report refreshed",
    date: "5 days ago",
    icon: "paper-airplane",
  },
];

const bureauScores = [
  { bureau: "Experian", score: 725, change: "+12", lastUpdated: "Dec 1, 2024" },
  { bureau: "Equifax", score: 718, change: "+8", lastUpdated: "Nov 28, 2024" },
  {
    bureau: "TransUnion",
    score: 715,
    change: "+5",
    lastUpdated: "Nov 25, 2024",
  },
];

const monthlyProgress = [
  { month: "Jul", score: 620 },
  { month: "Aug", score: 635 },
  { month: "Sep", score: 655 },
  { month: "Oct", score: 680 },
  { month: "Nov", score: 705 },
  { month: "Dec", score: 720 },
];

export default function AnalyticsOverviewPage() {
  const maxScore = 850;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
        Analytics Overview
      </h1>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {overviewStats.map((stat) => (
          <div
            key={stat.label}
            className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-slate-700"
          >
            <p className="text-sm text-gray-500 dark:text-slate-400">
              {stat.label}
            </p>
            <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">
              {stat.value}
            </p>
            <p className="text-sm mt-2 text-emerald-500">
              {stat.change}{" "}
              <span className="text-gray-400 dark:text-slate-500">
                {stat.changeLabel}
              </span>
            </p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Score Progress Chart */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Score Progress (6 Months)
          </h2>
          <div className="h-64 flex items-end justify-between gap-4">
            {monthlyProgress.map((item) => (
              <div
                key={item.month}
                className="flex-1 flex flex-col items-center"
              >
                <div
                  className="w-full bg-gradient-to-t from-emerald-500 to-blue-500 rounded-t-lg transition-all"
                  style={{ height: `${((item.score - 500) / 350) * 100}%` }}
                />
                <p className="text-xs text-gray-500 dark:text-slate-400 mt-2">
                  {item.month}
                </p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {item.score}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Bureau Scores */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Bureau Scores
          </h2>
          <div className="space-y-4">
            {bureauScores.map((bureau) => (
              <div
                key={bureau.bureau}
                className="p-4 bg-gray-50 dark:bg-slate-900 rounded-lg"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-gray-900 dark:text-white">
                    {bureau.bureau}
                  </span>
                  <span className="text-emerald-500 text-sm">
                    {bureau.change}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-1 bg-gray-200 dark:bg-slate-700 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-emerald-500 to-blue-500 h-2 rounded-full"
                      style={{ width: `${(bureau.score / maxScore) * 100}%` }}
                    />
                  </div>
                  <span className="text-lg font-bold text-gray-900 dark:text-white">
                    {bureau.score}
                  </span>
                </div>
                <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">
                  Updated: {bureau.lastUpdated}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="mt-8 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700">
        <div className="p-6 border-b border-gray-200 dark:border-slate-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Recent Activity
          </h2>
        </div>
        <div className="divide-y divide-gray-100 dark:divide-slate-700">
          {recentActivity.map((activity, i) => (
            <div key={i} className="p-4 flex items-center gap-4">
              <Icon name={activity.icon} className="text-2xl inline-block" />
              <div className="flex-1">
                <p className="font-medium text-gray-900 dark:text-white">
                  {activity.message}
                </p>
                <p className="text-sm text-gray-500 dark:text-slate-400">
                  {activity.date}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
