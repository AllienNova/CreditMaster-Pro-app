import { Suspense } from "react";
import { Metadata } from "next";
import PortfolioOverview from "@/components/investments/PortfolioOverview";
import { FadeIn, ScrollReveal } from "@/components/ui/animations";

export const metadata: Metadata = {
  title: "Investment Portfolio | Fynvita",
  description:
    "Track your investment portfolio, analyze stocks, and monitor performance",
  openGraph: {
    title: "Investment Portfolio | Fynvita",
    description:
      "Track your investment portfolio, analyze stocks, and monitor performance",
    type: "website",
  },
};

function PortfolioLoadingSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="bg-white dark:bg-slate-800 rounded-lg shadow p-6"
          >
            <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-1/2 mb-4" />
            <div className="h-8 bg-gray-200 dark:bg-slate-700 rounded w-3/4" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6 h-[400px]" />
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6 h-[400px]" />
      </div>
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6 h-[300px]" />
    </div>
  );
}

export default function InvestmentsPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <FadeIn direction="up">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Investment Portfolio
            </h1>
            <p className="mt-2 text-gray-600 dark:text-slate-400">
              Track your investment portfolio, analyze stocks, and monitor
              performance
            </p>
          </div>
        </FadeIn>
        <ScrollReveal>
          <Suspense fallback={<PortfolioLoadingSkeleton />}>
            <PortfolioOverview />
          </Suspense>
        </ScrollReveal>
      </div>
    </div>
  );
}
