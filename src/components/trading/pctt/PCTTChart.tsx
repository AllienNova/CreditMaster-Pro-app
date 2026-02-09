'use client';

/**
 * PCTT Chart Component
 * 
 * Visualizes PCTT structure analysis on price charts:
 * - Support/Resistance trendlines with Q-scores
 * - Pivot points (highs/lows)
 * - Regime indicators
 * - Event state badges
 * - Frozen action/safety lines
 * - Entry signals with R-targets
 */

import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import {
  createChart,
  IChartApi,
  ISeriesApi,
  CandlestickData,
  LineData,
  Time,
  CrosshairMode,
  CandlestickSeries,
  LineSeries,
} from 'lightweight-charts';
import {
  PCTTEngine,
  createPCTTEngine,
  StructureObject,
  PCTTSignal,
  Pivot,
  PCTTConfig,
  OHLCV,
} from '@/lib/trading/pctt';

// ============================================================================
// TYPES
// ============================================================================

export interface PCTTChartProps {
  data: OHLCV[];
  config?: Partial<PCTTConfig>;
  width?: number;
  height?: number;
  onSignal?: (signal: PCTTSignal) => void;
  showPivots?: boolean;
  showRegime?: boolean;
  showQScores?: boolean;
  theme?: 'dark' | 'light';
  className?: string;
}

interface ChartState {
  structure: StructureObject | null;
  signal: PCTTSignal | null;
  pivots: { highs: Pivot[]; lows: Pivot[] };
}

// ============================================================================
// CONSTANTS
// ============================================================================

const COLORS = {
  dark: {
    background: '#1a1a2e',
    text: '#d1d5db',
    grid: '#2d2d44',
    support: '#26a69a',
    resistance: '#ef5350',
    pivotHigh: '#ff9800',
    pivotLow: '#2196f3',
    frozenAction: '#ffd700',
    frozenSafety: '#9c27b0',
    qScoreHigh: '#4caf50',
    qScoreMed: '#ff9800',
    qScoreLow: '#f44336',
    trendUp: '#26a69a20',
    trendDown: '#ef535020',
    range: '#9e9e9e20',
  },
  light: {
    background: '#ffffff',
    text: '#1f2937',
    grid: '#e5e7eb',
    support: '#16a34a',
    resistance: '#dc2626',
    pivotHigh: '#ea580c',
    pivotLow: '#2563eb',
    frozenAction: '#ca8a04',
    frozenSafety: '#7c3aed',
    qScoreHigh: '#22c55e',
    qScoreMed: '#f59e0b',
    qScoreLow: '#ef4444',
    trendUp: '#16a34a20',
    trendDown: '#dc262620',
    range: '#6b728020',
  },
};

// ============================================================================
// COMPONENT
// ============================================================================

export function PCTTChart({
  data,
  config,
  width = 800,
  height = 500,
  onSignal,
  showPivots = true,
  showRegime = true,
  showQScores = true,
  theme = 'dark',
  className = '',
}: PCTTChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null) as React.MutableRefObject<any>;
  const supportLineRef = useRef<ISeriesApi<'Line'> | null>(null) as React.MutableRefObject<any>;
  const resistanceLineRef = useRef<ISeriesApi<'Line'> | null>(null) as React.MutableRefObject<any>;
  const frozenActionRef = useRef<ISeriesApi<'Line'> | null>(null) as React.MutableRefObject<any>;
  const frozenSafetyRef = useRef<ISeriesApi<'Line'> | null>(null) as React.MutableRefObject<any>;

  const [chartState, setChartState] = useState<ChartState>({
    structure: null,
    signal: null,
    pivots: { highs: [], lows: [] },
  });

  const colors = COLORS[theme];

  // Create PCTT engine
  const engine = useMemo(() => createPCTTEngine(config), [config]);

  // Process data through PCTT engine
  const processedData = useMemo(() => {
    engine.reset();
    let latestStructure: StructureObject | null = null;
    let latestSignal: PCTTSignal | null = null;

    const supportData: LineData[] = [];
    const resistanceData: LineData[] = [];

    for (let i = 0; i < data.length; i++) {
      const bar = data[i];
      const result = engine.update(bar);
      
      latestStructure = result.structure;
      if (result.signal) {
        latestSignal = result.signal;
      }

      // Build line data
      if (result.structure.support) {
        const price = result.structure.support.slope * i + result.structure.support.intercept;
        supportData.push({ time: bar.time as Time, value: price });
      }
      if (result.structure.resistance) {
        const price = result.structure.resistance.slope * i + result.structure.resistance.intercept;
        resistanceData.push({ time: bar.time as Time, value: price });
      }
    }

    return {
      structure: latestStructure,
      signal: latestSignal,
      pivots: engine.getPivots(),
      supportData,
      resistanceData,
    };
  }, [data, engine]);

  // Initialize chart
  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      width,
      height,
      layout: {
        background: { color: colors.background },
        textColor: colors.text,
      },
      grid: {
        vertLines: { color: colors.grid },
        horzLines: { color: colors.grid },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
      },
      rightPriceScale: {
        borderColor: colors.grid,
      },
      timeScale: {
        borderColor: colors.grid,
        timeVisible: true,
      },
    });

    chartRef.current = chart;

    // Create candlestick series (using any to handle v4+ API differences)
    const candleSeries = (chart as any).addCandlestickSeries({
      upColor: '#26a69a',
      downColor: '#ef5350',
      borderUpColor: '#26a69a',
      borderDownColor: '#ef5350',
      wickUpColor: '#26a69a',
      wickDownColor: '#ef5350',
    });
    candleSeriesRef.current = candleSeries;

    // Create support line series
    const supportLine = (chart as any).addLineSeries({
      color: colors.support,
      lineWidth: 2,
      lineStyle: 0,
      priceLineVisible: false,
      lastValueVisible: false,
    });
    supportLineRef.current = supportLine;

    // Create resistance line series
    const resistanceLine = (chart as any).addLineSeries({
      color: colors.resistance,
      lineWidth: 2,
      lineStyle: 0,
      priceLineVisible: false,
      lastValueVisible: false,
    });
    resistanceLineRef.current = resistanceLine;

    // Create frozen action line
    const frozenAction = (chart as any).addLineSeries({
      color: colors.frozenAction,
      lineWidth: 2,
      lineStyle: 2, // Dashed
      priceLineVisible: false,
      lastValueVisible: false,
    });
    frozenActionRef.current = frozenAction;

    // Create frozen safety line
    const frozenSafety = (chart as any).addLineSeries({
      color: colors.frozenSafety,
      lineWidth: 2,
      lineStyle: 2,
      priceLineVisible: false,
      lastValueVisible: false,
    });
    frozenSafetyRef.current = frozenSafety;

    return () => {
      chart.remove();
    };
  }, [width, height, colors]);

  // Update chart data
  useEffect(() => {
    if (!candleSeriesRef.current) return;

    // Set candle data
    const candleData: CandlestickData[] = data.map(bar => ({
      time: bar.time as Time,
      open: bar.open,
      high: bar.high,
      low: bar.low,
      close: bar.close,
    }));
    candleSeriesRef.current.setData(candleData);

    // Set support line
    if (supportLineRef.current && processedData.supportData.length > 0) {
      supportLineRef.current.setData(processedData.supportData);
    }

    // Set resistance line
    if (resistanceLineRef.current && processedData.resistanceData.length > 0) {
      resistanceLineRef.current.setData(processedData.resistanceData);
    }

    // Add pivot markers
    if (showPivots && candleSeriesRef.current) {
      const markers = [
        ...processedData.pivots.highs.map(p => ({
          time: data[p.index]?.time as Time,
          position: 'aboveBar' as const,
          color: colors.pivotHigh,
          shape: 'arrowDown' as const,
          text: 'PH',
        })),
        ...processedData.pivots.lows.map(p => ({
          time: data[p.index]?.time as Time,
          position: 'belowBar' as const,
          color: colors.pivotLow,
          shape: 'arrowUp' as const,
          text: 'PL',
        })),
      ].filter(m => m.time);

      candleSeriesRef.current.setMarkers(markers);
    }

    // Update state
    setChartState({
      structure: processedData.structure,
      signal: processedData.signal,
      pivots: processedData.pivots,
    });

    // Fire signal callback
    if (processedData.signal && onSignal) {
      onSignal(processedData.signal);
    }

    // Fit content
    chartRef.current?.timeScale().fitContent();
  }, [data, processedData, showPivots, colors, onSignal]);

  // Get Q-score color
  const getQScoreColor = useCallback((q: number) => {
    if (q >= 0.7) return colors.qScoreHigh;
    if (q >= 0.55) return colors.qScoreMed;
    return colors.qScoreLow;
  }, [colors]);

  // Get regime background
  const getRegimeBackground = useCallback((regime: string) => {
    switch (regime) {
      case 'trend_up': return colors.trendUp;
      case 'trend_down': return colors.trendDown;
      case 'range': return colors.range;
      default: return 'transparent';
    }
  }, [colors]);

  return (
    <div className={`pctt-chart ${className}`}>
      {/* Info Panel */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-700">
        {/* Regime Badge */}
        {showRegime && chartState.structure && (
          <div 
            className="px-3 py-1 rounded text-xs font-semibold uppercase"
            style={{ backgroundColor: getRegimeBackground(chartState.structure.regime) }}
          >
            {chartState.structure.regime.replace('_', ' ')}
          </div>
        )}

        {/* Q-Scores */}
        {showQScores && chartState.structure && (
          <div className="flex items-center gap-4 text-xs">
            {chartState.structure.support && (
              <div className="flex items-center gap-1">
                <span style={{ color: colors.support }}>Support Q:</span>
                <span 
                  className="font-bold"
                  style={{ color: getQScoreColor(chartState.structure.support.qScore) }}
                >
                  {(chartState.structure.support.qScore * 100).toFixed(0)}%
                </span>
              </div>
            )}
            {chartState.structure.resistance && (
              <div className="flex items-center gap-1">
                <span style={{ color: colors.resistance }}>Resistance Q:</span>
                <span 
                  className="font-bold"
                  style={{ color: getQScoreColor(chartState.structure.resistance.qScore) }}
                >
                  {(chartState.structure.resistance.qScore * 100).toFixed(0)}%
                </span>
              </div>
            )}
          </div>
        )}

        {/* Event State */}
        {chartState.structure && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">State:</span>
            <span className={`text-xs font-semibold uppercase ${
              chartState.structure.event.includes('entry') ? 'text-green-400' :
              chartState.structure.event.includes('break') ? 'text-yellow-400' :
              chartState.structure.event === 'failure' ? 'text-red-400' :
              'text-gray-400'
            }`}>
              {chartState.structure.event.replace('_', ' ')}
            </span>
          </div>
        )}

        {/* ER */}
        {chartState.structure && (
          <div className="text-xs text-gray-400">
            ER: {(chartState.structure.efficiencyRatio * 100).toFixed(0)}%
          </div>
        )}
      </div>

      {/* Chart Container */}
      <div ref={containerRef} />

      {/* Signal Panel */}
      {chartState.signal && (
        <div className={`p-4 border-t ${
          chartState.signal.type === 'long' ? 'bg-green-900/20 border-green-600' : 
          'bg-red-900/20 border-red-600'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className={`text-lg font-bold ${
                chartState.signal.type === 'long' ? 'text-green-400' : 'text-red-400'
              }`}>
                {chartState.signal.type.toUpperCase()} SIGNAL
              </span>
              <span className="text-sm text-gray-400">
                Q: {(chartState.signal.qScore * 100).toFixed(0)}%
              </span>
            </div>
            <div className="flex items-center gap-6 text-sm">
              <div>
                <span className="text-gray-400">Entry: </span>
                <span className="text-white font-medium">
                  ${chartState.signal.entryPrice.toFixed(2)}
                </span>
              </div>
              <div>
                <span className="text-gray-400">Stop: </span>
                <span className="text-red-400 font-medium">
                  ${chartState.signal.stopPrice.toFixed(2)}
                </span>
              </div>
              <div>
                <span className="text-gray-400">Targets: </span>
                {chartState.signal.targetPrices.map((t, i) => (
                  <span key={i} className="text-green-400 font-medium ml-2">
                    {i + 1}R: ${t.toFixed(2)}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center gap-4 px-4 py-2 text-xs text-gray-400 border-t border-gray-700">
        <div className="flex items-center gap-1">
          <div className="w-3 h-0.5" style={{ backgroundColor: colors.support }} />
          <span>Support</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-0.5" style={{ backgroundColor: colors.resistance }} />
          <span>Resistance</span>
        </div>
        {showPivots && (
          <>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2" style={{ backgroundColor: colors.pivotHigh }} />
              <span>Pivot High</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2" style={{ backgroundColor: colors.pivotLow }} />
              <span>Pivot Low</span>
            </div>
          </>
        )}
        <div className="flex items-center gap-1">
          <div className="w-3 h-0.5 border-t-2 border-dashed" style={{ borderColor: colors.frozenAction }} />
          <span>Frozen Action</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-0.5 border-t-2 border-dashed" style={{ borderColor: colors.frozenSafety }} />
          <span>Frozen Safety</span>
        </div>
      </div>
    </div>
  );
}

export default PCTTChart;
