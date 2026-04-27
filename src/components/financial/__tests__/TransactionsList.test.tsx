/**
 * TransactionsList Component Tests
 *
 * Tests for the transactions list with search, filters, sorting, and stats.
 */

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import TransactionsList from "../TransactionsList";

jest.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    user: { id: "user-1", email: "test@test.com" },
    loading: false,
  }),
}));

jest.mock("@/lib/financial/plaid-service", () => ({}));

const mockAccounts = [
  {
    id: "acc-1",
    itemId: "item-1",
    userId: "user-1",
    accountId: "plaid-acc-1",
    institutionId: "ins-1",
    institutionName: "Chase",
    accountName: "Checking",
    accountType: "depository",
    accountSubtype: "checking",
    mask: "1234",
    currentBalance: 5000,
    availableBalance: 4500,
    currency: "USD",
    lastSynced: new Date("2026-02-20T10:00:00Z"),
    createdAt: new Date("2025-01-01T10:00:00Z"),
  },
];

const mockTransactions = [
  {
    id: "t-1",
    accountId: "plaid-acc-1",
    userId: "user-1",
    transactionId: "txn-1",
    date: new Date("2026-02-20"),
    amount: 25.5,
    name: "Coffee Shop",
    merchantName: "Starbucks",
    category: ["Food and Drink"],
    pending: false,
    paymentChannel: "in store",
  },
  {
    id: "t-2",
    accountId: "plaid-acc-1",
    userId: "user-1",
    transactionId: "txn-2",
    date: new Date("2026-02-18"),
    amount: -3000,
    name: "Payroll Deposit",
    merchantName: "ACME Corp",
    category: ["Transfer", "Payroll"],
    pending: false,
    paymentChannel: "other",
  },
  {
    id: "t-3",
    accountId: "plaid-acc-1",
    userId: "user-1",
    transactionId: "txn-3",
    date: new Date("2026-02-15"),
    amount: 50,
    name: "Grocery Store",
    merchantName: "Whole Foods",
    category: ["Shops", "Supermarkets and Groceries"],
    pending: true,
    paymentChannel: "in store",
  },
];

describe("TransactionsList", () => {
  beforeEach(() => {
    let callCount = 0;
    global.fetch = jest.fn(() => {
      callCount++;
      if (callCount === 1) {
        // First call: accounts — component does accountsData.data directly
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              data: mockAccounts,
            }),
        });
      }
      // Subsequent calls: transactions per account — component does txnData.data
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            data: mockTransactions,
          }),
      });
    }) as jest.Mock;
  });

  it("renders loading state initially", () => {
    global.fetch = jest.fn(() => new Promise(() => {})) as jest.Mock;
    const { container } = render(<TransactionsList />);
    expect(container.querySelector(".animate-pulse")).toBeInTheDocument();
  });

  it("displays transaction items after loading", async () => {
    render(<TransactionsList />);
    await waitFor(() => {
      expect(screen.getByText("Coffee Shop")).toBeInTheDocument();
    });
  });

  it("displays transaction stats", async () => {
    render(<TransactionsList />);
    await waitFor(() => {
      expect(screen.getByText("Total Transactions")).toBeInTheDocument();
    });
  });

  it("shows error state on fetch failure", async () => {
    global.fetch = jest.fn(() =>
      Promise.reject(new Error("Network error")),
    ) as jest.Mock;

    render(<TransactionsList />);

    await waitFor(() => {
      expect(
        screen.getByText("Error Loading Transactions"),
      ).toBeInTheDocument();
    });
  });

  it("shows Try Again button on error", async () => {
    global.fetch = jest.fn(() =>
      Promise.reject(new Error("Network error")),
    ) as jest.Mock;

    render(<TransactionsList />);

    await waitFor(() => {
      expect(screen.getByText("Try Again")).toBeInTheDocument();
    });
  });

  it("retries when Try Again is clicked", async () => {
    let callCount = 0;
    global.fetch = jest.fn(() => {
      callCount++;
      if (callCount <= 1) {
        return Promise.reject(new Error("Network error"));
      }
      // After retry: first call returns accounts, subsequent return transactions
      if (callCount === 2) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              data: mockAccounts,
            }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            data: mockTransactions,
          }),
      });
    }) as jest.Mock;

    render(<TransactionsList />);

    await waitFor(() => {
      expect(screen.getByText("Try Again")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Try Again"));

    await waitFor(() => {
      // After retry, fetch is called at least 2 more times (accounts + transactions)
      expect((global.fetch as jest.Mock).mock.calls.length).toBeGreaterThanOrEqual(2);
    });
  });

  it("shows No Transactions Found for empty results", async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            data: [],
          }),
      }),
    ) as jest.Mock;

    render(<TransactionsList />);

    await waitFor(() => {
      expect(
        screen.getByText("No transactions found"),
      ).toBeInTheDocument();
    });
  });
});
