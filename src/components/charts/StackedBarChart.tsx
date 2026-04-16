"use client";

/**
 * Stacked Bar Chart Component
 *
 * Displays data as stacked bars for comparing compositions across categories.
 * Used for budget vs actual, income vs expenses by category, etc.
 */

import {
  BarChart,
  Bar,
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
import { CHART_COLORS } from "@/lib/design-tokens/chart-colors";

export interface StackedBarChartDataPoint {
  label: string;
  [key: string]: string | number;
}

interface StackConfig {
  dataKey: string;
  name: string;
  color?: string;
  stackId?: string;
}

export interface StackedBarChartProps {
  data: StackedBarChartDataPoint[];
  stacks: StackConfig[];
  height?: number;
  showGrid?: boolean;
  showLegend?: boolean;
  showTooltip?: boolean;
  currency?: boolean;
  xAxisKey?: string;
  barSize?: number;
  horizontal?: boolean;
  animationDuration?: number;
  className?: string;
  /** Accessible label for the chart */
  ariaLabel?: string;
}

export default function StackedBarChartComponent({
  data,
  stacks,
  height = 300,
  showGrid = true,
  showLegend = true,
  showTooltip = true,
  currency = false,
  xAxisKey = "label",
  barSize = 40,
  horizontal = false,
  animationDuration = 1000,
  className = "",
  ariaLabel,
}: StackedBarChartProps) {
  const formatAxis = (value: number): string => {
    if (currency) return formatCurrency(value);
    return formatNumber(value);
  };

  // Generate accessible description
  const accessibleDescription =
    ariaLabel ||
    generateChartDescription(
      "Stacked bar chart",
      data.length,
      undefined,
      currency,
    );

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

    // Calculate total
    const total = payload.reduce((sum, entry) => sum + entry.value, 0);
    const payloadWithTotal = [
      ...payload,
      { name: "Total", value: total, color: CHART_COLORS.darkGray },
    ];

    return (
      <ChartTooltip
        active={active}
        payload={payloadWithTotal}
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
        <BarChart
          data={data}
          layout={horizontal ? "vertical" : "horizontal"}
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
          {horizontal ? (
            <>
              <XAxis
                type="number"
                tick={{ fontSize: 11, fill: "currentColor" }}
                tickLine={{ stroke: "currentColor", opacity: 0.3 }}
                axisLine={{ stroke: "currentColor", opacity: 0.3 }}
                className="text-gray-500 dark:text-slate-400"
                tickFormatter={formatAxis}
              />
              <YAxis
                type="category"
                dataKey={xAxisKey}
                tick={{ fontSize: 11, fill: "currentColor" }}
                tickLine={{ stroke: "currentColor", opacity: 0.3 }}
                axisLine={{ stroke: "currentColor", opacity: 0.3 }}
                className="text-gray-500 dark:text-slate-400"
                width={100}
              />
            </>
          ) : (
            <>
              <XAxis
                dataKey={xAxisKey}
                tick={{ fontSize: 11, fill: "currentColor" }}
                tickLine={{ stroke: "currentColor", opacity: 0.3 }}
                axisLine={{ stroke: "currentColor", opacity: 0.3 }}
                className="text-gray-500 dark:text-slate-400"
              />
              <YAxis
                tick={{ fontSize: 11, fill: "currentColor" }}
                tickLine={{ stroke: "currentColor", opacity: 0.3 }}
                axisLine={{ stroke: "currentColor", opacity: 0.3 }}
                className="text-gray-500 dark:text-slate-400"
                tickFormatter={formatAxis}
              />
            </>
          )}
          {showTooltip && <Tooltip content={<CustomTooltip />} />}
          {showLegend && <Legend wrapperStyle={{ paddingTop: 20 }} />}
          {stacks.map((stack, index) => (
            <Bar
              key={stack.dataKey}
              dataKey={stack.dataKey}
              name={stack.name}
              stackId={stack.stackId || "stack"}
              fill={
                stack.color ||
                CHART_COLOR_ARRAY[index % CHART_COLOR_ARRAY.length]
              }
              barSize={barSize}
              radius={index === stacks.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
              animationDuration={animationDuration}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
