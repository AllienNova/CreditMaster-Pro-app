'use client';

import { useEffect } from 'react';

export default function InvestmentsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Investments error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-sm p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
            <svg
              className="w-8 h-8 text-red-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
              />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Unable to load investments
          </h2>
          <p className="text-gray-600 dark:text-slate-400 mb-6">
            We couldn&apos;t load your investment portfolio. This might be a
            temporary issue.
          </p>
          <div className="flex justify-center gap-4">
            <button
              onClick={() => (window.location.href = '/dashboard')}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-slate-300 bg-gray-100 rounded-lg hover:bg-gray-200 dark:bg-slate-700 dark:hover:bg-slate-600"
            >
              Go to Dashboard
            </button>
            <button
              onClick={reset}
              className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700"
            >
              Try again
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
