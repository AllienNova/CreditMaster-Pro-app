"use client";

/**
 * Badge Card Component
 * Displays achievement badges with rarity, progress, and earned status
 */

import React from "react";
import { cn } from "@/lib/utils";
import type { BadgeDefinition, BadgeRarity } from "@/lib/gamification";

interface BadgeCardProps {
  badge: BadgeDefinition;
  isEarned: boolean;
  earnedDate?: string;
  progress?: number;
  onClick?: () => void;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const rarityStyles: Record<
  BadgeRarity,
  { border: string; bg: string; glow: string }
> = {
  common: {
    border: "border-gray-300 dark:border-slate-600",
    bg: "bg-gray-50 dark:bg-slate-800",
    glow: "",
  },
  uncommon: {
    border: "border-green-400 dark:border-green-500",
    bg: "bg-green-50 dark:bg-green-900/20",
    glow: "shadow-green-200 dark:shadow-green-900/30",
  },
  rare: {
    border: "border-blue-400 dark:border-blue-500",
    bg: "bg-blue-50 dark:bg-blue-900/20",
    glow: "shadow-blue-200 dark:shadow-blue-900/30",
  },
  epic: {
    border: "border-blue-400 dark:border-blue-500",
    bg: "bg-blue-50 dark:bg-blue-900/20",
    glow: "shadow-purple-200 dark:shadow-purple-900/30",
  },
  legendary: {
    border: "border-yellow-400 dark:border-yellow-500",
    bg: "bg-gradient-to-br from-yellow-50 to-amber-50 dark:from-yellow-900/20 dark:to-amber-900/20",
    glow: "shadow-yellow-200 dark:shadow-yellow-900/30 shadow-lg",
  },
};

const sizeConfig = {
  sm: { card: "w-20 p-2", icon: "text-2xl", text: "text-[10px]" },
  md: { card: "w-28 p-3", icon: "text-3xl", text: "text-xs" },
  lg: { card: "w-36 p-4", icon: "text-4xl", text: "text-sm" },
};

export function BadgeCard({
  badge,
  isEarned,
  earnedDate,
  progress = 0,
  onClick,
  size = "md",
  className,
}: BadgeCardProps) {
  const rarity = rarityStyles[badge.rarity];
  const sizes = sizeConfig[size];

  return (
    <button
      onClick={onClick}
      disabled={!onClick}
      className={cn(
        "relative flex flex-col items-center rounded-xl border-2 transition-all",
        sizes.card,
        rarity.border,
        rarity.bg,
        isEarned ? rarity.glow : "opacity-60 grayscale",
        onClick && "hover:scale-105 cursor-pointer",
        !onClick && "cursor-default",
        className,
      )}
    >
      {/* Earned checkmark */}
      {isEarned && (
        <div className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
          <span className="text-white text-xs"></span>
        </div>
      )}

      {/* Lock icon for locked badges */}
      {!isEarned && progress === 0 && (
        <div className="absolute -top-1 -right-1 w-5 h-5 bg-gray-400 rounded-full flex items-center justify-center">
          <span className="text-white text-xs"></span>
        </div>
      )}

      {/* Badge icon */}
      <span className={cn("mb-1", sizes.icon)}>{badge.icon}</span>

      {/* Badge name */}
      <span
        className={cn(
          "font-semibold text-center text-gray-900 dark:text-white line-clamp-2",
          sizes.text,
        )}
      >
        {badge.name}
      </span>

      {/* Rarity label */}
      <span
        className={cn(
          "mt-1 capitalize",
          sizes.text,
          badge.rarity === "common" && "text-gray-500 dark:text-slate-400",
          badge.rarity === "uncommon" && "text-green-600 dark:text-green-400",
          badge.rarity === "rare" && "text-blue-600 dark:text-blue-400",
          badge.rarity === "epic" && "text-blue-600 dark:text-blue-400",
          badge.rarity === "legendary" &&
            "text-yellow-600 dark:text-yellow-400",
        )}
      >
        {badge.rarity}
      </span>

      {/* XP reward */}
      <span className={cn("text-gray-500 dark:text-slate-400", sizes.text)}>
        +{badge.xpReward} XP
      </span>

      {/* Progress bar for in-progress badges */}
      {!isEarned && progress > 0 && progress < 100 && (
        <div className="w-full mt-2">
          <div className="h-1 bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span
            className={cn(
              "text-gray-500 dark:text-slate-400 mt-0.5 block",
              sizes.text,
            )}
          >
            {progress}%
          </span>
        </div>
      )}

      {/* Earned date */}
      {isEarned && earnedDate && (
        <span
          className={cn("text-gray-400 dark:text-slate-500 mt-1", sizes.text)}
        >
          {new Date(earnedDate).toLocaleDateString()}
        </span>
      )}
    </button>
  );
}

export default BadgeCard;
