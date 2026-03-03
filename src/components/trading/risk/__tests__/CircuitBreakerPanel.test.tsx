/**
 * CircuitBreakerPanel Component Tests
 *
 * Tests for circuit breaker status display, kill switch alerts,
 * trading status banners, block reasons, reset button,
 * and accessibility.
 */

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { CircuitBreakerPanel } from "../CircuitBreakerPanel";
import type { CircuitBreaker } from "../CircuitBreakerPanel";

// ============================================================================
// TEST DATA
// ============================================================================

const mockBreakers: CircuitBreaker[] = [
  {
    id: "heat-limit",
    name: "Portfolio Heat Limit",
    status: "healthy",
    description: "Monitors aggregate portfolio risk level",
    currentValue: "3.20%",
    threshold: "6.00%",
  },
  {
    id: "drawdown",
    name: "Drawdown Monitor",
    status: "warning",
    description: "Tracks equity drawdown from peak",
    currentValue: "6.50%",
    threshold: "15.00%",
    lastTriggered: "2026-02-28 14:30 UTC",
  },
  {
    id: "correlation",
    name: "Correlation Guard",
    status: "triggered",
    description: "Prevents correlated position concentration",
    currentValue: "35.00%",
    threshold: "30.00%",
  },
];

const allHealthyBreakers: CircuitBreaker[] = [
  {
    id: "heat-limit",
    name: "Portfolio Heat Limit",
    status: "healthy",
    description: "Monitors aggregate portfolio risk level",
  },
  {
    id: "drawdown",
    name: "Drawdown Monitor",
    status: "healthy",
    description: "Tracks equity drawdown from peak",
  },
];

// ============================================================================
// TESTS
// ============================================================================

describe("CircuitBreakerPanel", () => {
  // ========================================================================
  // Loading state
  // ========================================================================

  it("renders loading state with pulse animation", () => {
    const { container } = render(
      <CircuitBreakerPanel
        breakers={[]}
        killSwitchActive={false}
        canTrade
        blockReasons={[]}
        loading
      />,
    );
    expect(container.querySelector(".animate-pulse")).toBeInTheDocument();
  });

  it("has accessible loading label", () => {
    render(
      <CircuitBreakerPanel
        breakers={[]}
        killSwitchActive={false}
        canTrade
        blockReasons={[]}
        loading
      />,
    );
    expect(screen.getByRole("status")).toHaveAttribute(
      "aria-label",
      "Loading circuit breaker data",
    );
  });

  // ========================================================================
  // Breaker rendering
  // ========================================================================

  it("renders all breaker items", () => {
    render(
      <CircuitBreakerPanel
        breakers={mockBreakers}
        killSwitchActive={false}
        canTrade
        blockReasons={[]}
      />,
    );
    expect(
      screen.getByTestId("breaker-heat-limit"),
    ).toBeInTheDocument();
    expect(screen.getByTestId("breaker-drawdown")).toBeInTheDocument();
    expect(
      screen.getByTestId("breaker-correlation"),
    ).toBeInTheDocument();
  });

  it("renders breaker names and descriptions", () => {
    render(
      <CircuitBreakerPanel
        breakers={mockBreakers}
        killSwitchActive={false}
        canTrade
        blockReasons={[]}
      />,
    );
    expect(
      screen.getByText("Portfolio Heat Limit"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Monitors aggregate portfolio risk level"),
    ).toBeInTheDocument();
    expect(screen.getByText("Drawdown Monitor")).toBeInTheDocument();
    expect(screen.getByText("Correlation Guard")).toBeInTheDocument();
  });

  it("renders current value and threshold for breakers", () => {
    render(
      <CircuitBreakerPanel
        breakers={mockBreakers}
        killSwitchActive={false}
        canTrade
        blockReasons={[]}
      />,
    );
    expect(screen.getByText("3.20%")).toBeInTheDocument();
    expect(screen.getByText("6.00%")).toBeInTheDocument();
  });

  it("renders last triggered timestamp", () => {
    render(
      <CircuitBreakerPanel
        breakers={mockBreakers}
        killSwitchActive={false}
        canTrade
        blockReasons={[]}
      />,
    );
    expect(
      screen.getByText(/Last triggered: 2026-02-28 14:30 UTC/),
    ).toBeInTheDocument();
  });

  // ========================================================================
  // Status indicators
  // ========================================================================

  it("shows correct status text for each breaker", () => {
    render(
      <CircuitBreakerPanel
        breakers={mockBreakers}
        killSwitchActive={false}
        canTrade
        blockReasons={[]}
      />,
    );
    expect(
      screen.getByTestId("breaker-status-heat-limit"),
    ).toHaveTextContent("healthy");
    expect(
      screen.getByTestId("breaker-status-drawdown"),
    ).toHaveTextContent("warning");
    expect(
      screen.getByTestId("breaker-status-correlation"),
    ).toHaveTextContent("triggered");
  });

  it("shows summary counts in header", () => {
    render(
      <CircuitBreakerPanel
        breakers={mockBreakers}
        killSwitchActive={false}
        canTrade
        blockReasons={[]}
      />,
    );
    expect(screen.getByText("1 OK")).toBeInTheDocument();
    expect(screen.getByText("1 Warning")).toBeInTheDocument();
    expect(screen.getByText("1 Triggered")).toBeInTheDocument();
  });

  it("hides warning/triggered counts when all healthy", () => {
    render(
      <CircuitBreakerPanel
        breakers={allHealthyBreakers}
        killSwitchActive={false}
        canTrade
        blockReasons={[]}
      />,
    );
    expect(screen.getByText("2 OK")).toBeInTheDocument();
    expect(screen.queryByText(/Warning/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Triggered/)).not.toBeInTheDocument();
  });

  // ========================================================================
  // Trading status banner
  // ========================================================================

  it("shows Trading Active banner when canTrade is true", () => {
    render(
      <CircuitBreakerPanel
        breakers={allHealthyBreakers}
        killSwitchActive={false}
        canTrade
        blockReasons={[]}
      />,
    );
    const status = screen.getByTestId("trading-status");
    expect(status).toHaveTextContent("Trading Active");
  });

  it("shows Trading Halted banner when canTrade is false", () => {
    render(
      <CircuitBreakerPanel
        breakers={mockBreakers}
        killSwitchActive={false}
        canTrade={false}
        blockReasons={["Max heat reached", "Correlation limit exceeded"]}
      />,
    );
    const status = screen.getByTestId("trading-status");
    expect(status).toHaveTextContent("Trading Halted");
  });

  it("renders block reasons when trading is halted", () => {
    render(
      <CircuitBreakerPanel
        breakers={mockBreakers}
        killSwitchActive={false}
        canTrade={false}
        blockReasons={["Max heat reached", "Correlation limit exceeded"]}
      />,
    );
    const reasons = screen.getByTestId("block-reasons");
    expect(reasons).toHaveTextContent("Max heat reached");
    expect(reasons).toHaveTextContent("Correlation limit exceeded");
  });

  // ========================================================================
  // Kill switch
  // ========================================================================

  it("shows kill switch alert when active", () => {
    render(
      <CircuitBreakerPanel
        breakers={mockBreakers}
        killSwitchActive
        killSwitchReason="Drawdown exceeded 15%"
        canTrade={false}
        blockReasons={["Kill switch: Drawdown exceeded 15%"]}
      />,
    );
    expect(screen.getByTestId("kill-switch-alert")).toBeInTheDocument();
    expect(screen.getByText("Kill Switch Active")).toBeInTheDocument();
  });

  it("shows kill switch reason", () => {
    render(
      <CircuitBreakerPanel
        breakers={mockBreakers}
        killSwitchActive
        killSwitchReason="Drawdown exceeded 15%"
        canTrade={false}
        blockReasons={[]}
      />,
    );
    expect(screen.getByTestId("kill-switch-reason")).toHaveTextContent(
      "Drawdown exceeded 15%",
    );
  });

  it("does not show kill switch alert when inactive", () => {
    render(
      <CircuitBreakerPanel
        breakers={allHealthyBreakers}
        killSwitchActive={false}
        canTrade
        blockReasons={[]}
      />,
    );
    expect(
      screen.queryByTestId("kill-switch-alert"),
    ).not.toBeInTheDocument();
  });

  it("renders reset kill switch button when callback provided", () => {
    render(
      <CircuitBreakerPanel
        breakers={mockBreakers}
        killSwitchActive
        killSwitchReason="Drawdown exceeded 15%"
        canTrade={false}
        blockReasons={[]}
        onResetKillSwitch={jest.fn()}
      />,
    );
    expect(
      screen.getByTestId("reset-kill-switch"),
    ).toBeInTheDocument();
  });

  it("calls onResetKillSwitch when button is clicked", () => {
    const onReset = jest.fn();
    render(
      <CircuitBreakerPanel
        breakers={mockBreakers}
        killSwitchActive
        killSwitchReason="Drawdown exceeded 15%"
        canTrade={false}
        blockReasons={[]}
        onResetKillSwitch={onReset}
      />,
    );
    fireEvent.click(screen.getByTestId("reset-kill-switch"));
    expect(onReset).toHaveBeenCalledTimes(1);
  });

  it("does not render reset button when callback not provided", () => {
    render(
      <CircuitBreakerPanel
        breakers={mockBreakers}
        killSwitchActive
        canTrade={false}
        blockReasons={[]}
      />,
    );
    expect(
      screen.queryByTestId("reset-kill-switch"),
    ).not.toBeInTheDocument();
  });

  // ========================================================================
  // Empty breakers
  // ========================================================================

  it("shows message when no breakers configured", () => {
    render(
      <CircuitBreakerPanel
        breakers={[]}
        killSwitchActive={false}
        canTrade
        blockReasons={[]}
      />,
    );
    expect(
      screen.getByText("No circuit breakers configured."),
    ).toBeInTheDocument();
  });

  // ========================================================================
  // Custom className
  // ========================================================================

  it("applies custom className", () => {
    render(
      <CircuitBreakerPanel
        breakers={allHealthyBreakers}
        killSwitchActive={false}
        canTrade
        blockReasons={[]}
        className="mt-8"
      />,
    );
    const region = screen.getByRole("region");
    expect(region).toHaveClass("mt-8");
  });

  // ========================================================================
  // Accessibility
  // ========================================================================

  it("has accessible region label", () => {
    render(
      <CircuitBreakerPanel
        breakers={allHealthyBreakers}
        killSwitchActive={false}
        canTrade
        blockReasons={[]}
      />,
    );
    expect(screen.getByRole("region")).toHaveAttribute(
      "aria-label",
      "Circuit breaker panel",
    );
  });

  it("has alert role on trading status banner", () => {
    render(
      <CircuitBreakerPanel
        breakers={allHealthyBreakers}
        killSwitchActive={false}
        canTrade
        blockReasons={[]}
      />,
    );
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  it("has accessible labels on breaker items", () => {
    render(
      <CircuitBreakerPanel
        breakers={allHealthyBreakers}
        killSwitchActive={false}
        canTrade
        blockReasons={[]}
      />,
    );
    const item = screen.getByTestId("breaker-heat-limit");
    expect(item).toHaveAttribute(
      "aria-label",
      "Portfolio Heat Limit: healthy",
    );
  });
});
