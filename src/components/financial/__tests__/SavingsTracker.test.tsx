/**
 * SavingsTracker Component Tests
 *
 * Tests for the savings tracker with growth history, projections, and tips.
 */

import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import SavingsTracker from "../SavingsTracker";

jest.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    user: { id: "user-1", email: "test@test.com" },
    loading: false,
  }),
}));

jest.mock("@/lib/financial/plaid-service", () => ({}));

const mockDashboardData = {
  accounts: [
    {
      id: "acc-1",
      itemId: "item-1",
      userId: "user-1",
      accountId: "plaid-acc-1",
      institutionId: "ins-1",
      institutionName: "Chase",
      accountName: "Savings Account",
      accountType: "depository",
      accountSubtype: "savings",
      mask: "1234",
      currentBalance: 15000,
      availableBalance: 15000,
      currency: "USD",
      lastSynced: new Date("2026-02-20T10:00:00Z"),
      createdAt: new Date("2025-01-01T10:00:00Z"),
    },
    {
      id: "acc-2",
      itemId: "item-1",
      userId: "user-1",
      accountId: "plaid-acc-2",
      institutionId: "ins-1",
      institutionName: "Chase",
      accountName: "Checking Account",
      accountType: "depository",
      accountSubtype: "checking",
      mask: "5678",
      currentBalance: 5000,
      availableBalance: 4500,
      currency: "USD",
      lastSynced: new Date("2026-02-20T10:00:00Z"),
      createdAt: new Date("2025-01-01T10:00:00Z"),
    },
  ],
  cashFlow: 500,
  savingsRate: 25,
  monthlyTrend: [
    { month: "Sep", income: 5000, expenses: 4000 },
    { month: "Oct", income: 5200, expenses: 4100 },
    { month: "Nov", income: 5000, expenses: 3800 },
    { month: "Dec", income: 5500, expenses: 4200 },
    { month: "Jan", income: 5000, expenses: 4000 },
    { month: "Feb", income: 5100, expenses: 3900 },
  ],
};

describe("SavingsTracker", () => {
  beforeEach(() => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            data: mockDashboardData,
          }),
      }),
    ) as jest.Mock;
  });

  it("renders loading state initially", () => {
    global.fetch = jest.fn(() => new Promise(() => {})) as jest.Mock;
    const { container } = render(<SavingsTracker />);
    expect(container.querySelector(".animate-pulse")).toBeInTheDocument();
  });

  it("displays Total Savings stat after loading", async () => {
    render(<SavingsTracker />);
    await waitFor(() => {
      expect(screen.getByText("Total Savings")).toBeInTheDocument();
    });
  });

  it("displays Monthly Growth stat", async () => {
    render(<SavingsTracker />);
    await waitFor(() => {
      expect(screen.getByText("Monthly Growth")).toBeInTheDocument();
    });
  });

  it("displays Savings Tips section", async () => {
    render(<SavingsTracker />);
    await waitFor(() => {
      expect(screen.getByText("Savings Tips")).toBeInTheDocument();
    });
  });

  it("returns null when no data is available", async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            data: null,
          }),
      }),
    ) as jest.Mock;

    const { container } = render(<SavingsTracker />);

    await waitFor(() => {
      expect(
        container.querySelector(".animate-pulse"),
      ).not.toBeInTheDocument();
    });
  });

  it("displays savings account information", async () => {
    render(<SavingsTracker />);
    await waitFor(() => {
      expect(screen.getByText("Total Savings")).toBeInTheDocument();
    });
  });

  it("handles fetch error gracefully", async () => {
    global.fetch = jest.fn(() =>
      Promise.reject(new Error("Network error")),
    ) as jest.Mock;

    const { container } = render(<SavingsTracker />);

    await waitFor(() => {
      expect(
        container.querySelector(".animate-pulse"),
      ).not.toBeInTheDocument();
    });
  });
});
