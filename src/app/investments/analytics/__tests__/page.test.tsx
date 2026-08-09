/**
 * RTL tests for RiskGauge — covers the null-guard JSX branches added by INV-3
 * (sharpeRatio, beta, alpha nullable display).
 */

import React from "react";
import { render, screen } from "@testing-library/react";
import { RiskGauge } from "../risk-gauge";
import type { RiskMetrics } from "@/lib/investments/types/advanced-analytics.types";

// Base mock that satisfies the RiskMetrics shape
const BASE_METRICS: RiskMetrics = {
  portfolioId: "550e8400-e29b-41d4-a716-446655440000",
  timeHorizon: "1Y",
  calculatedAt: new Date("2026-01-01"),
  valueAtRisk: { var95: 0.05, var99: 0.08, confidenceLevel: 0.95, timeHorizonDays: 30 },
  conditionalVaR: { cvar95: 0.07, cvar99: 0.10, expectedShortfall: 0.09 },
  sharpeRatio: 1.5,
  sortinoRatio: 1.8,
  calmarRatio: 0.9,
  beta: 1.1,
  alpha: 0.03,
  rSquared: 0.85,
  volatility: { daily: 0.01, annualized: 0.15, downside: 0.008 },
  maxDrawdown: 0.12,
  currentDrawdown: 0.05,
  averageDrawdown: 0.08,
  trackingError: 0.04,
  informationRatio: 0.6,
  metadata: { riskFreeRate: 0.05, benchmark: "SPY", monteCarloIterations: 10000 },
};

describe("RiskGauge – null-safe display branches (INV-3)", () => {
  it("renders numeric values when sharpeRatio, beta, and alpha are non-null", () => {
    render(<RiskGauge riskMetrics={BASE_METRICS} />);

    // sharpeRatio non-null: shows formatted value (1.50)
    expect(screen.getByText("1.50")).toBeInTheDocument();
    // beta non-null: shows formatted value (1.10)
    expect(screen.getByText("1.10")).toBeInTheDocument();
    // alpha non-null and positive: shows formatted percentage
    expect(screen.getByText("3.00%")).toBeInTheDocument();
  });

  it("renders em-dash placeholders when sharpeRatio, beta, and alpha are null", () => {
    const nullMetrics: RiskMetrics = {
      ...BASE_METRICS,
      sharpeRatio: null,
      beta: null,
      alpha: null,
    };
    render(<RiskGauge riskMetrics={nullMetrics} />);

    // All three null-guard ternaries should produce '—'
    const dashes = screen.getAllByText("—");
    expect(dashes.length).toBeGreaterThanOrEqual(3);

    // Risk level indicator should show N/A (null sharpe)
    expect(screen.getByText("N/A")).toBeInTheDocument();
  });

  it("shows red class for negative alpha", () => {
    const negativeAlpha: RiskMetrics = {
      ...BASE_METRICS,
      alpha: -0.02,
    };
    const { container } = render(<RiskGauge riskMetrics={negativeAlpha} />);
    // alpha value element should have the red class
    const alphaEl = screen.getByText("-2.00%");
    expect(alphaEl).toBeInTheDocument();
    expect(alphaEl.className).toContain("text-red-600");
  });
});
