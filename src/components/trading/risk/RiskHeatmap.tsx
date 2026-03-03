"use client";

/**
 * RiskHeatmap
 *
 * Displays a heatmap of portfolio positions showing risk contribution
 * per position. Each cell is sized by exposure and colored by risk level.
 */

import React, { useMemo } from "react";
import type { PositionRisk } from "@/lib/trading/pctt/portfolio-risk";

// ============================================================================
// TYPES
// ============================================================================

export interface RiskHeatmapProps {
  /** Array of position risk data */
  positions: PositionRisk[];
  /** Account equity for percentage calculations */
  accountEquity: number;
  /** Whether data is loading */
  loading?: boolean;
  /** Additional CSS classes */
  className?: string;
}

// ============================================================================
// HELPERS
// ============================================================================

function getRiskColor(percentRisk: number): string {
  if (percentRisk >= 0.02) return "bg-red-500";
  if (percentRisk >= 0.015) return "bg-orange-500";
  if (percentRisk >= 0.01) return "bg-amber-500";
  if (percentRisk >= 0.005) return "bg-yellow-500";
  return "bg-green-500";
}

function getRiskTextColor(percentRisk: number): string {
  if (percentRisk >= 0.02) return "text-red-500";
  if (percentRisk >= 0.015) return "text-orange-500";
  if (percentRisk >= 0.01) return "text-amber-500";
  if (percentRisk >= 0.005) return "text-yellow-500";
  return "text-green-500";
}

function formatDollar(value: number): string {
  const absValue = Math.abs(value);
  if (absValue >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (absValue >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
  return `$${value.toFixed(2)}`;
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(2)}%`;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function RiskHeatmap({
  positions,
  accountEquity,
  loading = false,
  className = "",
}: RiskHeatmapProps) {
  // Sort positions by risk contribution (highest first)
  const sortedPositions = useMemo(
    () => [...positions].sort((a, b) => b.percentRisk - a.percentRisk),
    [positions],
  );

  // Calculate total risk for relative sizing
  const totalRisk = useMemo(
    () => positions.reduce((sum, p) => sum + p.percentRisk, 0),
    [positions],
  );

  if (loading) {
    return (
      <div
        className={`rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 ${className}`}
        role="status"
        aria-label="Loading risk heatmap"
      >
        <div className="animate-pulse space-y-4">
          <div className="h-5 w-36 rounded bg-gray-300 dark:bg-gray-600" />
          <div className="grid grid-cols-3 gap-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-20 rounded bg-gray-200 dark:bg-gray-700"
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (positions.length === 0) {
    return (
      <div
        className={`rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 ${className}`}
        role="region"
        aria-label="Risk heatmap"
      >
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Position Risk Heatmap
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          No open positions. Risk heatmap will appear when positions are active.
        </p>
      </div>
    );
  }

  return (
    <div
      className={`rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 ${className}`}
      role="region"
      aria-label="Risk heatmap"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Position Risk Heatmap
        </h3>
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {positions.length} position{positions.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Heatmap Grid */}
      <div
        className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4"
        data-testid="heatmap-grid"
      >
        {sortedPositions.map((position) => {
          const riskProportion = totalRisk > 0 ? position.percentRisk / totalRisk : 0;
          const opacity = Math.max(0.3, Math.min(1, riskProportion * 3 + 0.3));
          return (
            <div
              key={position.symbol}
              className={`relative rounded-lg p-3 ${getRiskColor(position.percentRisk)} transition-all duration-300 cursor-default`}
              style={{ opacity }}
              title={`${position.symbol}: ${formatPercent(position.percentRisk)} risk`}
              role="gridcell"
              aria-label={`${position.symbol} risk: ${formatPercent(position.percentRisk)}`}
              data-testid={`heatmap-cell-${position.symbol}`}
            >
              <div className="flex flex-col text-white">
                <span className="text-sm font-bold">{position.symbol}</span>
                <span className="text-xs opacity-90">
                  {position.side.toUpperCase()} x{position.quantity}
                </span>
                <span className="text-xs font-medium mt-1">
                  Risk: {formatPercent(position.percentRisk)}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Risk Summary Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm" role="table">
          <thead>
            <tr className="text-left text-xs text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
              <th className="pb-2 font-medium">Symbol</th>
              <th className="pb-2 font-medium">Side</th>
              <th className="pb-2 font-medium text-right">$ Risk</th>
              <th className="pb-2 font-medium text-right">% Risk</th>
              <th className="pb-2 font-medium text-right">P&L</th>
            </tr>
          </thead>
          <tbody>
            {sortedPositions.map((position) => (
              <tr
                key={position.symbol}
                className="border-b border-gray-100 dark:border-gray-700/50 last:border-0"
                data-testid={`heatmap-row-${position.symbol}`}
              >
                <td className="py-2 font-medium text-gray-900 dark:text-white">
                  {position.symbol}
                </td>
                <td className="py-2">
                  <span
                    className={`text-xs font-semibold ${position.side === "long" ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}
                  >
                    {position.side.toUpperCase()}
                  </span>
                </td>
                <td className="py-2 text-right text-gray-700 dark:text-gray-300">
                  {formatDollar(position.dollarRisk)}
                </td>
                <td className="py-2 text-right">
                  <span className={`font-medium ${getRiskTextColor(position.percentRisk)}`}>
                    {formatPercent(position.percentRisk)}
                  </span>
                </td>
                <td className="py-2 text-right">
                  <span
                    className={`font-medium ${position.unrealizedPL >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}
                  >
                    {position.unrealizedPL >= 0 ? "+" : ""}
                    {formatDollar(position.unrealizedPL)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-gray-300 dark:border-gray-600">
              <td
                colSpan={2}
                className="pt-2 font-semibold text-gray-900 dark:text-white"
              >
                Total
              </td>
              <td className="pt-2 text-right font-semibold text-gray-900 dark:text-white">
                {formatDollar(
                  positions.reduce((sum, p) => sum + p.dollarRisk, 0),
                )}
              </td>
              <td className="pt-2 text-right font-semibold text-gray-900 dark:text-white">
                {formatPercent(totalRisk)}
              </td>
              <td className="pt-2 text-right font-semibold">
                <span
                  className={`${positions.reduce((sum, p) => sum + p.unrealizedPL, 0) >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}
                >
                  {positions.reduce((sum, p) => sum + p.unrealizedPL, 0) >= 0
                    ? "+"
                    : ""}
                  {formatDollar(
                    positions.reduce((sum, p) => sum + p.unrealizedPL, 0),
                  )}
                </span>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Risk Legend */}
      <div className="mt-4 flex flex-wrap gap-3 text-xs text-gray-500 dark:text-gray-400">
        <span className="flex items-center gap-1">
          <span className="inline-block h-3 w-3 rounded bg-green-500" />
          Low (&lt;0.5%)
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-3 w-3 rounded bg-yellow-500" />
          Moderate (0.5-1%)
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-3 w-3 rounded bg-amber-500" />
          Elevated (1-1.5%)
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-3 w-3 rounded bg-orange-500" />
          High (1.5-2%)
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-3 w-3 rounded bg-red-500" />
          Critical (&gt;2%)
        </span>
      </div>
    </div>
  );
}

export default RiskHeatmap;
