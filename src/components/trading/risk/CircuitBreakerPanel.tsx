"use client";

/**
 * CircuitBreakerPanel
 *
 * Displays circuit breaker status with active/triggered/healthy indicators.
 * Shows kill switch state, block reasons, and drawdown scaling status.
 */

import React from "react";

// ============================================================================
// TYPES
// ============================================================================

export type CircuitBreakerStatus = "healthy" | "warning" | "triggered";

export interface CircuitBreaker {
  /** Unique identifier for this circuit breaker */
  id: string;
  /** Display name */
  name: string;
  /** Current status */
  status: CircuitBreakerStatus;
  /** Description of what this breaker monitors */
  description: string;
  /** Current metric value (human-readable) */
  currentValue?: string;
  /** Threshold that triggers this breaker (human-readable) */
  threshold?: string;
  /** When this breaker was last triggered */
  lastTriggered?: string;
}

export interface CircuitBreakerPanelProps {
  /** Array of circuit breaker states */
  breakers: CircuitBreaker[];
  /** Whether the kill switch is currently active */
  killSwitchActive: boolean;
  /** Reason for kill switch activation */
  killSwitchReason?: string;
  /** Whether trading is currently allowed */
  canTrade: boolean;
  /** Reasons why trading is blocked */
  blockReasons: string[];
  /** Callback when the reset kill switch button is pressed */
  onResetKillSwitch?: () => void;
  /** Whether data is loading */
  loading?: boolean;
  /** Additional CSS classes */
  className?: string;
}

// ============================================================================
// STATUS CONFIG
// ============================================================================

const STATUS_CONFIG: Record<
  CircuitBreakerStatus,
  { icon: string; bg: string; text: string; ring: string; dot: string }
> = {
  healthy: {
    icon: "OK",
    bg: "bg-green-50 dark:bg-green-900/20",
    text: "text-green-700 dark:text-green-300",
    ring: "ring-green-500/20",
    dot: "bg-green-500",
  },
  warning: {
    icon: "!",
    bg: "bg-amber-50 dark:bg-amber-900/20",
    text: "text-amber-700 dark:text-amber-300",
    ring: "ring-amber-500/20",
    dot: "bg-amber-500",
  },
  triggered: {
    icon: "X",
    bg: "bg-red-50 dark:bg-red-900/20",
    text: "text-red-700 dark:text-red-300",
    ring: "ring-red-500/20",
    dot: "bg-red-500",
  },
};

// ============================================================================
// COMPONENT
// ============================================================================

export function CircuitBreakerPanel({
  breakers,
  killSwitchActive,
  killSwitchReason,
  canTrade,
  blockReasons,
  onResetKillSwitch,
  loading = false,
  className = "",
}: CircuitBreakerPanelProps) {
  const healthyCount = breakers.filter((b) => b.status === "healthy").length;
  const warningCount = breakers.filter((b) => b.status === "warning").length;
  const triggeredCount = breakers.filter(
    (b) => b.status === "triggered",
  ).length;

  if (loading) {
    return (
      <div
        className={`rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 ${className}`}
        role="status"
        aria-label="Loading circuit breaker data"
      >
        <div className="animate-pulse space-y-4">
          <div className="h-5 w-44 rounded bg-gray-300 dark:bg-gray-600" />
          <div className="h-12 w-full rounded bg-gray-200 dark:bg-gray-700" />
          <div className="space-y-3">
            <div className="h-16 rounded bg-gray-200 dark:bg-gray-700" />
            <div className="h-16 rounded bg-gray-200 dark:bg-gray-700" />
            <div className="h-16 rounded bg-gray-200 dark:bg-gray-700" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 ${className}`}
      role="region"
      aria-label="Circuit breaker panel"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Circuit Breakers
        </h3>
        <div className="flex items-center gap-3 text-xs">
          <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
            <span className="inline-block h-2 w-2 rounded-full bg-green-500" />
            {healthyCount} OK
          </span>
          {warningCount > 0 && (
            <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
              <span className="inline-block h-2 w-2 rounded-full bg-amber-500" />
              {warningCount} Warning
            </span>
          )}
          {triggeredCount > 0 && (
            <span className="flex items-center gap-1 text-red-600 dark:text-red-400">
              <span className="inline-block h-2 w-2 rounded-full bg-red-500" />
              {triggeredCount} Triggered
            </span>
          )}
        </div>
      </div>

      {/* Trading Status Banner */}
      <div
        className={`mb-4 rounded-lg p-3 ${
          canTrade
            ? "bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800"
            : "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800"
        }`}
        role="alert"
        aria-live="polite"
        data-testid="trading-status"
      >
        <div className="flex items-center gap-2">
          <span
            className={`text-sm font-bold ${canTrade ? "text-green-700 dark:text-green-300" : "text-red-700 dark:text-red-300"}`}
          >
            {canTrade ? "Trading Active" : "Trading Halted"}
          </span>
        </div>
        {!canTrade && blockReasons.length > 0 && (
          <ul className="mt-2 space-y-1" data-testid="block-reasons">
            {blockReasons.map((reason, index) => (
              <li
                key={index}
                className="text-xs text-red-600 dark:text-red-400 flex items-start gap-1"
              >
                <span className="mt-0.5 shrink-0">-</span>
                <span>{reason}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Kill Switch */}
      {killSwitchActive && (
        <div
          className="mb-4 rounded-lg border-2 border-red-500 bg-red-50 dark:bg-red-900/30 p-4"
          role="alert"
          aria-label="Kill switch active"
          data-testid="kill-switch-alert"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-red-700 dark:text-red-300">
                Kill Switch Active
              </p>
              {killSwitchReason && (
                <p
                  className="text-xs text-red-600 dark:text-red-400 mt-1"
                  data-testid="kill-switch-reason"
                >
                  {killSwitchReason}
                </p>
              )}
            </div>
            {onResetKillSwitch && (
              <button
                onClick={onResetKillSwitch}
                className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                data-testid="reset-kill-switch"
                type="button"
              >
                Reset Kill Switch
              </button>
            )}
          </div>
        </div>
      )}

      {/* Breaker List */}
      <div className="space-y-2" data-testid="breaker-list">
        {breakers.map((breaker) => {
          const config = STATUS_CONFIG[breaker.status];
          return (
            <div
              key={breaker.id}
              className={`rounded-lg border ${config.ring} ${config.bg} p-3 ring-1`}
              role="listitem"
              aria-label={`${breaker.name}: ${breaker.status}`}
              data-testid={`breaker-${breaker.id}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-2">
                  <span
                    className={`mt-0.5 inline-block h-3 w-3 shrink-0 rounded-full ${config.dot}`}
                    aria-hidden="true"
                  />
                  <div>
                    <p
                      className={`text-sm font-semibold ${config.text}`}
                    >
                      {breaker.name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {breaker.description}
                    </p>
                  </div>
                </div>
                <span
                  className={`text-xs font-bold uppercase ${config.text}`}
                  data-testid={`breaker-status-${breaker.id}`}
                >
                  {breaker.status}
                </span>
              </div>
              {(breaker.currentValue || breaker.threshold) && (
                <div className="mt-2 flex gap-4 pl-5 text-xs text-gray-500 dark:text-gray-400">
                  {breaker.currentValue && (
                    <span>
                      Current: <strong>{breaker.currentValue}</strong>
                    </span>
                  )}
                  {breaker.threshold && (
                    <span>
                      Threshold: <strong>{breaker.threshold}</strong>
                    </span>
                  )}
                </div>
              )}
              {breaker.lastTriggered && (
                <div className="mt-1 pl-5 text-xs text-gray-400 dark:text-gray-500">
                  Last triggered: {breaker.lastTriggered}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {breakers.length === 0 && (
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
          No circuit breakers configured.
        </p>
      )}
    </div>
  );
}

export default CircuitBreakerPanel;
