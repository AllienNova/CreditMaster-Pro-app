/**
 * Chart Drawing Tools
 * 
 * Implementation of manual analysis tools:
 * - Trend lines
 * - Horizontal/Vertical lines
 * - Fibonacci retracements
 * - Support/Resistance levels
 * - Annotations
 */

import { IChartApi, ISeriesApi, Time, LineStyle } from 'lightweight-charts';
import { ChartPoint, DrawingStyle, ChartDrawing, DrawingToolType } from '@/lib/investments/types/charting.types';

// ============================================================================
// TYPES
// ============================================================================

export interface DrawingToolManager {
  addTrendLine: (points: ChartPoint[], style?: Partial<DrawingStyle>) => string;
  addHorizontalLine: (price: number, style?: Partial<DrawingStyle>) => string;
  addFibonacciRetracement: (startPoint: ChartPoint, endPoint: ChartPoint) => string;
  addAnnotation: (point: ChartPoint, text: string, style?: Partial<DrawingStyle>) => string;
  removeDrawing: (id: string) => void;
  clearAllDrawings: () => void;
  getDrawings: () => ChartDrawing[];
  updateDrawing: (id: string, updates: Partial<ChartDrawing>) => void;
}

export interface PriceLineOptions {
  price: number;
  color: string;
  lineWidth: number;
  lineStyle: LineStyle;
  axisLabelVisible: boolean;
  title: string;
}

// ============================================================================
// DEFAULT STYLES
// ============================================================================

const DEFAULT_LINE_STYLE: DrawingStyle = {
  color: '#2962FF',
  lineWidth: 2,
  lineStyle: 'solid',
  showLabels: true,
  extend: 'none',
};

const FIBONACCI_COLORS = {
  '0': 'rgba(128, 128, 128, 0.5)',
  '0.236': 'rgba(255, 82, 82, 0.5)',
  '0.382': 'rgba(255, 152, 0, 0.5)',
  '0.5': 'rgba(76, 175, 80, 0.5)',
  '0.618': 'rgba(33, 150, 243, 0.5)',
  '0.786': 'rgba(156, 39, 176, 0.5)',
  '1': 'rgba(128, 128, 128, 0.5)',
};

const FIBONACCI_LEVELS = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];

// ============================================================================
// DRAWING TOOL MANAGER
// ============================================================================

export function createDrawingToolManager(
  chart: IChartApi,
  mainSeries: ISeriesApi<any>
): DrawingToolManager {
  const drawings = new Map<string, ChartDrawing>();
  const priceLines = new Map<string, any[]>();

  // Generate unique ID
  const generateId = (): string => `drawing_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Convert line style
  const toLineStyle = (style: 'solid' | 'dashed' | 'dotted'): LineStyle => {
    switch (style) {
      case 'dashed': return LineStyle.Dashed;
      case 'dotted': return LineStyle.Dotted;
      default: return LineStyle.Solid;
    }
  };

  // Add trend line (using price lines for simplicity)
  const addTrendLine = (points: ChartPoint[], style?: Partial<DrawingStyle>): string => {
    const id = generateId();
    const mergedStyle = { ...DEFAULT_LINE_STYLE, ...style };

    // For a trend line, we'll approximate using horizontal lines at key points
    // Note: Full trend line implementation would require canvas overlay
    const drawing: ChartDrawing = {
      id,
      type: 'trendline',
      points,
      style: mergedStyle,
      visible: true,
      locked: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Create price lines for start and end points
    const lines: any[] = [];
    for (const point of points) {
      const priceLine = mainSeries.createPriceLine({
        price: point.y,
        color: mergedStyle.color,
        lineWidth: mergedStyle.lineWidth,
        lineStyle: toLineStyle(mergedStyle.lineStyle),
        axisLabelVisible: mergedStyle.showLabels || false,
        title: '',
      });
      lines.push(priceLine);
    }

    priceLines.set(id, lines);
    drawings.set(id, drawing);
    return id;
  };

  // Add horizontal line
  const addHorizontalLine = (price: number, style?: Partial<DrawingStyle>): string => {
    const id = generateId();
    const mergedStyle = { ...DEFAULT_LINE_STYLE, ...style };

    const priceLine = mainSeries.createPriceLine({
      price,
      color: mergedStyle.color,
      lineWidth: mergedStyle.lineWidth,
      lineStyle: toLineStyle(mergedStyle.lineStyle),
      axisLabelVisible: mergedStyle.showLabels || false,
      title: style?.fontColor ? '' : `${price.toFixed(2)}`,
    });

    const drawing: ChartDrawing = {
      id,
      type: 'horizontal_line',
      points: [{ x: 0, y: price }],
      style: mergedStyle,
      visible: true,
      locked: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    priceLines.set(id, [priceLine]);
    drawings.set(id, drawing);
    return id;
  };

  // Add Fibonacci retracement
  const addFibonacciRetracement = (startPoint: ChartPoint, endPoint: ChartPoint): string => {
    const id = generateId();
    const lines: any[] = [];
    
    const priceRange = endPoint.y - startPoint.y;
    const isUptrend = priceRange > 0;

    for (const level of FIBONACCI_LEVELS) {
      const price = isUptrend 
        ? endPoint.y - (priceRange * level)
        : startPoint.y + (Math.abs(priceRange) * level);
      
      const colorKey = level.toString() as keyof typeof FIBONACCI_COLORS;
      const priceLine = mainSeries.createPriceLine({
        price,
        color: FIBONACCI_COLORS[colorKey] || '#888888',
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true,
        title: `${(level * 100).toFixed(1)}%`,
      });
      lines.push(priceLine);
    }

    const drawing: ChartDrawing = {
      id,
      type: 'fibonacci_retracement',
      points: [startPoint, endPoint],
      style: { ...DEFAULT_LINE_STYLE, lineStyle: 'dashed' },
      visible: true,
      locked: false,
      data: { levels: FIBONACCI_LEVELS },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    priceLines.set(id, lines);
    drawings.set(id, drawing);
    return id;
  };

  // Add annotation/text
  const addAnnotation = (point: ChartPoint, text: string, style?: Partial<DrawingStyle>): string => {
    const id = generateId();
    const mergedStyle = { ...DEFAULT_LINE_STYLE, ...style };

    // Use a price line with title as annotation
    const priceLine = mainSeries.createPriceLine({
      price: point.y,
      color: 'transparent',
      lineWidth: 0,
      lineStyle: LineStyle.Solid,
      axisLabelVisible: true,
      title: text,
    });

    const drawing: ChartDrawing = {
      id,
      type: 'text',
      points: [point],
      style: mergedStyle,
      visible: true,
      locked: false,
      label: text,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    priceLines.set(id, [priceLine]);
    drawings.set(id, drawing);
    return id;
  };

  // Remove drawing
  const removeDrawing = (id: string): void => {
    const lines = priceLines.get(id);
    if (lines) {
      for (const line of lines) {
        mainSeries.removePriceLine(line);
      }
      priceLines.delete(id);
    }
    drawings.delete(id);
  };

  // Clear all drawings
  const clearAllDrawings = (): void => {
    for (const [id] of drawings) {
      removeDrawing(id);
    }
  };

  // Get all drawings
  const getDrawings = (): ChartDrawing[] => {
    return Array.from(drawings.values());
  };

  // Update drawing
  const updateDrawing = (id: string, updates: Partial<ChartDrawing>): void => {
    const drawing = drawings.get(id);
    if (!drawing) return;

    // Remove old price lines
    removeDrawing(id);

    // Re-create with updates
    const updatedDrawing = { ...drawing, ...updates, updatedAt: new Date() };

    switch (updatedDrawing.type) {
      case 'horizontal_line':
        if (updatedDrawing.points[0]) {
          addHorizontalLine(updatedDrawing.points[0].y, updatedDrawing.style);
        }
        break;
      case 'fibonacci_retracement':
        if (updatedDrawing.points[0] && updatedDrawing.points[1]) {
          addFibonacciRetracement(updatedDrawing.points[0], updatedDrawing.points[1]);
        }
        break;
      case 'text':
        if (updatedDrawing.points[0] && updatedDrawing.label) {
          addAnnotation(updatedDrawing.points[0], updatedDrawing.label, updatedDrawing.style);
        }
        break;
    }
  };

  return {
    addTrendLine,
    addHorizontalLine,
    addFibonacciRetracement,
    addAnnotation,
    removeDrawing,
    clearAllDrawings,
    getDrawings,
    updateDrawing,
  };
}

// ============================================================================
// SUPPORT/RESISTANCE LEVEL DETECTOR
// ============================================================================

export interface SupportResistanceLevel {
  price: number;
  type: 'support' | 'resistance';
  strength: number;
  touchCount: number;
}

export function detectSupportResistanceLevels(
  highs: number[],
  lows: number[],
  closes: number[],
  sensitivity: number = 0.02
): SupportResistanceLevel[] {
  const levels: SupportResistanceLevel[] = [];
  const tolerance = sensitivity;

  // Find potential support levels from lows
  const lowClusters = clusterPrices(lows, tolerance);
  for (const cluster of lowClusters) {
    if (cluster.count >= 2) {
      levels.push({
        price: cluster.avgPrice,
        type: 'support',
        strength: Math.min(cluster.count / 5, 1),
        touchCount: cluster.count,
      });
    }
  }

  // Find potential resistance levels from highs
  const highClusters = clusterPrices(highs, tolerance);
  for (const cluster of highClusters) {
    if (cluster.count >= 2) {
      levels.push({
        price: cluster.avgPrice,
        type: 'resistance',
        strength: Math.min(cluster.count / 5, 1),
        touchCount: cluster.count,
      });
    }
  }

  // Sort by strength
  levels.sort((a, b) => b.strength - a.strength);

  return levels.slice(0, 10); // Return top 10 levels
}

interface PriceCluster {
  avgPrice: number;
  count: number;
}

function clusterPrices(prices: number[], tolerance: number): PriceCluster[] {
  const clusters: PriceCluster[] = [];
  const sortedPrices = [...prices].sort((a, b) => a - b);

  if (sortedPrices.length === 0) return clusters;

  let currentCluster: number[] = [sortedPrices[0]];

  for (let i = 1; i < sortedPrices.length; i++) {
    const avgCurrent = currentCluster.reduce((a, b) => a + b, 0) / currentCluster.length;
    const priceDiff = Math.abs(sortedPrices[i] - avgCurrent) / avgCurrent;

    if (priceDiff <= tolerance) {
      currentCluster.push(sortedPrices[i]);
    } else {
      if (currentCluster.length >= 2) {
        clusters.push({
          avgPrice: currentCluster.reduce((a, b) => a + b, 0) / currentCluster.length,
          count: currentCluster.length,
        });
      }
      currentCluster = [sortedPrices[i]];
    }
  }

  // Don't forget the last cluster
  if (currentCluster.length >= 2) {
    clusters.push({
      avgPrice: currentCluster.reduce((a, b) => a + b, 0) / currentCluster.length,
      count: currentCluster.length,
    });
  }

  return clusters;
}
