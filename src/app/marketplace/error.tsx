'use client';

/**
 * Marketplace Error State
 * 
 * Error boundary UI for marketplace pages.
 */

import { useEffect } from 'react';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function MarketplaceError({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Marketplace error:', error);
  }, [error]);

  return (
    <div className="min-h-[400px] flex items-center justify-center">
      <div className="text-center max-w-md">
        <div className="text-6xl mb-4"></div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Something went wrong
        </h2>
        <p className="text-gray-600 dark:text-slate-300 mb-6">
          We encountered an error loading this marketplace page. Please try again.
        </p>
        <div className="flex gap-4 justify-center">
          <button
            type="button"
            onClick={reset}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Try again
          </button>
          <a
            href="/marketplace"
            className="px-6 py-2 bg-gray-100 text-gray-700 dark:text-slate-200 rounded-lg hover:bg-gray-200 dark:bg-slate-700 transition-colors"
          >
            Back to Marketplace
          </a>
        </div>
        {error.digest && (
          <p className="mt-4 text-xs text-gray-400 dark:text-slate-500">
            Error ID: {error.digest}
          </p>
        )}
      </div>
    </div>
  );
}

