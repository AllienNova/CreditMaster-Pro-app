/**
 * Tests for PullToRefreshIndicator Component
 */

import { render, screen } from "@testing-library/react";
import { PullToRefreshIndicator } from "../PullToRefreshIndicator";

describe("PullToRefreshIndicator", () => {
  const defaultProps = {
    isPulling: false,
    isRefreshing: false,
    pullDistance: 0,
    threshold: 80,
  };

  it("should return null when not pulling and not refreshing", () => {
    const { container } = render(
      <PullToRefreshIndicator {...defaultProps} />,
    );
    expect(container.innerHTML).toBe("");
  });

  it("should render when isPulling is true", () => {
    render(
      <PullToRefreshIndicator
        {...defaultProps}
        isPulling={true}
        pullDistance={40}
      />,
    );
    const status = screen.getByRole("status");
    expect(status).toBeInTheDocument();
  });

  it("should render when isRefreshing is true", () => {
    render(
      <PullToRefreshIndicator
        {...defaultProps}
        isRefreshing={true}
        pullDistance={80}
      />,
    );
    const status = screen.getByRole("status");
    expect(status).toBeInTheDocument();
  });

  it("should have role status and aria-live polite", () => {
    render(
      <PullToRefreshIndicator
        {...defaultProps}
        isPulling={true}
        pullDistance={40}
      />,
    );
    const status = screen.getByRole("status");
    expect(status).toHaveAttribute("aria-live", "polite");
  });

  it("should show 'Pull to refresh' text when pulling below threshold", () => {
    render(
      <PullToRefreshIndicator
        {...defaultProps}
        isPulling={true}
        pullDistance={30}
      />,
    );
    expect(screen.getByText("Pull to refresh")).toBeInTheDocument();
  });

  it("should show 'Release to refresh' text when pulling past threshold", () => {
    render(
      <PullToRefreshIndicator
        {...defaultProps}
        isPulling={true}
        pullDistance={100}
      />,
    );
    expect(screen.getByText("Release to refresh")).toBeInTheDocument();
  });

  it("should show 'Refreshing...' text when isRefreshing", () => {
    render(
      <PullToRefreshIndicator
        {...defaultProps}
        isRefreshing={true}
        pullDistance={80}
      />,
    );
    expect(screen.getByText("Refreshing...")).toBeInTheDocument();
  });

  it("should set aria-label to 'Refreshing content' when refreshing", () => {
    render(
      <PullToRefreshIndicator
        {...defaultProps}
        isRefreshing={true}
        pullDistance={80}
      />,
    );
    const status = screen.getByRole("status");
    expect(status).toHaveAttribute("aria-label", "Refreshing content");
  });

  it("should set aria-label to 'Pull to refresh' when pulling", () => {
    render(
      <PullToRefreshIndicator
        {...defaultProps}
        isPulling={true}
        pullDistance={40}
      />,
    );
    const status = screen.getByRole("status");
    expect(status).toHaveAttribute("aria-label", "Pull to refresh");
  });

  it("should show spinner SVG when refreshing", () => {
    const { container } = render(
      <PullToRefreshIndicator
        {...defaultProps}
        isRefreshing={true}
        pullDistance={80}
      />,
    );
    const spinner = container.querySelector(".animate-spin");
    expect(spinner).toBeInTheDocument();
  });

  it("should show circular progress SVG when pulling (not refreshing)", () => {
    const { container } = render(
      <PullToRefreshIndicator
        {...defaultProps}
        isPulling={true}
        pullDistance={40}
      />,
    );
    const spinner = container.querySelector(".animate-spin");
    expect(spinner).not.toBeInTheDocument();
    // Should have the circular progress SVG
    const svgs = container.querySelectorAll("svg");
    expect(svgs.length).toBeGreaterThanOrEqual(1);
  });

  it("should set container height based on pullDistance", () => {
    render(
      <PullToRefreshIndicator
        {...defaultProps}
        isPulling={true}
        pullDistance={60}
      />,
    );
    const status = screen.getByRole("status");
    expect(status).toHaveStyle({ height: "60px" });
  });

  it("should apply rotate-180 to arrow when past threshold", () => {
    const { container } = render(
      <PullToRefreshIndicator
        {...defaultProps}
        isPulling={true}
        pullDistance={100}
      />,
    );
    const rotatedArrow = container.querySelector(".rotate-180");
    expect(rotatedArrow).toBeInTheDocument();
  });

  it("should not apply rotate-180 to arrow when below threshold", () => {
    const { container } = render(
      <PullToRefreshIndicator
        {...defaultProps}
        isPulling={true}
        pullDistance={30}
      />,
    );
    const rotatedArrow = container.querySelector(".rotate-180");
    expect(rotatedArrow).not.toBeInTheDocument();
  });

  it("should apply blue color class to progress circle when past threshold", () => {
    const { container } = render(
      <PullToRefreshIndicator
        {...defaultProps}
        isPulling={true}
        pullDistance={100}
      />,
    );
    const blueCircle = container.querySelector("circle.text-blue-500");
    expect(blueCircle).toBeInTheDocument();
  });
});
