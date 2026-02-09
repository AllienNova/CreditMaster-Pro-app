'use client';


import { Icon } from '@/components/ui/Icon';
/**
 * Trading Chart Container
 * 
 * Full-featured trading interface with:
 * - Symbol search and selection
 * - Timeframe controls
 * - Chart type selector
 * - Indicator toggles
 * - Drawing tools
 * - Real-time OHLCV display
 * - Trade execution panel
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { TradingChart, type IndicatorSettings, type TradeMarker, type CrosshairInfo, type ChartType, type Timeframe } from './TradingChart';
import type { OHLCV } from '@/lib/trading/charts/technical-indicators';

// ============================================================================
// TYPES
// ============================================================================

interface TradingChartContainerProps {
  initialSymbol?: string;
  onSymbolChange?: (symbol: string) => void;
  onTradeExecute?: (trade: { symbol: string; side: 'buy' | 'sell'; quantity: number; price: number }) => void;
  className?: string;
}

interface SymbolInfo {
  symbol: string;
  name: string;
  exchange: string;
  type: 'stock' | 'etf' | 'crypto' | 'forex';
}

// ============================================================================
// CONSTANTS
// ============================================================================

const TIMEFRAMES: { value: Timeframe; label: string; shortLabel: string }[] = [
  { value: '1m', label: '1 Minute', shortLabel: '1m' },
  { value: '5m', label: '5 Minutes', shortLabel: '5m' },
  { value: '15m', label: '15 Minutes', shortLabel: '15m' },
  { value: '1h', label: '1 Hour', shortLabel: '1H' },
  { value: '4h', label: '4 Hours', shortLabel: '4H' },
  { value: '1d', label: '1 Day', shortLabel: '1D' },
  { value: '1w', label: '1 Week', shortLabel: '1W' },
  { value: '1M', label: '1 Month', shortLabel: '1M' },
];

const CHART_TYPES: { value: ChartType; label: string; icon: string }[] = [
  { value: 'candlestick', label: 'Candlestick', icon: "sparkles" },
  { value: 'heikin_ashi', label: 'Heikin Ashi', icon: "sparkles" },
  { value: 'line', label: 'Line', icon: "sparkles" },
  { value: 'area', label: 'Area', icon: "sparkles" },
];

const INDICATOR_OPTIONS = [
  { id: 'sma', label: 'SMA', category: 'overlay' },
  { id: 'ema', label: 'EMA', category: 'overlay' },
  { id: 'bollinger', label: 'Bollinger Bands', category: 'overlay' },
  { id: 'vwap', label: 'VWAP', category: 'overlay' },
  { id: 'rsi', label: 'RSI', category: 'oscillator' },
  { id: 'macd', label: 'MACD', category: 'oscillator' },
];

// ============================================================================
// MOCK DATA (Replace with real market data service)
// ============================================================================

function generateMockData(symbol: string, timeframe: Timeframe, bars: number = 200): OHLCV[] {
  const data: OHLCV[] = [];
  const now = Date.now();
  const intervalMs = getIntervalMs(timeframe);
  
  let price = symbol.includes('BTC') ? 45000 : symbol.includes('ETH') ? 2500 : 150;
  const volatility = price * 0.02;

  for (let i = bars - 1; i >= 0; i--) {
    const timestamp = now - i * intervalMs;
    const change = (Math.random() - 0.5) * volatility;
    const open = price;
    const close = price + change;
    const high = Math.max(open, close) + Math.random() * volatility * 0.5;
    const low = Math.min(open, close) - Math.random() * volatility * 0.5;
    const volume = Math.floor(Math.random() * 1000000) + 100000;

    data.push({ timestamp, open, high, low, close, volume });
    price = close;
  }

  return data;
}

function getIntervalMs(timeframe: Timeframe): number {
  const intervals: Record<Timeframe, number> = {
    '1m': 60000,
    '5m': 300000,
    '15m': 900000,
    '1h': 3600000,
    '4h': 14400000,
    '1d': 86400000,
    '1w': 604800000,
    '1M': 2592000000,
  };
  return intervals[timeframe];
}

// ============================================================================
// COMPONENT
// ============================================================================

export function TradingChartContainer({
  initialSymbol = 'AAPL',
  onSymbolChange,
  onTradeExecute,
  className = '',
}: TradingChartContainerProps) {
  // State
  const [symbol, setSymbol] = useState(initialSymbol);
  const [symbolSearch, setSymbolSearch] = useState('');
  const [showSymbolSearch, setShowSymbolSearch] = useState(false);
  const [timeframe, setTimeframe] = useState<Timeframe>('1d');
  const [chartType, setChartType] = useState<ChartType>('candlestick');
  const [data, setData] = useState<OHLCV[]>([]);
  const [loading, setLoading] = useState(true);
  const [crosshairInfo, setCrosshairInfo] = useState<CrosshairInfo | null>(null);
  const [showIndicatorPanel, setShowIndicatorPanel] = useState(false);
  const [trades, setTrades] = useState<TradeMarker[]>([]);

  // Indicator settings
  const [indicators, setIndicators] = useState<IndicatorSettings>({
    sma: { enabled: false, periods: [20, 50, 200], colors: ['#2962FF', '#FF6D00', '#AB47BC'] },
    ema: { enabled: false, periods: [12, 26], colors: ['#00BCD4', '#FFEB3B'] },
    bollinger: { enabled: false, period: 20, stdDev: 2 },
    vwap: { enabled: false },
    rsi: { enabled: false, period: 14 },
    macd: { enabled: false, fast: 12, slow: 26, signal: 9 },
  });

  // Fetch data when symbol or timeframe changes
  useEffect(() => {
    setLoading(true);
    // In production, fetch from market data service
    const mockData = generateMockData(symbol, timeframe, 300);
    setData(mockData);
    setLoading(false);
    onSymbolChange?.(symbol);
  }, [symbol, timeframe, onSymbolChange]);

  // Toggle indicator
  const toggleIndicator = useCallback((indicatorId: keyof IndicatorSettings) => {
    setIndicators(prev => ({
      ...prev,
      [indicatorId]: {
        ...prev[indicatorId],
        enabled: !prev[indicatorId].enabled,
      },
    }));
  }, []);

  // Handle crosshair data
  const handleCrosshairMove = useCallback((info: CrosshairInfo | null) => {
    setCrosshairInfo(info);
  }, []);

  // Calculate current price info
  const currentPriceInfo = useMemo(() => {
    if (!data.length) return null;
    const latest = data[data.length - 1];
    const previous = data.length > 1 ? data[data.length - 2] : latest;
    const change = latest.close - previous.close;
    const changePercent = (change / previous.close) * 100;
    return { price: latest.close, change, changePercent, volume: latest.volume };
  }, [data]);

  // Display price (crosshair or current)
  const displayOHLCV = crosshairInfo?.ohlcv || (data.length ? data[data.length - 1] : null);

  return (
    <div className={`trading-chart-container bg-gray-900 rounded-lg overflow-hidden ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-800 border-b border-gray-700">
        {/* Symbol & Price */}
        <div className="flex items-center gap-4">
          {/* Symbol Selector */}
          <div className="relative">
            <button
              onClick={() => setShowSymbolSearch(!showSymbolSearch)}
              className="flex items-center gap-2 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-white font-semibold"
            >
              <span className="text-lg">{symbol}</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {showSymbolSearch && (
              <div className="absolute top-full left-0 mt-1 w-64 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50">
                <input
                  type="text"
                  value={symbolSearch}
                  onChange={(e) => setSymbolSearch(e.target.value.toUpperCase())}
                  placeholder="Search symbol..."
                  className="w-full px-3 py-2 bg-gray-700 text-white border-b border-gray-600 rounded-t-lg focus:outline-none"
                  autoFocus
                />
                <div className="max-h-48 overflow-y-auto">
                  {['AAPL', 'GOOGL', 'MSFT', 'AMZN', 'TSLA', 'NVDA', 'META', 'BTC-USD', 'ETH-USD']
                    .filter(s => s.includes(symbolSearch))
                    .map(s => (
                      <button
                        key={s}
                        onClick={() => {
                          setSymbol(s);
                          setShowSymbolSearch(false);
                          setSymbolSearch('');
                        }}
                        className="w-full px-3 py-2 text-left text-white hover:bg-gray-700"
                      >
                        {s}
                      </button>
                    ))}
                </div>
              </div>
            )}
          </div>

          {/* Price Display */}
          {currentPriceInfo && (
            <div className="flex items-center gap-3">
              <span className="text-2xl font-bold text-white">
                ${currentPriceInfo.price.toFixed(2)}
              </span>
              <span className={`text-sm font-medium px-2 py-0.5 rounded ${
                currentPriceInfo.change >= 0 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
              }`}>
                {currentPriceInfo.change >= 0 ? '+' : ''}{currentPriceInfo.change.toFixed(2)} ({currentPriceInfo.changePercent.toFixed(2)}%)
              </span>
            </div>
          )}
        </div>

        {/* OHLCV Display */}
        {displayOHLCV && (
          <div className="hidden md:flex items-center gap-4 text-sm">
            <div className="flex gap-1">
              <span className="text-gray-500 dark:text-slate-400">O:</span>
              <span className="text-white">{displayOHLCV.open.toFixed(2)}</span>
            </div>
            <div className="flex gap-1">
              <span className="text-gray-500 dark:text-slate-400">H:</span>
              <span className="text-green-400">{displayOHLCV.high.toFixed(2)}</span>
            </div>
            <div className="flex gap-1">
              <span className="text-gray-500 dark:text-slate-400">L:</span>
              <span className="text-red-400">{displayOHLCV.low.toFixed(2)}</span>
            </div>
            <div className="flex gap-1">
              <span className="text-gray-500 dark:text-slate-400">C:</span>
              <span className="text-white">{displayOHLCV.close.toFixed(2)}</span>
            </div>
            <div className="flex gap-1">
              <span className="text-gray-500 dark:text-slate-400">Vol:</span>
              <span className="text-gray-300">{(displayOHLCV.volume / 1000000).toFixed(2)}M</span>
            </div>
          </div>
        )}
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-800/50 border-b border-gray-700">
        {/* Timeframe Selector */}
        <div className="flex items-center gap-1">
          {TIMEFRAMES.map(tf => (
            <button
              key={tf.value}
              onClick={() => setTimeframe(tf.value)}
              className={`px-2.5 py-1 text-sm rounded transition-colors ${
                timeframe === tf.value
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 dark:text-slate-500 hover:text-white hover:bg-gray-700'
              }`}
              title={tf.label}
            >
              {tf.shortLabel}
            </button>
          ))}
        </div>

        {/* Chart Type & Indicators */}
        <div className="flex items-center gap-2">
          {/* Chart Type */}
          <div className="flex items-center gap-1 border-r border-gray-700 pr-2 mr-2">
            {CHART_TYPES.map(ct => (
              <button
                key={ct.value}
                onClick={() => setChartType(ct.value)}
                className={`px-2 py-1 text-sm rounded transition-colors ${
                  chartType === ct.value
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-400 dark:text-slate-500 hover:text-white hover:bg-gray-700'
                }`}
                title={ct.label}
              >
                {ct.icon}
              </button>
            ))}
          </div>

          {/* Indicators Toggle */}
          <button
            onClick={() => setShowIndicatorPanel(!showIndicatorPanel)}
            className={`px-3 py-1 text-sm rounded transition-colors ${
              showIndicatorPanel
                ? 'bg-purple-600 text-white'
                : 'text-gray-400 dark:text-slate-500 hover:text-white hover:bg-gray-700'
            }`}
          >
            Indicators
          </button>
        </div>
      </div>

      {/* Indicator Panel */}
      {showIndicatorPanel && (
        <div className="px-4 py-2 bg-gray-800/30 border-b border-gray-700">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-gray-500 dark:text-slate-400 mr-2">Overlays:</span>
            {INDICATOR_OPTIONS.filter(i => i.category === 'overlay').map(ind => (
              <button
                key={ind.id}
                onClick={() => toggleIndicator(ind.id as keyof IndicatorSettings)}
                className={`px-2.5 py-1 text-xs rounded transition-colors ${
                  indicators[ind.id as keyof IndicatorSettings].enabled
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 text-gray-400 dark:text-slate-500 hover:bg-gray-600'
                }`}
              >
                {ind.label}
              </button>
            ))}
            
            <span className="text-xs text-gray-500 dark:text-slate-400 ml-4 mr-2">Oscillators:</span>
            {INDICATOR_OPTIONS.filter(i => i.category === 'oscillator').map(ind => (
              <button
                key={ind.id}
                onClick={() => toggleIndicator(ind.id as keyof IndicatorSettings)}
                className={`px-2.5 py-1 text-xs rounded transition-colors ${
                  indicators[ind.id as keyof IndicatorSettings].enabled
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-700 text-gray-400 dark:text-slate-500 hover:bg-gray-600'
                }`}
              >
                {ind.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Chart */}
      <div className="relative">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900/80 z-10">
            <div className="flex items-center gap-3">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
              <span className="text-gray-400 dark:text-slate-500">Loading chart...</span>
            </div>
          </div>
        )}

        <TradingChart
          symbol={symbol}
          data={data}
          chartType={chartType}
          theme="dark"
          height={500}
          indicators={indicators}
          trades={trades}
          showVolume={true}
          showPatterns={true}
          onCrosshairMove={handleCrosshairMove}
        />
      </div>

      {/* Quick Trade Panel */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-800 border-t border-gray-700">
        <div className="flex items-center gap-2 text-sm text-gray-400 dark:text-slate-500">
          <span>Quick Trade:</span>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="number"
            placeholder="Qty"
            className="w-20 px-2 py-1.5 text-sm bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
            defaultValue={100}
          />
          <button
            onClick={() => onTradeExecute?.({ symbol, side: 'buy', quantity: 100, price: currentPriceInfo?.price || 0 })}
            className="px-4 py-1.5 text-sm font-medium bg-green-600 hover:bg-green-700 text-white rounded transition-colors"
          >
            Buy
          </button>
          <button
            onClick={() => onTradeExecute?.({ symbol, side: 'sell', quantity: 100, price: currentPriceInfo?.price || 0 })}
            className="px-4 py-1.5 text-sm font-medium bg-red-600 hover:bg-red-700 text-white rounded transition-colors"
          >
            Sell
          </button>
        </div>
      </div>
    </div>
  );
}

export default TradingChartContainer;
