/**
 * BudgetStatusCard Component Tests
 *
 * Tests for the budget status card with progress bars and category breakdown.
 */

import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import BudgetStatusCard from "../BudgetStatusCard";

// Mock the useAuth hook
jest.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    user: { id: "user-1", email: "test@example.com" },
    loading: false,
  }),
}));

// Mock next/link
jest.mock("next/link", () => {
  return ({ children, href, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  );
});

const mockBudgetStatus = {
  totalBudgeted: 5000,
  totalSpent: 3500,
  totalRemaining: 1500,
  percentUsed: 70,
  categoriesOverBudget: 0,
  categoriesNearLimit: 0,
  topCategories: [
    {
      category: "housing",
      budgeted: 2000,
      spent: 1800,
      remaining: 200,
      percentUsed: 90,
      status: "near_limit" as const,
    },
    {
      category: "food_dining",
      budgeted: 500,
      spent: 300,
      remaining: 200,
      percentUsed: 60,
      status: "on_track" as const,
    },
    {
      category: "transportation",
      budgeted: 300,
      spent: 200,
      remaining: 100,
      percentUsed: 66.7,
      status: "under_budget" as const,
    },
  ],
  daysRemaining: 8,
};

describe("BudgetStatusCard", () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  it("renders loading state initially", () => {
    (global.fetch as jest.Mock).mockImplementation(
      () => new Promise(() => {}),
    );

    const { container } = render(<BudgetStatusCard />);
    expect(container.querySelector(".animate-pulse")).toBeInTheDocument();
  });

  it("renders budget status after fetch", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: mockBudgetStatus }),
    });

    render(<BudgetStatusCard />);

    await waitFor(() => {
      expect(screen.getByText("Budget Status")).toBeInTheDocument();
    });

    expect(screen.getByText("8 days left")).toBeInTheDocument();
  });

  it("displays overall budget progress", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: mockBudgetStatus }),
    });

    render(<BudgetStatusCard />);

    await waitFor(() => {
      expect(screen.getByText("Overall Budget")).toBeInTheDocument();
    });

    expect(screen.getByText(/\$3,500/)).toBeInTheDocument();
    expect(screen.getByText(/\$5,000/)).toBeInTheDocument();
    expect(screen.getByText("70.0% used")).toBeInTheDocument();
    expect(screen.getByText("$1,500 remaining")).toBeInTheDocument();
  });

  it("displays top categories with status", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: mockBudgetStatus }),
    });

    render(<BudgetStatusCard />);

    await waitFor(() => {
      expect(screen.getByText("Top Categories")).toBeInTheDocument();
    });

    expect(screen.getByText("housing")).toBeInTheDocument();
    expect(screen.getByText("food dining")).toBeInTheDocument();
    expect(screen.getByText("transportation")).toBeInTheDocument();
  });

  it("shows alerts when categories are over budget", async () => {
    const statusWithAlerts = {
      ...mockBudgetStatus,
      categoriesOverBudget: 2,
      categoriesNearLimit: 1,
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: statusWithAlerts }),
    });

    render(<BudgetStatusCard />);

    await waitFor(() => {
      expect(
        screen.getByText(/2 categories over budget/),
      ).toBeInTheDocument();
    });

    expect(screen.getByText(/1 category near limit/)).toBeInTheDocument();
  });

  it("shows empty state when no budget data", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: null }),
    });

    render(<BudgetStatusCard />);

    await waitFor(() => {
      expect(
        screen.getByText("No budget set for this month"),
      ).toBeInTheDocument();
    });

    const createLink = screen.getByText("Create Smart Budget");
    expect(createLink.closest("a")).toHaveAttribute(
      "href",
      "/financial/smart-budget",
    );
  });

  it("shows View All Categories link", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: mockBudgetStatus }),
    });

    render(<BudgetStatusCard />);

    await waitFor(() => {
      const link = screen.getByText(/View All Categories/);
      expect(link.closest("a")).toHaveAttribute(
        "href",
        "/financial/smart-budget",
      );
    });
  });
});
