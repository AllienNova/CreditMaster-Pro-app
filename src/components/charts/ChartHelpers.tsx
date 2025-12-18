'use client';

/**
 * Chart Helper Components
 * 
 * Reusable tooltip and legend components for charts.
 */

import { ReactNode } from 'react';
import { formatCurrency, formatPercentage } from './chartUtils';

interface TooltipPayload {
  name: string;
  value: number;
  color: string;
  payload?: Record<string, unknown>;
}

interface ChartTooltipProps {
  active?: boolean;
  payload?: TooltipPayload[];
  label?: string;
  formatter?: (value: number, name: string) => string;
  labelFormatter?: (label: string) => string;
  currency?: boolean;
  percentage?: boolean;
}

export function ChartTooltip({
  active,
  payload,
  label,
  formatter,
  labelFormatter,
  currency = false,
  percentage = false,
}: ChartTooltipProps) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  const formatValue = (value: number, name: string): string => {
    if (formatter) return formatter(value, name);
    if (currency) return formatCurrency(value);
    if (percentage) return formatPercentage(value);
    return value.toLocaleString();
  };

  const formatLabel = (lbl: string): string => {
    if (labelFormatter) return labelFormatter(lbl);
    return lbl;
  };

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-3 min-w-[150px]">
      {label && (
        <p className="text-sm font-medium text-gray-900 dark:text-white mb-2 border-b border-gray-200 dark:border-gray-700 pb-2">
          {formatLabel(label)}
        </p>
      )}
      <div className="space-y-1">
        {payload.map((entry, index) => (
          <div key={index} className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-sm text-gray-600 dark:text-gray-400">{entry.name}</span>
            </div>
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              {formatValue(entry.value, entry.name)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

interface LegendItem {
  name: string;
  color: string;
  value?: number;
}

interface ChartLegendProps {
  items: LegendItem[];
  layout?: 'horizontal' | 'vertical';
  align?: 'left' | 'center' | 'right';
  showValues?: boolean;
  currency?: boolean;
  percentage?: boolean;
  onItemClick?: (name: string) => void;
  activeItems?: string[];
}

export function ChartLegend({
  items,
  layout = 'horizontal',
  align = 'center',
  showValues = false,
  currency = false,
  percentage = false,
  onItemClick,
  activeItems,
}: ChartLegendProps) {
  const formatValue = (value: number): string => {
    if (currency) return formatCurrency(value);
    if (percentage) return formatPercentage(value);
    return value.toLocaleString();
  };

  const alignClass = {
    left: 'justify-start',
    center: 'justify-center',
    right: 'justify-end',
  }[align];

  const layoutClass = layout === 'horizontal' 
    ? `flex flex-wrap gap-4 ${alignClass}` 
    : 'flex flex-col gap-2';

  const isActive = (name: string): boolean => {
    if (!activeItems) return true;
    return activeItems.includes(name);
  };

  return (
    <div className={layoutClass}>
      {items.map((item, index) => (
        <button
          key={index}
          type="button"
          onClick={() => onItemClick?.(item.name)}
          disabled={!onItemClick}
          className={`
            flex items-center gap-2 text-sm transition-opacity
            ${!isActive(item.name) ? 'opacity-40' : 'opacity-100'}
            ${onItemClick ? 'cursor-pointer hover:opacity-80' : 'cursor-default'}
          `}
        >
          <span
            className="w-3 h-3 rounded-full flex-shrink-0"
            style={{ backgroundColor: item.color }}
          />
          <span className="text-gray-600 dark:text-gray-400">{item.name}</span>
          {showValues && item.value !== undefined && (
            <span className="font-medium text-gray-900 dark:text-white">
              {formatValue(item.value)}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

