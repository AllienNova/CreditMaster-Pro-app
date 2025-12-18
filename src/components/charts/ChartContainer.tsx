'use client';

/**
 * Chart Container Component
 * 
 * Provides consistent styling and responsive behavior for all charts.
 * Includes title, subtitle, loading state, and error handling.
 */

import { ReactNode } from 'react';
import { ResponsiveContainer } from 'recharts';

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
}

export default function ChartContainer({
  title,
  subtitle,
  children,
  height = 300,
  loading = false,
  error = null,
  className = '',
  actions,
  footer,
}: ChartContainerProps) {
  if (loading) {
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-lg shadow p-6 ${className}`}>
        {title && (
          <div className="mb-4">
            <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3 animate-pulse" />
            {subtitle && (
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mt-2 animate-pulse" />
            )}
          </div>
        )}
        <div 
          className="bg-gray-100 dark:bg-gray-700 rounded animate-pulse"
          style={{ height: typeof height === 'number' ? `${height}px` : height }}
        />
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-lg shadow p-6 ${className}`}>
        {title && (
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
          </div>
        )}
        <div 
          className="flex items-center justify-center bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800"
          style={{ height: typeof height === 'number' ? `${height}px` : height }}
        >
          <div className="text-center">
            <svg className="w-12 h-12 text-red-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow p-6 ${className}`}>
      {(title || actions) && (
        <div className="flex items-start justify-between mb-4">
          <div>
            {title && (
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
            )}
            {subtitle && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{subtitle}</p>
            )}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}
      
      <div style={{ height: typeof height === 'number' ? `${height}px` : height }}>
        <ResponsiveContainer width="100%" height="100%">
          {children as React.ReactElement}
        </ResponsiveContainer>
      </div>

      {footer && (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          {footer}
        </div>
      )}
    </div>
  );
}

