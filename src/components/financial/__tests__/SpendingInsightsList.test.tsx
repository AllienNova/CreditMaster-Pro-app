/**
 * SpendingInsightsList Component Tests
 *
 * Tests for the AI spending insights list with filtering.
 */

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import SpendingInsightsList from "../SpendingInsightsList";

jest.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    user: { id: "user-1", email: "test@test.com" },
  }),
}));

const mockInsights = [
  {
    id: "i-1",
    title: "Dining expenses up 30%",
    description: "Your dining spending increased significantly this month.",
    category: "food_dining",
    severity: "medium",
    actionable: true,
    action: "Set a dining budget of $300/month",
    impact: 150,
    createdAt: "2026-02-20T10:00:00Z",
  },
  {
    id: "i-2",
    title: "Subscription optimization available",
    description: "You have overlapping streaming subscriptions.",
    category: "subscriptions",
    severity: "low",
    actionable: true,
    action: "Cancel one streaming service",
    impact: 15,
    createdAt: "2026-02-19T10:00:00Z",
  },
  {
    id: "i-3",
    title: "Savings rate on track",
    description: "Your savings rate is consistent with your goals.",
    category: "savings",
    severity: "low",
    actionable: false,
    action: null,
    impact: 0,
    createdAt: "2026-02-18T10:00:00Z",
  },
];

describe("SpendingInsightsList", () => {
  beforeEach(() => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ data: mockInsights }),
      }),
    ) as jest.Mock;
  });

  it("renders loading state initially", () => {
    global.fetch = jest.fn(() => new Promise(() => {})) as jest.Mock;
    const { container } = render(<SpendingInsightsList />);
    expect(container.querySelector(".animate-pulse")).toBeInTheDocument();
  });

  it("displays AI Insights header after loading", async () => {
    render(<SpendingInsightsList />);
    await waitFor(() => {
      expect(screen.getByText("AI Insights")).toBeInTheDocument();
    });
  });

  it("displays insight count badge", async () => {
    render(<SpendingInsightsList />);
    await waitFor(() => {
      expect(screen.getByText("3")).toBeInTheDocument();
    });
  });

  it("displays insight details", async () => {
    render(<SpendingInsightsList />);
    await waitFor(() => {
      expect(
        screen.getByText("Dining expenses up 30%"),
      ).toBeInTheDocument();
    });
  });

  it("filters to show only actionable insights", async () => {
    render(<SpendingInsightsList />);

    await waitFor(() => {
      expect(screen.getByText("AI Insights")).toBeInTheDocument();
    });

    const actionableBtn = screen.getByText("Actionable");
    fireEvent.click(actionableBtn);

    await waitFor(() => {
      expect(
        screen.getByText("Dining expenses up 30%"),
      ).toBeInTheDocument();
      expect(
        screen.getByText("Subscription optimization available"),
      ).toBeInTheDocument();
      expect(
        screen.queryByText("Savings rate on track"),
      ).not.toBeInTheDocument();
    });
  });

  it("shows No Insights Available when list is empty", async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ data: [] }),
      }),
    ) as jest.Mock;

    render(<SpendingInsightsList />);

    await waitFor(() => {
      expect(screen.getByText("No Insights Available")).toBeInTheDocument();
    });
  });

  it("shows help text when no insights available", async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ data: [] }),
      }),
    ) as jest.Mock;

    render(<SpendingInsightsList />);

    await waitFor(() => {
      expect(
        screen.getByText("Check back later for AI-generated insights"),
      ).toBeInTheDocument();
    });
  });
});
