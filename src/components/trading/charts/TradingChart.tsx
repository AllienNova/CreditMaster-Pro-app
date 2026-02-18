"use client";

/**
 * Professional Trading Chart
 *
 * Full-featured trading chart with:
 * - TradingView lightweight-charts for main price display
 * - Separate indicator panes (RSI, MACD, Stochastic)
 * - Trade entry/exit markers
 * - Support/resistance lines
 * - Pattern annotations
 * - Real-time updates
 */

import React, {
  useEffect,
  useRef,
  useState,
  useCallback,
  useMemo,
} from "react";
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
  BaselineSeries,
} from "lightweight-charts";
import {
  calculateSMA,
  calculateEMA,
  calculateBollingerBands,
  calculateRSI,
  calculateMACD,
  calculateVWAP,
  calculateATR,
  detectCandlePatterns,
  type OHLCV,
  type CandlePattern,
} from "@/lib/trading/charts/technical-indicators";

// ============================================================================
// TYPES
// ============================================================================

export type ChartTheme = "dark" | "light";
export type ChartType = "candlestick" | "line" | "area" | "heikin_ashi";
export type Timeframe = "1m" | "5m" | "15m" | "1h" | "4h" | "1d" | "1w" | "1M";

export interface TradeMarker {
  id: string;
  timestamp: number;
  price: number;
  type: "entry_long" | "entry_short" | "exit" | "stop_loss" | "take_profit";
  label?: string;
  quantity?: number;
  pnl?: number;
}

export interface SupportResistance {
  price: number;
  type: "support" | "resistance";
  strength: number;
  touches: number;
}

export interface IndicatorSettings {
  sma: { enabled: boolean; periods: number[]; colors: string[] };
  ema: { enabled: boolean; periods: number[]; colors: string[] };
  bollinger: { enabled: boolean; period: number; stdDev: number };
  vwap: { enabled: boolean };
  rsi: { enabled: boolean; period: number };
  macd: { enabled: boolean; fast: number; slow: number; signal: number };
}

export interface TradingChartProps {
  symbol: string;
  data: OHLCV[];
  chartType?: ChartType;
  theme?: ChartTheme;
  height?: number;
  indicators?: Partial<IndicatorSettings>;
  trades?: TradeMarker[];
  supportResistance?: SupportResistance[];
  showVolume?: boolean;
  showPatterns?: boolean;
  onCrosshairMove?: (data: CrosshairInfo | null) => void;
  onChartReady?: (chart: IChartApi) => void;
  className?: string;
}

export interface CrosshairInfo {
  time: Time;
  price: number;
  ohlcv?: OHLCV;
  indicators?: {
    rsi?: number;
    macd?: { macd: number; signal: number; histogram: number };
  };
}

// ============================================================================
// THEME CONFIG
// ============================================================================

const themes = {
  dark: {
    background: "#131722",
    text: "#d1d4dc",
    grid: "#1e222d",
    border: "#2a2e39",
    bullCandle: "#26a69a",
    bearCandle: "#ef5350",
    volume: { bull: "rgba(38, 166, 154, 0.5)", bear: "rgba(239, 83, 80, 0.5)" },
    crosshair: "#758696",
    indicators: {
      sma: ["#2962FF", "#FF6D00", "#AB47BC"],
      ema: ["#00BCD4", "#FFEB3B", "#E91E63"],
      bollinger: {
        upper: "#787B86",
        middle: "#2196F3",
        lower: "#787B86",
        fill: "rgba(33, 150, 243, 0.1)",
      },
      vwap: "#FF9800",
      rsi: { line: "#7E57C2", overbought: "#ef5350", oversold: "#26a69a" },
      macd: {
        macd: "#2962FF",
        signal: "#FF6D00",
        histPos: "#26a69a",
        histNeg: "#ef5350",
      },
    },
    markers: {
      entryLong: "#26a69a",
      entryShort: "#ef5350",
      exit: "#FFD700",
      stopLoss: "#FF4444",
      takeProfit: "#44FF44",
    },
  },
  light: {
    background: "#ffffff",
    text: "#131722",
    grid: "#f0f3fa",
    border: "#e0e3eb",
    bullCandle: "#26a69a",
    bearCandle: "#ef5350",
    volume: { bull: "rgba(38, 166, 154, 0.5)", bear: "rgba(239, 83, 80, 0.5)" },
    crosshair: "#9598a1",
    indicators: {
      sma: ["#2962FF", "#FF6D00", "#AB47BC"],
      ema: ["#00BCD4", "#FFEB3B", "#E91E63"],
      bollinger: {
        upper: "#787B86",
        middle: "#2196F3",
        lower: "#787B86",
        fill: "rgba(33, 150, 243, 0.1)",
      },
      vwap: "#FF9800",
      rsi: { line: "#7E57C2", overbought: "#ef5350", oversold: "#26a69a" },
      macd: {
        macd: "#2962FF",
        signal: "#FF6D00",
        histPos: "#26a69a",
        histNeg: "#ef5350",
      },
    },
    markers: {
      entryLong: "#26a69a",
      entryShort: "#ef5350",
      exit: "#FFD700",
      stopLoss: "#FF4444",
      takeProfit: "#44FF44",
    },
  },
};

// ============================================================================
// DEFAULT INDICATOR SETTINGS
// ============================================================================

const defaultIndicators: IndicatorSettings = {
  sma: {
    enabled: false,
    periods: [20, 50, 200],
    colors: ["#2962FF", "#FF6D00", "#AB47BC"],
  },
  ema: { enabled: false, periods: [12, 26], colors: ["#00BCD4", "#FFEB3B"] },
  bollinger: { enabled: false, period: 20, stdDev: 2 },
  vwap: { enabled: false },
  rsi: { enabled: false, period: 14 },
  macd: { enabled: false, fast: 12, slow: 26, signal: 9 },
};

// ============================================================================
// COMPONENT
// ============================================================================

export function TradingChart({
  symbol,
  data,
  chartType = "candlestick",
  theme = "dark",
  height = 500,
  indicators: indicatorsProp,
  trades = [],
  supportResistance = [],
  showVolume = true,
  showPatterns = false,
  onCrosshairMove,
  onChartReady,
  className = "",
}: TradingChartProps) {
  // Refs
  const mainChartRef = useRef<HTMLDivElement>(null);
  const rsiChartRef = useRef<HTMLDivElement>(null);
  const macdChartRef = useRef<HTMLDivElement>(null);

  const mainChart = useRef<IChartApi | null>(null);
  const rsiChart = useRef<IChartApi | null>(null);
  const macdChart = useRef<IChartApi | null>(null);

  const mainSeries = useRef<ISeriesApi<any> | null>(null);
  const volumeSeries = useRef<ISeriesApi<"Histogram"> | null>(null);
  const indicatorSeries = useRef<Map<string, ISeriesApi<any>>>(new Map());

  // State
  const [patterns, setPatterns] = useState<CandlePattern[]>([]);

  // Merge indicator settings
  const indicators = useMemo(
    () => ({
      ...defaultIndicators,
      ...indicatorsProp,
    }),
    [indicatorsProp],
  );

  const colors = themes[theme];

  // Calculate indicator pane heights
  const hasRSI = indicators.rsi.enabled;
  const hasMACD = indicators.macd.enabled;
  const indicatorPaneHeight = 120;
  const mainChartHeight =
    height -
    (hasRSI ? indicatorPaneHeight : 0) -
    (hasMACD ? indicatorPaneHeight : 0);

  // Initialize main chart
  useEffect(() => {
    if (!mainChartRef.current) return;

    const chart = createChart(mainChartRef.current, {
      width: mainChartRef.current.clientWidth,
      height: mainChartHeight,
      layout: {
        background: { type: ColorType.Solid, color: colors.background },
        textColor: colors.text,
      },
      grid: {
        vertLines: { color: colors.grid },
        horzLines: { color: colors.grid },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: {
          color: colors.crosshair,
          width: 1,
          style: LineStyle.Dashed,
          labelBackgroundColor: colors.border,
        },
        horzLine: {
          color: colors.crosshair,
          width: 1,
          style: LineStyle.Dashed,
          labelBackgroundColor: colors.border,
        },
      },
      rightPriceScale: {
        borderColor: colors.border,
        scaleMargins: { top: 0.1, bottom: showVolume ? 0.25 : 0.1 },
      },
      timeScale: {
        borderColor: colors.border,
        timeVisible: true,
        secondsVisible: false,
      },
    });

    mainChart.current = chart;
    onChartReady?.(chart);

    // Handle resize
    const handleResize = () => {
      if (mainChartRef.current) {
        chart.applyOptions({ width: mainChartRef.current.clientWidth });
      }
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      chart.remove();
      mainChart.current = null;
    };
  }, [mainChartHeight, colors, showVolume, onChartReady]);

  // Initialize RSI chart
  useEffect(() => {
    if (!hasRSI || !rsiChartRef.current) return;

    const chart = createChart(rsiChartRef.current, {
      width: rsiChartRef.current.clientWidth,
      height: indicatorPaneHeight,
      layout: {
        background: { type: ColorType.Solid, color: colors.background },
        textColor: colors.text,
      },
      grid: {
        vertLines: { color: colors.grid },
        horzLines: { color: colors.grid },
      },
      rightPriceScale: {
        borderColor: colors.border,
        scaleMargins: { top: 0.1, bottom: 0.1 },
      },
      timeScale: {
        visible: !hasMACD,
        borderColor: colors.border,
      },
    });

    rsiChart.current = chart;

    const handleResize = () => {
      if (rsiChartRef.current) {
        chart.applyOptions({ width: rsiChartRef.current.clientWidth });
      }
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      chart.remove();
      rsiChart.current = null;
    };
  }, [hasRSI, hasMACD, colors]);

  // Initialize MACD chart
  useEffect(() => {
    if (!hasMACD || !macdChartRef.current) return;

    const chart = createChart(macdChartRef.current, {
      width: macdChartRef.current.clientWidth,
      height: indicatorPaneHeight,
      layout: {
        background: { type: ColorType.Solid, color: colors.background },
        textColor: colors.text,
      },
      grid: {
        vertLines: { color: colors.grid },
        horzLines: { color: colors.grid },
      },
      rightPriceScale: {
        borderColor: colors.border,
        scaleMargins: { top: 0.1, bottom: 0.1 },
      },
      timeScale: {
        borderColor: colors.border,
        timeVisible: true,
      },
    });

    macdChart.current = chart;

    const handleResize = () => {
      if (macdChartRef.current) {
        chart.applyOptions({ width: macdChartRef.current.clientWidth });
      }
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      chart.remove();
      macdChart.current = null;
    };
  }, [hasMACD, colors]);

  // Update main series and data
  useEffect(() => {
    if (!mainChart.current || !data.length) return;

    // Clear existing series
    if (mainSeries.current) {
      mainChart.current.removeSeries(mainSeries.current);
    }
    indicatorSeries.current.forEach((series) => {
      mainChart.current?.removeSeries(series);
    });
    indicatorSeries.current.clear();

    // Create main price series
    const formattedData = formatCandleData(data, chartType);

    if (chartType === "candlestick" || chartType === "heikin_ashi") {
      const series = mainChart.current.addSeries(CandlestickSeries, {
        upColor: colors.bullCandle,
        downColor: colors.bearCandle,
        borderUpColor: colors.bullCandle,
        borderDownColor: colors.bearCandle,
        wickUpColor: colors.bullCandle,
        wickDownColor: colors.bearCandle,
      });
      series.setData(formattedData as CandlestickData<Time>[]);
      mainSeries.current = series;
    } else if (chartType === "line") {
      const series = mainChart.current.addSeries(LineSeries, {
        color: colors.bullCandle,
        lineWidth: 2,
      });
      series.setData(formattedData as LineData<Time>[]);
      mainSeries.current = series;
    } else if (chartType === "area") {
      const series = mainChart.current.addSeries(AreaSeries, {
        topColor: "rgba(38, 166, 154, 0.4)",
        bottomColor: "rgba(38, 166, 154, 0.0)",
        lineColor: colors.bullCandle,
        lineWidth: 2,
      });
      series.setData(formattedData as LineData<Time>[]);
      mainSeries.current = series;
    }

    // Add volume
    if (showVolume && volumeSeries.current === null) {
      const volSeries = mainChart.current.addSeries(HistogramSeries, {
        priceFormat: { type: "volume" },
        priceScaleId: "volume",
      });
      mainChart.current.priceScale("volume").applyOptions({
        scaleMargins: { top: 0.8, bottom: 0 },
      });
      volumeSeries.current = volSeries;
    }

    if (volumeSeries.current) {
      const volumeData: HistogramData<Time>[] = data.map((d) => ({
        time: (d.timestamp / 1000) as Time,
        value: d.volume,
        color: d.close >= d.open ? colors.volume.bull : colors.volume.bear,
      }));
      volumeSeries.current.setData(volumeData);
    }

    // Add overlay indicators
    addOverlayIndicators(data);

    // Add trade markers
    if (trades.length && mainSeries.current) {
      addTradeMarkers(trades);
    }

    // Add support/resistance lines
    if (supportResistance.length) {
      addSupportResistanceLines(supportResistance);
    }

    // Detect patterns
    if (showPatterns) {
      const detected = detectCandlePatterns(data);
      setPatterns(detected);
    }

    mainChart.current.timeScale().fitContent();
  }, [
    data,
    chartType,
    colors,
    showVolume,
    trades,
    supportResistance,
    showPatterns,
    indicators,
  ]);

  // Add overlay indicators (SMA, EMA, Bollinger, VWAP)
  const addOverlayIndicators = useCallback(
    (ohlcv: OHLCV[]) => {
      if (!mainChart.current) return;

      // SMA
      if (indicators.sma.enabled) {
        indicators.sma.periods.forEach((period, i) => {
          const smaData = calculateSMA(ohlcv, period);
          const series = mainChart.current!.addSeries(LineSeries, {
            color: indicators.sma.colors[i] || colors.indicators.sma[i],
            lineWidth: 1,
            priceLineVisible: false,
            lastValueVisible: false,
          });
          series.setData(
            smaData.map((d) => ({
              time: (d.timestamp / 1000) as Time,
              value: d.value,
            })),
          );
          indicatorSeries.current.set(`sma_${period}`, series);
        });
      }

      // EMA
      if (indicators.ema.enabled) {
        indicators.ema.periods.forEach((period, i) => {
          const emaData = calculateEMA(ohlcv, period);
          const series = mainChart.current!.addSeries(LineSeries, {
            color: indicators.ema.colors[i] || colors.indicators.ema[i],
            lineWidth: 1,
            priceLineVisible: false,
            lastValueVisible: false,
          });
          series.setData(
            emaData.map((d) => ({
              time: (d.timestamp / 1000) as Time,
              value: d.value,
            })),
          );
          indicatorSeries.current.set(`ema_${period}`, series);
        });
      }

      // Bollinger Bands
      if (indicators.bollinger.enabled) {
        const bbData = calculateBollingerBands(
          ohlcv,
          indicators.bollinger.period,
          indicators.bollinger.stdDev,
        );

        const upperSeries = mainChart.current!.addSeries(LineSeries, {
          color: colors.indicators.bollinger.upper,
          lineWidth: 1,
          priceLineVisible: false,
          lastValueVisible: false,
        });
        upperSeries.setData(
          bbData.map((d) => ({
            time: (d.timestamp / 1000) as Time,
            value: d.upper,
          })),
        );

        const middleSeries = mainChart.current!.addSeries(LineSeries, {
          color: colors.indicators.bollinger.middle,
          lineWidth: 1,
          priceLineVisible: false,
          lastValueVisible: false,
        });
        middleSeries.setData(
          bbData.map((d) => ({
            time: (d.timestamp / 1000) as Time,
            value: d.middle,
          })),
        );

        const lowerSeries = mainChart.current!.addSeries(LineSeries, {
          color: colors.indicators.bollinger.lower,
          lineWidth: 1,
          priceLineVisible: false,
          lastValueVisible: false,
        });
        lowerSeries.setData(
          bbData.map((d) => ({
            time: (d.timestamp / 1000) as Time,
            value: d.lower,
          })),
        );

        indicatorSeries.current.set("bb_upper", upperSeries);
        indicatorSeries.current.set("bb_middle", middleSeries);
        indicatorSeries.current.set("bb_lower", lowerSeries);
      }

      // VWAP
      if (indicators.vwap.enabled) {
        const vwapData = calculateVWAP(ohlcv);
        const series = mainChart.current!.addSeries(LineSeries, {
          color: colors.indicators.vwap,
          lineWidth: 2,
          priceLineVisible: false,
          lastValueVisible: true,
        });
        series.setData(
          vwapData.map((d) => ({
            time: (d.timestamp / 1000) as Time,
            value: d.vwap,
          })),
        );
        indicatorSeries.current.set("vwap", series);
      }
    },
    [indicators, colors],
  );

  // Update RSI pane
  useEffect(() => {
    if (!rsiChart.current || !hasRSI || !data.length) return;

    // Clear existing
    rsiChart.current.priceScale("right").applyOptions({
      autoScale: false,
      scaleMargins: { top: 0.1, bottom: 0.1 },
    });

    const rsiData = calculateRSI(data, indicators.rsi.period);

    // Add overbought/oversold lines
    const overboughtLine = rsiChart.current.addSeries(LineSeries, {
      color: colors.indicators.rsi.overbought,
      lineWidth: 1,
      lineStyle: LineStyle.Dashed,
      priceLineVisible: false,
      lastValueVisible: false,
    });
    overboughtLine.setData(
      rsiData.map((d) => ({ time: (d.timestamp / 1000) as Time, value: 70 })),
    );

    const oversoldLine = rsiChart.current.addSeries(LineSeries, {
      color: colors.indicators.rsi.oversold,
      lineWidth: 1,
      lineStyle: LineStyle.Dashed,
      priceLineVisible: false,
      lastValueVisible: false,
    });
    oversoldLine.setData(
      rsiData.map((d) => ({ time: (d.timestamp / 1000) as Time, value: 30 })),
    );

    // RSI line
    const rsiLine = rsiChart.current.addSeries(LineSeries, {
      color: colors.indicators.rsi.line,
      lineWidth: 2,
      priceLineVisible: false,
    });
    rsiLine.setData(
      rsiData.map((d) => ({
        time: (d.timestamp / 1000) as Time,
        value: d.value,
      })),
    );

    rsiChart.current.timeScale().fitContent();
  }, [data, hasRSI, indicators.rsi.period, colors]);

  // Update MACD pane
  useEffect(() => {
    if (!macdChart.current || !hasMACD || !data.length) return;

    const macdData = calculateMACD(
      data,
      indicators.macd.fast,
      indicators.macd.slow,
      indicators.macd.signal,
    );

    // Histogram
    const histogramSeries = macdChart.current.addSeries(HistogramSeries, {
      priceLineVisible: false,
    });
    histogramSeries.setData(
      macdData.map((d) => ({
        time: (d.timestamp / 1000) as Time,
        value: d.histogram,
        color:
          d.histogram >= 0
            ? colors.indicators.macd.histPos
            : colors.indicators.macd.histNeg,
      })),
    );

    // MACD line
    const macdLine = macdChart.current.addSeries(LineSeries, {
      color: colors.indicators.macd.macd,
      lineWidth: 2,
      priceLineVisible: false,
    });
    macdLine.setData(
      macdData.map((d) => ({
        time: (d.timestamp / 1000) as Time,
        value: d.macd,
      })),
    );

    // Signal line
    const signalLine = macdChart.current.addSeries(LineSeries, {
      color: colors.indicators.macd.signal,
      lineWidth: 2,
      priceLineVisible: false,
    });
    signalLine.setData(
      macdData.map((d) => ({
        time: (d.timestamp / 1000) as Time,
        value: d.signal,
      })),
    );

    macdChart.current.timeScale().fitContent();
  }, [data, hasMACD, indicators.macd, colors]);

  // Add trade markers using price lines (compatible with all lightweight-charts versions)
  const addTradeMarkers = useCallback(
    (tradeMarkers: TradeMarker[]) => {
      if (!mainChart.current || !mainSeries.current) return;

      tradeMarkers.forEach((trade, i) => {
        let color = colors.markers.exit;
        let lineStyle = LineStyle.Solid;

        switch (trade.type) {
          case "entry_long":
            color = colors.markers.entryLong;
            break;
          case "entry_short":
            color = colors.markers.entryShort;
            break;
          case "exit":
            color = colors.markers.exit;
            lineStyle = LineStyle.Dashed;
            break;
          case "stop_loss":
            color = colors.markers.stopLoss;
            lineStyle = LineStyle.Dotted;
            break;
          case "take_profit":
            color = colors.markers.takeProfit;
            lineStyle = LineStyle.Dotted;
            break;
        }

        // Create a price line for each trade marker
        mainSeries.current?.createPriceLine({
          price: trade.price,
          color,
          lineWidth: 2,
          lineStyle,
          axisLabelVisible: true,
          title: trade.label || trade.type.replace("_", " ").toUpperCase(),
        });
      });
    },
    [colors],
  );

  // Add support/resistance lines
  const addSupportResistanceLines = useCallback(
    (levels: SupportResistance[]) => {
      if (!mainChart.current) return;

      levels.forEach((level, i) => {
        const series = mainChart.current!.addSeries(LineSeries, {
          color: level.type === "support" ? "#26a69a" : "#ef5350",
          lineWidth: level.strength > 3 ? 2 : 1,
          lineStyle: LineStyle.Dashed,
          priceLineVisible: false,
          lastValueVisible: false,
        });

        // Create horizontal line across all data points
        const lineData = data.map((d) => ({
          time: (d.timestamp / 1000) as Time,
          value: level.price,
        }));
        series.setData(lineData);
        indicatorSeries.current.set(`sr_${i}`, series);
      });
    },
    [data],
  );

  // Sync time scales
  useEffect(() => {
    if (!mainChart.current) return;

    const charts = [rsiChart.current, macdChart.current].filter(
      Boolean,
    ) as IChartApi[];

    const syncTimeScale = (sourceChart: IChartApi) => {
      const timeRange = sourceChart.timeScale().getVisibleLogicalRange();
      if (timeRange) {
        charts.forEach((chart) => {
          if (chart !== sourceChart) {
            chart.timeScale().setVisibleLogicalRange(timeRange);
          }
        });
        mainChart.current?.timeScale().setVisibleLogicalRange(timeRange);
      }
    };

    mainChart.current.timeScale().subscribeVisibleLogicalRangeChange(() => {
      syncTimeScale(mainChart.current!);
    });

    charts.forEach((chart) => {
      chart.timeScale().subscribeVisibleLogicalRangeChange(() => {
        syncTimeScale(chart);
      });
    });
  }, [hasRSI, hasMACD]);

  // Crosshair sync
  useEffect(() => {
    if (!mainChart.current || !onCrosshairMove) return;

    mainChart.current.subscribeCrosshairMove((param) => {
      if (!param.time || !mainSeries.current) {
        onCrosshairMove(null);
        return;
      }

      const seriesData = param.seriesData.get(mainSeries.current);
      const ohlcv = data.find(
        (d) => Math.floor(d.timestamp / 1000) === param.time,
      );

      onCrosshairMove({
        time: param.time,
        price: (seriesData as any)?.close || (seriesData as any)?.value || 0,
        ohlcv,
      });
    });
  }, [data, onCrosshairMove]);

  return (
    <div className={`trading-chart ${className}`}>
      {/* Main Chart */}
      <div ref={mainChartRef} className="main-chart" />

      {/* RSI Pane */}
      {hasRSI && (
        <div className="indicator-pane border-t border-gray-700">
          <div className="indicator-label absolute left-2 top-1 text-xs text-gray-500 z-10">
            RSI({indicators.rsi.period})
          </div>
          <div ref={rsiChartRef} />
        </div>
      )}

      {/* MACD Pane */}
      {hasMACD && (
        <div className="indicator-pane border-t border-gray-700">
          <div className="indicator-label absolute left-2 top-1 text-xs text-gray-500 z-10">
            MACD({indicators.macd.fast},{indicators.macd.slow},
            {indicators.macd.signal})
          </div>
          <div ref={macdChartRef} />
        </div>
      )}

      {/* Pattern Annotations */}
      {showPatterns && patterns.length > 0 && (
        <div className="pattern-annotations absolute top-2 right-2 bg-gray-800/80 rounded p-2 text-xs max-h-32 overflow-y-auto">
          {patterns.slice(-5).map((p, i) => (
            <div
              key={i}
              className={`flex items-center gap-2 ${
                p.type === "bullish"
                  ? "text-green-400"
                  : p.type === "bearish"
                    ? "text-red-400"
                    : "text-gray-400"
              }`}
            >
              <span>
                {p.type === "bullish" ? "▲" : p.type === "bearish" ? "▼" : "●"}
              </span>
              <span>{p.pattern}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// HELPERS
// ============================================================================

function formatCandleData(
  data: OHLCV[],
  chartType: ChartType,
): CandlestickData<Time>[] | LineData<Time>[] {
  if (chartType === "line" || chartType === "area") {
    return data.map((d) => ({
      time: (d.timestamp / 1000) as Time,
      value: d.close,
    }));
  }

  if (chartType === "heikin_ashi") {
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

function calculateHeikinAshi(data: OHLCV[]): CandlestickData<Time>[] {
  const result: CandlestickData<Time>[] = [];

  for (let i = 0; i < data.length; i++) {
    const current = data[i];
    const prev = i > 0 ? result[i - 1] : null;

    const haClose =
      (current.open + current.high + current.low + current.close) / 4;
    const haOpen = prev
      ? (prev.open + prev.close) / 2
      : (current.open + current.close) / 2;
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

export default TradingChart;
