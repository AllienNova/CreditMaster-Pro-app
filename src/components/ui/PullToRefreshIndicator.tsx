/**
 * PullToRefreshIndicator Component
 * 
 * Visual indicator for pull-to-refresh functionality.
 * Shows loading spinner and pull progress.
 */

import React from 'react';

interface PullToRefreshIndicatorProps {
  isPulling: boolean;
  isRefreshing: boolean;
  pullDistance: number;
  threshold: number;
}

export function PullToRefreshIndicator({
  isPulling,
  isRefreshing,
  pullDistance,
  threshold,
}: PullToRefreshIndicatorProps) {
  const progress = Math.min((pullDistance / threshold) * 100, 100);
  const shouldTrigger = pullDistance >= threshold;

  if (!isPulling && !isRefreshing) {
    return null;
  }

  return (
    <div
      className="absolute top-0 left-0 right-0 flex items-center justify-center transition-all duration-200 ease-out"
      style={{
        height: `${pullDistance}px`,
        opacity: isPulling || isRefreshing ? 1 : 0,
      }}
      role="status"
      aria-live="polite"
      aria-label={isRefreshing ? 'Refreshing content' : 'Pull to refresh'}
    >
      <div className="flex flex-col items-center gap-2">
        {/* Spinner or Arrow Icon */}
        {isRefreshing ? (
          <div className="relative w-8 h-8">
            <svg
              className="animate-spin text-blue-500"
              fill="none"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          </div>
        ) : (
          <div className="relative w-8 h-8">
            {/* Circular Progress */}
            <svg
              className="transform -rotate-90"
              width="32"
              height="32"
              viewBox="0 0 32 32"
              aria-hidden="true"
            >
              <circle
                cx="16"
                cy="16"
                r="14"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="text-gray-600 dark:text-slate-300"
              />
              <circle
                cx="16"
                cy="16"
                r="14"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeDasharray={`${2 * Math.PI * 14}`}
                strokeDashoffset={`${2 * Math.PI * 14 * (1 - progress / 100)}`}
                className={`transition-all duration-200 ${
                  shouldTrigger ? 'text-blue-500' : 'text-gray-400 dark:text-slate-500'
                }`}
              />
            </svg>
            {/* Arrow Icon */}
            <svg
              className={`absolute inset-0 m-auto w-4 h-4 transition-transform duration-200 ${
                shouldTrigger ? 'rotate-180 text-blue-500' : 'text-gray-400 dark:text-slate-500'
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 14l-7 7m0 0l-7-7m7 7V3"
              />
            </svg>
          </div>
        )}

        {/* Status Text */}
        <span className="text-xs text-gray-400 dark:text-slate-500 font-medium">
          {isRefreshing
            ? 'Refreshing...'
            : shouldTrigger
            ? 'Release to refresh'
            : 'Pull to refresh'}
        </span>
      </div>
    </div>
  );
}

