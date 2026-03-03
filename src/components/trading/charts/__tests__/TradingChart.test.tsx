/**
 * TradingChart Component Tests
 *
 * Comprehensive tests for the professional trading chart component
 * covering rendering, chart types, indicators, trade markers,
 * support/resistance lines, patterns, responsive behavior, and error states.
 *
 * lightweight-charts is mocked via moduleNameMapper in jest.config.js
 * pointing to src/__mocks__/lightweight-charts.ts (ESM-only package).
 */

import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import {
  TradingChart,
  type TradingChartProps,
  type IndicatorSettings,
  type TradeMarker,
  type SupportResistance,
} from "../TradingChart";
import type { OHLCV } from "@/lib/trading/charts/technical-indicators";

// ============================================================================
// MOCK: lightweight-charts — provided by moduleNameMapper manual mock
// Access the mock internals exported from src/__mocks__/lightweight-charts.ts
// We use require() to access the mock exports that don't exist in the
// real lightweight-charts type definitions.
// ============================================================================

/* eslint-disable @typescript-eslint/no-require-imports */
const lightweightChartsMock = require("lightweight-charts") as {
  createChart: jest.Mock;
  __mockChartApi: {
    addSeries: jest.Mock;
    removeSeries: jest.Mock;
    applyOptions: jest.Mock;
    timeScale: jest.Mock;
    priceScale: jest.Mock;
    remove: jest.Mock;
    subscribeCrosshairMove: jest.Mock;
  };
  __mockSeriesApi: {
    setData: jest.Mock;
    createPriceLine: jest.Mock;
    setMarkers: jest.Mock;
    applyOptions: jest.Mock;
  };
  __mockTimeScale: {
    fitContent: jest.Mock;
    subscribeVisibleLogicalRangeChange: jest.Mock;
    getVisibleLogicalRange: jest.Mock;
    setVisibleLogicalRange: jest.Mock;
  };
  __mockPriceScale: {
    applyOptions: jest.Mock;
  };
};

const { createChart } = lightweightChartsMock;
const mockChartApi = lightweightChartsMock.__mockChartApi;
const mockSeriesApi = lightweightChartsMock.__mockSeriesApi;
const mockTimeScale = lightweightChartsMock.__mockTimeScale;
const mockPriceScale = lightweightChartsMock.__mockPriceScale;

// ============================================================================
// MOCK: technical-indicators
// ============================================================================

jest.mock("@/lib/trading/charts/technical-indicators", () => ({
  calculateSMA: jest.fn().mockReturnValue([
    { timestamp: 1000000, value: 150 },
    { timestamp: 2000000, value: 151 },
  ]),
  calculateEMA: jest.fn().mockReturnValue([
    { timestamp: 1000000, value: 149 },
    { timestamp: 2000000, value: 150 },
  ]),
  calculateBollingerBands: jest.fn().mockReturnValue([
    { timestamp: 1000000, upper: 160, middle: 150, lower: 140 },
    { timestamp: 2000000, upper: 161, middle: 151, lower: 141 },
  ]),
  calculateRSI: jest.fn().mockReturnValue([
    { timestamp: 1000000, value: 55 },
    { timestamp: 2000000, value: 60 },
  ]),
  calculateMACD: jest.fn().mockReturnValue([
    { timestamp: 1000000, macd: 1.5, signal: 1.2, histogram: 0.3 },
    { timestamp: 2000000, macd: 1.8, signal: 1.4, histogram: 0.4 },
  ]),
  calculateVWAP: jest.fn().mockReturnValue([
    { timestamp: 1000000, vwap: 150.5 },
    { timestamp: 2000000, vwap: 151.2 },
  ]),
  calculateATR: jest.fn().mockReturnValue([
    { timestamp: 1000000, value: 2.5 },
  ]),
  detectCandlePatterns: jest.fn().mockReturnValue([
    { timestamp: 1000000, pattern: "Hammer", type: "bullish", reliability: "high" },
    { timestamp: 2000000, pattern: "Engulfing", type: "bearish", reliability: "medium" },
    { timestamp: 3000000, pattern: "Doji", type: "neutral", reliability: "low" },
  ]),
}));

// ============================================================================
// TEST DATA
// ============================================================================

function generateTestData(count: number = 20): OHLCV[] {
  const data: OHLCV[] = [];
  let price = 150;

  for (let i = 0; i < count; i++) {
    const open = price;
    const change = (Math.random() - 0.5) * 5;
    const close = price + change;
    const high = Math.max(open, close) + Math.random() * 2;
    const low = Math.min(open, close) - Math.random() * 2;

    data.push({
      timestamp: (1000 + i) * 1000,
      open,
      high,
      low,
      close,
      volume: 500000 + Math.random() * 500000,
    });

    price = close;
  }

  return data;
}

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
// HELPER
// ============================================================================

function renderChart(overrides: Partial<TradingChartProps> = {}) {
  const defaultProps: TradingChartProps = {
    symbol: "AAPL",
    data: generateTestData(),
    ...overrides,
  };
  return render(<TradingChart {...defaultProps} />);
}

// ============================================================================
// TESTS
// ============================================================================

describe("TradingChart", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Re-setup lightweight-charts mock returns after clearMocks resets them
    mockChartApi.addSeries.mockReturnValue(mockSeriesApi);
    mockChartApi.timeScale.mockReturnValue(mockTimeScale);
    mockChartApi.priceScale.mockReturnValue(mockPriceScale);
    mockTimeScale.getVisibleLogicalRange.mockReturnValue({
      from: 0,
      to: 100,
    });
    createChart.mockReturnValue(mockChartApi);

    // Re-setup technical-indicators mock returns (resetMocks clears them)
    const ti = require("@/lib/trading/charts/technical-indicators");
    ti.calculateSMA.mockReturnValue([
      { timestamp: 1000000, value: 150 },
      { timestamp: 2000000, value: 151 },
    ]);
    ti.calculateEMA.mockReturnValue([
      { timestamp: 1000000, value: 149 },
      { timestamp: 2000000, value: 150 },
    ]);
    ti.calculateBollingerBands.mockReturnValue([
      { timestamp: 1000000, upper: 160, middle: 150, lower: 140 },
      { timestamp: 2000000, upper: 161, middle: 151, lower: 141 },
    ]);
    ti.calculateRSI.mockReturnValue([
      { timestamp: 1000000, value: 55 },
      { timestamp: 2000000, value: 60 },
    ]);
    ti.calculateMACD.mockReturnValue([
      { timestamp: 1000000, macd: 1.5, signal: 1.2, histogram: 0.3 },
      { timestamp: 2000000, macd: 1.8, signal: 1.4, histogram: 0.4 },
    ]);
    ti.calculateVWAP.mockReturnValue([
      { timestamp: 1000000, vwap: 150.5 },
      { timestamp: 2000000, vwap: 151.2 },
    ]);
    ti.calculateATR.mockReturnValue([{ timestamp: 1000000, value: 2.5 }]);
    ti.detectCandlePatterns.mockReturnValue([
      {
        timestamp: 1000000,
        pattern: "Hammer",
        type: "bullish",
        reliability: "high",
      },
      {
        timestamp: 2000000,
        pattern: "Engulfing",
        type: "bearish",
        reliability: "medium",
      },
      {
        timestamp: 3000000,
        pattern: "Doji",
        type: "neutral",
        reliability: "low",
      },
    ]);
  });

  // ========================================================================
  // Basic Rendering
  // ========================================================================

  describe("basic rendering", () => {
    it("renders the chart container div", () => {
      const { container } = renderChart();
      const chartDiv = container.querySelector(".trading-chart");
      expect(chartDiv).toBeInTheDocument();
    });

    it("renders the main chart container element", () => {
      const { container } = renderChart();
      const mainChart = container.querySelector(".main-chart");
      expect(mainChart).toBeInTheDocument();
    });

    it("creates a lightweight-charts instance on mount", () => {
      renderChart();
      expect(createChart).toHaveBeenCalled();
    });

    it("applies custom className to the root element", () => {
      const { container } = renderChart({ className: "my-custom-chart" });
      const chartDiv = container.querySelector(".trading-chart");
      expect(chartDiv).toHaveClass("my-custom-chart");
    });

    it("passes height to chart creation options", () => {
      renderChart({ height: 600 });
      expect(createChart).toHaveBeenCalled();
    });

    it("calls onChartReady with chart API reference on mount", () => {
      const onChartReady = jest.fn();
      renderChart({ onChartReady });
      expect(onChartReady).toHaveBeenCalledWith(mockChartApi);
    });

    it("removes chart on unmount to prevent memory leaks", () => {
      const { unmount } = renderChart();
      unmount();
      expect(mockChartApi.remove).toHaveBeenCalled();
    });
  });

  // ========================================================================
  // Chart Types
  // ========================================================================

  describe("chart types", () => {
    it("creates a candlestick series by default", () => {
      renderChart();
      expect(mockChartApi.addSeries).toHaveBeenCalledWith(
        "CandlestickSeries",
        expect.objectContaining({
          upColor: expect.any(String),
          downColor: expect.any(String),
        }),
      );
    });

    it("creates a candlestick series for candlestick chart type", () => {
      renderChart({ chartType: "candlestick" });
      expect(mockChartApi.addSeries).toHaveBeenCalledWith(
        "CandlestickSeries",
        expect.any(Object),
      );
    });

    it("creates a line series for line chart type", () => {
      renderChart({ chartType: "line" });
      expect(mockChartApi.addSeries).toHaveBeenCalledWith(
        "LineSeries",
        expect.objectContaining({
          color: expect.any(String),
          lineWidth: 2,
        }),
      );
    });

    it("creates an area series for area chart type", () => {
      renderChart({ chartType: "area" });
      expect(mockChartApi.addSeries).toHaveBeenCalledWith(
        "AreaSeries",
        expect.objectContaining({
          lineColor: expect.any(String),
          lineWidth: 2,
        }),
      );
    });

    it("creates a candlestick series for heikin_ashi chart type", () => {
      renderChart({ chartType: "heikin_ashi" });
      expect(mockChartApi.addSeries).toHaveBeenCalledWith(
        "CandlestickSeries",
        expect.any(Object),
      );
    });

    it("sets data on the series after creation", () => {
      renderChart();
      expect(mockSeriesApi.setData).toHaveBeenCalled();
    });

    it("calls fitContent on the time scale after setting data", () => {
      renderChart();
      expect(mockTimeScale.fitContent).toHaveBeenCalled();
    });
  });

  // ========================================================================
  // Theme Support
  // ========================================================================

  describe("theme support", () => {
    it("uses dark theme by default", () => {
      renderChart();
      expect(createChart).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          layout: expect.objectContaining({
            background: expect.objectContaining({
              color: "#131722",
            }),
          }),
        }),
      );
    });

    it("applies light theme when specified", () => {
      renderChart({ theme: "light" });
      expect(createChart).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          layout: expect.objectContaining({
            background: expect.objectContaining({
              color: "#ffffff",
            }),
          }),
        }),
      );
    });
  });

  // ========================================================================
  // Volume Display
  // ========================================================================

  describe("volume display", () => {
    it("adds a volume histogram series when showVolume is true (default)", () => {
      renderChart({ showVolume: true });
      expect(mockChartApi.addSeries).toHaveBeenCalledWith(
        "HistogramSeries",
        expect.objectContaining({
          priceFormat: { type: "volume" },
          priceScaleId: "volume",
        }),
      );
    });

    it("does not add a volume histogram when showVolume is false", () => {
      renderChart({ showVolume: false });
      const histogramCalls = mockChartApi.addSeries.mock.calls.filter(
        (call: unknown[]) => call[0] === "HistogramSeries",
      );
      expect(histogramCalls.length).toBe(0);
    });

    it("configures volume scale margins to display at bottom 20%", () => {
      renderChart({ showVolume: true });
      expect(mockPriceScale.applyOptions).toHaveBeenCalledWith(
        expect.objectContaining({
          scaleMargins: { top: 0.8, bottom: 0 },
        }),
      );
    });
  });

  // ========================================================================
  // SMA Indicator
  // ========================================================================

  describe("SMA indicator overlay", () => {
    it("adds SMA line series when SMA is enabled", () => {
      const indicators: Partial<IndicatorSettings> = {
        sma: {
          enabled: true,
          periods: [20, 50],
          colors: ["#2962FF", "#FF6D00"],
        },
      };
      renderChart({ indicators });
      const { calculateSMA } = require("@/lib/trading/charts/technical-indicators");
      expect(calculateSMA).toHaveBeenCalled();
    });

    it("does not calculate SMA when disabled", () => {
      const indicators: Partial<IndicatorSettings> = {
        sma: {
          enabled: false,
          periods: [20],
          colors: ["#2962FF"],
        },
      };
      renderChart({ indicators });
      const { calculateSMA } = require("@/lib/trading/charts/technical-indicators");
      expect(calculateSMA).not.toHaveBeenCalled();
    });

    it("creates line series for each SMA period", () => {
      const indicators: Partial<IndicatorSettings> = {
        sma: {
          enabled: true,
          periods: [20, 50, 200],
          colors: ["#2962FF", "#FF6D00", "#AB47BC"],
        },
      };
      renderChart({ indicators });
      // SMA creates one LineSeries per period
      const lineCalls = mockChartApi.addSeries.mock.calls.filter(
        (call: unknown[]) => call[0] === "LineSeries",
      );
      // At least 3 for SMA
      expect(lineCalls.length).toBeGreaterThanOrEqual(3);
    });
  });

  // ========================================================================
  // EMA Indicator
  // ========================================================================

  describe("EMA indicator overlay", () => {
    it("calculates EMA when enabled", () => {
      const indicators: Partial<IndicatorSettings> = {
        ema: { enabled: true, periods: [12, 26], colors: ["#00BCD4", "#FFEB3B"] },
      };
      renderChart({ indicators });
      const { calculateEMA } = require("@/lib/trading/charts/technical-indicators");
      expect(calculateEMA).toHaveBeenCalled();
    });

    it("does not calculate EMA when disabled", () => {
      renderChart({ indicators: { ema: { enabled: false, periods: [12], colors: ["#00BCD4"] } } });
      const { calculateEMA } = require("@/lib/trading/charts/technical-indicators");
      expect(calculateEMA).not.toHaveBeenCalled();
    });
  });

  // ========================================================================
  // Bollinger Bands Indicator
  // ========================================================================

  describe("Bollinger Bands indicator overlay", () => {
    it("calculates Bollinger Bands when enabled", () => {
      const indicators: Partial<IndicatorSettings> = {
        bollinger: { enabled: true, period: 20, stdDev: 2 },
      };
      renderChart({ indicators });
      const { calculateBollingerBands } = require("@/lib/trading/charts/technical-indicators");
      expect(calculateBollingerBands).toHaveBeenCalledWith(
        expect.any(Array),
        20,
        2,
      );
    });

    it("creates three line series for upper, middle, and lower bands", () => {
      const indicators: Partial<IndicatorSettings> = {
        bollinger: { enabled: true, period: 20, stdDev: 2 },
      };
      renderChart({ indicators });
      // Bollinger creates 3 LineSeries (upper + middle + lower)
      const lineCalls = mockChartApi.addSeries.mock.calls.filter(
        (call: unknown[]) => call[0] === "LineSeries",
      );
      expect(lineCalls.length).toBeGreaterThanOrEqual(3);
    });

    it("does not calculate Bollinger Bands when disabled", () => {
      renderChart({ indicators: { bollinger: { enabled: false, period: 20, stdDev: 2 } } });
      const { calculateBollingerBands } = require("@/lib/trading/charts/technical-indicators");
      expect(calculateBollingerBands).not.toHaveBeenCalled();
    });
  });

  // ========================================================================
  // VWAP Indicator
  // ========================================================================

  describe("VWAP indicator overlay", () => {
    it("calculates VWAP when enabled", () => {
      const indicators: Partial<IndicatorSettings> = {
        vwap: { enabled: true },
      };
      renderChart({ indicators });
      const { calculateVWAP } = require("@/lib/trading/charts/technical-indicators");
      expect(calculateVWAP).toHaveBeenCalled();
    });

    it("does not calculate VWAP when disabled", () => {
      renderChart({ indicators: { vwap: { enabled: false } } });
      const { calculateVWAP } = require("@/lib/trading/charts/technical-indicators");
      expect(calculateVWAP).not.toHaveBeenCalled();
    });
  });

  // ========================================================================
  // RSI Indicator Pane
  // ========================================================================

  describe("RSI indicator pane", () => {
    it("renders RSI pane when RSI is enabled", () => {
      const indicators: Partial<IndicatorSettings> = {
        rsi: { enabled: true, period: 14 },
      };
      const { container } = renderChart({ indicators });
      const rsiPane = container.querySelector(".indicator-pane");
      expect(rsiPane).toBeInTheDocument();
    });

    it("shows RSI period label in the pane header", () => {
      const indicators: Partial<IndicatorSettings> = {
        rsi: { enabled: true, period: 14 },
      };
      renderChart({ indicators });
      expect(screen.getByText(/RSI\(14\)/)).toBeInTheDocument();
    });

    it("does not render RSI pane when RSI is disabled", () => {
      const { container } = renderChart();
      const indicatorLabels = container.querySelectorAll(".indicator-label");
      const rsiLabels = Array.from(indicatorLabels).filter((el) =>
        el.textContent?.includes("RSI"),
      );
      expect(rsiLabels.length).toBe(0);
    });

    it("creates a separate chart for the RSI pane", () => {
      const indicators: Partial<IndicatorSettings> = {
        rsi: { enabled: true, period: 14 },
      };
      renderChart({ indicators });
      // At least 2 calls: main chart + RSI chart
      expect(
        createChart.mock.calls.length,
      ).toBeGreaterThanOrEqual(2);
    });

    it("calculates RSI data with the specified period", () => {
      const indicators: Partial<IndicatorSettings> = {
        rsi: { enabled: true, period: 21 },
      };
      renderChart({ indicators });
      const { calculateRSI } = require("@/lib/trading/charts/technical-indicators");
      expect(calculateRSI).toHaveBeenCalledWith(expect.any(Array), 21);
    });
  });

  // ========================================================================
  // MACD Indicator Pane
  // ========================================================================

  describe("MACD indicator pane", () => {
    it("renders MACD pane when MACD is enabled", () => {
      const indicators: Partial<IndicatorSettings> = {
        macd: { enabled: true, fast: 12, slow: 26, signal: 9 },
      };
      renderChart({ indicators });
      expect(screen.getByText(/MACD\(12,26,/)).toBeInTheDocument();
    });

    it("creates a separate chart for the MACD pane", () => {
      const indicators: Partial<IndicatorSettings> = {
        macd: { enabled: true, fast: 12, slow: 26, signal: 9 },
      };
      renderChart({ indicators });
      expect(
        createChart.mock.calls.length,
      ).toBeGreaterThanOrEqual(2);
    });

    it("calculates MACD with custom parameters", () => {
      const indicators: Partial<IndicatorSettings> = {
        macd: { enabled: true, fast: 8, slow: 21, signal: 5 },
      };
      renderChart({ indicators });
      const { calculateMACD } = require("@/lib/trading/charts/technical-indicators");
      expect(calculateMACD).toHaveBeenCalledWith(expect.any(Array), 8, 21, 5);
    });

    it("does not render MACD pane when MACD is disabled", () => {
      const { container } = renderChart();
      const indicatorLabels = container.querySelectorAll(".indicator-label");
      const macdLabels = Array.from(indicatorLabels).filter((el) =>
        el.textContent?.includes("MACD"),
      );
      expect(macdLabels.length).toBe(0);
    });
  });

  // ========================================================================
  // Both RSI and MACD
  // ========================================================================

  describe("combined RSI and MACD panes", () => {
    it("renders both RSI and MACD panes when both are enabled", () => {
      const indicators: Partial<IndicatorSettings> = {
        rsi: { enabled: true, period: 14 },
        macd: { enabled: true, fast: 12, slow: 26, signal: 9 },
      };
      renderChart({ indicators });
      expect(screen.getByText(/RSI\(14\)/)).toBeInTheDocument();
      expect(screen.getByText(/MACD\(12,26,/)).toBeInTheDocument();
    });

    it("creates three charts (main + RSI + MACD) when both are enabled", () => {
      const indicators: Partial<IndicatorSettings> = {
        rsi: { enabled: true, period: 14 },
        macd: { enabled: true, fast: 12, slow: 26, signal: 9 },
      };
      renderChart({ indicators });
      expect(
        createChart.mock.calls.length,
      ).toBeGreaterThanOrEqual(3);
    });
  });

  // ========================================================================
  // Trade Markers
  // ========================================================================

  describe("trade markers", () => {
    const trades: TradeMarker[] = [
      {
        id: "t1",
        timestamp: 1001000,
        price: 152,
        type: "entry_long",
        label: "Buy AAPL",
        quantity: 100,
      },
      {
        id: "t2",
        timestamp: 1010000,
        price: 158,
        type: "take_profit",
        label: "TP 1",
        pnl: 600,
      },
      {
        id: "t3",
        timestamp: 1005000,
        price: 148,
        type: "stop_loss",
        label: "SL",
      },
      {
        id: "t4",
        timestamp: 1008000,
        price: 155,
        type: "exit",
      },
      {
        id: "t5",
        timestamp: 1003000,
        price: 145,
        type: "entry_short",
        label: "Short",
      },
    ];

    it("creates price lines for each trade marker", () => {
      renderChart({ trades });
      expect(mockSeriesApi.createPriceLine).toHaveBeenCalledTimes(trades.length);
    });

    it("uses correct color for entry_long markers (green)", () => {
      renderChart({ trades: [trades[0]] });
      expect(mockSeriesApi.createPriceLine).toHaveBeenCalledWith(
        expect.objectContaining({
          color: "#26a69a",
          price: 152,
        }),
      );
    });

    it("uses correct color for entry_short markers (red)", () => {
      renderChart({ trades: [trades[4]] });
      expect(mockSeriesApi.createPriceLine).toHaveBeenCalledWith(
        expect.objectContaining({
          color: "#ef5350",
          price: 145,
        }),
      );
    });

    it("uses correct color for stop_loss markers", () => {
      renderChart({ trades: [trades[2]] });
      expect(mockSeriesApi.createPriceLine).toHaveBeenCalledWith(
        expect.objectContaining({
          color: "#FF4444",
          price: 148,
        }),
      );
    });

    it("uses correct color for take_profit markers", () => {
      renderChart({ trades: [trades[1]] });
      expect(mockSeriesApi.createPriceLine).toHaveBeenCalledWith(
        expect.objectContaining({
          color: "#44FF44",
          price: 158,
        }),
      );
    });

    it("uses correct color for exit markers", () => {
      renderChart({ trades: [trades[3]] });
      expect(mockSeriesApi.createPriceLine).toHaveBeenCalledWith(
        expect.objectContaining({
          color: "#FFD700",
          price: 155,
        }),
      );
    });

    it("includes the trade label in price line title", () => {
      renderChart({ trades: [trades[0]] });
      expect(mockSeriesApi.createPriceLine).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Buy AAPL",
        }),
      );
    });

    it("uses formatted type as title when no label is provided", () => {
      renderChart({ trades: [trades[3]] });
      expect(mockSeriesApi.createPriceLine).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "EXIT",
        }),
      );
    });

    it("does not create price lines when trades array is empty", () => {
      renderChart({ trades: [] });
      expect(mockSeriesApi.createPriceLine).not.toHaveBeenCalled();
    });
  });

  // ========================================================================
  // Support/Resistance Lines
  // ========================================================================

  describe("support and resistance lines", () => {
    const srLevels: SupportResistance[] = [
      { price: 145, type: "support", strength: 5, touches: 3 },
      { price: 160, type: "resistance", strength: 2, touches: 2 },
    ];

    it("creates line series for each support/resistance level", () => {
      renderChart({ supportResistance: srLevels });
      // Should have at least 2 LineSeries for S/R levels
      const lineCalls = mockChartApi.addSeries.mock.calls.filter(
        (call: unknown[]) => call[0] === "LineSeries",
      );
      expect(lineCalls.length).toBeGreaterThanOrEqual(2);
    });

    it("uses green color for support lines", () => {
      renderChart({ supportResistance: [srLevels[0]] });
      expect(mockChartApi.addSeries).toHaveBeenCalledWith(
        "LineSeries",
        expect.objectContaining({
          color: "#26a69a",
        }),
      );
    });

    it("uses red color for resistance lines", () => {
      renderChart({ supportResistance: [srLevels[1]] });
      expect(mockChartApi.addSeries).toHaveBeenCalledWith(
        "LineSeries",
        expect.objectContaining({
          color: "#ef5350",
        }),
      );
    });

    it("uses thicker lines for high-strength levels", () => {
      renderChart({ supportResistance: [srLevels[0]] }); // strength: 5
      expect(mockChartApi.addSeries).toHaveBeenCalledWith(
        "LineSeries",
        expect.objectContaining({
          lineWidth: 2, // strength > 3
        }),
      );
    });

    it("uses thinner lines for low-strength levels", () => {
      renderChart({ supportResistance: [srLevels[1]] }); // strength: 2
      expect(mockChartApi.addSeries).toHaveBeenCalledWith(
        "LineSeries",
        expect.objectContaining({
          lineWidth: 1, // strength <= 3
        }),
      );
    });

    it("does not add S/R lines when array is empty", () => {
      mockChartApi.addSeries.mockClear();
      renderChart({ supportResistance: [] });
      // Only candlestick + volume series, no extra LineSeries for S/R
      const lineCalls = mockChartApi.addSeries.mock.calls.filter(
        (call: unknown[]) => call[0] === "LineSeries",
      );
      expect(lineCalls.length).toBe(0);
    });
  });

  // ========================================================================
  // Candle Pattern Detection
  // ========================================================================

  describe("candle pattern detection", () => {
    it("detects candle patterns when showPatterns is true", () => {
      renderChart({ showPatterns: true });
      const { detectCandlePatterns } = require("@/lib/trading/charts/technical-indicators");
      expect(detectCandlePatterns).toHaveBeenCalled();
    });

    it("does not detect patterns when showPatterns is false", () => {
      renderChart({ showPatterns: false });
      const { detectCandlePatterns } = require("@/lib/trading/charts/technical-indicators");
      expect(detectCandlePatterns).not.toHaveBeenCalled();
    });

    it("renders pattern annotations overlay when patterns exist", () => {
      const { container } = renderChart({ showPatterns: true });
      const annotations = container.querySelector(".pattern-annotations");
      expect(annotations).toBeInTheDocument();
    });

    it("displays bullish pattern with green color indicator", () => {
      renderChart({ showPatterns: true });
      expect(screen.getByText("Hammer")).toBeInTheDocument();
    });

    it("displays bearish pattern with red color indicator", () => {
      renderChart({ showPatterns: true });
      expect(screen.getByText("Engulfing")).toBeInTheDocument();
    });

    it("displays neutral pattern with gray color indicator", () => {
      renderChart({ showPatterns: true });
      expect(screen.getByText("Doji")).toBeInTheDocument();
    });

    it("does not render pattern annotations when showPatterns is false", () => {
      const { container } = renderChart({ showPatterns: false });
      const annotations = container.querySelector(".pattern-annotations");
      expect(annotations).not.toBeInTheDocument();
    });
  });

  // ========================================================================
  // Empty/Error States
  // ========================================================================

  describe("empty and error states", () => {
    it("handles empty data array without crashing", () => {
      expect(() => renderChart({ data: [] })).not.toThrow();
    });

    it("does not set data on series when data is empty", () => {
      mockSeriesApi.setData.mockClear();
      renderChart({ data: [] });
      // Series setData should not be called when data array is empty
      // The chart is created but no series data is set
      expect(mockSeriesApi.setData).not.toHaveBeenCalled();
    });

    it("handles single data point without crashing", () => {
      const singlePoint: OHLCV[] = [
        {
          timestamp: 1000000,
          open: 150,
          high: 155,
          low: 148,
          close: 152,
          volume: 500000,
        },
      ];
      expect(() => renderChart({ data: singlePoint })).not.toThrow();
    });

    it("renders without optional props", () => {
      expect(() =>
        render(<TradingChart symbol="AAPL" data={generateTestData()} />),
      ).not.toThrow();
    });
  });

  // ========================================================================
  // Crosshair Move Callback
  // ========================================================================

  describe("crosshair move callback", () => {
    it("subscribes to crosshair move events when callback is provided", () => {
      const onCrosshairMove = jest.fn();
      renderChart({ onCrosshairMove });
      expect(mockChartApi.subscribeCrosshairMove).toHaveBeenCalled();
    });

    it("does not subscribe when no callback is provided", () => {
      renderChart({ onCrosshairMove: undefined });
      expect(mockChartApi.subscribeCrosshairMove).not.toHaveBeenCalled();
    });
  });

  // ========================================================================
  // Responsive Behavior
  // ========================================================================

  describe("responsive behavior", () => {
    it("registers a window resize event listener on mount", () => {
      const addEventSpy = jest.spyOn(window, "addEventListener");
      renderChart();
      expect(addEventSpy).toHaveBeenCalledWith("resize", expect.any(Function));
      addEventSpy.mockRestore();
    });

    it("removes resize listener on unmount", () => {
      const removeEventSpy = jest.spyOn(window, "removeEventListener");
      const { unmount } = renderChart();
      unmount();
      expect(removeEventSpy).toHaveBeenCalledWith(
        "resize",
        expect.any(Function),
      );
      removeEventSpy.mockRestore();
    });
  });

  // ========================================================================
  // Multiple Indicators Combined
  // ========================================================================

  describe("multiple indicators combined", () => {
    it("renders all overlay indicators simultaneously", () => {
      const indicators: Partial<IndicatorSettings> = {
        sma: {
          enabled: true,
          periods: [20],
          colors: ["#2962FF"],
        },
        ema: {
          enabled: true,
          periods: [12],
          colors: ["#00BCD4"],
        },
        bollinger: { enabled: true, period: 20, stdDev: 2 },
        vwap: { enabled: true },
      };
      renderChart({ indicators });

      const ti = require("@/lib/trading/charts/technical-indicators");
      expect(ti.calculateSMA).toHaveBeenCalled();
      expect(ti.calculateEMA).toHaveBeenCalled();
      expect(ti.calculateBollingerBands).toHaveBeenCalled();
      expect(ti.calculateVWAP).toHaveBeenCalled();
    });

    it("renders overlays with RSI and MACD panes together", () => {
      const indicators: Partial<IndicatorSettings> = {
        sma: { enabled: true, periods: [20], colors: ["#2962FF"] },
        rsi: { enabled: true, period: 14 },
        macd: { enabled: true, fast: 12, slow: 26, signal: 9 },
      };
      renderChart({ indicators });
      expect(screen.getByText(/RSI\(14\)/)).toBeInTheDocument();
      expect(screen.getByText(/MACD\(12,26,/)).toBeInTheDocument();
    });
  });

  // ========================================================================
  // Time Scale Sync
  // ========================================================================

  describe("time scale synchronization", () => {
    it("syncs time scales between main and indicator charts", () => {
      const indicators: Partial<IndicatorSettings> = {
        rsi: { enabled: true, period: 14 },
      };
      renderChart({ indicators });
      expect(mockTimeScale.subscribeVisibleLogicalRangeChange).toHaveBeenCalled();
    });
  });
});
