/**
 * OfflineQueueStatus Component
 * 
 * Displays offline queue status and allows manual sync
 */

'use client';

import { useOfflineQueue } from '@/hooks/useOfflineQueue';
import { useOnline } from '@/hooks/useOnline';

export interface OfflineQueueStatusProps {
  /** Show detailed queue information */
  showDetails?: boolean;
  /** Custom className */
  className?: string;
  /** Variant style */
  variant?: 'compact' | 'detailed';
}

export function OfflineQueueStatus({
  showDetails = false,
  className = '',
  variant = 'compact',
}: OfflineQueueStatusProps) {
  const { queue, pendingCount, isProcessing, processQueue, clearCompleted } = useOfflineQueue();
  const { isOnline } = useOnline();

  // Don't show if no pending actions
  if (pendingCount === 0 && !showDetails) {
    return null;
  }

  if (variant === 'compact') {
    return (
      <div
        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors duration-200 ${ isProcessing ? 'bg-blue-100 text-blue-700' : pendingCount > 0 ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-400' } ${className}`}
        role="status"
        aria-live="polite"
      >
        {isProcessing ? (
          <>
            <svg
              className="w-4 h-4 animate-spin"
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
            <span>Syncing {pendingCount} action{pendingCount !== 1 ? 's' : ''}...</span>
          </>
        ) : (
          <>
            <span
              className="w-2 h-2 rounded-full bg-orange-600 dark:bg-orange-400"
              aria-hidden="true"
            />
            <span>{pendingCount} pending action{pendingCount !== 1 ? 's' : ''}</span>
            {isOnline && (
              <button
                onClick={processQueue}
                className="ml-1 text-xs underline hover:no-underline focus:outline-none focus:ring-2 focus:ring-orange-500 rounded"
                aria-label="Sync pending actions now"
              >
                Sync now
              </button>
            )}
          </>
        )}
      </div>
    );
  }

  // Detailed variant
  return (
    <div
      className={`bg-white dark:bg-slate-800 rounded-lg border-2 border-gray-200 dark:border-slate-700 p-4 transition-colors duration-200 ${className}`}
      role="region"
      aria-label="Offline queue status"
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Offline Queue
        </h3>
        {queue.length > 0 && (
          <button
            onClick={clearCompleted}
            className="text-sm text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white underline hover:no-underline focus:outline-none focus:ring-2 focus:ring-blue-500 rounded px-2 py-1"
            aria-label="Clear completed actions"
          >
            Clear completed
          </button>
        )}
      </div>

      {queue.length === 0 ? (
        <p className="text-sm text-gray-600 dark:text-slate-400">
          No queued actions
        </p>
      ) : (
        <>
          <div className="space-y-2 mb-3">
            {queue.slice(0, 5).map((action) => (
              <div
                key={action.id}
                className="flex items-center justify-between p-2 bg-gray-50 dark:bg-slate-750 rounded"
              >
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {action.type.charAt(0).toUpperCase() + action.type.slice(1)}
                  </p>
                  <p className="text-xs text-gray-600 dark:text-slate-400">
                    {action.method} {action.endpoint}
                  </p>
                </div>
                <span
                  className={`text-xs px-2 py-1 rounded ${ action.status === 'completed' ? 'bg-green-100 text-green-700' : action.status === 'failed' ? 'bg-red-100 text-red-700' : action.status === 'processing' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300' }`}
                >
                  {action.status}
                </span>
              </div>
            ))}
            {queue.length > 5 && (
              <p className="text-xs text-gray-600 dark:text-slate-400 text-center">
                +{queue.length - 5} more action{queue.length - 5 !== 1 ? 's' : ''}
              </p>
            )}
          </div>

          {isOnline && pendingCount > 0 && (
            <button
              onClick={processQueue}
              disabled={isProcessing}
              className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-sm font-medium rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-gray-800"
              aria-label={isProcessing ? 'Syncing actions' : 'Sync all pending actions'}
            >
              {isProcessing ? 'Syncing...' : `Sync ${pendingCount} action${pendingCount !== 1 ? 's' : ''}`}
            </button>
          )}
        </>
      )}
    </div>
  );
}

