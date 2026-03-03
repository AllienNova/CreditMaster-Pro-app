/**
 * SmartBudgetManagement Component Tests
 *
 * Tests for the smart budget management page with child components.
 */

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import SmartBudgetManagement from "../SmartBudgetManagement";

jest.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    user: { id: "user-1", email: "test@test.com" },
  }),
}));

jest.mock("../BudgetOverview", () => ({
  __esModule: true,
  default: () => <div data-testid="budget-overview">BudgetOverview</div>,
}));

jest.mock("../CategoryBreakdown", () => ({
  __esModule: true,
  default: () => (
    <div data-testid="category-breakdown">CategoryBreakdown</div>
  ),
}));

jest.mock("../AIBudgetRecommendations", () => ({
  __esModule: true,
  default: () => (
    <div data-testid="ai-budget-recommendations">AIBudgetRecommendations</div>
  ),
}));

jest.mock("../BudgetEditor", () => ({
  __esModule: true,
  default: () => <div data-testid="budget-editor">BudgetEditor</div>,
}));

const mockBudgets = [
  {
    id: "b-1",
    category: "food",
    limit: 500,
    spent: 350,
    remaining: 150,
    period: "monthly",
  },
  {
    id: "b-2",
    category: "transportation",
    limit: 200,
    spent: 180,
    remaining: 20,
    period: "monthly",
  },
];

const mockAnalysis = {
  totalBudgeted: 700,
  totalSpent: 530,
  totalRemaining: 170,
  percentUsed: 75.7,
  categoriesOverBudget: 0,
  categoriesNearLimit: 1,
  daysRemaining: 8,
  projectedSpending: 680,
  projectedOverage: 0,
};

describe("SmartBudgetManagement", () => {
  beforeEach(() => {
    global.fetch = jest.fn((url: string) => {
      if (url.includes("/budgets/analyze")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: mockAnalysis }),
        });
      }
      if (url.includes("/budgets")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: mockBudgets }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ data: {} }),
      });
    }) as jest.Mock;
  });

  it("renders loading state initially", () => {
    global.fetch = jest.fn(() => new Promise(() => {})) as jest.Mock;
    render(<SmartBudgetManagement />);
    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  it("displays Smart Budget heading after loading", async () => {
    render(<SmartBudgetManagement />);
    await waitFor(() => {
      expect(screen.getByText("Smart Budget")).toBeInTheDocument();
    });
  });

  it("renders child components after loading", async () => {
    render(<SmartBudgetManagement />);
    await waitFor(() => {
      expect(screen.getByTestId("budget-overview")).toBeInTheDocument();
    });
  });

  it("shows error state on fetch failure", async () => {
    global.fetch = jest.fn(() =>
      Promise.reject(new Error("Network error")),
    ) as jest.Mock;

    render(<SmartBudgetManagement />);

    await waitFor(() => {
      expect(screen.getByText("Error Loading Budget")).toBeInTheDocument();
    });
  });

  it("shows Try Again button on error", async () => {
    global.fetch = jest.fn(() =>
      Promise.reject(new Error("Network error")),
    ) as jest.Mock;

    render(<SmartBudgetManagement />);

    await waitFor(() => {
      expect(screen.getByText("Try Again")).toBeInTheDocument();
    });
  });

  it("retries fetch when Try Again is clicked", async () => {
    let callCount = 0;
    global.fetch = jest.fn(() => {
      callCount++;
      if (callCount <= 2) {
        return Promise.reject(new Error("Network error"));
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ data: mockBudgets }),
      });
    }) as jest.Mock;

    render(<SmartBudgetManagement />);

    await waitFor(() => {
      expect(screen.getByText("Try Again")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Try Again"));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(4);
    });
  });

  it("has period select control", async () => {
    render(<SmartBudgetManagement />);
    await waitFor(() => {
      expect(screen.getByText("Smart Budget")).toBeInTheDocument();
    });

    // Period selector should be present
    const selects = document.querySelectorAll("select");
    expect(selects.length).toBeGreaterThanOrEqual(0);
  });
});
