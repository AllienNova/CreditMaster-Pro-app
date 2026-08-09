"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { PreApprovalOdds } from "@/lib/commerce/matching/pre-approval-calculator";

// =============================================================================
// Types
// =============================================================================

interface PreApprovalBadgeProps {
  odds: PreApprovalOdds;
  compact?: boolean;
  className?: string;
}

// =============================================================================
// Config
// =============================================================================

const LIKELIHOOD_CONFIG = {
  excellent: {
    label: "Excellent Odds",
    badgeClasses:
      "bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-900/30 dark:text-emerald-300 dark:ring-emerald-500/30",
    barClasses: "bg-emerald-500",
    iconClasses: "text-emerald-500",
  },
  good: {
    label: "Good Odds",
    badgeClasses:
      "bg-blue-50 text-blue-700 ring-blue-600/20 dark:bg-blue-900/30 dark:text-blue-300 dark:ring-blue-500/30",
    barClasses: "bg-blue-500",
    iconClasses: "text-blue-500",
  },
  fair: {
    label: "Fair Odds",
    badgeClasses:
      "bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-900/30 dark:text-amber-300 dark:ring-amber-500/30",
    barClasses: "bg-amber-500",
    iconClasses: "text-amber-500",
  },
  poor: {
    label: "Low Odds",
    badgeClasses:
      "bg-red-50 text-red-700 ring-red-600/20 dark:bg-red-900/30 dark:text-red-300 dark:ring-red-500/30",
    barClasses: "bg-red-500",
    iconClasses: "text-red-500",
  },
} as const;

const IMPACT_CONFIG = {
  positive: {
    icon: (
      <svg className="h-4 w-4 text-emerald-500" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
      </svg>
    ),
  },
  neutral: {
    icon: (
      <svg className="h-4 w-4 text-gray-400 dark:text-slate-500" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM6.75 9.25a.75.75 0 000 1.5h6.5a.75.75 0 000-1.5h-6.5z" clipRule="evenodd" />
      </svg>
    ),
  },
  negative: {
    icon: (
      <svg className="h-4 w-4 text-red-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
      </svg>
    ),
  },
};

// =============================================================================
// Component
// =============================================================================

export default function PreApprovalBadge({
  odds,
  compact = false,
  className = "",
}: PreApprovalBadgeProps) {
  const [expanded, setExpanded] = useState(false);
  const config = LIKELIHOOD_CONFIG[odds.likelihood];

  return (
    <div className={`w-full ${className}`}>
      {/* Badge row */}
      <button
        type="button"
        onClick={() => !compact && setExpanded((prev) => !prev)}
        disabled={compact}
        className={[
          "inline-flex items-center gap-2 rounded-full px-3 py-1.5",
          "text-sm font-medium ring-1 ring-inset",
          "transition-colors duration-150",
          config.badgeClasses,
          compact ? "cursor-default" : "cursor-pointer",
        ].join(" ")}
        aria-expanded={compact ? undefined : expanded}
        aria-label={
          compact
            ? undefined
            : `${config.label}, ${odds.probability}%. ${expanded ? "Collapse" : "Expand"} details`
        }
      >
        {/* Probability bar */}
        <span className="flex items-center gap-1.5">
          <span
            className={`inline-block h-2 w-16 overflow-hidden rounded-full bg-current/20`}
            aria-hidden="true"
          >
            <span
              className={`block h-full rounded-full ${config.barClasses}`}
              style={{ width: `${odds.probability}%` }}
            />
          </span>
          <span>{config.label}</span>
          <span className="tabular-nums">{odds.probability}%</span>
        </span>

        {/* Hard inquiry warning */}
        {odds.creditImpact.hardInquiry && (
          <span
            title="This application may result in a hard inquiry"
            className="ml-0.5"
            aria-label="Hard inquiry warning"
          >
            <svg
              className="h-3.5 w-3.5 opacity-60"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z"
                clipRule="evenodd"
              />
            </svg>
          </span>
        )}

        {/* Chevron for non-compact */}
        {!compact && (
          <motion.span
            animate={{ rotate: expanded ? 180 : 0 }}
            transition={{ duration: 0.2 }}
            className="ml-auto"
            aria-hidden="true"
          >
            <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                clipRule="evenodd"
              />
            </svg>
          </motion.span>
        )}
      </button>

      {/* Expanded detail panel */}
      {!compact && (
        <AnimatePresence initial={false}>
          {expanded && (
            <motion.div
              key="detail"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.22, ease: "easeInOut" }}
              className="overflow-hidden"
            >
              <div className="mt-3 space-y-3 rounded-lg border border-gray-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800/60">
                {/* Factors list */}
                <ul className="space-y-2.5" role="list" aria-label="Approval factors">
                  {odds.factors.map((factor) => (
                    <li key={factor.name} className="flex items-start gap-2.5">
                      <span className="mt-0.5 flex-shrink-0">
                        {IMPACT_CONFIG[factor.impact].icon}
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-800 dark:text-slate-200">
                          {factor.name}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-slate-400">
                          {factor.detail}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>

                {/* Hard inquiry detail */}
                {odds.creditImpact.hardInquiry && (
                  <div className="flex items-start gap-2 rounded-md bg-amber-50 px-3 py-2 dark:bg-amber-900/20">
                    <svg
                      className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-500"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      aria-hidden="true"
                    >
                      <path
                        fillRule="evenodd"
                        d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <p className="text-xs text-amber-700 dark:text-amber-300">
                      Applying may result in a hard inquiry, which could temporarily
                      lower your score by approximately{" "}
                      {odds.creditImpact.estimatedScoreDrop} points.
                    </p>
                  </div>
                )}

                {/* Disclaimer */}
                <p className="text-xs leading-relaxed text-gray-400 dark:text-slate-500">
                  {odds.disclaimer}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </div>
  );
}
