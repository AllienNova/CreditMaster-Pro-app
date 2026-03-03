"use client";

/**
 * ModePermissionsCard
 *
 * Displays what actions are allowed in the current operating mode.
 * Fetches permissions from the API and renders a checklist.
 */

import React, { useState, useEffect } from "react";
import type { ModePermissions } from "@/lib/trading/modes/mode-types";
import { ModeStatusBadge } from "./ModeStatusBadge";

// ============================================================================
// TYPES
// ============================================================================

export interface ModePermissionsCardProps {
  /** Additional CSS classes */
  className?: string;
}

// ============================================================================
// PERMISSION DISPLAY CONFIG
// ============================================================================

interface PermissionItem {
  key: keyof Omit<ModePermissions, "mode">;
  label: string;
  description: string;
}

const PERMISSION_ITEMS: PermissionItem[] = [
  {
    key: "canViewSignals",
    label: "View Trading Signals",
    description: "See AI-generated trade signals and recommendations",
  },
  {
    key: "canPaperTrade",
    label: "Paper Trading",
    description: "Execute simulated trades with virtual funds",
  },
  {
    key: "canPlaceLiveOrders",
    label: "Live Orders",
    description: "Place real orders with actual funds",
  },
  {
    key: "requiresConfirmation",
    label: "Requires Confirmation",
    description: "Orders need manual confirmation before execution",
  },
  {
    key: "canAutoExecute",
    label: "Auto-Execute Trades",
    description: "System can execute trades without confirmation",
  },
];

// ============================================================================
// COMPONENT
// ============================================================================

export function ModePermissionsCard({ className = "" }: ModePermissionsCardProps) {
  const [permissions, setPermissions] = useState<ModePermissions | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchPermissions() {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/trading/modes/permissions");
        if (!res.ok) {
          throw new Error(`Failed to fetch permissions: ${res.status}`);
        }
        const data = await res.json();
        setPermissions(data.data ?? data);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load permissions",
        );
      } finally {
        setIsLoading(false);
      }
    }
    fetchPermissions();
  }, []);

  // Loading state
  if (isLoading) {
    return (
      <div
        className={`bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6 ${className}`}
      >
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded" />
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded" />
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded" />
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded" />
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded" />
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error && !permissions) {
    return (
      <div
        className={`bg-white dark:bg-gray-900 rounded-xl border border-red-200 dark:border-red-800 p-6 ${className}`}
      >
        <div className="text-center">
          <p className="text-red-600 dark:text-red-400 font-medium">
            Error loading permissions
          </p>
          <p className="text-sm text-red-500 dark:text-red-400 mt-1">
            {error}
          </p>
        </div>
      </div>
    );
  }

  if (!permissions) return null;

  return (
    <div
      className={`bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6 ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Mode Permissions
        </h3>
        <ModeStatusBadge mode={permissions.mode} size="sm" />
      </div>

      {/* Permissions list */}
      <ul className="space-y-3">
        {PERMISSION_ITEMS.map((item) => {
          const isEnabled = permissions[item.key];
          return (
            <li key={item.key} className="flex items-start gap-3">
              <span
                className={`mt-0.5 flex-shrink-0 ${
                  isEnabled
                    ? "text-green-500"
                    : "text-red-500"
                }`}
                aria-hidden="true"
              >
                {isEnabled ? "\u2713" : "\u2717"}
              </span>
              <div>
                <p
                  className={`text-sm font-medium ${
                    isEnabled
                      ? "text-gray-900 dark:text-white"
                      : "text-gray-400 dark:text-gray-500"
                  }`}
                >
                  {item.label}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {item.description}
                </p>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default ModePermissionsCard;
