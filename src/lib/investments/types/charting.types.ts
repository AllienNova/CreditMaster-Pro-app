/**
 * Charting & Visualization Type Definitions
 *
 * Types for interactive charts and data visualization
 */

import { Timeframe, PriceData } from "./investment.types";
import {
  IndicatorConfig,
  ChartPattern,
  PriceLevel,
} from "./technical-analysis.types";

// ============================================================================
// CHART TYPES
// ============================================================================

export type ChartType =
  | "candlestick"
  | "line"
  | "bar"
  | "area"
  | "heikin_ashi"
  | "renko"
  | "kagi"
  | "point_figure";

export interface ChartConfig {
  symbol: string;
  timeframe: Timeframe;
  chartType: ChartType;
  indicators: IndicatorConfig[];
  overlays: ChartOverlay[];
  drawings: ChartDrawing[];
  showVolume: boolean;
  showGrid: boolean;
  theme: "light" | "dark";
  colors: ChartColors;
}

export interface ChartColors {
  background: string;
  gridLines: string;
  text: string;
  bullCandle: string;
  bearCandle: string;
  bullWick: string;
  bearWick: string;
  volumeBull: string;
  volumeBear: string;
  crosshair: string;
}

export interface ChartOverlay {
  id: string;
  type: "indicator" | "pattern" | "level" | "annotation";
  config: IndicatorConfig | ChartPattern | PriceLevel | Annotation;
  visible: boolean;
  color?: string;
  lineWidth?: number;
  lineStyle?: "solid" | "dashed" | "dotted";
}

export interface Annotation {
  id: string;
  type: "text" | "arrow" | "label" | "shape";
  x: number | Date;
  y: number;
  text?: string;
  color: string;
  fontSize?: number;
}

// ============================================================================
// DRAWING TOOLS
// ============================================================================

export type DrawingToolType =
  | "trendline"
  | "horizontal_line"
  | "vertical_line"
  | "ray"
  | "channel"
  | "pitchfork"
  | "gann_fan"
  | "fibonacci_retracement"
  | "fibonacci_extension"
  | "fibonacci_fan"
  | "rectangle"
  | "ellipse"
  | "triangle"
  | "text"
  | "callout"
  | "price_label"
  | "measure"
  | "date_range"
  | "price_range";

export interface ChartDrawing {
  id: string;
  type: DrawingToolType;
  points: ChartPoint[];
  style: DrawingStyle;
  visible: boolean;
  locked: boolean;
  label?: string;
  data?: any;
  createdAt: Date;
  updatedAt: Date;
}

export interface ChartPoint {
  x: number | Date;
  y: number;
}

export interface DrawingStyle {
  color: string;
  lineWidth: number;
  lineStyle: "solid" | "dashed" | "dotted";
  fillColor?: string;
  fillOpacity?: number;
  fontSize?: number;
  fontColor?: string;
  showLabels?: boolean;
  extend?: "none" | "left" | "right" | "both";
}

// ============================================================================
// CHART DATA
// ============================================================================

export interface ChartData {
  symbol: string;
  timeframe: Timeframe;
  candles: CandleData[];
  indicators: IndicatorData[];
  patterns: PatternHighlight[];
  levels: LevelHighlight[];
  signals: SignalMarker[];
  annotations: Annotation[];
  volume: VolumeData[];
}

export interface CandleData {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface IndicatorData {
  id: string;
  type: string;
  values: Array<{ timestamp: number; value: number | number[] }>;
  pane: "main" | "separate";
  color: string | string[];
  lineWidth: number;
}

export interface PatternHighlight {
  id: string;
  type: string;
  startTimestamp: number;
  endTimestamp: number;
  keyPoints: ChartPoint[];
  fillColor: string;
  borderColor: string;
  label: string;
}

export interface LevelHighlight {
  id: string;
  type: "support" | "resistance" | "pivot";
  price: number;
  color: string;
  lineStyle: "solid" | "dashed";
  label?: string;
  strength?: number;
}

export interface SignalMarker {
  id: string;
  timestamp: number;
  price: number;
  type: "buy" | "sell" | "alert";
  label: string;
  color: string;
  icon: string;
}

export interface VolumeData {
  timestamp: number;
  volume: number;
  color: string;
}

// ============================================================================
// COMPARISON CHARTS
// ============================================================================

export interface ComparisonChart {
  baseSymbol: string;
  compareSymbols: string[];
  timeframe: Timeframe;
  startDate: Date;
  endDate: Date;
  normalizeType: "percent" | "price" | "indexed";
  series: ComparisonSeries[];
}

export interface ComparisonSeries {
  symbol: string;
  color: string;
  data: Array<{ timestamp: number; value: number }>;
  returnPercent: number;
  correlation: number;
}
