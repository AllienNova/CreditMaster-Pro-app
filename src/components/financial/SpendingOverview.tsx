'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowUpIcon, ArrowDownIcon, MinusIcon } from '@heroicons/react/24/solid';

interface SpendingCategory {
  name: string;
  value: number;
  color: string;
  percentage: number;
}

interface SpendingOverviewProps {
  totalSpent: number;
  lastMonthSpent: number;
  categories: SpendingCategory[];
  isLoading?: boolean;
}

// Category colors for donut segments
const CATEGORY_COLORS: Record<string, string> = {
  'Food & Dining': '#22C55E',
  'Shopping': '#3B82F6',
  'Transportation': '#F59E0B',
  'Entertainment': '#EC4899',
  'Bills & Utilities': '#EF4444',
  'Health & Fitness': '#8B5CF6',
  'Travel': '#06B6D4',
  'Education': '#84CC16',
  'Personal Care': '#F97316',
  'Groceries': '#10B981',
  'Gas & Fuel': '#6366F1',
  'Home': '#14B8A6',
  'Other': '#9CA3AF',
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function DonutSegment({
  cx,
  cy,
  radius,
  startAngle,
  endAngle,
  color,
}: {
  cx: number;
  cy: number;
  radius: number;
  startAngle: number;
  endAngle: number;
  color: string;
}) {
  const innerRadius = radius * 0.6;

  const startRad = (startAngle - 90) * (Math.PI / 180);
  const endRad = (endAngle - 90) * (Math.PI / 180);

  const x1 = cx + radius * Math.cos(startRad);
  const y1 = cy + radius * Math.sin(startRad);
  const x2 = cx + radius * Math.cos(endRad);
  const y2 = cy + radius * Math.sin(endRad);

  const x3 = cx + innerRadius * Math.cos(endRad);
  const y3 = cy + innerRadius * Math.sin(endRad);
  const x4 = cx + innerRadius * Math.cos(startRad);
  const y4 = cy + innerRadius * Math.sin(startRad);

  const largeArc = endAngle - startAngle > 180 ? 1 : 0;

  const d = [
    `M ${x1} ${y1}`,
    `A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`,
    `L ${x3} ${y3}`,
    `A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${x4} ${y4}`,
    'Z',
  ].join(' ');

  return <path d={d} fill={color} />;
}

function MiniDonutChart({ categories, size = 80 }: { categories: SpendingCategory[]; size?: number }) {
  const cx = size / 2;
  const cy = size / 2;
  const radius = size / 2 - 4;

  let currentAngle = 0;
  const total = categories.reduce((sum, cat) => sum + cat.value, 0);

  if (total === 0) {
    return (
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={cx}
          cy={cy}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={radius * 0.4}
          className="text-gray-200 dark:text-slate-700"
        />
      </svg>
    );
  }

  const segments = categories.map((category) => {
    const angle = (category.value / total) * 360;
    const startAngle = currentAngle;
    currentAngle += angle;

    return {
      ...category,
      startAngle,
      endAngle: currentAngle,
    };
  });

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {segments.map((segment, index) => (
        <DonutSegment
          key={index}
          cx={cx}
          cy={cy}
          radius={radius}
          startAngle={segment.startAngle}
          endAngle={segment.endAngle}
          color={segment.color || CATEGORY_COLORS[segment.name] || CATEGORY_COLORS.Other}
        />
      ))}
    </svg>
  );
}

function LoadingSkeleton() {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-5 animate-pulse">
      <div className="flex justify-between items-start mb-4">
        <div>
          <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-24 mb-2"></div>
          <div className="h-8 bg-gray-200 dark:bg-slate-700 rounded w-32"></div>
        </div>
        <div className="w-20 h-20 bg-gray-200 dark:bg-slate-700 rounded-full"></div>
      </div>
      <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-full mb-3"></div>
      <div className="flex justify-between">
        <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-16"></div>
        <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-16"></div>
      </div>
    </div>
  );
}

export function SpendingOverview({
  totalSpent,
  lastMonthSpent,
  categories,
  isLoading = false,
}: SpendingOverviewProps) {
  if (isLoading) {
    return <LoadingSkeleton />;
  }

  const changeAmount = totalSpent - lastMonthSpent;
  const changePercent = lastMonthSpent > 0
    ? ((changeAmount / lastMonthSpent) * 100).toFixed(1)
    : '0';

  const isUp = changeAmount > 0;
  const isDown = changeAmount < 0;
  const isStable = changeAmount === 0;

  // Get top category
  const topCategory = [...categories].sort((a, b) => b.value - a.value)[0];

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-5 hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-sm font-medium text-gray-500 dark:text-slate-400 mb-1">
            Spent this month
          </h3>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {formatCurrency(totalSpent)}
          </p>
          <div className="flex items-center gap-1 mt-1">
            {isUp && (
              <>
                <ArrowUpIcon className="w-4 h-4 text-red-500" />
                <span className="text-sm text-red-500">
                  {changePercent}% vs last month
                </span>
              </>
            )}
            {isDown && (
              <>
                <ArrowDownIcon className="w-4 h-4 text-green-500" />
                <span className="text-sm text-green-500">
                  {Math.abs(parseFloat(changePercent))}% vs last month
                </span>
              </>
            )}
            {isStable && (
              <>
                <MinusIcon className="w-4 h-4 text-gray-400 dark:text-slate-500" />
                <span className="text-sm text-gray-500 dark:text-slate-400">
                  Same as last month
                </span>
              </>
            )}
          </div>
        </div>

        <MiniDonutChart categories={categories} size={80} />
      </div>

      {topCategory && (
        <div className="mb-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600 dark:text-slate-400">Top category</span>
            <div className="flex items-center gap-2">
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: topCategory.color || CATEGORY_COLORS[topCategory.name] || CATEGORY_COLORS.Other }}
              />
              <span className="font-medium text-gray-900 dark:text-white">
                {topCategory.name}
              </span>
              <span className="text-gray-500 dark:text-slate-400">
                {formatCurrency(topCategory.value)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Category bars */}
      <div className="h-2 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden flex">
        {categories.slice(0, 5).map((category, index) => (
          <div
            key={index}
            className="h-full transition-all duration-300"
            style={{
              width: `${category.percentage}%`,
              backgroundColor: category.color || CATEGORY_COLORS[category.name] || CATEGORY_COLORS.Other,
            }}
          />
        ))}
      </div>

      <div className="mt-4 flex justify-between items-center gap-2">
        <div className="flex gap-2 sm:gap-3 min-w-0 flex-wrap">
          {categories.slice(0, 3).map((category, index) => (
            <div key={index} className="flex items-center gap-1 min-w-0">
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: category.color || CATEGORY_COLORS[category.name] || CATEGORY_COLORS.Other }}
              />
              <span className="text-xs text-gray-500 dark:text-slate-400 truncate max-w-[60px] sm:max-w-none">
                {category.name}
              </span>
            </div>
          ))}
        </div>

        <Link
          href="/dashboard/spending"
          className="text-sm font-medium text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors whitespace-nowrap flex-shrink-0"
        >
          See details →
        </Link>
      </div>
    </div>
  );
}

export default SpendingOverview;
