"use client";

/**
 * Depth Chart
 *
 * Cumulative order book depth visualization using recharts AreaChart.
 * Two mirrored areas: green (bids, left of last price) and red (asks, right).
 * Crosshair on hover shows price and cumulative volume.
 */

import React from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import type { Payload } from "recharts/types/component/DefaultTooltipContent";

// ============================================================================
// TYPES
// ============================================================================

export interface DepthLevel {
  price: number;
  size: number;
  total: number;
}

export interface DepthChartProps {
  bids: DepthLevel[];
  asks: DepthLevel[];
  lastPrice?: number;
  className?: string;
  height?: number;
}

interface DepthPoint {
  price: number;
  bidDepth: number | null;
  askDepth: number | null;
}

interface DepthTooltipProps {
  active?: boolean;
  payload?: ReadonlyArray<Payload<number, string>>;
  label?: number;
}

// ============================================================================
// HELPERS
// ============================================================================

function buildChartData(bids: DepthLevel[], asks: DepthLevel[]): DepthPoint[] {
  // Bids are sorted high-to-low; asks low-to-high.
  // Merge into a single price-ordered array for the chart.
  const bidPoints: DepthPoint[] = [...bids]
    .sort((a, b) => a.price - b.price)
    .map((b) => ({ price: b.price, bidDepth: b.total, askDepth: null }));

  const askPoints: DepthPoint[] = [...asks]
    .sort((a, b) => a.price - b.price)
    .map((a) => ({ price: a.price, bidDepth: null, askDepth: a.total }));

  return [...bidPoints, ...askPoints].sort((a, b) => a.price - b.price);
}

function formatPrice(price: number): string {
  return price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatVolume(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(2)}K`;
  return value.toFixed(2);
}

// ============================================================================
// CUSTOM TOOLTIP
// ============================================================================

function DepthTooltip({ active, payload, label }: DepthTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  const bidEntry = payload.find((p: Payload<number, string>) => p.dataKey === "bidDepth");
  const askEntry = payload.find((p: Payload<number, string>) => p.dataKey === "askDepth");

  return (
    <div className="bg-gray-800 border border-gray-600 rounded px-3 py-2 text-xs shadow-lg">
      <p className="text-gray-300 mb-1">Price: <span className="text-white font-medium">{formatPrice(Number(label))}</span></p>
      {bidEntry?.value != null && (
        <p className="text-emerald-400">Bid depth: {formatVolume(bidEntry.value)}</p>
      )}
      {askEntry?.value != null && (
        <p className="text-red-400">Ask depth: {formatVolume(askEntry.value)}</p>
      )}
    </div>
  );
}

// ============================================================================
// COMPONENT
// ============================================================================

export function DepthChart({
  bids,
  asks,
  lastPrice,
  className = "",
  height = 200,
}: DepthChartProps) {
  const data = buildChartData(bids, asks);

  if (data.length === 0) {
    return (
      <div
        className={`flex items-center justify-center bg-gray-900 rounded border border-gray-700 text-gray-500 text-xs ${className}`}
        style={{ height }}
      >
        No depth data
      </div>
    );
  }

  return (
    <div className={`bg-gray-900 rounded border border-gray-700 ${className}`} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
          <defs>
            <linearGradient id="bidGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#10b981" stopOpacity={0.05} />
            </linearGradient>
            <linearGradient id="askGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#ef4444" stopOpacity={0.05} />
            </linearGradient>
          </defs>

          <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />

          <XAxis
            dataKey="price"
            tickFormatter={formatPrice}
            tick={{ fill: "#6b7280", fontSize: 10 }}
            axisLine={{ stroke: "#374151" }}
            tickLine={false}
            type="number"
            domain={["dataMin", "dataMax"]}
            scale="linear"
          />

          <YAxis
            tickFormatter={formatVolume}
            tick={{ fill: "#6b7280", fontSize: 10 }}
            axisLine={{ stroke: "#374151" }}
            tickLine={false}
            width={48}
          />

          <Tooltip content={<DepthTooltip />} cursor={{ stroke: "#4b5563", strokeWidth: 1 }} />

          {lastPrice !== undefined && (
            <ReferenceLine
              x={lastPrice}
              stroke="#f59e0b"
              strokeDasharray="4 2"
              label={{ value: formatPrice(lastPrice), fill: "#f59e0b", fontSize: 10, position: "insideTopRight" }}
            />
          )}

          <Area
            type="stepAfter"
            dataKey="bidDepth"
            stroke="#10b981"
            strokeWidth={1.5}
            fill="url(#bidGradient)"
            connectNulls={false}
            dot={false}
            activeDot={{ r: 3, fill: "#10b981" }}
            isAnimationActive={false}
          />

          <Area
            type="stepBefore"
            dataKey="askDepth"
            stroke="#ef4444"
            strokeWidth={1.5}
            fill="url(#askGradient)"
            connectNulls={false}
            dot={false}
            activeDot={{ r: 3, fill: "#ef4444" }}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export default DepthChart;
