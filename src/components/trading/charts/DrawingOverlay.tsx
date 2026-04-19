"use client";

/**
 * Drawing Overlay
 *
 * SVG layer positioned absolutely over a lightweight-charts canvas.
 * Converts price/time coordinates to pixel positions and renders
 * trendlines, horizontal lines, and Fibonacci retracements.
 *
 * Updates on chart scroll/zoom via subscribeVisibleLogicalRangeChange.
 */

import React, { useEffect, useRef, useState, useCallback, RefObject } from "react";
import type { IChartApi, ISeriesApi, Time } from "lightweight-charts";
import type { Drawing } from "@/lib/trading/charts/drawing-engine";
import { getFibonacciLevels } from "@/lib/trading/charts/drawing-engine";

// ============================================================================
// TYPES
// ============================================================================

export interface DrawingOverlayProps {
  drawings: Drawing[];
  chartApi: IChartApi | null;
  seriesApi: ISeriesApi<"Candlestick"> | null;
  containerRef: RefObject<HTMLDivElement>;
}

interface PixelPoint {
  x: number;
  y: number;
}

// ============================================================================
// HELPERS
// ============================================================================

function toPixel(
  point: { time: number; price: number },
  chartApi: IChartApi,
  seriesApi: ISeriesApi<"Candlestick">,
): PixelPoint | null {
  const x = chartApi.timeScale().timeToCoordinate(point.time as Time);
  const y = seriesApi.priceToCoordinate(point.price);
  if (x === null || y === null) return null;
  return { x: Number(x), y: Number(y) };
}

function dashArray(style: Drawing["style"]["lineStyle"]): string {
  if (style === "dashed") return "6 3";
  if (style === "dotted") return "2 3";
  return "none";
}

// Opacity for Fibonacci levels — strongest at endpoints, lightest at 50%
function fibOpacity(ratio: number): number {
  const distance = Math.abs(ratio - 0.5) / 0.5;  // 0 at center, 1 at edges
  return 0.3 + distance * 0.55;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function DrawingOverlay({
  drawings,
  chartApi,
  seriesApi,
  containerRef,
}: DrawingOverlayProps) {
  const [, forceUpdate] = useState(0);
  const rafRef = useRef<number | null>(null);

  const scheduleUpdate = useCallback(() => {
    if (rafRef.current !== null) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      forceUpdate((n) => n + 1);
    });
  }, []);

  // Subscribe to visible range changes to re-render on scroll/zoom
  useEffect(() => {
    if (!chartApi) return;
    const timeScale = chartApi.timeScale();
    timeScale.subscribeVisibleLogicalRangeChange(scheduleUpdate);
    return () => {
      timeScale.unsubscribeVisibleLogicalRangeChange(scheduleUpdate);
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [chartApi, scheduleUpdate]);

  if (!chartApi || !seriesApi || !containerRef.current) return null;

  const container = containerRef.current;
  const width = container.clientWidth;
  const height = container.clientHeight;

  return (
    <svg
      className="pointer-events-none absolute inset-0"
      width={width}
      height={height}
      style={{ zIndex: 10 }}
      aria-hidden="true"
    >
      {drawings.map((drawing) => {
        if (!drawing.visible) return null;

        const { color, lineWidth, lineStyle } = drawing.style;
        const dash = dashArray(lineStyle);
        const strokeProps = {
          stroke: color,
          strokeWidth: lineWidth,
          strokeDasharray: dash,
          fill: "none",
        };

        if (drawing.type === "trendline" && drawing.points.length >= 2) {
          const p1 = toPixel(drawing.points[0], chartApi, seriesApi);
          const p2 = toPixel(drawing.points[1], chartApi, seriesApi);
          if (!p1 || !p2) return null;
          return (
            <line
              key={drawing.id}
              x1={p1.x}
              y1={p1.y}
              x2={p2.x}
              y2={p2.y}
              {...strokeProps}
            />
          );
        }

        if (drawing.type === "horizontal" && drawing.points.length >= 1) {
          const p = toPixel(drawing.points[0], chartApi, seriesApi);
          if (!p) return null;
          return (
            <line
              key={drawing.id}
              x1={0}
              y1={p.y}
              x2={width}
              y2={p.y}
              {...strokeProps}
            />
          );
        }

        if (drawing.type === "fibonacci" && drawing.points.length >= 2) {
          const highPoint = drawing.points[0];
          const lowPoint = drawing.points[1];
          const levels = getFibonacciLevels(highPoint, lowPoint);

          return (
            <g key={drawing.id}>
              {levels.map(({ ratio, label, price }) => {
                const pHigh = toPixel({ time: highPoint.time, price }, chartApi, seriesApi);
                if (!pHigh) return null;
                const opacity = fibOpacity(ratio);
                return (
                  <g key={label}>
                    <line
                      x1={0}
                      y1={pHigh.y}
                      x2={width}
                      y2={pHigh.y}
                      stroke={color}
                      strokeWidth={lineWidth}
                      strokeDasharray={dash}
                      strokeOpacity={opacity}
                      fill="none"
                    />
                    <text
                      x={width - 4}
                      y={pHigh.y - 3}
                      textAnchor="end"
                      fontSize={10}
                      fill={color}
                      fillOpacity={opacity}
                      className="select-none"
                    >
                      {label}
                    </text>
                  </g>
                );
              })}
            </g>
          );
        }

        return null;
      })}
    </svg>
  );
}

export default DrawingOverlay;
