'use client';

interface LoadingSkeletonProps {
  variant?: 'text' | 'card' | 'avatar' | 'button' | 'table' | 'dashboard';
  count?: number;
  className?: string;
}

export default function LoadingSkeleton({
  variant = 'text',
  count = 1,
  className = '',
}: LoadingSkeletonProps) {
  const renderSkeleton = () => {
    switch (variant) {
      case 'text':
        return (
          <div className={`animate-pulse space-y-3 ${className}`}>
            {Array.from({ length: count }).map((_, i) => (
              <div key={i} className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-full" />
            ))}
          </div>
        );

      case 'card':
        return (
          <div className={`animate-pulse ${className}`}>
            {Array.from({ length: count }).map((_, i) => (
              <div key={i} className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-6 mb-4">
                <div className="h-6 bg-gray-200 dark:bg-slate-700 rounded w-3/4 mb-4" />
                <div className="space-y-3">
                  <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-full" />
                  <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-5/6" />
                  <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-4/6" />
                </div>
              </div>
            ))}
          </div>
        );

      case 'avatar':
        return (
          <div className={`animate-pulse flex items-center space-x-4 ${className}`}>
            <div className="rounded-full bg-gray-200 dark:bg-slate-700 h-12 w-12" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-3/4" />
              <div className="h-3 bg-gray-200 dark:bg-slate-700 rounded w-1/2" />
            </div>
          </div>
        );

      case 'button':
        return (
          <div className={`animate-pulse ${className}`}>
            {Array.from({ length: count }).map((_, i) => (
              <div key={i} className="h-10 bg-gray-200 dark:bg-slate-700 rounded-lg w-32 mr-2 inline-block" />
            ))}
          </div>
        );

      case 'table':
        return (
          <div className={`animate-pulse ${className}`}>
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow overflow-hidden">
              {/* Table header */}
              <div className="bg-gray-50 dark:bg-slate-900 px-6 py-3 border-b border-gray-200 dark:border-slate-700">
                <div className="flex space-x-4">
                  <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-1/4" />
                  <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-1/4" />
                  <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-1/4" />
                  <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-1/4" />
                </div>
              </div>
              {/* Table rows */}
              {Array.from({ length: count }).map((_, i) => (
                <div key={i} className="px-6 py-4 border-b border-gray-200 dark:border-slate-700">
                  <div className="flex space-x-4">
                    <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-1/4" />
                    <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-1/4" />
                    <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-1/4" />
                    <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-1/4" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case 'dashboard':
        return (
          <div className={`animate-pulse space-y-6 ${className}`}>
            {/* Header */}
            <div className="space-y-3">
              <div className="h-8 bg-gray-200 dark:bg-slate-700 rounded w-1/3" />
              <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-1/2" />
            </div>

            {/* Metrics cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-6">
                  <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-1/2 mb-4" />
                  <div className="h-8 bg-gray-200 dark:bg-slate-700 rounded w-3/4 mb-2" />
                  <div className="h-3 bg-gray-200 dark:bg-slate-700 rounded w-1/2" />
                </div>
              ))}
            </div>

            {/* Content area */}
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-6">
              <div className="h-6 bg-gray-200 dark:bg-slate-700 rounded w-1/4 mb-4" />
              <div className="space-y-3">
                <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-full" />
                <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-5/6" />
                <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-4/6" />
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return renderSkeleton();
}

// Pulse animation for inline loading
export function PulseLoader({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
  };

  return (
    <div className="flex items-center justify-center space-x-2">
      <div
        className={`${sizeClasses[size]} bg-blue-500 rounded-full animate-pulse`}
        style={{ animationDelay: '0ms' }}
      />
      <div
        className={`${sizeClasses[size]} bg-blue-500 rounded-full animate-pulse`}
        style={{ animationDelay: '150ms' }}
      />
      <div
        className={`${sizeClasses[size]} bg-blue-500 rounded-full animate-pulse`}
        style={{ animationDelay: '300ms' }}
      />
    </div>
  );
}

// Spinner for loading states
export function Spinner({ size = 'md', label }: { size?: 'sm' | 'md' | 'lg'; label?: string }) {
  const sizeClasses = {
    sm: 'h-6 w-6 border-2',
    md: 'h-12 w-12 border-4',
    lg: 'h-16 w-16 border-4',
  };

  return (
    <div className="flex flex-col items-center justify-center space-y-3">
      <div
        className={`${sizeClasses[size]} border-blue-600 border-t-transparent rounded-full animate-spin`}
      />
      {label && <p className="text-sm text-gray-600 dark:text-slate-300">{label}</p>}
    </div>
  );
}

