import { Suspense } from 'react';
import { Metadata } from 'next';
import Link from 'next/link';
import HoldingsManagement from '@/components/investments/HoldingsManagement';

export const metadata: Metadata = {
  title: 'Holdings Management | Fynvita',
  description:
    'Manage your investment holdings - add, edit, delete positions and track performance',
  openGraph: {
    title: 'Holdings Management | Fynvita',
    description:
      'Manage your investment holdings - add, edit, delete positions and track performance',
    type: 'website',
  },
};

function HoldingsLoadingSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="bg-white dark:bg-slate-800 rounded-lg shadow p-4 h-20"
          />
        ))}
      </div>
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6 h-[400px]" />
    </div>
  );
}

export default function HoldingsPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <nav className="mb-4 flex items-center text-sm text-gray-500 dark:text-slate-400">
          <Link
            href="/investments"
            className="hover:text-blue-600 dark:hover:text-blue-400"
          >
            Portfolio
          </Link>
          <span className="mx-2">/</span>
          <span className="text-gray-900 dark:text-white">Holdings</span>
        </nav>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Holdings Management
          </h1>
          <p className="mt-2 text-gray-600 dark:text-slate-400">
            Add, edit, and manage your investment positions. Track performance
            and export data.
          </p>
        </div>

        <Suspense fallback={<HoldingsLoadingSkeleton />}>
          <HoldingsManagement />
        </Suspense>
      </div>
    </div>
  );
}
