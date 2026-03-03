/**
 * BankAccountsList Component Tests
 *
 * Tests for the bank accounts list with filtering, stats, and Plaid integration.
 */

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import BankAccountsList from "../BankAccountsList";

jest.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    user: { id: "user-1", email: "test@test.com" },
    loading: false,
  }),
}));

jest.mock("@/lib/financial/plaid-service", () => ({}));

jest.mock("../PlaidLinkButton", () => ({
  __esModule: true,
  default: () => (
    <button data-testid="plaid-link-button">Connect Account</button>
  ),
}));

jest.mock("../AccountDetailsModal", () => ({
  __esModule: true,
  default: () => (
    <div data-testid="account-details-modal">AccountDetailsModal</div>
  ),
}));

const mockAccounts = [
  {
    id: "acc-1",
    itemId: "item-1",
    userId: "user-1",
    accountId: "plaid-acc-1",
    institutionId: "ins-1",
    institutionName: "Chase",
    accountName: "Checking Account",
    accountType: "depository",
    accountSubtype: "checking",
    mask: "1234",
    currentBalance: 5000,
    availableBalance: 4500,
    currency: "USD",
    lastSynced: new Date("2026-02-20T10:00:00Z"),
    createdAt: new Date("2025-01-01T10:00:00Z"),
  },
  {
    id: "acc-2",
    itemId: "item-2",
    userId: "user-1",
    accountId: "plaid-acc-2",
    institutionId: "ins-2",
    institutionName: "Amex",
    accountName: "Platinum Card",
    accountType: "credit",
    accountSubtype: "credit card",
    mask: "5678",
    currentBalance: 2000,
    availableBalance: 8000,
    currency: "USD",
    lastSynced: new Date("2026-02-20T10:00:00Z"),
    createdAt: new Date("2025-01-01T10:00:00Z"),
  },
  {
    id: "acc-3",
    itemId: "item-3",
    userId: "user-1",
    accountId: "plaid-acc-3",
    institutionId: "ins-3",
    institutionName: "Fidelity",
    accountName: "Brokerage",
    accountType: "investment",
    accountSubtype: "brokerage",
    mask: "9012",
    currentBalance: 50000,
    availableBalance: 50000,
    currency: "USD",
    lastSynced: new Date("2026-02-20T10:00:00Z"),
    createdAt: new Date("2025-01-01T10:00:00Z"),
  },
];

describe("BankAccountsList", () => {
  beforeEach(() => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            data: mockAccounts,
          }),
      }),
    ) as jest.Mock;
  });

  it("renders loading state initially", () => {
    global.fetch = jest.fn(() => new Promise(() => {})) as jest.Mock;
    const { container } = render(<BankAccountsList />);
    expect(container.querySelector(".animate-pulse")).toBeInTheDocument();
  });

  it("displays account names after loading", async () => {
    render(<BankAccountsList />);
    await waitFor(() => {
      expect(screen.getByText("Checking Account")).toBeInTheDocument();
      expect(screen.getByText("Platinum Card")).toBeInTheDocument();
      expect(screen.getByText("Brokerage")).toBeInTheDocument();
    });
  });

  it("displays Total Accounts stat", async () => {
    render(<BankAccountsList />);
    await waitFor(() => {
      expect(screen.getByText("Total Accounts")).toBeInTheDocument();
    });
  });

  it("displays Total Balance stat", async () => {
    render(<BankAccountsList />);
    await waitFor(() => {
      expect(screen.getByText("Total Balance")).toBeInTheDocument();
    });
  });

  it("has filter buttons", async () => {
    render(<BankAccountsList />);
    await waitFor(() => {
      expect(screen.getByText("Checking Account")).toBeInTheDocument();
    });
    expect(screen.getByText("All")).toBeInTheDocument();
  });

  it("shows error state on fetch failure", async () => {
    global.fetch = jest.fn(() =>
      Promise.reject(new Error("Network error")),
    ) as jest.Mock;

    render(<BankAccountsList />);

    await waitFor(() => {
      expect(
        screen.getByText("Error Loading Accounts"),
      ).toBeInTheDocument();
    });
  });

  it("shows Try Again button on error", async () => {
    global.fetch = jest.fn(() =>
      Promise.reject(new Error("Network error")),
    ) as jest.Mock;

    render(<BankAccountsList />);

    await waitFor(() => {
      expect(screen.getByText("Try Again")).toBeInTheDocument();
    });
  });

  it("shows No Accounts Connected with PlaidLinkButton when empty", async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            data: [],
          }),
      }),
    ) as jest.Mock;

    render(<BankAccountsList />);

    await waitFor(() => {
      expect(
        screen.getByText("No Accounts Connected"),
      ).toBeInTheDocument();
      expect(screen.getByTestId("plaid-link-button")).toBeInTheDocument();
    });
  });
});
