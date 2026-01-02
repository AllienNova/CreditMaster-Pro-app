'use client';

/**
 * InvestmentChart - TradingView Lightweight Charts Integration
 * 
 * Core chart component supporting candlestick, line, and area charts
 * with real-time updates and technical indicators
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  createChart,
  IChartApi,
  ISeriesApi,
  CandlestickData,
  LineData,
  HistogramData,
  ColorType,
  CrosshairMode,
  LineStyle,
  Time,
  CandlestickSeries,
  LineSeries,
  AreaSeries,
  HistogramSeries,
  CandlestickSeriesPartialOptions,
  LineSeriesPartialOptions,
  AreaSeriesPartialOptions,
  HistogramSeriesPartialOptions,
} from 'lightweight-charts';
import { CandleData, ChartType, ChartColors } from '@/lib/investments/types/charting.types';
import { Timeframe } from '@/lib/investments/types/investment.types';

// ============================================================================
// TYPES
// ============================================================================

export interface InvestmentChartProps {
  symbol: string;
  data: CandleData[];
  chartType?: ChartType;
  timeframe?: Timeframe;
  height?: number;
  showVolume?: boolean;
  showGrid?: boolean;
  theme?: 'light' | 'dark';
  indicators?: IndicatorConfig[];
  onCrosshairMove?: (data: CrosshairData | null) => void;
  onTimeRangeChange?: (from: number, to: number) => void;
  className?: string;
}

export interface IndicatorConfig {
  type: 'sma' | 'ema' | 'bollinger' | 'rsi' | 'macd';
  period?: number;
  color?: string;
  visible?: boolean;
}

export interface CrosshairData {
  time: Time;
  price: number;
  open?: number;
  high?: number;
  low?: number;
  close?: number;
  volume?: number;
}

// ============================================================================
// THEME CONFIGURATIONS
// ============================================================================

const lightTheme: ChartColors = {
  background: '#ffffff',
  gridLines: '#f0f0f0',
  text: '#333333',
  bullCandle: '#26a69a',
  bearCandle: '#ef5350',
  bullWick: '#26a69a',
  bearWick: '#ef5350',
  volumeBull: 'rgba(38, 166, 154, 0.5)',
  volumeBear: 'rgba(239, 83, 80, 0.5)',
  crosshair: '#758696',
};

const darkTheme: ChartColors = {
  background: '#1e222d',
  gridLines: '#2b2f3a',
  text: '#d1d4dc',
  bullCandle: '#26a69a',
  bearCandle: '#ef5350',
  bullWick: '#26a69a',
  bearWick: '#ef5350',
  volumeBull: 'rgba(38, 166, 154, 0.5)',
  volumeBear: 'rgba(239, 83, 80, 0.5)',
  crosshair: '#758696',
};

// ============================================================================
// COMPONENT
// ============================================================================

export function InvestmentChart({
  symbol,
  data,
  chartType = 'candlestick',
  timeframe = '1d',
  height = 400,
  showVolume = true,
  showGrid = true,
  theme = 'dark',
  indicators = [],
  onCrosshairMove,
  onTimeRangeChange,
  className = '',
}: InvestmentChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const mainSeriesRef = useRef<ISeriesApi<any> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<any> | null>(null);
  const indicatorSeriesRef = useRef<Map<string, ISeriesApi<any>>>(new Map());
  
  const colors = theme === 'dark' ? darkTheme : lightTheme;

  // Initialize chart
  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height,
      layout: {
        background: { type: ColorType.Solid, color: colors.background },
        textColor: colors.text,
      },
      grid: {
        vertLines: { color: showGrid ? colors.gridLines : 'transparent' },
        horzLines: { color: showGrid ? colors.gridLines : 'transparent' },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color: colors.crosshair, width: 1, style: LineStyle.Dashed },
        horzLine: { color: colors.crosshair, width: 1, style: LineStyle.Dashed },
      },
      rightPriceScale: {
        borderColor: colors.gridLines,
        scaleMargins: { top: 0.1, bottom: showVolume ? 0.2 : 0.1 },
      },
      timeScale: {
        borderColor: colors.gridLines,
        timeVisible: true,
        secondsVisible: false,
      },
    });

    chartRef.current = chart;

    // Handle resize
    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({ width: chartContainerRef.current.clientWidth });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
      chartRef.current = null;
    };
  }, [height, colors, showGrid, showVolume]);

  // Update series when chart type or data changes
  useEffect(() => {
    if (!chartRef.current || !data.length) return;

    // Remove existing main series
    if (mainSeriesRef.current) {
      chartRef.current.removeSeries(mainSeriesRef.current);
      mainSeriesRef.current = null;
    }

    // Create new series based on chart type
    createMainSeries();
  }, [chartType, data, colors]);

  // Create main series
  const createMainSeries = useCallback(() => {
    if (!chartRef.current) return;

    const chart = chartRef.current;
    const formattedData = formatChartData(data, chartType);

    switch (chartType) {
      case 'candlestick':
      case 'heikin_ashi': {
        const options: CandlestickSeriesPartialOptions = {
          upColor: colors.bullCandle,
          downColor: colors.bearCandle,
          borderUpColor: colors.bullWick,
          borderDownColor: colors.bearWick,
          wickUpColor: colors.bullWick,
          wickDownColor: colors.bearWick,
        };
        const series = chart.addSeries(CandlestickSeries, options);
        series.setData(formattedData as CandlestickData<Time>[]);
        mainSeriesRef.current = series;
        break;
      }
      case 'line': {
        const options: LineSeriesPartialOptions = {
          color: colors.bullCandle,
          lineWidth: 2,
        };
        const series = chart.addSeries(LineSeries, options);
        series.setData(formattedData as LineData<Time>[]);
        mainSeriesRef.current = series;
        break;
      }
      case 'area': {
        const options: AreaSeriesPartialOptions = {
          topColor: 'rgba(38, 166, 154, 0.4)',
          bottomColor: 'rgba(38, 166, 154, 0.0)',
          lineColor: colors.bullCandle,
          lineWidth: 2,
        };
        const series = chart.addSeries(AreaSeries, options);
        series.setData(formattedData as LineData<Time>[]);
        mainSeriesRef.current = series;
        break;
      }
    }

    // Add volume if enabled
    if (showVolume) {
      addVolumeSeries(data);
    }

    // Fit content
    chart.timeScale().fitContent();
  }, [data, chartType, colors, showVolume]);

  // Add volume series
  const addVolumeSeries = useCallback((candleData: CandleData[]) => {
    if (!chartRef.current) return;

    if (volumeSeriesRef.current) {
      chartRef.current.removeSeries(volumeSeriesRef.current);
    }

    const options: HistogramSeriesPartialOptions = {
      priceFormat: { type: 'volume' },
      priceScaleId: 'volume',
    };
    const volumeSeries = chartRef.current.addSeries(HistogramSeries, options);

    chartRef.current.priceScale('volume').applyOptions({
      scaleMargins: { top: 0.8, bottom: 0 },
    });

    const volumeData: HistogramData<Time>[] = candleData.map((d) => ({
      time: (d.timestamp / 1000) as Time,
      value: d.volume,
      color: d.close >= d.open ? colors.volumeBull : colors.volumeBear,
    }));

    volumeSeries.setData(volumeData);
    volumeSeriesRef.current = volumeSeries;
  }, [colors]);

  // Handle crosshair movement
  useEffect(() => {
    if (!chartRef.current || !onCrosshairMove) return;

    const handleCrosshair = (param: any) => {
      if (!param.time || !mainSeriesRef.current) {
        onCrosshairMove(null);
        return;
      }

      const seriesData = param.seriesData.get(mainSeriesRef.current);
      if (seriesData) {
        onCrosshairMove({
          time: param.time,
          price: seriesData.close || seriesData.value,
          open: seriesData.open,
          high: seriesData.high,
          low: seriesData.low,
          close: seriesData.close,
          volume: volumeSeriesRef.current
            ? param.seriesData.get(volumeSeriesRef.current)?.value
            : undefined,
        });
      }
    };

    chartRef.current.subscribeCrosshairMove(handleCrosshair);
    return () => {
      chartRef.current?.unsubscribeCrosshairMove(handleCrosshair);
    };
  }, [onCrosshairMove]);

  // Initialize series on mount
  useEffect(() => {
    if (chartRef.current && data.length) {
      createMainSeries();
    }
  }, [createMainSeries]);

  // Update data in real-time
  const updateData = useCallback((newCandle: CandleData) => {
    if (!mainSeriesRef.current) return;

    const formattedCandle = formatSingleCandle(newCandle, chartType);
    mainSeriesRef.current.update(formattedCandle as any);

    if (volumeSeriesRef.current) {
      volumeSeriesRef.current.update({
        time: (newCandle.timestamp / 1000) as Time,
        value: newCandle.volume,
        color: newCandle.close >= newCandle.open ? colors.volumeBull : colors.volumeBear,
      });
    }
  }, [chartType, colors]);

  return (
    <div className={`investment-chart-container ${className}`}>
      <div ref={chartContainerRef} className="chart-wrapper" style={{ height }} />
    </div>
  );
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function formatChartData(data: CandleData[], chartType: ChartType): CandlestickData<Time>[] | LineData<Time>[] {
  if (chartType === 'line' || chartType === 'area') {
    return data.map((d) => ({
      time: (d.timestamp / 1000) as Time,
      value: d.close,
    }));
  }

  if (chartType === 'heikin_ashi') {
    return calculateHeikinAshi(data);
  }

  return data.map((d) => ({
    time: (d.timestamp / 1000) as Time,
    open: d.open,
    high: d.high,
    low: d.low,
    close: d.close,
  }));
}

function formatSingleCandle(candle: CandleData, chartType: ChartType): CandlestickData<Time> | LineData<Time> {
  if (chartType === 'line' || chartType === 'area') {
    return {
      time: (candle.timestamp / 1000) as Time,
      value: candle.close,
    };
  }

  return {
    time: (candle.timestamp / 1000) as Time,
    open: candle.open,
    high: candle.high,
    low: candle.low,
    close: candle.close,
  };
}

function calculateHeikinAshi(data: CandleData[]): CandlestickData<Time>[] {
  const result: CandlestickData<Time>[] = [];

  for (let i = 0; i < data.length; i++) {
    const current = data[i];
    const prev = i > 0 ? result[i - 1] : null;

    const haClose = (current.open + current.high + current.low + current.close) / 4;
    const haOpen = prev ? (prev.open + prev.close) / 2 : (current.open + current.close) / 2;
    const haHigh = Math.max(current.high, haOpen, haClose);
    const haLow = Math.min(current.low, haOpen, haClose);

    result.push({
      time: (current.timestamp / 1000) as Time,
      open: haOpen,
      high: haHigh,
      low: haLow,
      close: haClose,
    });
  }

  return result;
}

export default InvestmentChart;

