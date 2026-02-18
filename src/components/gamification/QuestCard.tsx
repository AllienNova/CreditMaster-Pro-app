"use client";

/**
 * Quest Card Component
 * Displays daily quests with progress and completion status
 */

import React from "react";
import { cn } from "@/lib/utils";
import type { DailyQuest } from "@/lib/gamification";

interface QuestCardProps {
  quest: DailyQuest;
  isCompleted: boolean;
  progress?: number;
  onComplete?: () => void;
  className?: string;
}

export function QuestCard({
  quest,
  isCompleted,
  progress = 0,
  onComplete,
  className,
}: QuestCardProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-between p-3 rounded-lg border transition-all",
        isCompleted
          ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
          : "bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-600",
        className,
      )}
    >
      {/* Checkbox */}
      <div className="flex items-center gap-3">
        <button
          onClick={onComplete}
          disabled={isCompleted}
          className={cn(
            "w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all",
            isCompleted
              ? "bg-green-500 border-green-500 text-white"
              : "border-gray-300 dark:border-slate-600 hover:border-blue-500 dark:hover:border-blue-400",
          )}
        >
          {isCompleted && <span className="text-sm"></span>}
        </button>

        {/* Quest info */}
        <div className="flex flex-col">
          <span
            className={cn(
              "font-medium",
              isCompleted
                ? "text-green-700 dark:text-green-400 line-through"
                : "text-gray-900 dark:text-white",
            )}
          >
            {quest.name}
          </span>
          <span className="text-sm text-gray-500 dark:text-slate-400">
            {quest.description}
          </span>
        </div>
      </div>

      {/* Reward */}
      <div className="flex items-center gap-2">
        {quest.bonusReward?.emoji && (
          <span className="text-lg">{quest.bonusReward.emoji}</span>
        )}
        <span
          className={cn(
            "font-semibold",
            isCompleted
              ? "text-green-600 dark:text-green-400"
              : "text-blue-600 dark:text-blue-400",
          )}
        >
          +{quest.xpReward} XP
        </span>
      </div>
    </div>
  );
}

export default QuestCard;
