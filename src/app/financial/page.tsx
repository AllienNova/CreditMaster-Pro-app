import { Suspense } from "react";
import { Metadata } from "next";
import FinancialDashboard from "@/components/financial/FinancialDashboard";

export const metadata: Metadata = {
  title: "Financial Dashboard | Fynvita",
  description:
    "Track your finances, manage budgets, and achieve your financial goals",
};

function DashboardLoadingSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="bg-white dark:bg-slate-800 rounded-lg shadow p-6"
          >
            <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-1/2 mb-4"></div>
            <div className="h-8 bg-gray-200 dark:bg-slate-700 rounded w-3/4 mb-2"></div>
            <div className="h-3 bg-gray-200 dark:bg-slate-700 rounded w-1/3"></div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
          <div className="h-6 bg-gray-200 dark:bg-slate-700 rounded w-1/3 mb-4"></div>
          <div className="h-64 bg-gray-200 dark:bg-slate-700 rounded"></div>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
          <div className="h-6 bg-gray-200 dark:bg-slate-700 rounded w-1/3 mb-4"></div>
          <div className="h-64 bg-gray-200 dark:bg-slate-700 rounded"></div>
        </div>
      </div>
    </div>
  );
}

export default function FinancialPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Financial Dashboard
          </h1>
          <p className="mt-2 text-gray-600 dark:text-slate-300">
            Track your finances, manage budgets, and achieve your financial
            goals
          </p>
        </div>

        {/* Dashboard Content */}
        <Suspense fallback={<DashboardLoadingSkeleton />}>
          <FinancialDashboard />
        </Suspense>
      </div>
    </div>
  );
}
