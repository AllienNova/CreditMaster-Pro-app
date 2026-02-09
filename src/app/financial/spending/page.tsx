import { Suspense } from 'react';
import { Metadata } from 'next';
import SpendingAnalysis from '@/components/financial/SpendingAnalysis';

export const metadata: Metadata = {
  title: 'Spending Analysis | Fynvita',
  description:
    'Analyze your spending patterns, track cash flow, and get personalized insights',
  openGraph: {
    title: 'Spending Analysis | Fynvita',
    description:
      'Analyze your spending patterns, track cash flow, and get personalized insights',
    type: 'website',
  },
};

function SpendingLoadingSkeleton() {
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
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6 h-80" />
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6 h-80" />
      </div>
    </div>
  );
}

export default function SpendingPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Spending Analysis
          </h1>
          <p className="mt-2 text-gray-600 dark:text-slate-400">
            Analyze your spending patterns, track cash flow, and get
            personalized insights
          </p>
        </div>
        <Suspense fallback={<SpendingLoadingSkeleton />}>
          <SpendingAnalysis />
        </Suspense>
      </div>
    </div>
  );
}
