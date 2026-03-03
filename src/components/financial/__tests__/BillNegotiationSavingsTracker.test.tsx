/**
 * BillNegotiationSavingsTracker Component Tests
 *
 * Tests for the savings tracker showing negotiation results and savings totals.
 */

import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import BillNegotiationSavingsTracker from "../BillNegotiationSavingsTracker";

jest.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    user: { id: "user-1", email: "test@test.com" },
  }),
}));

const mockAnalysis = {
  summary: {
    totalMonthlySavings: 75,
    totalYearlySavings: 900,
    totalLifetimeSavings: 2700,
    successfulNegotiations: 4,
    totalNegotiations: 5,
    successRate: 0.8,
    savingsByCategory: [
      { category: "telecom", savings: 45 },
      { category: "utilities", savings: 30 },
    ],
  },
  recentSavings: [
    {
      billId: "bill-1",
      billName: "Internet",
      provider: "Comcast",
      category: "telecom",
      oldAmount: 100,
      newAmount: 75,
      monthlySavings: 25,
      yearlySavings: 300,
      negotiatedAt: "2026-02-15",
    },
    {
      billId: "bill-2",
      billName: "Phone",
      provider: "Verizon",
      category: "telecom",
      oldAmount: 80,
      newAmount: 60,
      monthlySavings: 20,
      yearlySavings: 240,
      negotiatedAt: "2026-02-10",
    },
  ],
};

describe("BillNegotiationSavingsTracker", () => {
  beforeEach(() => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ data: mockAnalysis }),
      }),
    ) as jest.Mock;
  });

  it("renders loading state initially", () => {
    global.fetch = jest.fn(() => new Promise(() => {})) as jest.Mock;
    const { container } = render(<BillNegotiationSavingsTracker />);
    expect(container.querySelector(".animate-pulse")).toBeInTheDocument();
  });

  it("displays savings summary cards after loading", async () => {
    render(<BillNegotiationSavingsTracker />);
    await waitFor(() => {
      expect(screen.getByText("Monthly Savings")).toBeInTheDocument();
      expect(screen.getByText("Yearly Savings")).toBeInTheDocument();
    });
  });

  it("displays savings amounts", async () => {
    render(<BillNegotiationSavingsTracker />);
    await waitFor(() => {
      // "$75" appears in both the summary card and the "After" column, so use getAllByText
      expect(screen.getAllByText("$75").length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText("$900")).toBeInTheDocument();
    });
  });

  it("displays success rate", async () => {
    render(<BillNegotiationSavingsTracker />);
    await waitFor(() => {
      expect(screen.getByText("Success Rate")).toBeInTheDocument();
    });
  });

  it("shows No Savings Yet when data is empty", async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ data: null }),
      }),
    ) as jest.Mock;

    render(<BillNegotiationSavingsTracker />);

    await waitFor(() => {
      expect(screen.getByText("No Savings Yet")).toBeInTheDocument();
    });
  });

  it("displays no savings message text", async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ data: null }),
      }),
    ) as jest.Mock;

    render(<BillNegotiationSavingsTracker />);

    await waitFor(() => {
      expect(
        screen.getByText(
          "Start negotiating your bills to track your savings!",
        ),
      ).toBeInTheDocument();
    });
  });

  it("handles fetch error gracefully", async () => {
    global.fetch = jest.fn(() =>
      Promise.reject(new Error("Network error")),
    ) as jest.Mock;

    render(<BillNegotiationSavingsTracker />);

    await waitFor(() => {
      expect(
        document.querySelector(".animate-pulse"),
      ).not.toBeInTheDocument();
    });
  });
});
