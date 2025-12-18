'use client';

/**
 * Pie Chart Component
 *
 * Displays data as a pie chart with optional labels and tooltips.
 * Used for category breakdowns, budget allocations, etc.
 */

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { ChartLegend } from './ChartHelpers';
import {
  CHART_COLOR_ARRAY,
  formatCurrency,
  formatPercentage,
  getCategoryColor,
} from './chartUtils';
import { useState } from 'react';

export interface PieChartDataPoint {
  name: string;
  value: number;
  color?: string;
  [key: string]: string | number | undefined;
}

export interface PieChartProps {
  data: PieChartDataPoint[];
  height?: number;
  showLabels?: boolean;
  showLegend?: boolean;
  showTooltip?: boolean;
  innerRadius?: number;
  outerRadius?: number;
  currency?: boolean;
  percentage?: boolean;
  useCategyColors?: boolean;
  onSliceClick?: (data: PieChartDataPoint) => void;
  activeSlice?: string;
  className?: string;
}

export default function PieChartComponent({
  data,
  height = 300,
  showLabels = true,
  showLegend = true,
  showTooltip = true,
  innerRadius = 0,
  outerRadius = 80,
  currency = false,
  percentage = false,
  useCategyColors = false,
  onSliceClick,
  activeSlice,
  className = '',
}: PieChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const total = data.reduce((sum, item) => sum + item.value, 0);

  const getColor = (item: PieChartDataPoint, index: number): string => {
    if (item.color) return item.color;
    if (useCategyColors) return getCategoryColor(item.name);
    return CHART_COLOR_ARRAY[index % CHART_COLOR_ARRAY.length];
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const renderLabel = (props: any): string => {
    const displayValue = percentage
      ? formatPercentage(props.percent * 100)
      : currency
        ? formatCurrency(props.value)
        : props.value.toLocaleString();
    return `${props.name}: ${displayValue}`;
  };

  const CustomTooltip = ({
    active,
    payload,
  }: {
    active?: boolean;
    payload?: Array<{
      name: string;
      value: number;
      payload: PieChartDataPoint;
    }>;
  }) => {
    if (!active || !payload || payload.length === 0) return null;
    const item = payload[0];
    const percent = (item.value / total) * 100;

    return (
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-3">
        <div className="flex items-center gap-2 mb-1">
          <span
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: getColor(item.payload, 0) }}
          />
          <span className="font-medium text-gray-900 dark:text-white">
            {item.name}
          </span>
        </div>
        <div className="text-sm text-gray-600 dark:text-gray-400">
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

  return (
    <div className={`w-full ${className}`} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={innerRadius}
            outerRadius={outerRadius}
            paddingAngle={2}
            dataKey="value"
            label={showLabels ? renderLabel : undefined}
            labelLine={showLabels}
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
                  filter:
                    hoveredIndex === index || activeSlice === entry.name
                      ? 'brightness(1.1)'
                      : 'none',
                  transform:
                    hoveredIndex === index ? 'scale(1.02)' : 'scale(1)',
                  transformOrigin: 'center',
                  cursor: onSliceClick ? 'pointer' : 'default',
                }}
              />
            ))}
          </Pie>
          {showTooltip && <Tooltip content={<CustomTooltip />} />}
        </PieChart>
      </ResponsiveContainer>
      {showLegend && (
        <div className="mt-4">
          <ChartLegend
            items={legendItems}
            showValues
            currency={currency}
            onItemClick={(name) =>
              onSliceClick?.(data.find((d) => d.name === name)!)
            }
            activeItems={activeSlice ? [activeSlice] : undefined}
          />
        </div>
      )}
    </div>
  );
}
