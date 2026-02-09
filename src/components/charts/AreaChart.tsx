'use client';

/**
 * Area Chart Component
 * 
 * Displays data as an area chart with gradient fills.
 * Used for cash flow, net worth trends, and cumulative data.
 */

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { ChartTooltip } from './ChartHelpers';
import { CHART_COLORS, formatCurrency, formatNumber, generateChartDescription } from './chartUtils';

export interface AreaChartDataPoint {
  label: string;
  [key: string]: string | number;
}

interface AreaConfig {
  dataKey: string;
  name: string;
  color?: string;
  gradientId?: string;
  fillOpacity?: number;
  strokeWidth?: number;
  stacked?: boolean;
}

export interface AreaChartProps {
  data: AreaChartDataPoint[];
  areas: AreaConfig[];
  height?: number;
  showGrid?: boolean;
  showLegend?: boolean;
  showTooltip?: boolean;
  currency?: boolean;
  xAxisKey?: string;
  stacked?: boolean;
  animationDuration?: number;
  className?: string;
  /** Accessible label for the chart */
  ariaLabel?: string;
}

export default function AreaChartComponent({
  data,
  areas,
  height = 300,
  showGrid = true,
  showLegend = true,
  showTooltip = true,
  currency = false,
  xAxisKey = 'label',
  stacked = false,
  animationDuration = 1000,
  className = '',
  ariaLabel,
}: AreaChartProps) {
  const formatAxis = (value: number): string => {
    if (currency) return formatCurrency(value);
    return formatNumber(value);
  };

  // Generate accessible description
  const accessibleDescription = ariaLabel || generateChartDescription(
    'Area chart',
    data.length,
    undefined,
    currency
  );

  const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) => {
    if (!active || !payload || payload.length === 0) return null;
    return <ChartTooltip active={active} payload={payload} label={label} currency={currency} />;
  };

  const defaultColors = [
    CHART_COLORS.primary,
    CHART_COLORS.secondary,
    CHART_COLORS.tertiary,
    CHART_COLORS.quaternary,
  ];

  return (
    <div
      className={`w-full ${className}`}
      style={{ height }}
      role="img"
      aria-label={accessibleDescription}
    >
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
          aria-hidden="true"
        >
          <defs>
            {areas.map((area, index) => {
              const color = area.color || defaultColors[index % defaultColors.length];
              const gradientId = area.gradientId || `gradient-${area.dataKey}`;
              return (
                <linearGradient key={gradientId} id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={color} stopOpacity={0.8} />
                  <stop offset="95%" stopColor={color} stopOpacity={0.1} />
                </linearGradient>
              );
            })}
          </defs>
          {showGrid && (
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#E5E7EB"
              className="dark:stroke-gray-600"
            />
          )}
          <XAxis
            dataKey={xAxisKey}
            tick={{ fontSize: 11, fill: 'currentColor' }}
            tickLine={{ stroke: 'currentColor', opacity: 0.3 }}
            axisLine={{ stroke: 'currentColor', opacity: 0.3 }}
            className="text-gray-500 dark:text-slate-400"
          />
          <YAxis
            tick={{ fontSize: 11, fill: 'currentColor' }}
            tickLine={{ stroke: 'currentColor', opacity: 0.3 }}
            axisLine={{ stroke: 'currentColor', opacity: 0.3 }}
            className="text-gray-500 dark:text-slate-400"
            tickFormatter={formatAxis}
          />
          {showTooltip && <Tooltip content={<CustomTooltip />} />}
          {showLegend && <Legend wrapperStyle={{ paddingTop: 20 }} />}
          {areas.map((area, index) => {
            const color = area.color || defaultColors[index % defaultColors.length];
            const gradientId = area.gradientId || `gradient-${area.dataKey}`;
            return (
              <Area
                key={area.dataKey}
                type="monotone"
                dataKey={area.dataKey}
                name={area.name}
                stroke={color}
                strokeWidth={area.strokeWidth || 2}
                fillOpacity={1}
                fill={`url(#${gradientId})`}
                stackId={stacked || area.stacked ? 'stack' : undefined}
                animationDuration={animationDuration}
              />
            );
          })}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

