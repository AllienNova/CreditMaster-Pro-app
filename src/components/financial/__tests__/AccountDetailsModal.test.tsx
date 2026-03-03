/**
 * AccountDetailsModal Component Tests
 *
 * Tests for the account details modal with transactions and sync functionality.
 */

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import AccountDetailsModal from "../AccountDetailsModal";

jest.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    user: { id: "user-1", email: "test@test.com" },
  }),
}));

jest.mock("@/lib/financial/plaid-service", () => ({}));

const mockAccount = {
  id: "acc-1",
  itemId: "item-1",
  userId: "user-1",
  accountId: "plaid-acc-1",
  institutionId: "ins-1",
  institutionName: "Chase",
  accountName: "Checking Account",
  accountType: "depository" as const,
  accountSubtype: "checking",
  mask: "1234",
  currentBalance: 5000,
  availableBalance: 4500,
  currency: "USD",
  lastSynced: new Date("2026-02-20T10:00:00Z"),
  createdAt: new Date("2025-01-01T10:00:00Z"),
};

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
    name: "Payroll",
    merchantName: "ACME Corp",
    category: ["Transfer", "Payroll"],
    pending: false,
    paymentChannel: "other",
  },
];

describe("AccountDetailsModal", () => {
  const mockOnClose = jest.fn();
  const mockOnRefresh = jest.fn();

  beforeEach(() => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            data: mockTransactions,
          }),
      }),
    ) as jest.Mock;
  });

  it("renders without crashing", () => {
    render(
      <AccountDetailsModal
        account={mockAccount}
        onClose={mockOnClose}
        onRefresh={mockOnRefresh}
      />,
    );
    expect(screen.getAllByText("Chase").length).toBeGreaterThanOrEqual(1);
  });

  it("displays account name and mask", () => {
    render(
      <AccountDetailsModal
        account={mockAccount}
        onClose={mockOnClose}
        onRefresh={mockOnRefresh}
      />,
    );
    expect(screen.getByText("Checking Account")).toBeInTheDocument();
    expect(screen.getAllByText(/1234/).length).toBeGreaterThanOrEqual(1);
  });

  it("displays current balance", () => {
    render(
      <AccountDetailsModal
        account={mockAccount}
        onClose={mockOnClose}
        onRefresh={mockOnRefresh}
      />,
    );
    expect(screen.getByText(/5,000/)).toBeInTheDocument();
  });

  it("displays transactions after loading", async () => {
    render(
      <AccountDetailsModal
        account={mockAccount}
        onClose={mockOnClose}
        onRefresh={mockOnRefresh}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText("Coffee Shop")).toBeInTheDocument();
      expect(screen.getByText("Payroll")).toBeInTheDocument();
    });
  });

  it("shows No transactions found when empty", async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            data: [],
          }),
      }),
    ) as jest.Mock;

    render(
      <AccountDetailsModal
        account={mockAccount}
        onClose={mockOnClose}
        onRefresh={mockOnRefresh}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText("No transactions found")).toBeInTheDocument();
    });
  });

  it("calls onClose when close button is clicked", () => {
    render(
      <AccountDetailsModal
        account={mockAccount}
        onClose={mockOnClose}
        onRefresh={mockOnRefresh}
      />,
    );

    const closeButton = screen.getByRole("button", { name: /close/i });
    fireEvent.click(closeButton);
    expect(mockOnClose).toHaveBeenCalled();
  });

  it("has a Sync Transactions button", () => {
    render(
      <AccountDetailsModal
        account={mockAccount}
        onClose={mockOnClose}
        onRefresh={mockOnRefresh}
      />,
    );
    expect(screen.getByText("Sync Transactions")).toBeInTheDocument();
  });

  it("displays account type information", () => {
    render(
      <AccountDetailsModal
        account={mockAccount}
        onClose={mockOnClose}
        onRefresh={mockOnRefresh}
      />,
    );
    expect(screen.getAllByText(/depository/i).length).toBeGreaterThanOrEqual(1);
  });
});
