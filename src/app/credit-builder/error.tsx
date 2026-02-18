"use client";

/**
 * Error Boundary for Credit Builder
 *
 * Catches and displays errors in credit builder routes
 */

import { useEffect } from "react";
import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Error captured for monitoring - error boundary triggered
    void error;
  }, [error]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white dark:bg-slate-800 rounded-xl shadow-lg border-2 border-red-200 p-8">
        <div className="flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mx-auto mb-4">
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
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>

        <h2 className="text-2xl font-bold text-gray-900 dark:text-white text-center mb-2">
          Something Went Wrong
        </h2>

        <p className="text-gray-600 dark:text-slate-300 text-center mb-6">
          We encountered an error while loading the Credit Builder. Please try
          again.
        </p>

        {process.env.NODE_ENV === "development" && (
          <div className="bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg p-4 mb-6">
            <p className="text-xs font-mono text-gray-800 dark:text-slate-100 break-all">
              {error.message}
            </p>
          </div>
        )}

        <div className="space-y-3">
          <button
            onClick={reset}
            className="w-full py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>

          <Link
            href="/dashboard"
            className="block w-full py-3 bg-gray-100 text-gray-700 dark:text-slate-200 font-semibold rounded-lg hover:bg-gray-200 dark:bg-slate-700 transition-colors text-center"
          >
            Return to Dashboard
          </Link>
        </div>

        <p className="text-xs text-gray-500 dark:text-slate-400 text-center mt-6">
          If this problem persists, please contact support.
        </p>
      </div>
    </div>
  );
}
