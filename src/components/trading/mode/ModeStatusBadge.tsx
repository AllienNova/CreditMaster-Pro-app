"use client";

/**
 * ModeStatusBadge
 *
 * Displays the current operating mode as a color-coded badge/chip.
 * WATCH = blue, GUIDED = amber, AUTONOMOUS = green.
 */

import type { OperatingMode } from "@/lib/trading/modes/mode-types";

// ============================================================================
// TYPES
// ============================================================================

export interface ModeStatusBadgeProps {
  /** The current operating mode */
  mode: OperatingMode;
  /** Badge size variant */
  size?: "sm" | "md" | "lg";
  /** Additional CSS classes */
  className?: string;
}

// ============================================================================
// MODE CONFIGURATION
// ============================================================================

const MODE_CONFIG: Record<
  OperatingMode,
  { label: string; icon: string; bg: string; text: string; ring: string }
> = {
  watch: {
    label: "WATCH",
    icon: "\uD83D\uDC41\uFE0F",
    bg: "bg-blue-100 dark:bg-blue-900/30",
    text: "text-blue-700 dark:text-blue-300",
    ring: "ring-blue-500/20",
  },
  guided: {
    label: "GUIDED",
    icon: "\uD83E\uDDED",
    bg: "bg-amber-100 dark:bg-amber-900/30",
    text: "text-amber-700 dark:text-amber-300",
    ring: "ring-amber-500/20",
  },
  autonomous: {
    label: "AUTONOMOUS",
    icon: "\uD83D\uDE80",
    bg: "bg-green-100 dark:bg-green-900/30",
    text: "text-green-700 dark:text-green-300",
    ring: "ring-green-500/20",
  },
};

const SIZE_CLASSES: Record<"sm" | "md" | "lg", string> = {
  sm: "px-2 py-0.5 text-xs gap-1",
  md: "px-3 py-1 text-sm gap-1.5",
  lg: "px-4 py-1.5 text-base gap-2",
};

// ============================================================================
// COMPONENT
// ============================================================================

export function ModeStatusBadge({
  mode,
  size = "md",
  className = "",
}: ModeStatusBadgeProps) {
  const config = MODE_CONFIG[mode];
  const sizeClass = SIZE_CLASSES[size];

  return (
    <span
      className={`inline-flex items-center font-semibold rounded-full ring-1 ${config.bg} ${config.text} ${config.ring} ${sizeClass} ${className}`}
      role="status"
      aria-label={`Trading mode: ${config.label}`}
    >
      <span aria-hidden="true">{config.icon}</span>
      {config.label}
    </span>
  );
}

export default ModeStatusBadge;
