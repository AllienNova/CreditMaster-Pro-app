"use client";

/**
 * XP Bar Component
 * Shows user level, XP progress, and level title
 */

import React from "react";
import { cn } from "@/lib/utils";

interface XpBarProps {
  currentXp: number;
  xpToNextLevel: number;
  currentLevel: number;
  levelTitle: string;
  animated?: boolean;
  showDetails?: boolean;
  className?: string;
}

export function XpBar({
  currentXp,
  xpToNextLevel,
  currentLevel,
  levelTitle,
  animated = true,
  showDetails = true,
  className,
}: XpBarProps) {
  const totalForLevel = currentXp + xpToNextLevel;
  const progress = totalForLevel > 0 ? (currentXp / totalForLevel) * 100 : 0;

  return (
    <div className={cn("w-full", className)}>
      {/* Header with level and title */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 text-white font-bold text-sm">
            {currentLevel}
          </div>
          <div>
            <span className="text-sm font-semibold text-gray-900 dark:text-white">
              {levelTitle}
            </span>
            {showDetails && (
              <span className="text-xs text-gray-500 dark:text-slate-400 ml-2">
                Level {currentLevel}
              </span>
            )}
          </div>
        </div>

        {showDetails && (
          <span className="text-xs text-gray-500 dark:text-slate-400">
            {currentXp.toLocaleString()} / {totalForLevel.toLocaleString()} XP
          </span>
        )}
      </div>

      {/* Progress bar */}
      <div className="relative h-3 bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden">
        <div
          className={cn(
            "h-full bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 rounded-full",
            animated && "transition-all duration-1000 ease-out",
          )}
          style={{ width: `${Math.min(progress, 100)}%` }}
        />

        {/* Shine effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
      </div>

      {/* XP to next level */}
      {showDetails && xpToNextLevel > 0 && (
        <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
          {xpToNextLevel.toLocaleString()} XP to Level {currentLevel + 1}
        </p>
      )}
    </div>
  );
}

export default XpBar;
