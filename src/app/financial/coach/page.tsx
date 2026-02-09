import { Suspense } from 'react';
import { Metadata } from 'next';
import AIFinancialCoach from '@/components/financial/AIFinancialCoach';

export const metadata: Metadata = {
  title: 'AI Financial Coach | Fynvita',
  description:
    "Get personalized financial coaching powered by AI using Dave Ramsey's proven strategies",
  openGraph: {
    title: 'AI Financial Coach | Fynvita',
    description:
      "Get personalized financial coaching powered by AI using Dave Ramsey's proven strategies",
    type: 'website',
  },
};

function CoachLoadingSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Welcome Section */}
      <div className="bg-gray-200 dark:bg-slate-700 rounded-lg h-32" />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="bg-gray-200 dark:bg-slate-700 rounded-lg h-24"
          />
        ))}
      </div>

      {/* Baby Steps */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
        <div className="h-6 bg-gray-200 dark:bg-slate-700 rounded w-1/4 mb-6" />
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-20 bg-gray-200 dark:bg-slate-700 rounded"
            />
          ))}
        </div>
      </div>

      {/* Action Plans */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
        <div className="h-6 bg-gray-200 dark:bg-slate-700 rounded w-1/4 mb-6" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-32 bg-gray-200 dark:bg-slate-700 rounded"
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function AIFinancialCoachPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            AI Financial Coach
          </h1>
          <p className="mt-2 text-gray-600 dark:text-slate-400">
            Your personal AI-powered financial coach using Dave Ramsey's proven
            Baby Steps methodology
          </p>
        </div>

        {/* Coach Content */}
        <Suspense fallback={<CoachLoadingSkeleton />}>
          <AIFinancialCoach />
        </Suspense>
      </div>
    </div>
  );
}
