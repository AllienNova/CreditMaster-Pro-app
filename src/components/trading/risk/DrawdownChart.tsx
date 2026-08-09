"use client";

/**
 * DrawdownChart
 *
 * Visualizes portfolio drawdown with an SVG-based equity curve
 * and max drawdown markers. Shows current and maximum drawdown
 * with threshold level indicators.
 */

import React, { useMemo } from "react";
import { CHART_COLORS } from "@/lib/design-tokens/chart-colors";

// ============================================================================
// TYPES
// ============================================================================

export interface DrawdownDataPoint {
  /** Timestamp in milliseconds */
  timestamp: number;
  /** Equity value at this point */
  equity: number;
  /** Drawdown fraction at this point (0 to 1) */
  drawdown: number;
}

export interface DrawdownThresholds {
  /** First scaling threshold (fraction, e.g. 0.05 = 5%) */
  level1: number;
  /** Second scaling threshold (fraction, e.g. 0.10 = 10%) */
  level2: number;
  /** Kill switch threshold (fraction, e.g. 0.15 = 15%) */
  killLevel: number;
}

export interface DrawdownChartProps {
  /** Historical drawdown data points */
  data: DrawdownDataPoint[];
  /** Current drawdown fraction (0 to 1) */
  currentDrawdown: number;
  /** Maximum drawdown fraction (0 to 1) */
  maxDrawdown: number;
  /** Drawdown scaling factor (0 to 1, where 1 = full capacity) */
  scaleFactor: number;
  /** Drawdown threshold levels */
  thresholds?: DrawdownThresholds;
  /** Whether data is loading */
  loading?: boolean;
  /** SVG chart height in pixels */
  chartHeight?: number;
  /** Additional CSS classes */
  className?: string;
}

// ============================================================================
// DEFAULTS
// ============================================================================

const DEFAULT_THRESHOLDS: DrawdownThresholds = {
  level1: 0.05,
  level2: 0.10,
  killLevel: 0.15,
};

// ============================================================================
// HELPERS
// ============================================================================

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(2)}%`;
}

function getDrawdownSeverity(
  drawdown: number,
  thresholds: DrawdownThresholds,
): "healthy" | "warning" | "danger" | "critical" {
  if (drawdown >= thresholds.killLevel) return "critical";
  if (drawdown >= thresholds.level2) return "danger";
  if (drawdown >= thresholds.level1) return "warning";
  return "healthy";
}

const SEVERITY_CONFIG = {
  healthy: {
    bg: "bg-green-100 dark:bg-green-900/30",
    text: "text-green-700 dark:text-green-300",
    label: "Healthy",
  },
  warning: {
    bg: "bg-yellow-100 dark:bg-yellow-900/30",
    text: "text-yellow-700 dark:text-yellow-300",
    label: "Warning",
  },
  danger: {
    bg: "bg-orange-100 dark:bg-orange-900/30",
    text: "text-orange-700 dark:text-orange-300",
    label: "Danger",
  },
  critical: {
    bg: "bg-red-100 dark:bg-red-900/30",
    text: "text-red-700 dark:text-red-300",
    label: "Critical",
  },
};

// ============================================================================
// COMPONENT
// ============================================================================

export function DrawdownChart({
  data,
  currentDrawdown,
  maxDrawdown,
  scaleFactor,
  thresholds = DEFAULT_THRESHOLDS,
  loading = false,
  chartHeight = 160,
  className = "",
}: DrawdownChartProps) {
  const severity = useMemo(
    () => getDrawdownSeverity(currentDrawdown, thresholds),
    [currentDrawdown, thresholds],
  );

  const sevConfig = SEVERITY_CONFIG[severity];

  // Build SVG path from data
  const svgPath = useMemo(() => {
    if (data.length < 2) return "";

    const width = 100; // Viewbox percentage units
    const height = chartHeight;
    const maxDD = Math.max(
      ...data.map((d) => d.drawdown),
      thresholds.killLevel,
      0.01,
    );

    const points = data.map((point, index) => {
      const x = (index / (data.length - 1)) * width;
      const y = (point.drawdown / maxDD) * (height - 20) + 10;
      return `${x},${y}`;
    });

    return `M${points.join(" L")}`;
  }, [data, chartHeight, thresholds.killLevel]);

  // SVG threshold lines
  const thresholdLines = useMemo(() => {
    if (data.length < 2) return [];
    const maxDD = Math.max(
      ...data.map((d) => d.drawdown),
      thresholds.killLevel,
      0.01,
    );

    return [
      {
        level: thresholds.level1,
        y: (thresholds.level1 / maxDD) * (chartHeight - 20) + 10,
        color: CHART_COLORS.yellow,
        label: `L1 (${formatPercent(thresholds.level1)})`,
      },
      {
        level: thresholds.level2,
        y: (thresholds.level2 / maxDD) * (chartHeight - 20) + 10,
        color: CHART_COLORS.orange,
        label: `L2 (${formatPercent(thresholds.level2)})`,
      },
      {
        level: thresholds.killLevel,
        y: (thresholds.killLevel / maxDD) * (chartHeight - 20) + 10,
        color: CHART_COLORS.red,
        label: `Kill (${formatPercent(thresholds.killLevel)})`,
      },
    ];
  }, [data, thresholds, chartHeight]);

  if (loading) {
    return (
      <div
        className={`rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 ${className}`}
        role="status"
        aria-label="Loading drawdown data"
      >
        <div className="animate-pulse space-y-4">
          <div className="h-5 w-36 rounded bg-gray-300 dark:bg-gray-600" />
          <div className="h-32 w-full rounded bg-gray-200 dark:bg-gray-700" />
          <div className="grid grid-cols-3 gap-4">
            <div className="h-12 rounded bg-gray-200 dark:bg-gray-700" />
            <div className="h-12 rounded bg-gray-200 dark:bg-gray-700" />
            <div className="h-12 rounded bg-gray-200 dark:bg-gray-700" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 ${className}`}
      role="region"
      aria-label="Drawdown chart"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Drawdown
        </h3>
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${sevConfig.bg} ${sevConfig.text}`}
          role="status"
          aria-label={`Drawdown severity: ${sevConfig.label}`}
          data-testid="severity-badge"
        >
          {sevConfig.label}
        </span>
      </div>

      {/* SVG Chart */}
      {data.length >= 2 ? (
        <div className="mb-4" data-testid="drawdown-svg">
          <svg
            viewBox={`0 0 100 ${chartHeight}`}
            className="w-full"
            preserveAspectRatio="none"
            role="img"
            aria-label="Drawdown curve chart"
          >
            {/* Threshold lines */}
            {thresholdLines.map((t) => (
              <line
                key={t.label}
                x1="0"
                y1={t.y}
                x2="100"
                y2={t.y}
                stroke={t.color}
                strokeWidth="0.3"
                strokeDasharray="2,2"
                opacity="0.6"
              />
            ))}

            {/* Drawdown area fill */}
            <path
              d={`${svgPath} L100,10 L0,10 Z`}
              fill="url(#drawdownGradient)"
              opacity="0.3"
            />

            {/* Drawdown line */}
            <path
              d={svgPath}
              fill="none"
              stroke={severity === "critical" ? CHART_COLORS.red : severity === "danger" ? CHART_COLORS.orange : severity === "warning" ? CHART_COLORS.yellow : "#22C55E"}
              strokeWidth="0.8"
            />

            {/* Gradient definition */}
            <defs>
              <linearGradient
                id="drawdownGradient"
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop offset="0%" stopColor={CHART_COLORS.red} stopOpacity="0.1" />
                <stop offset="100%" stopColor={CHART_COLORS.red} stopOpacity="0.4" />
              </linearGradient>
            </defs>
          </svg>
        </div>
      ) : (
        <div className="mb-4 h-32 flex items-center justify-center text-sm text-gray-400 dark:text-gray-500">
          Not enough data to render chart
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-md bg-gray-50 dark:bg-gray-900/50 p-3 text-center">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Current Drawdown
          </p>
          <p
            className="text-lg font-bold text-gray-900 dark:text-white"
            data-testid="current-drawdown"
          >
            {formatPercent(currentDrawdown)}
          </p>
        </div>
        <div className="rounded-md bg-gray-50 dark:bg-gray-900/50 p-3 text-center">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Max Drawdown
          </p>
          <p
            className="text-lg font-bold text-red-600 dark:text-red-400"
            data-testid="max-drawdown"
          >
            {formatPercent(maxDrawdown)}
          </p>
        </div>
        <div className="rounded-md bg-gray-50 dark:bg-gray-900/50 p-3 text-center">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Scale Factor
          </p>
          <p
            className="text-lg font-bold text-gray-900 dark:text-white"
            data-testid="scale-factor"
          >
            {scaleFactor === 1 ? "100%" : `${(scaleFactor * 100).toFixed(0)}%`}
          </p>
        </div>
      </div>

      {/* Threshold Legend */}
      <div className="mt-4 flex flex-wrap gap-4 text-xs text-gray-500 dark:text-gray-400">
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-4 rounded bg-yellow-500" />
          Level 1 ({formatPercent(thresholds.level1)})
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-4 rounded bg-orange-500" />
          Level 2 ({formatPercent(thresholds.level2)})
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-4 rounded bg-red-500" />
          Kill Switch ({formatPercent(thresholds.killLevel)})
        </span>
      </div>
    </div>
  );
}

export default DrawdownChart;
