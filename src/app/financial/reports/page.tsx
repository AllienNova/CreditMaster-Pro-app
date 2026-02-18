import { Suspense } from "react";
import { Metadata } from "next";
import FinancialReports from "@/components/financial/FinancialReports";

export const metadata: Metadata = {
  title: "Financial Reports | Fynvita",
  description: "Generate and export financial reports",
};

function ReportsLoadingSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
        <div className="h-6 bg-gray-200 dark:bg-slate-700 rounded w-1/4 mb-6"></div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-20 bg-gray-200 dark:bg-slate-700 rounded"
            ></div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function ReportsPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Financial Reports
          </h1>
          <p className="mt-2 text-gray-600 dark:text-slate-300">
            Generate and export comprehensive financial reports
          </p>
        </div>

        <Suspense fallback={<ReportsLoadingSkeleton />}>
          <FinancialReports />
        </Suspense>
      </div>
    </div>
  );
}
