"use client";

/**
 * Volume Profile Overlay
 *
 * SVG overlay rendered on the right side of the chart.
 * Horizontal bars extend leftward from the right edge, sized proportionally
 * to each price bin's volume (max bar = 30% of chart width).
 * POC bar is highlighted emerald, Value Area bars blue, outside bars gray.
 * Semi-transparent (opacity 0.6) so the chart remains visible underneath.
 */

import React, { useEffect, useRef, useState, useCallback, RefObject } from "react";
import type { IChartApi, ISeriesApi } from "lightweight-charts";
import type { OHLCV } from "@/lib/trading/charts/technical-indicators";
import { calculateVolumeProfile } from "@/lib/trading/charts/volume-profile";

// ============================================================================
// TYPES
// ============================================================================

export interface VolumeProfileOverlayProps {
  candles: OHLCV[];
  chartApi: IChartApi | null;
  seriesApi: ISeriesApi<"Candlestick"> | null;
  containerRef: RefObject<HTMLDivElement>;
  visible: boolean;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const MAX_BAR_WIDTH_RATIO = 0.3;   // max bar = 30% of chart width
const OVERLAY_OPACITY = 0.6;
const BIN_COUNT = 50;

// ============================================================================
// COMPONENT
// ============================================================================

export function VolumeProfileOverlay({
  candles,
  chartApi,
  seriesApi,
  containerRef,
  visible,
}: VolumeProfileOverlayProps) {
  const [, forceUpdate] = useState(0);
  const rafRef = useRef<number | null>(null);

  const scheduleUpdate = useCallback(() => {
    if (rafRef.current !== null) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      forceUpdate((n) => n + 1);
    });
  }, []);

  useEffect(() => {
    if (!chartApi) return;
    const timeScale = chartApi.timeScale();
    timeScale.subscribeVisibleLogicalRangeChange(scheduleUpdate);
    return () => {
      timeScale.unsubscribeVisibleLogicalRangeChange(scheduleUpdate);
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [chartApi, scheduleUpdate]);

  if (!visible || !chartApi || !seriesApi || !containerRef.current || candles.length === 0) {
    return null;
  }

  const container = containerRef.current;
  const width = container.clientWidth;
  const height = container.clientHeight;

  const { bins, totalVolume } = calculateVolumeProfile(candles, BIN_COUNT);
  if (bins.length === 0 || totalVolume === 0) return null;

  const maxBinVolume = Math.max(...bins.map((b) => b.volume));
  const maxBarPx = width * MAX_BAR_WIDTH_RATIO;

  return (
    <svg
      className="pointer-events-none absolute inset-0"
      width={width}
      height={height}
      style={{ zIndex: 5, opacity: OVERLAY_OPACITY }}
      aria-hidden="true"
    >
      {bins.map((bin, i) => {
        const y = seriesApi.priceToCoordinate(bin.priceLevel);
        if (y === null) return null;

        // Next bin price level to determine bar height
        const nextBin = bins[i + 1];
        const nextY = nextBin ? seriesApi.priceToCoordinate(nextBin.priceLevel) : null;
        const barHeight = nextY !== null ? Math.abs(Number(nextY) - Number(y)) : 4;

        const barWidth = maxBinVolume > 0 ? (bin.volume / maxBinVolume) * maxBarPx : 0;

        let fill: string;
        if (bin.isPointOfControl) {
          fill = "#10b981";  // emerald
        } else if (bin.isValueArea) {
          fill = "#3b82f6";  // blue
        } else {
          fill = "#6b7280";  // gray
        }

        return (
          <rect
            key={i}
            x={width - barWidth}
            y={Number(y) - barHeight / 2}
            width={barWidth}
            height={Math.max(1, barHeight)}
            fill={fill}
          />
        );
      })}
    </svg>
  );
}

export default VolumeProfileOverlay;
