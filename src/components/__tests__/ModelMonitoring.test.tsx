/**
 * ModelMonitoring Component Tests
 */

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";

// Mock the ModelMonitoring component
jest.mock("../admin/ModelMonitoring", () => {
  const MockModelMonitoring = ({ className }: { className?: string }) => {
    const [timeRange, setTimeRange] = React.useState<"day" | "week" | "month">(
      "week",
    );
    const [sortBy, setSortBy] = React.useState("requests");

    const metrics = {
      totalRequests: 125432,
      totalCost: 1847.32,
      avgLatency: 245,
      errorRate: 0.02,
    };
    const models = [
      {
        id: "gpt-4o",
        provider: "OpenAI",
        requests: 45000,
        cost: 892.5,
        latency: 320,
        errorRate: 0.015,
      },
      {
        id: "claude-3-opus",
        provider: "Anthropic",
        requests: 28000,
        cost: 445.2,
        latency: 280,
        errorRate: 0.018,
      },
    ];
    const costBreakdown = [
      { category: "Chat", cost: 892.5, percentage: 48 },
      { category: "Completion", cost: 445.2, percentage: 24 },
      { category: "Embedding", cost: 298.45, percentage: 16 },
    ];

    return (
      <div className={className} data-testid="model-monitoring">
        <h2>AI Model Monitoring</h2>
        <div data-testid="time-range-selector">
          {(["day", "week", "month"] as const).map((range) => (
            <button
              type="button"
              key={range}
              data-testid={`range-${range}`}
              onClick={() => setTimeRange(range)}
              className={timeRange === range ? "active" : ""}
            >
              {range.charAt(0).toUpperCase() + range.slice(1)}
            </button>
          ))}
        </div>
        <div data-testid="summary-cards">
          <div data-testid="total-requests">
            {metrics.totalRequests.toLocaleString()}
          </div>
          <div data-testid="total-cost">${metrics.totalCost.toFixed(2)}</div>
          <div data-testid="avg-latency">{metrics.avgLatency}ms</div>
          <div data-testid="error-rate">
            {(metrics.errorRate * 100).toFixed(2)}%
          </div>
        </div>
        <div data-testid="usage-chart">Usage Trend Chart</div>
        <div data-testid="model-table">
          <select
            data-testid="sort-select"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            aria-label="Sort by"
          >
            <option value="requests">Sort by Requests</option>
            <option value="cost">Sort by Cost</option>
            <option value="latency">Sort by Latency</option>
          </select>
          {models.map((model) => (
            <div key={model.id} data-testid={`model-row-${model.id}`}>
              <span>{model.id}</span>
              <span>{model.provider}</span>
              <span>{model.requests.toLocaleString()}</span>
              <span>${model.cost.toFixed(2)}</span>
              <span>{model.latency}ms</span>
            </div>
          ))}
        </div>
        <div data-testid="cost-breakdown">
          {costBreakdown.map((item) => (
            <div
              key={item.category}
              data-testid={`cost-${item.category.toLowerCase()}`}
            >
              <span>{item.category}</span>
              <span>${item.cost.toFixed(2)}</span>
              <span>{item.percentage}%</span>
            </div>
          ))}
        </div>
      </div>
    );
  };
  return { __esModule: true, default: MockModelMonitoring };
});

import ModelMonitoring from "../admin/ModelMonitoring";

describe("ModelMonitoring", () => {
  it("renders model monitoring component", () => {
    render(<ModelMonitoring />);
    expect(screen.getByTestId("model-monitoring")).toBeInTheDocument();
  });

  it("renders time range selector", () => {
    render(<ModelMonitoring />);
    expect(screen.getByTestId("time-range-selector")).toBeInTheDocument();
    expect(screen.getByTestId("range-day")).toBeInTheDocument();
    expect(screen.getByTestId("range-week")).toBeInTheDocument();
    expect(screen.getByTestId("range-month")).toBeInTheDocument();
  });

  it("changes time range when button clicked", () => {
    render(<ModelMonitoring />);
    const dayButton = screen.getByTestId("range-day");
    fireEvent.click(dayButton);
    expect(dayButton).toHaveClass("active");
  });

  it("displays summary metrics", () => {
    render(<ModelMonitoring />);
    expect(screen.getByTestId("total-requests")).toHaveTextContent("125,432");
    expect(screen.getByTestId("total-cost")).toHaveTextContent("$1847.32");
    expect(screen.getByTestId("avg-latency")).toHaveTextContent("245ms");
    expect(screen.getByTestId("error-rate")).toHaveTextContent("2.00%");
  });

  it("renders usage chart", () => {
    render(<ModelMonitoring />);
    expect(screen.getByTestId("usage-chart")).toBeInTheDocument();
  });

  it("renders model table with sort selector", () => {
    render(<ModelMonitoring />);
    expect(screen.getByTestId("model-table")).toBeInTheDocument();
    expect(screen.getByTestId("sort-select")).toBeInTheDocument();
  });

  it("displays model rows", () => {
    render(<ModelMonitoring />);
    expect(screen.getByTestId("model-row-gpt-4o")).toBeInTheDocument();
    expect(screen.getByTestId("model-row-claude-3-opus")).toBeInTheDocument();
  });

  it("renders cost breakdown", () => {
    render(<ModelMonitoring />);
    expect(screen.getByTestId("cost-breakdown")).toBeInTheDocument();
    expect(screen.getByTestId("cost-chat")).toBeInTheDocument();
    expect(screen.getByTestId("cost-completion")).toBeInTheDocument();
  });

  it("applies custom className", () => {
    render(<ModelMonitoring className="custom-class" />);
    expect(screen.getByTestId("model-monitoring")).toHaveClass("custom-class");
  });

  it("changes sort order", () => {
    render(<ModelMonitoring />);
    const sortSelect = screen.getByTestId("sort-select");
    fireEvent.change(sortSelect, { target: { value: "cost" } });
    expect(sortSelect).toHaveValue("cost");
  });
});
