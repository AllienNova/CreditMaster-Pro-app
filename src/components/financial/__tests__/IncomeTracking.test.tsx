/**
 * IncomeTracking Component Tests
 *
 * Tests for the income tracking view with date range selection and income sources.
 */

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import IncomeTracking from "../IncomeTracking";

jest.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    user: { id: "user-1", email: "test@test.com" },
    authLoading: false,
  }),
}));

jest.mock("@/lib/financial/plaid-service", () => ({}));

const mockTransactions = [
  {
    id: "t-1",
    accountId: "acc-1",
    userId: "user-1",
    transactionId: "txn-1",
    date: new Date("2026-02-15").toISOString(),
    amount: -3000,
    name: "Employer Payroll",
    merchantName: "ACME Corp",
    category: ["Transfer", "Payroll"],
    pending: false,
    paymentChannel: "other",
  },
  {
    id: "t-2",
    accountId: "acc-1",
    userId: "user-1",
    transactionId: "txn-2",
    date: new Date("2026-02-01").toISOString(),
    amount: -3000,
    name: "Employer Payroll",
    merchantName: "ACME Corp",
    category: ["Transfer", "Payroll"],
    pending: false,
    paymentChannel: "other",
  },
  {
    id: "t-3",
    accountId: "acc-1",
    userId: "user-1",
    transactionId: "txn-3",
    date: new Date("2026-01-20").toISOString(),
    amount: -500,
    name: "Freelance Payment",
    merchantName: "Client Inc",
    category: ["Transfer", "Credit"],
    pending: false,
    paymentChannel: "other",
  },
  {
    id: "t-4",
    accountId: "acc-1",
    userId: "user-1",
    transactionId: "txn-4",
    date: new Date("2026-02-10").toISOString(),
    amount: 50,
    name: "Coffee Shop",
    merchantName: "Starbucks",
    category: ["Food and Drink"],
    pending: false,
    paymentChannel: "in store",
  },
];

describe("IncomeTracking", () => {
  beforeEach(() => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            data: {
              transactions: mockTransactions.map((t) => ({
                ...t,
                date: new Date(t.date),
              })),
            },
          }),
      }),
    ) as jest.Mock;
  });

  it("renders loading state initially", () => {
    global.fetch = jest.fn(() => new Promise(() => {})) as jest.Mock;
    const { container } = render(<IncomeTracking />);
    expect(container.querySelector(".animate-pulse")).toBeInTheDocument();
  });

  it("displays Total Income stat after loading", async () => {
    render(<IncomeTracking />);
    await waitFor(() => {
      expect(screen.getByText("Total Income")).toBeInTheDocument();
    });
  });

  it("displays Avg Monthly stat", async () => {
    render(<IncomeTracking />);
    await waitFor(() => {
      expect(screen.getByText("Avg Monthly")).toBeInTheDocument();
    });
  });

  it("displays Projected Annual stat", async () => {
    render(<IncomeTracking />);
    await waitFor(() => {
      expect(screen.getByText("Projected Annual")).toBeInTheDocument();
    });
  });

  it("has date range buttons", async () => {
    render(<IncomeTracking />);
    await waitFor(() => {
      expect(screen.getByText("Total Income")).toBeInTheDocument();
    });

    expect(screen.getByText("3 Months")).toBeInTheDocument();
    expect(screen.getByText("6 Months")).toBeInTheDocument();
    expect(screen.getByText("1 Year")).toBeInTheDocument();
  });

  it("changes date range on button click", async () => {
    render(<IncomeTracking />);

    await waitFor(() => {
      expect(screen.getByText("Total Income")).toBeInTheDocument();
    });

    const sixMonthsBtn = screen.getByText("6 Months");
    fireEvent.click(sixMonthsBtn);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("days=180"),
      );
    });
  });

  it("handles fetch error gracefully", async () => {
    global.fetch = jest.fn(() =>
      Promise.reject(new Error("Network error")),
    ) as jest.Mock;

    render(<IncomeTracking />);

    await waitFor(() => {
      expect(
        document.querySelector(".animate-pulse"),
      ).not.toBeInTheDocument();
    });
  });
});
