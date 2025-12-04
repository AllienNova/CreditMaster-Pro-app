import { Suspense } from 'react';
import { Metadata } from 'next';
import SpendingAnalysis from '@/components/financial/SpendingAnalysis';

export const metadata: Metadata = {
  title: 'Spending Analysis | CreditMaster Pro',
  description: 'Analyze your spending patterns and get insights',
};

function SpendingLoadingSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white rounded-lg shadow p-6">
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
            <div className="h-8 bg-gray-200 rounded w-3/4"></div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-6"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-6"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    </div>
  );
}

export default function SpendingPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Spending Analysis</h1>
          <p className="mt-2 text-gray-600">
            Analyze your spending patterns and get personalized insights
          </p>
        </div>

        {/* Spending Content */}
        <Suspense fallback={<SpendingLoadingSkeleton />}>
          <SpendingAnalysis />
        </Suspense>
      </div>
    </div>
  );
}

