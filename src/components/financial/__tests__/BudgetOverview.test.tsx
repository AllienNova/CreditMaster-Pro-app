/**
 * BudgetOverview Component Tests
 *
 * Tests for the monthly budget summary with key metrics and alerts.
 */

import React from "react";
import { render, screen } from "@testing-library/react";
import BudgetOverview from "../BudgetOverview";

const defaultAnalysis = {
  totalBudgeted: 5000,
  totalSpent: 3500,
  totalRemaining: 1500,
  percentUsed: 70,
  categoriesOverBudget: 0,
  categoriesNearLimit: 0,
  daysRemaining: 10,
  projectedSpending: 4800,
  projectedOverage: 0,
};

describe("BudgetOverview", () => {
  it("renders without crashing", () => {
    render(<BudgetOverview analysis={defaultAnalysis} period="monthly" />);
    expect(screen.getByTestId("budget-overview")).toBeInTheDocument();
  });

  it("displays the total budget amount", () => {
    render(<BudgetOverview analysis={defaultAnalysis} period="monthly" />);
    expect(screen.getByText("$5,000")).toBeInTheDocument();
    expect(screen.getByText("Total Budget")).toBeInTheDocument();
  });

  it("displays the spent amount", () => {
    render(<BudgetOverview analysis={defaultAnalysis} period="monthly" />);
    expect(screen.getByText("$3,500")).toBeInTheDocument();
    expect(screen.getByText("Spent")).toBeInTheDocument();
  });

  it("displays the remaining amount and days left", () => {
    render(<BudgetOverview analysis={defaultAnalysis} period="monthly" />);
    expect(screen.getByText("$1,500")).toBeInTheDocument();
    expect(screen.getByText("10 days left")).toBeInTheDocument();
  });

  it("displays the period label", () => {
    render(<BudgetOverview analysis={defaultAnalysis} period="monthly" />);
    expect(screen.getByText("monthly period")).toBeInTheDocument();
  });

  it("shows projected spending", () => {
    render(<BudgetOverview analysis={defaultAnalysis} period="monthly" />);
    expect(screen.getByText("$4,800")).toBeInTheDocument();
    expect(screen.getByText("On track")).toBeInTheDocument();
  });

  it("shows projected overage when over budget", () => {
    const overBudgetAnalysis = {
      ...defaultAnalysis,
      projectedSpending: 5500,
      projectedOverage: 500,
    };
    render(<BudgetOverview analysis={overBudgetAnalysis} period="monthly" />);
    expect(screen.getByText("$5,500")).toBeInTheDocument();
    expect(screen.getByText("$500 over")).toBeInTheDocument();
  });

  it("shows budget alerts when categories are over budget", () => {
    const analysis = {
      ...defaultAnalysis,
      categoriesOverBudget: 2,
      categoriesNearLimit: 1,
    };
    render(<BudgetOverview analysis={analysis} period="monthly" />);
    expect(screen.getByText("Budget Alerts")).toBeInTheDocument();
    expect(screen.getByText(/categories are over budget/)).toBeInTheDocument();
    expect(
      screen.getByText(/category is near the limit/),
    ).toBeInTheDocument();
  });

  it("does not show alerts when no categories are over or near limit", () => {
    render(<BudgetOverview analysis={defaultAnalysis} period="monthly" />);
    expect(screen.queryByText("Budget Alerts")).not.toBeInTheDocument();
  });

  it("uses singular grammar for 1 category over budget", () => {
    const analysis = {
      ...defaultAnalysis,
      categoriesOverBudget: 1,
    };
    render(<BudgetOverview analysis={analysis} period="monthly" />);
    expect(screen.getByText(/category is over budget/)).toBeInTheDocument();
  });
});
