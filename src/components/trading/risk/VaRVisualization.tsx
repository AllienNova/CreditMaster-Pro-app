"use client";

/**
 * VaRVisualization
 *
 * Displays Value-at-Risk metrics using CSS/SVG bar visualization.
 * Shows total heat, max heat, and heat utilization with color-coded thresholds.
 */

import React, { useMemo } from "react";

// ============================================================================
// TYPES
// ============================================================================

export interface VaRData {
  /** Current total heat (aggregate risk as fraction, e.g. 0.04 = 4%) */
  totalHeat: number;
  /** Configured maximum heat (fraction, e.g. 0.06 = 6%) */
  maxHeat: number;
  /** Heat utilization ratio (totalHeat / maxHeat, e.g. 0.67) */
  heatUtilization: number;
  /** Gross exposure as fraction of account equity */
  grossExposure: number;
  /** Net exposure (long - short) as fraction of account equity */
  netExposure: number;
  /** Long exposure as fraction of account equity */
  longExposure: number;
  /** Short exposure as fraction of account equity */
  shortExposure: number;
}

export interface VaRVisualizationProps {
  /** VaR data to display */
  data: VaRData | null;
  /** Whether data is loading */
  loading?: boolean;
  /** Additional CSS classes */
  className?: string;
}

// ============================================================================
// HELPERS
// ============================================================================

function getHeatColor(utilization: number): string {
  if (utilization >= 0.9) return "bg-red-500";
  if (utilization >= 0.7) return "bg-amber-500";
  if (utilization >= 0.5) return "bg-yellow-500";
  return "bg-green-500";
}

function getHeatTextColor(utilization: number): string {
  if (utilization >= 0.9) return "text-red-500";
  if (utilization >= 0.7) return "text-amber-500";
  if (utilization >= 0.5) return "text-yellow-500";
  return "text-green-500";
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(2)}%`;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function VaRVisualization({
  data,
  loading = false,
  className = "",
}: VaRVisualizationProps) {
  const heatBarWidth = useMemo(() => {
    if (!data) return 0;
    return Math.min(data.heatUtilization * 100, 100);
  }, [data]);

  if (loading) {
    return (
      <div
        className={`rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 ${className}`}
        role="status"
        aria-label="Loading VaR data"
      >
        <div className="animate-pulse space-y-4">
          <div className="h-5 w-40 rounded bg-gray-300 dark:bg-gray-600" />
          <div className="h-4 w-full rounded bg-gray-200 dark:bg-gray-700" />
          <div className="h-4 w-full rounded bg-gray-200 dark:bg-gray-700" />
          <div className="grid grid-cols-2 gap-4">
            <div className="h-16 rounded bg-gray-200 dark:bg-gray-700" />
            <div className="h-16 rounded bg-gray-200 dark:bg-gray-700" />
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div
        className={`rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 ${className}`}
        role="region"
        aria-label="Value at Risk"
      >
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Value at Risk
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          No VaR data available. Open positions to see risk metrics.
        </p>
      </div>
    );
  }

  return (
    <div
      className={`rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 ${className}`}
      role="region"
      aria-label="Value at Risk"
    >
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Value at Risk
      </h3>

      {/* Heat Gauge */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
            Portfolio Heat
          </span>
          <span
            className={`text-sm font-bold ${getHeatTextColor(data.heatUtilization)}`}
            data-testid="heat-utilization"
          >
            {formatPercent(data.heatUtilization)} utilized
          </span>
        </div>
        <div
          className="w-full h-4 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden"
          role="progressbar"
          aria-valuenow={Math.round(data.heatUtilization * 100)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Heat utilization at ${formatPercent(data.heatUtilization)}`}
        >
          <div
            className={`h-full rounded-full transition-all duration-500 ${getHeatColor(data.heatUtilization)}`}
            style={{ width: `${heatBarWidth}%` }}
          />
        </div>
        <div className="flex justify-between mt-1 text-xs text-gray-500 dark:text-gray-400">
          <span data-testid="total-heat">
            Current: {formatPercent(data.totalHeat)}
          </span>
          <span data-testid="max-heat">
            Max: {formatPercent(data.maxHeat)}
          </span>
        </div>
      </div>

      {/* Exposure Bars */}
      <div className="space-y-4">
        <h4 className="text-sm font-medium text-gray-600 dark:text-gray-300">
          Exposure Breakdown
        </h4>

        {/* Long/Short Exposure Visual */}
        <div className="relative h-8 rounded bg-gray-200 dark:bg-gray-700 overflow-hidden">
          <div
            className="absolute left-0 top-0 h-full bg-green-500/80 transition-all duration-300"
            style={{ width: `${Math.min(data.longExposure * 50, 100)}%` }}
            data-testid="long-bar"
          />
          <div
            className="absolute right-0 top-0 h-full bg-red-500/80 transition-all duration-300"
            style={{ width: `${Math.min(data.shortExposure * 50, 100)}%` }}
            data-testid="short-bar"
          />
          <div className="absolute inset-0 flex items-center justify-between px-3 text-xs font-medium text-white">
            <span>Long {formatPercent(data.longExposure)}</span>
            <span>Short {formatPercent(data.shortExposure)}</span>
          </div>
        </div>

        {/* Metric Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-md bg-gray-50 dark:bg-gray-900/50 p-3">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Gross Exposure
            </p>
            <p
              className="text-lg font-bold text-gray-900 dark:text-white"
              data-testid="gross-exposure"
            >
              {formatPercent(data.grossExposure)}
            </p>
          </div>
          <div className="rounded-md bg-gray-50 dark:bg-gray-900/50 p-3">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Net Exposure
            </p>
            <p
              className={`text-lg font-bold ${data.netExposure >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}
              data-testid="net-exposure"
            >
              {data.netExposure >= 0 ? "+" : ""}
              {formatPercent(data.netExposure)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default VaRVisualization;
