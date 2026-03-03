"use client";

/**
 * GraduationProgress
 *
 * Displays progress toward mode graduation with a criteria checklist,
 * progress bars, and a graduate button.
 */

import React, { useState, useEffect, useCallback } from "react";
import type {
  OperatingMode,
  GraduationProgressReport,
  GraduationProgress as GraduationProgressType,
} from "@/lib/trading/modes/mode-types";
import { ModeStatusBadge } from "./ModeStatusBadge";

// ============================================================================
// TYPES
// ============================================================================

export interface GraduationProgressProps {
  /** Additional CSS classes */
  className?: string;
  /** Callback when graduation succeeds */
  onGraduate?: (newMode: OperatingMode) => void;
}

// ============================================================================
// HELPER: Format criterion name for display
// ============================================================================

function formatCriterionLabel(key: string): string {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (c) => c.toUpperCase())
    .replace(/_/g, " ")
    .trim();
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

function CriterionRow({
  label,
  progress,
}: {
  label: string;
  progress: GraduationProgressType;
}) {
  const isBooleanCriterion =
    typeof progress.required === "boolean" ||
    typeof progress.current === "boolean";

  if (isBooleanCriterion) {
    const currentBool = Boolean(progress.current);
    return (
      <li className="flex items-center justify-between py-2">
        <div className="flex items-center gap-2">
          {progress.met ? (
            <span
              className="text-green-500"
              aria-label={`${label}: met`}
            >
              &#10003;
            </span>
          ) : (
            <span
              className="text-red-500"
              aria-label={`${label}: not met`}
            >
              &#10007;
            </span>
          )}
          <span className="text-sm text-gray-700 dark:text-gray-300">
            {label}
          </span>
        </div>
        <span
          className={`text-sm font-medium ${
            currentBool
              ? "text-green-600 dark:text-green-400"
              : "text-red-600 dark:text-red-400"
          }`}
        >
          {currentBool ? "Yes" : "No"}
        </span>
      </li>
    );
  }

  // Numeric criterion with progress bar
  const current = Number(progress.current);
  const required = Number(progress.required);
  const percentage = required > 0 ? Math.min((current / required) * 100, 100) : 0;

  return (
    <li className="py-2">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          {progress.met ? (
            <span
              className="text-green-500"
              aria-label={`${label}: met`}
            >
              &#10003;
            </span>
          ) : (
            <span
              className="text-red-500"
              aria-label={`${label}: not met`}
            >
              &#10007;
            </span>
          )}
          <span className="text-sm text-gray-700 dark:text-gray-300">
            {label}
          </span>
        </div>
        <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
          {current} / {required}
        </span>
      </div>
      <div
        className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden"
        role="progressbar"
        aria-valuenow={current}
        aria-valuemin={0}
        aria-valuemax={required}
        aria-label={`${label}: ${current} of ${required}`}
      >
        <div
          className={`h-full rounded-full transition-all duration-300 ${
            progress.met ? "bg-green-500" : "bg-blue-500"
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </li>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function GraduationProgress({
  className = "",
  onGraduate,
}: GraduationProgressProps) {
  const [report, setReport] = useState<GraduationProgressReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isGraduating, setIsGraduating] = useState(false);

  useEffect(() => {
    async function fetchProgress() {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/trading/modes/progress");
        if (!res.ok) {
          throw new Error(`Failed to fetch progress: ${res.status}`);
        }
        const data = await res.json();
        setReport(data.data ?? data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load progress");
      } finally {
        setIsLoading(false);
      }
    }
    fetchProgress();
  }, []);

  const handleGraduate = useCallback(async () => {
    if (!report || !report.allCriteriaMet || !report.nextMode) return;
    setIsGraduating(true);
    setError(null);
    try {
      const res = await fetch("/api/trading/modes/graduate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) {
        throw new Error(`Graduation failed: ${res.status}`);
      }
      const data = await res.json();
      const newMode: OperatingMode = data.data?.currentMode ?? report.nextMode;
      onGraduate?.(newMode);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Graduation failed");
    } finally {
      setIsGraduating(false);
    }
  }, [report, onGraduate]);

  // Loading state
  if (isLoading) {
    return (
      <div className={`bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6 ${className}`}>
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
          <div className="space-y-3">
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded" />
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded" />
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded" />
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error && !report) {
    return (
      <div className={`bg-white dark:bg-gray-900 rounded-xl border border-red-200 dark:border-red-800 p-6 ${className}`}>
        <div className="text-center">
          <p className="text-red-600 dark:text-red-400 font-medium">
            Error loading graduation progress
          </p>
          <p className="text-sm text-red-500 dark:text-red-400 mt-1">
            {error}
          </p>
        </div>
      </div>
    );
  }

  if (!report) return null;

  const criteriaEntries = Object.entries(report.criteria);

  return (
    <div
      className={`bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6 ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Graduation Progress
        </h3>
      </div>

      {/* Mode transition */}
      <div className="flex items-center gap-3 mb-6">
        <ModeStatusBadge mode={report.currentMode} size="sm" />
        {report.nextMode && (
          <>
            <span className="text-gray-400" aria-hidden="true">
              &rarr;
            </span>
            <ModeStatusBadge mode={report.nextMode} size="sm" />
          </>
        )}
      </div>

      {/* Criteria list */}
      {criteriaEntries.length > 0 ? (
        <ul className="divide-y divide-gray-100 dark:divide-gray-800 mb-6">
          {criteriaEntries.map(([key, progress]) => (
            <CriterionRow
              key={key}
              label={formatCriterionLabel(key)}
              progress={progress}
            />
          ))}
        </ul>
      ) : (
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
          No criteria available for the current mode.
        </p>
      )}

      {/* Summary */}
      {report.summary && (
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          {report.summary}
        </p>
      )}

      {/* Error message from graduation attempt */}
      {error && (
        <p className="text-sm text-red-600 dark:text-red-400 mb-4" role="alert">
          {error}
        </p>
      )}

      {/* Graduate button */}
      {report.nextMode && (
        <button
          onClick={handleGraduate}
          disabled={!report.allCriteriaMet || isGraduating}
          aria-label={
            report.allCriteriaMet
              ? `Graduate to ${report.nextMode} mode`
              : "Graduation criteria not yet met"
          }
          className={`w-full py-2.5 px-4 rounded-lg font-medium text-sm transition-colors ${
            report.allCriteriaMet
              ? "bg-green-600 hover:bg-green-700 text-white"
              : "bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed"
          } disabled:opacity-60`}
        >
          {isGraduating
            ? "Graduating..."
            : report.allCriteriaMet
              ? `Graduate to ${report.nextMode.charAt(0).toUpperCase() + report.nextMode.slice(1)}`
              : "Criteria Not Met"}
        </button>
      )}
    </div>
  );
}

export default GraduationProgress;
