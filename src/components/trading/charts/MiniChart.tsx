"use client";

/**
 * Mini Chart Component
 *
 * Compact sparkline-style chart for dashboard widgets and watchlists.
 * Uses TradingView lightweight-charts for consistent rendering.
 */

import React, { useEffect, useRef } from "react";
import {
  createChart,
  IChartApi,
  ColorType,
  LineStyle,
  Time,
  AreaSeries,
  LineSeries,
} from "lightweight-charts";

// ============================================================================
// TYPES
// ============================================================================

export interface MiniChartProps {
  data: { timestamp: number; value: number }[];
  width?: number;
  height?: number;
  type?: "line" | "area";
  color?: string;
  showChange?: boolean;
  className?: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function MiniChart({
  data,
  width = 120,
  height = 40,
  type = "area",
  color,
  showChange = false,
  className = "",
}: MiniChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);

  // Calculate color based on price change
  const isPositive =
    data.length >= 2 && data[data.length - 1].value >= data[0].value;
  const chartColor = color || (isPositive ? "#26a69a" : "#ef5350");
  const changePercent =
    data.length >= 2
      ? ((data[data.length - 1].value - data[0].value) / data[0].value) * 100
      : 0;

  useEffect(() => {
    if (!containerRef.current || !data.length) return;

    const chart = createChart(containerRef.current, {
      width,
      height,
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "transparent",
      },
      grid: {
        vertLines: { visible: false },
        horzLines: { visible: false },
      },
      rightPriceScale: { visible: false },
      leftPriceScale: { visible: false },
      timeScale: { visible: false },
      crosshair: {
        vertLine: { visible: false },
        horzLine: { visible: false },
      },
      handleScale: false,
      handleScroll: false,
    });

    chartRef.current = chart;

    // Format data
    const formattedData = data.map((d) => ({
      time: (d.timestamp / 1000) as Time,
      value: d.value,
    }));

    if (type === "area") {
      const series = chart.addSeries(AreaSeries, {
        topColor: `${chartColor}40`,
        bottomColor: `${chartColor}00`,
        lineColor: chartColor,
        lineWidth: 1,
        priceLineVisible: false,
        lastValueVisible: false,
      });
      series.setData(formattedData);
    } else {
      const series = chart.addSeries(LineSeries, {
        color: chartColor,
        lineWidth: 1,
        priceLineVisible: false,
        lastValueVisible: false,
      });
      series.setData(formattedData);
    }

    chart.timeScale().fitContent();

    return () => {
      chart.remove();
      chartRef.current = null;
    };
  }, [data, width, height, type, chartColor]);

  return (
    <div className={`mini-chart inline-flex items-center gap-2 ${className}`}>
      <div ref={containerRef} style={{ width, height }} />
      {showChange && (
        <span
          className={`text-xs font-medium ${isPositive ? "text-green-500" : "text-red-500"}`}
        >
          {isPositive ? "+" : ""}
          {changePercent.toFixed(1)}%
        </span>
      )}
    </div>
  );
}

export default MiniChart;
