"use client";

import Link from "next/link";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Insight {
  id: string;
  title: string;
  description: string;
  confidence: number;
  actionable: boolean;
  category: string;
}

// ---------------------------------------------------------------------------
// Mock Data
// ---------------------------------------------------------------------------

const INSIGHTS: Insight[] = [
  {
    id: "ins-1",
    title: "Credit Utilization Trending Up",
    description:
      "Your overall credit utilization has increased from 22% to 31% over the last 60 days. Keeping it below 30% is recommended for optimal credit scoring. Consider making an extra payment on your Chase card to bring it back under threshold.",
    confidence: 94,
    actionable: true,
    category: "Credit",
  },
  {
    id: "ins-2",
    title: "Spending Pattern Anomaly Detected",
    description:
      "Your dining and entertainment spending increased 45% this month compared to your 3-month average. This may impact your ability to meet your savings goal of $500/month.",
    confidence: 88,
    actionable: true,
    category: "Spending",
  },
  {
    id: "ins-3",
    title: "Optimal Time to Refinance Auto Loan",
    description:
      "Based on current market rates and your improved credit score, refinancing your auto loan could save approximately $1,400 over the remaining term. Your score has improved 35 points since the original loan.",
    confidence: 82,
    actionable: true,
    category: "Debt",
  },
  {
    id: "ins-4",
    title: "Emergency Fund Below Target",
    description:
      "Your emergency fund currently covers 1.8 months of expenses, below the recommended 3-6 months. At your current savings rate, you will reach the 3-month target in approximately 14 weeks.",
    confidence: 96,
    actionable: true,
    category: "Savings",
  },
  {
    id: "ins-5",
    title: "Credit Age Improving Steadily",
    description:
      "Your average account age has increased to 4.2 years, up from 3.8 years six months ago. This positive trend contributes to 15% of your credit score. Avoid opening new accounts unless necessary to maintain this trajectory.",
    confidence: 91,
    actionable: false,
    category: "Credit",
  },
  {
    id: "ins-6",
    title: "Bill Payment Optimization Available",
    description:
      "By shifting your credit card payment date to align with your paycheck cycle, you could reduce the number of days your balance sits at peak utilization and potentially improve your reported utilization by 5-8%.",
    confidence: 77,
    actionable: true,
    category: "Bills",
  },
  {
    id: "ins-7",
    title: "Investment Portfolio Rebalancing Needed",
    description:
      "Your portfolio allocation has drifted 12% from your target. US equities are over-weighted while international exposure is below target. Consider rebalancing to maintain your risk profile.",
    confidence: 85,
    actionable: true,
    category: "Investments",
  },
  {
    id: "ins-8",
    title: "Tax-Loss Harvesting Opportunity",
    description:
      "Two holdings in your portfolio have unrealized losses that could offset $1,200 in capital gains this tax year. This is most effective before December 31.",
    confidence: 79,
    actionable: true,
    category: "Taxes",
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function confidenceColor(confidence: number): string {
  if (confidence >= 90) return "text-green-600 dark:text-green-400";
  if (confidence >= 80) return "text-blue-600 dark:text-blue-400";
  return "text-amber-600 dark:text-amber-400";
}

function confidenceBg(confidence: number): string {
  if (confidence >= 90) return "bg-green-50 dark:bg-green-900/20";
  if (confidence >= 80) return "bg-blue-50 dark:bg-blue-900/20";
  return "bg-amber-50 dark:bg-amber-900/20";
}

function categoryColor(category: string): string {
  switch (category) {
    case "Credit":
      return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
    case "Spending":
      return "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400";
    case "Debt":
      return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
    case "Savings":
      return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
    case "Bills":
      return "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400";
    case "Investments":
      return "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400";
    case "Taxes":
      return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400";
    default:
      return "bg-gray-100 text-gray-700 dark:bg-slate-700 dark:text-slate-300";
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function InsightsPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <nav className="flex mb-4" aria-label="Breadcrumb">
          <ol className="inline-flex items-center space-x-1 md:space-x-3">
            <li className="inline-flex items-center">
              <Link
                href="/recommendations"
                className="inline-flex items-center text-sm font-medium text-gray-700 hover:text-blue-600 dark:text-slate-400 dark:hover:text-white"
              >
                <svg
                  className="w-4 h-4 mr-2"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
                </svg>
                Recommendations
              </Link>
            </li>
            <li>
              <div className="flex items-center">
                <svg
                  className="w-6 h-6 text-gray-400 dark:text-slate-500"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
                <span className="ml-1 text-sm font-medium text-gray-500 md:ml-2 dark:text-slate-400">
                  Insights
                </span>
              </div>
            </li>
          </ol>
        </nav>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Financial Insights
          </h1>
          <p className="mt-2 text-gray-600 dark:text-slate-400">
            AI-generated insights based on your financial data, spending
            patterns, and credit history.
          </p>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 p-5 text-center">
            <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
              {INSIGHTS.length}
            </p>
            <p className="text-sm text-gray-600 dark:text-slate-400 mt-1">
              Total Insights
            </p>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 p-5 text-center">
            <p className="text-3xl font-bold text-green-600 dark:text-green-400">
              {INSIGHTS.filter((i) => i.actionable).length}
            </p>
            <p className="text-sm text-gray-600 dark:text-slate-400 mt-1">
              Actionable
            </p>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 p-5 text-center">
            <p className="text-3xl font-bold text-violet-600 dark:text-violet-400">
              {Math.round(
                INSIGHTS.reduce((s, i) => s + i.confidence, 0) /
                  INSIGHTS.length,
              )}
              %
            </p>
            <p className="text-sm text-gray-600 dark:text-slate-400 mt-1">
              Avg. Confidence
            </p>
          </div>
        </div>

        {/* Insights List */}
        <div className="space-y-4">
          {INSIGHTS.map((insight) => (
            <div
              key={insight.id}
              className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 p-5"
            >
              {/* Top row */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                    {insight.title}
                  </h3>
                  {insight.actionable && (
                    <span className="text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 px-2 py-0.5 rounded-full">
                      Actionable
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded-full ${categoryColor(insight.category)}`}
                  >
                    {insight.category}
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full ${confidenceBg(insight.confidence)} ${confidenceColor(insight.confidence)}`}
                  >
                    <svg
                      className="w-3 h-3"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    {insight.confidence}%
                  </span>
                </div>
              </div>

              {/* Description */}
              <p className="text-sm text-gray-600 dark:text-slate-400 leading-relaxed">
                {insight.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
