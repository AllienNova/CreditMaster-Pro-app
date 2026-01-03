'use client';

import React from 'react';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular' | 'rounded';
  width?: string | number;
  height?: string | number;
  animation?: 'pulse' | 'wave' | 'none';
}

/**
 * Base Skeleton Component
 */
export function Skeleton({
  className = '',
  variant = 'text',
  width,
  height,
  animation = 'pulse'
}: SkeletonProps) {
  const baseClasses = 'bg-gray-200';
  const animationClasses = {
    pulse: 'animate-pulse',
    wave: 'animate-shimmer',
    none: ''
  };
  
  const variantClasses = {
    text: 'rounded',
    circular: 'rounded-full',
    rectangular: '',
    rounded: 'rounded-lg'
  };

  const style: React.CSSProperties = {
    width: width || (variant === 'text' ? '100%' : undefined),
    height: height || (variant === 'text' ? '1em' : undefined)
  };

  return (
    <div
      className={`${baseClasses} ${animationClasses[animation]} ${variantClasses[variant]} ${className}`}
      style={style}
      aria-hidden="true"
    />
  );
}

/**
 * Card Skeleton
 */
export function CardSkeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-200 p-6 ${className}`}>
      <Skeleton variant="text" height={20} width="40%" className="mb-4" />
      <Skeleton variant="text" height={32} width="60%" className="mb-2" />
      <Skeleton variant="text" height={16} width="80%" />
    </div>
  );
}

/**
 * Table Row Skeleton
 */
export function TableRowSkeleton({ columns = 4 }: { columns?: number }) {
  return (
    <tr className="border-b border-gray-100">
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <Skeleton variant="text" height={16} width={i === 0 ? '80%' : '60%'} />
        </td>
      ))}
    </tr>
  );
}

/**
 * Dashboard Skeleton
 */
export function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header */}
      <div className="flex justify-between items-center">
        <Skeleton variant="text" height={32} width={200} />
        <Skeleton variant="rounded" height={40} width={120} />
      </div>
      
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
      
      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <Skeleton variant="text" height={24} width="30%" className="mb-6" />
            <Skeleton variant="rounded" height={300} />
          </div>
        </div>
        <div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <Skeleton variant="text" height={24} width="50%" className="mb-4" />
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center gap-3 py-3">
                <Skeleton variant="circular" width={40} height={40} />
                <div className="flex-1">
                  <Skeleton variant="text" height={16} width="70%" className="mb-1" />
                  <Skeleton variant="text" height={12} width="50%" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Profile Skeleton
 */
export function ProfileSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex items-center gap-6">
        <Skeleton variant="circular" width={120} height={120} />
        <div className="flex-1">
          <Skeleton variant="text" height={32} width={200} className="mb-2" />
          <Skeleton variant="text" height={20} width={150} className="mb-4" />
          <Skeleton variant="rounded" height={36} width={120} />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

/**
 * List Skeleton
 */
export function ListSkeleton({ items = 5 }: { items?: number }) {
  return (
    <div className="space-y-4 animate-pulse">
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-4 bg-white rounded-lg border border-gray-200">
          <Skeleton variant="circular" width={48} height={48} />
          <div className="flex-1">
            <Skeleton variant="text" height={18} width="60%" className="mb-2" />
            <Skeleton variant="text" height={14} width="40%" />
          </div>
          <Skeleton variant="rounded" height={32} width={80} />
        </div>
      ))}
    </div>
  );
}

/**
 * Form Skeleton
 */
export function FormSkeleton({ fields = 4 }: { fields?: number }) {
  return (
    <div className="space-y-6 animate-pulse">
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i}>
          <Skeleton variant="text" height={16} width={100} className="mb-2" />
          <Skeleton variant="rounded" height={44} />
        </div>
      ))}
      <Skeleton variant="rounded" height={48} width={150} />
    </div>
  );
}

/**
 * Asset Allocation Analysis Skeleton
 *
 * Specialized skeleton for investment analysis loading states.
 */
export function AssetAllocationSkeleton() {
  return (
    <div className="space-y-4 sm:space-y-6" role="status" aria-label="Loading asset allocation analysis">
      {/* Current Allocation Section */}
      <div className="bg-gray-800 rounded-lg p-4 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <Skeleton variant="text" height={24} width={180} className="bg-gray-700" />
          <Skeleton variant="circular" width={24} height={24} className="bg-gray-700" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="bg-gray-700/50 rounded-lg p-3 sm:p-4">
              <Skeleton variant="text" height={16} width="60%" className="bg-gray-600 mb-2" />
              <Skeleton variant="text" height={28} width="80%" className="bg-gray-600 mb-1" />
              <Skeleton variant="text" height={14} width="50%" className="bg-gray-600" />
            </div>
          ))}
        </div>
      </div>

      {/* Diversification Score Section */}
      <div className="bg-gray-800 rounded-lg p-4 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <Skeleton variant="text" height={24} width={200} className="bg-gray-700" />
          <Skeleton variant="circular" width={24} height={24} className="bg-gray-700" />
        </div>
        <div className="flex items-center justify-center mb-4">
          <Skeleton variant="circular" width={120} height={120} className="bg-gray-700" />
        </div>
        <Skeleton variant="text" height={16} width="70%" className="bg-gray-700 mx-auto" />
      </div>

      {/* Risk Metrics Section */}
      <div className="bg-gray-800 rounded-lg p-4 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <Skeleton variant="text" height={24} width={150} className="bg-gray-700" />
          <Skeleton variant="circular" width={24} height={24} className="bg-gray-700" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-gray-700/50 rounded-lg p-3 sm:p-4">
              <Skeleton variant="text" height={14} width="70%" className="bg-gray-600 mb-2" />
              <Skeleton variant="text" height={24} width="50%" className="bg-gray-600" />
            </div>
          ))}
        </div>
      </div>

      {/* Performance Metrics Section */}
      <div className="bg-gray-800 rounded-lg p-4 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <Skeleton variant="text" height={24} width={200} className="bg-gray-700" />
          <Skeleton variant="circular" width={24} height={24} className="bg-gray-700" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-gray-700/50 rounded-lg p-3 sm:p-4">
              <Skeleton variant="text" height={14} width="70%" className="bg-gray-600 mb-2" />
              <Skeleton variant="text" height={24} width="50%" className="bg-gray-600" />
            </div>
          ))}
        </div>
      </div>

      {/* Efficient Frontier Chart Section */}
      <div className="bg-gray-800 rounded-lg p-4 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <Skeleton variant="text" height={24} width={180} className="bg-gray-700" />
          <Skeleton variant="circular" width={24} height={24} className="bg-gray-700" />
        </div>
        <Skeleton variant="rounded" height={300} className="bg-gray-700 mb-4" />
        <div className="flex justify-center gap-4">
          <Skeleton variant="text" width={100} height={16} className="bg-gray-700" />
          <Skeleton variant="text" width={100} height={16} className="bg-gray-700" />
        </div>
      </div>
    </div>
  );
}

/**
 * Metric Card Skeleton
 *
 * Skeleton for individual metric cards in dark mode.
 */
export function MetricCardSkeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`bg-gray-700/50 rounded-lg p-3 sm:p-4 ${className}`}>
      <Skeleton variant="text" height={14} width="70%" className="bg-gray-600 mb-2" />
      <Skeleton variant="text" height={24} width="50%" className="bg-gray-600 mb-1" />
      <Skeleton variant="text" height={12} width="40%" className="bg-gray-600" />
    </div>
  );
}

/**
 * Chart Skeleton
 *
 * Skeleton for chart components in dark mode.
 */
export function ChartSkeleton({ height = 300, className = '' }: { height?: number; className?: string }) {
  return (
    <div className={`bg-gray-800 rounded-lg p-4 sm:p-6 ${className}`}>
      <Skeleton variant="text" height={24} width="40%" className="bg-gray-700 mb-4" />
      <Skeleton variant="rounded" height={height} className="bg-gray-700 mb-4" />
      <div className="flex justify-center gap-4">
        <Skeleton variant="text" width={80} height={16} className="bg-gray-700" />
        <Skeleton variant="text" width={80} height={16} className="bg-gray-700" />
        <Skeleton variant="text" width={80} height={16} className="bg-gray-700" />
      </div>
    </div>
  );
}

export default Skeleton;
