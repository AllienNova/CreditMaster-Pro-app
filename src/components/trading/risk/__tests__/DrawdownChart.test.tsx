/**
 * DrawdownChart Component Tests
 *
 * Tests for drawdown visualization including loading state,
 * minimal data state, SVG rendering, severity badges,
 * metric values, and threshold legend display.
 */

import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { DrawdownChart } from "../DrawdownChart";
import type { DrawdownDataPoint, DrawdownThresholds } from "../DrawdownChart";

// ============================================================================
// TEST DATA
// ============================================================================

const mockThresholds: DrawdownThresholds = {
  level1: 0.05,
  level2: 0.10,
  killLevel: 0.15,
};

function generateDrawdownHistory(
  points: number,
  maxDD: number,
): DrawdownDataPoint[] {
  return Array.from({ length: points }, (_, i) => ({
    timestamp: Date.now() - (points - i) * 86400000,
    equity: 100000 - i * (maxDD / points) * 100000,
    drawdown: (i / points) * maxDD,
  }));
}

const healthyHistory = generateDrawdownHistory(30, 0.03);
const warningHistory = generateDrawdownHistory(30, 0.07);
const dangerHistory = generateDrawdownHistory(30, 0.12);
const criticalHistory = generateDrawdownHistory(30, 0.16);

// ============================================================================
// TESTS
// ============================================================================

describe("DrawdownChart", () => {
  // ========================================================================
  // Loading state
  // ========================================================================

  it("renders loading state with pulse animation", () => {
    const { container } = render(
      <DrawdownChart
        data={[]}
        currentDrawdown={0}
        maxDrawdown={0}
        scaleFactor={1}
        loading
      />,
    );
    expect(container.querySelector(".animate-pulse")).toBeInTheDocument();
  });

  it("has accessible loading label", () => {
    render(
      <DrawdownChart
        data={[]}
        currentDrawdown={0}
        maxDrawdown={0}
        scaleFactor={1}
        loading
      />,
    );
    expect(screen.getByRole("status")).toHaveAttribute(
      "aria-label",
      "Loading drawdown data",
    );
  });

  // ========================================================================
  // Insufficient data
  // ========================================================================

  it("shows message when data has fewer than 2 points", () => {
    render(
      <DrawdownChart
        data={[
          { timestamp: Date.now(), equity: 100000, drawdown: 0 },
        ]}
        currentDrawdown={0}
        maxDrawdown={0}
        scaleFactor={1}
      />,
    );
    expect(
      screen.getByText("Not enough data to render chart"),
    ).toBeInTheDocument();
  });

  // ========================================================================
  // SVG rendering
  // ========================================================================

  it("renders SVG chart when sufficient data is provided", () => {
    render(
      <DrawdownChart
        data={healthyHistory}
        currentDrawdown={0.03}
        maxDrawdown={0.03}
        scaleFactor={1}
      />,
    );
    expect(screen.getByTestId("drawdown-svg")).toBeInTheDocument();
    const svg = screen.getByRole("img");
    expect(svg).toHaveAttribute("aria-label", "Drawdown curve chart");
  });

  // ========================================================================
  // Severity badges
  // ========================================================================

  it("shows Healthy badge for low drawdown", () => {
    render(
      <DrawdownChart
        data={healthyHistory}
        currentDrawdown={0.03}
        maxDrawdown={0.03}
        scaleFactor={1}
        thresholds={mockThresholds}
      />,
    );
    const badge = screen.getByTestId("severity-badge");
    expect(badge).toHaveTextContent("Healthy");
  });

  it("shows Warning badge when drawdown exceeds level1", () => {
    render(
      <DrawdownChart
        data={warningHistory}
        currentDrawdown={0.07}
        maxDrawdown={0.07}
        scaleFactor={0.5}
        thresholds={mockThresholds}
      />,
    );
    const badge = screen.getByTestId("severity-badge");
    expect(badge).toHaveTextContent("Warning");
  });

  it("shows Danger badge when drawdown exceeds level2", () => {
    render(
      <DrawdownChart
        data={dangerHistory}
        currentDrawdown={0.12}
        maxDrawdown={0.12}
        scaleFactor={0.25}
        thresholds={mockThresholds}
      />,
    );
    const badge = screen.getByTestId("severity-badge");
    expect(badge).toHaveTextContent("Danger");
  });

  it("shows Critical badge when drawdown exceeds killLevel", () => {
    render(
      <DrawdownChart
        data={criticalHistory}
        currentDrawdown={0.16}
        maxDrawdown={0.16}
        scaleFactor={0}
        thresholds={mockThresholds}
      />,
    );
    const badge = screen.getByTestId("severity-badge");
    expect(badge).toHaveTextContent("Critical");
  });

  // ========================================================================
  // Metric values
  // ========================================================================

  it("renders current drawdown value", () => {
    render(
      <DrawdownChart
        data={healthyHistory}
        currentDrawdown={0.03}
        maxDrawdown={0.04}
        scaleFactor={1}
      />,
    );
    expect(screen.getByTestId("current-drawdown")).toHaveTextContent(
      "3.00%",
    );
  });

  it("renders max drawdown value", () => {
    render(
      <DrawdownChart
        data={healthyHistory}
        currentDrawdown={0.03}
        maxDrawdown={0.04}
        scaleFactor={1}
      />,
    );
    expect(screen.getByTestId("max-drawdown")).toHaveTextContent("4.00%");
  });

  it("renders scale factor as percentage", () => {
    render(
      <DrawdownChart
        data={healthyHistory}
        currentDrawdown={0.07}
        maxDrawdown={0.07}
        scaleFactor={0.5}
      />,
    );
    expect(screen.getByTestId("scale-factor")).toHaveTextContent("50%");
  });

  it("renders 100% scale factor for full capacity", () => {
    render(
      <DrawdownChart
        data={healthyHistory}
        currentDrawdown={0.01}
        maxDrawdown={0.01}
        scaleFactor={1}
      />,
    );
    expect(screen.getByTestId("scale-factor")).toHaveTextContent("100%");
  });

  // ========================================================================
  // Threshold legend
  // ========================================================================

  it("renders threshold legend items", () => {
    render(
      <DrawdownChart
        data={healthyHistory}
        currentDrawdown={0.03}
        maxDrawdown={0.03}
        scaleFactor={1}
        thresholds={mockThresholds}
      />,
    );
    expect(screen.getByText(/Level 1 \(5.00%\)/)).toBeInTheDocument();
    expect(screen.getByText(/Level 2 \(10.00%\)/)).toBeInTheDocument();
    expect(
      screen.getByText(/Kill Switch \(15.00%\)/),
    ).toBeInTheDocument();
  });

  // ========================================================================
  // Custom className
  // ========================================================================

  it("applies custom className", () => {
    render(
      <DrawdownChart
        data={healthyHistory}
        currentDrawdown={0.03}
        maxDrawdown={0.03}
        scaleFactor={1}
        className="mt-4"
      />,
    );
    const region = screen.getByRole("region");
    expect(region).toHaveClass("mt-4");
  });

  // ========================================================================
  // Accessibility
  // ========================================================================

  it("has accessible region label", () => {
    render(
      <DrawdownChart
        data={healthyHistory}
        currentDrawdown={0.03}
        maxDrawdown={0.03}
        scaleFactor={1}
      />,
    );
    expect(screen.getByRole("region")).toHaveAttribute(
      "aria-label",
      "Drawdown chart",
    );
  });

  it("has severity badge with accessible aria-label", () => {
    render(
      <DrawdownChart
        data={healthyHistory}
        currentDrawdown={0.03}
        maxDrawdown={0.03}
        scaleFactor={1}
      />,
    );
    const status = screen.getByRole("status");
    expect(status).toHaveAttribute(
      "aria-label",
      "Drawdown severity: Healthy",
    );
  });
});
