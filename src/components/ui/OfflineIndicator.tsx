/**
 * OfflineIndicator Component
 * 
 * Displays offline status banner with cached data timestamp
 */

'use client';

import { useOnline } from '@/hooks/useOnline';
import { useEffect, useState } from 'react';

export interface OfflineIndicatorProps {
  /** Show cached data timestamp */
  showCachedTimestamp?: boolean;
  /** Cached data timestamp */
  cachedAt?: Date | null;
  /** Custom className */
  className?: string;
  /** Position of the indicator */
  position?: 'top' | 'bottom';
  /** Variant style */
  variant?: 'banner' | 'badge';
}

export function OfflineIndicator({
  showCachedTimestamp = true,
  cachedAt = null,
  className = '',
  position = 'top',
  variant = 'banner',
}: OfflineIndicatorProps) {
  const { isOnline, wasOffline, lastOnlineAt } = useOnline();
  const [showReconnected, setShowReconnected] = useState(false);

  // Show "reconnected" message briefly when coming back online
  useEffect(() => {
    if (isOnline && wasOffline) {
      setShowReconnected(true);
      const timer = setTimeout(() => setShowReconnected(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [isOnline, wasOffline]);

  // Don't show anything if online and never was offline
  if (isOnline && !showReconnected) {
    return null;
  }

  const positionClasses = position === 'top' ? 'top-0' : 'bottom-0';

  if (variant === 'badge') {
    return (
      <div
        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors duration-200 ${
          isOnline
            ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
            : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
        } ${className}`}
        role="status"
        aria-live="polite"
      >
        <span
          className={`w-2 h-2 rounded-full ${
            isOnline ? 'bg-green-600 dark:bg-green-400' : 'bg-yellow-600 dark:bg-yellow-400'
          }`}
          aria-hidden="true"
        />
        <span>
          {isOnline ? 'Connected' : 'Offline'}
          {!isOnline && showCachedTimestamp && cachedAt && (
            <span className="ml-1 text-xs opacity-75">
              (cached {formatTimestamp(cachedAt)})
            </span>
          )}
        </span>
      </div>
    );
  }

  return (
    <div
      className={`fixed left-0 right-0 ${positionClasses} z-50 transition-all duration-300 ${className}`}
      role="status"
      aria-live="polite"
    >
      <div
        className={`px-4 py-3 text-center text-sm font-medium transition-colors duration-200 ${
          isOnline
            ? 'bg-green-600 dark:bg-green-700 text-white'
            : 'bg-yellow-500 dark:bg-yellow-600 text-gray-900 dark:text-white'
        }`}
      >
        <div className="flex items-center justify-center gap-2">
          {isOnline ? (
            <>
              <svg
                className="w-5 h-5"
                fill="currentColor"
                viewBox="0 0 20 20"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              <span>Back online! Data synced.</span>
              {lastOnlineAt && (
                <span className="text-xs opacity-90 ml-1">
                  (reconnected {formatTimestamp(lastOnlineAt)})
                </span>
              )}
            </>
          ) : (
            <>
              <svg
                className="w-5 h-5"
                fill="currentColor"
                viewBox="0 0 20 20"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
              <span>You're offline. Showing cached data.</span>
              {showCachedTimestamp && cachedAt && (
                <span className="text-xs opacity-90 ml-1">
                  (last updated {formatTimestamp(cachedAt)})
                </span>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Format timestamp for display
 */
function formatTimestamp(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  
  return date.toLocaleDateString();
}

