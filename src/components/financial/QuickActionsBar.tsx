"use client";

/**
 * Quick Actions Bar Component
 *
 * Provides quick navigation to all financial tools and features.
 */

import Link from "next/link";
import { Icon } from "@/components/ui/Icon";

interface QuickAction {
  label: string;
  href: string;
  icon: string;
  description: string;
  color: string;
}

const quickActions: QuickAction[] = [
  {
    label: "Smart Budget",
    href: "/financial/smart-budget",
    icon: "calculator",
    description: "AI-powered budget recommendations",
    color: "from-blue-500 to-blue-600",
  },
  {
    label: "Financial Goals",
    href: "/financial/goals",
    icon: "calculator",
    description: "Track and achieve your goals",
    color: "from-green-500 to-emerald-600",
  },
  {
    label: "Spending Analysis",
    href: "/financial/spending",
    icon: "target",
    description: "Analyze spending patterns",
    color: "from-blue-500 to-emerald-600",
  },
  {
    label: "Bills & Negotiation",
    href: "/financial/bills",
    icon: "sparkles",
    description: "Manage and negotiate bills",
    color: "from-orange-500 to-red-600",
  },
  {
    label: "Savings Optimizer",
    href: "/financial/savings",
    icon: "banknotes",
    description: "Find savings opportunities",
    color: "from-teal-500 to-blue-600",
  },
  {
    label: "Health Score",
    href: "/financial/health",
    icon: "wallet",
    description: "View financial health details",
    color: "from-red-500 to-emerald-600",
  },
];

export default function QuickActionsBar() {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Quick Actions
      </h3>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {quickActions.map((action) => (
          <Link
            key={action.href}
            href={action.href}
            className="group relative overflow-hidden rounded-lg p-4 bg-gradient-to-br hover:shadow-md transition-all duration-200 hover:scale-105"
            style={{
              backgroundImage: `linear-gradient(to bottom right, var(--tw-gradient-stops))`,
            }}
          >
            <div
              className={`absolute inset-0 bg-gradient-to-br ${action.color} opacity-10 group-hover:opacity-20 transition-opacity`}
            ></div>

            <div className="relative z-10 text-center">
              <div className="text-3xl mb-2">{action.icon}</div>
              <div className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
                {action.label}
              </div>
              <div className="text-xs text-gray-600 dark:text-slate-300 hidden md:block">
                {action.description}
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Additional Actions */}
      <div className="mt-6 pt-4 border-t border-gray-200 dark:border-slate-700 flex flex-wrap gap-3">
        <Link
          href="/financial/transactions"
          className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-slate-700 rounded-lg text-sm font-medium text-gray-700 dark:text-slate-200 transition-colors"
        >
          <span></span>
          <span>Transactions</span>
        </Link>
        <Link
          href="/financial/reports"
          className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-slate-700 rounded-lg text-sm font-medium text-gray-700 dark:text-slate-200 transition-colors"
        >
          <span></span>
          <span>Reports</span>
        </Link>
        <Link
          href="/financial/settings"
          className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-slate-700 rounded-lg text-sm font-medium text-gray-700 dark:text-slate-200 transition-colors"
        >
          <span></span>
          <span>Settings</span>
        </Link>
      </div>
    </div>
  );
}
