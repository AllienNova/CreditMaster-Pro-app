/**
 * RiskHeatmap Component Tests
 *
 * Tests for risk heatmap including loading state, empty state,
 * position rendering, sorting, color coding, summary table,
 * and accessibility.
 */

import React from "react";
import { render, screen, within } from "@testing-library/react";
import "@testing-library/jest-dom";
import { RiskHeatmap } from "../RiskHeatmap";
import type { PositionRisk } from "@/lib/trading/pctt/portfolio-risk";

// ============================================================================
// TEST DATA
// ============================================================================

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
  {
    symbol: "NVDA",
    side: "short",
    quantity: 30,
    entryPrice: 500,
    currentPrice: 520,
    stopPrice: 530,
    dollarRisk: 900,
    percentRisk: 0.025,
    unrealizedPL: -600,
    unrealizedPLPercent: -0.04,
  },
];

const ACCOUNT_EQUITY = 100000;

// ============================================================================
// TESTS
// ============================================================================

describe("RiskHeatmap", () => {
  // ========================================================================
  // Loading state
  // ========================================================================

  it("renders loading state with pulse animation", () => {
    const { container } = render(
      <RiskHeatmap
        positions={[]}
        accountEquity={ACCOUNT_EQUITY}
        loading
      />,
    );
    expect(container.querySelector(".animate-pulse")).toBeInTheDocument();
  });

  it("has accessible loading label", () => {
    render(
      <RiskHeatmap
        positions={[]}
        accountEquity={ACCOUNT_EQUITY}
        loading
      />,
    );
    expect(screen.getByRole("status")).toHaveAttribute(
      "aria-label",
      "Loading risk heatmap",
    );
  });

  // ========================================================================
  // Empty state
  // ========================================================================

  it("renders empty state when no positions", () => {
    render(
      <RiskHeatmap positions={[]} accountEquity={ACCOUNT_EQUITY} />,
    );
    expect(
      screen.getByText("Position Risk Heatmap"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "No open positions. Risk heatmap will appear when positions are active.",
      ),
    ).toBeInTheDocument();
  });

  // ========================================================================
  // Position count
  // ========================================================================

  it("shows correct position count", () => {
    render(
      <RiskHeatmap
        positions={mockPositions}
        accountEquity={ACCOUNT_EQUITY}
      />,
    );
    expect(screen.getByText("3 positions")).toBeInTheDocument();
  });

  it("shows singular position text for single position", () => {
    render(
      <RiskHeatmap
        positions={[mockPositions[0]]}
        accountEquity={ACCOUNT_EQUITY}
      />,
    );
    expect(screen.getByText("1 position")).toBeInTheDocument();
  });

  // ========================================================================
  // Heatmap grid rendering
  // ========================================================================

  it("renders heatmap cells for each position", () => {
    render(
      <RiskHeatmap
        positions={mockPositions}
        accountEquity={ACCOUNT_EQUITY}
      />,
    );
    expect(screen.getByTestId("heatmap-cell-AAPL")).toBeInTheDocument();
    expect(screen.getByTestId("heatmap-cell-TSLA")).toBeInTheDocument();
    expect(screen.getByTestId("heatmap-cell-NVDA")).toBeInTheDocument();
  });

  it("sorts positions by risk (highest first) in the grid", () => {
    render(
      <RiskHeatmap
        positions={mockPositions}
        accountEquity={ACCOUNT_EQUITY}
      />,
    );
    const grid = screen.getByTestId("heatmap-grid");
    const cells = grid.querySelectorAll("[data-testid^='heatmap-cell-']");
    // NVDA has highest risk (2.5%), should be first
    expect(cells[0]).toHaveAttribute("data-testid", "heatmap-cell-NVDA");
    // TSLA has middle risk (1%), should be second
    expect(cells[1]).toHaveAttribute("data-testid", "heatmap-cell-TSLA");
    // AAPL has lowest risk (0.5%), should be third
    expect(cells[2]).toHaveAttribute("data-testid", "heatmap-cell-AAPL");
  });

  // ========================================================================
  // Risk color coding
  // ========================================================================

  it("applies critical (red) color to high-risk positions", () => {
    render(
      <RiskHeatmap
        positions={mockPositions}
        accountEquity={ACCOUNT_EQUITY}
      />,
    );
    const nvdaCell = screen.getByTestId("heatmap-cell-NVDA");
    expect(nvdaCell).toHaveClass("bg-red-500");
  });

  it("applies moderate (yellow) color to mid-risk positions", () => {
    render(
      <RiskHeatmap
        positions={mockPositions}
        accountEquity={ACCOUNT_EQUITY}
      />,
    );
    const tslaCell = screen.getByTestId("heatmap-cell-TSLA");
    expect(tslaCell).toHaveClass("bg-amber-500");
  });

  it("applies low (yellow) color to low-risk positions", () => {
    render(
      <RiskHeatmap
        positions={mockPositions}
        accountEquity={ACCOUNT_EQUITY}
      />,
    );
    const aaplCell = screen.getByTestId("heatmap-cell-AAPL");
    expect(aaplCell).toHaveClass("bg-yellow-500");
  });

  // ========================================================================
  // Heatmap cell content
  // ========================================================================

  it("shows symbol and side in heatmap cell", () => {
    render(
      <RiskHeatmap
        positions={mockPositions}
        accountEquity={ACCOUNT_EQUITY}
      />,
    );
    const nvdaCell = screen.getByTestId("heatmap-cell-NVDA");
    expect(within(nvdaCell).getByText("NVDA")).toBeInTheDocument();
    expect(within(nvdaCell).getByText(/SHORT/)).toBeInTheDocument();
  });

  // ========================================================================
  // Summary table
  // ========================================================================

  it("renders summary table with all positions", () => {
    render(
      <RiskHeatmap
        positions={mockPositions}
        accountEquity={ACCOUNT_EQUITY}
      />,
    );
    expect(screen.getByRole("table")).toBeInTheDocument();
    expect(screen.getByTestId("heatmap-row-AAPL")).toBeInTheDocument();
    expect(screen.getByTestId("heatmap-row-TSLA")).toBeInTheDocument();
    expect(screen.getByTestId("heatmap-row-NVDA")).toBeInTheDocument();
  });

  it("shows total row in summary table", () => {
    render(
      <RiskHeatmap
        positions={mockPositions}
        accountEquity={ACCOUNT_EQUITY}
      />,
    );
    expect(screen.getByText("Total")).toBeInTheDocument();
  });

  it("renders column headers", () => {
    render(
      <RiskHeatmap
        positions={mockPositions}
        accountEquity={ACCOUNT_EQUITY}
      />,
    );
    expect(screen.getByText("Symbol")).toBeInTheDocument();
    expect(screen.getByText("Side")).toBeInTheDocument();
    expect(screen.getByText("$ Risk")).toBeInTheDocument();
    expect(screen.getByText("% Risk")).toBeInTheDocument();
    expect(screen.getByText("P&L")).toBeInTheDocument();
  });

  // ========================================================================
  // Risk legend
  // ========================================================================

  it("renders risk legend with all categories", () => {
    render(
      <RiskHeatmap
        positions={mockPositions}
        accountEquity={ACCOUNT_EQUITY}
      />,
    );
    expect(screen.getByText(/Low/)).toBeInTheDocument();
    expect(screen.getByText(/Moderate/)).toBeInTheDocument();
    expect(screen.getByText(/Elevated/)).toBeInTheDocument();
    expect(screen.getByText(/High/)).toBeInTheDocument();
    expect(screen.getByText(/Critical/)).toBeInTheDocument();
  });

  // ========================================================================
  // Custom className
  // ========================================================================

  it("applies custom className", () => {
    render(
      <RiskHeatmap
        positions={mockPositions}
        accountEquity={ACCOUNT_EQUITY}
        className="mt-6"
      />,
    );
    const region = screen.getByRole("region");
    expect(region).toHaveClass("mt-6");
  });

  // ========================================================================
  // Accessibility
  // ========================================================================

  it("has accessible region label", () => {
    render(
      <RiskHeatmap
        positions={mockPositions}
        accountEquity={ACCOUNT_EQUITY}
      />,
    );
    expect(screen.getByRole("region")).toHaveAttribute(
      "aria-label",
      "Risk heatmap",
    );
  });

  it("has accessible gridcell labels on heatmap cells", () => {
    render(
      <RiskHeatmap
        positions={mockPositions}
        accountEquity={ACCOUNT_EQUITY}
      />,
    );
    const aaplCell = screen.getByTestId("heatmap-cell-AAPL");
    expect(aaplCell).toHaveAttribute(
      "aria-label",
      "AAPL risk: 0.50%",
    );
  });
});
