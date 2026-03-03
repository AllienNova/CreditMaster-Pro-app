/**
 * BudgetEditor Component Tests
 *
 * Tests for the inline budget editing component.
 */

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import BudgetEditor from "../BudgetEditor";

const mockBudget = {
  id: "budget-1",
  userId: "user-1",
  period: "monthly" as const,
  categories: [
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
      transactions: 12,
    },
  ],
  totalBudgeted: 2500,
  totalSpent: 2100,
  startDate: "2026-02-01",
  endDate: "2026-02-28",
  aiGenerated: false,
  confidence: 0.85,
  createdAt: "2026-02-01T00:00:00Z",
  updatedAt: "2026-02-20T00:00:00Z",
};

describe("BudgetEditor", () => {
  const defaultProps = {
    budget: mockBudget,
    onSave: jest.fn(() => Promise.resolve()),
    onCancel: jest.fn(),
  };

  beforeEach(() => {
    defaultProps.onSave = jest.fn(() => Promise.resolve());
    defaultProps.onCancel = jest.fn();
  });

  it("renders without crashing", () => {
    render(<BudgetEditor {...defaultProps} />);
    expect(screen.getByTestId("budget-editor")).toBeInTheDocument();
  });

  it("displays Edit Budget heading", () => {
    render(<BudgetEditor {...defaultProps} />);
    expect(screen.getByText("Edit Budget")).toBeInTheDocument();
  });

  it("displays total budget and total spent", () => {
    render(<BudgetEditor {...defaultProps} />);
    expect(screen.getByText("$2,500")).toBeInTheDocument();
    expect(screen.getByText("$2,100")).toBeInTheDocument();
  });

  it("renders category editors for all categories", () => {
    render(<BudgetEditor {...defaultProps} />);
    expect(screen.getByText("housing")).toBeInTheDocument();
    expect(screen.getByText("food dining")).toBeInTheDocument();
  });

  it("shows Save Changes and Cancel buttons", () => {
    render(<BudgetEditor {...defaultProps} />);
    expect(screen.getByText("Save Changes")).toBeInTheDocument();
    expect(screen.getByText("Cancel")).toBeInTheDocument();
  });

  it("calls onCancel when Cancel is clicked", () => {
    render(<BudgetEditor {...defaultProps} />);
    fireEvent.click(screen.getByTestId("budget-cancel-button"));
    expect(defaultProps.onCancel).toHaveBeenCalledTimes(1);
  });

  it("calls onSave when Save Changes is clicked", async () => {
    render(<BudgetEditor {...defaultProps} />);
    fireEvent.click(screen.getByTestId("budget-save-button"));

    await waitFor(() => {
      expect(defaultProps.onSave).toHaveBeenCalledTimes(1);
    });
  });

  it("shows percent used for each category", () => {
    render(<BudgetEditor {...defaultProps} />);
    expect(screen.getByText("90%")).toBeInTheDocument();
    expect(screen.getByText("60%")).toBeInTheDocument();
  });
});
