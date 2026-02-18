"use client";

/**
 * Progress Bar Component
 * Reusable progress bar with dynamic width support
 * Note: Dynamic widths require inline styles as Tailwind cannot handle runtime percentages
 */

import React from "react";
import { cn } from "@/lib/utils";

interface ProgressBarProps {
  value: number;
  max?: number;
  color?: "green" | "yellow" | "red" | "blue" | "purple" | "orange" | "dynamic";
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  label?: string;
  className?: string;
  animated?: boolean;
}

const colorClasses = {
  green: "bg-green-500",
  yellow: "bg-yellow-500",
  red: "bg-red-500",
  blue: "bg-blue-500",
  purple: "bg-blue-500",
  orange: "bg-orange-500",
  dynamic: "", // Will be computed based on value
};

const sizeClasses = {
  sm: "h-1.5",
  md: "h-2",
  lg: "h-3",
};

function getDynamicColor(percentage: number): string {
  if (percentage >= 80) return "bg-green-500";
  if (percentage >= 60) return "bg-yellow-500";
  if (percentage >= 40) return "bg-orange-500";
  return "bg-red-500";
}

export function ProgressBar({
  value,
  max = 100,
  color = "blue",
  size = "md",
  showLabel = false,
  label,
  className,
  animated = true,
}: ProgressBarProps) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);
  const barColor =
    color === "dynamic" ? getDynamicColor(percentage) : colorClasses[color];

  return (
    <div className={cn("w-full", className)}>
      {(showLabel || label) && (
        <div className="flex justify-between items-center mb-2">
          {label && (
            <span className="text-sm font-medium text-gray-700 dark:text-slate-300">
              {label}
            </span>
          )}
          {showLabel && (
            <span className="text-sm font-bold text-gray-900 dark:text-white">
              {value}/{max}
            </span>
          )}
        </div>
      )}
      <div
        className={cn(
          "w-full bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden",
          sizeClasses[size],
        )}
      >
        {/* Dynamic width requires inline style - Tailwind cannot handle runtime percentages */}
        <div
          className={cn(
            "h-full rounded-full",
            barColor,
            animated && "transition-all duration-500 ease-out",
          )}
          style={{ width: `${percentage}%` }}
          role="progressbar"
          aria-label={label || "Progress"}
          aria-valuenow={percentage}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
    </div>
  );
}

export default ProgressBar;
