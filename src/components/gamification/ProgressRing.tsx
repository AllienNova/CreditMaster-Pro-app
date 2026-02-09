'use client';

/**
 * Progress Ring Component
 * Circular progress indicator for goals, budgets, and achievements
 */

import React from 'react';
import { cn } from '@/lib/utils';

interface ProgressRingProps {
  percentage: number;
  size?: 'sm' | 'md' | 'lg';
  label: string;
  streak?: number;
  color?: 'green' | 'blue' | 'purple' | 'gold' | 'red';
  animated?: boolean;
  showPercentage?: boolean;
  className?: string;
}

const sizeConfig = {
  sm: {
    width: 64,
    strokeWidth: 4,
    fontSize: 'text-xs',
    labelSize: 'text-[10px]',
  },
  md: { width: 96, strokeWidth: 6, fontSize: 'text-sm', labelSize: 'text-xs' },
  lg: { width: 128, strokeWidth: 8, fontSize: 'text-lg', labelSize: 'text-sm' },
};

const colorConfig = {
  green: { stroke: '#22C55E', bg: '#22C55E20' },
  blue: { stroke: '#3B82F6', bg: '#3B82F620' },
  purple: { stroke: '#A855F7', bg: '#A855F720' },
  gold: { stroke: '#F59E0B', bg: '#F59E0B20' },
  red: { stroke: '#EF4444', bg: '#EF444420' },
};

export function ProgressRing({
  percentage,
  size = 'md',
  label,
  streak,
  color = 'green',
  animated = true,
  showPercentage = true,
  className,
}: ProgressRingProps) {
  const config = sizeConfig[size];
  const colors = colorConfig[color];

  const radius = (config.width - config.strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset =
    circumference - (Math.min(percentage, 100) / 100) * circumference;

  return (
    <div className={cn('flex flex-col items-center gap-1', className)}>
      <div
        className="relative"
        style={{ width: config.width, height: config.width }}
      >
        <svg
          width={config.width}
          height={config.width}
          className="transform -rotate-90"
        >
          {/* Background circle */}
          <circle
            cx={config.width / 2}
            cy={config.width / 2}
            r={radius}
            fill="none"
            stroke={colors.bg}
            strokeWidth={config.strokeWidth}
          />
          {/* Progress circle */}
          <circle
            cx={config.width / 2}
            cy={config.width / 2}
            r={radius}
            fill="none"
            stroke={colors.stroke}
            strokeWidth={config.strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className={cn(animated && 'transition-all duration-1000 ease-out')}
          />
        </svg>

        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {showPercentage && (
            <span
              className={cn(
                'font-bold text-gray-900 dark:text-white',
                config.fontSize
              )}
            >
              {Math.round(percentage)}%
            </span>
          )}
        </div>
      </div>

      {/* Label */}
      <span
        className={cn(
          'font-medium text-gray-600 dark:text-slate-400',
          config.labelSize
        )}
      >
        {label}
      </span>

      {/* Streak indicator */}
      {streak !== undefined && streak > 0 && (
        <div className="flex items-center gap-1">
          <span className="text-orange-500"></span>
          <span className={cn('font-medium text-orange-500', config.labelSize)}>
            {streak}d
          </span>
        </div>
      )}
    </div>
  );
}

export default ProgressRing;
