/**
 * CategoryBreakdown Component Tests
 *
 * Tests for the spending by category display with view mode toggle.
 */

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import CategoryBreakdown from "../CategoryBreakdown";

// Mock chart components
jest.mock("@/components/charts/PieChart", () => {
  return ({ data }: any) => (
    <div data-testid="pie-chart">PieChart ({data?.length} items)</div>
  );
});

jest.mock("@/components/charts/BarChart", () => {
  return ({ data }: any) => (
    <div data-testid="bar-chart">BarChart ({data?.length} items)</div>
  );
});

const mockCategories = [
  {
    category: "housing",
    budgeted: 2000,
    spent: 1800,
    remaining: 200,
    percentUsed: 90,
    status: "near_limit" as const,
    transactions: 3,
  },
  {
    category: "food_dining",
    budgeted: 500,
    spent: 300,
    remaining: 200,
    percentUsed: 60,
    status: "on_track" as const,
    transactions: 15,
  },
  {
    category: "entertainment",
    budgeted: 200,
    spent: 250,
    remaining: -50,
    percentUsed: 125,
    status: "over_budget" as const,
    transactions: 8,
  },
];

describe("CategoryBreakdown", () => {
  const defaultProps = {
    categories: mockCategories,
    totalBudgeted: 2700,
  };

  it("renders without crashing", () => {
    render(<CategoryBreakdown {...defaultProps} />);
    expect(screen.getByTestId("category-breakdown")).toBeInTheDocument();
  });

  it("renders the Category Breakdown heading", () => {
    render(<CategoryBreakdown {...defaultProps} />);
    expect(screen.getByText("Category Breakdown")).toBeInTheDocument();
  });

  it("renders categories in list view by default", () => {
    render(<CategoryBreakdown {...defaultProps} />);
    expect(screen.getByText("housing")).toBeInTheDocument();
    expect(screen.getByText("food dining")).toBeInTheDocument();
    expect(screen.getByText("entertainment")).toBeInTheDocument();
  });

  it("displays currency amounts correctly", () => {
    render(<CategoryBreakdown {...defaultProps} />);
    expect(screen.getByText(/\$1,800/)).toBeInTheDocument();
    expect(screen.getByText(/\$2,000/)).toBeInTheDocument();
  });

  it("displays status badges", () => {
    render(<CategoryBreakdown {...defaultProps} />);
    expect(screen.getByText("near limit")).toBeInTheDocument();
    expect(screen.getByText("on track")).toBeInTheDocument();
    expect(screen.getByText("over budget")).toBeInTheDocument();
  });

  it("switches to pie chart view", () => {
    render(<CategoryBreakdown {...defaultProps} />);
    fireEvent.click(screen.getByText("Pie"));
    expect(screen.getByTestId("pie-chart")).toBeInTheDocument();
  });

  it("switches to bar chart view", () => {
    render(<CategoryBreakdown {...defaultProps} />);
    fireEvent.click(screen.getByText("Bar"));
    expect(screen.getByTestId("bar-chart")).toBeInTheDocument();
  });

  it("shows transaction counts", () => {
    render(<CategoryBreakdown {...defaultProps} />);
    expect(screen.getByText("3 transactions")).toBeInTheDocument();
    expect(screen.getByText("15 transactions")).toBeInTheDocument();
    expect(screen.getByText("8 transactions")).toBeInTheDocument();
  });
});
