"use client";

/**
 * Chart Controls Component
 *
 * Reusable toolbar for trading charts providing:
 * - Timeframe/interval selector (1m, 5m, 15m, 1h, 4h, 1D, 1W, 1M)
 * - Chart type selector (candlestick, heikin ashi, line, area)
 * - Indicator toggle panel (overlays + oscillators)
 * - Responsive layout with collapsible indicator panel
 */

import React, { useState, useCallback } from "react";
import type {
  ChartType,
  Timeframe,
  IndicatorSettings,
} from "./TradingChart";

// ============================================================================
// TYPES
// ============================================================================

export interface ChartControlsProps {
  /** Currently selected timeframe */
  timeframe: Timeframe;
  /** Callback when timeframe changes */
  onTimeframeChange: (timeframe: Timeframe) => void;
  /** Currently selected chart type */
  chartType: ChartType;
  /** Callback when chart type changes */
  onChartTypeChange: (chartType: ChartType) => void;
  /** Current indicator settings */
  indicators: IndicatorSettings;
  /** Callback when indicator settings change */
  onIndicatorsChange: (indicators: IndicatorSettings) => void;
  /** Optional className for outer container */
  className?: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

export const TIMEFRAMES: {
  value: Timeframe;
  label: string;
  shortLabel: string;
}[] = [
  { value: "1m", label: "1 Minute", shortLabel: "1m" },
  { value: "5m", label: "5 Minutes", shortLabel: "5m" },
  { value: "15m", label: "15 Minutes", shortLabel: "15m" },
  { value: "1h", label: "1 Hour", shortLabel: "1H" },
  { value: "4h", label: "4 Hours", shortLabel: "4H" },
  { value: "1d", label: "1 Day", shortLabel: "1D" },
  { value: "1w", label: "1 Week", shortLabel: "1W" },
  { value: "1M", label: "1 Month", shortLabel: "1M" },
];

export const CHART_TYPES: {
  value: ChartType;
  label: string;
}[] = [
  { value: "candlestick", label: "Candlestick" },
  { value: "heikin_ashi", label: "Heikin Ashi" },
  { value: "line", label: "Line" },
  { value: "area", label: "Area" },
];

export const INDICATOR_OPTIONS: {
  id: keyof IndicatorSettings;
  label: string;
  category: "overlay" | "oscillator";
}[] = [
  { id: "sma", label: "SMA", category: "overlay" },
  { id: "ema", label: "EMA", category: "overlay" },
  { id: "bollinger", label: "Bollinger Bands", category: "overlay" },
  { id: "vwap", label: "VWAP", category: "overlay" },
  { id: "rsi", label: "RSI", category: "oscillator" },
  { id: "macd", label: "MACD", category: "oscillator" },
];

// ============================================================================
// COMPONENT
// ============================================================================

export function ChartControls({
  timeframe,
  onTimeframeChange,
  chartType,
  onChartTypeChange,
  indicators,
  onIndicatorsChange,
  className = "",
}: ChartControlsProps) {
  const [showIndicatorPanel, setShowIndicatorPanel] = useState(false);

  const toggleIndicator = useCallback(
    (indicatorId: keyof IndicatorSettings) => {
      onIndicatorsChange({
        ...indicators,
        [indicatorId]: {
          ...indicators[indicatorId],
          enabled: !indicators[indicatorId].enabled,
        },
      });
    },
    [indicators, onIndicatorsChange],
  );

  const activeIndicatorCount = INDICATOR_OPTIONS.filter(
    (ind) => indicators[ind.id].enabled,
  ).length;

  return (
    <div className={`chart-controls ${className}`} data-testid="chart-controls">
      {/* Toolbar Row */}
      <div
        className="flex items-center justify-between px-4 py-2 bg-gray-800/50 border-b border-gray-700"
        role="toolbar"
        aria-label="Chart controls"
      >
        {/* Timeframe Selector */}
        <div
          className="flex items-center gap-1"
          role="radiogroup"
          aria-label="Timeframe"
        >
          {TIMEFRAMES.map((tf) => (
            <button
              key={tf.value}
              onClick={() => onTimeframeChange(tf.value)}
              className={`px-2.5 py-1 text-sm rounded transition-colors ${
                timeframe === tf.value
                  ? "bg-blue-600 text-white"
                  : "text-gray-400 hover:text-white hover:bg-gray-700"
              }`}
              role="radio"
              aria-checked={timeframe === tf.value}
              aria-label={tf.label}
              title={tf.label}
            >
              {tf.shortLabel}
            </button>
          ))}
        </div>

        {/* Chart Type & Indicators */}
        <div className="flex items-center gap-2">
          {/* Chart Type Selector */}
          <div
            className="flex items-center gap-1 border-r border-gray-700 pr-2 mr-2"
            role="radiogroup"
            aria-label="Chart type"
          >
            {CHART_TYPES.map((ct) => (
              <button
                key={ct.value}
                onClick={() => onChartTypeChange(ct.value)}
                className={`px-2 py-1 text-sm rounded transition-colors ${
                  chartType === ct.value
                    ? "bg-blue-600 text-white"
                    : "text-gray-400 hover:text-white hover:bg-gray-700"
                }`}
                role="radio"
                aria-checked={chartType === ct.value}
                aria-label={ct.label}
                title={ct.label}
              >
                {ct.label}
              </button>
            ))}
          </div>

          {/* Indicators Toggle */}
          <button
            onClick={() => setShowIndicatorPanel(!showIndicatorPanel)}
            className={`px-3 py-1 text-sm rounded transition-colors ${
              showIndicatorPanel
                ? "bg-purple-600 text-white"
                : "text-gray-400 hover:text-white hover:bg-gray-700"
            }`}
            aria-expanded={showIndicatorPanel}
            aria-controls="indicator-panel"
            data-testid="indicators-toggle"
          >
            Indicators
            {activeIndicatorCount > 0 && (
              <span
                className="ml-1.5 inline-flex items-center justify-center w-5 h-5 text-xs bg-blue-500 text-white rounded-full"
                data-testid="indicator-count"
              >
                {activeIndicatorCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Indicator Panel */}
      {showIndicatorPanel && (
        <div
          id="indicator-panel"
          className="px-4 py-2 bg-gray-800/30 border-b border-gray-700"
          data-testid="indicator-panel"
        >
          <div className="flex flex-wrap items-center gap-2">
            {/* Overlays */}
            <span className="text-xs text-gray-500 mr-2">Overlays:</span>
            {INDICATOR_OPTIONS.filter((i) => i.category === "overlay").map(
              (ind) => (
                <button
                  key={ind.id}
                  onClick={() => toggleIndicator(ind.id)}
                  className={`px-2.5 py-1 text-xs rounded transition-colors ${
                    indicators[ind.id].enabled
                      ? "bg-blue-600 text-white"
                      : "bg-gray-700 text-gray-400 hover:bg-gray-600"
                  }`}
                  role="switch"
                  aria-checked={indicators[ind.id].enabled}
                  aria-label={`Toggle ${ind.label}`}
                  data-testid={`indicator-${ind.id}`}
                >
                  {ind.label}
                </button>
              ),
            )}

            {/* Oscillators */}
            <span className="text-xs text-gray-500 ml-4 mr-2">
              Oscillators:
            </span>
            {INDICATOR_OPTIONS.filter((i) => i.category === "oscillator").map(
              (ind) => (
                <button
                  key={ind.id}
                  onClick={() => toggleIndicator(ind.id)}
                  className={`px-2.5 py-1 text-xs rounded transition-colors ${
                    indicators[ind.id].enabled
                      ? "bg-purple-600 text-white"
                      : "bg-gray-700 text-gray-400 hover:bg-gray-600"
                  }`}
                  role="switch"
                  aria-checked={indicators[ind.id].enabled}
                  aria-label={`Toggle ${ind.label}`}
                  data-testid={`indicator-${ind.id}`}
                >
                  {ind.label}
                </button>
              ),
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default ChartControls;
