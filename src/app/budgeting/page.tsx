import Link from "next/link";
import type { Metadata } from "next";
import {
  Calendar,
  CreditCard,
  Wallet,
  PiggyBank,
  ArrowRight,
  Sparkles,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Smart Budgeting - Fynvita",
  description:
    "AI-powered budgeting tools to track bills, manage subscriptions, create zero-based budgets, and automate savings.",
};

const FEATURE_CARDS = [
  {
    title: "Bill Tracker",
    description: "Track and manage all your bills",
    href: "/budgeting/bills",
    Icon: Calendar,
    iconColor: "text-green-600 dark:text-green-400",
    iconBg: "bg-green-100 dark:bg-green-900",
  },
  {
    title: "Subscription Manager",
    description: "Find and cancel unwanted subscriptions",
    href: "/budgeting/subscriptions",
    Icon: CreditCard,
    iconColor: "text-blue-600 dark:text-blue-400",
    iconBg: "bg-blue-100 dark:bg-blue-900",
  },
  {
    title: "Zero-Based Budget",
    description: "Give every dollar a purpose",
    href: "/budgeting/zero-based",
    Icon: Wallet,
    iconColor: "text-purple-600 dark:text-purple-400",
    iconBg: "bg-purple-100 dark:bg-purple-900",
  },
  {
    title: "Auto-Save Rules",
    description: "Automate your savings",
    href: "/budgeting/auto-save",
    Icon: PiggyBank,
    iconColor: "text-emerald-600 dark:text-emerald-400",
    iconBg: "bg-emerald-100 dark:bg-emerald-900",
  },
];

export default function BudgetingHubPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <Sparkles className="w-7 h-7 text-blue-600 dark:text-blue-400" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Smart Budgeting
            </h1>
          </div>
          <p className="text-lg text-gray-600 dark:text-slate-400">
            AI-powered tools to master your money
          </p>
        </div>

        {/* Feature Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {FEATURE_CARDS.map((card) => (
            <Link
              key={card.href}
              href={card.href}
              className="group bg-white dark:bg-slate-800 rounded-xl shadow-sm p-6 hover:shadow-md transition-all border border-gray-100 dark:border-slate-700 hover:border-blue-200 dark:hover:border-blue-800"
            >
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-lg ${card.iconBg}`}>
                  <card.Icon className={`w-6 h-6 ${card.iconColor}`} />
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-1">
                    {card.title}
                  </h2>
                  <p className="text-gray-600 dark:text-slate-400 mb-4">
                    {card.description}
                  </p>
                  <span className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 dark:text-blue-400 group-hover:gap-2 transition-all">
                    Get Started
                    <ArrowRight className="w-4 h-4" />
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
