import { Suspense } from 'react';
import { Metadata } from 'next';
import Link from 'next/link';
import BillsSubscriptions from '@/components/financial/BillsSubscriptions';

export const metadata: Metadata = {
  title: 'Bills & Subscriptions | CPFI',
  description:
    'Manage your recurring bills, subscriptions, and detect new bills automatically',
  openGraph: {
    title: 'Bills & Subscriptions | CPFI',
    description:
      'Manage your recurring bills, subscriptions, and detect new bills automatically',
    type: 'website',
  },
};

function BillsLoadingSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="bg-white dark:bg-gray-800 rounded-lg shadow p-6"
          >
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-4" />
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
          </div>
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

export default function BillsPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Bills & Subscriptions
            </h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              Manage your recurring bills, subscriptions, and detect new bills
              automatically
            </p>
          </div>
          <Link
            href="/financial/bills/negotiate"
            className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg font-medium hover:from-green-600 hover:to-emerald-700 transition-all shadow-md"
          >
            <span>💰</span>
            <span>Negotiate Bills</span>
          </Link>
        </div>
        <Suspense fallback={<BillsLoadingSkeleton />}>
          <BillsSubscriptions />
        </Suspense>
      </div>
    </div>
  );
}
