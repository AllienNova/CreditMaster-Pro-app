/**
 * VaRVisualization Component Tests
 *
 * Tests for Value-at-Risk visualization including loading state,
 * empty state, data rendering, heat gauge coloring, and accessibility.
 */

import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { VaRVisualization } from "../VaRVisualization";
import type { VaRData } from "../VaRVisualization";

// ============================================================================
// TEST DATA
// ============================================================================

const mockLowRiskData: VaRData = {
  totalHeat: 0.02,
  maxHeat: 0.06,
  heatUtilization: 0.333,
  grossExposure: 0.5,
  netExposure: 0.3,
  longExposure: 0.4,
  shortExposure: 0.1,
};

const mockHighRiskData: VaRData = {
  totalHeat: 0.055,
  maxHeat: 0.06,
  heatUtilization: 0.917,
  grossExposure: 1.8,
  netExposure: 0.6,
  longExposure: 1.2,
  shortExposure: 0.6,
};

const mockMediumRiskData: VaRData = {
  totalHeat: 0.042,
  maxHeat: 0.06,
  heatUtilization: 0.7,
  grossExposure: 1.0,
  netExposure: -0.2,
  longExposure: 0.4,
  shortExposure: 0.6,
};

// ============================================================================
// TESTS
// ============================================================================

describe("VaRVisualization", () => {
  // ========================================================================
  // Loading state
  // ========================================================================

  it("renders loading state with pulse animation", () => {
    const { container } = render(<VaRVisualization data={null} loading />);
    expect(container.querySelector(".animate-pulse")).toBeInTheDocument();
  });

  it("has accessible loading label", () => {
    render(<VaRVisualization data={null} loading />);
    expect(screen.getByRole("status")).toHaveAttribute(
      "aria-label",
      "Loading VaR data",
    );
  });

  // ========================================================================
  // Empty state
  // ========================================================================

  it("renders empty state when data is null and not loading", () => {
    render(<VaRVisualization data={null} />);
    expect(screen.getByText("Value at Risk")).toBeInTheDocument();
    expect(
      screen.getByText(
        "No VaR data available. Open positions to see risk metrics.",
      ),
    ).toBeInTheDocument();
  });

  // ========================================================================
  // Data rendering
  // ========================================================================

  it("renders heat utilization percentage", () => {
    render(<VaRVisualization data={mockLowRiskData} />);
    const utilization = screen.getByTestId("heat-utilization");
    expect(utilization).toHaveTextContent("33.30% utilized");
  });

  it("renders total heat and max heat values", () => {
    render(<VaRVisualization data={mockLowRiskData} />);
    expect(screen.getByTestId("total-heat")).toHaveTextContent(
      "Current: 2.00%",
    );
    expect(screen.getByTestId("max-heat")).toHaveTextContent("Max: 6.00%");
  });

  it("renders gross and net exposure values", () => {
    render(<VaRVisualization data={mockLowRiskData} />);
    expect(screen.getByTestId("gross-exposure")).toHaveTextContent("50.00%");
    expect(screen.getByTestId("net-exposure")).toHaveTextContent("+30.00%");
  });

  it("renders negative net exposure with minus sign", () => {
    render(<VaRVisualization data={mockMediumRiskData} />);
    expect(screen.getByTestId("net-exposure")).toHaveTextContent("-20.00%");
  });

  it("renders long and short exposure labels", () => {
    render(<VaRVisualization data={mockLowRiskData} />);
    expect(screen.getByText(/Long 40.00%/)).toBeInTheDocument();
    expect(screen.getByText(/Short 10.00%/)).toBeInTheDocument();
  });

  // ========================================================================
  // Heat gauge color coding
  // ========================================================================

  it("shows green heat bar for low utilization", () => {
    const { container } = render(
      <VaRVisualization data={mockLowRiskData} />,
    );
    const progressbar = screen.getByRole("progressbar");
    const bar = progressbar.firstChild as HTMLElement;
    expect(bar).toHaveClass("bg-green-500");
  });

  it("shows red heat bar for high utilization (>=90%)", () => {
    const { container } = render(
      <VaRVisualization data={mockHighRiskData} />,
    );
    const progressbar = screen.getByRole("progressbar");
    const bar = progressbar.firstChild as HTMLElement;
    expect(bar).toHaveClass("bg-red-500");
  });

  it("shows amber heat bar for elevated utilization (>=70%)", () => {
    const { container } = render(
      <VaRVisualization data={mockMediumRiskData} />,
    );
    const progressbar = screen.getByRole("progressbar");
    const bar = progressbar.firstChild as HTMLElement;
    expect(bar).toHaveClass("bg-amber-500");
  });

  // ========================================================================
  // Progressbar ARIA
  // ========================================================================

  it("has correct progressbar ARIA attributes", () => {
    render(<VaRVisualization data={mockLowRiskData} />);
    const progressbar = screen.getByRole("progressbar");
    expect(progressbar).toHaveAttribute("aria-valuenow", "33");
    expect(progressbar).toHaveAttribute("aria-valuemin", "0");
    expect(progressbar).toHaveAttribute("aria-valuemax", "100");
  });

  // ========================================================================
  // Custom className
  // ========================================================================

  it("applies custom className", () => {
    render(<VaRVisualization data={mockLowRiskData} className="mt-8" />);
    const region = screen.getByRole("region");
    expect(region).toHaveClass("mt-8");
  });

  // ========================================================================
  // Region label
  // ========================================================================

  it("has accessible region label", () => {
    render(<VaRVisualization data={mockLowRiskData} />);
    expect(screen.getByRole("region")).toHaveAttribute(
      "aria-label",
      "Value at Risk",
    );
  });

  // ========================================================================
  // Heat bar width caps at 100%
  // ========================================================================

  it("caps heat bar width at 100% when utilization exceeds 1", () => {
    const overMaxData: VaRData = {
      ...mockHighRiskData,
      heatUtilization: 1.5,
    };
    render(<VaRVisualization data={overMaxData} />);
    const progressbar = screen.getByRole("progressbar");
    const bar = progressbar.firstChild as HTMLElement;
    expect(bar.style.width).toBe("100%");
  });
});
