"use client";

/**
 * Chart Container Component
 *
 * Provides consistent styling and responsive behavior for all charts.
 * Includes title, subtitle, loading state, and error handling.
 */

import { ReactNode } from "react";
import { ResponsiveContainer } from "recharts";

export interface ChartContainerProps {
  title?: string;
  subtitle?: string;
  children: ReactNode;
  height?: number | string;
  loading?: boolean;
  error?: string | null;
  className?: string;
  actions?: ReactNode;
  footer?: ReactNode;
  /** Accessible description of the chart for screen readers */
  ariaLabel?: string;
  /** Detailed description for screen readers (use for complex charts) */
  ariaDescription?: string;
}

export default function ChartContainer({
  title,
  subtitle,
  children,
  height = 300,
  loading = false,
  error = null,
  className = "",
  actions,
  footer,
  ariaLabel,
  ariaDescription,
}: ChartContainerProps) {
  // Generate unique ID for accessibility
  const chartId = title
    ? `chart-${title.toLowerCase().replace(/\s+/g, "-")}`
    : "chart";
  if (loading) {
    return (
      <div
        className={`bg-white dark:bg-slate-800 rounded-lg shadow p-4 sm:p-6 ${className}`}
        role="status"
        aria-label={`Loading ${title || "chart"}`}
        aria-busy="true"
      >
        {title && (
          <div className="mb-4">
            <div className="h-5 sm:h-6 bg-gray-200 dark:bg-slate-700 rounded w-1/3 animate-pulse" />
            {subtitle && (
              <div className="h-3 sm:h-4 bg-gray-200 dark:bg-slate-700 rounded w-1/2 mt-2 animate-pulse" />
            )}
          </div>
        )}
        <div
          className="bg-gray-100 dark:bg-slate-700 rounded animate-pulse flex items-center justify-center"
          style={{
            height: typeof height === "number" ? `${height}px` : height,
          }}
        >
          <span className="sr-only">Loading chart data...</span>
          <svg
            className="w-8 h-8 text-gray-300 dark:text-slate-600 animate-spin"
            fill="none"
            viewBox="0 0 24 24"
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
      </div>
    );
  }

  if (error) {
    return (
      <div
        className={`bg-white dark:bg-slate-800 rounded-lg shadow p-4 sm:p-6 ${className}`}
        role="alert"
        aria-live="assertive"
      >
        {title && (
          <div className="mb-4">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
              {title}
            </h3>
          </div>
        )}
        <div
          className="flex items-center justify-center bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800"
          style={{
            height: typeof height === "number" ? `${height}px` : height,
          }}
        >
          <div className="text-center px-4">
            <svg
              className="w-10 h-10 sm:w-12 sm:h-12 text-red-400 mx-auto mb-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p className="text-red-600 dark:text-red-400 text-sm sm:text-base font-medium">
              {error}
            </p>
            <p className="text-red-500 dark:text-red-500 text-xs sm:text-sm mt-1">
              Please try refreshing the page
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`bg-white dark:bg-slate-800 rounded-lg shadow p-4 sm:p-6 ${className}`}
      role="figure"
      aria-labelledby={title ? `${chartId}-title` : undefined}
      aria-describedby={ariaDescription ? `${chartId}-desc` : undefined}
    >
      {(title || actions) && (
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-4 mb-4">
          <div>
            {title && (
              <h3
                id={`${chartId}-title`}
                className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white"
              >
                {title}
              </h3>
            )}
            {subtitle && (
              <p className="text-xs sm:text-sm text-gray-600 dark:text-slate-400 mt-1">
                {subtitle}
              </p>
            )}
          </div>
          {actions && (
            <div className="flex items-center gap-2 flex-shrink-0">
              {actions}
            </div>
          )}
        </div>
      )}

      {ariaDescription && (
        <p id={`${chartId}-desc`} className="sr-only">
          {ariaDescription}
        </p>
      )}

      {ariaLabel && !ariaDescription && <p className="sr-only">{ariaLabel}</p>}

      <div
        style={{ height: typeof height === "number" ? `${height}px` : height }}
        aria-label={ariaLabel || `${title || "Chart"} visualization`}
      >
        <ResponsiveContainer width="100%" height="100%">
          {children as React.ReactElement}
        </ResponsiveContainer>
      </div>

      {footer && (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-slate-700 text-sm">
          {footer}
        </div>
      )}
    </div>
  );
}
