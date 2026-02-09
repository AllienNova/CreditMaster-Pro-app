'use client';

/**
 * Advanced Chart Container
 * 
 * Full-featured chart container with:
 * - Responsive design for mobile and web
 * - Chart type selector
 * - Timeframe selector
 * - Technical indicators toggle
 * - Drawing tools toolbar
 * - Real-time price display
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import InvestmentChart, { CrosshairData, IndicatorConfig } from './InvestmentChart';
import { ChartType } from '@/lib/investments/types/charting.types';
import { Timeframe } from '@/lib/investments/types/investment.types';
import { getMarketDataService, RealtimeUpdate } from '@/lib/investments/services/MarketDataService';
import { CandleData } from '@/lib/investments/types/charting.types';
import { Icon } from '@/components/ui/Icon';

// ============================================================================
// TYPES
// ============================================================================

interface AdvancedChartContainerProps {
  symbol: string;
  initialTimeframe?: Timeframe;
  initialChartType?: ChartType;
  showToolbar?: boolean;
  showIndicatorPanel?: boolean;
  height?: number;
  onSymbolChange?: (symbol: string) => void;
  className?: string;
}

type ViewMode = 'basic' | 'advanced';

// ============================================================================
// CONSTANTS
// ============================================================================

const TIMEFRAMES: { value: Timeframe; label: string }[] = [
  { value: '1m', label: '1m' },
  { value: '5m', label: '5m' },
  { value: '15m', label: '15m' },
  { value: '1h', label: '1H' },
  { value: '4h', label: '4H' },
  { value: '1d', label: '1D' },
  { value: '1w', label: '1W' },
  { value: '1M', label: '1M' },
];

const CHART_TYPES: { value: ChartType; label: string; icon: string }[] = [
  { value: 'candlestick', label: 'Candles', icon: "sparkles" },
  { value: 'line', label: 'Line', icon: "sparkles" },
  { value: 'area', label: 'Area', icon: "sparkles" },
  { value: 'heikin_ashi', label: 'Heikin Ashi', icon: "sparkles" },
];

const AVAILABLE_INDICATORS: { type: IndicatorConfig['type']; label: string; defaultPeriod: number }[] = [
  { type: 'sma', label: 'SMA', defaultPeriod: 20 },
  { type: 'ema', label: 'EMA', defaultPeriod: 20 },
  { type: 'bollinger', label: 'Bollinger Bands', defaultPeriod: 20 },
  { type: 'rsi', label: 'RSI', defaultPeriod: 14 },
  { type: 'macd', label: 'MACD', defaultPeriod: 12 },
];

// ============================================================================
// COMPONENT
// ============================================================================

export function AdvancedChartContainer({
  symbol,
  initialTimeframe = '1d',
  initialChartType = 'candlestick',
  showToolbar = true,
  showIndicatorPanel = true,
  height = 500,
  onSymbolChange,
  className = '',
}: AdvancedChartContainerProps) {
  // State
  const [timeframe, setTimeframe] = useState<Timeframe>(initialTimeframe);
  const [chartType, setChartType] = useState<ChartType>(initialChartType);
  const [viewMode, setViewMode] = useState<ViewMode>('basic');
  const [indicators, setIndicators] = useState<IndicatorConfig[]>([]);
  const [candleData, setCandleData] = useState<CandleData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [crosshairData, setCrosshairData] = useState<CrosshairData | null>(null);
  const [lastPrice, setLastPrice] = useState<number | null>(null);
  const [priceChange, setPriceChange] = useState<number>(0);

  // Market data service
  const marketDataService = useMemo(() => getMarketDataService(), []);

  // Fetch historical data
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await marketDataService.getHistoricalData(symbol, timeframe, 500);
      setCandleData(data);
      if (data.length > 0) {
        const latest = data[data.length - 1];
        const previous = data.length > 1 ? data[data.length - 2] : latest;
        setLastPrice(latest.close);
        setPriceChange(((latest.close - previous.close) / previous.close) * 100);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  }, [symbol, timeframe, marketDataService]);

  // Initial data fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Subscribe to real-time updates
  useEffect(() => {
    const unsubscribe = marketDataService.subscribeToSymbol(symbol, (update: RealtimeUpdate) => {
      setLastPrice(update.price);
      setPriceChange(update.changePercent);
      
      // Update last candle in data
      setCandleData(prev => {
        if (prev.length === 0) return prev;
        const newData = [...prev];
        const lastCandle = { ...newData[newData.length - 1] };
        lastCandle.close = update.price;
        lastCandle.high = Math.max(lastCandle.high, update.price);
        lastCandle.low = Math.min(lastCandle.low, update.price);
        lastCandle.volume += update.volume;
        newData[newData.length - 1] = lastCandle;
        return newData;
      });
    });

    return () => unsubscribe();
  }, [symbol, marketDataService]);

  // Toggle indicator
  const toggleIndicator = (type: IndicatorConfig['type']) => {
    setIndicators(prev => {
      const exists = prev.find(i => i.type === type);
      if (exists) {
        return prev.filter(i => i.type !== type);
      }
      const config = AVAILABLE_INDICATORS.find(i => i.type === type);
      return [...prev, { type, period: config?.defaultPeriod, visible: true }];
    });
  };

  // Handle crosshair data
  const handleCrosshairMove = useCallback((data: CrosshairData | null) => {
    setCrosshairData(data);
  }, []);

  // Calculate chart height
  const chartHeight = showIndicatorPanel && indicators.some(i => i.type === 'rsi' || i.type === 'macd')
    ? height - 100
    : height;

  return (
    <div className={`advanced-chart-container ${className}`}>
      {/* Header with symbol and price */}
      <ChartHeader
        symbol={symbol}
        lastPrice={lastPrice}
        priceChange={priceChange}
        crosshairData={crosshairData}
      />

      {/* Toolbar */}
      {showToolbar && (
        <ChartToolbar
          timeframe={timeframe}
          chartType={chartType}
          viewMode={viewMode}
          onTimeframeChange={setTimeframe}
          onChartTypeChange={setChartType}
          onViewModeChange={setViewMode}
        />
      )}

      {/* Indicator Panel (Advanced Mode) */}
      {showIndicatorPanel && viewMode === 'advanced' && (
        <IndicatorPanel
          indicators={indicators}
          availableIndicators={AVAILABLE_INDICATORS}
          onToggle={toggleIndicator}
        />
      )}

      {/* Chart */}
      <div className="relative">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900/50 z-10">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900/50 z-10">
            <div className="text-red-500 text-center">
              <p>{error}</p>
              <button
                onClick={fetchData}
                className="mt-2 px-4 py-2 bg-blue-600 rounded hover:bg-blue-700"
              >
                Retry
              </button>
            </div>
          </div>
        )}

        <InvestmentChart
          symbol={symbol}
          data={candleData}
          chartType={chartType}
          timeframe={timeframe}
          height={chartHeight}
          showVolume={true}
          showGrid={true}
          theme="dark"
          indicators={viewMode === 'advanced' ? indicators : []}
          onCrosshairMove={handleCrosshairMove}
        />
      </div>
    </div>
  );
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

interface ChartHeaderProps {
  symbol: string;
  lastPrice: number | null;
  priceChange: number;
  crosshairData: CrosshairData | null;
}

function ChartHeader({ symbol, lastPrice, priceChange, crosshairData }: ChartHeaderProps) {
  const displayPrice = crosshairData?.price ?? lastPrice;
  const isPositive = priceChange >= 0;

  return (
    <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700">
      <div className="flex items-center gap-4">
        <h2 className="text-xl font-bold text-white">{symbol}</h2>
        {displayPrice && (
          <span className="text-2xl font-semibold text-white">
            ${displayPrice.toFixed(2)}
          </span>
        )}
        <span className={`text-sm font-medium ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
          {isPositive ? '+' : ''}{priceChange.toFixed(2)}%
        </span>
      </div>

      {crosshairData && (
        <div className="flex items-center gap-4 text-sm text-gray-400 dark:text-slate-500">
          <span>O: ${crosshairData.open?.toFixed(2)}</span>
          <span>H: ${crosshairData.high?.toFixed(2)}</span>
          <span>L: ${crosshairData.low?.toFixed(2)}</span>
          <span>C: ${crosshairData.close?.toFixed(2)}</span>
          {crosshairData.volume && (
            <span>Vol: {(crosshairData.volume / 1000000).toFixed(2)}M</span>
          )}
        </div>
      )}
    </div>
  );
}

interface ChartToolbarProps {
  timeframe: Timeframe;
  chartType: ChartType;
  viewMode: ViewMode;
  onTimeframeChange: (tf: Timeframe) => void;
  onChartTypeChange: (ct: ChartType) => void;
  onViewModeChange: (vm: ViewMode) => void;
}

function ChartToolbar({
  timeframe,
  chartType,
  viewMode,
  onTimeframeChange,
  onChartTypeChange,
  onViewModeChange,
}: ChartToolbarProps) {
  return (
    <div className="flex items-center justify-between px-4 py-2 bg-gray-800/50 border-b border-gray-700">
      {/* Timeframe Selector */}
      <div className="flex items-center gap-1">
        {TIMEFRAMES.map(tf => (
          <button
            key={tf.value}
            onClick={() => onTimeframeChange(tf.value)}
            className={`px-3 py-1 text-sm rounded transition-colors ${
              timeframe === tf.value
                ? 'bg-blue-600 text-white'
                : 'text-gray-400 dark:text-slate-500 hover:text-white hover:bg-gray-700'
            }`}
          >
            {tf.label}
          </button>
        ))}
      </div>

      {/* Chart Type Selector */}
      <div className="flex items-center gap-2">
        {CHART_TYPES.map(ct => (
          <button
            key={ct.value}
            onClick={() => onChartTypeChange(ct.value)}
            title={ct.label}
            className={`px-2 py-1 text-sm rounded transition-colors ${
              chartType === ct.value
                ? 'bg-blue-600 text-white'
                : 'text-gray-400 dark:text-slate-500 hover:text-white hover:bg-gray-700'
            }`}
          >
            {ct.icon}
          </button>
        ))}
      </div>

      {/* View Mode Toggle */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => onViewModeChange(viewMode === 'basic' ? 'advanced' : 'basic')}
          className={`px-3 py-1 text-sm rounded transition-colors ${
            viewMode === 'advanced'
              ? 'bg-purple-600 text-white'
              : 'text-gray-400 dark:text-slate-500 hover:text-white hover:bg-gray-700'
          }`}
        >
          {viewMode === 'advanced' ? 'Advanced' : 'Basic'}
        </button>
      </div>
    </div>
  );
}

interface IndicatorPanelProps {
  indicators: IndicatorConfig[];
  availableIndicators: typeof AVAILABLE_INDICATORS;
  onToggle: (type: IndicatorConfig['type']) => void;
}

function IndicatorPanel({ indicators, availableIndicators, onToggle }: IndicatorPanelProps) {
  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-gray-800/30 border-b border-gray-700 overflow-x-auto">
      <span className="text-sm text-gray-500 dark:text-slate-400 whitespace-nowrap">Indicators:</span>
      {availableIndicators.map(ind => {
        const isActive = indicators.some(i => i.type === ind.type);
        return (
          <button
            key={ind.type}
            onClick={() => onToggle(ind.type)}
            className={`px-3 py-1 text-sm rounded whitespace-nowrap transition-colors ${
              isActive
                ? 'bg-green-600 text-white'
                : 'bg-gray-700 text-gray-400 dark:text-slate-500 hover:text-white hover:bg-gray-600'
            }`}
          >
            {ind.label}
          </button>
        );
      })}
    </div>
  );
}

export default AdvancedChartContainer;

