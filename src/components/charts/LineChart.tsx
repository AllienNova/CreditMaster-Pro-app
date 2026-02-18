"use client";

/**
 * Line Chart Component
 *
 * Displays data as a line chart with support for multiple lines.
 * Used for trends, time series, and comparisons over time.
 *
 * Accessibility: Supports keyboard navigation and screen reader descriptions.
 */

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { ChartTooltip } from "./ChartHelpers";
import {
  CHART_COLOR_ARRAY,
  formatCurrency,
  formatNumber,
  generateChartDescription,
} from "./chartUtils";

export interface LineChartDataPoint {
  label: string;
  [key: string]: string | number;
}

interface LineConfig {
  dataKey: string;
  name: string;
  color?: string;
  strokeWidth?: number;
  dot?: boolean;
  dashed?: boolean;
}

export interface LineChartProps {
  data: LineChartDataPoint[];
  lines: LineConfig[];
  height?: number;
  showGrid?: boolean;
  showLegend?: boolean;
  showTooltip?: boolean;
  currency?: boolean;
  xAxisKey?: string;
  xAxisLabel?: string;
  yAxisLabel?: string;
  animationDuration?: number;
  className?: string;
  /** Accessible label for the chart */
  ariaLabel?: string;
}

export default function LineChartComponent({
  data,
  lines,
  height = 300,
  showGrid = true,
  showLegend = true,
  showTooltip = true,
  currency = false,
  xAxisKey = "label",
  xAxisLabel,
  yAxisLabel,
  animationDuration = 1000,
  className = "",
  ariaLabel,
}: LineChartProps) {
  const formatYAxis = (value: number): string => {
    if (currency) return formatCurrency(value);
    return formatNumber(value);
  };

  // Generate accessible description
  const accessibleDescription =
    ariaLabel ||
    generateChartDescription("Line chart", data.length, undefined, currency);

  const CustomTooltip = ({
    active,
    payload,
    label,
  }: {
    active?: boolean;
    payload?: Array<{ name: string; value: number; color: string }>;
    label?: string;
  }) => {
    if (!active || !payload || payload.length === 0) return null;

    return (
      <ChartTooltip
        active={active}
        payload={payload}
        label={label}
        currency={currency}
      />
    );
  };

  return (
    <div
      className={`w-full ${className}`}
      style={{ height }}
      role="img"
      aria-label={accessibleDescription}
    >
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data}
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          aria-hidden="true"
        >
          {showGrid && (
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#E5E7EB"
              className="dark:stroke-gray-600"
            />
          )}
          <XAxis
            dataKey={xAxisKey}
            tick={{ fontSize: 11, fill: "currentColor" }}
            tickLine={{ stroke: "currentColor", opacity: 0.3 }}
            axisLine={{ stroke: "currentColor", opacity: 0.3 }}
            className="text-gray-500 dark:text-slate-400"
            label={
              xAxisLabel
                ? {
                    value: xAxisLabel,
                    position: "bottom",
                    offset: -5,
                    className:
                      "text-xs sm:text-sm fill-gray-600 dark:fill-gray-400",
                  }
                : undefined
            }
          />
          <YAxis
            tick={{ fontSize: 11, fill: "currentColor" }}
            tickLine={{ stroke: "currentColor", opacity: 0.3 }}
            axisLine={{ stroke: "currentColor", opacity: 0.3 }}
            className="text-gray-500 dark:text-slate-400"
            tickFormatter={formatYAxis}
            label={
              yAxisLabel
                ? {
                    value: yAxisLabel,
                    angle: -90,
                    position: "insideLeft",
                    className:
                      "text-xs sm:text-sm fill-gray-600 dark:fill-gray-400",
                  }
                : undefined
            }
          />
          {showTooltip && <Tooltip content={<CustomTooltip />} />}
          {showLegend && (
            <Legend wrapperStyle={{ paddingTop: 20 }} iconType="line" />
          )}
          {lines.map((line, index) => (
            <Line
              key={line.dataKey}
              type="monotone"
              dataKey={line.dataKey}
              name={line.name}
              stroke={
                line.color ||
                CHART_COLOR_ARRAY[index % CHART_COLOR_ARRAY.length]
              }
              strokeWidth={line.strokeWidth || 2}
              dot={line.dot !== false}
              strokeDasharray={line.dashed ? "5 5" : undefined}
              animationDuration={animationDuration}
              activeDot={{ r: 6, strokeWidth: 2 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
