/**
 * ChartControls Component Tests
 *
 * Comprehensive tests for the reusable chart controls toolbar covering:
 * - Rendering of timeframe buttons, chart type buttons, indicator toggle
 * - Timeframe selection and callback invocation
 * - Chart type selection and callback invocation
 * - Indicator panel expand/collapse toggle
 * - Individual indicator toggles (overlay + oscillator)
 * - Active indicator count badge
 * - Accessibility attributes (roles, aria-checked, aria-expanded, aria-label)
 * - Custom className support
 * - Constants exported correctly
 */

import React from "react";
import { render, screen, fireEvent, within } from "@testing-library/react";
import "@testing-library/jest-dom";
import {
  ChartControls,
  TIMEFRAMES,
  CHART_TYPES,
  INDICATOR_OPTIONS,
} from "../ChartControls";
import type { ChartControlsProps } from "../ChartControls";
import type { IndicatorSettings } from "../TradingChart";

// ============================================================================
// TEST DATA
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

function createIndicators(
  overrides: Partial<Record<keyof IndicatorSettings, { enabled: boolean }>>,
): IndicatorSettings {
  return {
    sma: { ...defaultIndicators.sma, ...overrides.sma },
    ema: { ...defaultIndicators.ema, ...overrides.ema },
    bollinger: { ...defaultIndicators.bollinger, ...overrides.bollinger },
    vwap: { ...defaultIndicators.vwap, ...overrides.vwap },
    rsi: { ...defaultIndicators.rsi, ...overrides.rsi },
    macd: { ...defaultIndicators.macd, ...overrides.macd },
  };
}

// ============================================================================
// HELPER
// ============================================================================

function renderControls(overrides: Partial<ChartControlsProps> = {}) {
  const defaultProps: ChartControlsProps = {
    timeframe: "1d",
    onTimeframeChange: jest.fn(),
    chartType: "candlestick",
    onChartTypeChange: jest.fn(),
    indicators: defaultIndicators,
    onIndicatorsChange: jest.fn(),
    ...overrides,
  };
  return { ...render(<ChartControls {...defaultProps} />), props: defaultProps };
}

// ============================================================================
// TESTS
// ============================================================================

describe("ChartControls", () => {
  // ========================================================================
  // Basic Rendering
  // ========================================================================

  describe("basic rendering", () => {
    it("renders the chart-controls container", () => {
      renderControls();
      expect(screen.getByTestId("chart-controls")).toBeInTheDocument();
    });

    it("renders a toolbar element", () => {
      renderControls();
      expect(screen.getByRole("toolbar")).toBeInTheDocument();
    });

    it("renders the toolbar with correct aria-label", () => {
      renderControls();
      expect(
        screen.getByRole("toolbar", { name: "Chart controls" }),
      ).toBeInTheDocument();
    });

    it("renders Indicators toggle button", () => {
      renderControls();
      expect(screen.getByTestId("indicators-toggle")).toBeInTheDocument();
    });

    it("applies custom className to root element", () => {
      renderControls({ className: "mt-4 border" });
      const root = screen.getByTestId("chart-controls");
      expect(root).toHaveClass("mt-4");
      expect(root).toHaveClass("border");
    });

    it("always includes chart-controls base class", () => {
      renderControls({ className: "extra" });
      const root = screen.getByTestId("chart-controls");
      expect(root).toHaveClass("chart-controls");
    });
  });

  // ========================================================================
  // Timeframe Selector
  // ========================================================================

  describe("timeframe selector", () => {
    it("renders all 8 timeframe buttons", () => {
      renderControls();
      const radiogroup = screen.getByRole("radiogroup", { name: "Timeframe" });
      const buttons = within(radiogroup).getAllByRole("radio");
      expect(buttons).toHaveLength(TIMEFRAMES.length);
    });

    it("displays short labels for each timeframe", () => {
      renderControls();
      TIMEFRAMES.forEach((tf) => {
        expect(screen.getByText(tf.shortLabel)).toBeInTheDocument();
      });
    });

    it("marks the selected timeframe as aria-checked", () => {
      renderControls({ timeframe: "1h" });
      const selected = screen.getByRole("radio", { name: "1 Hour" });
      expect(selected).toHaveAttribute("aria-checked", "true");
    });

    it("marks non-selected timeframes as aria-checked false", () => {
      renderControls({ timeframe: "1h" });
      const notSelected = screen.getByRole("radio", { name: "1 Day" });
      expect(notSelected).toHaveAttribute("aria-checked", "false");
    });

    it("applies active styling to selected timeframe button", () => {
      renderControls({ timeframe: "5m" });
      const selected = screen.getByRole("radio", { name: "5 Minutes" });
      expect(selected).toHaveClass("bg-blue-600");
      expect(selected).toHaveClass("text-white");
    });

    it("applies inactive styling to non-selected timeframe buttons", () => {
      renderControls({ timeframe: "5m" });
      const inactive = screen.getByRole("radio", { name: "1 Day" });
      expect(inactive).toHaveClass("text-gray-400");
    });

    it("calls onTimeframeChange with correct value when clicked", () => {
      const onTimeframeChange = jest.fn();
      renderControls({ timeframe: "1d", onTimeframeChange });
      fireEvent.click(screen.getByRole("radio", { name: "15 Minutes" }));
      expect(onTimeframeChange).toHaveBeenCalledWith("15m");
    });

    it("calls onTimeframeChange for each different timeframe click", () => {
      const onTimeframeChange = jest.fn();
      renderControls({ timeframe: "1d", onTimeframeChange });

      fireEvent.click(screen.getByRole("radio", { name: "1 Minute" }));
      expect(onTimeframeChange).toHaveBeenCalledWith("1m");

      fireEvent.click(screen.getByRole("radio", { name: "4 Hours" }));
      expect(onTimeframeChange).toHaveBeenCalledWith("4h");

      fireEvent.click(screen.getByRole("radio", { name: "1 Week" }));
      expect(onTimeframeChange).toHaveBeenCalledWith("1w");

      fireEvent.click(screen.getByRole("radio", { name: "1 Month" }));
      expect(onTimeframeChange).toHaveBeenCalledWith("1M");
    });

    it("provides title attribute with full label for tooltip", () => {
      renderControls();
      const btn = screen.getByRole("radio", { name: "1 Hour" });
      expect(btn).toHaveAttribute("title", "1 Hour");
    });
  });

  // ========================================================================
  // Chart Type Selector
  // ========================================================================

  describe("chart type selector", () => {
    it("renders all 4 chart type buttons", () => {
      renderControls();
      const radiogroup = screen.getByRole("radiogroup", { name: "Chart type" });
      const buttons = within(radiogroup).getAllByRole("radio");
      expect(buttons).toHaveLength(CHART_TYPES.length);
    });

    it("displays labels for each chart type", () => {
      renderControls();
      CHART_TYPES.forEach((ct) => {
        expect(screen.getByText(ct.label)).toBeInTheDocument();
      });
    });

    it("marks the selected chart type as aria-checked", () => {
      renderControls({ chartType: "line" });
      const selected = screen.getByRole("radio", { name: "Line" });
      expect(selected).toHaveAttribute("aria-checked", "true");
    });

    it("marks non-selected chart types as aria-checked false", () => {
      renderControls({ chartType: "line" });
      const notSelected = screen.getByRole("radio", { name: "Candlestick" });
      expect(notSelected).toHaveAttribute("aria-checked", "false");
    });

    it("applies active styling to selected chart type", () => {
      renderControls({ chartType: "area" });
      const selected = screen.getByRole("radio", { name: "Area" });
      expect(selected).toHaveClass("bg-blue-600");
    });

    it("calls onChartTypeChange with correct value when clicked", () => {
      const onChartTypeChange = jest.fn();
      renderControls({ chartType: "candlestick", onChartTypeChange });
      fireEvent.click(screen.getByRole("radio", { name: "Heikin Ashi" }));
      expect(onChartTypeChange).toHaveBeenCalledWith("heikin_ashi");
    });

    it("calls onChartTypeChange for Line selection", () => {
      const onChartTypeChange = jest.fn();
      renderControls({ chartType: "candlestick", onChartTypeChange });
      fireEvent.click(screen.getByRole("radio", { name: "Line" }));
      expect(onChartTypeChange).toHaveBeenCalledWith("line");
    });

    it("calls onChartTypeChange for Area selection", () => {
      const onChartTypeChange = jest.fn();
      renderControls({ chartType: "candlestick", onChartTypeChange });
      fireEvent.click(screen.getByRole("radio", { name: "Area" }));
      expect(onChartTypeChange).toHaveBeenCalledWith("area");
    });

    it("provides title attribute for chart type buttons", () => {
      renderControls();
      const btn = screen.getByRole("radio", { name: "Heikin Ashi" });
      expect(btn).toHaveAttribute("title", "Heikin Ashi");
    });
  });

  // ========================================================================
  // Indicator Panel Toggle
  // ========================================================================

  describe("indicator panel toggle", () => {
    it("does not show indicator panel by default", () => {
      renderControls();
      expect(screen.queryByTestId("indicator-panel")).not.toBeInTheDocument();
    });

    it("shows indicator panel after clicking Indicators button", () => {
      renderControls();
      fireEvent.click(screen.getByTestId("indicators-toggle"));
      expect(screen.getByTestId("indicator-panel")).toBeInTheDocument();
    });

    it("hides indicator panel on second click (toggle)", () => {
      renderControls();
      const toggle = screen.getByTestId("indicators-toggle");
      fireEvent.click(toggle); // open
      expect(screen.getByTestId("indicator-panel")).toBeInTheDocument();
      fireEvent.click(toggle); // close
      expect(screen.queryByTestId("indicator-panel")).not.toBeInTheDocument();
    });

    it("has aria-expanded false when panel is closed", () => {
      renderControls();
      const toggle = screen.getByTestId("indicators-toggle");
      expect(toggle).toHaveAttribute("aria-expanded", "false");
    });

    it("has aria-expanded true when panel is open", () => {
      renderControls();
      const toggle = screen.getByTestId("indicators-toggle");
      fireEvent.click(toggle);
      expect(toggle).toHaveAttribute("aria-expanded", "true");
    });

    it("has aria-controls pointing to indicator-panel", () => {
      renderControls();
      const toggle = screen.getByTestId("indicators-toggle");
      expect(toggle).toHaveAttribute("aria-controls", "indicator-panel");
    });

    it("applies purple styling when indicator panel is open", () => {
      renderControls();
      const toggle = screen.getByTestId("indicators-toggle");
      fireEvent.click(toggle);
      expect(toggle).toHaveClass("bg-purple-600");
    });

    it("does not have purple styling when indicator panel is closed", () => {
      renderControls();
      const toggle = screen.getByTestId("indicators-toggle");
      expect(toggle).not.toHaveClass("bg-purple-600");
      expect(toggle).toHaveClass("text-gray-400");
    });
  });

  // ========================================================================
  // Indicator Panel Content
  // ========================================================================

  describe("indicator panel content", () => {
    function openPanel(overrides: Partial<ChartControlsProps> = {}) {
      const result = renderControls(overrides);
      fireEvent.click(screen.getByTestId("indicators-toggle"));
      return result;
    }

    it("renders Overlays label when panel is open", () => {
      openPanel();
      expect(screen.getByText("Overlays:")).toBeInTheDocument();
    });

    it("renders Oscillators label when panel is open", () => {
      openPanel();
      expect(screen.getByText("Oscillators:")).toBeInTheDocument();
    });

    it("renders all 4 overlay indicator buttons", () => {
      openPanel();
      const overlays = INDICATOR_OPTIONS.filter((i) => i.category === "overlay");
      overlays.forEach((ind) => {
        expect(screen.getByTestId(`indicator-${ind.id}`)).toBeInTheDocument();
      });
    });

    it("renders all 2 oscillator indicator buttons", () => {
      openPanel();
      const oscillators = INDICATOR_OPTIONS.filter(
        (i) => i.category === "oscillator",
      );
      oscillators.forEach((ind) => {
        expect(screen.getByTestId(`indicator-${ind.id}`)).toBeInTheDocument();
      });
    });

    it("renders indicator buttons with role=switch", () => {
      openPanel();
      const switches = screen.getAllByRole("switch");
      expect(switches).toHaveLength(INDICATOR_OPTIONS.length);
    });

    it("shows aria-checked false for disabled indicators", () => {
      openPanel();
      const smaSwitch = screen.getByRole("switch", { name: "Toggle SMA" });
      expect(smaSwitch).toHaveAttribute("aria-checked", "false");
    });

    it("shows aria-checked true for enabled indicators", () => {
      const indicators = createIndicators({ sma: { enabled: true } });
      openPanel({ indicators });
      const smaSwitch = screen.getByRole("switch", { name: "Toggle SMA" });
      expect(smaSwitch).toHaveAttribute("aria-checked", "true");
    });

    it("applies active styling to enabled overlay indicators", () => {
      const indicators = createIndicators({ bollinger: { enabled: true } });
      openPanel({ indicators });
      const bb = screen.getByTestId("indicator-bollinger");
      expect(bb).toHaveClass("bg-blue-600");
    });

    it("applies inactive styling to disabled overlay indicators", () => {
      openPanel();
      const sma = screen.getByTestId("indicator-sma");
      expect(sma).toHaveClass("bg-gray-700");
    });

    it("applies purple styling to enabled oscillator indicators", () => {
      const indicators = createIndicators({ rsi: { enabled: true } });
      openPanel({ indicators });
      const rsi = screen.getByTestId("indicator-rsi");
      expect(rsi).toHaveClass("bg-purple-600");
    });

    it("applies inactive styling to disabled oscillator indicators", () => {
      openPanel();
      const macd = screen.getByTestId("indicator-macd");
      expect(macd).toHaveClass("bg-gray-700");
    });
  });

  // ========================================================================
  // Indicator Toggle Callbacks
  // ========================================================================

  describe("indicator toggle callbacks", () => {
    function openPanelWithMock(overrides: Partial<ChartControlsProps> = {}) {
      const onIndicatorsChange = jest.fn();
      const result = renderControls({ onIndicatorsChange, ...overrides });
      fireEvent.click(screen.getByTestId("indicators-toggle"));
      return { ...result, onIndicatorsChange };
    }

    it("calls onIndicatorsChange when toggling SMA on", () => {
      const { onIndicatorsChange } = openPanelWithMock();
      fireEvent.click(screen.getByTestId("indicator-sma"));
      expect(onIndicatorsChange).toHaveBeenCalledWith(
        expect.objectContaining({
          sma: expect.objectContaining({ enabled: true }),
        }),
      );
    });

    it("calls onIndicatorsChange when toggling SMA off", () => {
      const indicators = createIndicators({ sma: { enabled: true } });
      const { onIndicatorsChange } = openPanelWithMock({ indicators });
      fireEvent.click(screen.getByTestId("indicator-sma"));
      expect(onIndicatorsChange).toHaveBeenCalledWith(
        expect.objectContaining({
          sma: expect.objectContaining({ enabled: false }),
        }),
      );
    });

    it("calls onIndicatorsChange when toggling EMA", () => {
      const { onIndicatorsChange } = openPanelWithMock();
      fireEvent.click(screen.getByTestId("indicator-ema"));
      expect(onIndicatorsChange).toHaveBeenCalledWith(
        expect.objectContaining({
          ema: expect.objectContaining({ enabled: true }),
        }),
      );
    });

    it("calls onIndicatorsChange when toggling Bollinger Bands", () => {
      const { onIndicatorsChange } = openPanelWithMock();
      fireEvent.click(screen.getByTestId("indicator-bollinger"));
      expect(onIndicatorsChange).toHaveBeenCalledWith(
        expect.objectContaining({
          bollinger: expect.objectContaining({ enabled: true }),
        }),
      );
    });

    it("calls onIndicatorsChange when toggling VWAP", () => {
      const { onIndicatorsChange } = openPanelWithMock();
      fireEvent.click(screen.getByTestId("indicator-vwap"));
      expect(onIndicatorsChange).toHaveBeenCalledWith(
        expect.objectContaining({
          vwap: expect.objectContaining({ enabled: true }),
        }),
      );
    });

    it("calls onIndicatorsChange when toggling RSI", () => {
      const { onIndicatorsChange } = openPanelWithMock();
      fireEvent.click(screen.getByTestId("indicator-rsi"));
      expect(onIndicatorsChange).toHaveBeenCalledWith(
        expect.objectContaining({
          rsi: expect.objectContaining({ enabled: true }),
        }),
      );
    });

    it("calls onIndicatorsChange when toggling MACD", () => {
      const { onIndicatorsChange } = openPanelWithMock();
      fireEvent.click(screen.getByTestId("indicator-macd"));
      expect(onIndicatorsChange).toHaveBeenCalledWith(
        expect.objectContaining({
          macd: expect.objectContaining({ enabled: true }),
        }),
      );
    });

    it("preserves other indicator settings when toggling one", () => {
      const indicators = createIndicators({
        sma: { enabled: true },
        rsi: { enabled: true },
      });
      const { onIndicatorsChange } = openPanelWithMock({ indicators });
      fireEvent.click(screen.getByTestId("indicator-ema"));
      expect(onIndicatorsChange).toHaveBeenCalledWith(
        expect.objectContaining({
          sma: expect.objectContaining({ enabled: true }),
          ema: expect.objectContaining({ enabled: true }),
          rsi: expect.objectContaining({ enabled: true }),
        }),
      );
    });
  });

  // ========================================================================
  // Active Indicator Count Badge
  // ========================================================================

  describe("active indicator count badge", () => {
    it("does not show badge when no indicators are active", () => {
      renderControls();
      expect(screen.queryByTestId("indicator-count")).not.toBeInTheDocument();
    });

    it("shows badge with count 1 when one indicator is active", () => {
      const indicators = createIndicators({ sma: { enabled: true } });
      renderControls({ indicators });
      const badge = screen.getByTestId("indicator-count");
      expect(badge).toHaveTextContent("1");
    });

    it("shows badge with count 3 when three indicators are active", () => {
      const indicators = createIndicators({
        sma: { enabled: true },
        ema: { enabled: true },
        rsi: { enabled: true },
      });
      renderControls({ indicators });
      const badge = screen.getByTestId("indicator-count");
      expect(badge).toHaveTextContent("3");
    });

    it("shows badge with count 6 when all indicators are active", () => {
      const indicators = createIndicators({
        sma: { enabled: true },
        ema: { enabled: true },
        bollinger: { enabled: true },
        vwap: { enabled: true },
        rsi: { enabled: true },
        macd: { enabled: true },
      });
      renderControls({ indicators });
      const badge = screen.getByTestId("indicator-count");
      expect(badge).toHaveTextContent("6");
    });

    it("badge has rounded-full styling", () => {
      const indicators = createIndicators({ sma: { enabled: true } });
      renderControls({ indicators });
      const badge = screen.getByTestId("indicator-count");
      expect(badge).toHaveClass("rounded-full");
    });
  });

  // ========================================================================
  // Exported Constants
  // ========================================================================

  describe("exported constants", () => {
    it("TIMEFRAMES has exactly 8 entries", () => {
      expect(TIMEFRAMES).toHaveLength(8);
    });

    it("TIMEFRAMES includes all expected values", () => {
      const values = TIMEFRAMES.map((t) => t.value);
      expect(values).toEqual([
        "1m",
        "5m",
        "15m",
        "1h",
        "4h",
        "1d",
        "1w",
        "1M",
      ]);
    });

    it("CHART_TYPES has exactly 4 entries", () => {
      expect(CHART_TYPES).toHaveLength(4);
    });

    it("CHART_TYPES includes all expected values", () => {
      const values = CHART_TYPES.map((c) => c.value);
      expect(values).toEqual(["candlestick", "heikin_ashi", "line", "area"]);
    });

    it("INDICATOR_OPTIONS has exactly 6 entries", () => {
      expect(INDICATOR_OPTIONS).toHaveLength(6);
    });

    it("INDICATOR_OPTIONS has 4 overlays and 2 oscillators", () => {
      const overlays = INDICATOR_OPTIONS.filter(
        (i) => i.category === "overlay",
      );
      const oscillators = INDICATOR_OPTIONS.filter(
        (i) => i.category === "oscillator",
      );
      expect(overlays).toHaveLength(4);
      expect(oscillators).toHaveLength(2);
    });

    it("INDICATOR_OPTIONS includes expected indicator IDs", () => {
      const ids = INDICATOR_OPTIONS.map((i) => i.id);
      expect(ids).toEqual(["sma", "ema", "bollinger", "vwap", "rsi", "macd"]);
    });
  });

  // ========================================================================
  // Accessibility
  // ========================================================================

  describe("accessibility", () => {
    it("timeframe radiogroup has correct aria-label", () => {
      renderControls();
      expect(
        screen.getByRole("radiogroup", { name: "Timeframe" }),
      ).toBeInTheDocument();
    });

    it("chart type radiogroup has correct aria-label", () => {
      renderControls();
      expect(
        screen.getByRole("radiogroup", { name: "Chart type" }),
      ).toBeInTheDocument();
    });

    it("each timeframe button has descriptive aria-label", () => {
      renderControls();
      TIMEFRAMES.forEach((tf) => {
        const btn = screen.getByRole("radio", { name: tf.label });
        expect(btn).toBeInTheDocument();
      });
    });

    it("each chart type button has descriptive aria-label", () => {
      renderControls();
      CHART_TYPES.forEach((ct) => {
        const btn = screen.getByRole("radio", { name: ct.label });
        expect(btn).toBeInTheDocument();
      });
    });

    it("each indicator switch has descriptive aria-label", () => {
      renderControls();
      fireEvent.click(screen.getByTestId("indicators-toggle"));
      INDICATOR_OPTIONS.forEach((ind) => {
        const sw = screen.getByRole("switch", {
          name: `Toggle ${ind.label}`,
        });
        expect(sw).toBeInTheDocument();
      });
    });

    it("indicator panel container has correct id for aria-controls", () => {
      renderControls();
      fireEvent.click(screen.getByTestId("indicators-toggle"));
      const panel = screen.getByTestId("indicator-panel");
      expect(panel).toHaveAttribute("id", "indicator-panel");
    });
  });

  // ========================================================================
  // Edge Cases
  // ========================================================================

  describe("edge cases", () => {
    it("handles clicking already-selected timeframe without error", () => {
      const onTimeframeChange = jest.fn();
      renderControls({ timeframe: "1d", onTimeframeChange });
      fireEvent.click(screen.getByRole("radio", { name: "1 Day" }));
      expect(onTimeframeChange).toHaveBeenCalledWith("1d");
    });

    it("handles clicking already-selected chart type without error", () => {
      const onChartTypeChange = jest.fn();
      renderControls({ chartType: "candlestick", onChartTypeChange });
      fireEvent.click(screen.getByRole("radio", { name: "Candlestick" }));
      expect(onChartTypeChange).toHaveBeenCalledWith("candlestick");
    });

    it("renders without className prop", () => {
      expect(() => renderControls({ className: undefined })).not.toThrow();
    });

    it("renders with empty className", () => {
      const { container } = renderControls({ className: "" });
      expect(container.firstChild).toBeInTheDocument();
    });
  });
});
