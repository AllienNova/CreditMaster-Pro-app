"use client";

import { Icon } from "@/components/ui/Icon";
/**
 * AI Insight Card Component
 * Displays AI-generated insights with actions
 */

import React from "react";
import { cn } from "@/lib/utils";
import type { CoachingInsight } from "@/lib/ai-personalization";

interface InsightCardProps {
  insight: CoachingInsight;
  onDismiss?: () => void;
  onAction?: () => void;
  className?: string;
}

const typeStyles = {
  observation: {
    bg: "bg-blue-50 dark:bg-blue-900/20",
    border: "border-blue-200 dark:border-blue-800",
    icon: "sparkles",
    iconBg: "bg-blue-100 dark:bg-blue-800",
  },
  suggestion: {
    bg: "bg-green-50 dark:bg-green-900/20",
    border: "border-green-200 dark:border-green-800",
    icon: "sparkles",
    iconBg: "bg-green-100 dark:bg-green-800",
  },
  warning: {
    bg: "bg-amber-50 dark:bg-amber-900/20",
    border: "border-amber-200 dark:border-amber-800",
    icon: "sparkles",
    iconBg: "bg-amber-100 dark:bg-amber-800",
  },
  celebration: {
    bg: "bg-blue-50 dark:bg-blue-900/20",
    border: "border-blue-200 dark:border-blue-800",
    icon: "sparkles",
    iconBg: "bg-blue-100 dark:bg-blue-800",
  },
};

export function InsightCard({
  insight,
  onDismiss,
  onAction,
  className,
}: InsightCardProps) {
  const style = typeStyles[insight.type];

  return (
    <div
      className={cn(
        "relative rounded-xl border p-4 transition-all",
        style.bg,
        style.border,
        className,
      )}
    >
      {/* Dismiss button */}
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 dark:text-slate-300 dark:hover:text-gray-300"
          aria-label="Dismiss"
        >
          ×
        </button>
      )}

      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className={cn("p-2 rounded-lg", style.iconBg)}>
          <span className="text-xl">{style.icon}</span>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-gray-900 dark:text-white">
            {insight.title}
          </h4>
          <p className="mt-1 text-sm text-gray-600 dark:text-slate-300">
            {insight.description}
          </p>

          {/* Action button */}
          {onAction && (
            <button
              onClick={onAction}
              className="mt-3 text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
            >
              Take action →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default InsightCard;
