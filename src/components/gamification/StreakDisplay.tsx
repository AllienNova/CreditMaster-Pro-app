"use client";

/**
 * Streak Display Component
 * Shows current streak with fire emoji and multiplier
 */

import React from "react";
import { cn } from "@/lib/utils";

interface StreakDisplayProps {
  streak: number;
  multiplier: number;
  longestStreak?: number;
  size?: "sm" | "md" | "lg";
  showMultiplier?: boolean;
  className?: string;
}

const sizeConfig = {
  sm: { container: "px-2 py-1", text: "text-sm", icon: "text-base" },
  md: { container: "px-3 py-1.5", text: "text-base", icon: "text-xl" },
  lg: { container: "px-4 py-2", text: "text-lg", icon: "text-2xl" },
};

export function StreakDisplay({
  streak,
  multiplier,
  longestStreak,
  size = "md",
  showMultiplier = true,
  className,
}: StreakDisplayProps) {
  const config = sizeConfig[size];

  // Determine fire intensity based on streak length
  const getFireEmoji = () => {
    if (streak >= 100) return "";
    if (streak >= 30) return "";
    if (streak >= 14) return "";
    if (streak >= 7) return "";
    return "";
  };

  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-full bg-gradient-to-r from-orange-100 to-red-100 dark:from-orange-900/30 dark:to-red-900/30",
        config.container,
        className,
      )}
    >
      <span className={config.icon}>{getFireEmoji()}</span>

      <div className="flex flex-col">
        <span
          className={cn(
            "font-bold text-orange-600 dark:text-orange-400",
            config.text,
          )}
        >
          {streak} day{streak !== 1 ? "s" : ""}
        </span>

        {showMultiplier && multiplier > 1 && (
          <span className="text-xs text-orange-500 dark:text-orange-400">
            {multiplier.toFixed(2)}x XP bonus
          </span>
        )}
      </div>

      {longestStreak && longestStreak > streak && (
        <div className="ml-2 pl-2 border-l border-orange-300 dark:border-orange-600">
          <span className="text-xs text-gray-500 dark:text-slate-400">
            Best: {longestStreak}d
          </span>
        </div>
      )}
    </div>
  );
}

export default StreakDisplay;
