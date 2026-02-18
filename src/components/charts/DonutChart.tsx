"use client";

/**
 * Donut Chart Component
 *
 * A pie chart with a center cutout, ideal for showing percentages
 * with a total or summary value in the center.
 */

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { ChartLegend } from "./ChartHelpers";
import {
  CHART_COLOR_ARRAY,
  formatCurrency,
  formatPercentage,
  getCategoryColor,
  generateChartDescription,
} from "./chartUtils";
import { useState } from "react";

interface DonutDataPoint {
  name: string;
  value: number;
  color?: string;
  [key: string]: string | number | undefined;
}

export interface DonutChartProps {
  data: DonutDataPoint[];
  height?: number;
  innerRadius?: number;
  outerRadius?: number;
  showLegend?: boolean;
  showTooltip?: boolean;
  currency?: boolean;
  centerValue?: string | number;
  centerLabel?: string;
  useCategyColors?: boolean;
  onSliceClick?: (data: DonutDataPoint) => void;
  className?: string;
  /** Accessible label for the chart */
  ariaLabel?: string;
}

export default function DonutChartComponent({
  data,
  height = 300,
  innerRadius = 60,
  outerRadius = 80,
  showLegend = true,
  showTooltip = true,
  currency = false,
  centerValue,
  centerLabel,
  useCategyColors = false,
  onSliceClick,
  className = "",
  ariaLabel,
}: DonutChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const total = data.reduce((sum, item) => sum + item.value, 0);

  // Generate accessible description
  const accessibleDescription =
    ariaLabel ||
    generateChartDescription("Donut chart", data.length, undefined, currency);

  const getColor = (item: DonutDataPoint, index: number): string => {
    if (item.color) return item.color;
    if (useCategyColors) return getCategoryColor(item.name);
    return CHART_COLOR_ARRAY[index % CHART_COLOR_ARRAY.length];
  };

  const CustomTooltip = ({
    active,
    payload,
  }: {
    active?: boolean;
    payload?: Array<{ name: string; value: number; payload: DonutDataPoint }>;
  }) => {
    if (!active || !payload || payload.length === 0) return null;
    const item = payload[0];
    const percent = (item.value / total) * 100;

    return (
      <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg shadow-lg p-3">
        <div className="flex items-center gap-2 mb-1">
          <span
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: getColor(item.payload, 0) }}
          />
          <span className="font-medium text-gray-900 dark:text-white">
            {item.name}
          </span>
        </div>
        <div className="text-sm text-gray-600 dark:text-slate-400">
          {currency ? formatCurrency(item.value) : item.value.toLocaleString()}
          <span className="ml-2 text-gray-400">
            ({formatPercentage(percent)})
          </span>
        </div>
      </div>
    );
  };

  const legendItems = data.map((item, index) => ({
    name: item.name,
    color: getColor(item, index),
    value: item.value,
  }));

  const displayCenterValue =
    centerValue !== undefined
      ? centerValue
      : currency
        ? formatCurrency(total)
        : total.toLocaleString();

  return (
    <div
      className={`w-full ${className}`}
      style={{ height }}
      role="img"
      aria-label={accessibleDescription}
    >
      <ResponsiveContainer width="100%" height="100%">
        <PieChart aria-hidden="true">
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={innerRadius}
            outerRadius={outerRadius}
            paddingAngle={2}
            dataKey="value"
            onClick={(_, index) => onSliceClick?.(data[index])}
            onMouseEnter={(_, index) => setHoveredIndex(index)}
            onMouseLeave={() => setHoveredIndex(null)}
          >
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={getColor(entry, index)}
                stroke="white"
                strokeWidth={2}
                style={{
                  filter: hoveredIndex === index ? "brightness(1.1)" : "none",
                  cursor: onSliceClick ? "pointer" : "default",
                }}
              />
            ))}
          </Pie>
          {showTooltip && <Tooltip content={<CustomTooltip />} />}
          {/* Center text */}
          <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle">
            <tspan
              x="50%"
              dy="-0.5em"
              className="text-2xl font-bold fill-gray-900 dark:fill-white"
            >
              {displayCenterValue}
            </tspan>
            {centerLabel && (
              <tspan
                x="50%"
                dy="1.5em"
                className="text-sm fill-gray-500 dark:fill-gray-400"
              >
                {centerLabel}
              </tspan>
            )}
          </text>
        </PieChart>
      </ResponsiveContainer>
      {showLegend && (
        <div className="mt-4">
          <ChartLegend items={legendItems} showValues currency={currency} />
        </div>
      )}
    </div>
  );
}
