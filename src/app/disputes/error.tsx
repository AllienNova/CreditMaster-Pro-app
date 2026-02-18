"use client";

import { useEffect } from "react";

export default function DisputesError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Disputes error:", error);
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
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Unable to load disputes
          </h2>
          <p className="text-gray-600 dark:text-slate-400 mb-6">
            We couldn&apos;t load your dispute information. Please try again.
          </p>
          <div className="flex justify-center gap-4">
            <button
              onClick={() => (window.location.href = "/dashboard")}
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
