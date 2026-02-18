"use client";

/**
 * Heatmap Component
 *
 * Displays data intensity using color gradients in a grid format.
 * Used for spending patterns by day/time, activity heatmaps, etc.
 */

import { useMemo } from "react";
import { formatCurrency, formatNumber } from "./chartUtils";

export interface HeatmapDataPoint {
  x: string | number;
  y: string | number;
  value: number;
}

export interface HeatmapProps {
  data: HeatmapDataPoint[];
  xLabels: string[];
  yLabels: string[];
  height?: number;
  colorScale?: "blue" | "green" | "red" | "purple" | "custom";
  customColors?: { low: string; mid: string; high: string };
  showValues?: boolean;
  currency?: boolean;
  cellSize?: number;
  onCellClick?: (point: HeatmapDataPoint) => void;
  className?: string;
  /** Accessible label for the chart */
  ariaLabel?: string;
}

const COLOR_SCALES: Record<string, { low: string; mid: string; high: string }> =
  {
    blue: { low: "#EFF6FF", mid: "#60A5FA", high: "#1D4ED8" },
    green: { low: "#ECFDF5", mid: "#34D399", high: "#059669" },
    red: { low: "#FEF2F2", mid: "#F87171", high: "#DC2626" },
    purple: { low: "#FAF5FF", mid: "#A78BFA", high: "#7C3AED" },
  };

export default function HeatmapComponent({
  data,
  xLabels,
  yLabels,
  height = 300,
  colorScale = "blue",
  customColors,
  showValues = true,
  currency = false,
  cellSize = 40,
  onCellClick,
  className = "",
  ariaLabel,
}: HeatmapProps) {
  const colors = customColors || COLOR_SCALES[colorScale];

  // Generate accessible description
  const accessibleDescription =
    ariaLabel ||
    `Heatmap with ${xLabels.length} columns and ${yLabels.length} rows showing data intensity. Use Tab to navigate cells.`;

  // Create a map for quick value lookup
  const valueMap = useMemo(() => {
    const map = new Map<string, number>();
    data.forEach((point) => {
      map.set(`${point.x}-${point.y}`, point.value);
    });
    return map;
  }, [data]);

  // Calculate min/max for color scaling
  const { minValue, maxValue } = useMemo(() => {
    if (data.length === 0) return { minValue: 0, maxValue: 0 };
    const values = data.map((d) => d.value);
    return { minValue: Math.min(...values), maxValue: Math.max(...values) };
  }, [data]);

  // Interpolate color based on value
  const getColor = (value: number): string => {
    if (maxValue === minValue) return colors.mid;
    const ratio = (value - minValue) / (maxValue - minValue);
    if (ratio <= 0.5) {
      // Interpolate between low and mid
      return interpolateColor(colors.low, colors.mid, ratio * 2);
    } else {
      // Interpolate between mid and high
      return interpolateColor(colors.mid, colors.high, (ratio - 0.5) * 2);
    }
  };

  const formatValue = (value: number): string => {
    if (currency) return formatCurrency(value);
    return formatNumber(value);
  };

  // Get text color based on background
  const getTextColor = (bgColor: string): string => {
    const rgb = hexToRgb(bgColor);
    if (!rgb) return "#000000";
    const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
    return luminance > 0.5 ? "#374151" : "#FFFFFF";
  };

  return (
    <div
      className={`w-full overflow-x-auto ${className}`}
      style={{ minHeight: height }}
      role="grid"
      aria-label={accessibleDescription}
    >
      <div className="inline-block min-w-full">
        {/* X-axis labels at top */}
        <div className="flex" style={{ paddingLeft: cellSize + 8 }}>
          {xLabels.map((label) => (
            <div
              key={label}
              className="text-xs text-gray-500 dark:text-slate-400 text-center font-medium"
              style={{ width: cellSize, minWidth: cellSize }}
            >
              {label}
            </div>
          ))}
        </div>

        {/* Grid rows */}
        <div className="space-y-1 mt-1">
          {yLabels.map((yLabel) => (
            <div key={yLabel} className="flex items-center gap-2">
              {/* Y-axis label */}
              <div
                className="text-xs text-gray-500 dark:text-slate-400 text-right font-medium"
                style={{ width: cellSize, minWidth: cellSize }}
              >
                {yLabel}
              </div>

              {/* Cells */}
              {xLabels.map((xLabel) => {
                const value = valueMap.get(`${xLabel}-${yLabel}`) ?? 0;
                const bgColor = getColor(value);
                const textColor = getTextColor(bgColor);
                const point = { x: xLabel, y: yLabel, value };

                return (
                  <button
                    key={`${xLabel}-${yLabel}`}
                    type="button"
                    onClick={() => onCellClick?.(point)}
                    disabled={!onCellClick}
                    className="rounded transition-all hover:ring-2 hover:ring-blue-400 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    style={{
                      width: cellSize,
                      height: cellSize,
                      minWidth: cellSize,
                      backgroundColor: bgColor,
                      cursor: onCellClick ? "pointer" : "default",
                    }}
                    title={`${xLabel}, ${yLabel}: ${formatValue(value)}`}
                  >
                    {showValues && (
                      <span
                        className="text-[10px] font-medium"
                        style={{ color: textColor }}
                      >
                        {formatNumber(value)}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center gap-2 mt-4">
          <span className="text-xs text-gray-500">Low</span>
          <div className="flex h-3 w-32 rounded overflow-hidden">
            <div className="flex-1" style={{ backgroundColor: colors.low }} />
            <div className="flex-1" style={{ backgroundColor: colors.mid }} />
            <div className="flex-1" style={{ backgroundColor: colors.high }} />
          </div>
          <span className="text-xs text-gray-500">High</span>
        </div>
      </div>
    </div>
  );
}

// Helper functions
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

function interpolateColor(
  color1: string,
  color2: string,
  ratio: number,
): string {
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);
  if (!rgb1 || !rgb2) return color1;

  const r = Math.round(rgb1.r + (rgb2.r - rgb1.r) * ratio);
  const g = Math.round(rgb1.g + (rgb2.g - rgb1.g) * ratio);
  const b = Math.round(rgb1.b + (rgb2.b - rgb1.b) * ratio);

  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}
