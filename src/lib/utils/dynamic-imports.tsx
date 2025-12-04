/**
 * Dynamic Import Utilities
 *
 * Provides lazy-loading components and utilities for code splitting
 * to improve initial page load performance.
 */

import React, { ComponentType } from 'react';
import dynamic from 'next/dynamic';

// Loading placeholder component
const LoadingSpinner = () => (
  <div className="flex items-center justify-center p-8">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" />
  </div>
);

const LoadingCard = () => (
  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 animate-pulse">
    <div className="h-4 bg-gray-200 rounded w-1/4 mb-4" />
    <div className="h-8 bg-gray-200 rounded w-1/2 mb-2" />
    <div className="h-4 bg-gray-200 rounded w-3/4" />
  </div>
);

// Dynamic import helper with configurable loading state
export function createDynamicComponent<P extends object>(
  importFn: () => Promise<{ default: ComponentType<P> }>,
  options?: {
    loading?: () => React.ReactNode;
    ssr?: boolean;
  }
) {
  return dynamic(importFn, {
    loading: options?.loading || (() => <LoadingSpinner />),
    ssr: options?.ssr ?? true,
  });
}

// Export loading components for use in other files
export { LoadingSpinner, LoadingCard };

