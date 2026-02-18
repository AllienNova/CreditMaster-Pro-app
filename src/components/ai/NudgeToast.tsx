"use client";

import { Icon } from "@/components/ui/Icon";
/**
 * Nudge Toast Component
 * Displays AI nudges as dismissible notifications
 */

import React from "react";
import { cn } from "@/lib/utils";
import type { NudgeHistory, NudgeAction } from "@/lib/ai-personalization";

interface NudgeToastProps {
  nudge: NudgeHistory;
  onAccept: () => void;
  onDismiss: () => void;
  onSnooze?: () => void;
  className?: string;
}

const typeStyles = {
  motivational: { icon: "sparkles", color: "border-blue-500" },
  progress: { icon: "sparkles", color: "border-green-500" },
  warning: { icon: "sparkles", color: "border-amber-500" },
  celebration: { icon: "sparkles", color: "border-blue-500" },
  reminder: { icon: "sparkles", color: "border-orange-500" },
  insight: { icon: "sparkles", color: "border-blue-500" },
  coaching: { icon: "sparkles", color: "border-blue-500" },
};

export function NudgeToast({
  nudge,
  onAccept,
  onDismiss,
  onSnooze,
  className,
}: NudgeToastProps) {
  const style = typeStyles[nudge.nudgeType];

  return (
    <div
      className={cn(
        "bg-white dark:bg-slate-800 rounded-xl shadow-lg border-l-4 p-4 max-w-sm",
        style.color,
        className,
      )}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <Icon name={style.icon} className="text-2xl inline-block" />

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-gray-900 dark:text-white">
            {nudge.title}
          </h4>
          <p className="mt-1 text-sm text-gray-600 dark:text-slate-300">
            {nudge.message}
          </p>

          {/* Actions */}
          <div className="mt-3 flex items-center gap-2">
            <button
              onClick={onAccept}
              className="px-3 py-1.5 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Got it
            </button>
            {onSnooze && (
              <button
                onClick={onSnooze}
                className="px-3 py-1.5 text-sm font-medium text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
              >
                Snooze
              </button>
            )}
            <button
              onClick={onDismiss}
              className="px-3 py-1.5 text-sm font-medium text-gray-400 hover:text-gray-600 dark:text-slate-300 dark:hover:text-gray-300 transition-colors"
            >
              Dismiss
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default NudgeToast;
