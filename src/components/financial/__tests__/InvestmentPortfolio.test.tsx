/**
 * InvestmentPortfolio Component Tests
 *
 * Tests for the investment portfolio overview with asset allocation and tips.
 */

import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import InvestmentPortfolio from "../InvestmentPortfolio";

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
    institutionName: "Fidelity",
    accountName: "Brokerage Account",
    accountType: "investment",
    accountSubtype: "brokerage",
    mask: "1234",
    currentBalance: 50000,
    availableBalance: 50000,
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
    institutionName: "Vanguard",
    accountName: "401k",
    accountType: "investment",
    accountSubtype: "401k",
    mask: "5678",
    currentBalance: 120000,
    availableBalance: 120000,
    currency: "USD",
    lastSynced: new Date("2026-02-20T10:00:00Z"),
    createdAt: new Date("2025-01-01T10:00:00Z"),
  },
  {
    id: "acc-3",
    itemId: "item-2",
    userId: "user-1",
    accountId: "plaid-acc-3",
    institutionId: "ins-2",
    institutionName: "Chase",
    accountName: "Checking",
    accountType: "depository",
    accountSubtype: "checking",
    mask: "9012",
    currentBalance: 5000,
    availableBalance: 4500,
    currency: "USD",
    lastSynced: new Date("2026-02-20T10:00:00Z"),
    createdAt: new Date("2025-01-01T10:00:00Z"),
  },
];

describe("InvestmentPortfolio", () => {
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
    const { container } = render(<InvestmentPortfolio />);
    expect(container.querySelector(".animate-pulse")).toBeInTheDocument();
  });

  it("displays Total Value stat after loading", async () => {
    render(<InvestmentPortfolio />);
    await waitFor(() => {
      expect(screen.getByText("Total Value")).toBeInTheDocument();
    });
  });

  it("displays investment accounts", async () => {
    render(<InvestmentPortfolio />);
    await waitFor(() => {
      expect(screen.getByText("Brokerage Account")).toBeInTheDocument();
      expect(screen.getByText("401k")).toBeInTheDocument();
    });
  });

  it("does not display non-investment accounts", async () => {
    render(<InvestmentPortfolio />);
    await waitFor(() => {
      expect(screen.getByText("Total Value")).toBeInTheDocument();
    });
    expect(screen.queryByText("Checking")).not.toBeInTheDocument();
  });

  it("shows No Investment Accounts when none exist", async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            data: {
              accounts: [mockAccounts[2]], // Only depository
            },
          }),
      }),
    ) as jest.Mock;

    render(<InvestmentPortfolio />);

    await waitFor(() => {
      expect(
        screen.getByText("No Investment Accounts"),
      ).toBeInTheDocument();
    });
  });

  it("displays Asset Allocation section", async () => {
    render(<InvestmentPortfolio />);
    await waitFor(() => {
      expect(screen.getByText("Asset Allocation")).toBeInTheDocument();
    });
  });

  it("displays Investment Tips section", async () => {
    render(<InvestmentPortfolio />);
    await waitFor(() => {
      expect(screen.getByText("Investment Tips")).toBeInTheDocument();
    });
  });

  it("handles fetch error gracefully", async () => {
    global.fetch = jest.fn(() =>
      Promise.reject(new Error("Network error")),
    ) as jest.Mock;

    render(<InvestmentPortfolio />);

    await waitFor(() => {
      expect(
        document.querySelector(".animate-pulse"),
      ).not.toBeInTheDocument();
    });
  });
});
