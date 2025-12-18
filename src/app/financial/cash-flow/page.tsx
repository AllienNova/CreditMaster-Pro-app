import { Suspense } from 'react';
import { Metadata } from 'next';
import CashFlowAnalysis from '@/components/financial/CashFlowAnalysis';

export const metadata: Metadata = {
  title: 'Cash Flow | CPFI',
  description: 'Analyze your cash flow and financial health',
};

function CashFlowLoadingSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white rounded-lg shadow p-6">
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
            <div className="h-8 bg-gray-200 rounded w-3/4"></div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function CashFlowPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Cash Flow Analysis</h1>
          <p className="mt-2 text-gray-600">
            Analyze your cash flow and financial health
          </p>
        </div>

        <Suspense fallback={<CashFlowLoadingSkeleton />}>
          <CashFlowAnalysis />
        </Suspense>
      </div>
    </div>
  );
}

