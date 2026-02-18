"use client";

/**
 * Bar Chart Component
 *
 * Displays data as a bar chart with support for multiple series.
 * Used for comparisons across categories.
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
  Cell,
} from "recharts";
import { ChartTooltip } from "./ChartHelpers";
import {
  CHART_COLOR_ARRAY,
  formatCurrency,
  formatNumber,
  getCategoryColor,
  generateChartDescription,
} from "./chartUtils";

export interface BarChartDataPoint {
  label: string;
  value: number;
  color?: string;
  [key: string]: string | number | undefined;
}

interface BarConfig {
  dataKey: string;
  name: string;
  color?: string;
  radius?: number;
}

export interface BarChartProps {
  data: BarChartDataPoint[];
  bars?: BarConfig[];
  height?: number;
  showGrid?: boolean;
  showLegend?: boolean;
  showTooltip?: boolean;
  currency?: boolean;
  horizontal?: boolean;
  xAxisKey?: string;
  useCategyColors?: boolean;
  barSize?: number;
  animationDuration?: number;
  onBarClick?: (data: BarChartDataPoint) => void;
  className?: string;
  /** Accessible label for the chart */
  ariaLabel?: string;
}

export default function BarChartComponent({
  data,
  bars,
  height = 300,
  showGrid = true,
  showLegend = false,
  showTooltip = true,
  currency = false,
  horizontal = false,
  xAxisKey = "label",
  useCategyColors = false,
  barSize = 40,
  animationDuration = 1000,
  onBarClick,
  className = "",
  ariaLabel,
}: BarChartProps) {
  const formatAxis = (value: number): string => {
    if (currency) return formatCurrency(value);
    return formatNumber(value);
  };

  // Generate accessible description
  const accessibleDescription =
    ariaLabel ||
    generateChartDescription("Bar chart", data.length, undefined, currency);

  const getBarColor = (item: BarChartDataPoint, index: number): string => {
    if (item.color) return item.color;
    if (useCategyColors) return getCategoryColor(item.label);
    return CHART_COLOR_ARRAY[index % CHART_COLOR_ARRAY.length];
  };

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

  // Single bar mode (no bars config provided)
  const singleBarMode = !bars || bars.length === 0;
  const effectiveBars: BarConfig[] = singleBarMode
    ? [{ dataKey: "value", name: "Value", color: CHART_COLOR_ARRAY[0] }]
    : bars;

  const ChartComponent = horizontal ? BarChart : BarChart;
  const layout = horizontal ? "vertical" : "horizontal";

  return (
    <div
      className={`w-full ${className}`}
      style={{ height }}
      role="img"
      aria-label={accessibleDescription}
    >
      <ResponsiveContainer width="100%" height="100%">
        <ChartComponent
          data={data}
          layout={layout}
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
          {effectiveBars.map((bar, barIndex) => (
            <Bar
              key={bar.dataKey}
              dataKey={bar.dataKey}
              name={bar.name}
              fill={bar.color || CHART_COLOR_ARRAY[barIndex]}
              barSize={barSize}
              radius={bar.radius || [4, 4, 0, 0]}
              animationDuration={animationDuration}
              onClick={(_, index) => onBarClick?.(data[index])}
              cursor={onBarClick ? "pointer" : "default"}
            >
              {singleBarMode &&
                data.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={getBarColor(entry, index)}
                  />
                ))}
            </Bar>
          ))}
        </ChartComponent>
      </ResponsiveContainer>
    </div>
  );
}
