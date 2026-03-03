/**
 * RiskDashboard Component Tests
 *
 * Tests for the main risk dashboard container including loading state,
 * empty state, risk score calculation, trading badge, composition of
 * sub-components, and accessibility.
 */

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { RiskDashboard } from "../RiskDashboard";
import type { RiskDashboardProps } from "../RiskDashboard";
import type {
  PortfolioRiskMetrics,
  PositionRisk,
} from "@/lib/trading/pctt/portfolio-risk";
import type { CircuitBreaker } from "../CircuitBreakerPanel";

// ============================================================================
// TEST DATA
// ============================================================================

const mockMetrics: PortfolioRiskMetrics = {
  totalHeat: 0.03,
  maxHeat: 0.06,
  heatUtilization: 0.5,
  grossExposure: 0.8,
  netExposure: 0.4,
  longExposure: 0.6,
  shortExposure: 0.2,
  largestPosition: 0.1,
  sectorConcentration: { Technology: 0.4, Healthcare: 0.2 },
  correlatedGroups: [["AAPL", "MSFT"]],
  maxCorrelatedExposure: 0.15,
  currentDrawdown: 0.03,
  maxDrawdown: 0.05,
  drawdownScaleFactor: 1,
  canTrade: true,
  blockReasons: [],
  killSwitchActive: false,
};

const mockBlockedMetrics: PortfolioRiskMetrics = {
  ...mockMetrics,
  totalHeat: 0.058,
  heatUtilization: 0.97,
  currentDrawdown: 0.12,
  maxDrawdown: 0.12,
  drawdownScaleFactor: 0.25,
  canTrade: false,
  blockReasons: ["Max heat reached", "Drawdown kill level approached"],
  killSwitchActive: true,
  killSwitchReason: "Drawdown exceeded 10%",
};

const mockPositions: PositionRisk[] = [
  {
    symbol: "AAPL",
    side: "long",
    quantity: 100,
    entryPrice: 150,
    currentPrice: 155,
    stopPrice: 145,
    dollarRisk: 500,
    percentRisk: 0.005,
    unrealizedPL: 500,
    unrealizedPLPercent: 0.0333,
  },
  {
    symbol: "TSLA",
    side: "long",
    quantity: 50,
    entryPrice: 200,
    currentPrice: 190,
    stopPrice: 180,
    dollarRisk: 1000,
    percentRisk: 0.01,
    unrealizedPL: -500,
    unrealizedPLPercent: -0.05,
  },
];

const mockBreakers: CircuitBreaker[] = [
  {
    id: "heat-limit",
    name: "Portfolio Heat Limit",
    status: "healthy",
    description: "Monitors aggregate portfolio risk level",
  },
];

const ACCOUNT_EQUITY = 100000;

// ============================================================================
// TESTS
// ============================================================================

describe("RiskDashboard", () => {
  // ========================================================================
  // Loading state
  // ========================================================================

  it("renders loading state with pulse animation", () => {
    const { container } = render(
      <RiskDashboard
        metrics={null}
        positions={[]}
        accountEquity={ACCOUNT_EQUITY}
        loading
      />,
    );
    expect(container.querySelector(".animate-pulse")).toBeInTheDocument();
  });

  it("has accessible loading label", () => {
    render(
      <RiskDashboard
        metrics={null}
        positions={[]}
        accountEquity={ACCOUNT_EQUITY}
        loading
      />,
    );
    expect(screen.getByRole("status")).toHaveAttribute(
      "aria-label",
      "Loading risk dashboard",
    );
  });

  // ========================================================================
  // Empty/null metrics state
  // ========================================================================

  it("renders empty state when metrics is null and not loading", () => {
    render(
      <RiskDashboard
        metrics={null}
        positions={[]}
        accountEquity={ACCOUNT_EQUITY}
      />,
    );
    expect(
      screen.getByText("Portfolio Risk Dashboard"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "No risk data available. Connect your portfolio to see risk metrics.",
      ),
    ).toBeInTheDocument();
  });

  // ========================================================================
  // Header rendering
  // ========================================================================

  it("renders dashboard header and description", () => {
    render(
      <RiskDashboard
        metrics={mockMetrics}
        positions={mockPositions}
        accountEquity={ACCOUNT_EQUITY}
      />,
    );
    expect(
      screen.getByText("Portfolio Risk Dashboard"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Real-time risk monitoring and circuit breaker status",
      ),
    ).toBeInTheDocument();
  });

  // ========================================================================
  // Risk score
  // ========================================================================

  it("renders risk score element", () => {
    render(
      <RiskDashboard
        metrics={mockMetrics}
        positions={mockPositions}
        accountEquity={ACCOUNT_EQUITY}
      />,
    );
    expect(screen.getByTestId("risk-score")).toBeInTheDocument();
  });

  it("renders a numeric risk score", () => {
    render(
      <RiskDashboard
        metrics={mockMetrics}
        positions={mockPositions}
        accountEquity={ACCOUNT_EQUITY}
      />,
    );
    const scoreEl = screen.getByTestId("risk-score");
    // The score should contain a number
    const text = scoreEl.textContent || "";
    expect(text).toMatch(/\d+/);
  });

  // ========================================================================
  // Trading status badge
  // ========================================================================

  it("shows Trading Active badge when canTrade is true", () => {
    render(
      <RiskDashboard
        metrics={mockMetrics}
        positions={mockPositions}
        accountEquity={ACCOUNT_EQUITY}
      />,
    );
    const badge = screen.getByTestId("trading-badge");
    expect(badge).toHaveTextContent("Trading Active");
  });

  it("shows Trading Halted badge when canTrade is false", () => {
    render(
      <RiskDashboard
        metrics={mockBlockedMetrics}
        positions={mockPositions}
        accountEquity={ACCOUNT_EQUITY}
      />,
    );
    const badge = screen.getByTestId("trading-badge");
    expect(badge).toHaveTextContent("Trading Halted");
  });

  // ========================================================================
  // Sub-component composition
  // ========================================================================

  it("renders VaR visualization section", () => {
    render(
      <RiskDashboard
        metrics={mockMetrics}
        positions={mockPositions}
        accountEquity={ACCOUNT_EQUITY}
      />,
    );
    expect(screen.getByText("Value at Risk")).toBeInTheDocument();
  });

  it("renders Drawdown section", () => {
    render(
      <RiskDashboard
        metrics={mockMetrics}
        positions={mockPositions}
        accountEquity={ACCOUNT_EQUITY}
      />,
    );
    expect(screen.getByText("Drawdown")).toBeInTheDocument();
  });

  it("renders Risk Heatmap section", () => {
    render(
      <RiskDashboard
        metrics={mockMetrics}
        positions={mockPositions}
        accountEquity={ACCOUNT_EQUITY}
      />,
    );
    expect(
      screen.getByText("Position Risk Heatmap"),
    ).toBeInTheDocument();
  });

  it("renders Circuit Breakers section", () => {
    render(
      <RiskDashboard
        metrics={mockMetrics}
        positions={mockPositions}
        accountEquity={ACCOUNT_EQUITY}
        circuitBreakers={mockBreakers}
      />,
    );
    expect(screen.getByText("Circuit Breakers")).toBeInTheDocument();
  });

  // ========================================================================
  // Kill switch integration
  // ========================================================================

  it("shows kill switch alert when active in metrics", () => {
    render(
      <RiskDashboard
        metrics={mockBlockedMetrics}
        positions={mockPositions}
        accountEquity={ACCOUNT_EQUITY}
        onResetKillSwitch={jest.fn()}
      />,
    );
    expect(screen.getByTestId("kill-switch-alert")).toBeInTheDocument();
  });

  it("passes onResetKillSwitch to CircuitBreakerPanel", () => {
    const onReset = jest.fn();
    render(
      <RiskDashboard
        metrics={mockBlockedMetrics}
        positions={mockPositions}
        accountEquity={ACCOUNT_EQUITY}
        onResetKillSwitch={onReset}
      />,
    );
    fireEvent.click(screen.getByTestId("reset-kill-switch"));
    expect(onReset).toHaveBeenCalledTimes(1);
  });

  // ========================================================================
  // Data propagation to sub-components
  // ========================================================================

  it("passes VaR data correctly to VaRVisualization", () => {
    render(
      <RiskDashboard
        metrics={mockMetrics}
        positions={mockPositions}
        accountEquity={ACCOUNT_EQUITY}
      />,
    );
    // The VaR component should display heat utilization
    expect(screen.getByTestId("heat-utilization")).toHaveTextContent(
      "50.00% utilized",
    );
  });

  it("passes drawdown data correctly to DrawdownChart", () => {
    render(
      <RiskDashboard
        metrics={mockMetrics}
        positions={mockPositions}
        accountEquity={ACCOUNT_EQUITY}
      />,
    );
    expect(screen.getByTestId("current-drawdown")).toHaveTextContent(
      "3.00%",
    );
    expect(screen.getByTestId("max-drawdown")).toHaveTextContent(
      "5.00%",
    );
  });

  it("passes positions to RiskHeatmap", () => {
    render(
      <RiskDashboard
        metrics={mockMetrics}
        positions={mockPositions}
        accountEquity={ACCOUNT_EQUITY}
      />,
    );
    expect(screen.getByText("2 positions")).toBeInTheDocument();
  });

  // ========================================================================
  // Custom className
  // ========================================================================

  it("applies custom className", () => {
    render(
      <RiskDashboard
        metrics={mockMetrics}
        positions={mockPositions}
        accountEquity={ACCOUNT_EQUITY}
        className="mt-10"
      />,
    );
    const region = screen.getByRole("region", {
      name: "Risk dashboard",
    });
    expect(region).toHaveClass("mt-10");
  });

  // ========================================================================
  // Accessibility
  // ========================================================================

  it("has accessible region label", () => {
    render(
      <RiskDashboard
        metrics={mockMetrics}
        positions={mockPositions}
        accountEquity={ACCOUNT_EQUITY}
      />,
    );
    expect(
      screen.getByRole("region", { name: "Risk dashboard" }),
    ).toBeInTheDocument();
  });

  it("has accessible trading badge", () => {
    render(
      <RiskDashboard
        metrics={mockMetrics}
        positions={mockPositions}
        accountEquity={ACCOUNT_EQUITY}
      />,
    );
    const badge = screen.getByTestId("trading-badge");
    expect(badge).toHaveAttribute("aria-label", "Trading active");
  });

  // ========================================================================
  // Config overrides
  // ========================================================================

  it("uses custom config when provided", () => {
    render(
      <RiskDashboard
        metrics={mockMetrics}
        positions={mockPositions}
        accountEquity={ACCOUNT_EQUITY}
        config={{
          drawdownLevel1: 0.03,
          drawdownLevel2: 0.08,
          drawdownKillLevel: 0.12,
        }}
      />,
    );
    // Should use custom thresholds in the drawdown chart legend
    expect(screen.getByText(/Level 1 \(3.00%\)/)).toBeInTheDocument();
    expect(screen.getByText(/Level 2 \(8.00%\)/)).toBeInTheDocument();
    expect(
      screen.getByText(/Kill Switch \(12.00%\)/),
    ).toBeInTheDocument();
  });
});
