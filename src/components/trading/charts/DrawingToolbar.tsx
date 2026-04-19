"use client";

/**
 * Drawing Toolbar
 *
 * Horizontal toolbar for selecting and managing chart drawing tools.
 * Tools: Trendline, Horizontal Line, Fibonacci retracement.
 * Also provides clear-all and visibility toggle actions.
 */

import React from "react";
import { TrendingUp, Minus, BarChart3, Trash2, Eye, EyeOff } from "lucide-react";
import type { DrawingType } from "@/lib/trading/charts/drawing-engine";

// ============================================================================
// TYPES
// ============================================================================

export interface DrawingToolbarProps {
  activeTool: DrawingType | null;
  onToolSelect: (tool: DrawingType | null) => void;
  onClear: () => void;
  onToggleVisibility: () => void;
  drawingsVisible: boolean;
}

// ============================================================================
// COMPONENT
// ============================================================================

const TOOLS: { type: DrawingType; label: string; Icon: React.ElementType }[] = [
  { type: "trendline",  label: "Trendline",       Icon: TrendingUp },
  { type: "horizontal", label: "Horizontal Line",  Icon: Minus      },
  { type: "fibonacci",  label: "Fibonacci",        Icon: BarChart3  },
];

export function DrawingToolbar({
  activeTool,
  onToolSelect,
  onClear,
  onToggleVisibility,
  drawingsVisible,
}: DrawingToolbarProps) {
  function handleToolClick(type: DrawingType) {
    // Clicking the active tool deselects it
    onToolSelect(activeTool === type ? null : type);
  }

  return (
    <div className="flex items-center gap-1 bg-gray-800 border border-gray-700 rounded px-2 py-1">
      {/* Drawing tool buttons */}
      {TOOLS.map(({ type, label, Icon }) => (
        <button
          key={type}
          onClick={() => handleToolClick(type)}
          aria-label={label}
          aria-pressed={activeTool === type}
          title={label}
          className={[
            "flex items-center justify-center w-7 h-7 rounded transition-colors duration-150",
            activeTool === type
              ? "bg-emerald-600 text-white"
              : "text-gray-300 hover:bg-gray-700 hover:text-white",
          ].join(" ")}
        >
          <Icon size={15} />
        </button>
      ))}

      {/* Divider */}
      <div className="w-px h-5 bg-gray-600 mx-1" />

      {/* Toggle visibility */}
      <button
        onClick={onToggleVisibility}
        aria-label={drawingsVisible ? "Hide drawings" : "Show drawings"}
        title={drawingsVisible ? "Hide drawings" : "Show drawings"}
        className="flex items-center justify-center w-7 h-7 rounded text-gray-300 hover:bg-gray-700 hover:text-white transition-colors duration-150"
      >
        {drawingsVisible ? <Eye size={15} /> : <EyeOff size={15} />}
      </button>

      {/* Clear all */}
      <button
        onClick={onClear}
        aria-label="Clear all drawings"
        title="Clear all drawings"
        className="flex items-center justify-center w-7 h-7 rounded text-gray-300 hover:bg-red-700 hover:text-white transition-colors duration-150"
      >
        <Trash2 size={15} />
      </button>
    </div>
  );
}

export default DrawingToolbar;
