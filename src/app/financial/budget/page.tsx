import { Suspense } from 'react';
import { Metadata } from 'next';
import BudgetManagement from '@/components/financial/BudgetManagement';

export const metadata: Metadata = {
  title: 'Budget Management | CPFI',
  description:
    'Create and manage your budgets to track spending and achieve financial goals',
  openGraph: {
    title: 'Budget Management | CPFI',
    description:
      'Create and manage your budgets to track spending and achieve financial goals',
    type: 'website',
  },
};

function BudgetLoadingSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="bg-gray-200 dark:bg-gray-700 rounded-lg h-24"
          />
        ))}
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-6" />
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-20 bg-gray-200 dark:bg-gray-700 rounded"
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function BudgetPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Budget Management
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Create and manage budgets to control your spending and achieve your
            financial goals
          </p>
        </div>

        {/* Budget Content */}
        <Suspense fallback={<BudgetLoadingSkeleton />}>
          <BudgetManagement />
        </Suspense>
      </div>
    </div>
  );
}
