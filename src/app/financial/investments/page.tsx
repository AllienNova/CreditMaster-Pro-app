import { Suspense } from "react";
import { Metadata } from "next";
import InvestmentPortfolio from "@/components/financial/InvestmentPortfolio";
import AIInvestmentInsights from "@/components/investments/AIInvestmentInsights";

export const metadata: Metadata = {
  title: "Investments | Fynvita",
  description: "Track your investment portfolio and performance",
};

function InvestmentsLoadingSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="bg-white dark:bg-slate-800 rounded-lg shadow p-6"
          >
            <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-1/2 mb-4"></div>
            <div className="h-8 bg-gray-200 dark:bg-slate-700 rounded w-3/4"></div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function InvestmentsPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Investment Portfolio
          </h1>
          <p className="mt-2 text-gray-600 dark:text-slate-300">
            Track your investment portfolio and performance
          </p>
        </div>

        {/* AI Investment Insights */}
        <AIInvestmentInsights />

        <Suspense fallback={<InvestmentsLoadingSkeleton />}>
          <InvestmentPortfolio />
        </Suspense>
      </div>
    </div>
  );
}
