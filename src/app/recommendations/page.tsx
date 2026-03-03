"use client";

import { useState } from "react";
import Link from "next/link";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Category = "all" | "credit" | "debt" | "savings" | "protection";

interface Recommendation {
  id: string;
  title: string;
  description: string;
  category: Exclude<Category, "all">;
  priority: "high" | "medium" | "low";
  impact: number;
  timeframe: string;
  action: string;
  route: string;
}

// ---------------------------------------------------------------------------
// Mock Data
// ---------------------------------------------------------------------------

const RECOMMENDATIONS: Recommendation[] = [
  {
    id: "1",
    title: "Pay Down Credit Card Balance",
    description:
      "Reduce your Chase card balance by $500 to lower utilization to 25%. This could increase your score by up to 25 points within one billing cycle.",
    category: "credit",
    priority: "high",
    impact: 25,
    timeframe: "30 days",
    action: "View Strategy",
    route: "/financial/coach",
  },
  {
    id: "2",
    title: "Dispute Incorrect Late Payment",
    description:
      "We found a late payment on your Experian report that may be inaccurate. Disputing it could significantly boost your score.",
    category: "credit",
    priority: "high",
    impact: 40,
    timeframe: "45 days",
    action: "Start Dispute",
    route: "/financial/coach",
  },
  {
    id: "3",
    title: "Become an Authorized User",
    description:
      "Ask a family member to add you to their oldest credit card account to inherit their positive payment history.",
    category: "credit",
    priority: "medium",
    impact: 20,
    timeframe: "60 days",
    action: "Learn More",
    route: "/recommendations/credit-cards",
  },
  {
    id: "4",
    title: "Set Up Autopay on All Accounts",
    description:
      "Enable automatic payments on 3 accounts to ensure 100% on-time payment history going forward.",
    category: "credit",
    priority: "medium",
    impact: 15,
    timeframe: "Ongoing",
    action: "Set Up",
    route: "/financial/coach",
  },
  {
    id: "5",
    title: "Freeze Your Credit",
    description:
      "Protect against identity theft by freezing your credit at all three bureaus. Free and takes minutes.",
    category: "protection",
    priority: "medium",
    impact: 0,
    timeframe: "Immediate",
    action: "Freeze Now",
    route: "/identity",
  },
  {
    id: "6",
    title: "Consolidate High-Interest Debt",
    description:
      "Save an estimated $1,200 per year by consolidating 3 credit cards into a lower-rate personal loan.",
    category: "debt",
    priority: "medium",
    impact: 5,
    timeframe: "30 days",
    action: "Compare Loans",
    route: "/recommendations/loans",
  },
  {
    id: "7",
    title: "Build an Emergency Fund",
    description:
      "Start with $500 to avoid future credit damage from unexpected expenses. Automate weekly transfers.",
    category: "savings",
    priority: "low",
    impact: 0,
    timeframe: "90 days",
    action: "Set Goal",
    route: "/financial/coach",
  },
  {
    id: "8",
    title: "Apply for a Secured Credit Card",
    description:
      "Build credit history with a secured card. High approval odds, reports to all three bureaus.",
    category: "credit",
    priority: "low",
    impact: 10,
    timeframe: "90 days",
    action: "View Cards",
    route: "/recommendations/credit-cards",
  },
];

const CATEGORY_CHIPS: { id: Category; label: string }[] = [
  { id: "all", label: "All" },
  { id: "credit", label: "Credit" },
  { id: "debt", label: "Debt" },
  { id: "savings", label: "Savings" },
  { id: "protection", label: "Protection" },
];

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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function priorityClasses(priority: Recommendation["priority"]): {
  badge: string;
  text: string;
} {
  switch (priority) {
    case "high":
      return {
        badge: "bg-red-100 dark:bg-red-900/30",
        text: "text-red-700 dark:text-red-400",
      };
    case "medium":
      return {
        badge: "bg-amber-100 dark:bg-amber-900/30",
        text: "text-amber-700 dark:text-amber-400",
      };
    default:
      return {
        badge: "bg-gray-100 dark:bg-slate-700",
        text: "text-gray-600 dark:text-slate-400",
      };
  }
}

function categoryIconPath(category: Recommendation["category"]): string {
  switch (category) {
    case "credit":
      return "M13 7h8m0 0v8m0-8l-8 8-4-4-6 6";
    case "debt":
      return "M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z";
    case "savings":
      return "M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z";
    case "protection":
      return "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z";
    default:
      return "M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z";
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function RecommendationsPage() {
  const [selectedCategory, setSelectedCategory] = useState<Category>("all");

  const filteredRecs =
    selectedCategory === "all"
      ? RECOMMENDATIONS
      : RECOMMENDATIONS.filter((r) => r.category === selectedCategory);

  const highPriorityRecs = RECOMMENDATIONS.filter(
    (r) => r.priority === "high",
  );
  const totalImpact = highPriorityRecs.reduce((sum, r) => sum + r.impact, 0);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Recommendations
          </h1>
          <p className="mt-2 text-gray-600 dark:text-slate-400">
            AI-powered personalized recommendations to improve your financial
            health.
          </p>
        </div>

        {/* AI Summary Card */}
        <div className="bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800 rounded-xl p-6 mb-8">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-12 h-12 rounded-full bg-violet-100 dark:bg-violet-800/40 flex items-center justify-center">
              <svg
                className="w-6 h-6 text-violet-600 dark:text-violet-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
                />
              </svg>
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                AI Analysis Complete
              </h2>
              <p className="text-sm text-gray-600 dark:text-slate-400 mt-1">
                Based on your credit profile, spending patterns, and financial
                goals, we found {RECOMMENDATIONS.length} personalized
                recommendations.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-8 mt-5 pt-5 border-t border-violet-200 dark:border-violet-700">
            <div className="text-center">
              <p className="text-2xl font-bold text-violet-600 dark:text-violet-400">
                +{totalImpact}
              </p>
              <p className="text-xs text-gray-600 dark:text-slate-400 mt-1">
                Potential Score Impact
              </p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-violet-600 dark:text-violet-400">
                {highPriorityRecs.length}
              </p>
              <p className="text-xs text-gray-600 dark:text-slate-400 mt-1">
                High Priority
              </p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-violet-600 dark:text-violet-400">
                {RECOMMENDATIONS.length}
              </p>
              <p className="text-xs text-gray-600 dark:text-slate-400 mt-1">
                Total Actions
              </p>
            </div>
          </div>
        </div>

        {/* Category Filter Chips */}
        <div className="flex flex-wrap gap-2 mb-6">
          {CATEGORY_CHIPS.map((chip) => (
            <button
              key={chip.id}
              onClick={() => setSelectedCategory(chip.id)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                selectedCategory === chip.id
                  ? "bg-blue-600 text-white"
                  : "bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-300 border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700"
              }`}
            >
              {chip.label}
            </button>
          ))}
        </div>

        {/* Recommendations Count */}
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          {filteredRecs.length} Recommendation
          {filteredRecs.length !== 1 ? "s" : ""}
        </h2>

        {/* Recommendations List */}
        <div className="space-y-4 mb-10">
          {filteredRecs.map((rec) => {
            const pc = priorityClasses(rec.priority);
            return (
              <div
                key={rec.id}
                className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 p-5"
              >
                <div className="flex items-start gap-3">
                  {/* Icon */}
                  <div
                    className={`flex-shrink-0 w-10 h-10 rounded-lg ${pc.badge} flex items-center justify-center`}
                  >
                    <svg
                      className={`w-5 h-5 ${pc.text}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d={categoryIconPath(rec.category)}
                      />
                    </svg>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                        {rec.title}
                      </h3>
                      <span
                        className={`text-xs font-bold uppercase px-2 py-0.5 rounded-full ${pc.badge} ${pc.text}`}
                      >
                        {rec.priority}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-slate-400 mt-1">
                      {rec.description}
                    </p>

                    {/* Footer row */}
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100 dark:border-slate-700">
                      <div className="flex items-center gap-4">
                        {rec.impact > 0 && (
                          <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400 font-medium">
                            <svg
                              className="w-3.5 h-3.5"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                              />
                            </svg>
                            +{rec.impact} pts
                          </span>
                        )}
                        <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-slate-500">
                          <svg
                            className="w-3.5 h-3.5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                          {rec.timeframe}
                        </span>
                      </div>
                      <Link
                        href={rec.route}
                        className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
                      >
                        {rec.action}
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 5l7 7-7 7"
                          />
                        </svg>
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Quick Links Section */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Explore More
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {QUICK_LINKS.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="flex flex-col items-center gap-3 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 p-6 hover:shadow-md transition-shadow"
              >
                <svg
                  className="w-8 h-8 text-blue-600 dark:text-blue-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
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
        </div>
      </div>
    </div>
  );
}
