import { Suspense } from 'react';
import { Metadata } from 'next';
import ActionPlanManager from '@/components/financial/ActionPlanManager';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Action Plan | Fynvita',
  description: 'Track and manage your personalized financial action plans',
  openGraph: {
    title: 'Action Plan | Fynvita',
    description: 'Track and manage your personalized financial action plans',
    type: 'website',
  },
};

function ActionPlanLoadingSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex space-x-2">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="bg-gray-200 dark:bg-slate-700 rounded-lg h-10 w-32"
          />
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="bg-gray-200 dark:bg-slate-700 rounded-lg h-64"
          />
        ))}
      </div>
    </div>
  );
}

export default function ActionPlanPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header with Breadcrumb */}
        <div className="mb-8">
          <nav className="flex mb-4" aria-label="Breadcrumb">
            <ol className="inline-flex items-center space-x-1 md:space-x-3">
              <li className="inline-flex items-center">
                <Link
                  href="/financial/coach"
                  className="inline-flex items-center text-sm font-medium text-gray-700 hover:text-blue-600 dark:text-slate-400 dark:hover:text-white"
                >
                  <svg
                    className="w-4 h-4 mr-2"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
                  </svg>
                  AI Coach
                </Link>
              </li>
              <li>
                <div className="flex items-center">
                  <svg
                    className="w-6 h-6 text-gray-400 dark:text-slate-500"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="ml-1 text-sm font-medium text-gray-500 md:ml-2 dark:text-slate-400">
                    Action Plan
                  </span>
                </div>
              </li>
            </ol>
          </nav>

          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Your Action Plan
          </h1>
          <p className="mt-2 text-gray-600 dark:text-slate-400">
            Track and complete your personalized financial action plans to
            achieve your goals
          </p>
        </div>

        {/* Action Plan Content */}
        <Suspense fallback={<ActionPlanLoadingSkeleton />}>
          <ActionPlanManager />
        </Suspense>
      </div>
    </div>
  );
}
